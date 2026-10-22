import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// Tiny deterministic DOM harness: no browser/network dependencies.
// Tests the same script deployed on the isolated Netlify results page.
const script = readFileSync(new URL("../assets/vl-interwelt-results.js", import.meta.url), "utf8");

function element(tag = "div") {
  return {
    tag, children: [], listeners: {}, className: "", textContent: "",
    attributes: {}, disabled: false, hidden: false,
    classList: { toggle() {} },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = [...items]; },
    addEventListener(event, handler) { this.listeners[event] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; }
  };
}

function descendants(node) {
  return [node, ...(node.children || []).flatMap(descendants)];
}

function harness({ preview = true, ages = "30" } = {}) {
  const suffix = preview ? "&vl_interwelt_preview=1" : "";
  const location = { search: "?origen=co&destino=espana-schengen" +
    "&ida=2026-11-01&vuelta=2026-11-15&personas=1&edades=" + ages + suffix };
  const message = element(), results = element(), routeLabel = element();
  const root = element();
  root.hidden = true;
  root.querySelector = selector => ({
    "[data-vl-iw-message]": message,
    "[data-vl-iw-results]": results,
    "[data-vl-iw-route]": routeLabel
  })[selector] || null;
  const document = {
    getElementById: id => id === "vl-interwelt-slot" ? root : null,
    querySelectorAll: () => [],
    createElement: element,
    createTextNode: text => ({ textContent: String(text), children: [] })
  };
  const window = { addEventListener() {} };
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    assert.equal(url, "/.netlify/functions/interwelt-quote?route_check=1");
    assert.equal(options.method, "POST");
    assert.equal(options.credentials, "omit");
    const input = JSON.parse(options.body);
    return Response.json({
      mode: "route_mapping_preview",
      source: "INTERWELT-preview",
      live: false,
      rates_available: false,
      payments_enabled: false,
      vouchers_enabled: false,
      route_supported: true,
      mapping_verified: true,
      provider_route: { origin_country_id: 48, destination_region_id: 2, currency: "USD" },
      search: {
        ...input,
        people: input.ages.length,
        region: "europe",
        days: 15
      }
    });
  };
  runInNewContext(script, { document, window, location, fetch, URLSearchParams, Intl, setTimeout });
  return { window, root, message, results, routeLabel, calls };
}

test("preview displays one provider card, USD next to amount, and changes price on selection", async () => {
  const app = harness();
  for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.root.hidden, false);
  assert.equal(app.calls.length, 1);
  assert.equal(app.results.children.length, 1);
  const card = app.results.children[0];
  const nodes = descendants(card);
  const select = nodes.find(node => node.className === "vl-iw-plan-select");
  const amount = nodes.find(node => node.className === "vl-iw-price-value");
  const currency = nodes.find(node => node.className === "vl-iw-price-unit");
  const cta = nodes.find(node => String(node.className).includes("vl-iw-disabled-cta"));
  assert.ok(select);
  assert.equal(amount?.textContent, "33,97");
  assert.equal(currency?.textContent, "USD");
  assert.equal(cta?.disabled, true);
  select.value = "205"; // ESTELAR, historical-only fixture
  select.listeners.change();
  assert.equal(amount.textContent, "48,00");
  assert.equal(currency.textContent, "USD");
  assert.equal(app.calls.length, 1, "Selecting a historical plan must not request a quote");
  assert.ok(app.message.textContent.includes("No se ha consultado la API"));
});

test("without the preview flag, public-rate fetch stays completely OFF", async () => {
  const app = harness({ preview: false });
  for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.root.hidden, true);
  assert.equal(app.results.children.length, 0);
  assert.equal(app.calls.length, 0);
  assert.equal(app.window.VLInterweltBridge, undefined);
});

test("missing traveler ages cannot show a historical amount or call provider", async () => {
  const app = harness({ ages: "" });
  for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.results.children.length, 0);
  assert.equal(app.calls.length, 0);
  assert.ok(app.message.textContent.includes("edades"));
});
