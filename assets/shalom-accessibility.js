/* Panel «Accesibilidad» (botón Aa): tema, tamaño del texto y movimiento, compartidos entre las cinco áreas.
   Solo guarda preferencias visuales; nunca datos personales. */
(() => {
  // «true» era el texto ampliado de la versión anterior: se lee como «Grande».
  const sizeKey = 'shalom-ui-large-text-v1';
  const motionKey = 'shalom-ui-reduce-motion-v1';
  const SIZES = [['false', 'Normal'], ['true', 'Grande'], ['max', 'Máximo']];
  const THEMES = [['night', 'Noche'], ['cream', 'Crema']];
  const read = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  let size = 'false', reduceMotion = false;
  function load() {
    size = SIZES.some(([v]) => v === read(sizeKey, 'false')) ? read(sizeKey, 'false') : 'false';
    reduceMotion = read(motionKey, 'false') === 'true';
  }
  let sheet = null;
  function buildSheet() {
    sheet = document.createElement('dialog');
    sheet.className = 'shalom-sheet shalom-a11y-sheet';
    sheet.setAttribute('aria-labelledby', 'shalom-a11y-title');
    const group = (label, name, options) => `<div class="shalom-sheet-group"><span id="shalom-a11y-${name}">${label}</span><div class="shalom-segmented" role="group" aria-labelledby="shalom-a11y-${name}">${options.map(([v, t]) => `<button type="button" data-a11y-${name}="${v}">${t}</button>`).join('')}</div></div>`;
    sheet.innerHTML = `<div class="shalom-sheet-head"><h2 id="shalom-a11y-title">Accesibilidad</h2><button type="button" class="shalom-sheet-close" data-sheet-close>Listo</button></div>
${group('Tema', 'theme', THEMES)}${group('Tamaño del texto', 'size', SIZES)}
<div class="shalom-sheet-switch"><span><strong id="shalom-a11y-motion">Reducir movimiento</strong><small>Quita animaciones y transiciones</small></span><button type="button" role="switch" aria-labelledby="shalom-a11y-motion" data-a11y-motion></button></div>`;
    sheet.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (e.target === sheet || b?.hasAttribute('data-sheet-close')) { sheet.close(); return; }
      if (!b) return;
      if (b.dataset.a11yTheme) window.ShalomTheme?.set(b.dataset.a11yTheme);
      if (b.dataset.a11ySize) { size = b.dataset.a11ySize; save(sizeKey, size); }
      if (b.hasAttribute('data-a11y-motion')) { reduceMotion = !reduceMotion; save(motionKey, String(reduceMotion)); }
      apply();
    });
    sheet.addEventListener('close', () => {
      document.querySelectorAll('[data-large-text]').forEach(x => x.setAttribute('aria-expanded', 'false'));
      sheet.opener?.focus();
    });
    document.body.append(sheet);
  }
  function apply() {
    const root = document.documentElement;
    // Grande y Máximo comparten los ajustes de diseño del texto ampliado; Máximo además lo aumenta.
    root.dataset.shalomLargeText = String(size !== 'false');
    root.dataset.shalomTextSize = size === 'max' ? 'max' : size === 'true' ? 'grande' : 'normal';
    root.dataset.shalomReduceMotion = String(reduceMotion);
    document.querySelectorAll('[data-large-text]').forEach(b => {
      b.textContent = 'Aa';
      b.setAttribute('aria-label', 'Accesibilidad: tema y tamaño del texto');
      b.setAttribute('aria-haspopup', 'dialog');
      if (!b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', 'false');
      b.removeAttribute('aria-pressed');
    });
    if (!sheet) return;
    const theme = window.ShalomTheme?.get();
    sheet.querySelectorAll('[data-a11y-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a11yTheme === theme)));
    sheet.querySelectorAll('[data-a11y-size]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.a11ySize === size)));
    sheet.querySelector('[data-a11y-motion]').setAttribute('aria-checked', String(reduceMotion));
  }
  function open(opener) {
    if (!sheet) buildSheet();
    sheet.opener = opener;
    opener.setAttribute('aria-expanded', 'true');
    apply();
    sheet.showModal();
  }
  window.ShalomAccessibility = { apply };
  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-large-text]');
    if (opener) open(opener);
  });
  document.addEventListener('shalomthemechange', apply);
  window.addEventListener('storage', e => {
    if ([sizeKey, motionKey, null].includes(e.key)) { load(); apply(); }
  });
  load();
  apply();
})();

/* Errores de formulario como texto bajo el campo, con ícono (manual 2026, pág. 14).
   Sustituye la burbuja del navegador; no cambia qué se valida ni cuándo. */
(() => {
  const idDe = campo => (campo.id || campo.name || 'campo') + '-error';
  function limpiar(campo) {
    const aviso = document.getElementById(idDe(campo));
    if (aviso && aviso.classList.contains('campo-error')) aviso.remove();
    campo.removeAttribute('aria-invalid');
    const desc = (campo.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== idDe(campo));
    if (desc.length) campo.setAttribute('aria-describedby', desc.join(' ')); else campo.removeAttribute('aria-describedby');
  }
  document.addEventListener('invalid', e => {
    const campo = e.target;
    if (!(campo instanceof HTMLElement) || !campo.matches('input, select, textarea')) return;
    e.preventDefault();
    limpiar(campo);
    const aviso = document.createElement('p');
    aviso.className = 'campo-error';
    aviso.id = idDe(campo);
    aviso.textContent = campo.validationMessage || 'Revisa este dato.';
    const ancla = campo.closest('label') && !campo.closest('label').matches('.field') ? campo.closest('label') : campo;
    ancla.insertAdjacentElement('afterend', aviso);
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', ((campo.getAttribute('aria-describedby') || '') + ' ' + aviso.id).trim());
    const primero = campo.form && campo.form.querySelector(':invalid');
    if (!primero || primero === campo) campo.focus({ preventScroll: false });
  }, true);
  ['input', 'change'].forEach(tipo => document.addEventListener(tipo, e => {
    const campo = e.target;
    if (campo instanceof HTMLElement && campo.getAttribute('aria-invalid') === 'true' && campo.checkValidity && campo.checkValidity()) limpiar(campo);
  }, true));
})();
