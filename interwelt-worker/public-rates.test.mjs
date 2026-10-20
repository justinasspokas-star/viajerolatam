import test from "node:test";
import assert from "node:assert/strict";
import { publicRatesRequest } from "./public-rates.mjs";

const future = n => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};
const sample = () => ({
  origin: "co", destination: "espana-schengen",
  departure: future(10), return: future(24), ages: [30]
});
const env = () => ({
  INTERWELT_PUBLIC_RATES_ENABLED: "true",
  INTERWELT_EMAIL: "mock-operator@example.org",
  INTERWELT_PASSWORD: "mock-private-password",
  INTERWELT_CONTACT_EMAIL: "mock-contact@example.org",
  INTERWELT_CONTACT_PHONE: "123456789",
  UPSTASH_REDIS_REST_URL: "https://unit-test.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "redis-test-only"
});
const request = (search = sample(), opts = {}) => new Request(
  "https://test.netlify.app/.netlify/functions/interwelt-quote?public_rates=1",
  {
    method: "POST",
    headers: { "content-type": "application/json",
      "origin": "https://test.netlify.app", ...opts.headers },
    body: opts.raw || JSON.stringify(search)
  }
);
const provider = async () => ({
  source: "INTERWELT", live: true, currency: "USD",
  quote_id: 123456,
  prices: [{ id: 206, name: "SOMOS EUROPA*", total: 33.97 }]
});

function fakeRedis() {
  const map = new Map();
  let requests = 0;
  return {
    map,
    get requests() { return requests; },
    async fetch(url, init) {
      requests++;
      assert.equal(new URL(url).hostname, "unit-test.upstash.io");
      assert.equal(init.headers.authorization, "Bearer redis-test-only");
      const command = JSON.parse(init.body);
      const name = command[0];
      let result;
      if (name === "GET") {
        result = map.get(command[1]) ?? null;
      } else if (name === "SET") {
        const nx = command.includes("NX");
        if (nx && map.has(command[1])) result = null;
        else {
          map.set(command[1], command[2]);
          result = "OK";
        }
      } else if (name === "EVAL") {
        const key = command[3];
        const value = Number(map.get(key) || 0) + 1;
        map.set(key, String(value));
        result = value;
      } else {
        throw Error("Unexpected Redis command " + name);
      }
      return Response.json({ result });
    }
  };
}

test("public quote route is OFF regardless of pilot status or missing Redis", async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => {throw Error("No network permitted");};
  try {
    let n = 0;
    const noProvider = async () => {n++;throw Error("provider called");};
    let r = await publicRatesRequest(request(), { ...env(), INTERWELT_PUBLIC_RATES_ENABLED:"false" }, noProvider);
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, "public_rates_disabled");
    r = await publicRatesRequest(request(), { ...env(), UPSTASH_REDIS_REST_TOKEN: "" }, noProvider);
    assert.equal(r.status, 503);
    assert.equal((await r.json()).error, "shared_safety_store_unavailable");
    assert.equal(n, 0);
  } finally {globalThis.fetch = orig;}
});

test("enforces same-origin browser requests and confirmed provider IDs", async () => {
  const orig=globalThis.fetch;
  const storage=fakeRedis();
  globalThis.fetch=(...args)=>storage.fetch(...args);
  let n=0;
  try {
    const quote = async (...args)=>{n++;return provider(...args);};
    let r = await publicRatesRequest(request(sample(),{headers:{origin:"https://evil.test"}}),env(),quote);
    assert.equal(r.status,403);
    r = await publicRatesRequest(request(sample(),{headers:{"sec-fetch-site":"cross-site"}}),env(),quote);
    assert.equal(r.status,403);
    r = await publicRatesRequest(request({...sample(),origin:"ar"}),env(),quote);
    assert.equal(r.status,422);
    assert.equal((await r.json()).error,"unconfirmed_provider_route");
    r = await publicRatesRequest(request({...sample(),ages:[101]}),env(),quote);
    assert.equal(r.status,400);
    assert.equal(n,0);
    assert.equal(storage.requests,0);
  } finally {globalThis.fetch=orig;}
});

