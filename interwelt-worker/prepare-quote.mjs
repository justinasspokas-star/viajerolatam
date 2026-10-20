/**
 * Public, read-only INTERWELT quote preparation.
 * No API keys, quote calls, payment requests, customer contact data or provider IDs.
 * Quote ID mapping MUST be verified against the upstream API before live activation.
 */
const ALLOWED_ORIGINS = new Set([
  "co", "mx", "ar", "ve", "pe", "cl", "ec", "bo", "br", "uy", "py",
  "cr", "pa", "gt", "sv", "hn", "ni", "cu", "ht", "do"
]);
const DESTINATIONS = Object.freeze({
  "espana-schengen": "europe",
  "espana": "europe",
  "europa": "europe",
  "eeuu-canada": "north-america",
  "eeuu": "north-america"
});
const MAX_BYTES = 1500;

function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      "x-content-type-options":"nosniff",
      "vary":"Origin"
    }
  });
}

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s+"T00:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === s ? d : null;
}

export function normalizeSearch(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const origin=String(payload.origin || "").trim().toLowerCase();
  const destination=String(payload.destination || "").trim().toLowerCase();
  if (!ALLOWED_ORIGINS.has(origin) || !(destination in DESTINATIONS)) return null;
  if (!Array.isArray(payload.ages) || payload.ages.length < 1 || payload.ages.length > 8 ||
    !payload.ages.every(age => Number.isInteger(age) && age >= 0 && age <= 100)) return null;
  const departure=parseDate(payload.departure), returning=parseDate(payload.return);
  if (!departure || !returning) return null;
  const tripDays=Math.round((returning-departure)/86400000)+1;
  if (tripDays < 1 || tripDays > 120) return null;
  const today=new Date(new Date().toISOString().slice(0,10)+"T00:00:00Z");
  if (departure < today) return null;
  return {
    origin,
    destination,
    region:DESTINATIONS[destination],
    departure:payload.departure,
    return:payload.return,
    ages:payload.ages,
    people:payload.ages.length,
    days:tripDays
  };
}

export async function prepareQuoteRequest(request) {
  if (request.method !== "POST") return json({error:"method_not_allowed"},405);
  const suppliedOrigin=request.headers.get("origin");
  if (suppliedOrigin && suppliedOrigin !== new URL(request.url).origin) return json({error:"invalid_origin"},403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "")) return json({error:"expected_json"},415);
  const advertised=Number(request.headers.get("content-length") || 0);
  if (advertised > MAX_BYTES) return json({error:"body_too_large"},413);
  let value;
  try {
    const body=await request.text();
    if (body.length > MAX_BYTES) return json({error:"body_too_large"},413);
    value=JSON.parse(body);
  } catch {
    return json({error:"invalid_json"},400);
  }
  const search=normalizeSearch(value);
  if (!search) return json({error:"invalid_search",message:"Revisa el país, el destino, las fechas o las edades."},400);
  return json({
    mode:"validation",
    source:"INTERWELT-preview",
    validated:true,
    live:false,
    prices:[],
    currency:null,
    eligible:null,
    mapping_verified:false,
    rates_available:false,
    payments_enabled:false,
    vouchers_enabled:false,
    search,
    next_step:"Confirmar identificadores de país y zona, elegibilidad y moneda; conectar la API bajo secreto de servidor."
  });
}


// Verified in INTERWELT production correspondence, 2026-10-20.
// These are public catalog IDs, never secrets. Other routes remain unsupported
// until the provider confirms them. All totals are final USD.
const CONFIRMED_ORIGIN_IDS = Object.freeze({ co: 48, pe: 173, mx: 142 });
const CONFIRMED_DESTINATION_IDS = Object.freeze({ europe: 2, "north-america": 6 });

export function confirmedProviderRoute(search) {
  if (!search || typeof search !== "object" || !Object.hasOwn(CONFIRMED_ORIGIN_IDS, search.origin) ||
      !Object.hasOwn(CONFIRMED_DESTINATION_IDS, search.region)) return null;
  return {
    origin_country_id: CONFIRMED_ORIGIN_IDS[search.origin],
    destination_region_id: CONFIRMED_DESTINATION_IDS[search.region],
    currency: "USD"
  };
}

// Public, no-secrets preflight only. It never calls /api/auth/login or /api/quotes.
// The route check is NOT a confirmation that a given plan is eligible: only the
// provider's actual plans array can confirm that after a protected live lookup.
export async function inspectRouteRequest(request) {
  const prepared = await prepareQuoteRequest(request);
  if (!prepared.ok) return prepared;
  const input = await prepared.json();
  const mapping = confirmedProviderRoute(input.search);
  return json({
    mode: "route_mapping_preview",
    source: "INTERWELT-preview",
    validated: true,
    route_supported: Boolean(mapping),
    mapping_verified: Boolean(mapping),
    provider_route: mapping,
    live: false,
    rates_available: false,
    prices: [],
    currency: mapping ? "USD" : null,
    currency_confirmed: Boolean(mapping),
    eligible: null,
    payments_enabled: false,
    vouchers_enabled: false,
    search: input.search,
    next_step: mapping
      ? "Ruta y moneda verificadas. Elegibilidad y tarifas solo mediante el endpoint protegido aún no habilitado al público."
      : "Origen o destino pendiente de confirmación con INTERWELT. No solicitar cotización."
  });
}
