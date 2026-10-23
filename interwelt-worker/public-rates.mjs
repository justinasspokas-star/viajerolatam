/**
 * INTERWELT public-rate gateway scaffold (OFF by default).
 *
 * Dedicated flag: INTERWELT_PUBLIC_RATES_ENABLED=true.
 * Independent of the operator-only INTERWELT_PILOT_ENABLED flag.
 * Real quotes are NEVER made unless a shared Upstash Redis cache,
 * atomic per-trip lock, and global daily quota are all available.
 *
 * No vouchers, payments, PII, provider JWT or operator token go to the browser.
 * Do not enable publicly before secret rotation and provider approval.
 */
import { createHash, randomUUID } from "node:crypto";
import { prepareQuoteRequest, confirmedProviderRoute } from "./prepare-quote.mjs";
import { approvedForDisplay } from "./plan-display-guard.mjs";

const MAX_DAILY_NEW_QUOTES = 20;
const CACHE_SECONDS = 600;
const LOCK_SECONDS = 90;
const QUOTA_SCRIPT = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "return current"
].join("\n");

function json(data, status = 200, extras = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extras
    }
  });
}

function upstashConfig(env) {
  const raw = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (typeof raw !== "string" || !token) return null;
  try {
    const url = new URL(raw);
    // Avoid SSRF or accidental leakage of the Redis REST bearer credential.
    if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io") ||
        url.username || url.password || url.search || url.hash ||
        (url.pathname !== "/" && url.pathname !== "")) return null;
    return { url: url.origin, token };
  } catch {
    return null;
  }
}

function cacheKey(search, partner) {
  // Ages/trip details never appear in Redis keys in clear text.
  const text = JSON.stringify([1, partner, search.origin, search.region,
    search.destination, search.departure, search.return, search.ages]);
  return "iw:rates:v1:" + createHash("sha256").update(text).digest("hex");
}

async function redisCommand(config, args) {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      "authorization": "Bearer " + config.token,
      "content-type": "application/json"
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error("redis_http_error");
  const body = await res.json();
  if (!body || !Object.hasOwn(body, "result") || body.error) {
    throw new Error("redis_invalid_response");
  }
  return body.result;
}

function readCached(value, expectedSearch) {
  if (typeof value !== "string" || value.length > 30000) return null;
  try {
    const parsed = JSON.parse(value);
    const trip = parsed?.search;
    if (parsed?.mode !== "public_rates" ||
        parsed?.source !== "INTERWELT" || parsed?.currency !== "USD" ||
        parsed?.currency_confirmed !== true ||
        parsed?.rates_available !== true ||
        parsed?.plans_selected_by_provider !== true ||
        parsed?.live !== true || parsed?.payments_enabled !== false ||
        parsed?.vouchers_enabled !== false ||
        !Array.isArray(parsed?.prices) || parsed.prices.length === 0 ||
        parsed.prices.length > 50 ||
        !trip || trip.origin !== expectedSearch.origin ||
        trip.destination !== expectedSearch.destination ||
        trip.departure !== expectedSearch.departure ||
        trip.return !== expectedSearch.return ||
        trip.days !== expectedSearch.days ||
        JSON.stringify(trip.ages) !== JSON.stringify(expectedSearch.ages) ||
        !parsed.prices.every(p =>
          Number.isSafeInteger(p?.id) && p.id > 0 &&
          typeof p.name === "string" && p.name.length > 0 &&
          p.name.length <= 90 &&
          typeof p.total === "number" && Number.isFinite(p.total) &&
          p.total > 0 && approvedForDisplay(p, expectedSearch)) ||
        Object.hasOwn(parsed, "quote_id") ||
        Object.hasOwn(parsed, "contact_email") ||
        Object.hasOwn(parsed, "contact_phone")) return null;
    // Whitelist public fields: never forward unexpected Redis properties.
    return {
      mode: "public_rates",
      source: "INTERWELT",
      live: true,
      currency: "USD",
      currency_confirmed: true,
      rates_available: true,
      plans_selected_by_provider: true,
      search: {
        origin: trip.origin,
        destination: trip.destination,
        departure: trip.departure,
        return: trip.return,
        ages: [...trip.ages],
        days: trip.days
      },
      prices: parsed.prices.map(p => ({ id: p.id, name: p.name, total: p.total })),
      payments_enabled: false,
      vouchers_enabled: false
    };
  } catch {
    return null;
  }
}

