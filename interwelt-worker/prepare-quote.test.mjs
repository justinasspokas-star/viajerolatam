import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearch, prepareQuoteRequest, confirmedProviderRoute, inspectRouteRequest } from "./prepare-quote.mjs";

const future = days => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const sample=()=>({
  origin:"co",destination:"espana-schengen",
  departure:future(10),return:future(24),ages:[30]
});
const req = (body, options={}) => new Request("https://example.netlify.app/.netlify/functions/interwelt-quote?prepare=1",{
  method:"POST",headers:{"content-type":"application/json",...(options.headers||{})},
  body: options.raw ?? JSON.stringify(body)
});

test("validates trip without requesting rates or provider login", async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async ()=> {throw Error("No network expected");};
  try {
    const response=await prepareQuoteRequest(req(sample()));
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.mode,"validation");
    assert.equal(data.live,false);
    assert.equal(data.validated,true);
    assert.equal(data.search.days,15);
    assert.equal(data.search.region,"europe");
    assert.deepEqual(data.search.ages,[30]);
    assert.deepEqual(data.prices,[]);
    assert.equal(data.currency,null);
    assert.equal(data.mapping_verified,false);
    assert.equal(data.vouchers_enabled,false);
    assert.equal(data.payments_enabled,false);
  } finally {globalThis.fetch=original;}
});

test("dates and each traveller age are validated",() => {
  assert.equal(normalizeSearch({...sample(), ages:[40,15]}).people,2);
  assert.equal(normalizeSearch({...sample(), ages:[101]}),null);
  assert.equal(normalizeSearch({...sample(), ages:[]}),null);
  assert.equal(normalizeSearch({...sample(), ages:Array(9).fill(30)}),null);
  assert.equal(normalizeSearch({...sample(), departure:"2026-02-30"}),null);
  assert.equal(normalizeSearch({...sample(), return:future(150)}).days, 141);
  // Inclusive counting: day 10 to day 374 is 365 days; day 375 is 366.
  assert.equal(normalizeSearch({...sample(), return:future(374)}).days, 365);
  assert.equal(normalizeSearch({...sample(), return:future(375)}), null);
  assert.equal(normalizeSearch({...sample(), origin:"XX"}),null);
  assert.equal(normalizeSearch({...sample(), destination:"no-such-zone"}),null);
});

test("normalizes North America but does not guess provider numeric IDs", () => {
  const a=normalizeSearch({...sample(), destination:"eeuu-canada"});
  assert.equal(a.region,"north-america");
  assert.equal("origin_country_id" in a,false);
  assert.equal("destination_region_id" in a,false);
});

test("rejects cross-origin POST and invalid types", async () => {
  assert.equal((await prepareQuoteRequest(req(sample(),{headers:{origin:"https://malicious.example"}}))).status,403);
  const bad=await prepareQuoteRequest(req(sample(),{raw:'{"origin":'}));
  assert.equal(bad.status,400);
  assert.equal((await prepareQuoteRequest(new Request("https://example.netlify.app/.netlify/functions/interwelt-quote?prepare=1"))).status,405);
});

test("rejects unsolicited profile and non-JSON request", async () => {
  const bad=new Request("https://example.netlify.app/.netlify/functions/interwelt-quote?prepare=1",{
    method:"POST",headers:{"content-type":"text/plain"},body:"hello"
  });
  assert.equal((await prepareQuoteRequest(bad)).status,415);
  const big=req(sample(),{raw:JSON.stringify({...sample(), junk:"x".repeat(1900)})});
  assert.equal((await prepareQuoteRequest(big)).status,413);
});


test("only provider-confirmed country and region IDs are exposed in dry-run preflight", async () => {
  const originalFetch=globalThis.fetch;
  let upstream=0;
  globalThis.fetch=async ()=>{upstream++;throw Error("Never contact INTERWELT in route check");};
  try {
    for (const [origin,originId] of [["co",48],["pe",173],["mx",142]]) {
      for (const [destination,regionId] of [["espana-schengen",2],["eeuu",6]]) {
        const response=await inspectRouteRequest(req({...sample(),origin,destination}));
        assert.equal(response.status,200);
        const body=await response.json();
        assert.equal(body.mode,"route_mapping_preview");
        assert.equal(body.route_supported,true);
        assert.equal(body.mapping_verified,true);
        assert.equal(body.currency,"USD");
        assert.deepEqual(body.provider_route,{origin_country_id:originId,destination_region_id:regionId,currency:"USD"});
        assert.equal(body.live,false);
        assert.equal(body.rates_available,false);
        assert.deepEqual(body.prices,[]);
        assert.equal(body.eligible,null);
        assert.equal(body.payments_enabled,false);
        assert.equal(body.vouchers_enabled,false);
      }
    }
    assert.equal(upstream,0);
  } finally {globalThis.fetch=originalFetch;}
});

test("a valid unconfirmed origin is never mapped to provider IDs", async () => {
  const response=await inspectRouteRequest(req({...sample(),origin:"ar"}));
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.validated,true);
  assert.equal(body.route_supported,false);
  assert.equal(body.mapping_verified,false);
  assert.equal(body.provider_route,null);
  assert.equal(body.currency,null);
  assert.deepEqual(body.prices,[]);
  assert.equal(confirmedProviderRoute(body.search),null);
});

test("route inspection retains same-origin and input-length protections", async () => {
  const external=await inspectRouteRequest(req(sample(),{headers:{origin:"https://not-this-site.example"}}));
  assert.equal(external.status,403);
  const invalid=await inspectRouteRequest(req({...sample(), ages:[-1]}));
  assert.equal(invalid.status,400);
  const malformed=await inspectRouteRequest(req(sample(),{raw:"not-json"}));
  assert.equal(malformed.status,400);
  assert.equal((await inspectRouteRequest(new Request("https://test.local/.netlify/functions/interwelt-quote"))).status,405);
});
