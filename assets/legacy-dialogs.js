/* Apoyo de teclado para los diálogos anteriores del prototipo estático. */
(() => {
  let current = null,
    restore = null;
  const host =
      document.getElementById("dialog-host") ||
      document.getElementById("dialog"),
    app = document.getElementById("app");
  if (!host || !app) return;
  const focusables = () =>
    [
      ...current.querySelectorAll(
        'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
      ),
    ].filter((n) => n.getClientRects().length);
  function sync() {
    const next = host.querySelector("[role=dialog]");
    if (next === current) return;
    if (next) {
      const active = document.activeElement;
      if (!current && !restore) {
        restore = {
          action: active.dataset?.action,
          id: active.dataset?.id,
          product: active.dataset?.product,
        };
      }
      current = next;
      app.inert = true;
      queueMicrotask(() => focusables()[0]?.focus());
    } else {
      current = null;
      app.inert = false;
      if (restore) {
        const target = [...app.querySelectorAll("button,a")].find((n) =>
          restore.product
            ? n.dataset.product === restore.product
            : restore.action &&
              n.dataset.action === restore.action &&
              n.dataset.id === restore.id,
        );
        target?.focus();
        restore = null;
      }
    }
  }
  document.addEventListener(
    "click",
    (e) => {
      if (current) return;
      const t = e.target.closest("button,a");
      if (t && app.contains(t))
        restore = {
          action: t.dataset.action,
          id: t.dataset.id,
          product: t.dataset.product,
        };
    },
    true,
  );
  new MutationObserver(sync).observe(host, { childList: true, subtree: true });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || !current) return;
    const nodes = focusables(),
      first = nodes[0],
      last = nodes.at(-1);
    if (!first) {
      e.preventDefault();
      return;
    }
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        !current.contains(document.activeElement))
    ) {
      e.preventDefault();
      last.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last ||
        !current.contains(document.activeElement))
    ) {
      e.preventDefault();
      first.focus();
    }
  });
  sync();
})();
