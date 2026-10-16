/**
 * Netlify Functions adapter for the INTERWELT private pilot.
 * GET /               -> safe healthcheck
 * GET /?demo=1        -> static demo data ONLY (no external provider calls)
 * POST /              -> disabled live pilot unless separately configured
 *
 * Never publish INTERWELT_PASSWORD or the pilot token in any frontend script.
 */
import worker from "../../interwelt-worker/worker.js";

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
  if (request.method === "GET" && url.searchParams.get("demo") === "1") {
    return Response.json({
      mode: "demo",
      live: false,
      source: "historical_test_fixture",
      warning: "DATOS DE DEMOSTRACIÓN: precios históricos de una prueba, no oferta vigente ni cotización en directo.",
      sample_trip: { travellers: 1, age: 30, days: 15, region: "Europa y Mediterráneo" },
      currency: null, // No se ha verificado la moneda en el JSON de cotizaciones.
      currency_confirmed: false,
      prices: DEMO_PLANS,
      payments_enabled: false,
      vouchers_enabled: false
    }, { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
  }
  if (request.method !== "POST" && request.method !== "GET") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  url.pathname = request.method === "GET" ? "/health" : "/api/quote";
  return worker.fetch(new Request(url, request), process.env);
}
