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
    if (existing) existing.remove();
    const area = document.body.dataset.shalomSpace || 'main';
    const nav = document.createElement('nav');
    nav.className = 'shalom-area-nav';
    nav.setAttribute('aria-label', 'Áreas de Shalom');
    const heading = document.createElement('span');
    heading.className = 'shalom-area-caption';
    heading.textContent = 'Áreas de Shalom';
    nav.append(heading);
    const links = document.createElement('div');
    links.className = 'shalom-area-links';
    for (const section of sections) {
      const link = document.createElement('a');
      const url = new URL(section.path, root);
      if (section.id === 'feedback' && feedbackServices.has(options.service))
        url.searchParams.set('service', options.service);
      link.href = url.href;
      link.textContent = section.label;
      if (section.id === area) link.setAttribute('aria-current', 'page');
      links.append(link);
    }
    nav.append(links);
    if (options.after) {
      const anchor = container.querySelector(options.after);
      if (anchor) { anchor.insertAdjacentElement('afterend', nav); return; }
    }
    container.prepend(nav);
  }
  window.ShalomNavigation = Object.freeze({ mount });
})();
