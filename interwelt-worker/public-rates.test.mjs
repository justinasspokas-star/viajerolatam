import test from "node:test";
import assert from "node:assert/strict";
import { publicRatesRequest, redisReadinessRequest } from "./public-rates.mjs";

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
  INTERWELT_PUBLIC_LAUNCH_APPROVED: "true",
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
      } else if (name === "DEL") {
        result = 0;
        for (const key of command.slice(1)) {
          if (map.delete(key)) result++;
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


const redisDiagnosticRequest = (token = "redis-test-only-operator") => new Request(
  "https://test.netlify.app/.netlify/functions/interwelt-quote?redis_check=1", {
    method: "POST",
    headers: { "x-pilot-token": token }
  }
);

test("operator Redis probe requires private header and both quote switches off", async () => {
  const oldFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {calls++;throw Error("Unexpected network call");};
  try {
    const config = { ...env(), INTERWELT_PILOT_TOKEN: "redis-test-only-operator",
      INTERWELT_PUBLIC_RATES_ENABLED: "false", INTERWELT_PILOT_ENABLED: "false" };
    let response = await redisReadinessRequest(redisDiagnosticRequest("bad"), config);
    assert.equal(response.status, 403);
    response = await redisReadinessRequest(redisDiagnosticRequest(), {...config,INTERWELT_PILOT_ENABLED:"true"});
    assert.equal(response.status,409);
    response = await redisReadinessRequest(redisDiagnosticRequest(), {...config,INTERWELT_PUBLIC_RATES_ENABLED:"true"});
    assert.equal(response.status,409);
    response = await redisReadinessRequest(redisDiagnosticRequest(), {...config,UPSTASH_REDIS_REST_TOKEN:""});
    assert.equal(response.status,503);
    assert.equal(calls,0);
  } finally { globalThis.fetch = oldFetch; }
});

test("operator Redis probe validates SET NX EX, GET, quota EVAL, cleanup; never calls provider", async () => {
  const originalFetch = globalThis.fetch, redis = fakeRedis();
  const names = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).hostname, "unit-test.upstash.io");
    const command = JSON.parse(init.body);
    names.push(command[0]);
    if (command[0] === "EVAL") {
      assert.equal(command[2], "1");
      assert.ok(String(command[3]).startsWith("iw:diagnostic:quota:"));
    }
    return redis.fetch(url, init);
  };
  try {
    const response = await redisReadinessRequest(redisDiagnosticRequest(), {
      ...env(),
      INTERWELT_PILOT_TOKEN: "redis-test-only-operator",
      INTERWELT_PUBLIC_RATES_ENABLED: "false",
      INTERWELT_PILOT_ENABLED: "false"
    });
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{
      mode:"operator_redis_check",
      redis_connected:true,
      read_write_ok:true,
      atomic_quota_ok:true,
      temporary_keys_cleaned:true,
      provider_contacted:false,
      quotes_submitted:false,
      payments_enabled:false,
      vouchers_enabled:false
    });
    assert.deepEqual(names,["SET","GET","EVAL","DEL"]);
    assert.equal(redis.map.size,0);
  } finally {globalThis.fetch=originalFetch;}
});

test("operator Redis probe hides backend errors and never creates quotes on outages",async()=>{
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw Error("fake Redis secret data must not be returned to the browser");
  };
  try {
    const response = await redisReadinessRequest(redisDiagnosticRequest(),{
      ...env(), INTERWELT_PILOT_TOKEN:"redis-test-only-operator",
      INTERWELT_PUBLIC_RATES_ENABLED:"false",
      INTERWELT_PILOT_ENABLED:"false"
    });
    assert.equal(response.status,503);
    const body=await response.json();
    assert.equal(body.redis_connected,false);
    assert.equal(body.provider_contacted,false);
    assert.equal(body.quotes_submitted,false);
    assert.ok(!JSON.stringify(body).includes("secret data"));
  } finally {globalThis.fetch=oldFetch;}
});


