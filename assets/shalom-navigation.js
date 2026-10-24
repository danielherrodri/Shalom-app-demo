/* Navegación de áreas compartida por las páginas públicas de Shalom.
 * Las funciones específicas de cada módulo conservan su menú local. */
(() => {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../', script.src);
  const sections = [
    { id: 'main', label: 'Inicio', path: 'index.html' },
    { id: 'kids', label: 'Shalom Kids', path: 'design/kids-paneles.html#inicio' },
    { id: 'cafe', label: 'Cafetería', path: 'cafeteria.html' },
    { id: 'comms', label: 'Avisos', path: 'comunicaciones.html#avisos' },
    { id: 'feedback', label: 'Tu opinión', path: 'feedback.html' }
  ];
  const feedbackServices = new Set(['welcome','parking','cafe','events','kids','courses','advice','pastoral','giving','other']);
  function mount(container, options = {}) {
    if (!container) return;
    // La sección exterior no compite con las pestañas internas del módulo.
    const existing = container.querySelector('.shalom-area-nav');
    // Mantiene la apertura si la misma vista vuelve a renderizarse.
    const wasExpanded = existing?.getAttribute?.('data-mobile-open') === 'true';
    if (existing) existing.remove();
    const area = document.body.dataset.shalomSpace || 'main';
    const nav = document.createElement('nav');
    nav.className = 'shalom-area-nav';
    nav.setAttribute('aria-label', 'Áreas de Shalom');
    const heading = document.createElement('span');
    heading.className = 'shalom-area-caption';
    heading.textContent = 'Áreas de Shalom';
    const top = document.createElement('div');
    top.className = 'shalom-area-top';
    const actions = document.createElement('div');
    actions.className = 'shalom-area-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'shalom-areas-toggle';
    toggle.setAttribute('aria-controls', 'shalom-area-panel');
    const setExpanded = value => {
      nav.setAttribute('data-mobile-open', String(value));
      toggle.setAttribute('aria-expanded', String(value));
      toggle.setAttribute('aria-label', value ? 'Ocultar áreas de Shalom' : 'Mostrar áreas de Shalom');
      toggle.textContent = value ? 'Ocultar' : 'Ver áreas';
    };
    setExpanded(wasExpanded);
    toggle.addEventListener('click', () => setExpanded(nav.getAttribute('data-mobile-open') !== 'true'));
    actions.append(toggle);
    top.append(heading, actions);
    nav.append(top);
    const panel = document.createElement('div');
    panel.className = 'shalom-area-panel';
    panel.setAttribute('id', 'shalom-area-panel');
    const links = document.createElement('div');
    links.className = 'shalom-area-links';
    for (const section of sections) {
      const link = document.createElement('a');
      const url = new URL(section.path, root);
      if (section.id === 'feedback' && feedbackServices.has(options.service))
        url.searchParams.set('service', options.service);
      link.href = url.href;
      link.textContent = section.label;
      if (section.id === area) {
        link.setAttribute('aria-current', 'page');
        // No recargar el formulario o reiniciar datos al pulsar el area activa.
        link.addEventListener('click', event => event.preventDefault());
      }
      links.append(link);
    }
    panel.append(links);
    const textButton = document.createElement('button');
    textButton.type = 'button';
    textButton.className = 'shalom-text-toggle';
    textButton.setAttribute('data-large-text', '');
    textButton.textContent = 'Ampliar texto';
    panel.append(textButton);
    nav.append(panel);
    if (options.after) {
      const anchor = container.querySelector(options.after);
      if (anchor) {
        anchor.insertAdjacentElement('afterend', nav);
        window.ShalomNotifications?.mountInNavigation?.();
        window.ShalomAccessibility?.apply();
        return;
      }
    }
    container.prepend(nav);
    window.ShalomNotifications?.mountInNavigation?.();
    window.ShalomAccessibility?.apply();
  }
  window.ShalomNavigation = Object.freeze({ mount });
})();