function publicPayload(provider, search) {
  // INTERWELT itself filters eligible plans. Never manufacture missing plans.
  const prices = Array.isArray(provider?.prices) ? provider.prices : [];
  const clean = prices.filter(p =>
    Number.isSafeInteger(p?.id) && p.id > 0 &&
    typeof p.name === "string" && p.name.trim().length > 0 &&
    p.name.length <= 90 && Number.isFinite(p.total) && p.total > 0 &&
    approvedForDisplay(p, search))
    .map(p => ({ id: p.id, name: p.name, total: Math.round(p.total * 100) / 100 }));
  if (provider?.live !== true || provider?.source !== "INTERWELT" ||
      provider?.currency !== "USD" || clean.length === 0) {
    throw new Error("no_verified_rates");
  }
  return {
    mode: "public_rates",
    source: "INTERWELT",
    live: true,
    currency: "USD",
    currency_confirmed: true,
    rates_available: true,
    plans_selected_by_provider: true,
    search: {
      origin: search.origin,
      destination: search.destination,
      departure: search.departure,
      return: search.return,
      ages: search.ages,
      days: search.days
    },
    prices: clean,
    payments_enabled: false,
    vouchers_enabled: false
  };
}

/** @param {Request} request
 *  @param {object} env
 *  @param {(input:object)=>Promise<object>} quoteProvider Server-only injected caller.
 */
export async function publicRatesRequest(request, env, quoteProvider) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  // Most important kill switch: no network to provider or Redis by default.
  if (env.INTERWELT_PUBLIC_RATES_ENABLED !== "true") {
    return json({ error: "public_rates_disabled" }, 503);
  }
  // Independent, deliberately absent in Netlify: turning on just the rates
  // switch must NEVER be enough to open registration of provider quotes.
  // Requires an explicit later launch decision, secret rotation, provider
  // permission, privacy/legal review and tested visitor-facing conditions.
  if (env.INTERWELT_PUBLIC_LAUNCH_APPROVED !== "true" ||
      env.INTERWELT_PILOT_ENABLED === "true") {
    return json({ error: "public_launch_not_approved" }, 503);
  }
  if (!env.INTERWELT_EMAIL || !env.INTERWELT_PASSWORD ||
      !env.INTERWELT_CONTACT_EMAIL || !env.INTERWELT_CONTACT_PHONE) {
    return json({ error: "provider_not_configured" }, 503);
  }
  const redis = upstashConfig(env);
  if (!redis) return json({ error: "shared_safety_store_unavailable" }, 503);

  // Enforce same-origin for browser usage. IP rate limits on Netlify are an
  // additional layer, NOT a substitute for the shared global budget.
  const expectedOrigin = new URL(request.url).origin;
  if (request.headers.get("origin") !== expectedOrigin) {
    return json({ error: "invalid_origin" }, 403);
  }
  if (request.headers.get("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin") {
    return json({ error: "invalid_site" }, 403);
  }
  const checked = await prepareQuoteRequest(request);
  if (!checked.ok) return checked;
  const { search } = await checked.json();
  const route = confirmedProviderRoute(search);
  if (!route) return json({ error: "unconfirmed_provider_route" }, 422);

  const key = cacheKey(search, env.INTERWELT_EMAIL);
  const cachedKey = key + ":cache";
  const lockKey = key + ":lock";

  try {
    const cachedValue = await redisCommand(redis, ["GET", cachedKey]);
    const cached = readCached(cachedValue, search);
    if (cached) return json({ ...cached, cache_status: "hit" });
    // A stored but invalid quote is a safety signal. Never create another
    // provider quote in response, even if the per-trip lock has expired.
    // Only a clean cache miss (null) may continue to a new quote.
    if (cachedValue !== null && cachedValue !== undefined) {
      return json({ error: "cached_quote_unavailable" }, 503);
    }

    // Redis SET NX is a distributed, atomic claim: concurrent Netlify
    // instances cannot simultaneously create a quote for the same trip.
    const locked = await redisCommand(redis, ["SET", lockKey, "processing", "EX", LOCK_SECONDS, "NX"]);
    if (locked !== "OK") {
      const raceValue = await redisCommand(redis, ["GET", cachedKey]);
      const afterRace = readCached(raceValue, search);
      if (afterRace) return json({ ...afterRace, cache_status: "hit" });
      if (raceValue !== null && raceValue !== undefined) {
        return json({ error: "cached_quote_unavailable" }, 503);
      }
      return json({ error: "quote_in_progress", retry_after_seconds: 5 }, 202, { "retry-after": "5" });
    }

    // Atomic Redis Lua counter with expiry at the next UTC day boundary.
    // Never refund reservations after ambiguous upstream failures: doing so
    // would allow repeated chargeable registrations.
    const now = Date.now();
    const date = new Date(now).toISOString().slice(0, 10);
    const tomorrow = Date.parse(date + "T00:00:00Z") + 86400000;
    const secondsToReset = Math.max(1, Math.ceil((tomorrow - now) / 1000));
    const count = Number(await redisCommand(redis, [
      "EVAL", QUOTA_SCRIPT, "1", "iw:budget:" + date, String(secondsToReset)
    ]));
    if (!Number.isSafeInteger(count) || count < 1) {
      return json({ error: "shared_safety_store_unavailable" }, 503);
    }
    if (count > MAX_DAILY_NEW_QUOTES) {
      return json({ error: "daily_quote_budget_reached" }, 429);
    }

    // Only this path may reach INTERWELT. The lock remains after a failed
    // upstream response for 90s to discourage immediate duplicate records.
    const provider = await quoteProvider({
      origin_country_id: route.origin_country_id,
      destination_region_id: route.destination_region_id,
      ages: search.ages,
      departure: search.departure,
      return: search.return
    });
    const payload = publicPayload(provider, search);
    const saved = await redisCommand(redis, ["SET", cachedKey, JSON.stringify(payload), "EX", CACHE_SECONDS]);
    if (saved !== "OK") return json({ error: "rate_cache_write_failed" }, 503);
    return json({ ...payload, cache_status: "fresh" });
  } catch {
    // Never expose Redis credentials, provider response, JWT, quote_id or errors.
    return json({ error: "quote_unavailable_no_auto_retry" }, 503);
  }
}


