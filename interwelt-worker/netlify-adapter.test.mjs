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
    assert.deepEqual(data.sample_trip, {
      origin: "colombia",
      destination: "espana",
      departure: "2026-11-01",
      return: "2026-11-15",
      travellers: 1,
      ages: [30],
      days: 15,
      region: "Europa y Mediterráneo"
    });
    assert.ok(!JSON.stringify(data).includes("access_token"));
    assert.ok(!JSON.stringify(data).includes("INTERWELT_PASSWORD"));
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("PREPARE validates browser itinerary using the Netlify adapter without provider network calls", async () => {
  const addDays = count => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + count);
    return date.toISOString().slice(0, 10);
  };
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async () => {throw new Error("No upstream requests permitted");};
  try {
    const res=await adapter(new Request("https://example.netlify.app/.netlify/functions/interwelt-quote?prepare=1", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        origin:"co",destination:"espana-schengen",
        departure:addDays(7),return:addDays(21),ages:[30,40]
      })
    }));
    assert.equal(res.status,200);
    const data=await res.json();
    assert.equal(data.mode,"validation");
    assert.equal(data.live,false);
    assert.equal(data.search.people,2);
    assert.equal(data.search.days,15);
    assert.equal(data.mapping_verified,false);
    assert.equal(data.vouchers_enabled,false);
    assert.deepEqual(data.prices,[]);
  } finally {globalThis.fetch=oldFetch;}
});