test("different traveler ages or travel dates do not reuse another customer's cached price", async () => {
  const originalFetch = globalThis.fetch, redis = fakeRedis();
  globalThis.fetch = (...args) => redis.fetch(...args);
  let quotes = 0;
  try {
    const quoteProvider = async () => {
      quotes++;
      return {
        source: "INTERWELT", live: true, currency: "USD",
        quote_id: 99999,
        prices: [{ id: 206, name: "SOMOS EUROPA*", total: 40 + quotes }]
      };
    };
    const first = await publicRatesRequest(request(sample()), env(), quoteProvider);
    assert.equal(first.status, 200);
    assert.equal((await first.json()).prices[0].total, 41);
    const second = await publicRatesRequest(
      request({ ...sample(), ages: [31] }), env(), quoteProvider
    );
    assert.equal(second.status, 200);
    assert.equal((await second.json()).prices[0].total, 42);
    const third = await publicRatesRequest(
      request({ ...sample(), departure: future(11) }), env(), quoteProvider
    );
    assert.equal(third.status, 200);
    assert.equal((await third.json()).prices[0].total, 43);
    const repeat = await publicRatesRequest(request(sample()), env(), quoteProvider);
    const repeated = await repeat.json();
    assert.equal(repeat.status, 200);
    assert.equal(repeated.cache_status, "hit");
    assert.equal(repeated.prices[0].total, 41);
    assert.equal(quotes, 3);
    assert.equal("quote_id" in repeated, false);
    for (const key of redis.map.keys()) {
      assert.ok(!key.includes(sample().departure));
      assert.ok(!key.includes("mock-operator@example.org"));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("provider plan catalog is double-checked before anything is shown to travelers",async()=>{
  const oldFetch=globalThis.fetch,redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  try{
    const quote=async()=>({
      source:"INTERWELT",live:true,currency:"USD",quote_id:87654,
      prices:[
        {id:206,name:"SOMOS EUROPA*",total:101},
        {id:207,name:"INTERWELT 40",total:202},
        {id:208,name:"INTERWELT 60",total:303}, // max age 74
        {id:221,name:"LONG TRIP BASIC",total:404}, // only 30+ days
        {id:999,name:"UNREVIEWED PLAN",total:505},
        {id:209,name:"SOMOS EUROPA*",total:606} // wrong ID/name
      ]
    });
    const response=await publicRatesRequest(request({...sample(),ages:[75]}),env(),quote);
    assert.equal(response.status,200);
    const body=await response.json();
    assert.deepEqual(body.prices,[
      {id:206,name:"SOMOS EUROPA*",total:101},
      {id:207,name:"INTERWELT 40",total:202}
    ]);
    assert.equal("quote_id" in body,false);
    const again=await publicRatesRequest(request({...sample(),ages:[75]}),env(),quote);
    assert.equal(again.status,200);
    assert.equal((await again.json()).cache_status,"hit");
  }finally{globalThis.fetch=oldFetch}
});

test("when the provider returns only an age-incompatible plan, fail closed and do not cache",async()=>{
  const oldFetch=globalThis.fetch,redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  try{
    const quote=async()=>({
      source:"INTERWELT",live:true,currency:"USD",
      prices:[{id:209,name:"INTERWELT 100",total:123}]
    });
    const response=await publicRatesRequest(request({...sample(),ages:[75]}),env(),quote);
    assert.equal(response.status,503);
    assert.equal((await response.json()).error,"quote_unavailable_no_auto_retry");
    assert.equal([...redis.map.keys()].filter(key=>key.endsWith(":cache")).length,0);
  }finally{globalThis.fetch=oldFetch}
});


test("public flag alone cannot submit provider quotes without a second launch approval",async()=>{
  const previous=globalThis.fetch;
  let external=0, providerCalls=0;
  globalThis.fetch=async()=>{external++;throw Error("No network expected");};
  const mockedProvider=async()=>{providerCalls++;return provider();};
  try{
    let result=await publicRatesRequest(request(),{
      ...env(), INTERWELT_PUBLIC_LAUNCH_APPROVED:undefined
    },mockedProvider);
    assert.equal(result.status,503);
    assert.equal((await result.json()).error,"public_launch_not_approved");
    result=await publicRatesRequest(request(),{
      ...env(), INTERWELT_PUBLIC_LAUNCH_APPROVED:"false"
    },mockedProvider);
    assert.equal(result.status,503);
    result=await publicRatesRequest(request(),{
      ...env(), INTERWELT_PILOT_ENABLED:"true"
    },mockedProvider);
    assert.equal(result.status,503);
    assert.equal(providerCalls,0);
    assert.equal(external,0);
  }finally{globalThis.fetch=previous;}
});

test("tampered cached results cannot leak another trip, ineligible plan or extra data",async()=>{
  const original=globalThis.fetch, redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  let count=0;
  try{
    const mockedProvider=async()=>{count++;return provider();};
    const first=await publicRatesRequest(request(),env(),mockedProvider);
    assert.equal(first.status,200);
    const key=[...redis.map.keys()].find(x=>x.endsWith(":cache"));
    assert.ok(key);
    const stored=JSON.parse(redis.map.get(key));
    const examples=[
      {...stored,search:{...stored.search,ages:[40]}},
      {...stored,search:{...stored.search,departure:future(11)}},
      {...stored,prices:[{id:209,name:"INTERWELT 100",total:12.00}],search:{...stored.search,ages:[75]}},
      {...stored,prices:[{id:209,name:"SOMOS EUROPA*",total:12.00}]},
      {...stored,prices:[{id:999,name:"UNKNOWN",total:12.00}]},
      {...stored,quote_id:"private-upstream-id"},
      {...stored,extra_private_note:"never disclose"}
    ];
    for(const item of examples){
      redis.map.set(key,JSON.stringify(item));
      const response=await publicRatesRequest(request(),env(),mockedProvider);
      // Last case has only extraneous key, which should be stripped by
      // whitelist rather than reflected to the browser.
      if(item.extra_private_note){
        assert.equal(response.status,200);
        const body=await response.json();
        assert.equal(body.cache_status,"hit");
        assert.equal(Object.hasOwn(body,"extra_private_note"),false);
      }else{
        assert.equal(response.status,503);
        assert.equal((await response.json()).error,"cached_quote_unavailable");
      }
      assert.equal(count,1);
    }
  }finally{globalThis.fetch=original;}
});


test("after an expired lock, a corrupt cached result still cannot cause a duplicate upstream quote",async()=>{
  const oldFetch=globalThis.fetch,redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  let upstream=0;
  try{
    const quote=async()=>{
      upstream++;
      return provider();
    };
    const first=await publicRatesRequest(request(),env(),quote);
    assert.equal(first.status,200);
    const cacheKey=[...redis.map.keys()].find(key=>key.endsWith(":cache"));
    const lockKey=[...redis.map.keys()].find(key=>key.endsWith(":lock"));
    assert.ok(cacheKey);
    assert.ok(lockKey);
    redis.map.delete(lockKey); // simulate 90-second lock expiry
    const payload=JSON.parse(redis.map.get(cacheKey));
    payload.search.ages=[99]; // unexpected data in Redis
    redis.map.set(cacheKey,JSON.stringify(payload));
    const res=await publicRatesRequest(request(),env(),quote);
    assert.equal(res.status,503);
    assert.equal((await res.json()).error,"cached_quote_unavailable");
    assert.equal(upstream,1);
    assert.equal([...redis.map.keys()].filter(key=>key.endsWith(":lock")).length,0,
      "The corrupt cache should not even acquire a new lock");
  }finally{globalThis.fetch=oldFetch;}
});

test("a cache miss after expiry can start a new quote, with normal budget protection",async()=>{
  const oldFetch=globalThis.fetch,redis=fakeRedis();
  globalThis.fetch=(...args)=>redis.fetch(...args);
  let upstream=0;
  try{
    const quote=async()=>{
      upstream++;
      return provider();
    };
    const first=await publicRatesRequest(request(),env(),quote);
    assert.equal(first.status,200);
    const cacheKey=[...redis.map.keys()].find(key=>key.endsWith(":cache"));
    const lockKey=[...redis.map.keys()].find(key=>key.endsWith(":lock"));
    redis.map.delete(cacheKey); // simulate TTL expiry
    redis.map.delete(lockKey);
    const second=await publicRatesRequest(request(),env(),quote);
    assert.equal(second.status,200);
    assert.equal((await second.json()).cache_status,"fresh");
    assert.equal(upstream,2);
  }finally{globalThis.fetch=oldFetch;}
});
