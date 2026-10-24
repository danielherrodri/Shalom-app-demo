/* Las opiniones son efimeras y no se envian. Solo el tema visual se conserva por separado. */
(() => {
  "use strict";
  const services = {
    welcome: ["Recepción y bienvenida", ["Trato", "Información", "Accesibilidad"]],
    parking: ["Estacionamiento", ["Acceso", "Orientación", "Disponibilidad", "Salida"]],
    cafe: ["Cafetería", ["Comida", "Atención", "Tiempo", "Limpieza"]],
    events: ["Eventos y álbumes", ["Organización", "Contenido", "Instalaciones", "Atención"]],
    kids: ["Shalom Kids", ["Comunicación con tutores", "Recepción", "Organización", "Entrega"]],
    courses: ["Cursos y talleres", ["Claridad", "Utilidad", "Trato", "Organización"]],
    advice: ["Asesoramiento", ["Claridad", "Utilidad", "Trato", "Seguimiento"]],
    pastoral: ["Acompañamiento pastoral", ["Trato", "Facilidad de acceso", "Seguimiento"]],
    giving: ["Pagos y aportaciones", ["Facilidad", "Claridad", "Atención"]],
    other: ["Otros ministerios y servicios", ["Atención", "Organización", "Accesibilidad"]]
  };
  const app = document.getElementById("feedback-app");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const options = (values, selected) => values.map(([v,t]) => `<option value="${esc(v)}" ${v===selected?"selected":""}>${esc(t)}</option>`).join("");
  if (!app) return;
  const categories = ["Agradecimiento","Sugerencia","Problema","Solicitud de seguimiento"];
  const statuses = ["Recibido","En revisión","En atención","Resuelto","Cerrado"];
  let records = [], profile = "person", scope = "cafe", filter = "all", message = "";
  let service = new URLSearchParams(location.search).get("service");
  if (!services[service]) service = "welcome";
  const stamp = () => new Date().toLocaleString("es-MX", {timeZone:"America/Mexico_City"});
  const serviceOptions = selected => options(Object.entries(services).map(([id,v])=>[id,v[0]]),selected);
  const canManage = r => profile === "team" && r.service === scope;
  function form() {
    return `<section aria-labelledby="form-title"><h2 id="form-title">Compartir mi experiencia</h2><p>Perfil ficticio: Congregante de ejemplo. Tu opinión queda asociada a este perfil; no es anónima. El responsable autorizado del servicio podrá consultarla.</p><form id="opinion-form"><label for="service">Servicio o actividad</label><select id="service" name="service">${serviceOptions(service)}</select><p id="service-help" class="notice">${service === "kids" ? "Responde como tutor autorizado. No incluyas nombres, fotos ni datos de menores." : service === "pastoral" || service === "advice" ? "Valora el servicio sin incluir detalles privados de la conversación." : "Evita nombres de menores, datos de salud, información bancaria y otros datos sensibles."}</p><label for="context">Actividad o referencia de ejemplo (opcional)</label><input id="context" name="context" maxlength="100" placeholder="Ej. Taller de ejemplo del domingo"><div class="grid"><div><label for="rating">¿Cómo fue tu experiencia? (opcional)</label><select id="rating" name="rating">${options([["","Sin valoración"],["4","Muy buena"],["3","Buena"],["2","Regular"],["1","Mala"]],"")}</select></div><div><label for="category">¿Qué quieres compartir?</label><select id="category" name="category">${options(categories.map(x=>[x,x]),"Sugerencia")}</select></div></div><label for="aspect">Aspecto relacionado (opcional)</label><select id="aspect" name="aspect">${options([["","General"],...services[service][1].map(x=>[x,x])],"")}</select><label for="comment">¿Qué salió bien o qué podemos mejorar?</label><textarea id="comment" name="comment" maxlength="2000"></textarea><p>Comparte una valoración o un comentario. No es obligatorio calificar.</p>${service === "kids" ? '<label><input type="checkbox" name="tutor" required> Soy el tutor autorizado del participante de esta actividad ficticia.</label>' : ''}<label><input type="checkbox" name="contact" id="contact"> Quiero que me contacten</label><div id="contact-fields" hidden><label for="channel">Canal autorizado</label><select id="channel" name="channel" disabled><option value="">Selecciona un canal</option><option>Mensajería de mi cuenta</option><option>Correo autorizado de mi cuenta</option></select><p>No escribas datos de contacto. Se usaría el canal previamente autorizado en tu cuenta.</p></div><p id="form-error" class="error" role="alert"></p><button>Registrar opinión de prueba</button></form><button type="button" id="sensitive" class="secondary">Reportar una situación delicada o de seguridad</button></section>`;
  }
  function card(r) {
    const manage = canManage(r);
    return `<article><h3>${esc(r.id)} · ${esc(services[r.service][0])}</h3><span class="badge">${esc(r.status)}</span><p>${esc(r.created)} · ${esc(r.category)} · ${esc(r.aspect || "General")}</p>${r.context?`<p>Actividad: ${esc(r.context)}</p>`:""}<p>Valoración: ${esc({4:"Muy buena",3:"Buena",2:"Regular",1:"Mala"}[r.rating] || "Sin valoración")}</p><p>${esc(r.comment || "Sin comentario")}</p><p>${r.contact?`Solicita contacto: ${esc(r.channel)} (simulado)`:"No solicita contacto"}</p><p>Responsable: ${esc(r.owner || "Pendiente de asignar")}</p><h4>Respuestas para el remitente</h4>${r.replies.length?r.replies.map(x=>`<p>${esc(x.date)} · ${esc(x.text)}</p>`).join(""):"<p>Aún no hay respuesta.</p>"}${manage?`<form data-update="${esc(r.id)}"><label for="owner-${r.id}">Responsable interno de ejemplo</label><input id="owner-${r.id}" name="owner" maxlength="80" value="${esc(r.owner)}" required><label for="status-${r.id}">Estado</label><select id="status-${r.id}" name="status">${options(statuses.map(x=>[x,x]),r.status)}</select><label for="reply-${r.id}">Respuesta para el remitente (opcional)</label><textarea id="reply-${r.id}" name="reply" maxlength="2000"></textarea><label for="note-${r.id}">Nota interna (opcional; no visible al remitente)</label><textarea id="note-${r.id}" name="note" maxlength="2000"></textarea><button>Guardar seguimiento</button></form><h4>Notas internas</h4>${r.notes.map(x=>`<p>${esc(x.date)} · ${esc(x.text)}</p>`).join("") || "<p>Sin notas internas.</p>"}`:""}${profile === "person" && ["Resuelto","Cerrado"].includes(r.status)?`<button data-reopen="${esc(r.id)}">Aún necesito ayuda</button>`:""}<details><summary>Historial de seguimiento</summary><ul>${r.history.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details></article>`;
  }
  function render() {
    const visible = records.filter(r => profile === "person" ? r.author === "demo-person" : r.service === scope).filter(r=>filter === "all" || r.status === filter);
    const ratings = visible.filter(r=>r.rating);
    const satisfaction = ratings.length ? Math.round(ratings.filter(r=>r.rating>=3).length / ratings.length * 100) + "%" : "Sin valoraciones";
    app.innerHTML = `<p role="status" tabindex="-1" id="message">${esc(message)}</p><section><h2>Explorar perfiles de demostración</h2><label for="profile">Vista</label><select id="profile">${options([["person","Congregante de ejemplo"],["team","Responsable de servicio de ejemplo"]],profile)}</select>${profile === "team"?`<label for="scope">Servicio asignado (simulación)</label><select id="scope">${serviceOptions(scope)}</select><p>Solo se muestran opiniones de este servicio. Cambiar esta selección simula otra asignación; no concede permisos reales.</p>`:""}</section>${profile === "person"?form():""}<section><h2>${profile === "person"?"Mis opiniones":"Tablero del servicio"}</h2><label for="filter">Estado</label><select id="filter">${options([["all","Todos"],...statuses.map(x=>[x,x])],filter)}</select><div class="metrics"><p><strong>${visible.length}</strong>Opiniones en esta vista</p><p><strong>${ratings.length}</strong>Con valoración</p><p><strong>${satisfaction}</strong>Satisfacción entre quienes calificaron</p></div><p>Buena o muy buena entre valoraciones recibidas. No representa a quienes no respondieron. Los tiempos se consultan en el historial; aún no hay métricas agregadas de atención.</p>${visible.map(card).join("") || "<p>Aún no hay opiniones para esta selección.</p>"}</section>`;
  }
  app.addEventListener("change", e => {
    if(e.target.id === "contact") {const box=app.querySelector("#contact-fields"),channel=app.querySelector("#channel");box.hidden=!e.target.checked;channel.disabled=!e.target.checked;channel.required=e.target.checked;return;}
    if(e.target.id === "service") {const f=app.querySelector("#opinion-form");if([...new FormData(f).entries()].some(([k,v])=>["comment","context"].includes(k)&&String(v).trim())&&!confirm("Cambiar de servicio reinicia el formulario. ¿Continuar?")){e.target.value=service;return;}service=e.target.value;}
    else if(e.target.id === "profile") {profile=e.target.value;filter="all";}
    else if(e.target.id === "scope") scope=e.target.value;
    else if(e.target.id === "filter") filter=e.target.value;
    else return;
    message="";render();app.querySelector("#"+e.target.id)?.focus();
  });
  app.addEventListener("submit",e=>{
    e.preventDefault();const f=e.target;if(!f.reportValidity())return;const d=Object.fromEntries(new FormData(f));
    if(f.id === "opinion-form") {
      const comment=String(d.comment||"").trim();
      if(!d.rating&&!comment){app.querySelector("#form-error").textContent="Agrega una valoración o un comentario para continuar.";app.querySelector("#comment").focus();return;}
      if(!services[d.service]||!categories.includes(d.category)||d.rating&&!["1","2","3","4"].includes(d.rating)||d.service==="kids"&&!d.tutor)return;
      const id="OP-"+crypto.randomUUID();
      records.unshift({id,author:"demo-person",service:d.service,context:String(d.context).trim(),category:d.category,aspect:d.aspect,rating:Number(d.rating)||null,comment,contact:!!d.contact,channel:d.contact?d.channel:"",created:stamp(),status:"Recibido",owner:"",replies:[],notes:[],history:[stamp()+" · Opinión recibida (simulación)"]});
      filter="all";message="Gracias por compartir tu opinión. Folio: "+id+". Registrada solo en esta demostración; no fue enviada.";
    } else if(f.dataset.update) {
      const r=records.find(x=>x.id===f.dataset.update);if(!r||!canManage(r)||!statuses.includes(d.status)||!String(d.owner).trim())return;
      const next=statuses.indexOf(r.status)+1;
      if(d.status!==r.status&&statuses.indexOf(d.status)!==next){message="Avanza al siguiente estado del seguimiento, sin omitir etapas.";render();return;}
      r.status=d.status;r.owner=String(d.owner).trim();
      if(String(d.reply).trim())r.replies.push({date:stamp(),text:String(d.reply).trim()});
      if(String(d.note).trim())r.notes.push({date:stamp(),text:String(d.note).trim()});
      r.history.push(stamp()+" · "+r.status+" · Responsable: "+r.owner);message="Seguimiento actualizado en la demostración. No se enviaron mensajes.";
    } else return;
    render();app.querySelector("#message").focus();
  });
  app.addEventListener("click", e=>{
    const reopen=e.target.closest("[data-reopen]");
    if(reopen){const r=records.find(x=>x.id===reopen.dataset.reopen);if(profile!=="person"||!r||r.author!=="demo-person"||!["Resuelto","Cerrado"].includes(r.status))return;r.status="En atención";r.history.push(stamp()+" · El remitente solicita más ayuda");message="Tu opinión vuelve a En atención (simulación).";render();app.querySelector("#message").focus();}
    if(e.target.id === "sensitive") {
      const dialog=document.createElement("dialog");dialog.setAttribute("aria-labelledby","sensitive-title");dialog.innerHTML='<h2 id="sensitive-title">Situación delicada o de seguridad</h2><p>Este prototipo no recibe reportes sensibles. No escribas aquí detalles ni datos de menores.</p><p>Acude al responsable de protección o coordinación de Shalom por un canal institucional conocido. Si existe peligro inmediato, solicita ayuda a los servicios de emergencia locales.</p><p>El canal restringido de recepción está pendiente de configuración. Este aviso no registra ni envía un reporte.</p><form method="dialog"><button>Cerrar</button></form>';document.body.append(dialog);dialog.addEventListener("close",()=>{dialog.remove();app.querySelector("#sensitive")?.focus()},{once:true});dialog.showModal();
    }
  });
  render();
})();
