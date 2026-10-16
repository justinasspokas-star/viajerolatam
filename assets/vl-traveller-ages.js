/* ViajeroLatam — ages in existing search; backward-compatible GET query parameter "edades".
 * No cookies, remote requests or new dependencies.
 * Safe on both homepage and /resultados/ edit search.
 */
(function () {
  'use strict';
  function ageInput(index, value) {
    const label = document.createElement('label');
    label.className = 'vl-age-item';
    label.textContent = 'Viajero ' + (index + 1);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = '100';
    input.step = '1';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.placeholder = 'Edad';
    input.required = true;
    input.value = value === undefined ? '' : String(value);
    input.setAttribute('aria-label', 'Edad del viajero ' + (index + 1));
    label.append(input);
    return label;
  }
  function numbers(value) {
    if (!value || !/^\d{1,3}(,\d{1,3})*$/.test(value)) return [];
    return value.split(',').map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 100);
  }
  function values(el) {
    return [...el.querySelectorAll('input')].map(i => i.value.trim());
  }
  function numberOfTravelers(selector) {
    const n = Number(selector.value);
    return Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
  }
  function render(container, selector, previous) {
    const count = numberOfTravelers(selector);
    const existing = previous || values(container);
    container.replaceChildren();
    for (let i = 0; i < count; i++) container.append(ageInput(i, existing[i]));
  }
  function collect(container) {
    const inputs = [...container.querySelectorAll('input')];
    const raw = inputs.map(i => i.value.trim());
    if (raw.some(v => v === '' || !/^\d{1,3}$/.test(v))) return null;
    const ages = raw.map(Number);
    if (ages.some(age => age < 0 || age > 100 || !Number.isInteger(age))) return null;
    return ages;
  }
  function errorMessage(message) {
    const holder = document.getElementById('vl-ages-error');
    if (holder) {
      holder.textContent = message;
      holder.hidden = !message;
    }
  }

  const home = document.getElementById('vl-search-form');
  if (home) {
    const selector = document.getElementById('sb-personas');
    const holder = document.getElementById('vl-ages-inputs');
    const hidden = document.getElementById('vl-ages-param');
    if (selector && holder && hidden) {
      // Preserve existing country/flight-date/personas input names and form destination.
      const params = new URLSearchParams(location.search);
      const initialAges = numbers(params.get('edades') || '');
      render(holder, selector, initialAges.length === numberOfTravelers(selector) ? initialAges : []);
      selector.addEventListener('change', () => { render(holder, selector); errorMessage(''); });
      holder.addEventListener('input', () => errorMessage(''));
      home.addEventListener('submit', event => {
        const ages = collect(holder);
        if (!ages || ages.length !== numberOfTravelers(selector)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          hidden.value = '';
          errorMessage('Introduce la edad de cada viajero (0 a 100 años) antes de comparar.');
          holder.querySelector('input:invalid, input')?.focus();
          return;
        }
        hidden.value = ages.join(',');
        errorMessage('');
      }, true);
    }
  }

  // Editing search on results: preserve ages carried by homepage; allow legacy
  // URLs without ages to remain functional for current affiliate comparison.
  const editPanel = document.getElementById('edit-panel');
  const editSelector = document.getElementById('ep-viajeros');
  if (editPanel && editSelector) {
    const grid = editSelector.closest('div[style*="display:grid"]');
    // The immediate parent is a field; parent grid is its parent.
    const layout = grid || editSelector.parentElement?.parentElement;
    if (!layout || !layout.parentElement) return;
    const row = document.createElement('section');
    row.id = 'vl-edit-ages';
    row.className = 'vl-ages-edit';
    row.setAttribute('aria-label', 'Edades de los viajeros');
    const title = document.createElement('strong');
    title.textContent = 'Edad de los viajeros';
    const hint = document.createElement('span');
    hint.textContent = 'Necesaria para futuras cotizaciones exactas.';
    const inputs = document.createElement('div');
    inputs.className = 'vl-ages-inputs';
    const problem = document.createElement('p');
    problem.className = 'vl-ages-error';
    problem.hidden = true;
    row.append(title, hint, inputs, problem);
    layout.insertAdjacentElement('afterend', row);
    const q = new URLSearchParams(location.search);
    const saved = numbers(q.get('edades') || '');
    render(inputs, editSelector, saved.length === numberOfTravelers(editSelector) ? saved : []);
    editSelector.addEventListener('change', () => {
      render(inputs, editSelector);
      problem.hidden = true;
    });
    inputs.addEventListener('input', () => { problem.hidden = true; });
    const submit = [...editPanel.querySelectorAll('button')].find(b => b.getAttribute('onclick') === 'applyEditSearch()');
    if (submit) {
      submit.addEventListener('click', event => {
        const ages = collect(inputs);
        const anyEntered = values(inputs).some(v => v !== '');
        if (anyEntered && (!ages || ages.length !== numberOfTravelers(editSelector))) {
          event.preventDefault();
          event.stopImmediatePropagation();
          problem.textContent = 'Completa las edades de todos los viajeros, entre 0 y 100 años.';
          problem.hidden = false;
          inputs.querySelector('input:invalid, input')?.focus();
          return;
        }
        const current = new URLSearchParams(location.search);
        if (ages && ages.length === numberOfTravelers(editSelector)) current.set('edades', ages.join(','));
        else current.delete('edades');
        history.replaceState(null, '', location.pathname + '?' + current.toString());
      }, true);
    }
  }
})();
