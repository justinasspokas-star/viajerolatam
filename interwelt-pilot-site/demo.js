(() => {
  'use strict';
  const SAMPLE = Object.freeze({
    origin: 'colombia',
    destination: 'espana',
    departure: '2026-11-01',
    return: '2026-11-15',
    travellers: 1,
    ages: [30]
  });
  const form = document.getElementById('search-form');
  const origin = document.getElementById('origin');
  const destination = document.getElementById('destination');
  const departure = document.getElementById('departure');
  const returnDate = document.getElementById('return');
  const travellers = document.getElementById('travellers');
  const ageInputs = document.getElementById('age-inputs');
  const error = document.getElementById('form-error');
  const status = document.getElementById('status');
  const cards = document.getElementById('plans');
  const emptyState = document.getElementById('empty-state');
  const summary = document.getElementById('search-summary');
  const notice = document.getElementById('results-notice');
  let sequence = 0;

  function renderAges() {
    const previous = [...ageInputs.querySelectorAll('input')].map(el => el.value);
    const quantity = Math.max(1, Math.min(8, Number(travellers.value) || 1));
    ageInputs.replaceChildren();
    for (let i = 0; i < quantity; i += 1) {
      const wrapper = document.createElement('div');
      wrapper.className = 'age-item';
      const label = document.createElement('label');
      const id = 'age-' + i;
      label.htmlFor = id;
      label.textContent = 'Viajero ' + (i + 1);
      const input = document.createElement('input');
      input.id = id;
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.required = true;
      input.value = previous[i] ?? '30';
      input.setAttribute('aria-label', 'Edad del viajero ' + (i + 1));
      wrapper.append(label, input);
      ageInputs.append(wrapper);
    }
  }

  function datesToDays(ida, vuelta) {
    const a = new Date(ida + 'T00:00:00Z');
    const b = new Date(vuelta + 'T00:00:00Z');
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) ||
        a.toISOString().slice(0, 10) !== ida || b.toISOString().slice(0, 10) !== vuelta) return null;
    return Math.round((b - a) / 86400000) + 1;
  }

  function collect() {
    const values = {
      origin: origin.value,
      destination: destination.value,
      departure: departure.value,
      return: returnDate.value,
      travellers: Number(travellers.value),
      ages: [...ageInputs.querySelectorAll('input')].map(el => Number(el.value))
    };
    if (!values.departure || !values.return) throw new Error('Selecciona las fechas de salida y regreso.');
    const days = datesToDays(values.departure, values.return);
    if (days === null || days < 1 || days > 120) throw new Error('Las fechas deben ser válidas, con un viaje de entre 1 y 120 días (contando ambos días).');
    if (values.ages.length !== values.travellers || values.ages.some((age, i) => {
      const raw = ageInputs.querySelectorAll('input')[i].value;
      return raw.trim() === '' || !Number.isInteger(age) || age < 0 || age > 100;
    })) throw new Error('Introduce una edad válida de 0 a 100 años para cada viajero.');
    return { ...values, days };
  }

  function matchesSample(query) {
    return query.origin === SAMPLE.origin &&
      query.destination === SAMPLE.destination &&
      query.departure === SAMPLE.departure &&
      query.return === SAMPLE.return &&
      query.travellers === SAMPLE.travellers &&
      query.ages.length === 1 &&
      query.ages[0] === SAMPLE.ages[0];
  }

  function updateNotice(isHistoricalExample) {
    const label = document.createElement('strong');
    label.textContent = isHistoricalExample ? 'Precios de una cotización histórica: ' : 'Modo de prueba: ';
    const message = isHistoricalExample
      ? 'Son cifras de un ejemplo pasado, no ofertas actuales ni contratables. La moneda de la respuesta JSON requiere confirmación. España se agrupa en Europa/Mediterráneo y no implica validez para visados Schengen.'
      : 'Esta búsqueda todavía no consulta la API de INTERWELT y no tiene precios disponibles. No se admiten pagos ni emisión de vouchers.';
    notice.replaceChildren(label, document.createTextNode(message));
  }

  function clearResults() {
    cards.replaceChildren();
    emptyState.hidden = true;
  }

  function markDirty() {
    sequence += 1;
    error.hidden = true;
    clearResults();
    updateNotice(false);
    status.textContent = 'Búsqueda modificada. Pulsa «Comparar prueba» para actualizar los resultados.';
    summary.textContent = 'Hay cambios pendientes de aplicar.';
  }

  function planCard(plan) {
    const card = document.createElement('article');
    card.className = 'card';
    const top = document.createElement('div');
    top.className = 'card-top';
    const title = document.createElement('h3');
    title.textContent = plan.name;
    const chip = document.createElement('span');
    chip.className = 'id-chip';
    chip.textContent = 'PLAN #' + plan.id;
    top.append(title, chip);
    const amount = document.createElement('div');
    amount.className = 'price';
    amount.textContent = new Intl.NumberFormat('es-ES', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(plan.total);
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Importe histórico · moneda por confirmar';
    const divider = document.createElement('div');
    divider.className = 'divider';
    const copy = document.createElement('div');
    copy.className = 'copy';
    copy.textContent = '1 viajero · 30 años · 15 días · Región Europa y Mediterráneo';
    const disabled = document.createElement('span');
    disabled.className = 'inactive';
    disabled.textContent = 'Contratación desactivada';
    card.append(top, amount, note, divider, copy, disabled);
    return card;
  }

  async function search(event) {
    if (event) event.preventDefault();
    const requestId = ++sequence;
    error.hidden = true;
    clearResults();
    updateNotice(false);
    let query;
    try {
      query = collect();
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
      status.textContent = 'Corrige los campos para continuar.';
      return;
    }
    const originName = origin.options[origin.selectedIndex].textContent.trim();
    const destName = destination.value === 'espana' ? 'España (región Europa/Mediterráneo)' : 'Estados Unidos';
    summary.textContent = originName + ' → ' + destName + ' · ' + query.days + (query.days === 1 ? ' día' : ' días') +
      ' (inclusivos) · ' + query.travellers + (query.travellers === 1 ? ' viajero' : ' viajeros');

    updateNotice(matchesSample(query));
    if (!matchesSample(query)) {
      status.textContent = 'Búsqueda validada. Cotizaciones dinámicas pendientes de conexión a INTERWELT.';
      emptyState.hidden = false;
      return;
    }

    status.textContent = 'Recuperando el único ejemplo histórico desde Netlify Functions…';
    try {
      const response = await fetch('/.netlify/functions/interwelt-quote?demo=1', { cache: 'no-store' });
      if (!response.ok) throw new Error('Respuesta HTTP ' + response.status);
      const data = await response.json();
      if (requestId !== sequence) return;
      if (data.mode !== 'demo' || data.live !== false || data.payments_enabled !== false ||
          data.vouchers_enabled !== false || data.currency_confirmed !== false || !Array.isArray(data.prices) ||
          !data.sample_trip || data.sample_trip.origin !== query.origin || data.sample_trip.destination !== query.destination ||
          data.sample_trip.departure !== query.departure || data.sample_trip.return !== query.return ||
          data.sample_trip.travellers !== query.travellers || !Array.isArray(data.sample_trip.ages) ||
          data.sample_trip.ages.length !== 1 || data.sample_trip.ages[0] !== query.ages[0]) {
        throw new Error('La muestra no corresponde a la búsqueda.');
      }
      const clean = data.prices.filter(p => Number.isInteger(p.id) && p.id > 0 &&
        typeof p.name === 'string' && p.name.length < 80 && typeof p.total === 'number' &&
        Number.isFinite(p.total) && p.total >= 0).sort((a, b) => a.total - b.total);
      if (clean.length === 0) throw new Error('No hay planes válidos en la muestra.');
      clean.forEach(plan => cards.append(planCard(plan)));
      status.textContent = 'Netlify Functions conectado · ' + clean.length +
        ' planes de la cotización histórica · ninguna llamada en vivo a INTERWELT';
    } catch (err) {
      if (requestId !== sequence) return;
      status.textContent = 'No se pudo cargar la muestra de Netlify. Revisa el despliegue.';
      emptyState.hidden = false;
    }
  }

  function restore() {
    origin.value = SAMPLE.origin;
    destination.value = SAMPLE.destination;
    departure.value = SAMPLE.departure;
    returnDate.value = SAMPLE.return;
    travellers.value = String(SAMPLE.travellers);
    renderAges();
    ageInputs.querySelector('input').value = String(SAMPLE.ages[0]);
    search();
  }

  travellers.addEventListener('change', () => { renderAges(); markDirty(); });
  [origin, destination, departure, returnDate, ageInputs].forEach(el => {
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });
  form.addEventListener('submit', search);
  document.getElementById('reset-example').addEventListener('click', restore);
  document.getElementById('empty-example').addEventListener('click', restore);
  renderAges();
  search();
})();
