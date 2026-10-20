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


test("reuses the provider JWT for multiple quotes in a warm instance", async () => {
  const originalFetch = globalThis.fetch;
  const config = { ...env(), INTERWELT_EMAIL: "cache-isolation@example.org" };
  let logins = 0;
  let quotes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/api/auth/login")) {
      logins++;
      return Response.json({ token: "cached-test-jwt" });
    }
    if (String(url).endsWith("/api/quotes")) {
      quotes++;
      assert.equal(init.headers.authorization, "Bearer cached-test-jwt");
      return Response.json({ id: quotes, plans: [] });
    }
    throw new Error("Unexpected network request");
  };
  try {
    for (let i = 0; i < 2; i++) {
      const res = await worker.fetch(pilotRequest(sample()), config);
      assert.equal(res.status, 200);
    }
    assert.equal(logins, 1);
    assert.equal(quotes, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("re-authenticates once and retries the quote once on provider 401", async () => {
  const originalFetch = globalThis.fetch;
  const config = { ...env(), INTERWELT_EMAIL: "expired-isolation@example.org" };
  let logins = 0;
  let quotes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/api/auth/login")) {
      logins++;
      return Response.json({ token: "relogin-jwt-" + logins });
    }
    if (String(url).endsWith("/api/quotes")) {
      quotes++;
      if (quotes === 1) {
        assert.equal(init.headers.authorization, "Bearer relogin-jwt-1");
        return Response.json({ error: "expired" }, { status: 401 });
      }
      assert.equal(init.headers.authorization, "Bearer relogin-jwt-2");
      return Response.json({ id: 5, plans: [] });
    }
    throw new Error("Unexpected network request");
  };
  try {
    const res = await worker.fetch(pilotRequest(sample()), config);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.quote_id, 5);
    assert.equal(logins, 2);
    assert.equal(quotes, 2);
    assert.ok(!JSON.stringify(body).includes("relogin-jwt"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not retry non-401 quote failures that could have been registered upstream", async () => {
  const originalFetch = globalThis.fetch;
  const config = { ...env(), INTERWELT_EMAIL: "error-isolation@example.org" };
  let logins = 0;
  let quotes = 0;
  globalThis.fetch = async url => {
    if (String(url).endsWith("/api/auth/login")) {
      logins++;
      return Response.json({ token: "non-retry-jwt" });
    }
    if (String(url).endsWith("/api/quotes")) {
      quotes++;
      return Response.json({ error: "provider failure" }, { status: 500 });
    }
    throw new Error("Unexpected network request");
  };
  try {
    const res = await worker.fetch(pilotRequest(sample()), config);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: "provider_unavailable_or_login_failed" });
    assert.equal(logins, 1);
    assert.equal(quotes, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("refreshes the cached JWT before the provider's 60-minute expiration", async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const config = { ...env(), INTERWELT_EMAIL: "age-isolation@example.org" };
  let now = originalNow();
  let logins = 0;
  let quotes = 0;
  Date.now = () => now;
  globalThis.fetch = async url => {
    if (String(url).endsWith("/api/auth/login")) {
      logins++;
      return Response.json({ token: "age-jwt-" + logins });
    }
    if (String(url).endsWith("/api/quotes")) {
      quotes++;
      return Response.json({ id: quotes, plans: [] });
    }
    throw new Error("Unexpected network request");
  };
  try {
    assert.equal((await worker.fetch(pilotRequest(sample()), config)).status, 200);
    now += 50 * 60 * 1000 + 1;
    assert.equal((await worker.fetch(pilotRequest(sample()), config)).status, 200);
    assert.equal(logins, 2);
    assert.equal(quotes, 2);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
  }
});

test("coalesces simultaneous logins without sharing the JWT with the browser", async () => {
  const originalFetch = globalThis.fetch;
  const config = { ...env(), INTERWELT_EMAIL: "parallel-isolation@example.org" };
  let logins = 0;
  let quotes = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/api/auth/login")) {
      logins++;
      await Promise.resolve();
      return Response.json({ token: "parallel-jwt" });
    }
    if (String(url).endsWith("/api/quotes")) {
      quotes++;
      assert.equal(init.headers.authorization, "Bearer parallel-jwt");
      return Response.json({ id: quotes, plans: [] });
    }
    throw new Error("Unexpected network request");
  };
  try {
    const [a, b] = await Promise.all([
      worker.fetch(pilotRequest(sample()), config),
      worker.fetch(pilotRequest(sample()), config)
    ]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal(logins, 1);
    assert.equal(quotes, 2);
    assert.ok(!JSON.stringify(await a.json()).includes("parallel-jwt"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("operator-only auth check authenticates without creating a quote, even when quotes are disabled", async () => {
  const originalFetch = globalThis.fetch;
  const config = {
    ...env(),
    INTERWELT_PILOT_ENABLED: "false",
    INTERWELT_EMAIL: "auth-check-isolation@example.org"
  };
  let loginCalls = 0;
  globalThis.fetch = async (url, init) => {
    assert.equal(new URL(url).pathname, "/api/auth/login");
    assert.equal(init.method, "POST");
    loginCalls++;
    return Response.json({ token: "auth-check-test-jwt" });
  };
  try {
    const endpoint = "https://test.local/api/auth-check";
    const unauthorized = await worker.fetch(new Request(endpoint, { method: "POST" }), config);
    assert.equal(unauthorized.status, 403);
    const authorized = await worker.fetch(new Request(endpoint, {
      method: "POST",
      headers: { "x-pilot-token": "test-only-secret" }
    }), config);
    assert.equal(authorized.status, 200);
    assert.deepEqual(await authorized.json(), {
      mode: "operator_auth_check",
      authenticated: true,
      quotes_submitted: false,
      payments_enabled: false,
      vouchers_enabled: false
    });
    assert.equal(loginCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("auth check hides upstream authentication failures", async () => {
  const originalFetch = globalThis.fetch;
  const config = {
    ...env(),
    INTERWELT_PILOT_ENABLED: "false",
    INTERWELT_EMAIL: "auth-failure-isolation@example.org"
  };
  globalThis.fetch = async url => {
    assert.equal(new URL(url).pathname, "/api/auth/login");
    return Response.json({ secret_detail: "not-for-client" }, { status: 401 });
  };
  try {
    const response = await worker.fetch(new Request("https://test.local/api/auth-check", {
      method: "POST",
      headers: { "x-pilot-token": "test-only-secret" }
    }), config);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.authenticated, false);
    assert.equal(body.failure_code, "login_not_authorized");
    assert.equal(body.quotes_submitted, false);
    assert.ok(!JSON.stringify(body).includes("secret_detail"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("auth-only diagnostics distinguish missing login path from rejected login", async () => {
  const originalFetch = globalThis.fetch;
  const config = {
    ...env(),
    INTERWELT_PILOT_ENABLED: "false",
    INTERWELT_EMAIL: "missing-path-isolation@example.org"
  };
  let loginCalls = 0;
  globalThis.fetch = async url => {
    assert.equal(new URL(url).pathname, "/api/auth/login");
    loginCalls++;
    return Response.json({ internal: "never-send-to-operator" }, { status: 404 });
  };
  try {
    const response = await worker.fetch(new Request("https://test.local/api/auth-check", {
      method: "POST",
      headers: { "x-pilot-token": "test-only-secret" }
    }), config);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.authenticated, false);
    assert.equal(body.failure_code, "login_path_not_found");
    assert.equal(body.quotes_submitted, false);
    assert.equal(loginCalls, 1);
    assert.ok(!JSON.stringify(body).includes("never-send-to-operator"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("auth-only diagnostics hide unrecognized upstream response data", async () => {
  const originalFetch = globalThis.fetch;
  const config = {
    ...env(),
    INTERWELT_PILOT_ENABLED: "false",
    INTERWELT_EMAIL: "unexpected-shape-isolation@example.org"
  };
  globalThis.fetch = async url => {
    assert.equal(new URL(url).pathname, "/api/auth/login");
    return Response.json({ data: { unexpected: "provider-internal-secret" } });
  };
  try {
    const response = await worker.fetch(new Request("https://test.local/api/auth-check", {
      method: "POST",
      headers: { "x-pilot-token": "test-only-secret" }
    }), config);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.authenticated, false);
    assert.equal(body.failure_code, "login_token_not_recognized");
    assert.equal(body.quotes_submitted, false);
    assert.ok(!JSON.stringify(body).includes("provider-internal-secret"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
