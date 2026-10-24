/* Interacciones locales: no envía inscripciones ni avisos a la iglesia. */
function familyEventOpen(id) {
  if (!state.session) { state.redirectAfterLogin='events'; goto('login'); return; }
  const event = state.events.find(e => e.id === id);
  if (!event) return;
  openModal('Inscripción familiar', `<p class="lead">${X(event.title)}</p><p>${Math.max(0,event.capacity-event.registered.length)} lugares libres. Cada persona ocupa un lugar.</p><form id="family-event-form"><input type="hidden" name="event" value="${X(id)}"><fieldset><legend>¿Quiénes asistirán?</legend>${state.family.members.map(m=>`<label class="family-choice"><input type="checkbox" name="participant" value="${X(m.id)}" ${event.registered.includes(m.id)?'checked':''} ${!m.verified?'disabled':''}><span>${X(m.name)}<small>${m.verified?'Relación verificada de ejemplo':'Pendiente de verificar: no disponible'}</small></span></label>`).join('')}</fieldset><p>Marca para inscribir y desmarca para cancelar. Sin selección se cancelan las inscripciones verificadas de tu familia.</p><p class="tiny">Solo perfiles ficticios. No confirma asistencia real ni realiza cobros; otros adultos deben consentir en la aplicación final.</p><p id="family-event-error" role="alert"></p><div class="modal-actions"><button type="button" class="btn secondary" data-action="modal-close">Volver</button><button class="btn" type="submit">Guardar selección de prueba</button></div></form>`);
}
const teacherSessions = (() => {
  const start = new Date(); start.setHours(12,0,0,0); start.setDate(start.getDate()+((7-start.getDay())%7));
  return [0,1,2].map((i)=>{const d=new Date(start);d.setDate(d.getDate()+7*i);return {id:'clase-'+i,date:d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}),group:i===1?'Primarios (7–12)':'Tesoros del Rey (4–6)',time:i===1?'Segundo servicio · 12:00':'Primer servicio · 9:00',unavailable:false};});
})();
function teacherAgenda() {
  if (!state.session || !['voluntario','admin'].includes(state.role)) return home();
  return `${head('SHALOM KIDS · DOCENTES','Mi agenda docente','Tus próximos servicios y lo necesario para preparar cada clase.')}<p class="info">Agenda de ejemplo. Los avisos se conservan solo hasta recargar; no se envían a coordinación.</p><div class="grid">${teacherSessions.map(s=>`<section class="panel"><p class="eyebrow">${X(s.date)}</p><h2 class="section-title">${X(s.group)}</h2><p>${X(s.time)} · Salón de ejemplo</p><p role="status">${s.unavailable?'Aviso de ausencia registrado en esta prueba · suplente pendiente':'Servicio asignado de ejemplo'}</p><div class="agenda-actions"><button class="btn" data-teacher-attendance="${s.id}">Ir a asistencia</button><a class="btn secondary" href="design/kids-paneles.html#reservas">Preparar clase</a><button class="btn secondary" data-teacher-absence="${s.id}">${s.unavailable?'Retirar aviso de ausencia':'No puedo asistir'}</button></div></section>`).join('')}</div><section class="panel"><h2 class="section-title">Antes del domingo</h2><p>Consulta las reservas para preparar materiales y dulces. Los manuales y archivos de clase aún no están conectados.</p></section>`;
}
function absenceOpen(id) {
  if (!state.session || !['voluntario','admin'].includes(state.role)) return;
  const s=teacherSessions.find(s=>s.id===id); if(!s)return;
  openModal(s.unavailable?'Retirar aviso de ausencia':'Avisar que no puedo asistir',`<p>${X(s.group)} · ${X(s.date)} · ${X(s.time)}</p><p>${s.unavailable?'Se retirará únicamente el aviso de esta simulación.':'Se marcará que necesitas suplente. No se asigna uno automáticamente ni se envía un mensaje real.'}</p><div class="modal-actions"><button class="btn secondary" data-action="modal-close">Volver</button><button class="btn" data-confirm-absence="${s.id}">Confirmar ${s.unavailable?'retiro':'aviso'} de prueba</button></div>`);
}
document.addEventListener('click', e => {
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.familyEvent) familyEventOpen(b.dataset.familyEvent);
  if(b.dataset.teacherAbsence) absenceOpen(b.dataset.teacherAbsence);
  if(b.dataset.confirmAbsence && state.session && ['voluntario','admin'].includes(state.role)) {
    const s=teacherSessions.find(s=>s.id===b.dataset.confirmAbsence);if(!s)return;
    s.unavailable=!s.unavailable;modal=null;render();notify('Cambio de prueba guardado. No se envió ningún mensaje.');
  }
  if(b.dataset.teacherAttendance && state.session && ['voluntario','admin'].includes(state.role)) {
    const s=teacherSessions.find(s=>s.id===b.dataset.teacherAttendance);if(!s)return;
    goto('kids');const group=document.querySelector('form[data-form="attendance"] [name="group"]');if(group)group.value=s.group;
    document.querySelector('form[data-form="attendance"]')?.scrollIntoView({block:'center'});
    document.querySelector('form[data-form="attendance"] select')?.focus();
  }
});
document.addEventListener('submit', e => {
  if(e.target.id!=='family-event-form')return;e.preventDefault();if(!state.session)return;
  const data=new FormData(e.target), event=state.events.find(x=>x.id===data.get('event'));if(!event)return;
  const result=window.ShalomFamily.plan(event,state.family.members,data.getAll('participant'));
  if(result.error){document.getElementById('family-event-error').textContent=result.error;return;}
  event.registered=result.registered;
  const selected=state.family.members.filter(m=>result.registered.includes(m.id));
  // Se confirma la selección final, no solo que el formulario fue enviado.
  const summary=selected.length
    ? `<p><strong>${selected.length} ${selected.length===1?'integrante inscrito':'integrantes inscritos'}</strong> en esta demostración.</p><ul class="family-confirmation-list">${selected.map(m=>`<li>${X(m.name)}</li>`).join('')}</ul>`
    : '<p><strong>No hay integrantes inscritos</strong> de tu familia en este evento de prueba.</p>';
  openModal('Resumen de inscripción familiar',`<div class="family-confirmation" role="status"><p class="eyebrow">SELECCIÓN GUARDADA · SOLO DEMO</p><h3>${X(event.title)}</h3>${summary}<p class="muted">Puedes corregir los participantes. Esto no envía inscripciones reales ni realiza cobros.</p><div class="modal-actions"><button type="button" class="btn secondary" data-family-event="${X(event.id)}">Corregir selección</button><button type="button" class="btn" data-action="modal-close">Listo</button></div></div>`);
});
if(location.hash==='#agenda') goto('agenda');
