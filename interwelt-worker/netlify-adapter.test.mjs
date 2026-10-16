import test from "node:test";
import assert from "node:assert/strict";
import adapter from "../netlify/functions/interwelt-quote.mjs";

test("GET exposes safe health response", async () => {
  const res = await adapter(new Request("https://example.netlify.app/.netlify/functions/interwelt-quote"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok", mode: "readonly", vouchers_enabled: false });
});

test("POST stays disabled when secrets not configured", async () => {
  const previous = process.env.INTERWELT_PILOT_ENABLED;
  delete process.env.INTERWELT_PILOT_ENABLED;
  try {
    const res = await adapter(new Request("https://example.netlify.app/.netlify/functions/interwelt-quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    }));
    assert.equal(res.status, 503);
  } finally {
    if (previous !== undefined) process.env.INTERWELT_PILOT_ENABLED = previous;
  }
});

test("cannot call PATCH/PUT on this endpoint", async () => {
  const res = await adapter(new Request("https://example.netlify.app/.netlify/functions/interwelt-quote", { method: "PUT" }));
  assert.equal(res.status, 405);
});

test("demo endpoint serves only static data without calling external services", async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Unexpected network request in demo"); };
  try {
    const res = await adapter(new Request("https://example.netlify.app/.netlify/functions/interwelt-quote?demo=1"));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.mode, "demo");
    assert.equal(data.live, false);
    assert.equal(data.currency_confirmed, false);
    assert.equal(data.vouchers_enabled, false);
    assert.equal(data.payments_enabled, false);
    assert.equal(data.prices.length, 5);
    assert.ok(!JSON.stringify(data).includes("access_token"));
    assert.ok(!JSON.stringify(data).includes("INTERWELT_PASSWORD"));
  } finally {
    globalThis.fetch = oldFetch;
  }
});
