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
  function isVisitor(options) {
    if (typeof options.visitor === 'boolean') return options.visitor;
    try { return !JSON.parse(localStorage.getItem('shalom-demo-v03') || 'null')?.session; } catch (_) { return false; }
  }
  function mount(container, options = {}) {
    if (!container) return;
    // La sección exterior no compite con las pestañas internas del módulo.
    const existing = container.querySelector('.shalom-area-nav');
    // Mantiene la apertura si la misma vista vuelve a renderizarse.
    const wasExpanded = existing?.getAttribute?.('data-mobile-open') === 'true';
    if (existing) existing.remove();
    const area = document.body.dataset.shalomSpace || 'main';
    // Quien entra como visitante no ve la barra de áreas; Aa está en la franja común.
    if (isVisitor(options)) return;
    const nav = document.createElement('nav');
    nav.className = 'shalom-area-nav';
    nav.setAttribute('aria-label', 'Más áreas de Shalom');
    const heading = document.createElement('span');
    heading.className = 'shalom-area-caption';
    heading.textContent = 'Más áreas de Shalom';
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
      toggle.textContent = value ? 'Cerrar áreas' : 'Más áreas';
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
    // La navegación inferior de Inicio ya contiene Inicio y Avisos.
    // Los enlaces compartidos solo llevan a otras áreas, nunca al módulo actual.
    const otherAreas = sections.filter(section => section.id !== area && !(area === 'main' && section.id === 'comms' && options.noticesInLocalNav === true));
    for (const section of otherAreas) {
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
    nav.append(panel);
    place(container, nav, options);
  }
  function place(container, nav, options) {
    const anchor = options.after && container.querySelector(options.after);
    if (anchor) anchor.insertAdjacentElement('afterend', nav);
    else container.prepend(nav);
    window.ShalomNotifications?.mountInNavigation?.();
    window.ShalomAccessibility?.apply();
  }

  /* Marco común en celular: una sola franja de demostración y la misma barra inferior en las cinco áreas
     (Inicio · Eventos · Kids · Cafetería · Más). Las pestañas propias de cada área quedan arriba del contenido. */
  const ICONS = {
    inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
    eventos: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    kids: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 10h.01M15 10h.01M8.5 14.5a4.5 4.5 0 0 0 7 0',
    cafe: 'M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3',
    mas: 'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z'
  };
  // Inicio comparte sus accesos de perfil con «Más»; cada render vuelve a llamar setLocal.
  let local = { items: [], current: '' };
  let tabbar = null, moreSheet = null;
  const area = () => document.body.dataset.shalomSpace || 'main';
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** En Inicio, Inicio y Eventos son pantallas de la misma página; en las demás áreas, enlaces. */
  function destination(id) {
    const inMain = area() === 'main';
    if (id === 'inicio') return inMain ? { action: 'goto', id: 'home' } : { href: new URL('index.html', root).href };
    if (id === 'eventos') return inMain ? { action: 'goto', id: 'events' } : { href: new URL('index.html#events', root).href };
    if (id === 'kids') return { href: new URL(sections[1].path, root).href };
    if (id === 'cafe') return { href: new URL(sections[2].path, root).href };
    return null;
  }
  function activeTab() {
    const a = area();
    if (a === 'kids') return 'kids';
    if (a === 'cafe') return 'cafe';
    if (a !== 'main') return 'mas';
    if (local.current === 'home') return 'inicio';
    if (local.current === 'events') return 'eventos';
    return local.items.some(item => item.id === local.current) ? 'mas' : '';
  }
  function control(item, className, inner) {
    const current = item.current ? ' aria-current="page"' : '';
    if (item.href) return `<a class="${className}" href="${esc(item.href)}"${current}>${inner}</a>`;
    return `<button type="button" class="${className}" data-action="${esc(item.action)}" data-id="${esc(item.id)}"${current}>${inner}</button>`;
  }
  function renderTabbar() {
    const active = activeTab();
    tabbar.innerHTML = [['inicio', 'Inicio'], ['eventos', 'Eventos'], ['kids', 'Kids'], ['cafe', 'Cafetería'], ['mas', 'Más']].map(([id, label]) => {
      const inner = `${svg(ICONS[id])}<span>${label}</span>`;
      if (id === 'mas') return `<button type="button" class="shalom-tab" data-shalom-more aria-haspopup="dialog" aria-expanded="false"${active === 'mas' ? ' aria-current="page"' : ''}>${inner}</button>`;
      return control({ ...destination(id), current: active === id }, 'shalom-tab', inner);
    }).join('');
  }
  function openMore(opener) {
    if (!moreSheet) {
      moreSheet = document.createElement('dialog');
      moreSheet.className = 'shalom-sheet shalom-more-sheet';
      moreSheet.setAttribute('aria-labelledby', 'shalom-more-title');
      moreSheet.addEventListener('click', e => {
        // Las acciones de Inicio las atiende su propio manejador de clics; aquí solo se cierra la hoja.
        if (e.target === moreSheet || e.target.closest('[data-sheet-close], a, [data-action]')) moreSheet.close();
      });
      moreSheet.addEventListener('close', () => { opener.setAttribute('aria-expanded', 'false'); opener.focus(); });
      document.body.append(moreSheet);
    }
    // Si Inicio ya ofrece su pantalla de avisos en «Más», no se repite el área Avisos.
    const ownNotices = local.items.some(item => item.id === 'notices');
    const others = sections.filter(s => s.id === 'feedback' || (s.id === 'comms' && !ownNotices)).map(s => ({ label: s.label, href: new URL(s.path, root).href, current: s.id === area() }));
    const group = (title, items) => items.length ? `<div class="shalom-sheet-group"><span>${title}</span><div class="shalom-more-list">${items.map(item => control(item, 'shalom-more-item', `${esc(item.label)}<span aria-hidden="true">›</span>`)).join('')}</div></div>` : '';
    moreSheet.innerHTML = `<div class="shalom-sheet-head"><h2 id="shalom-more-title">Más</h2><button type="button" class="shalom-sheet-close" data-sheet-close>Cerrar</button></div>${group('En esta sección', local.items.map(item => ({ ...item, current: item.id === local.current })))}${group('Áreas de Shalom', others)}`;
    opener.setAttribute('aria-expanded', 'true');
    moreSheet.showModal();
  }
  function startFrame() {
    const strip = document.createElement('div');
    strip.className = 'shalom-demo-strip';
    // El botón Aa vive en la franja: mismo lugar en todas las áreas.
    strip.innerHTML = '<span class="shalom-demo-dot" aria-hidden="true"></span><span class="shalom-demo-text">Versión de demostración · datos de ejemplo</span><button type="button" class="shalom-text-toggle shalom-frame-aa" data-large-text>Aa</button>';
    document.body.prepend(strip);
    window.ShalomNotifications?.mountInNavigation?.();
    window.ShalomAccessibility?.apply();
    tabbar = document.createElement('nav');
    tabbar.className = 'shalom-tabbar';
    tabbar.setAttribute('aria-label', 'Áreas de Shalom');
    tabbar.addEventListener('click', e => {
      const more = e.target.closest('[data-shalom-more]');
      if (more) openMore(more);
    });
    document.body.append(tabbar);
    document.documentElement.dataset.shalomFrame = 'true';
    renderTabbar();
  }
  /** Accesos propios del área que van en «Más» (p. ej. los del perfil en Inicio) y la pantalla actual. */
  function setLocal(items, current = '') {
    local = { items: items || [], current };
    if (tabbar) renderTabbar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startFrame);
  else if (document.documentElement) startFrame();
  window.ShalomNavigation = Object.freeze({ mount, setLocal });
})();
