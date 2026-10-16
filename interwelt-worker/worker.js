/**
 * INTERWELT read-only quoting pilot for ViajeroLatam.
 * No vouchers, payments, credentials or customer PII exposed to the website.
 * Disabled by default; POST is protected by a secret pilot token.
 */

const PROD_ORIGIN = "https://apisea.interwelt-intl.com";
const ALLOWED_API_ORIGINS = new Set([
  PROD_ORIGIN,
  "https://qa-api.interweltcorp.com"
]);
const MAX_BODY_LENGTH = 4096;

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}

function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + "T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? d : null;
}

function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const origin = input.origin_country_id;
  const region = input.destination_region_id;
  if (!Number.isInteger(origin) || origin < 1 || origin > 9999 ||
      !Number.isInteger(region) || region < 1 || region > 9999) return null;
  if (!Array.isArray(input.ages) || input.ages.length < 1 || input.ages.length > 8 ||
      !input.ages.every(x => Number.isInteger(x) && x >= 0 && x <= 100)) return null;
  const departure = validDate(input.departure);
  const arrival = validDate(input.return);
  if (!departure || !arrival) return null;
  const days = Math.round((arrival - departure) / 86400000) + 1;
  if (days < 1 || days > 120) return null;
  if (departure < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z")) return null;
  return { origin, region, ages: input.ages, departure: input.departure, arrival: input.return };
}

function getAccessToken(value) {
  return value?.access_token || value?.accessToken || value?.token ||
    value?.data?.access_token || value?.data?.token || null;
}

function pricesFromApi(payload) {
  const list = Array.isArray(payload?.plans) ? payload.plans : [];
  return list.map(entry => {
    const item = entry?.plans || entry;
    const details = Array.isArray(item?.montoVenta_detalle) ? item.montoVenta_detalle : [];
    const sale = details.find(x => String(x?.tipo || "").toLowerCase() === "venta");
    const amount = Number(sale?.valor ?? (item?.montoVenta?.[0] === "Venta" ? item.montoVenta[1] : NaN));
    return {
      id: Number(item?.IdPlan),
      name: String(item?.NombrePlan || ""),
      total: Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null
    };
  }).filter(x => Number.isInteger(x.id) && x.id > 0 && x.name && x.total !== null);
}

async function fetchJson(url, options) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("upstream_http_error");
  return res.json();
}

export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/health" && request.method === "GET") {
      return reply({ status: "ok", mode: "readonly", vouchers_enabled: false });
    }
    if (pathname === "/api/check" && request.method === "GET") {
      // Status can only be queried using the operator's token.
      // No variable values or credentials are returned to the caller.
      if (!env.INTERWELT_PILOT_TOKEN ||
          request.headers.get("x-pilot-token") !== env.INTERWELT_PILOT_TOKEN) {
        return reply({ error: "forbidden" }, 403);
      }
      const required = [
        "INTERWELT_EMAIL", "INTERWELT_PASSWORD",
        "INTERWELT_CONTACT_EMAIL", "INTERWELT_CONTACT_PHONE"
      ];
      return reply({
        mode: "operator_readonly",
        live_quotes_enabled: env.INTERWELT_PILOT_ENABLED === "true",
        credentials_configured: required.every(key => Boolean(env[key])),
        required_variable_names: required,
        currency_confirmed: env.INTERWELT_CONFIRMED_CURRENCY === "USD",
        vouchers_enabled: false,
        payments_enabled: false
      });
    }
    if (pathname !== "/api/quote" || request.method !== "POST") {
      return reply({ error: "not_found" }, 404);
    }

    if (env.INTERWELT_PILOT_ENABLED !== "true" ||
        !env.INTERWELT_PILOT_TOKEN || !env.INTERWELT_EMAIL ||
        !env.INTERWELT_PASSWORD || !env.INTERWELT_CONTACT_EMAIL ||
        !env.INTERWELT_CONTACT_PHONE) {
      return reply({ error: "pilot_not_configured" }, 503);
    }

    // Private operator-only test: never put this token into browser JavaScript.
    const suppliedToken = request.headers.get("x-pilot-token");
    if (!suppliedToken || suppliedToken !== env.INTERWELT_PILOT_TOKEN) {
      return reply({ error: "forbidden" }, 403);
    }
    if (!String(request.headers.get("content-type") || "").includes("application/json")) {
      return reply({ error: "expected_json" }, 415);
    }

    const requestedLength = Number(request.headers.get("content-length") || 0);
    if (requestedLength > MAX_BODY_LENGTH) return reply({ error: "too_large" }, 413);

    let input;
    try {
      const bodyText = await request.text();
      if (bodyText.length > MAX_BODY_LENGTH) return reply({ error: "too_large" }, 413);
      input = JSON.parse(bodyText);
    } catch {
      return reply({ error: "invalid_json" }, 400);
    }
    const quote = validate(input);
    if (!quote) return reply({ error: "invalid_quote_fields" }, 400);

    const rawProviderOrigin = String(env.INTERWELT_API_URL || PROD_ORIGIN);
    const providerOrigin = rawProviderOrigin.endsWith("/") ? rawProviderOrigin.slice(0, -1) : rawProviderOrigin;
    if (!ALLOWED_API_ORIGINS.has(providerOrigin)) {
      return reply({ error: "invalid_provider_configuration" }, 503);
    }
    try {
      const auth = await fetchJson(providerOrigin + "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ correo: env.INTERWELT_EMAIL, password: env.INTERWELT_PASSWORD })
      });
      const token = getAccessToken(auth);
      if (typeof token !== "string" || !token) throw new Error("missing_token");

      const response = await fetchJson(providerOrigin + "/api/quotes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": "Bearer " + token
        },
        body: JSON.stringify({
          id_paisOrigen: quote.origin,
          id_destino: quote.region,
          cantPax: quote.ages.length,
          edadesPax: quote.ages,
          telefono: env.INTERWELT_CONTACT_PHONE,
          correo: env.INTERWELT_CONTACT_EMAIL,
          student: false,
          multTravel: false,
          fechaSalida: quote.departure,
          fechaRetorno: quote.arrival,
          enviaje: false
        })
      });

      // The provider JSON lacks an explicit currency field: do not assume a
      // customer-facing currency until INTERWELT confirms the production API unit.
      return reply({
        mode: "operator_quote",
        source: "INTERWELT",
        live: true,
        quote_id: response?.id || null,
        search: {
          origin_country_id: quote.origin,
          destination_region_id: quote.region,
          departure: quote.departure,
          return: quote.arrival,
          ages: quote.ages,
          days: Math.round((Date.parse(quote.arrival + "T00:00:00Z") -
            Date.parse(quote.departure + "T00:00:00Z")) / 86400000) + 1
        },
        prices: pricesFromApi(response),
        currency: env.INTERWELT_CONFIRMED_CURRENCY === "USD" ? "USD" : null,
        currency_confirmed: env.INTERWELT_CONFIRMED_CURRENCY === "USD",
        mapping_verified: false,
        eligible: null,
        payments_enabled: false,
        vouchers_enabled: false
      });
    } catch {
      // Never return the provider's raw error, JWT, contact details or credentials.
      return reply({ error: "provider_unavailable_or_login_failed" }, 502);
    }
  }
};

export { validate, pricesFromApi };
