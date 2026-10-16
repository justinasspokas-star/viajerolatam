/* INTERWELT ViajeroLatam results bridge — STAGING ONLY.
 * Default disabled. Preview flag is for historical mock presentation only.
 * No credentials, network requests, vouchers or payment actions.
 * Live rates must arrive from a future server-verified, same-origin API.
 */
(function () {
  'use strict';
  const LIVE_ENABLED = false; // Never enable until secure backend and eligibility checks exist.
  const PREVIEW_FLAG = 'vl_interwelt_preview';
  const SAMPLE = Object.freeze({
    origin: 'co',
    dest: 'europe',
    departure: '2026-11-01',
    returnDate: '2026-11-15',
    ages: [30],
    prices: [
      { id: 206, name: 'SOMOS EUROPA*', total: 33.97 },
      { id: 205, name: 'ESTELAR', total: 48.00 },
      { id: 207, name: 'INTERWELT 40', total: 70.13 },
      { id: 208, name: 'INTERWELT 60', total: 94.85 },
      { id: 209, name: 'INTERWELT 100', total: 115.24 }
    ]
  });

  const root = document.getElementById('vl-interwelt-slot');
  if (!root) return;
  const url = new URLSearchParams(location.search);
  const preview = url.get(PREVIEW_FLAG) === '1';
  if (!preview && !LIVE_ENABLED) return;
  const agesPanel = root.querySelector('[data-vl-iw-ages]');
  const message = root.querySelector('[data-vl-iw-message]');
  const results = root.querySelector('[data-vl-iw-results]');
  const routeLabel = root.querySelector('[data-vl-iw-route]');
  const btn = root.querySelector('[data-vl-iw-compare]');

  const ORIGINS = { co: 'co', colombia: 'co' };
  function normalizeOrigin(s) { return ORIGINS[String(s || '').toLowerCase()] || String(s || '').toLowerCase(); }
  function normalizeDestination(s) {
    const x = String(s || '').toLowerCase();
    if (['espana', 'espana-schengen', 'es', 'europa', 'europe'].includes(x)) return 'europe';
    if (['eeuu', 'eeuu-canada', 'us', 'usa', 'estados-unidos'].includes(x)) return 'north-america';
    return x;
  }
  function dateIsISO(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
    const d = new Date(s + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }
  function currentSearch() {
    const q = new URLSearchParams(location.search);
    // Exact input dates are necessary for a true provider quote.
    const departure = q.get('ida') || q.get('salida') || document.getElementById('ep-ida')?.value || '';
    const returnDate = q.get('vuelta') || q.get('regreso') || document.getElementById('ep-vuelta')?.value || '';
    const travellers = Number(q.get('personas') || q.get('viajeros') || document.getElementById('ep-viajeros')?.value || 1);
    return {
      origin: normalizeOrigin(q.get('origen') || window.currentSearchOrigin || ''),
      dest: normalizeDestination(q.get('destino') || window.currentSearchDest || ''),
      departure, returnDate, travellers
    };
  }
  function getAges() {
    const inputs = [...agesPanel.querySelectorAll('input')];
    if (inputs.some(el => el.value.trim() === '')) return null;
    const ages = inputs.map(el => Number(el.value));
    return ages.every(age => Number.isInteger(age) && age >= 0 && age <= 100) ? ages : null;
  }
  function applyMessage(text) { message.textContent = text; }
  function labelFor(q) {
    const dest = q.dest === 'europe' ? 'Europa / Schengen' : q.dest === 'north-america' ? 'Estados Unidos / Canadá' : 'otro destino';
    return (q.origin === 'co' ? 'Colombia' : 'Origen por verificar') + ' → ' + dest + ' · ' +
      (dateIsISO(q.departure) ? q.departure : 'sin fecha') + ' a ' +
      (dateIsISO(q.returnDate) ? q.returnDate : 'sin fecha');
  }
  function createAgeInputs(q) {
    const old = agesPanel.dataset.itinerary;
    const signature = [q.origin, q.dest, q.departure, q.returnDate, q.travellers].join('|');
    if (old === signature) return;
    agesPanel.dataset.itinerary = signature;
    agesPanel.replaceChildren();
    results.replaceChildren();
    if (!Number.isInteger(q.travellers) || q.travellers < 1 || q.travellers > 8) {
      applyMessage('Confirma un número de viajeros entre 1 y 8 para preparar la cotización.');
      btn.disabled = true;
      return;
    }
    btn.disabled = false;
    // GET parameter "edades" is supplied by the main ViajeroLatam search.
    // Only prefill when the number and range match the selected travellers.
    const saved = new URLSearchParams(location.search).get('edades') || '';
    const parsed = /^\\d{1,3}(,\\d{1,3})*$/.test(saved) ? saved.split(',').map(Number) : [];
    const selectedAges = parsed.length === q.travellers && parsed.every(n => Number.isInteger(n) && n >= 0 && n <= 100)
      ? parsed : [];
    for (let i = 0; i < q.travellers; i++) {
      const label = document.createElement('label');
      label.className = 'vl-iw-age';
      label.textContent = 'Edad viajero ' + (i + 1);
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.required = true;
      input.placeholder = 'Edad';
      input.value = selectedAges[i] === undefined ? '' : String(selectedAges[i]);
      input.setAttribute('aria-label', 'Edad del viajero ' + (i + 1));
      label.append(input);
      agesPanel.append(label);
    }
    applyMessage('Introduce las edades y comprueba el ejemplo. Únicamente tenemos una muestra para Colombia → Europa, 1–15 nov. 2026, 1 viajero de 30 años.');
  }
  function isHistoricalSample(q, ages) {
    return q.origin === SAMPLE.origin && q.dest === SAMPLE.dest &&
      q.departure === SAMPLE.departure && q.returnDate === SAMPLE.returnDate &&
      q.travellers === 1 && ages.length === 1 && ages[0] === 30;
  }
  function card(item, kind) {
    const article = document.createElement('article');
    article.className = 'vl-iw-card';
    const name = document.createElement('h3');
    name.textContent = 'INTERWELT · ' + item.name;
    const sub = document.createElement('p');
    sub.className = 'vl-iw-card-small';
    sub.textContent = 'Plan #' + item.id + (kind === 'historical' ? ' · ejemplo histórico' : ' · cotización verificada');
    const price = document.createElement('strong');
    price.className = 'vl-iw-value';
    price.textContent = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.total);
    const note = document.createElement('p');
    note.className = 'vl-iw-card-small';
    note.textContent = kind === 'historical'
      ? 'Importe histórico. Moneda por confirmar. No es una tarifa actual.'
      : 'Precio cotizado por INTERWELT. Contratación no activada.';
    const disabled = document.createElement('span');
    disabled.className = 'vl-iw-disabled';
    disabled.textContent = 'Contratación desactivada';
    article.append(name, sub, price, note, disabled);
    return article;
  }
  function renderHistorical(q, ages) {
    if (!isHistoricalSample(q, ages)) {
      applyMessage('Prueba completada: no existen tarifas para los datos introducidos (edad: ' + ages.join(', ') + '). Solo tenemos una muestra de 30 años, del 1 al 15 de noviembre de 2026, Colombia → Europa. No es un error del botón: aún no conectamos la API real.');
      const demo = document.createElement('a');
      demo.className = 'vl-iw-example-link';
      demo.href = '/resultados/?origen=co&destino=espana-schengen&ida=2026-11-01&vuelta=2026-11-15&personas=1&edades=30&vl_interwelt_preview=1';
      demo.textContent = 'Abrir el único ejemplo disponible (30 años) →';
      results.append(demo);
      return;
    }
    for (const item of SAMPLE.prices) results.append(card(item, 'historical'));
    applyMessage('Ejemplo histórico mostrado: Colombia → Europa, 1 viajero de 30 años, 1–15 noviembre 2026. No se ha llamado a la API.');
  }
  // Future integration contract: this method is intentionally blocked until
  // real server-side prices and eligibility checks are in place.
  function renderLive(q, ages, response) {
    if (!LIVE_ENABLED) return false;
    if (!response || response.mode !== 'live' || response.source !== 'INTERWELT' ||
        response.currency_confirmed !== true || response.currency !== 'USD' ||
        response.eligible !== true || response.payments_enabled !== false ||
        response.vouchers_enabled !== false || !Array.isArray(response.prices) ||
        !response.search || response.search.origin !== q.origin || response.search.destination !== q.dest ||
        response.search.departure !== q.departure || response.search.return !== q.returnDate ||
        JSON.stringify(response.search.ages) !== JSON.stringify(ages)) return false;
    const cleaned = response.prices.filter(p =>
      Number.isSafeInteger(p.id) && p.id > 0 && typeof p.name === 'string' && p.name.length <= 80 &&
      typeof p.total === 'number' && Number.isFinite(p.total) && p.total > 0);
    if (cleaned.length === 0) return false;
    results.replaceChildren();
    cleaned.forEach(item => results.append(card(item, 'live')));
    applyMessage('Cotización real recibida del servidor. La contratación permanece desactivada.');
    return true;
  }
  function refresh() {
    const q = currentSearch();
    routeLabel.textContent = labelFor(q);
    createAgeInputs(q);
    const ages = getAges();
    // Permits direct deep links from the search age parameter without a second click.
    if (preview && ages && isHistoricalSample(q, ages)) renderHistorical(q, ages);
  }
  root.hidden = false;
  btn.textContent = 'Comprobar datos de demostración';
  btn.addEventListener('click', () => {
    const q = currentSearch();
    results.replaceChildren();
    const ages = getAges();
    if (!ages || ages.length !== q.travellers) {
      applyMessage('Introduce una edad válida de 0 a 100 años para cada viajero.');
      return;
    }
    if (!dateIsISO(q.departure) || !dateIsISO(q.returnDate) ||
        q.returnDate < q.departure) {
      applyMessage('Revisa las fechas de salida y regreso antes de cotizar.');
      return;
    }
    // Preview-only: no fetch, JWT, contact details, provider API calls or purchases.
    if (preview) renderHistorical(q, ages);
  });
  // "Editar búsqueda" updates the URL synchronously.
  document.querySelectorAll('button[onclick="applyEditSearch()"]').forEach(button => {
    button.addEventListener('click', () => setTimeout(refresh, 0));
  });
  window.addEventListener('popstate', refresh);
  refresh();
  window.VLInterweltBridge = Object.freeze({refresh, renderLive});
})();
