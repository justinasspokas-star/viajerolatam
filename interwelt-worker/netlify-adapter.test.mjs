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
    assert.equal(data.currency, "USD");
    assert.equal(data.currency_confirmed, true);
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

test("private readiness path stays protected by operator token",async()=>{
  const prior=process.env.INTERWELT_PILOT_TOKEN;
  process.env.INTERWELT_PILOT_TOKEN="test-adapter-only-token";
  try {
    const anonymous=await adapter(new Request("https://test.netlify.app/.netlify/functions/interwelt-quote?check=1"));
    assert.equal(anonymous.status,403);
    const authorized=await adapter(new Request("https://test.netlify.app/.netlify/functions/interwelt-quote?check=1",{
      headers:{"x-pilot-token":"test-adapter-only-token"}
    }));
    assert.equal(authorized.status,200);
    const json=await authorized.json();
    assert.equal(json.mode,"operator_readonly");
    assert.equal(json.currency_confirmed,true);
    assert.equal(json.payments_enabled,false);
    assert.equal(json.vouchers_enabled,false);
  }finally{
    if(prior===undefined)delete process.env.INTERWELT_PILOT_TOKEN;
    else process.env.INTERWELT_PILOT_TOKEN=prior;
  }
});


test("POST auth_check routes through the operator-only login probe without quotes", async () => {
  const keys = ["INTERWELT_PILOT_TOKEN", "INTERWELT_EMAIL", "INTERWELT_PASSWORD", "INTERWELT_PILOT_ENABLED"];
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  process.env.INTERWELT_PILOT_TOKEN = "private-test-probe";
  process.env.INTERWELT_EMAIL = "adapter-probe@example.org";
  process.env.INTERWELT_PASSWORD = "test-password-not-real";
  process.env.INTERWELT_PILOT_ENABLED = "false";
  let authCalls = 0;
  globalThis.fetch = async url => {
    assert.equal(new URL(url).pathname, "/api/auth/login");
    authCalls++;
    return Response.json({ token: "probe-only-jwt" });
  };
  try {
    const url = "https://test.netlify.app/.netlify/functions/interwelt-quote?auth_check=1";
    const unauthorized = await adapter(new Request(url, { method: "POST" }));
    assert.equal(unauthorized.status, 403);
    const authorized = await adapter(new Request(url, {
      method: "POST", headers: { "x-pilot-token": "private-test-probe" }
    }));
    assert.equal(authorized.status, 200);
    const body = await authorized.json();
    assert.equal(body.mode, "operator_auth_check");
    assert.equal(body.authenticated, true);
    assert.equal(body.quotes_submitted, false);
    assert.equal(body.vouchers_enabled, false);
    assert.equal(body.payments_enabled, false);
    assert.equal(authCalls, 1);
    assert.ok(!JSON.stringify(body).includes("probe-only-jwt"));
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (prior[key] === undefined) delete process.env[key];
      else process.env[key] = prior[key];
    }
  }
});


test("Netlify route_check accepts confirmed routes but never fetches provider quotes", async () => {
  const originalFetch=globalThis.fetch;
  const original=process.env.INTERWELT_PILOT_ENABLED;
  let networkCalls=0;
  process.env.INTERWELT_PILOT_ENABLED="false";
  globalThis.fetch=async ()=>{networkCalls++;throw Error("Provider must not be contacted");};
  const today=new Date();
  today.setUTCDate(today.getUTCDate()+10);
  const departure=today.toISOString().slice(0,10);
  today.setUTCDate(today.getUTCDate()+14);
  const arrival=today.toISOString().slice(0,10);
  try {
    const response=await adapter(new Request("https://interwelt-api-test.netlify.app/.netlify/functions/interwelt-quote?route_check=1",{
      method:"POST",
      headers:{"content-type":"application/json","origin":"https://interwelt-api-test.netlify.app"},
      body:JSON.stringify({origin:"pe",destination:"espana-schengen",departure,return:arrival,ages:[30,15]})
    }));
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.mode,"route_mapping_preview");
    assert.deepEqual(data.provider_route,{origin_country_id:173,destination_region_id:2,currency:"USD"});
    assert.equal(data.live,false);
    assert.equal(data.rates_available,false);
    assert.equal(data.payments_enabled,false);
    assert.equal(data.vouchers_enabled,false);
    assert.deepEqual(data.prices,[]);
    assert.equal(networkCalls,0);
  }finally{
    globalThis.fetch=originalFetch;
    if(original===undefined)delete process.env.INTERWELT_PILOT_ENABLED;
    else process.env.INTERWELT_PILOT_ENABLED=original;
  }
});


test("public_rates requires its own kill-switch; pilot activation alone cannot expose live quotes", async () => {
  const keys = ["INTERWELT_PUBLIC_RATES_ENABLED","INTERWELT_PILOT_ENABLED","UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  const oldFetch=globalThis.fetch;
  let upstreamCalls=0;
  globalThis.fetch=async()=>{upstreamCalls++;throw Error("public quote must not reach provider");};
  process.env.INTERWELT_PUBLIC_RATES_ENABLED="false";
  process.env.INTERWELT_PILOT_ENABLED="true";
  process.env.UPSTASH_REDIS_REST_URL="https://unit-test.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN="fake-unit-token";
  const date=new Date();
  date.setUTCDate(date.getUTCDate()+10);
  const departure=date.toISOString().slice(0,10);
  date.setUTCDate(date.getUTCDate()+14);
  const returning=date.toISOString().slice(0,10);
  try {
    const r=await adapter(new Request("https://test.netlify.app/.netlify/functions/interwelt-quote?public_rates=1", {
      method:"POST",
      headers:{"content-type":"application/json","origin":"https://test.netlify.app"},
      body:JSON.stringify({origin:"co",destination:"espana-schengen",
        departure,return:returning,ages:[30]})
    }));
    assert.equal(r.status,503);
    assert.deepEqual(await r.json(),{error:"public_rates_disabled"});
    assert.equal(upstreamCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
    for(const key of keys){
      if(previous[key]===undefined)delete process.env[key];
      else process.env[key]=previous[key];
    }
  }
});
