/* Preferencia visual compartida entre pantallas de la demo Shalom.
   Nunca guarda roles, consentimientos, datos de menores ni formularios. */
(function () {
  'use strict';
  // Kids abre en tema claro y guarda su propia preferencia; el resto de las áreas comparte una.
  const kids = document.documentElement.dataset.shalomThemeScope === 'kids';
  const KEY = kids ? 'shalom-ui-theme-kids-v1' : 'shalom-ui-theme-v1';
  const valid = value => value === 'cream' || value === 'night';
  function read() {
    try {
      const saved = localStorage.getItem(KEY);
      if (valid(saved)) return saved;
      if (kids) return 'cream';
      // Respeta la preferencia de Inicio que existia antes de unificar los modulos.
      const previous = JSON.parse(localStorage.getItem('shalom-demo-v03') || 'null');
      if (previous && valid(previous.theme)) return previous.theme;
    } catch (_) { /* Navegacion privada o almacenamiento restringido. */ }
    return kids ? 'cream' : 'night';
  }
  let current = read();
  document.documentElement.dataset.shalomTheme = current;
  function apply() {
    if (!document.body) return;
    const space = document.body.dataset.shalomSpace;
    document.body.classList.toggle('night', space === 'comms' && current === 'night');
    if (space !== 'comms') {
      document.body.classList.toggle('theme-night', current === 'night');
      document.body.classList.toggle('theme-cream', current === 'cream');
    }
    const color = current === 'night' ? '#1a1a1a' : '#faf7f2';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
    document.querySelectorAll('[data-shalom-theme-toggle], body[data-shalom-space="comms"] [data-action="theme"]').forEach(button => {
      // Mismos nombres que el manual y que Inicio: el botón dice a qué tema cambia (Noche o Crema).
      const next = current === 'night' ? 'Crema' : 'Noche';
      button.textContent = 'Tema ' + next;
      button.setAttribute('aria-label', 'Cambiar a tema ' + next);
      button.setAttribute('title', 'Cambiar a tema ' + next);
    });
  }
  function set(value, persist = true) {
    if (!valid(value)) return;
    const changed = current !== value;
    current = value;
    document.documentElement.dataset.shalomTheme = value;
    if (persist) {
      try { localStorage.setItem(KEY, value); } catch (_) { /* Utilizar el tema en memoria. */ }
    }
    apply();
    if (changed) document.dispatchEvent(new CustomEvent('shalomthemechange', { detail: { theme: current } }));
  }
  const api = {
    get: () => current,
    apply,
    set,
    toggle: () => set(current === 'night' ? 'cream' : 'night')
  };
  window.ShalomTheme = api;
  document.addEventListener('click', event => {
    const target = event.target;
    const button = target && target.closest && target.closest('[data-shalom-theme-toggle]');
    if (button) api.toggle();
  });
  window.addEventListener('storage', event => {
    if (event.key === KEY || event.key === null) set(read(), false);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
