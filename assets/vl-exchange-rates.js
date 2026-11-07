/* ViajeroLatam — tipos de cambio de referencia; no altera primas ni cobros. */
(function (window) {
  'use strict';
  if (window.VLExchangeRates) return;

  var CODES = 'USD COP MXN ARS VES PEN CLP BOB BRL UYU PYG CRC PAB GTQ HNL NIO CUP HTG DOP'.split(' ');
  var CACHE_KEY = 'vl_fx_daily_v2';
  var MAX_SOURCE_AGE = 8 * 24 * 60 * 60 * 1000;
  var MAX_CACHE_AGE = 48 * 60 * 60 * 1000;
  var entries = {};
  var pending = null;

  function validDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    var timestamp = Date.parse(date + 'T00:00:00Z');
    var age = Date.now() - timestamp;
    return Number.isFinite(timestamp) && age >= -36 * 60 * 60 * 1000 && age <= MAX_SOURCE_AGE;
  }

  function acceptable(code, rawRate, date) {
    var value = Number(rawRate);
    if (CODES.indexOf(code) === -1 || !validDate(date) || !Number.isFinite(value) || value <= 0 || value > 100000000) return false;
    // Rechazar tasas históricas/tipos incompatibles con las referencias de 2026.
    // En Cuba y Bolivia existen varios segmentos cambiarios: si la fuente no
    // ofrece un equivalente razonable, NO inventar una conversión en moneda local.
    if (code === 'VES' && value < 300) return false;
    if (code === 'CUP' && value < 400) return false;
    if (code === 'BOB' && value < 9) return false;
    return true;
  }

  function normalizeRecord(code, rate, date, source) {
    if (!acceptable(code, rate, date)) return null;
    return { rate: Number(rate), date: date, source: source };
  }

  function fromFrankfurter(data) {
    if (!Array.isArray(data)) throw new Error('Formato FX no esperado');
    var result = {};
    data.forEach(function (item) {
      if (!item || item.base !== 'EUR') return;
      var code = String(item.quote || '').toUpperCase();
      var record = normalizeRecord(code, item.rate, item.date, 'Frankfurter');
      if (record && (!result[code] || record.date > result[code].date)) result[code] = record;
    });
    if (!result.USD) throw new Error('FX incompleto');
    return result;
  }

  function fromCurrencyApi(data) {
    if (!data || !data.eur || typeof data.eur !== 'object') throw new Error('Formato FX alternativo no esperado');
    var result = {};
    CODES.forEach(function (code) {
      var record = normalizeRecord(code, data.eur[code.toLowerCase()], data.date, 'Currency API');
      if (record) result[code] = record;
    });
    if (!result.USD) throw new Error('FX alternativo incompleto');
    return result;
  }

  function fetchJson(url) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timeout = controller ? setTimeout(function () { controller.abort(); }, 6500) : null;
    return fetch(url, { mode: 'cors', cache: 'no-store', signal: controller ? controller.signal : undefined })
      .then(function (response) {
        if (!response.ok) throw new Error('FX HTTP ' + response.status);
        return response.json();
      }).finally(function () { if (timeout) clearTimeout(timeout); });
  }

  function cached() {
    try {
      var data = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!data || !Number.isFinite(data.savedAt) || Date.now() - data.savedAt > MAX_CACHE_AGE || data.savedAt > Date.now() + 60000) return;
      CODES.forEach(function (code) {
        var record = data.entries && data.entries[code];
        if (record && acceptable(code, record.rate, record.date)) entries[code] = record;
      });
    } catch (error) { /* El sitio debe funcionar sin localStorage. */ }
  }

  function persist() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), entries: entries })); }
    catch (error) { /* La caché no es obligatoria. */ }
  }

  function rate(currency) {
    var code = String(currency || '').toUpperCase();
    if (code === 'EUR') return 1;
    var record = entries[code];
    return record && acceptable(code, record.rate, record.date) ? record.rate : null;
  }

  function date(currency) {
    var code = String(currency || '').toUpperCase();
    return rate(code) !== null && code !== 'EUR' ? entries[code].date : null;
  }

  function load() {
    if (pending) return pending;
    pending = (async function () {
      var found = {};
      try {
        found = fromFrankfurter(await fetchJson('https://api.frankfurter.dev/v2/rates?base=EUR'));
      } catch (error) { /* Usar proveedor alternativo. */ }
      if (CODES.some(function (code) { return !found[code]; })) {
        var mirrors = [
          'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json',
          'https://latest.currency-api.pages.dev/v1/currencies/eur.min.json'
        ];
        for (var i = 0; i < mirrors.length; i++) {
          try {
            var secondary = fromCurrencyApi(await fetchJson(mirrors[i]));
            CODES.forEach(function (code) { if (!found[code] && secondary[code]) found[code] = secondary[code]; });
            break;
          } catch (error) { /* Probar espejo siguiente. */ }
        }
      }
      CODES.forEach(function (code) { if (found[code]) entries[code] = found[code]; });
      if (Object.keys(found).length) persist();
      // Si la red no da una tasa válida, rate() devuelve null y se oculta
      // la equivalencia local: NUNCA usar tasas históricas de respaldo.
      return Object.keys(found).length > 0;
    })().catch(function () { return false; });
    return pending;
  }

  cached();
  window.VLExchangeRates = Object.freeze({ rate: rate, date: date, load: load });
})(window);