/**
 * Explicit operator-only Upstash connectivity self-check.
 *
 * Separate from live quotes: it touches ONLY two ephemeral Redis keys,
 * with 60s TTLs and cleanup. It cannot call INTERWELT or mint JWTs.
 * A POST and the existing x-pilot-token are required. Both quote
 * switches must remain disabled to run this test.
 */
export async function redisReadinessRequest(request, env) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!env.INTERWELT_PILOT_TOKEN ||
      request.headers.get("x-pilot-token") !== env.INTERWELT_PILOT_TOKEN) {
    return json({ error: "forbidden" }, 403);
  }
  if (env.INTERWELT_PILOT_ENABLED === "true" ||
      env.INTERWELT_PUBLIC_RATES_ENABLED === "true") {
    return json({ error: "disable_quotes_before_check" }, 409);
  }
  const config = upstashConfig(env);
  if (!config) return json({ error: "redis_not_configured" }, 503);
  const checkId = randomUUID();
  const cacheKey = "iw:diagnostic:" + checkId;
  const counterKey = "iw:diagnostic:quota:" + checkId;
  try {
    // 60-second expiry prevents leftovers if a request fails midway.
    const written = await redisCommand(config, [
      "SET", cacheKey, "check", "EX", "60", "NX"
    ]);
    if (written !== "OK") throw new Error("redis_write_check_failed");
    const readBack = await redisCommand(config, ["GET", cacheKey]);
    if (readBack !== "check") throw new Error("redis_read_check_failed");
    // Run exactly the quota Lua script used by the public gateway, but
    // against a randomly named diagnostic key (never the real daily quota).
    const atomic = await redisCommand(config, [
      "EVAL", QUOTA_SCRIPT, "1", counterKey, "60"
    ]);
    if (Number(atomic) !== 1) throw new Error("redis_quota_check_failed");
    const deleted = await redisCommand(config, ["DEL", cacheKey, counterKey]);
    if (Number(deleted) !== 2) throw new Error("redis_cleanup_failed");
    return json({
      mode: "operator_redis_check",
      redis_connected: true,
      read_write_ok: true,
      atomic_quota_ok: true,
      temporary_keys_cleaned: true,
      provider_contacted: false,
      quotes_submitted: false,
      payments_enabled: false,
      vouchers_enabled: false
    });
  } catch {
    // No Redis response body, internal error text, keys, JWT or credentials.
    // Any diagnostic keys remaining after failure expire automatically.
    return json({
      mode: "operator_redis_check",
      redis_connected: false,
      provider_contacted: false,
      quotes_submitted: false,
      payments_enabled: false,
      vouchers_enabled: false
    }, 503);
  }
}
