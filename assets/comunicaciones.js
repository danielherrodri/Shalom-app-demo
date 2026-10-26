/* Prototipo público. Estado efímero: nunca persistir decisiones de privacidad. */
"use strict";
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const categories = ["Generales", "Kids", "Eventos", "Ministerios"];
const audiences = [
  "Público",
  "Congregantes",
  "Familias",
  "Voluntarios",
  "Administración",
];
const ministries = [
  "Todos",
  "Kids",
  "Jóvenes",
  "Hombres",
  "Mujeres",
  "Florece",
  "Raíces",
  "Recupera",
];
const policyVersion = "DEMO-2026-10-v1";
const initialPosts = () => [
  {
    id: "A01",
    title: "Una casa para todos",
    body: "Hay un espacio para ti. Consulta lo que viene, planea tu visita y mantente cerca de la comunidad. Este comunicado es un ejemplo para explorar la app.",
    category: "Generales",
    audience: "Público",
    ministry: "Todos",
    kind: "texto",
    start: "2026-10-01",
    end: "2026-12-31",
    pin: true,
    status: "publicado",
  },
  {
    id: "A02",
    title: "Nos encontramos alrededor de la mesa",
    body: "Un café puede ser el comienzo de una buena conversación. Conoce el prototipo de cafetería y su recorrido de caja, preparación y seguimiento. Actividad ilustrativa, sin convocatoria real.",
    category: "Eventos",
    audience: "Público",
    ministry: "Todos",
    kind: "imagen",
    alt: "Taza de café sobre una mesa, junto a una tableta.",
    start: "2026-10-01",
    end: "2026-12-31",
    pin: false,
    status: "publicado",
  },
  {
    id: "A03",
    title: "Lo que viene en Shalom",
    body: "Prueba la reproducción de un clip local sin sonido. No contiene imágenes de personas ni representa un evento real.",
    category: "Generales",
    audience: "Público",
    ministry: "Todos",
    kind: "video",
    transcript:
      "Clip de demostración. Una casa para todos. Avisos, comunidad y próximos encuentros. Consulta los detalles en este centro de comunicaciones.",
    start: "2026-10-01",
    end: "2026-12-31",
    pin: false,
    status: "publicado",
  },
  {
    id: "A04",
    title: "Acompañamos su crecimiento",
    body: "Ejemplo para familias. Aquí encontrarías información de Kids. Los registros y el sistema real no están conectados a esta pantalla.",
    category: "Kids",
    audience: "Familias",
    ministry: "Kids",
    kind: "texto",
    start: "2026-10-01",
    end: "2026-12-31",
    pin: false,
    status: "publicado",
  },
  {
    id: "A05",
    title: "Antes de servir",
    body: "Mensaje ficticio para el equipo de Jóvenes. La segmentación sirve para probar la experiencia y no protege contenido privado.",
    category: "Ministerios",
    audience: "Voluntarios",
    ministry: "Jóvenes",
    kind: "texto",
    start: "2026-10-28",
    end: "2026-11-02",
    pin: false,
    status: "programado",
  },
  {
    id: "A06",
    title: "Borrador de ejemplo",
    body: "Este texto todavía no aparece en el listado público.",
    category: "Generales",
    audience: "Público",
    ministry: "Todos",
    kind: "texto",
    start: "2026-10-23",
    end: "2026-11-30",
    pin: false,
    status: "borrador",
  },
  {
    id: "A07",
    title: "Comunicado anterior",
    body: "Ejemplo vencido; solo visible en administración.",
    category: "Generales",
    audience: "Público",
    ministry: "Todos",
    kind: "texto",
    start: "2026-09-01",
    end: "2026-09-30",
    pin: false,
    status: "publicado",
  },
];
let posts = initialPosts(),
  clock = "2026-10-23",
  audience = "Público",
  ministry = "Todos",
  category = "Todos",
  search = "",
  viewState = "normal",
  adminFilter = "Todos",
  editing = null;
let prefs = {
    general: false,
    kids: false,
    eventos: false,
    ministerios: false,
    frequency: "semanal",
  },
  images = { internal: false, public: false },
  history = [],
  requests = [],
  seenVersion = null;
let notificationTimer,
  opener = null,
  prefsDirty = false,
  noticePage = 1,
  pageSize = 2,
  adminPage = 1,
  adminSize = 5,
  adminSearch = "",
  adminCategory = "Todos",
  mailSearch = "",
  mailTheme = "Todos",
  mailPage = 1;
const $ = (s) => document.querySelector(s);
const date = (s) =>
  new Date(s + "T12:00:00-06:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Mexico_City",
  });
const stateOf = (p) =>
  p.status === "borrador" || p.status === "archivado"
    ? p.status
    : p.end < clock
      ? "vencido"
      : p.start > clock
        ? "programado"
        : "publicado";
const visiblePosts = () =>
  posts
    .filter(
      (p) =>
        stateOf(p) === "publicado" &&
        (p.audience === "Público" || p.audience === audience) &&
        (p.ministry === "Todos" || p.ministry === ministry),
    )
    .sort(
      (a, b) => Number(b.pin) - Number(a.pin) || b.start.localeCompare(a.start),
    );
