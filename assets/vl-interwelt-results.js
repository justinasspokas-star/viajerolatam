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
  const message = root.querySelector('[data-vl-iw-message]');
  const results = root.querySelector('[data-vl-iw-results]');
  const routeLabel = root.querySelector('[data-vl-iw-route]');

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
  // Ages are supplied by the main ViajeroLatam search as GET "edades=30,15".
  // Never invent a default age or display historical prices when ages are missing.
  function getAges(q) {
    const encoded = new URLSearchParams(location.search).get('edades') || '';
    if (!/^[0-9]{1,3}(,[0-9]{1,3})*$/.test(encoded)) return null;
    const ages = encoded.split(',').map(Number);
    return ages.length === q.travellers &&
      ages.every(age => Number.isInteger(age) && age >= 0 && age <= 100) ? ages : null;
  }
  function applyMessage(text) { message.textContent = text; }
  function labelFor(q) {
    const dest = q.dest === 'europe' ? 'Europa / Schengen' : q.dest === 'north-america' ? 'Estados Unidos / Canadá' : 'otro destino';
    return (q.origin === 'co' ? 'Colombia' : 'Origen por verificar') + ' → ' + dest + ' · ' +
      (dateIsISO(q.departure) ? q.departure : 'sin fecha') + ' a ' +
      (dateIsISO(q.returnDate) ? q.returnDate : 'sin fecha');
  }
  function isHistoricalSample(q, ages) {
    return q.origin === SAMPLE.origin && q.dest === SAMPLE.dest &&
      q.departure === SAMPLE.departure && q.returnDate === SAMPLE.returnDate &&
      q.travellers === 1 && ages.length === 1 && ages[0] === 30;
  }
  // Use the same classes/three-column structure as ViajeroLatam's IATI/AXA cards.
  // Never claim coverage, eligibility, currency or purchasability not verified by INTERWELT.
  function card(item, kind, availablePlans = [item]) {
    const historical = kind === 'historical';
    const article = document.createElement('article');
    article.className = 'card vl-interwelt-plan';
    article.id = 'vl-iw-card-' + String(item.id);

    const body = document.createElement('div');
    body.className = 'card-body';

    const logo = document.createElement('div');
    logo.className = 'card-logo-block';
    const initials = document.createElement('div');
    initials.className = 'card-logo vl-iw-monogram';
    initials.textContent = 'IW'; // Typographic placeholder, not an official insurer logo.
    initials.setAttribute('aria-label', 'INTERWELT');
    const meta = document.createElement('div');
    meta.className = 'card-logo-meta';
    const brand = document.createElement('div');
    brand.className = 'card-name';
    brand.textContent = 'INTERWELT';
    const plan = document.createElement('div');
    plan.className = 'card-plan-under-logo';
    plan.textContent = item.name;
    const unverified = document.createElement('div');
    unverified.className = 'card-verified';
    unverified.textContent = 'Datos sin verificar';
    meta.append(brand, plan, unverified);
    logo.append(initials, meta);

    const coverage = document.createElement('div');
    coverage.className = 'card-coverage';
    const pills = document.createElement('div');
    pills.className = 'coverage-pills';
    for (const name of ['Demostración', 'Cobertura pendiente']) {
      const pill = document.createElement('span');
      pill.className = 'cpill ' + (name === 'Demostración' ? 'cpill-amber' : 'cpill-navy');
      pill.textContent = name;
      pills.append(pill);
    }
    coverage.append(pills);
    // ONE provider card; choosing a plan updates this card instead of creating five cards.
    let selector = null;
    if (availablePlans.length > 1) {
      const wrapper = document.createElement('div');
      wrapper.className = 'vl-iw-plan-picker';
      const label = document.createElement('label');
      label.htmlFor = 'vl-iw-plan-choice-' + String(item.id);
      label.textContent = 'Selecciona un plan de INTERWELT';
      selector = document.createElement('select');
      selector.id = label.htmlFor;
      selector.className = 'vl-iw-plan-select';
      for (const available of availablePlans) {
        const option = document.createElement('option');
        option.value = String(available.id);
        option.textContent = available.name;
        selector.append(option);
      }
      selector.value = String(item.id);
      wrapper.append(label, selector);
      coverage.append(wrapper);
    }
    for (const [label, value] of [
      ['Gastos médicos:', 'Por confirmar'],
      ['Repatriación:', 'Por confirmar'],
      ['Equipaje:', 'Por confirmar']
    ]) {
      const line = document.createElement('div');
      line.className = 'coverage-row';
      const icon = document.createElement('span');
      icon.className = 'vl-iw-cov-symbol';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '◇';
      const labelText = document.createElement('span');
      labelText.textContent = label;
      const val = document.createElement('span');
      val.className = 'cov-val';
      val.textContent = value;
      line.append(icon, labelText, val);
      coverage.append(line);
    }
    const fit = document.createElement('div');
    fit.className = 'card-fit';
    const fitTitle = document.createElement('strong');
    fitTitle.textContent = 'A quién va dirigido: ';
    fit.append(fitTitle, document.createTextNode('Elegibilidad y condiciones pendientes de confirmar con INTERWELT.'));
    const caution = document.createElement('div');
    caution.className = 'card-caution';
    const cautionTitle = document.createElement('strong');
    cautionTitle.textContent = 'A tener en cuenta: ';
    caution.append(cautionTitle, document.createTextNode(
      historical
        ? 'Importe de una cotización histórica, no una oferta actual. Falta verificar moneda, cobertura y disponibilidad.'
        : 'Validar moneda, edad, territorio y cobertura antes de mostrar una cotización.'
    ));
    coverage.append(fit, caution);

    const priceCol = document.createElement('div');
    priceCol.className = 'card-price-block';
    const availability = document.createElement('div');
    availability.className = 'availability-note vl-iw-warning';
    availability.textContent = 'No disponible para contratar · solo vista previa';
    const priceLabel = document.createElement('div');
    priceLabel.className = 'public-price-label';
    priceLabel.textContent = historical ? 'Importe histórico de prueba' : 'Precio del proveedor';
    const price = document.createElement('div');
    price.className = 'public-price';
    price.textContent = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(item.total);
    const note = document.createElement('div');
    note.className = 'public-price-sub';
    note.textContent = historical
      ? 'Moneda por confirmar · 1 viajero de 30 años · 15 días · NO es una cotización en directo.'
      : 'Importe verificado para la búsqueda. Compra aún desactivada.';
    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'btn-contract vl-iw-disabled-cta';
    cta.disabled = true;
    cta.textContent = 'Contratación desactivada';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn-details vl-iw-details-toggle';
    more.textContent = 'Ver detalles del plan';
    more.setAttribute('aria-expanded', 'false');
    const detailsId = 'vl-iw-det-' + String(item.id);
    more.setAttribute('aria-controls', detailsId);
    priceCol.append(availability, priceLabel, price, note, cta, more);
    body.append(logo, coverage, priceCol);

    const details = document.createElement('div');
    details.className = 'card-details vl-iw-details';
    details.id = detailsId;
    details.hidden = true;
    const grid = document.createElement('div');
    grid.className = 'details-grid';
    for (const [label, val] of [
      ['Plan', item.name],
      ['Coberturas', 'Pendientes de documentación oficial'],
      ['Moneda y elegibilidad', 'Pendientes de confirmación']
    ]) {
      const el = document.createElement('div');
      el.className = 'detail-item';
      const heading = document.createElement('div');
      heading.className = 'detail-label';
      heading.textContent = label;
      const value = document.createElement('div');
      value.className = 'detail-val';
      value.textContent = val;
      el.append(heading, value);
      grid.append(el);
    }
    details.append(grid);
    article.append(body, details);
    if (selector) {
      selector.addEventListener('change', () => {
        const selected = availablePlans.find(p => String(p.id) === selector.value);
        if (!selected) return;
        plan.textContent = selected.name;
        price.textContent = new Intl.NumberFormat('es-ES', {
          minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(selected.total);
        const detailPlan = grid.querySelector('.detail-val');
        if (detailPlan) detailPlan.textContent = selected.name;
      });
    }
    return article;
  }

  results.addEventListener('click', event => {
    const button = event.target.closest('.vl-iw-details-toggle');
    if (!button || !results.contains(button)) return;
    const detail = document.getElementById(button.getAttribute('aria-controls'));
    if (!detail) return;
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    detail.hidden = expanded;
    detail.classList.toggle('open', !expanded);
    button.textContent = expanded ? 'Ver detalles del plan' : 'Ocultar detalles';
  });

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
    results.append(card(SAMPLE.prices[0], 'historical', SAMPLE.prices));
    applyMessage('Ejemplo histórico de cinco planes agrupados en una sola tarjeta: selecciona el plan para ver su importe. Colombia → Europa, 1 viajero de 30 años, 1–15 noviembre 2026. No se ha llamado a la API.');
  }
  async function validateOnServer(q, ages) {
    const raw = new URLSearchParams(location.search);
    const destination = raw.get('destino') || (q.dest === 'europe' ? 'espana-schengen' :
      q.dest === 'north-america' ? 'eeuu-canada' : '');
    const input = {
      origin:q.origin, destination,
      departure:q.departure, return:q.returnDate, ages
    };
    const response = await fetch('/.netlify/functions/interwelt-quote?prepare=1', {
      method:'POST',
      headers:{'content-type':'application/json'},
      credentials:'omit',
      cache:'no-store',
      body:JSON.stringify(input)
    });
    if (!response.ok) throw new Error('validation_failed');
    const data = await response.json();
    if (data.mode !== 'validation' || data.live !== false ||
        data.mapping_verified !== false || data.rates_available !== false ||
        data.payments_enabled !== false || data.vouchers_enabled !== false ||
        !data.search || data.search.origin !== q.origin ||
        data.search.departure !== q.departure || data.search.return !== q.returnDate ||
        JSON.stringify(data.search.ages) !== JSON.stringify(ages)) {
      throw new Error('unexpected_validation_result');
    }
    return data;
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
    const ordered = cleaned.slice().sort((a, b) => a.total - b.total);
    results.append(card(ordered[0], 'live', ordered));
    applyMessage('Cotización real recibida del servidor. La contratación permanece desactivada.');
    return true;
  }
  let searchVersion = 0;
  async function refresh() {
    const version = ++searchVersion;
    const q = currentSearch();
    const ages = getAges(q);
    routeLabel.textContent = labelFor(q) + (ages ? ' · Edades: ' + ages.join(', ') : '');
    results.replaceChildren();

    if (!ages) {
      applyMessage('No se han recibido las edades del buscador. Añádelas desde «Editar búsqueda» para preparar INTERWELT. Los otros seguros siguen disponibles.');
      return;
    }
    if (!dateIsISO(q.departure) || !dateIsISO(q.returnDate) || q.returnDate < q.departure) {
      applyMessage('Revisa las fechas del viaje desde «Editar búsqueda».');
      return;
    }

    applyMessage('Comprobando automáticamente los datos del buscador en Netlify (sin cotizar ni enviar datos personales)…');
    try {
      const checked = await validateOnServer(q, ages);
      if (version !== searchVersion) return;
      if (preview) {
        renderHistorical(q, ages);
        applyMessage('Datos validados en Netlify (' + checked.search.days +
          ' días, contando salida y regreso). ' + message.textContent);
      } else {
        applyMessage('Búsqueda validada. Cotizaciones reales todavía desactivadas.');
      }
    } catch {
      if (version !== searchVersion) return;
      applyMessage('No se pudieron verificar los datos de esta búsqueda en Netlify. No se ha consultado la API real.');
    }
  }
  root.hidden = false;
  // "Editar búsqueda" updates the URL synchronously.
  document.querySelectorAll('button[onclick="applyEditSearch()"]').forEach(button => {
    button.addEventListener('click', () => setTimeout(refresh, 0));
  });
  window.addEventListener('popstate', refresh);
  refresh();
  window.VLInterweltBridge = Object.freeze({refresh, renderLive});
})();
