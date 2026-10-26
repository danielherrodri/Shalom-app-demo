/* Notificaciones de demostración: memoria local de la página, sin envíos. */
(() => {
  const labels={persona:'Congregante',voluntario:'Voluntario',admin:'Administración',cliente:'Cliente',caja:'Caja',cocina:'Preparación'};
  const topics={persona:['Eventos','Avisos generales'],voluntario:['Turnos','Avisos generales'],admin:['Operación','Avisos generales'],cliente:['Novedades del menú'],caja:['Resumen de operación'],cocina:['Resumen de operación']};
  const records=[], read=new Map(), prefs=new Map();
  let context=()=>null, roles=[], selected='', serial=0, opener=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const role=()=>context()||selected;
  const visible=()=>records.filter(n=>n.roles.includes(role())&&(!n.optional||prefs.get(role()+':'+n.topic)===true));
  const isRead=n=>read.get(role()+':'+n.id)===true;
  const host=document.createElement('div');host.id='notification-entry';document.body.append(host);
  const dialog=document.createElement('dialog');dialog.id='notification-dialog';dialog.setAttribute('aria-labelledby','notification-title');document.body.append(dialog);
  function mountInNavigation(){
    const slot=document.querySelector('.shalom-area-nav .shalom-area-actions');
    if(slot&&host.parentNode!==slot)slot.append(host);
  }
  function refresh(){
    const r=role();host.hidden=!r;const count=visible().filter(n=>!isRead(n)).length;
    host.innerHTML=r?`<button type="button" class="n-entry-button" data-n-open aria-label="Notificaciones: ${count} sin leer" title="Notificaciones"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>${count?`<span class="n-count" aria-hidden="true">${count>99?'99+':count}</span>`:''}</button>`:'';
    mountInNavigation();
    if(dialog.open)draw();
  }
  function draw(){const r=role(), list=visible();dialog.innerHTML=`<div class="n-head"><h2 id="notification-title">Notificaciones · ${esc(labels[r])}</h2><button type="button" class="n-close" data-n-close aria-label="Cerrar notificaciones" title="Cerrar">×</button></div><p>Demostración: sin correo ni push. La bandeja y las preferencias se borran al recargar. Los perfiles de prueba no son permisos de acceso.</p>${roles.length>1?`<label>Perfil de prueba <select id="notification-role">${roles.map(v=>`<option value="${v}" ${v===r?'selected':''}>${esc(labels[v])}</option>`).join('')}</select></label>`:''}<h3>Preferencias de este perfil</h3><p>Los avisos necesarios sobre tus acciones y tu operación permanecen en la bandeja. Las novedades son optativas, desactivadas inicialmente.</p>${(topics[r]||[]).map(t=>`<label class="n-option"><input type="checkbox" data-n-topic="${esc(t)}" ${prefs.get(r+':'+t)?'checked':''}> ${esc(t)}</label>`).join('')}<div class="n-tools"><button type="button" data-n-all ${list.some(n=>!isRead(n))?'':'disabled'}>Marcar todo como leído</button><button type="button" data-n-demo>Generar ejemplo para este perfil</button></div><p role="status">${list.filter(n=>!isRead(n)).length} sin leer</p><div class="n-list">${list.length?list.slice().reverse().map(n=>`<article class="n-item ${isRead(n)?'n-read':''}"><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${esc(n.optional?'Novedad optativa':'Aviso de operación')} · ${esc(new Date(n.time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}))} · ${isRead(n)?'Leída':'Sin leer'}</small>${isRead(n)?'':`<div><button type="button" data-n-read="${n.id}">Marcar como leído</button></div>`}</article>`).join(''):'<p>No hay notificaciones para este perfil.</p>'}</div>`}
  function emit(n){if(!Array.isArray(n.roles))return;records.push({...n,id:++serial,time:Date.now()});if(records.length>100)records.shift();refresh()}
  host.addEventListener('click',()=>{opener=document.activeElement;draw();dialog.showModal()});
  dialog.addEventListener('close',()=>{opener?.focus()});
  dialog.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-n-close'))dialog.close();if(b.hasAttribute('data-n-read')){const n=visible().find(v=>v.id===Number(b.dataset.nRead));if(n)read.set(role()+':'+n.id,true);refresh()}if(b.hasAttribute('data-n-all')){visible().forEach(n=>read.set(role()+':'+n.id,true));refresh()}if(b.hasAttribute('data-n-demo')){const r=role();emit({roles:[r],title:'Ejemplo para '+labels[r],body:({persona:'Tu inscripción de ejemplo fue confirmada.',voluntario:'Se actualizó tu turno de servicio de ejemplo.',admin:'Hay una operación ficticia pendiente de revisión.',cliente:'Tu pedido de ejemplo está listo para recoger.',caja:'Pedido ficticio cancelado. Revisar devolución; no se ha confirmado un reembolso.',cocina:'Una comanda ficticia fue cancelada. Detén su preparación.'})[r]});for(const t of topics[r]||[])emit({roles:[r],title:t,body:'Novedad ficticia de '+t.toLowerCase()+'.',optional:true,topic:t})}});
  dialog.addEventListener('change',e=>{if(e.target.id==='notification-role'&&roles.includes(e.target.value)){selected=e.target.value;refresh()}if(e.target.hasAttribute('data-n-topic')){prefs.set(role()+':'+e.target.dataset.nTopic,e.target.checked);refresh()}});
  window.ShalomNotifications={emit,mountInNavigation,configure(options){context=options.context||(()=>null);roles=options.roles||[];selected=roles[0]||'';refresh()},refresh,clear(){records.length=0;read.clear();prefs.clear();refresh()}};
})();
