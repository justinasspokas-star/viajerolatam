/**
 * Netlify Functions adapter for the INTERWELT private pilot.
 * GET /               -> safe healthcheck
 * GET /?demo=1        -> static demo data ONLY (no external provider calls)
 * POST /              -> disabled live pilot unless separately configured
 *
 * Never publish INTERWELT_PASSWORD or the pilot token in any frontend script.
 */
import worker, { quoteWithProvider } from "../../interwelt-worker/worker.js";
import { publicRatesRequest } from "../../interwelt-worker/public-rates.mjs";
import {prepareQuoteRequest, inspectRouteRequest} from "../../interwelt-worker/prepare-quote.mjs";

// Historical example values from a test quote, never offered as live prices.
// Keep non-PII only: exclude traveller info, contact details and quote IDs.
const DEMO_PLANS = Object.freeze([
  { id: 206, name: "SOMOS EUROPA*", total: 33.97 },
  { id: 205, name: "ESTELAR", total: 48.00 },
  { id: 207, name: "INTERWELT 40", total: 70.13 },
  { id: 208, name: "INTERWELT 60", total: 94.85 },
  { id: 209, name: "INTERWELT 100", total: 115.24 }
]);

export default async function interweltQuote(request) {
  const url = new URL(request.url);
  if (url.searchParams.get("public_rates") === "1") {
    // Requires independent public flag, shared Redis lock/cache, global quota
    // and validated provider route. OFF by default, no browser credentials.
    return publicRatesRequest(request, process.env, input => quoteWithProvider(input, process.env));
  }
  // Same-origin validation: zero external requests, no secrets, no vouchers.
  if (url.searchParams.get("route_check") === "1") {
    return inspectRouteRequest(request);
  }
  if (url.searchParams.get("prepare") === "1") {
    return prepareQuoteRequest(request);
  }
  if (request.method === "GET" && url.searchParams.get("demo") === "1") {
    return Response.json({
      mode: "demo",
      live: false,
      source: "historical_test_fixture",
      warning: "DATOS DE DEMOSTRACIÓN: precios históricos de una prueba, no oferta vigente ni cotización en directo.",
      sample_trip: { origin: "colombia", destination: "espana", departure: "2026-11-01", return: "2026-11-15", travellers: 1, ages: [30], days: 15, region: "Europa y Mediterráneo" },
      currency: "USD", // Provider confirmed final sale prices in USD on 2026-10-20.
      currency_confirmed: true,
      prices: DEMO_PLANS,
      payments_enabled: false,
      vouchers_enabled: false
    }, { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  }
  if (request.method !== "POST" && request.method !== "GET") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  if (request.method === "GET" && url.searchParams.get("check") === "1") {
    url.pathname = "/api/check";
  } else if (request.method === "POST" && url.searchParams.get("auth_check") === "1") {
    url.pathname = "/api/auth-check";
  } else {
    url.pathname = request.method === "GET" ? "/health" : "/api/quote";
  }
  return worker.fetch(new Request(url, request), process.env);
}

// Netlify edge-enforced per-IP rate limit for the isolated test endpoint.
// Not a global quota across visitors; enforcement may lag briefly.
// Deploy log "Post-processing" must confirm the rule was accepted.
export const config = {
  path: "/.netlify/functions/interwelt-quote",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"]
  }
};