const btn = (action, label, id = "", cls = "secondary") =>
  `<button type="button" class="${cls}" data-action="${action}" data-id="${esc(id)}">${label}</button>`;
const options = (values, value) =>
  values
    .map((v) => `<option ${v === value ? "selected" : ""}>${esc(v)}</option>`)
    .join("");
const field = (name, label, value = "", type = "text", attrs = "") =>
  `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
const select = (name, label, values, value) =>
  `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}">${options(values, value)}</select></div>`;
const check = (name, label, value = false) =>
  `<label class="check"><input type="checkbox" name="${name}" ${value ? "checked" : ""}><span>${label}</span></label>`;
const heading = (over, title, lead) =>
  `<header class="page-heading"><div><p class="overline">${over}</p><h1>${title}</h1><p class="lead">${lead}</p></div></header>`;
function rolDemo() {
  try {
    const s = JSON.parse(localStorage.getItem("shalom-demo-v03") || "{}");
    return s && s.session ? s.role : null;
  } catch (e) {
    return null;
  }
}
function say(message) {
  $("#status").textContent = message;
  clearTimeout(notificationTimer);
  notificationTimer = setTimeout(() => ($("#status").textContent = ""), 6000);
}
function record(message) {
  history.unshift({ message, clock, version: policyVersion });
}
function open(title, html) {
  opener = document.activeElement;
  $("#dialog-content").innerHTML =
    `<h2 id="dialog-title">${esc(title)}</h2>${html}`;
  $("#dialog").showModal();
}
function close() {
  const media = $("#dialog video");
  if (media) {
    media.pause();
    media.removeAttribute("src");
    media.load();
  }
  $("#dialog").close();
  $("#dialog-content").innerHTML = "";
  if (opener?.isConnected) opener.focus();
}
function postCard(p) {
  return `<article class="card ${p.pin ? "featured" : ""}">${p.kind === "imagen" ? `<img class="photo" src="assets/coffee-pexels-7241331.jpg" alt="${esc(p.alt)}" loading="lazy" width="1200" height="1800"><div class="photo-caption">Fotografía de referencia con licencia Pexels · No es una foto de Shalom</div>` : p.kind === "video" ? `<div class="video-poster"><span><span class="overline">COMUNIDAD SHALOM</span><br>Una casa para todos.</span><span class="play" aria-hidden="true">▷</span></div>` : ""}<div class="card-body"><div class="meta"><span>${esc(p.category)}</span>${p.pin ? "<span>Fijado</span>" : ""}<time datetime="${p.start}">${date(p.start)}</time></div><h2>${esc(p.title)}</h2><p>${esc(p.body)}</p><p class="small">Vigente hasta ${date(p.end)} · ${esc(p.audience)}${p.ministry !== "Todos" ? " · " + esc(p.ministry) : ""}</p>${p.kind === "video" ? btn("video", "Ver video de ejemplo", p.id) : ""}${p.kind === "imagen" ? '<a href="cafeteria.html" class="button secondary">Conocer la cafetería →</a>' : ""}</div></article>`;
}
function filteredPosts() {
  return viewState === "vacío"
    ? []
    : visiblePosts().filter(
        (p) =>
          (category === "Todos" || p.category === category) &&
          (p.title + " " + p.body).toLowerCase().includes(search.toLowerCase()),
      );
}
function filteredAdmin() {
  return posts.filter(
    (p) =>
      (adminFilter === "Todos" || stateOf(p) === adminFilter) &&
      (adminCategory === "Todos" || p.category === adminCategory) &&
      (p.title + " " + p.body + " " + p.audience + " " + p.ministry)
        .toLowerCase()
        .includes(adminSearch.toLowerCase()),
  );
}
function pager(total, page, size, scope) {
  const pages = Math.max(1, Math.ceil(total / size));
  return `<div class="pagination" aria-label="Paginación de ${scope}"><span role="status">${total} resultado${total === 1 ? "" : "s"} · Página ${page} de ${pages}</span><div class="row"><button data-action="page-${scope}" data-id="${page - 1}" ${page === 1 ? "disabled" : ""}>Anterior</button><button data-action="page-${scope}" data-id="${page + 1}" ${page >= pages ? "disabled" : ""}>Siguiente</button></div></div>`;
}
function results() {
  if (viewState === "carga")
    return (
      '<div class="empty" role="status" aria-live="polite"><h2>Cargando avisos de ejemplo…</h2><p>Estado de carga simulado.</p>' +
      btn("state", "Mostrar resultados", "normal") +
      "</div>"
    );
  if (viewState === "error")
    return (
      '<div class="empty"><h2>No pudimos mostrar los avisos</h2><p role="alert">Es un error de prueba. Puedes volver a intentar.</p>' +
      btn("state", "Reintentar", "normal") +
      "</div>"
    );
  const list = filteredPosts();
  noticePage = Math.min(
    noticePage,
    Math.max(1, Math.ceil(list.length / pageSize)),
  );
  return (
    '<div class="cards">' +
    (list
      .slice((noticePage - 1) * pageSize, noticePage * pageSize)
      .map(postCard)
      .join("") ||
      '<div class="empty"><h2>No hay avisos para esta selección</h2><p>Prueba otra categoría o vuelve a ver todos.</p>' +
        btn("clear", "Limpiar filtros") +
        "</div>") +
    "</div>" +
    pager(list.length, noticePage, pageSize, "avisos")
  );
}
function requestCSV(scope) {
  if (scope === "avisos" && viewState !== "normal") {
    say("Vuelve al estado normal para solicitar resultados.");
    return;
  }
  const list = scope === "admin" ? filteredAdmin() : filteredPosts();
  window.ShalomProcessing.requestExport({
    source:
      scope === "admin"
        ? "Avisos de administración ficticia"
        : "Avisos de experiencia " + audience,
    count: list.length,
    filters: {
      search: scope === "admin" ? adminSearch : search,
      category: scope === "admin" ? adminCategory : category,
      audience,
      ministry,
      status: scope === "admin" ? adminFilter : "publicado",
      clock,
      ids: list.map((p) => p.id),
    },
  });
}
function renderProcessing() {
  return (
    heading(
      "OPERACIÓN EN SEGUNDO PLANO",
      "Cada trabajo, a su ritmo.",
      "Solicitudes de exportación y correos por prioridades, lotes y reintentos. Esta pantalla solo representa el comportamiento futuro.",
    ) +
    '<p><a href="docs/pipelines-releases-v07.md">Arquitectura, límites y releases →</a></p><div data-processing-panel>' +
    window.ShalomProcessing.render() +
    "</div>"
  );
}
function renderNotices() {
  return (
    heading(
      "VIDA EN COMUNIDAD",
      "Cerca de lo que importa.",
      "Avisos y próximos encuentros. Un lugar para enterarte, participar y acompañarnos.",
    ) +
    `<div class="split"><section aria-label="Listado de avisos"><div class="toolbar"><div class="field"><label for="search">Buscar un aviso</label><input type="search" id="search" value="${esc(search)}" placeholder="Escribe una palabra" maxlength="90"></div>${select("category", "Categoría", ["Todos", ...categories], category)}</div><div class="row list-actions"><details class="filtros"${pageSize !== 2 ? " open" : ""}><summary class="button secondary">Filtros</summary>${select("page-size", "Avisos por página", ["2", "5", "10"], String(pageSize))}</details>${btn("csv", "Solicitar CSV por correo", "avisos")}</div><div id="results">${results()}</div></section><aside aria-label="Tu experiencia"><section class="panel quiet-panel"><p class="overline">A TU RITMO</p><h2>Tú eliges cómo recibirnos.</h2><p class="small">Consultar avisos públicos no te suscribe a correos. Elige solo los temas que te interesan.</p><a href="#preferencias" class="button secondary">Elegir preferencias →</a></section><section class="panel"><p class="overline">EXPLORAR LA DEMO</p><h2>Una vista para cada persona</h2>${select("audience", "Experiencia simulada", audiences, audience)}${select("ministry", "Ministerio de prueba", ministries, ministry)}<p class="small">El listado público solo muestra contenido público. Las otras vistas son ejemplos abiertos: no existe control de acceso real.</p><p class="small">Fecha de prueba: <strong>${date(clock)}</strong></p><a href="#admin">Administrar y probar programación</a></section></aside></div><details class="state-controls"><summary>Probar carga, vacío y error</summary><div class="row">${["normal", "carga", "vacío", "error"].map((s) => btn("state", s[0].toUpperCase() + s.slice(1), s)).join("")}</div></details>`
  );
}
function renderPreferences() {
  return (
    heading(
      "COMUNICACIONES",
      "A tu manera.",
      "Puedes seguir en comunidad sin recibir todos los correos. Tus elecciones son independientes y puedes cambiarlas.",
    ) +
    `<div class="split"><section class="panel"><form id="preferences"><div id="pref-error" role="alert"></div><fieldset><legend>Correos optativos</legend><p class="small">Ninguna opción está activada de antemano. No necesitas aceptarlas para consultar la app.</p>${check("general", "Avisos generales · noticias de la congregación", prefs.general)}${check("kids", "Kids · novedades para familias", prefs.kids)}${check("eventos", "Eventos · invitaciones y recordatorios promocionales", prefs.eventos)}${check("ministerios", "Ministerios · actividades y convocatorias", prefs.ministerios)}</fieldset>${select("frequency", "Frecuencia preferida", ["semanal", "por publicación"], prefs.frequency)}<p class="help">La frecuencia es una preferencia ilustrativa; esta demo no tiene servicio de correo.</p><fieldset><legend>Tu decisión explícita</legend>${check("confirm", "Entiendo el aviso " + policyVersion + " y deseo recibir únicamente los temas optativos seleccionados.")}<p class="help">Para activar o ampliar temas, confirma esta decisión. Para darte de baja no se exige marcarla.</p></fieldset><div class="savebar"><button type="submit">Aplicar en esta demo</button>${btn("revoke", "Revocar todos los optativos", "", "danger")}<span id="dirty" class="small">Sin cambios pendientes.</span></div></form></section><aside><section class="panel quiet-panel"><p class="overline">SEPARADOS DE LAS INVITACIONES</p><h2>Correos transaccionales esenciales</h2><a href="#correos">Ver plantillas de ejemplo →</a><p class="small">En producción: recuperación de acceso, confirmación de una acción solicitada o recibo de un pedido. No incluirían publicidad ni dependerían de aceptar invitaciones.</p><p class="small">Solo se generarían por una acción o servicio necesario. No son una autorización general para enviar mensajes. Aquí no se envía ninguno.</p></section><section class="panel"><h2>Tu control permanece</h2><p class="small">Revocar no limita tu acceso a la app. Las decisiones sobre imágenes de menores se revisan por separado.</p><a href="#privacidad">Ir al centro de privacidad →</a></section></aside></div>`
  );
}
function renderPrivacy() {
  return (
    heading(
      "TU INFORMACIÓN",
      "Con claridad y cuidado.",
      "Conoce qué se propone, revisa tus decisiones y prueba cómo solicitar ayuda con tus datos.",
    ) +
    `<div class="split"><div><section class="panel"><p class="overline">AVISO DE PRIVACIDAD · BORRADOR</p><h2>Versión ${policyVersion}</h2><p class="small">23 de octubre de 2026 · Texto ilustrativo, no es un aviso legal operativo ni acredita cumplimiento.</p><p>Este prototipo público no verifica tu identidad, no recoge consentimientos válidos y no tramita solicitudes. Las elecciones de este módulo viven solo en memoria hasta recargar.</p><details open><summary>Qué ocurre en esta demo</summary><p>Solo usamos ejemplos. No escribas nombres, correos, fotografías ni datos de menores. Este módulo no manda formularios a un servidor y no envía correo. El resto del prototipo anterior guarda datos ficticios en localStorage. GitHub Pages, como alojamiento, puede recibir datos técnicos de la visita conforme a sus propias condiciones. La tipografía, imagen y video de este módulo se sirven localmente, sin reproductores externos.</p></details><details><summary>Qué deberá definir el aviso de producción</summary><p>[Responsable y domicilio], [contacto de privacidad], datos y finalidades por servicio, fundamento y bases aplicables, proveedores y transferencias, conservación, derechos y procedimiento, medidas organizativas y técnicas y cómo se notificarán cambios. Requiere revisión profesional según la operación y jurisdicción; no se presume cumplimiento.</p></details><details><summary>Versiones y cambios</summary><p>${policyVersion}: borrador inicial del prototipo. DEMO-2026-09-v0: referencia histórica ficticia sin efectos. Una nueva finalidad requerirá una nueva decisión explícita; consultar o reconocer el aviso no equivale a aceptar comunicaciones ni imágenes.</p></details><div class="row">${btn("read-policy", "Marcar como leído en la demo")}<a href="docs/aviso-privacidad-DEMO.md" download>Descargar borrador editable</a></div><p id="read-state" class="small">${seenVersion ? "Leído en esta sesión: " + esc(seenVersion) : "Sin lectura marcada en esta sesión."}</p></section><section class="panel"><p class="overline">AUTORIZACIONES INDEPENDIENTES</p><h2>Imágenes de menores</h2><p class="small">Solo el perfil ficticio «Menor de ejemplo A». No se pide nombre, foto ni firma. En producción se verificaría quién tiene facultad para autorizar, el evento, el plazo y cada finalidad.</p><form id="images"><fieldset><legend>Finalidades de ejemplo</legend>${check("internal", "Uso interno · identificación para la actividad ficticia", images.internal)}${check("public", "Difusión pública · web y redes del evento ficticio", images.public)}</fieldset><p class="small">No autorizar difusión no impide participar. La autorización interna tampoco autoriza publicar. Ninguna elección se vincula con los correos optativos.</p>${check("guardian", "En este escenario ficticio, represento al tutor autorizado y confirmo solo las finalidades seleccionadas.")}<div id="image-error" role="alert"></div><div class="savebar"><button type="submit">Aplicar autorización de ejemplo</button>${btn("revoke-images", "Revocar ambas finalidades", "", "danger")}</div></form><p class="help">No se produce una autorización real. Retirar una autorización de difusión en producción requeriría detener usos futuros y tramitar la retirada según alcance, canales y obligaciones aplicables; no promete borrar copias de terceros.</p></section></div><aside><section class="panel quiet-panel"><p class="overline">SOLICITUDES SIMULADAS</p><h2>Tu información, tus preguntas.</h2><p class="small">Prueba el flujo sin enviar una solicitud. No hay responsables recibiéndola, plazos comprometidos ni eliminación automática.</p><div class="row">${btn("request", "Solicitar exportación", "exportación")}${btn("request", "Solicitar eliminación", "eliminación", "danger")}</div><div id="requests">${requestList()}</div></section><section class="panel"><h2>Decisiones de esta sesión</h2><p class="small">Historial ficticio; no es una bitácora de auditoría válida. Desaparece al recargar.</p><ul class="history">${history.length ? history.map((h) => `<li>${esc(h.message)}<br>${date(h.clock)} · ${esc(h.version)}</li>`).join("") : "<li>Todavía no has probado ninguna decisión.</li>"}</ul><a href="#preferencias">Revisar comunicaciones →</a></section></aside></div>`
  );
}
function requestList() {
  return requests
    .map(
      (r) =>
        `<p class="notice"><strong>${esc(r.id)} · ${esc(r.type)}</strong><br>Solicitud simulada · Sin enviar<br>No se han exportado ni eliminado datos reales.</p>`,
    )
    .join("");
}
function adminResults() {
  const list = filteredAdmin();
  adminPage = Math.min(
    adminPage,
    Math.max(1, Math.ceil(list.length / adminSize)),
  );
  return `<section class="panel" aria-label="Publicaciones de ejemplo">${
    list.length
      ? list
          .slice((adminPage - 1) * adminSize, adminPage * adminSize)
          .map(
            (p) =>
              `<article class="admin-item"><div><div class="meta">${esc(stateOf(p))}${p.pin ? " · Fijado" : ""} · ${esc(p.kind)}</div><h2>${esc(p.title)}</h2><p class="small">${esc(p.category)} · ${esc(p.audience)} · ${esc(p.ministry)}<br>${date(p.start)} a ${date(p.end)}</p></div><div class="row">${btn("edit", "Editar", p.id)}${btn("preview", "Vista previa", p.id)}${p.status === "archivado" ? btn("restore", "Restaurar borrador", p.id) : btn("archive", "Archivar", p.id)}</div></article>`,
          )
          .join("")
      : '<div class="empty"><h2>Sin publicaciones en esta selección</h2><p>Crea un aviso o cambia los filtros.</p></div>'
  }</section>${pager(list.length, adminPage, adminSize, "admin")}`;
}
function renderAdmin() {
  return (
    heading(
      "GESTIÓN DE COMUNICACIONES",
      "Un mensaje, bien cuidado.",
      "Crea, revisa y programa ejemplos. Todo ocurre en esta pestaña; no se publica contenido ni se envían mensajes desde este formulario.",
    ) +
    `<section class="panel quiet-panel"><div class="form-grid">${field("clock", "Fecha simulada · Ciudad de México", clock, "date", 'required min="2026-01-01" max="2030-12-31"')}<div><p class="small">La vigencia incluye el día final. Cambia la fecha para probar publicaciones programadas y vencidas. No hay tarea automática en segundo plano.</p>${btn("new", "Crear aviso", "", "")}</div></div><p class="small">Cualquier visitante puede abrir esta administración de prueba. No contiene información privada.</p></section><div class="toolbar">${field("admin-search", "Buscar por texto, audiencia o ministerio", adminSearch, "search", 'maxlength="90"')}${select("admin-category", "Categoría", ["Todos", ...categories], adminCategory)}</div><div class="chips" aria-label="Filtrar estado">${["Todos", "borrador", "programado", "publicado", "vencido", "archivado"].map((s) => `<button data-action="admin-filter" data-id="${s}" aria-pressed="${s === adminFilter}">${s[0].toUpperCase() + s.slice(1)}</button>`).join("")}</div><div class="row list-actions">${select("admin-size", "Avisos por página", ["2", "5", "10"], String(adminSize))}${btn("csv", "Solicitar CSV por correo", "admin")}</div><div id="admin-results">${adminResults()}</div><p class="small">La solicitud incluye todos los resultados filtrados, de todas las páginas. Su entrega sería por correo. Para comprobar segmentación, usa las experiencias de prueba en <a href="#avisos">Avisos</a>. Una publicación nunca concede suscripción por correo.</p>`
  );
}
function filteredEmails() {
  return (window.ShalomEmailCatalog || []).filter(
    (e) =>
      (mailTheme === "Todos" || e.theme === mailTheme) &&
      (e.subject + " " + e.type)
        .toLowerCase()
        .includes(mailSearch.toLowerCase()),
  );
}
function emailResults() {
  const list = filteredEmails();
  mailPage = Math.min(mailPage, Math.max(1, Math.ceil(list.length / 4)));
  return (
    '<div class="email-grid">' +
    (list
      .slice((mailPage - 1) * 4, mailPage * 4)
      .map(
        (e) =>
          `<article class="panel"><div class="meta">${esc(e.theme)} · ${esc(e.type)}</div><h2>${esc(e.subject)}</h2><p class="small">${esc(e.title)}</p><div class="row">${btn("email-preview", "Vista previa", e.id)}<a href="emails/${e.id}.html" download class="button secondary">Descargar HTML</a><a href="emails/${e.id}.txt" download>Texto plano</a></div></article>`,
      )
      .join("") ||
      '<div class="empty"><h2>Sin plantillas para esta selección</h2><p>Cambia la búsqueda o el tema.</p></div>') +
    "</div>" +
    pager(list.length, mailPage, 4, "correos")
  );
}
function renderEmails() {
  return (
    heading(
      "UNA MISMA FAMILIA",
      "Mensajes que se sienten de casa.",
      "Plantillas editables inspiradas en el HTML que compartiste. Shalom conserva Noche, Crema y cobre; Kids usa blanco, fuego y oro.",
    ) +
    `<section class="panel quiet-panel"><p>Esta galería no envía correos ni valida destinatarios. Los campos entre corchetes quedan pendientes. Los enlaces abren demostraciones.</p><p class="small">Los correos optativos incluyen preferencias y baja de ejemplo; los transaccionales explican su relación con una acción solicitada. La baja real de un clic requiere backend y proveedor de correo.</p><a href="docs/plantillas-correo-v06.md">Guía de edición y compatibilidad →</a></section><div class="toolbar">${field("mail-search", "Buscar plantilla o tipo", mailSearch, "search", 'maxlength="90"')}${select("mail-theme", "Temática", ["Todos", "Shalom", "Kids"], mailTheme)}</div><div class="row list-actions">${btn("csv-emails", "Solicitar catálogo por correo")}<a href="#admin">Volver a administración</a></div><div id="email-results">${emailResults()}</div>`
  );
}
function editPost(id) {
  editing = id || null;
  const p = posts.find((p) => p.id === id) || {
    title: "",
    body: "",
    category: "Generales",
    audience: "Público",
    ministry: "Todos",
    kind: "texto",
    start: clock,
    end: clock,
    pin: false,
    status: "borrador",
    alt: "",
    transcript: "",
  };
  open(
    id ? "Editar aviso de ejemplo" : "Crear aviso de ejemplo",
    `<p class="small">Usa texto ficticio. No se cargan archivos personales ni enlaces externos. La biblioteca contiene una foto con licencia y un clip tipográfico local.</p><form id="post-form"><div id="post-error" role="alert"></div><div class="form-grid">${field("title", "Título", p.title, "text", 'required maxlength="90"')} ${select("kind", "Formato", ["texto", "imagen", "video"], p.kind)}<div class="field full"><label for="body">Mensaje</label><textarea id="body" name="body" required maxlength="800">${esc(p.body)}</textarea></div>${select("post-category", "Categoría", categories, p.category)}${select("post-audience", "Audiencia", audiences, p.audience)}${select("post-ministry", "Ministerio", ministries, p.ministry)}${select("post-status", "Estado", ["borrador", "publicado", "programado"], p.status === "archivado" ? "borrador" : p.status)}${field("start", "Inicio de vigencia", p.start, "date", 'required min="2026-01-01" max="2030-12-31"')}${field("end", "Fin de vigencia · incluido", p.end, "date", 'required min="2026-01-01" max="2030-12-31"')}<div class="field full"><label for="alt">Descripción de imagen</label><input id="alt" name="alt" value="${esc(p.alt)}" maxlength="180"><p class="help">Obligatoria al elegir imagen. Se usará la fotografía de referencia de café, sin personas.</p></div><div class="field full"><label for="transcript">Transcripción o alternativa del video</label><textarea id="transcript" name="transcript" maxlength="1000">${esc(p.transcript)}</textarea><p class="help">Obligatoria al elegir video. Se usará el clip tipográfico local, sin audio.</p></div></div>${check("pin", "Fijar este aviso sobre los demás", p.pin)}${check("rights", "Confirmo que este ejemplo utiliza solo la biblioteca de referencia autorizada.")}<div class="savebar"><button type="submit">Guardar ejemplo</button>${btn("close", "Cancelar")}</div></form>`,
  );
}
function showVideo(id) {
  const p = posts.find((p) => p.id === id);
  if (!p) return;
  open(
    "Video · " + p.title,
    `<video controls playsinline preload="none" poster="assets/video-poster.svg" aria-label="Clip tipográfico de demostración"><source src="assets/aviso-demo.webm" type="video/webm"><track kind="captions" src="assets/aviso-demo.vtt" srclang="es" label="Español" default>Tu navegador no puede reproducir este video.</video><p class="small">Clip local sin audio. No utiliza reproductores de terceros ni se reproduce automáticamente.</p><h3>Transcripción</h3><p>${esc(p.transcript)}</p>`,
  );
}
function route() {
  const r = location.hash.slice(1);
  return [
    "avisos",
    "preferencias",
    "privacidad",
    "admin",
    "correos",
    "procesamiento",
  ].includes(r)
    ? r
    : "avisos";
}
function render(focus = false) {
  const r = route();
  $("#main").innerHTML = {
    avisos: renderNotices,
    preferencias: renderPreferences,
    privacidad: renderPrivacy,
    admin: renderAdmin,
    correos: renderEmails,
    procesamiento: renderProcessing,
  }[r]();
  document.querySelectorAll("[data-route]").forEach((a) => {
    if (a.dataset.route === r) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  // Las herramientas de administración no se muestran a las familias (manual 2026, pág. 14):
  // solo con la sesión de prueba de administración, o cuando ya se está en esa ruta.
  const esAdmin = rolDemo() === "admin" || r === "admin" || r === "procesamiento";
  document.querySelectorAll('.sidebar-end [data-route="admin"], .sidebar-end [data-route="procesamiento"]').forEach((a) => {
    a.hidden = !esAdmin;
  });
  document.title =
    {
      avisos: "Avisos",
      preferencias: "Preferencias",
      privacidad: "Privacidad",
      admin: "Administración demo",
      correos: "Plantillas de correo",
      procesamiento: "Procesamiento demo",
    }[r] + " · Shalom v0.7";
  if (focus) $("#main").focus();
  prefsDirty = false;
}
function showError(selector, message) {
  $(selector).innerHTML = `<p class="error" tabindex="-1">${esc(message)}</p>`;
  $(selector + " .error").focus();
}
function confirmRequest(type) {
  open(
    "Solicitud de " + type + " · Simulación",
    `<p>No enviaremos datos ni una solicitud real. Este paso solo crea un folio ficticio en la memoria de esta pestaña.</p><p class="small">En producción requeriría verificar identidad y facultades, revisar alcance y conservación y permitir seguimiento. Eliminar una cuenta no equivale a borrar automáticamente todos los registros.</p>${btn("confirm-request", "Crear solicitud simulada", type, "")}`,
  );
}
$("#dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  close();
});
window.addEventListener("hashchange", () => {
  if ($("#dialog").open) close();
  render(true);
  window.scrollTo(0, 0);
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const id = b.dataset.id;
  switch (b.dataset.action) {
    case "theme":
      window.ShalomTheme.toggle();
      break;
    case "close":
      close();
      break;
    case "clear":
      category = "Todos";
      search = "";
      noticePage = 1;
      viewState = "normal";
      render();
      say("Filtros restablecidos.");
      break;
    case "state":
      viewState = id;
      $("#results").innerHTML = results();
      say("Estado de prueba: " + id);
      break;
    case "new":
      editPost();
      break;
    case "edit":
      editPost(id);
      break;
    case "preview": {
      const p = posts.find((p) => p.id === id);
      if (p) open("Vista previa · " + stateOf(p), postCard(p));
      break;
    }
    case "video":
      if ($("#dialog").open) close();
      showVideo(id);
      break;
    case "admin-filter":
      adminFilter = id;
      adminPage = 1;
      render();
      break;
    case "page-avisos":
      noticePage = Math.max(1, Number(id));
      $("#results").innerHTML = results();
      $("#results").scrollIntoView({ block: "start" });
      $("#results").setAttribute("tabindex", "-1");
      $("#results").focus();
      break;
    case "page-admin":
      adminPage = Math.max(1, Number(id));
      $("#admin-results").innerHTML = adminResults();
      $("#admin-results").setAttribute("tabindex", "-1");
      $("#admin-results").focus();
      break;
    case "csv":
      requestCSV(id);
      break;
    case "page-correos":
      mailPage = Math.max(1, Number(id));
      $("#email-results").innerHTML = emailResults();
      $("#email-results").setAttribute("tabindex", "-1");
      $("#email-results").focus();
      break;
    case "email-preview": {
      const item = window.ShalomEmailCatalog.find((x) => x.id === id);
      if (item)
        open(
          item.subject,
          `<p class="small">Vista de navegador. Los clientes de correo pueden variar; no hay envío.</p><iframe class="email-frame" sandbox="" src="emails/${item.id}.html" title="Vista previa de ${esc(item.subject)}"></iframe><p><a href="emails/${item.id}.html" target="_blank" rel="noopener">Abrir plantilla completa</a> · <a href="emails/${item.id}.html" download>Descargar HTML</a></p>`,
        );
      break;
    }
    case "csv-emails": {
      window.ShalomProcessing.requestExport({
        source: "Catálogo ficticio de plantillas",
        count: filteredEmails().length,
        filters: { search: mailSearch, theme: mailTheme },
      });
      break;
    }
    case "archive":
      posts.find((p) => p.id === id).status = "archivado";
      render();
      say("Archivado solo en esta pestaña.");
      break;
    case "restore":
      posts.find((p) => p.id === id).status = "borrador";
      render();
      say("Restaurado como borrador.");
      break;
    case "revoke":
      prefs = {
        ...prefs,
        general: false,
        kids: false,
        eventos: false,
        ministerios: false,
      };
      record("Revocación simulada de todos los correos optativos");
      render();
      say(
        "Optativos desactivados en esta demo. No se envió ninguna baja real.",
      );
      break;
    case "revoke-images":
      images = { internal: false, public: false };
      record("Revocación simulada de ambas finalidades de imagen");
      render();
      say("Finalidades desactivadas solo en esta sesión.");
      break;
    case "read-policy":
      seenVersion = policyVersion;
      record("Lectura marcada; no constituye consentimiento");
      render();
      say("Lectura marcada en la demo.");
      break;
    case "request":
      confirmRequest(id);
      break;
    case "confirm-request":
      requests.unshift({
        id: "DEMO-" + String(requests.length + 1).padStart(3, "0"),
        type: id,
      });
      record("Solicitud de " + id + " simulada, sin enviar");
      close();
      render();
      say(
        "Solicitud simulada creada. Ningún dato real fue exportado o eliminado.",
      );
      if (id === "exportación")
        window.ShalomProcessing.requestExport({
          source: "Solicitud de privacidad ficticia",
          count: 1,
        });
      break;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    search = e.target.value;
    noticePage = 1;
    $("#results").innerHTML = results();
  }
  if (e.target.id === "mail-search") {
    mailSearch = e.target.value;
    mailPage = 1;
    $("#email-results").innerHTML = emailResults();
  }
  if (e.target.id === "admin-search") {
    adminSearch = e.target.value;
    adminPage = 1;
    $("#admin-results").innerHTML = adminResults();
  }
  if (e.target.closest("#preferences")) {
    prefsDirty = true;
    $("#dirty").textContent = "Cambios pendientes de aplicar.";
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  switch (t.id) {
    case "mail-theme":
      mailTheme = t.value;
      mailPage = 1;
      $("#email-results").innerHTML = emailResults();
      break;
    case "page-size":
      pageSize = Number(t.value);
      noticePage = 1;
      $("#results").innerHTML = results();
      break;
    case "admin-size":
      adminSize = Number(t.value);
      adminPage = 1;
      $("#admin-results").innerHTML = adminResults();
      break;
    case "admin-category":
      adminCategory = t.value;
      adminPage = 1;
      $("#admin-results").innerHTML = adminResults();
      break;
    case "category":
      category = t.value;
      noticePage = 1;
      $("#results").innerHTML = results();
      break;
    case "audience":
      audience = t.value;
      noticePage = 1;
      $("#results").innerHTML = results();
      say("Experiencia simulada: " + audience);
      break;
    case "ministry":
      ministry = t.value;
      noticePage = 1;
      $("#results").innerHTML = results();
      break;
    case "clock":
      if (t.checkValidity() && t.value) {
        clock = t.value;
        render();
        say("Fecha de prueba actualizada.");
      }
      break;
  }
});
document.addEventListener("submit", (e) => {
  const f = e.target;
  if (!["preferences", "images", "post-form"].includes(f.id)) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (f.id === "preferences") {
    const next = {
      general: !!d.general,
      kids: !!d.kids,
      eventos: !!d.eventos,
      ministerios: !!d.ministerios,
      frequency: d.frequency,
    };
    const expanding = ["general", "kids", "eventos", "ministerios"].some(
      (k) => next[k] && !prefs[k],
    );
    if (expanding && !d.confirm) {
      showError(
        "#pref-error",
        "Para activar nuevos temas, confirma la decisión explícita. Puedes desactivar temas sin marcarla.",
      );
      return;
    }
    prefs = next;
    record(
      "Cambio simulado de preferencias: " +
        ["general", "kids", "eventos", "ministerios"]
          .filter((k) => prefs[k])
          .join(", ") +
        "; frecuencia " +
        prefs.frequency,
    );
    render();
    say("Preferencias aplicadas solo en memoria. No se envían correos.");
    return;
  }
  if (f.id === "images") {
    const next = { internal: !!d.internal, public: !!d.public };
    if (
      ((next.internal && !images.internal) ||
        (next.public && !images.public)) &&
      !d.guardian
    ) {
      showError(
        "#image-error",
        "Confirma el escenario de tutor antes de autorizar una nueva finalidad. La revocación no requiere confirmarlo.",
      );
      return;
    }
    images = next;
    record(
      "Imagen de ejemplo: uso interno " +
        (images.internal ? "autorizado" : "no autorizado") +
        "; difusión pública " +
        (images.public ? "autorizada" : "no autorizada"),
    );
    render();
    say("Decisión ficticia aplicada; no se almacenó una autorización real.");
    return;
  }
  const fail = (message) => showError("#post-error", message);
  if (!d.title.trim() || !d.body.trim())
    return fail("Escribe un título y mensaje, sin dejar solo espacios.");
  if (d.end < d.start)
    return fail("El fin de vigencia debe ser igual o posterior al inicio.");
  if (d["post-status"] === "programado" && d.start <= clock)
    return fail(
      "Para programar, elige un inicio posterior a la fecha de prueba.",
    );
  if (d["post-status"] === "publicado" && (d.start > clock || d.end < clock))
    return fail(
      "Para publicar ahora, la fecha de prueba debe estar dentro de la vigencia.",
    );
  if (d.kind === "imagen" && !d.alt.trim())
    return fail("Describe la imagen para quien no pueda verla.");
  if (d.kind === "video" && !d.transcript.trim())
    return fail("Incluye una transcripción del video.");
  if (d.kind !== "texto" && !d.rights)
    return fail("Confirma el uso de la biblioteca de referencia autorizada.");
  const p = {
    id: editing || "A" + String(posts.length + 1).padStart(2, "0"),
    title: d.title.trim(),
    body: d.body.trim(),
    category: d["post-category"],
    audience: d["post-audience"],
    ministry: d["post-ministry"],
    kind: d.kind,
    start: d.start,
    end: d.end,
    pin: !!d.pin,
    status: d["post-status"],
    alt: d.alt.trim(),
    transcript: d.transcript.trim(),
  };
  if (editing) posts = posts.map((x) => (x.id === editing ? p : x));
  else posts.unshift(p);
  close();
  adminFilter = "Todos";
  render();
  say(
    "Aviso guardado solo en esta pestaña. No se publicó en GitHub ni se enviaron correos.",
  );
});
// Solo se conserva el tema visual; preferencias y consentimientos siguen en memoria.
window.ShalomTheme.apply();
render();

// El ciclo de Tab permanece dentro del diálogo, incluso en el límite del navegador.
document.addEventListener("keydown", (e) => {
  if (e.key !== "Tab" || !$("#dialog").open) return;
  const nodes = [
    ...$("#dialog").querySelectorAll(
      'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),video[controls],[tabindex="0"]',
    ),
  ].filter((n) => n.getClientRects().length);
  if (!nodes.length) {
    e.preventDefault();
    return;
  }
  const first = nodes[0],
    last = nodes.at(-1);
  if (
    e.shiftKey &&
    (document.activeElement === first ||
      !$("#dialog").contains(document.activeElement))
  ) {
    e.preventDefault();
    last.focus();
  } else if (
    !e.shiftKey &&
    (document.activeElement === last ||
      !$("#dialog").contains(document.activeElement))
  ) {
    e.preventDefault();
    first.focus();
  }
});
