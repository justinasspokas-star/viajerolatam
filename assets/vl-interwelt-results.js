/* INTERWELT ViajeroLatam results bridge — STAGING ONLY.
 * Default disabled. Preview flag is for historical mock presentation only.
 * No credentials, network requests, vouchers or payment actions.
 * Live rates must arrive from a future server-verified, same-origin API.
 */
(function () {
  'use strict';
  const LIVE_ENABLED = false; // Never enable until secret rotation, provider permission, live quota/caching and coverages are verified.
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

  // INTERWELT commercial portfolio and provider clarification (Oct 2026).
  // Display informational limits ONLY for exact plan ID + matching name.
  // This is NOT a quotation, certification or automatic eligibility decision.
  // Europe's coverage currency may be EUR or USD depending on the issued plan;
  // REST quotes' *sale price* currency is ALWAYS USD.
  const PLAN_FACTS = Object.freeze({
    205: {name:'ESTELAR',medical:'30.000',repatriation:'30.000',baggage:'1.000',maxAge:99,maxDays:90},
    206: {name:'SOMOS EUROPA*',medical:'30.000',repatriation:'30.000',baggage:'800',maxAge:99,maxDays:365},
    207: {name:'INTERWELT 40',medical:'40.000',repatriation:'40.000',baggage:'1.800',maxAge:85,maxDays:120},
    208: {name:'INTERWELT 60',medical:'60.000',repatriation:'60.000',baggage:'1.800',maxAge:74,maxDays:120},
    209: {name:'INTERWELT 100',medical:'100.000',repatriation:'100.000',baggage:'2.000',maxAge:74,maxDays:120},
    // The Long Trip Basic catalog expressly gives a different Europe/world ceiling.
    221: {name:'LONG TRIP BASIC',medical:'15.000 USD / 30.000 EUR',repatriation:'15.000 USD / 30.000 EUR',baggage:'600',maxAge:74,maxDays:365,minDays:30},
    225: {name:'ENTRE MUNDOS',medical:'65.000',repatriation:'45.000',baggage:'500',maxAge:50,maxDays:365,minDays:30,usdOnly:true}
  });
  function factsFor(item) {
    const details = PLAN_FACTS[item.id];
    if (!details) return null;
    const normalize = text => String(text || '').replace(/[*]/g,'').trim().replace(/\s+/g,' ').toUpperCase();
    return normalize(item.name) === normalize(details.name) ? details : null;
  }
  function coverageCurrencyText(q, facts) {
    if (!facts) return 'Por verificar en el condicionado';
    if (facts.usdOnly || q.dest !== 'europe') return 'USD';
    return 'EUR o USD según certificado';
  }
  function coverageAmount(amount, facts, q) {
    if (!facts) return 'Por confirmar';
    // Long Trip Basic has different limit/currency pairs in the portfolio;
    // never present its European limit as valid in North America.
    if (amount.includes('USD /')) {
      return q.dest === 'europe'
        ? '30.000 EUR / 15.000 USD (según certificado)'
        : '15.000 USD';
    }
    return amount + ' ' + (facts.usdOnly || q.dest !== 'europe' ? 'USD' : '(EUR o USD)');
  }

  const root = document.getElementById('vl-interwelt-slot');
  if (!root) return;
  const url = new URLSearchParams(location.search);
  const preview = url.get(PREVIEW_FLAG) === '1';
  if (!preview && !LIVE_ENABLED) return;
  const message = root.querySelector('[data-vl-iw-message]');
  const results = root.querySelector('[data-vl-iw-results]');
  const routeLabel = root.querySelector('[data-vl-iw-route]');

  const ORIGINS = { co: 'co', colombia: 'co', pe: 'pe', peru: 'pe', mx: 'mx', mexico: 'mx' };
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
    return ({ co: 'Colombia', pe: 'Perú', mx: 'México' }[q.origin] || 'Origen pendiente de confirmar') + ' → ' + dest + ' · ' +
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
  function card(item, kind, availablePlans = [item], route) {
    const historical = kind === 'historical';
    const routeContext = route || {dest:'europe'};
    const startingFacts = factsFor(item);
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
    unverified.textContent = startingFacts ? 'Coberturas de catálogo · verificar condicionado' : 'Coberturas por confirmar';
    meta.append(brand, plan, unverified);
    logo.append(initials, meta);

    const coverage = document.createElement('div');
    coverage.className = 'card-coverage';
    const pills = document.createElement('div');
    pills.className = 'coverage-pills';
    for (const name of (historical ? ['Demostración', 'Coberturas de catálogo'] : ['Precio consultado', 'Coberturas de catálogo'])) {
      const pill = document.createElement('span');
      pill.className = 'cpill ' + (historical && name === 'Demostración' ? 'cpill-amber' : 'cpill-navy');
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
    const limits = [
      ['Asistencia médica:', 'medical'],
      ['Repatriación:', 'repatriation'],
      ['Equipaje:', 'baggage']
    ];
    const limitValues = [];
    for (const [label, field] of limits) {
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
      val.textContent = coverageAmount(startingFacts?.[field] || '', startingFacts, routeContext);
      limitValues.push([field,val]);
      line.append(icon, labelText, val);
      coverage.append(line);
    }
    const fit = document.createElement('div');
    fit.className = 'card-fit';
    const fitTitle = document.createElement('strong');
    fitTitle.textContent = 'A quién va dirigido: ';
    const fitBody = document.createTextNode(historical
      ? 'Límites orientativos del portafolio sujetos al voucher y a las Condiciones Generales de agosto de 2026; solo la API determina qué planes se ofrecen.'
      : 'Plan devuelto por INTERWELT. Los topes no garantizan todas las prestaciones; revisar condiciones, exclusiones y carencias.');
    fit.append(fitTitle, fitBody);
    const caution = document.createElement('div');
    caution.className = 'card-caution';
    const cautionTitle = document.createElement('strong');
    cautionTitle.textContent = 'A tener en cuenta: ';
    caution.append(cautionTitle, document.createTextNode(
      historical
        ? 'Precio histórico en USD, no oferta actual. Los límites de cobertura son máximos sujetos al certificado, exclusiones y autorización de la central.'
        : 'Precio de la API en USD; topes de catálogo sujetos al certificado y al condicionado. Contratación desactivada.'
    ));
    coverage.append(fit, caution);

    const priceCol = document.createElement('div');
    priceCol.className = 'card-price-block';
    const availability = document.createElement('div');
    availability.className = 'availability-note vl-iw-warning';
    availability.textContent = historical
      ? 'No disponible para contratar · solo vista previa'
      : 'Contratación todavía desactivada';
    const priceLabel = document.createElement('div');
    priceLabel.className = 'public-price-label';
    priceLabel.textContent = historical ? 'Importe histórico de prueba' : 'Precio del proveedor';
    const price = document.createElement('div');
    price.className = 'public-price';
    const priceValue = document.createElement('span');
    priceValue.className = 'vl-iw-price-value';
    const currency = document.createElement('span');
    currency.className = 'vl-iw-price-unit';
    currency.textContent = 'USD';
    function showPrice(total) {
      priceValue.textContent = new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }).format(total);
    }
    showPrice(item.total);
    price.append(priceValue, currency);
    const note = document.createElement('div');
    note.className = 'public-price-sub';
    note.textContent = historical
      ? '1 viajero de 30 años · 15 días · Precio histórico, no cotización actual.'
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
    const planFacts = startingFacts;
    const detailsFields = [
      ['Plan', item.name],
      ['Edad máxima del plan', planFacts ? planFacts.maxAge + ' años' : 'No confirmada'],
      ['Duración permitida', planFacts ? (planFacts.minDays ? 'Desde ' + planFacts.minDays + ' hasta ' : 'Hasta ') + planFacts.maxDays + ' días' : 'No confirmada'],
      ['Precio de venta', 'USD (cotización total)'],
      ['Moneda de las coberturas', coverageCurrencyText(routeContext, planFacts)],
      ['Carencias', 'Compra en destino o extensión fuera de vigencia: 5 días; para COVID-19 en venta en destino o extensión aprobada: 7 días específicos (pág. 8 del condicionado)'],
      ['Preexistencias y exclusiones', 'Las enfermedades crónicas, preexistentes y recurrentes tienen exclusiones importantes. Solo se contempla la primera atención urgente en planes que incluyan expresamente ese beneficio y su tope en el voucher (págs. 21 y 51).'],
      ['Validez Schengen', 'INTERWELT indica conformidad; comprobar los requisitos del viaje y el documento del plan'],
      ['Elegibilidad', historical ? 'No confirmada para esta demostración' : 'Plan devuelto por INTERWELT para esta búsqueda'],
      ['Recargo por edad', planFacts && planFacts.maxAge >= 75
        ? 'INTERWELT indica +50% desde los 75 años; el precio final ya debe incluir el recargo aplicado por la API'
        : 'No aplica desde los 75 años: este plan limita la edad a 74 o menos'],
      ['Extensión de asistencia', 'Solicitar al menos 3 días antes del vencimiento para mantener continuidad; sujeta a aprobación'],
      ['Coberturas complementarias', 'Los upgrades opcionales, como deportes de riesgo, pueden implicar un coste adicional'],
      ['Solicitar asistencia', 'Contactar con la Central de Asistencias y solicitar autorización previa. Si no se puede comunicar por una emergencia, notificar cuanto antes y, en general, en un máximo de 24 horas (págs. 8–9).'],
      ['Equipaje', 'La compensación por pérdida total requiere reclamación PIR y que la aerolínea haya indemnizado antes; no se aplica a equipaje de mano ni a faltantes parciales (págs. 29–30).'],
      ['Otros límites y exclusiones', 'El condicionado contempla exclusiones de procedimientos electivos, controles rutinarios y determinados riesgos; pueden existir franquicias según plan (págs. 5, 51–56).'],
      ['Documento revisado', 'Condiciones Generales INTERWELT, agosto de 2026 (56 páginas). La copia pública exacta todavía está pendiente de enlace; el voucher emitido indica los límites aplicables.']
    ];
    const detailValues = [];
    for (const [label, val] of detailsFields) {
      const el = document.createElement('div');
      el.className = 'detail-item';
      const heading = document.createElement('div');
      heading.className = 'detail-label';
      heading.textContent = label;
      const value = document.createElement('div');
      value.className = 'detail-val';
      value.textContent = val;
      detailValues.push(value);
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
        showPrice(selected.total);
        const selectedFacts = factsFor(selected);
        unverified.textContent = selectedFacts ? 'Coberturas de catálogo · verificar condicionado' : 'Coberturas por confirmar';
        for (const [field, element] of limitValues) {
          element.textContent = coverageAmount(selectedFacts?.[field] || '', selectedFacts, routeContext);
        }
        detailValues[0].textContent = selected.name;
        detailValues[1].textContent = selectedFacts ? selectedFacts.maxAge + ' años' : 'No confirmada';
        detailValues[2].textContent = selectedFacts
          ? (selectedFacts.minDays ? 'Desde ' + selectedFacts.minDays + ' hasta ' : 'Hasta ') + selectedFacts.maxDays + ' días'
          : 'No confirmada';
        detailValues[4].textContent = coverageCurrencyText(routeContext, selectedFacts);
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
      applyMessage('No tenemos precios de demostración para esta búsqueda (edad: ' + ages.join(', ') + '). Solo se muestra una muestra histórica de 30 años, del 1 al 15 de noviembre de 2026, Colombia → Europa. No se han consultado tarifas actuales.');
      const demo = document.createElement('a');
      demo.className = 'vl-iw-example-link';
      demo.href = '/resultados/?origen=co&destino=espana-schengen&ida=2026-11-01&vuelta=2026-11-15&personas=1&edades=30&vl_interwelt_preview=1';
      demo.textContent = 'Abrir el único ejemplo disponible (30 años) →';
      results.append(demo);
      return;
    }
    results.append(card(SAMPLE.prices[0], 'historical', SAMPLE.prices, q));
    applyMessage('Elige un plan para ver su precio histórico en USD. No se ha consultado la API de cotizaciones.');
  }
  async function validateOnServer(q, ages) {
    const raw = new URLSearchParams(location.search);
    const destination = raw.get('destino') || (q.dest === 'europe' ? 'espana-schengen' :
      q.dest === 'north-america' ? 'eeuu-canada' : '');
    const input = {
      origin:q.origin, destination,
      departure:q.departure, return:q.returnDate, ages
    };
    const response = await fetch('/.netlify/functions/interwelt-quote?route_check=1', {
      method:'POST',
      headers:{'content-type':'application/json'},
      credentials:'omit',
      cache:'no-store',
      body:JSON.stringify(input)
    });
    if (!response.ok) throw new Error('validation_failed');
    const data = await response.json();
    if (data.mode !== 'route_mapping_preview' || data.live !== false ||
        data.rates_available !== false ||
        data.payments_enabled !== false || data.vouchers_enabled !== false ||
        !data.search || data.search.origin !== q.origin ||
        data.search.departure !== q.departure || data.search.return !== q.returnDate ||
        JSON.stringify(data.search.ages) !== JSON.stringify(ages)) {
      throw new Error('unexpected_validation_result');
    }
    return data;
  }

  // Must match the exact server payload from interwelt-worker/public-rates.mjs.
  // No provider authentication, pricing inputs or secret token are read here.
  // Off by default: the API has a separate disabled server-side flag as well.
  function verifiedRateResponse(q, ages, response) {
    if (!response || response.mode !== 'public_rates' ||
        response.source !== 'INTERWELT' || response.live !== true ||
        response.currency_confirmed !== true || response.currency !== 'USD' ||
        response.rates_available !== true || response.plans_selected_by_provider !== true ||
        response.payments_enabled !== false || response.vouchers_enabled !== false ||
        !Array.isArray(response.prices) || !response.search ||
        response.search.origin !== q.origin ||
        normalizeDestination(response.search.destination) !== q.dest ||
        response.search.departure !== q.departure ||
        response.search.return !== q.returnDate ||
        JSON.stringify(response.search.ages) !== JSON.stringify(ages)) return null;
    const cleaned = response.prices.filter(p =>
      Number.isSafeInteger(p.id) && p.id > 0 &&
      typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 90 &&
      typeof p.total === 'number' && Number.isFinite(p.total) && p.total > 0);
    return cleaned.length > 0 ? cleaned : null;
  }

  function renderLive(q, ages, response) {
    if (!LIVE_ENABLED || preview) return false;
    const clean = verifiedRateResponse(q, ages, response);
    if (!clean) return false;
    results.replaceChildren();
    const ordered = clean.slice().sort((a, b) => a.total - b.total);
    results.append(card(ordered[0], 'live', ordered, q));
    applyMessage('Tarifas de INTERWELT en USD para esta búsqueda. Contratación todavía desactivada.');
    return true;
  }

  async function loadPublicRates(q, ages, version) {
    // The public gateway remains OFF on Netlify. Do not enable frontend
    // automatically just because a database has been connected.
    if (!LIVE_ENABLED || preview) return;
    const input = {
      origin: q.origin,
      destination: q.dest === 'europe' ? 'espana-schengen' : 'eeuu',
      departure: q.departure,
      return: q.returnDate,
      ages
    };
    const response = await fetch('/.netlify/functions/interwelt-quote?public_rates=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify(input)
    });
    // 202 means another identical quote is in progress. Do not automatically
    // retry and accidentally create a second provider quote.
    if (response.status === 202) throw new Error('quote_in_progress');
    if (!response.ok) throw new Error('rates_unavailable');
    const payload = await response.json();
    if (version !== searchVersion) return;
    if (!renderLive(q, ages, payload)) throw new Error('unexpected_rates');
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
        const routeStatus = checked.route_supported && checked.mapping_verified
          ? 'Ruta verificada · ' + checked.search.days + ' días. '
          : 'Ruta pendiente de confirmar con INTERWELT. ';
        applyMessage(routeStatus + message.textContent);
      } else if (LIVE_ENABLED && checked.route_supported && checked.mapping_verified) {
        applyMessage('Consultando las tarifas actuales de INTERWELT…');
        await loadPublicRates(q, ages, version);
      } else {
        applyMessage('Búsqueda validada. Cotizaciones reales todavía desactivadas.');
      }
    } catch {
      if (version !== searchVersion) return;
      applyMessage(LIVE_ENABLED && !preview
        ? 'No hay tarifas verificadas disponibles de INTERWELT para esta búsqueda. Puedes consultar los demás proveedores.'
        : 'No se pudieron verificar los datos de esta búsqueda en Netlify. No se ha consultado la API real.');
    }
  }
  root.hidden = false;
  // "Editar búsqueda" updates the URL synchronously.
  document.querySelectorAll('button[onclick="applyEditSearch()"]').forEach(button => {
    button.addEventListener('click', () => setTimeout(refresh, 0));
  });
  window.addEventListener('popstate', refresh);
  refresh();
  window.VLInterweltBridge = Object.freeze({refresh});
})();
