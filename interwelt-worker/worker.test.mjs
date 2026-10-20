import test from "node:test";
import assert from "node:assert/strict";
import worker, { validate, pricesFromApi } from "./worker.js";

function datePlus(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const sample = () => ({
  origin_country_id: 48,
  destination_region_id: 2,
  ages: [30],
  departure: datePlus(10),
  return: datePlus(25)
});
const env = () => ({
  INTERWELT_PILOT_ENABLED: "true",
  INTERWELT_PILOT_TOKEN: "test-only-secret",
  INTERWELT_EMAIL: "operator@example.org",
  INTERWELT_PASSWORD: "not-a-real-password",
  INTERWELT_CONTACT_EMAIL: "operator@example.org",
  INTERWELT_CONTACT_PHONE: "123456789",
});
function pilotRequest(body, token = "test-only-secret") {
  return new Request("https://test.local/api/quote", {
    method: "POST",
    headers: { "content-type": "application/json", "x-pilot-token": token },
    body: JSON.stringify(body)
  });
}

test("health exposes no provider credentials", async () => {
  const res = await worker.fetch(new Request("https://test.local/health"), {});
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", mode: "readonly", vouchers_enabled: false });
});

test("pilot refuses requests when disabled", async () => {
  const res = await worker.fetch(pilotRequest(sample()), {});
  assert.equal(res.status, 503);
});

test("pilot refuses missing or incorrect access token", async () => {
  const res = await worker.fetch(pilotRequest(sample(), "bad"), env());
  assert.equal(res.status, 403);
});

test("invalid dates and mismatched ages are rejected", async () => {
  assert.equal(validate({ ...sample(), ages: [], departure: "2026-02-30" }), null);
  const res = await worker.fetch(pilotRequest({ ...sample(), ages: [] }), env());
  assert.equal(res.status, 400);
});

test("parses nested provider plans without guessing currency", () => {
  assert.deepEqual(pricesFromApi({
    plans: [{ plans: { IdPlan: 206, NombrePlan: "SOMOS EUROPA*", montoVenta_detalle: [{ tipo: "Venta", valor: 33.97 }] } }]
  }), [{ id: 206, name: "SOMOS EUROPA*", total: 33.97 }]);
});

test("authenticates, quotes and never calls a voucher endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const paths = [];
  let sentQuote;
  globalThis.fetch = async (url, init) => {
    paths.push(new URL(url).pathname);
    if (String(url).endsWith("/api/auth/login")) {
      assert.deepEqual(JSON.parse(init.body), {
        correo: "operator@example.org",
        password: "not-a-real-password"
      });
      return Response.json({ token: "fake-test-jwt" });
    }
    if (String(url).endsWith("/api/quotes")) {
      assert.equal(init.headers.authorization, "Bearer fake-test-jwt");
      sentQuote = JSON.parse(init.body);
      return Response.json({
        id: 42,
        plans: [{ plans: { IdPlan: 205, NombrePlan: "ESTELAR", montoVenta_detalle: [{ tipo: "Venta", valor: 48 }] } }]
      }, { status: 201 });
    }
    throw new Error("unexpected provider endpoint");
  };
  try {
    const res = await worker.fetch(pilotRequest(sample()), env());
    assert.equal(res.status, 200);
    assert.deepEqual(paths, ["/api/auth/login", "/api/quotes"]);
    assert.equal(sentQuote.multTravel, false);
    assert.equal("multiTravel" in sentQuote, false);
    assert.equal(sentQuote.cantPax, 1);
    const body = await res.json();
    assert.equal(body.quote_id, 42);
    assert.equal(body.prices[0].total, 48);
    assert.equal(body.currency, "USD");
    assert.equal(body.currency_confirmed, true);
    assert.equal(body.mode, "operator_quote");
    assert.equal(body.live, true);
    assert.equal(body.mapping_verified, false);
    assert.equal(body.eligible, null);
    assert.equal(body.payments_enabled, false);
    assert.equal(body.search.days, 16);
    assert.equal(body.vouchers_enabled, false);
    assert.ok(!JSON.stringify(body).includes("fake-test-jwt"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("operator readiness endpoint requires token and never reveals credentials", async () => {
  const config=env();
  let res=await worker.fetch(new Request("https://test.local/api/check"), config);
  assert.equal(res.status,403);
  res=await worker.fetch(new Request("https://test.local/api/check",{
    headers:{"x-pilot-token":"bad"}
  }),config);
  assert.equal(res.status,403);
  res=await worker.fetch(new Request("https://test.local/api/check",{
    headers:{"x-pilot-token":"test-only-secret"}
  }),config);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.equal(body.credentials_configured,true);
  assert.equal(body.currency_confirmed,true);
  assert.equal(body.live_quotes_enabled,true);
  assert.equal(body.payments_enabled,false);
  assert.equal(body.vouchers_enabled,false);
  assert.ok(!JSON.stringify(body).includes("not-a-real-password"));
  assert.ok(!JSON.stringify(body).includes("operator@example.org"));
});