test("first quote is cached; refreshing same search never calls provider again", async () => {
  const orig=globalThis.fetch, redis=fakeRedis();
  let called=0, received;
  globalThis.fetch=(...args)=>redis.fetch(...args);
  try {
    const quote=async input => {called++;received=input;return provider();};
    const first=await publicRatesRequest(request(),env(),quote);
    assert.equal(first.status,200);
    const a=await first.json();
    assert.equal(a.cache_status,"fresh");
    assert.equal(a.live,true);
    assert.equal(a.currency,"USD");
    assert.equal(a.prices[0].total,33.97);
    assert.deepEqual(received,{origin_country_id:48,destination_region_id:2,
      ages:[30],departure:sample().departure,return:sample().return});
    assert.equal("quote_id" in a,false);
    const second=await publicRatesRequest(request(),env(),quote);
    assert.equal(second.status,200);
    assert.equal((await second.json()).cache_status,"hit");
    assert.equal(called,1);
  } finally {globalThis.fetch=orig;}
});

test("concurrent identical requests use an atomic distributed lock", async () => {
  const orig=globalThis.fetch, redis=fakeRedis();
  let started=0;
  let release;
  const hold=new Promise(resolve => {release=resolve;});
  globalThis.fetch=(...args)=>redis.fetch(...args);
  try {
    const quote=async ()=>{started++;await hold;return provider();};
    const first=publicRatesRequest(request(),env(),quote);
    for(let n=0;n<20&&started===0;n++) await new Promise(resolve=>setImmediate(resolve));
    assert.equal(started,1);
    const duplicate=await publicRatesRequest(request(),env(),quote);
    assert.equal(duplicate.status,202);
    assert.equal((await duplicate.json()).error,"quote_in_progress");
    release();
    const response=await first;
    assert.equal(response.status,200);
    const cached=await publicRatesRequest(request(),env(),quote);
    assert.equal(cached.status,200);
    assert.equal((await cached.json()).cache_status,"hit");
    assert.equal(started,1);
  } finally {release?.();globalThis.fetch=orig;}
});

test("global daily quota caps new quotes across many distinct itineraries", async () => {
  const orig=globalThis.fetch,redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  let upstream=0;
  try {
    const quote=async()=>{upstream++;return provider();};
    for(let age=1;age<=20;age++) {
      const res=await publicRatesRequest(request({...sample(),ages:[age]}),env(),quote);
      assert.equal(res.status,200);
    }
    const denied=await publicRatesRequest(request({...sample(),ages:[30]}),env(),quote);
    assert.equal(denied.status,429);
    assert.equal((await denied.json()).error,"daily_quote_budget_reached");
    assert.equal(upstream,20);
  } finally {globalThis.fetch=orig;}
});

test("Redis failures fail closed without reaching provider", async () => {
  const orig=globalThis.fetch;
  globalThis.fetch=async()=>{throw Error("mock redis outage and secrets");};
  let calls=0;
  try {
    const result=await publicRatesRequest(request(),env(),async()=>{calls++;return provider();});
    assert.equal(result.status,503);
    assert.equal(calls,0);
    const response=await result.json();
    assert.equal(response.error,"quote_unavailable_no_auto_retry");
    assert.ok(!JSON.stringify(response).includes("secrets"));
  } finally {globalThis.fetch=orig;}
});

test("unverifiable provider responses are never cached as customer prices", async () => {
  const orig=globalThis.fetch,redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  try {
    const result=await publicRatesRequest(request(),env(),
      async()=>({source:"INTERWELT",live:true,currency:"USD",prices:[]}));
    assert.equal(result.status,503);
    assert.equal((await result.json()).error,"quote_unavailable_no_auto_retry");
    assert.equal([...redis.map.keys()].filter(x=>x.endsWith(":cache")).length,0);
  } finally {globalThis.fetch=orig;}
});
