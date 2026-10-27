/* Simulación efímera: no crea archivos, no envía correo y no ejecuta trabajos reales. */
"use strict";
(() => {
  const escape = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const labels = {
    pendiente: "En cola",
    generando: "Generando por bloques",
    reintento: "Esperando reintento",
    generado: "Generado de ejemplo",
    aceptado: "Aceptado por proveedor · simulado",
    entregado: "Entregado · evento simulado",
    muerto: "Correo muerto · revisión",
    conciliar: "Resultado incierto · conciliar",
    cancelado: "Cancelado",
    suprimido: "Optativo suprimido",
  };
  let jobs = [],
    sequence = 0,
    now = 0,
    round = 0,
    paused = false,
    marketing = false,
    seeded = false;
  const schedule = ["alta", "alta", "media", "baja"];
  const notify = (message) => {
    document.dispatchEvent(
      new CustomEvent("shalom:process-status", { detail: message }),
    );
    document
      .querySelectorAll(".process-status")
      .forEach((el) => (el.textContent = message));
  };
  function add(
    kind,
    source,
    priority = "media",
    scenario = "ok",
    count = 1,
    extra = {},
  ) {
    const job = {
      id: "JOB-DEMO-" + String(++sequence).padStart(3, "0"),
      kind,
      source,
      priority,
      scenario,
      count,
      created: now,
      state: "pendiente",
      attempts: 0,
      next: now,
      progress: 0,
      expires: now + 3600,
      ...extra,
    };
    jobs.push(job);
    return job;
  }
  function requestExport({ source = "Listado", count = 0, filters = {} } = {}) {
    if (!count) {
      notify("No hay resultados para solicitar.");
      return null;
    }
    const key = JSON.stringify({ source, count, filters });
    const duplicate = jobs.find(
      (j) =>
        j.key === key &&
        [
          "pendiente",
          "generando",
          "reintento",
          "generado",
          "aceptado",
          "entregado",
        ].includes(j.state),
    );
    if (duplicate) {
      show("Ya existe una solicitud equivalente: " + duplicate.id);
      return duplicate;
    }
    const job = add("exportación", source, "media", "ok", count, {
      filters,
      key,
    });
    show(
      "Solicitud " +
        job.id +
        " registrada solo en esta demo. La entrega sería por correo del perfil verificado, no desde la app.",
    );
    return job;
  }
  function seed() {
    if (seeded) return;
    seeded = true;
    add("correo", "Recuperación de acceso ficticia", "alta", "ok", 1, {
      example: true,
    });
    add(
      "correo",
      "Confirmación de preferencias ficticia",
      "media",
      "transitorio",
      1,
      { example: true },
    );
    add("correo", "Invitación optativa ficticia", "baja", "ok", 1, {
      example: true,
      optative: true,
    });
    add("correo", "Dirección errónea de ejemplo", "media", "permanente", 1, {
      example: true,
    });
    add("exportación", "Informe de 350 filas ficticias", "media", "ok", 350, {
      example: true,
    });
    add("correo", "Respuesta incierta del proveedor", "alta", "timeout", 1, {
      example: true,
    });
  }
  function eligible(j) {
    return (
      ["pendiente", "generando", "reintento"].includes(j.state) &&
      j.next <= now &&
      (!paused || j.kind === "exportación")
    );
  }
  function runBatch() {
    const candidates = jobs.filter(eligible);
    const chosen = [];
    let exportTaken = false;
    for (let step = 0; step < 12 && chosen.length < 3; step++) {
      const priority = schedule[round++ % schedule.length];
      const job = candidates.find(
        (j) =>
          j.priority === priority &&
          !chosen.includes(j) &&
          (!exportTaken || j.kind !== "exportación"),
      );
      if (job) {
        chosen.push(job);
        if (job.kind === "exportación") exportTaken = true;
      }
    }
    let processed = 0;
    for (const j of chosen) {
      if (paused && j.kind === "correo") continue;
      processed++;
      if (j.expires <= now) {
        j.state = "muerto";
        j.reason = "Caducó el tiempo máximo; requiere revisión.";
        continue;
      }
      if (j.optative && !marketing) {
        j.state = "suprimido";
        j.reason = "Sin autorización optativa ficticia vigente.";
        continue;
      }
      if (j.kind === "exportación") {
        j.progress = Math.min(j.count, j.progress + 100);
        j.state = j.progress < j.count ? "generando" : "generado";
        j.reason =
          j.state === "generado"
            ? "Generación ficticia finalizada; entrega de ejemplo puesta en cola."
            : "El próximo lote continuará desde este bloque ficticio.";
        if (j.state === "generado")
          add("correo", "Entrega de " + j.id, "media", "ok", 1, {
            parent: j.id,
          });
        continue;
      }
      j.attempts++;
      if (j.scenario === "permanente") {
        j.state = "muerto";
        j.reason =
          "Dirección rechazada de forma permanente. No se reintenta automáticamente.";
        continue;
      }
      if (j.scenario === "timeout") {
        j.state = "conciliar";
        j.reason =
          "No sabemos si el proveedor aceptó. Consultar por clave de idempotencia antes de reenviar.";
        continue;
      }
      if (j.scenario === "cuota") {
        paused = true;
        j.state = j.attempts >= 3 ? "muerto" : "reintento";
        j.next = now + 600;
        j.reason =
          j.attempts >= 3
            ? "Se agotaron 3 intentos por cuota; requiere revisión."
            : "Proveedor pausado por cuota. Las exportaciones pueden continuar.";
        continue;
      }
      if (j.scenario === "transitorio") {
        if (j.attempts >= 3) {
          j.state = "muerto";
          j.reason = "Se agotaron 3 intentos de demostración.";
        } else {
          j.state = "reintento";
          j.next = now + (j.attempts === 1 ? 30 : 120);
          j.reason = "Error temporal; reintento diferido con límite.";
        }
        continue;
      }
      j.state = "aceptado";
      j.reason = "Aceptación simulada; no equivale a entrega al buzón.";
    }
    refresh();
    notify(
      "Lote simulado: " +
        processed +
        " trabajos; máximo 3, una exportación y bloques de 100 filas. No se ejecutó ningún envío.",
    );
    return processed;
  }
  function render() {
    return `<section class="process-panel" aria-label="Procesamiento por lotes"><p class="process-note">SIMULACIÓN · sin correos, archivos ni procesamiento real. Estado solo en memoria de esta pestaña.</p><div class="process-controls"><button data-process="seed">Cargar ejemplos</button><button data-process="batch">Procesar siguiente lote</button><button data-process="time">Avanzar 2 minutos</button><button data-process="quota">Probar error de cuota</button><button data-process="resume" ${paused ? "" : "disabled"}>Reanudar proveedor</button></div><p class="process-meta">Reloj de prueba: +${Math.floor(now / 60)} min · Proveedor ${paused ? "pausado" : "disponible"} · ${jobs.length} trabajos de ejemplo</p><label class="process-check"><input type="checkbox" data-process="marketing" ${marketing ? "checked" : ""}> Suponer una autorización optativa válida de ejemplo (independiente del consentimiento real)</label><p class="process-meta">Alta: acceso urgente · Media: confirmaciones y exportaciones · Baja: invitaciones optativas. La simulación alterna prioridades; no procesa toda la cola de una vez.</p><div class="process-jobs">${
      jobs.length
        ? jobs
            .slice()
            .reverse()
            .map(
              (j) =>
                `<article><div><strong>${escape(j.id)}</strong><span class="process-tag">${escape(j.priority)} · ${escape(j.kind)}</span></div><h3>${escape(j.source)}</h3><p>${escape(labels[j.state])}${j.kind === "exportación" ? " · " + j.progress + "/" + j.count + " filas ficticias" : " · Intentos " + j.attempts + "/3"}</p>${j.state === "reintento" ? `<p>Próximo intento en ${Math.max(0, j.next - now)} segundos de prueba.</p>` : ""}<p>${escape(j.reason || "En espera del siguiente lote.")}</p><div class="process-controls">${j.state === "aceptado" ? `<button data-process="delivered" data-job="${j.id}">Simular confirmación de entrega</button>` : ""}${j.state === "conciliar" ? `<button data-process="reconcile" data-job="${j.id}">Conciliar aceptación ficticia</button>` : ""}${j.state === "muerto" && !j.replayedAs ? `<button data-process="replay" data-job="${j.id}">Crear reintento corregido</button>` : ""}${["pendiente", "generando", "reintento"].includes(j.state) ? `<button data-process="cancel" data-job="${j.id}">Cancelar ejemplo</button>` : ""}</div></article>`,
            )
            .join("")
        : '<div class="process-empty">No hay trabajos. Solicita una exportación desde un listado o carga ejemplos.</div>'
    }</div><p class="process-status" role="status" aria-live="polite"></p></section>`;
  }
  function refresh() {
    const active = document.activeElement;
    const panel = active?.closest("[data-processing-panel]");
    const action = active?.dataset.process;
    const id = active?.dataset.job;
    document
      .querySelectorAll("[data-processing-panel]")
      .forEach((el) => (el.innerHTML = render()));
    if (panel && action) {
      const replacement = [...panel.querySelectorAll("[data-process]")].find(
        (n) =>
          n.dataset.process === action && n.dataset.job === id && !n.disabled,
      );
      (replacement || panel.querySelector("[data-process=batch]")).focus();
    }
  }
  function show(message = "") {
    let dialog = document.getElementById("processing-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "processing-dialog";
      dialog.setAttribute("aria-labelledby", "processing-title");
      document.body.append(dialog);
    }
    dialog.innerHTML =
      '<h2 id="processing-title">Centro de procesamiento · Demostración</h2><p>' +
      escape(message) +
      "</p><div data-processing-panel>" +
      render() +
      '</div><button data-process="close">Cerrar</button>';
    if (!dialog.open) dialog.showModal();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-process]");
    if (!b) return;
    const job = jobs.find((j) => j.id === b.dataset.job);
    switch (b.dataset.process) {
      case "open":
        show();
        break;
      case "close":
        document.getElementById("processing-dialog").close();
        break;
      case "seed":
        seed();
        refresh();
        break;
      case "batch":
        runBatch();
        break;
      case "time":
        now += 120;
        refresh();
        break;
      case "quota":
        add("correo", "Cuota de API ficticia", "media", "cuota", 1, {
          example: true,
        });
        refresh();
        break;
      case "resume":
        paused = false;
        refresh();
        break;
      case "cancel":
        if (job) job.state = "cancelado";
        refresh();
        break;
      case "delivered":
        if (job && job.state === "aceptado") job.state = "entregado";
        refresh();
        break;
      case "reconcile":
        if (job && job.state === "conciliar") job.state = "aceptado";
        refresh();
        break;
      case "replay":
        if (job && job.state === "muerto" && !job.replayedAs)
          job.replayedAs = add(
            job.kind,
            "Revisión de " + job.id,
            job.priority,
            "ok",
            job.count,
            {
              replayOf: job.id,
            },
          ).id;
        refresh();
        break;
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-process=marketing]")) {
      marketing = e.target.checked;
      notify("Supuesto optativo actualizado solo para los ejemplos de cola.");
    }
  });
  document.addEventListener("keydown", (e) => {
    const d = document.getElementById("processing-dialog");
    if (e.key !== "Tab" || !d?.open) return;
    const nodes = [
        ...d.querySelectorAll("button:not([disabled]),input"),
      ].filter((n) => n.getClientRects().length),
      first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  window.ShalomProcessing = {
    requestExport,
    show,
    render,
    runBatch,
    seed,
    snapshot: () => JSON.parse(JSON.stringify({ jobs, now, paused })),
    reset: () => {
      jobs = [];
      sequence = 0;
      now = 0;
      round = 0;
      paused = false;
      marketing = false;
      seeded = false;
      refresh();
    },
  };
})();
