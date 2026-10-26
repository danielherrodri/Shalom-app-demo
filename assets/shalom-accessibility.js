/* Solo conserva una preferencia visual, compartida entre las cinco áreas. */
(() => {
  const key = 'shalom-ui-large-text-v1';
  let large = false;
  try { large = localStorage.getItem(key) === 'true'; } catch (_) {}
  function apply() {
    document.documentElement.dataset.shalomLargeText = String(large);
    document.querySelectorAll('[data-large-text]').forEach(b => {
      b.textContent = large ? 'Texto normal' : 'Ampliar texto';
      b.setAttribute('aria-pressed', String(large));
      b.setAttribute('aria-label', large ? 'Restablecer tamaño de texto' : 'Ampliar tamaño de texto');
    });
  }
  window.ShalomAccessibility = { apply };
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-large-text]')) return;
    large = !large;
    try { localStorage.setItem(key, String(large)); } catch (_) {}
    apply();
  });
  window.addEventListener('storage', e => {
    if (e.key === key || e.key === null) {
      try { large = localStorage.getItem(key) === 'true'; } catch (_) {}
      apply();
    }
  });
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
