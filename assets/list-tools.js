/* Herramientas de listados del prototipo: datos ficticios, sin red. */
"use strict";
(() => {
  const text = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll("button,a,svg,form").forEach((n) => n.remove());
    return copy.textContent.replace(/\s+/g, " ").trim();
  };
  let count = 0;
  function attach(container, items, title, columns = []) {
    if (!items.length) return;
    const id = "list-" + ++count;
    let page = 1,
      size = 5,
      query = "",
      filter = "Todos";
    const entries = items.map((node) => ({
      node,
      body: text(node),
      values: node.matches("tr") ? [...node.cells].map(text) : [text(node)],
      tags: [...node.querySelectorAll(".tag,.status")].map((n) =>
        n.textContent.trim(),
      ),
    }));
    const tags = [...new Set(entries.flatMap((e) => e.tags))];
    const ui = document.createElement("section");
    ui.className = "list-tools";
    ui.setAttribute("aria-label", "Herramientas de " + title);
    ui.innerHTML = `<div class="list-toolbar"><label>Buscar en ${title}<input type="search" maxlength="100" placeholder="Escribe para buscar" data-list="search"></label><label>Filtrar por estado<select data-list="filter"><option>Todos</option></select></label><label>Por página<select data-list="size"><option>5</option><option>10</option><option>25</option></select></label><button type="button" class="btn secondary" data-list="csv">Solicitar CSV por correo</button></div><div class="list-pagination"><span role="status" data-list="status"></span><div class="btnrow"><button type="button" class="btn secondary sm" data-list="prev">Anterior</button><button type="button" class="btn secondary sm" data-list="next">Siguiente</button></div></div><p class="empty" data-list="empty" hidden>Sin resultados. Cambia la búsqueda o el filtro.</p>`;
    for (const tag of tags) {
      const o = document.createElement("option");
      o.textContent = tag;
      ui.querySelector("[data-list=filter]").append(o);
    }
    if (!tags.length) {
      ui
        .querySelector("[data-list=filter]")
        .closest("label").firstChild.textContent = "Filtrar contenido";
      const o = document.createElement("option");
      o.textContent = "Con resultados";
      ui.querySelector("[data-list=filter]").append(o);
    }
    container.before(ui);
    const find = (k) => ui.querySelector("[data-list=" + k + "]");
    const filtered = () =>
      entries.filter(
        (e) =>
          e.body
            .toLocaleLowerCase("es")
            .includes(query.toLocaleLowerCase("es")) &&
          (filter === "Todos" ||
            filter === "Con resultados" ||
            e.tags.includes(filter)),
      );
    function draw() {
      const arr = filtered(),
        pages = Math.max(1, Math.ceil(arr.length / size));
      page = Math.min(page, pages);
      entries.forEach((e) => (e.node.hidden = true));
      arr
        .slice((page - 1) * size, page * size)
        .forEach((e) => (e.node.hidden = false));
      find("status").textContent =
        arr.length + " resultados · Página " + page + " de " + pages;
      find("prev").disabled = page === 1;
      find("next").disabled = page === pages;
      find("empty").hidden = arr.length > 0;
      find("csv").disabled = !arr.length;
    }
    ui.addEventListener("input", (e) => {
      if (e.target === find("search")) {
        query = e.target.value;
        page = 1;
        draw();
      }
    });
    ui.addEventListener("change", (e) => {
      if (e.target === find("filter")) filter = e.target.value;
      if (e.target === find("size")) size = Number(e.target.value);
      page = 1;
      draw();
    });
    ui.addEventListener("click", (e) => {
      const action = e.target.closest("[data-list]")?.dataset.list;
      if (action === "prev") {
        page--;
        draw();
      }
      if (action === "next") {
        page++;
        draw();
      }
      if (action === "csv") {
        const job = window.ShalomProcessing.requestExport({
          source: title,
          count: filtered().length,
          filters: { query, filter },
        });
        find("status").textContent = job
          ? "Solicitud " +
            job.id +
            " simulada. La entrega sería por correo; no se descarga información."
          : "No hay resultados para solicitar.";
      }
    });
    draw();
  }
  let last = null;
  function enhance() {
    const main = document.getElementById("main-view");
    if (!main || main === last) return;
    last = main;
    const screen = typeof state === "object" ? state.screen : "";
    if (["kids", "home", "login"].includes(screen)) return;
    main.querySelectorAll(".data-table").forEach((table) => {
      const body = table.tBodies[0] || table;
      const items = [...body.rows].filter((tr) => tr.querySelector("td"));
      if (items.length)
        attach(
          table.closest(".table-wrap") || table,
          items,
          screen,
          [...table.querySelectorAll("th")].map(text),
        );
    });
    if (["events", "projects", "family"].includes(screen)) {
      const grid = main.querySelector(".grid:not(.cols3):not(.cols4)");
      if (grid)
        attach(
          grid,
          [...grid.children].filter((n) =>
            n.matches(".item-card,section,.panel"),
          ),
          screen,
        );
    }
    if (screen === "giving") {
      const panel = [...main.querySelectorAll(".panel")].find((p) =>
        p.textContent.includes("Historial personal"),
      );
      if (panel) {
        const rows = [...panel.children].filter((n) => n.matches(".rowline"));
        if (rows.length) {
          const group = document.createElement("div");
          rows[0].before(group);
          rows.forEach((r) => group.append(r));
          attach(group, rows, "aportaciones");
        }
      }
    }
  }
  const app = document.getElementById("app");
  if (app) {
    new MutationObserver(enhance).observe(app, {
      childList: true,
      subtree: true,
    });
    enhance();
  }
})();
