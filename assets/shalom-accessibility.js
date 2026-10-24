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
