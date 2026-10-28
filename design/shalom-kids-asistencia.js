"use strict";
// Asistencia de Shalom Kids con una sola fuente de verdad: un registro por niño, domingo y servicio.
// Recepción escribe eventos (aviso, entrada, entrega, corrección); Mi grupo hoy, Asistencia y la bitácora solo leen.
// Datos ficticios en memoria: nada se guarda ni se envía. En la app real el servidor decide el perfil y valida cada operación.
(() => {
  const { SERVICIOS, GRUPOS, DOMINGOS, DOCENTES, esc, fecha, sesion } = window.ShalomKidsRol;
  const $ = id => document.getElementById(id);
  const HOY = DOMINGOS[0];
  const NOMBRE_GRUPO = { '4 a 6': 'Tesoros del Rey', '7 a 12': 'Primarios' };
  const SIGLA = ['1°', '2°', '3°'];
  const pad = n => String(n).padStart(2, '0');
  const hm = m => `${Math.floor(m / 60) % 12 || 12}:${pad(m % 60)} ${m < 720 ? 'AM' : 'PM'}`;
  const AUTORIZADOS = [['Adulto de ejemplo B', 'Tutor principal · autorizado'], ['Adulto de ejemplo C', 'Autorizado hasta dic 2026']];

  // ---------- Registro único ----------
  const alumnos = GRUPOS.flatMap(([g], gi) => 'ABCDEF'.split('').map((letra, i) => ({
    id: `K-${gi + 1}${pad(i + 1)}`, nombre: `Menor de ejemplo ${gi ? 'P' : ''}${letra}`, edad: gi ? 7 + i : 4 + (i % 3), grupo: g,
    impresiones: 1 + (i % 2), estado: 'Activo', gafete: 'activo', atencion: false, notas: '',
  })));
  const alumno = id => alumnos.find(a => a.id === id);
  Object.assign(alumno('K-101'), { atencion: true, edad: 5 });
  Object.assign(alumno('K-104'), { impresiones: 2 });
  Object.assign(alumno('K-105'), { gafete: 'inactivo', estado: 'Gafete inactivo', edad: 4 });
  alumnos.push(
    { id: 'K-107', nombre: 'Menor de ejemplo C', edad: 5, grupo: '4 a 6', impresiones: 1, estado: 'Posible duplicado', gafete: 'activo', atencion: false, notas: 'Registrado dos veces en recepción', duplicaDe: 'K-103' },
    { id: 'K-108', nombre: 'Menor de ejemplo H', edad: 5, grupo: '4 a 6', impresiones: 1, estado: 'Activo', gafete: 'activo', atencion: false, notas: '' },
    { id: 'K-109', nombre: 'Menor de ejemplo I', edad: 5, grupo: '4 a 6', impresiones: 1, estado: 'Activo', gafete: 'activo', atencion: false, notas: '' },
    { id: 'KT-013', nombre: 'Menor de ejemplo J', edad: 8, grupo: '7 a 12', impresiones: 0, estado: 'Provisional', gafete: 'temporal', atencion: false, notas: 'Alta rápida · pendiente de completar', provisional: true },
  );

  const inicioServicio = si => { const m = /^(\d+):(\d+) (AM|PM)/.exec(SERVICIOS[si][1]); return ((Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + Number(m[2]); };
  const st = { m: 10 * 60 + 47, puerta: '', modo: 'entrada', offline: false, cola: [], registros: new Map(), bitacora: [], correcciones: 0, undo: null, bitFiltro: 'Todo' };
  const sugerido = () => { let s = 0; SERVICIOS.forEach((_, si) => { if (st.m >= inicioServicio(si) - 30) s = si; }); return s; };
  st.si = sugerido();
  const quienRecepcion = () => (sesion.perfil === 'admin' ? 'Coordinación de ejemplo' : 'Voluntario de ejemplo A');
  const evento = (m, id, tipo, origen, quien) => st.bitacora.push({ m, id, tipo, origen, quien });
  const codigo = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };

  // Estado del domingo de ejemplo, 10:47 AM, 2° servicio.
  [['K-101', '8:12', 492, 'App familia'], ['K-202', '8:40', 520, 'App familia'], ['K-104', '9:05', 545, 'App familia'], ['K-204', '9:31', 571, 'App familia'], ['K-106', '10:02', 602, 'App familia'], ['K-205', '10:20', 620, 'App familia']]
    .forEach(([id, , m, origen]) => { st.registros.set(id, { id, estado: 'Por confirmar', si: 1, m, origen }); evento(m, id, 'Aviso', origen, 'Adulto B'); });
  [['K-103', 646, 'QR gafete', 'Voluntario de ejemplo B', 1], ['K-203', 645, 'Búsqueda', 'Voluntario de ejemplo A', 1], ['K-206', 630, 'QR gafete', 'Voluntario de ejemplo A', 1], ['K-201', 535, 'QR gafete', 'Voluntario de ejemplo A', 0], ['K-102', 590, 'QR familia', 'Voluntario de ejemplo B', 1]]
    .forEach(([id, m, origen, quien, si]) => { st.registros.set(id, { id, estado: 'Dentro', si, m, origen, codigo: codigo() }); evento(m, id, 'Entrada', origen, quien); });
  [['K-102', 638, 1], ['K-201', 620, 0]].forEach(([id, m]) => { const r = st.registros.get(id); Object.assign(r, { estado: 'Entregado', entrega: { adulto: 'Adulto de ejemplo B', m, quien: 'Voluntario de ejemplo B' } }); evento(m, id, 'Entrega', 'Código de recogida', 'Voluntario de ejemplo B'); });

  const delGrupo = (g, si = st.si) => [...st.registros.values()].filter(r => r.si === si && alumno(r.id)?.grupo === g);
  const cuenta = (g, si = st.si) => {
    const rs = delGrupo(g, si);
    return { dentro: rs.filter(r => r.estado === 'Dentro').length, esperados: rs.filter(r => r.estado === 'Por confirmar').length, entregados: rs.filter(r => r.estado === 'Entregado').length };
  };
  const avanza = () => { st.m += 1; };

  function entrada(id, origen, si = st.si) {
    const previo = st.registros.get(id);
    avanza();
    const r = { id, estado: 'Dentro', si, m: st.m, origen: st.offline ? 'En cola' : origen, codigo: previo?.codigo && previo.si === si ? previo.codigo : (st.offline ? `P${codigo().slice(1)}` : codigo()), cola: st.offline, avisoM: previo?.estado === 'Por confirmar' ? previo.m : undefined };
    st.registros.set(id, r);
    evento(st.m, id, 'Entrada', origen, quienRecepcion());
    if (st.offline) st.cola.push({ id, tipo: 'Entrada', m: st.m });
    st.undo = { id, previo };
    return r;
  }
  function deshacer() {
    if (!st.undo) return false;
    const { id, previo } = st.undo;
    if (previo) st.registros.set(id, previo); else st.registros.delete(id);
    const i = st.bitacora.map(e => e.id === id && e.tipo === 'Entrada').lastIndexOf(true);
    if (i >= 0) st.bitacora.splice(i, 1);
    st.cola = st.cola.filter(c => c.id !== id);
    st.undo = null;
    return true;
  }
  function entregar(id, adulto) {
    const r = st.registros.get(id);
    avanza();
    r.estado = 'Entregado'; r.pendiente = null;
    r.entrega = { adulto, m: st.m, quien: quienRecepcion(), revisar: st.offline };
    evento(st.m, id, 'Entrega', st.offline ? 'Código de recogida · sin conexión' : 'Código de recogida', quienRecepcion());
    if (st.offline) st.cola.push({ id, tipo: 'Entrega', m: st.m, revisar: true });
    st.undo = { entrega: id };
    return r;
  }
  function corregir(id, que, motivo, si) {
    const r = st.registros.get(id);
    avanza();
    const quien = sesion.perfil === 'admin' ? 'Coordinación de ejemplo' : sesion.docente;
    if (que === 'servicio') r.si = si; else if (que === 'fuera') r.estado = 'Por confirmar'; else if (que === 'entregado') { r.estado = 'Entregado'; r.entrega = { adulto: 'Sin lectura', m: st.m, quien }; }
    r.corregido = { quien, motivo, m: st.m }; st.correcciones += 1;
    evento(st.m, id, 'Corrección', `Manual · «${motivo}»`, quien);
  }
  let consecutivo = 14;
  function altaRapida(d) {
    const id = `KT-${pad(consecutivo++)}`;
    alumnos.push({ id, nombre: d.nombre, edad: d.edad, grupo: d.grupo, impresiones: 0, estado: 'Provisional', gafete: 'temporal', atencion: d.atencion, notas: 'Alta rápida · pendiente de completar', provisional: true, altaM: st.m + 1 });
    avanza();
    st.registros.set(id, { id, estado: 'Dentro', si: st.si, m: st.m, origen: 'Alta rápida', codigo: codigo(), adulto: d.adulto });
    evento(st.m, id, 'Entrada', 'Alta rápida', quienRecepcion());
    return alumno(id);
  }
  function unir(provId, realId) {
    const prov = alumno(provId), real = alumno(realId), r = st.registros.get(provId);
    avanza();
    if (r) {
      const existente = st.registros.get(realId);
      if (!existente || existente.si !== r.si) st.registros.set(realId, { ...r, id: realId });
      st.registros.delete(provId);
      r.id = realId;
    }
    prov.estado = 'Unido'; prov.gafete = 'inactivo'; prov.provisional = false; prov.duplicaDe = undefined; prov.notas = `Unido a ${real.id}`;
    st.bitacora.forEach(e => { if (e.id === provId) e.id = realId; });
    evento(st.m, realId, 'Unión', `Se unió ${provId} a ${realId}`, 'Coordinación de ejemplo');
  }
  function avisar(id, si) {
    const previo = st.registros.get(id);
    if (previo && previo.si === si && previo.estado !== 'Por confirmar') return false;
    avanza();
    st.registros.set(id, { id, estado: 'Por confirmar', si, m: st.m, origen: 'App familia' });
    if (!previo) evento(st.m, id, 'Aviso', 'App familia', 'Adulto de ejemplo B');
    return true;
  }
  function cancelaAviso(id) { if (st.registros.get(id)?.estado === 'Por confirmar') { st.registros.delete(id); st.bitacora = st.bitacora.filter(e => !(e.id === id && e.tipo === 'Aviso')); } }
  function sincroniza() {
    const n = st.cola.length;
    st.cola.forEach(c => { const r = st.registros.get(c.id); if (r) { r.cola = false; if (r.origen === 'En cola') r.origen = 'Sincronizada'; } });
    st.cola = [];
    return n;
  }

  // ---------- Ventana modal compartida ----------
  const dialogo = document.createElement('dialog');
  dialogo.id = 'ka-dialogo'; dialogo.className = 'ka-dialogo'; dialogo.setAttribute('aria-labelledby', 'ka-dialogo-titulo');
  document.body.append(dialogo);
  dialogo.addEventListener('click', e => { if (e.target.closest('[data-cerrar]')) dialogo.close(); });
  function modal(titulo, cuerpo) {
    dialogo.innerHTML = `<h2 id="ka-dialogo-titulo">${titulo}</h2>${cuerpo}`;
    if (!dialogo.open) dialogo.showModal();
    return dialogo;
  }

  const avisoEn = () => `${SIGLA[st.si]} servicio`;
  const badge = t => `<span class="badge">${esc(t)}</span>`;
  const atencion = a => (a.atencion ? ` <span class="badge ka-atencion">Atención</span>` : '');
  const origenCorto = r => ({ 'QR gafete': 'QR', 'QR familia': 'QR', 'Búsqueda': 'búsqueda', 'Alta rápida': 'alta rápida', 'En cola': 'en cola', 'Docente': 'docente' }[r.origen] || r.origen);

  // ---------- Recepción ----------
  const rec = addDemoView('recepcion', 'Recepción', 'check', 'LA PUERTA DE SHALOM KIDS', 'Cada niño, <em>contado.</em>', 'Escanea el gafete, confirma la entrada y entrega al adulto autorizado. Todo queda en un solo registro por niño, domingo y servicio.', `
<div id="rec-bloqueo" hidden><section class="card ka-estado"><h2>Recepción es para el equipo de la puerta</h2><p>Tu perfil es Docente · Tesoros del Rey. Puedes ver tu grupo en «Mi grupo hoy». Si hoy te toca recepción, pide el permiso a coordinación.</p><a class="button primary" href="#lista">Ir a Mi grupo hoy</a></section></div>
<div id="rec-contenido">
<div class="module-toolbar"><span class="badge" id="rec-fecha"></span><span class="badge" id="rec-servicio"></span><button class="button" type="button" id="rec-cambiar-servicio">Cambiar servicio</button><span class="badge" id="rec-sync" role="status"></span></div>
<div class="ka-modos" role="group" aria-label="Modo de recepción"><button type="button" class="button" data-modo="entrada" aria-pressed="true">Entrada</button><button type="button" class="button" data-modo="entrega" aria-pressed="false">Entrega</button></div>
<div class="grid ka-rec"><div>
<section class="card" aria-labelledby="rec-esc-t"><h2 id="rec-esc-t">Escanear gafete</h2><p class="muted">Gafete del niño o QR de la familia. Con un lector USB el cursor queda listo aquí. En este demo escribe un ID (K-101, K-103, KT-013…) y pulsa Enter.</p>
<form id="rec-form" novalidate><label for="rec-codigo">Código leído</label><input id="rec-codigo" type="text" autocomplete="off" maxlength="24" placeholder="K-101"><div class="ka-acciones"><button class="button primary" type="submit">Leer gafete</button><label class="checkline"><input type="checkbox" id="rec-offline"> Simular sin conexión</label></div></form>
<p class="muted">Probar un resultado: <button type="button" class="ka-enlace" data-prueba="XQ-000">código desconocido</button> · <button type="button" class="ka-enlace" data-prueba="K-105">gafete perdido</button> · <button type="button" class="ka-enlace" data-prueba="K-103">ya registrado</button> · <button type="button" class="ka-enlace" data-camara="1">cámara bloqueada</button></p>
<p class="muted">Probar la lista de avisos: <button type="button" class="ka-enlace" data-lista-prueba="cargando">cargando</button> · <button type="button" class="ka-enlace" data-lista-prueba="error">error al cargar</button></p>
<div class="ka-buscar"><label for="rec-buscar">¿Gafete olvidado, roto o no se lee? Buscar por nombre o ID</label><input id="rec-buscar" type="search" autocomplete="off" placeholder="Menor de ejemplo D o K-104"><div id="rec-encontrados" role="status"></div><button class="button" type="button" id="rec-alta">No encuentro al niño · Alta rápida</button></div>
<label for="rec-puerta">Puerta</label><select id="rec-puerta"><option value="">Todos los grupos</option>${GRUPOS.map(([g, n]) => `<option value="${g}">${n} (${g})</option>`).join('')}</select></section>
<section class="card" id="rec-resultado" aria-live="polite" tabindex="-1"><p class="muted">Aquí aparece el resultado de cada lectura. Todos los estados llevan ícono, título y frase: el color nunca va solo.</p></section></div>
<div><section class="card" aria-labelledby="rec-av-t"><div class="subheading"><h2 id="rec-av-t">Avisaron que vienen</h2><span id="rec-av-n"></span></div><div id="rec-avisos"></div></section>
<section class="card" aria-labelledby="rec-vivo-t"><h2 id="rec-vivo-t">En vivo</h2><div id="rec-vivo"></div><h3>Últimas lecturas</h3><ul id="rec-ultimas" class="ka-lista"></ul></section>
<section class="card" id="rec-atencion-card" aria-labelledby="rec-pend-t"><h2 id="rec-pend-t">Requiere atención</h2><div id="rec-pendientes"></div></section>
<section class="card" id="rec-cola-card" hidden aria-labelledby="rec-cola-t"><h2 id="rec-cola-t">Sin conexión · cola de sincronización</h2><ul id="rec-cola" class="ka-lista"></ul><p class="muted">Se envían solas al volver la red. Las entregas sin conexión requieren «Reconozco personalmente» y se revisan al sincronizar.</p><button class="button" type="button" id="rec-sync-ahora">Volver a conectar y sincronizar</button></section></div></div></div>`);

  let temporizador = 0;
  const resultado = (html) => { clearTimeout(temporizador); const c = $('rec-resultado'); c.innerHTML = html; c.focus({ preventScroll: true }); };
  const tarjeta = (cls, icono, titulo, frase, extra = '') => `<div class="ka-res ${cls}"><h2><span aria-hidden="true">${icono}</span> ${titulo}</h2><p>${frase}</p>${extra}</div>`;
  const filaNino = a => `<p class="ka-nino"><strong>${esc(a.nombre)}</strong>${atencion(a)}<small>${esc(a.id)} · ${esc(NOMBRE_GRUPO[a.grupo])}</small></p>`;

  function pintaRec() {
    const admin = sesion.perfil === 'admin';
    $('rec-bloqueo').hidden = admin; $('rec-contenido').hidden = !admin;
    if (!admin) return;
    $('rec-fecha').textContent = `Domingo ${fecha(HOY)} · ${hm(st.m)}`;
    $('rec-servicio').textContent = `${SERVICIOS[st.si][0]} · ${SERVICIOS[st.si][1].split(' a ')[0]}`;
    $('rec-sync').textContent = st.offline ? `Sin conexión · ${st.cola.length} ${st.cola.length === 1 ? 'lectura' : 'lecturas'} en cola` : 'Sincronizado';
    $('rec-cola-card').hidden = !st.offline && !st.cola.length;
    $('rec-cola').innerHTML = st.cola.map(c => `<li>${esc(c.id)} · ${c.tipo} ${hm(c.m)} ${c.revisar ? badge('Revisar') : ''}</li>`).join('') || '<li class="muted">Nada pendiente.</li>';
    document.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modo === st.modo)));
    const esperados = [...st.registros.values()].filter(r => r.estado === 'Por confirmar' && r.si === st.si && (!st.puerta || alumno(r.id).grupo === st.puerta)).sort((a, b) => b.m - a.m);
    $('rec-av-n').textContent = st.lista ? SERVICIOS[st.si][0] : `${esperados.length} · ${SERVICIOS[st.si][0]}`;
    $('rec-avisos').setAttribute('aria-busy', String(st.lista === 'cargando'));
    $('rec-avisos').innerHTML = st.lista === 'cargando' ? `<p role="status"><strong>Cargando la lista del ${SERVICIOS[st.si][0]}…</strong></p><p class="muted">Puedes escanear mientras carga.</p>`
      : st.lista === 'error' ? tarjeta('ka-error', '⚠', 'No pudimos cargar la lista', 'El servidor no respondió. Tus lecturas siguen guardándose aquí.', '<div class="ka-acciones"><button class="button primary" type="button" data-lista-reintenta="1">Intentar de nuevo</button></div>')
      : esperados.length ? `<p class="muted">Confirma solo con el niño frente a ti.</p><ul class="ka-lista">${esperados.map(r => { const a = alumno(r.id); return `<li><div>${filaNino(a).replace('<small>', `<small>${hm(r.m)} · `)}</div><button class="button" type="button" data-confirma="${r.id}">Confirmar<span class="sr-only"> a ${esc(a.nombre)}</span></button></li>`; }).join('')}</ul>` : `<p><strong>Aún no hay avisos para el ${SERVICIOS[st.si][0]}</strong></p><p class="muted">Los niños que lleguen se registran escaneando su gafete.</p>`;
    $('rec-vivo').innerHTML = GRUPOS.map(([g, n]) => { const c = cuenta(g); return `<div class="ka-vivo"><strong>${n}</strong> <span class="muted">${g}</span><div class="stats ka-stats"><div class="stat"><strong>${c.dentro}</strong>Dentro</div><div class="stat"><strong>${c.esperados}</strong>Esperados</div><div class="stat"><strong>${c.entregados}</strong>Entregados</div></div></div>`; }).join('');
    $('rec-ultimas').innerHTML = st.bitacora.filter(e => e.tipo !== 'Aviso').slice().sort((a, b) => b.m - a.m).slice(0, 4).map(e => `<li>${esc(e.id)} · ${esc(e.tipo)} · ${esc(e.origen)} ${hm(e.m)}</li>`).join('');
    const pend = [...st.registros.values()].filter(r => r.pendiente);
    $('rec-pendientes').innerHTML = pend.length ? `<ul class="ka-lista">${pend.map(r => `<li><div><strong>Entrega pendiente</strong><small>${esc(alumno(r.id).nombre)} · ${esc(r.id)} · ${esc(r.pendiente)}</small></div><button class="button" type="button" data-valida="${r.id}">Validar adulto</button></li>`).join('')}</ul>` : '<p class="muted">Sin pendientes.</p>';
  }

  // Resultado de leer un gafete o elegir a un niño de la lista.
  function lee(texto) {
    const id = texto.trim().toUpperCase();
    if (!id) return;
    const a = alumno(id);
    if (!a || a.estado === 'Unido') return resultado(tarjeta('ka-aviso', '⚠', 'No reconocemos este código', 'No es un gafete de Shalom Kids, ya caducó o la lectura salió incompleta.', `<p class="muted">Acerca el gafete sin reflejos. Si es el QR de la familia, pide que lo actualice en su app.</p><div class="ka-acciones"><button class="button primary" type="button" data-foco="rec-codigo">Intentar de nuevo</button><button class="button" type="button" data-alta="1">No encuentro al niño · Alta rápida</button><button class="button" type="button" data-foco="rec-buscar">Buscar por nombre o ID</button></div>`));
    if (a.gafete === 'inactivo') {
      const d = a.duplicaDe ? alumno(a.duplicaDe) : null;
      return resultado(tarjeta('ka-error', '⛔', 'Gafete desactivado', d ? `Este gafete se unió al registro ${d.id}.` : 'Este gafete se reportó como perdido. No da entrada.', `<p class="muted">Pertenecía a ${esc(a.id)} · ${esc(NOMBRE_GRUPO[a.grupo])}. Por seguridad no mostramos el nombre: confirma con el adulto buscándolo por nombre.</p><div class="ka-acciones">${d ? `<button class="button primary" type="button" data-lee="${d.id}">Usar ${d.id}</button>` : ''}<button class="button" type="button" data-aviso-coord="${esc(a.id)}">Avisar a coordinación</button><button class="button" type="button" data-foco="rec-buscar">Buscar por nombre</button></div>`));
    }
    if (st.puerta && a.grupo !== st.puerta) return resultado(tarjeta('ka-aviso', '↔', `Es de ${NOMBRE_GRUPO[a.grupo]}`, `Estás en la puerta de ${NOMBRE_GRUPO[st.puerta]}. Este niño tiene ${a.edad} años.`, `${filaNino(a)}<p class="muted">Solo coordinación puede cambiar de grupo por un día (por ejemplo, para acompañar a un hermano).</p><div class="ka-acciones"><button class="button" type="button" data-aviso-coord="${esc(a.id)}">Pedir a coordinación</button><button class="button primary" type="button" data-puerta="${a.grupo}" data-lee="${a.id}">Registrar en ${NOMBRE_GRUPO[a.grupo]}</button></div>`));
    const r = st.registros.get(id);
    if (st.modo === 'entrega') return entregaPaso1(a, r);
    if (r && r.si === st.si && (r.estado === 'Dentro' || r.estado === 'Entregado')) {
      return resultado(tarjeta('ka-aviso', 'ℹ', r.estado === 'Dentro' ? 'Ya está dentro' : 'Ya fue entregado', `${r.estado === 'Dentro' ? 'Entró' : 'Entró'} a las ${hm(r.m)} al ${SERVICIOS[r.si][0]}. Lo registró ${esc(r.entrega ? r.entrega.quien : 'recepción')} por ${esc(origenCorto(r))}.`, `${filaNino(a)}<p>No se duplicó la entrada. ¿Lo estás entregando? Cambia a modo Entrega.</p><div class="ka-acciones"><button class="button primary" type="button" data-modo-ir="entrega" data-lee="${id}">Cambiar a Entrega</button><button class="button" type="button" data-foco="rec-codigo">Escanear siguiente</button></div>`));
    }
    resultado(tarjeta('ka-ok', '✓', 'Gafete leído · confirmar entrada', st.offline ? 'Sin conexión: la entrada quedará en cola. Funciona con la lista descargada a las 10:30 AM.' : '', `${filaNino(a)}<dl class="ka-datos"><dt>Grupo</dt><dd>${esc(NOMBRE_GRUPO[a.grupo])}</dd><dt>Servicio</dt><dd>${esc(SERVICIOS[st.si][0])} · ${esc(SERVICIOS[st.si][1].split(' a ')[0])}</dd><dt>Estado</dt><dd>${r && r.estado === 'Por confirmar' ? `Por confirmar · avisó ${hm(r.m)}` : 'Sin aviso previo'}</dd></dl>${a.atencion ? '<p class="ka-nota">Requiere atención (alergia o indicación). El docente la consulta en el expediente autorizado.</p>' : ''}<div class="ka-acciones"><button class="button primary" type="button" data-entrada="${id}" data-origen="QR gafete">Confirmar entrada</button><button class="button" type="button" data-foco="rec-codigo">No es este niño</button></div>`));
  }

  function confirmaEntrada(id, origen) {
    const a = alumno(id), r = entrada(id, origen);
    pintaTodo();
    resultado(tarjeta('ka-ok', '✓', `${st.offline ? 'Entrada guardada aquí' : `Dentro · ${hm(r.m)}`}`, `${esc(a.nombre)} · ${esc(NOMBRE_GRUPO[a.grupo])} · ${SIGLA[r.si]}${st.offline ? `. Se enviará sola al volver la red.` : ''}`, `<div class="ka-codigo"><span>Código de recogida${st.offline ? ' · provisional' : ''}</span><strong>${esc(r.codigo)}</strong><small>${st.offline ? 'Se confirma al sincronizar.' : 'Vale solo hoy, ' + esc(SERVICIOS[r.si][0]) + '. La familia también lo ve en su app.'}</small></div><div class="ka-acciones"><button class="button" type="button" data-etiqueta="${id}">Imprimir etiqueta</button><button class="button" type="button" data-deshacer="1" id="rec-deshacer">Deshacer · 10 s</button><button class="button primary" type="button" data-foco="rec-codigo">Escanear siguiente</button></div><p class="form-status" id="rec-msg" role="status"></p>`));
    temporizador = setTimeout(() => { const b = $('rec-deshacer'); if (b) b.remove(); st.undo = null; }, 10000);
  }

  function entregaPaso1(a, r) {
    if (!r || r.si !== st.si || r.estado !== 'Dentro') {
      const quedo = r && r.estado === 'Entregado' && r.si === st.si;
      return resultado(tarjeta('ka-aviso', 'ℹ', quedo ? 'Ya fue entregado' : 'Aún no está dentro', quedo ? `Se entregó a ${esc(r.entrega.adulto)} a las ${hm(r.entrega.m)}.` : `No hay entrada de ${esc(a.nombre)} en el ${SERVICIOS[st.si][0]}. Cambia a modo Entrada para registrarla.`, `${filaNino(a)}<div class="ka-acciones"><button class="button" type="button" data-foco="rec-codigo">Escanear siguiente</button></div>`));
    }
    resultado(tarjeta('ka-ok', '✓', 'Gafete leído · pedir código de recogida', `Dentro desde ${hm(r.m)}.`, `${filaNino(a)}<form id="rec-entrega" novalidate><label for="rec-cod-pres">Código de recogida que presenta el adulto</label><input id="rec-cod-pres" type="text" maxlength="6" autocomplete="off" required><div class="ka-acciones"><button class="button primary" type="submit">Verificar código</button></div></form><p class="form-status" id="rec-msg" role="status"></p><input type="hidden" id="rec-ent-id" value="${a.id}">`));
  }

  function entregaPaso2(id, presentado) {
    const a = alumno(id), r = st.registros.get(id);
    if (presentado.toUpperCase() !== r.codigo) {
      return resultado(tarjeta('ka-error', '⛔', 'El código no coincide', `El gafete es de ${esc(a.nombre)}, pero el código presentado es de otro niño o de otro domingo.`, `<dl class="ka-datos"><dt>Presentado</dt><dd>${esc(presentado.toUpperCase())}</dd><dt>Esperado</dt><dd>••••</dd></dl><p class="muted">No mostramos el código correcto. Pide al adulto que lo abra en su app o valida con coordinación.</p><div class="ka-acciones"><button class="button" type="button" data-aviso-coord="${esc(id)}">Llamar a coordinación</button><button class="button primary" type="button" data-lee="${id}">Escanear de nuevo</button></div>`));
    }
    resultado(tarjeta('ka-ok', '✓', 'Código coincide · ¿quién recoge?', `${esc(a.nombre)} · dentro desde ${hm(r.m)}.`, `<form id="rec-quien" novalidate><fieldset><legend>¿Quién recoge?</legend>${AUTORIZADOS.map(([n, d], i) => `<label class="checkline"><input type="radio" name="adulto" value="${esc(n)}"${i ? '' : ' checked'}> <span>${esc(n)}<small>${esc(d)}</small></span></label>`).join('')}<label class="checkline"><input type="radio" name="adulto" value=""> <span>No está en la lista</span></label></fieldset>
<label class="checkline"><input type="checkbox" id="rec-reconozco"> Reconozco personalmente a este adulto</label><p class="muted">Reconocer al niño no basta: confirma al adulto. Si no lo reconoces, pide identificación o llama a coordinación.</p>
<div class="ka-acciones"><button class="button primary" type="submit" id="rec-entregar" disabled aria-describedby="rec-entregar-ayuda">Confirmar entrega</button><button class="button" type="button" data-aviso-coord="${esc(id)}">No lo reconozco · llamar a coordinación</button></div><p class="muted" id="rec-entregar-ayuda">Marca la casilla para continuar.</p></form><input type="hidden" id="rec-ent-id" value="${id}">`));
  }

  function resultadoEntregado(id, adulto) {
    const a = alumno(id), r = entregar(id, adulto);
    pintaTodo();
    resultado(tarjeta('ka-ok', '✓', 'De vuelta con su familia', `${esc(a.nombre)} entregado a ${esc(adulto)} · ${hm(r.entrega.m)}${st.offline ? '. Queda en cola y se revisa al sincronizar.' : ''}`, `<p>Queda en la bitácora: Entrega · código ${esc(r.codigo)} · reconocido por ${esc(quienRecepcion())}. El código ${esc(r.codigo)} ya no sirve.</p><div class="ka-acciones"><button class="button" type="button" data-deshacer-entrega="${id}" id="rec-deshacer">Deshacer · 10 s</button><button class="button primary" type="button" data-foco="rec-codigo">Escanear siguiente</button></div>`));
    temporizador = setTimeout(() => { const b = $('rec-deshacer'); if (b) b.remove(); st.undo = null; }, 10000);
  }
  function entregaPendiente(id) {
    const a = alumno(id), r = st.registros.get(id);
    avanza();
    r.pendiente = 'Adulto no está en la lista';
    evento(st.m, id, 'Aviso', 'Entrega pendiente · coordinación', quienRecepcion());
    pintaTodo();
    resultado(tarjeta('ka-aviso', '⏳', 'Entrega pendiente', 'No entregues al niño hasta que coordinación lo valide.', `<dl class="ka-datos"><dt>Niño</dt><dd>${esc(a.nombre)} · ${esc(id)}</dd><dt>Motivo</dt><dd>Adulto no está en la lista</dd></dl><p>Avisamos a Coordinación · ${hm(st.m)}. El niño sigue «Dentro». Invita al adulto a esperar en recepción.</p><div class="ka-acciones"><button class="button primary" type="button" data-foco="rec-codigo">Atender otra entrega</button></div>`));
  }

  function altaForm() {
    modal('Alta rápida', `<p class="muted">Solo lo indispensable para recibirlo hoy. Coordinación completa el resto después.</p>
<form id="ka-alta" novalidate><label for="alta-nombre">Nombre del niño</label><input id="alta-nombre" type="text" maxlength="60" placeholder="Menor de ejemplo G" required>
<label for="alta-edad">Edad</label><div class="ka-edad"><button type="button" class="button" data-edad="-1" aria-label="Menos un año">−</button><input id="alta-edad" type="number" min="3" max="12" value="5" inputmode="numeric"><button type="button" class="button" data-edad="1" aria-label="Más un año">+</button></div>
<p class="muted" id="alta-grupo"></p><label for="alta-grupo-sel">Grupo</label><select id="alta-grupo-sel">${GRUPOS.map(([g, n]) => `<option value="${g}">${n} (${g})</option>`).join('')}</select>
<label for="alta-adulto">Adulto responsable</label><input id="alta-adulto" type="text" maxlength="60" placeholder="Adulto de ejemplo H" required>
<label for="alta-tel">Teléfono del adulto</label><input id="alta-tel" type="tel" inputmode="numeric" maxlength="10" placeholder="10 dígitos" required><p class="muted">Escribe un teléfono para avisarle si hace falta. No se guarda en este demo ni aparece en listas.</p>
<fieldset><legend>¿Alergias o indicaciones?</legend><label class="checkline"><input type="radio" name="alergia" value="no" checked> No</label><label class="checkline"><input type="radio" name="alergia" value="si"> Sí</label></fieldset>
<div id="alta-nota-caja" hidden><label for="alta-nota">Nota breve para el docente (no aparece en listas)</label><input id="alta-nota" type="text" maxlength="120"></div>
<label class="checkline"><input type="checkbox" id="alta-datos"> Datos: el adulto acepta el aviso de privacidad para este registro. Obligatorio.</label>
<label class="checkline"><input type="checkbox" id="alta-imagen"> Imagen: autoriza fotos internas del salón. Opcional; sin marcar = no.</label>
<p class="form-status" id="alta-msg" role="alert"></p><div class="ka-acciones"><button class="button primary" type="submit">Registrar y dar entrada</button><button class="button" type="button" data-cerrar="1">Cancelar</button></div></form>`);
    sugiereGrupo();
    $('alta-nombre').focus();
  }
  function sugiereGrupo() {
    const edad = Number($('alta-edad').value), g = edad <= 6 ? '4 a 6' : '7 a 12';
    $('alta-grupo-sel').value = g;
    $('alta-grupo').textContent = `Grupo sugerido: ${NOMBRE_GRUPO[g]} (${g}). Puedes cambiarlo.`;
  }

  // ---------- Eventos de Recepción ----------
  rec.addEventListener('submit', e => {
    if (e.target.id === 'rec-form') { e.preventDefault(); st.origenBusqueda = ''; lee($('rec-codigo').value); $('rec-codigo').value = ''; }
    if (e.target.id === 'rec-entrega') { e.preventDefault(); const v = $('rec-cod-pres').value.trim(); if (!v) { $('rec-msg').textContent = 'Escribe el código de recogida.'; return; } entregaPaso2($('rec-ent-id').value, v); }
    if (e.target.id === 'rec-quien') {
      e.preventDefault();
      const id = $('rec-ent-id').value, adulto = e.target.elements.adulto.value;
      if (!$('rec-reconozco').checked) return;
      if (!adulto) entregaPendiente(id); else resultadoEntregado(id, adulto);
    }
  });
  rec.addEventListener('change', e => {
    if (e.target.id === 'rec-offline') {
      st.offline = e.target.checked;
      if (!st.offline) { const n = sincroniza(); pintaTodo(); resultado(`<p role="status">Conexión recuperada. ${n} ${n === 1 ? 'lectura enviada' : 'lecturas enviadas'}.</p>`); } else pintaRec();
    }
    if (e.target.id === 'rec-puerta') { st.puerta = e.target.value; pintaRec(); }
    if (e.target.id === 'rec-reconozco' || e.target.name === 'adulto') {
      const ok = $('rec-reconozco').checked;
      $('rec-entregar').disabled = !ok;
      $('rec-entregar-ayuda').textContent = ok ? 'Listo para confirmar.' : 'Marca la casilla para continuar.';
    }
  });
  rec.addEventListener('input', e => {
    if (e.target.id !== 'rec-buscar') return;
    const q = e.target.value.trim().toLowerCase();
    const ok = q.length >= 2 ? alumnos.filter(a => a.estado !== 'Unido' && (a.nombre.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))).slice(0, 5) : [];
    $('rec-encontrados').innerHTML = q.length < 2 ? '' : ok.length ? `<ul class="ka-lista">${ok.map(a => `<li><div>${filaNino(a)}</div><button class="button" type="button" data-lee="${a.id}" data-origen="Búsqueda">Elegir</button></li>`).join('')}</ul>` : '<p class="muted">Sin resultados. Prueba con otro nombre o usa Alta rápida.</p>';
  });
  rec.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset;
    if (d.modo) { st.modo = d.modo; $('rec-resultado').innerHTML = '<p class="muted">Modo ' + (st.modo === 'entrada' ? 'Entrada' : 'Entrega') + '. Escanea un gafete.</p>'; pintaRec(); $('rec-codigo').focus(); }
    if (d.modoIr) { st.modo = d.modoIr; pintaRec(); }
    if (d.puerta !== undefined) { st.puerta = ''; $('rec-puerta').value = ''; pintaRec(); }
    if (d.prueba) lee(d.prueba);
    // En el demo no se pide la cámara: se muestra el estado que vería quien la tiene bloqueada.
    if (d.camara) resultado(tarjeta('ka-aviso', '⚠', 'No tenemos acceso a la cámara', 'Actívala en los ajustes del navegador. Mientras, busca a cada niño por nombre o ID.', '<div class="ka-acciones"><button class="button primary" type="button" data-foco="rec-buscar">Buscar por nombre o ID</button></div>'));
    if (d.listaPrueba === 'error') { st.lista = 'error'; pintaRec(); }
    if (d.listaPrueba === 'cargando' || d.listaReintenta) { st.lista = 'cargando'; pintaRec(); setTimeout(() => { st.lista = ''; pintaRec(); }, 1500); }
    if (d.temporal) { const a = alumno(d.temporal); a.gafete = 'temporal'; $('rec-msg').textContent = `Gafete temporal en blanco vinculado a ${a.id}. Sirve solo hoy; coordinación imprime el definitivo (ejemplo).`; }
    if (d.lee) { if (d.origen) st.origenBusqueda = d.origen; lee(d.lee); }
    if (d.confirma) { const a = alumno(d.confirma); st.modo = 'entrada'; if (st.puerta && a.grupo !== st.puerta) lee(d.confirma); else confirmaEntrada(d.confirma, 'Lista de avisos'); }
    if (d.entrada) { confirmaEntrada(d.entrada, st.origenBusqueda || d.origen); st.origenBusqueda = ''; }
    if (d.foco) { $(d.foco).focus(); }
    if (d.alta) altaForm();
    if (t.id === 'rec-alta') altaForm();
    if (t.id === 'rec-cambiar-servicio') cambiaServicio();
    if (d.etiqueta) $('rec-msg').textContent = 'Etiqueta enviada a la impresora de ejemplo.';
    if (d.deshacer) { if (deshacer()) { pintaTodo(); resultado('<p role="status">Entrada deshecha. El niño vuelve a su estado anterior.</p>'); } }
    if (d.deshacerEntrega) { const r = st.registros.get(d.deshacerEntrega); if (r && r.estado === 'Entregado') { r.estado = 'Dentro'; r.entrega = null; const i = st.bitacora.map(x => x.id === d.deshacerEntrega && x.tipo === 'Entrega').lastIndexOf(true); if (i >= 0) st.bitacora.splice(i, 1); pintaTodo(); resultado('<p role="status">Entrega deshecha. El niño sigue «Dentro».</p>'); } }
    if (d.avisoCoord) { avanza(); pintaRec(); resultado(tarjeta('ka-aviso', '☎', 'Avisamos a Coordinación', `${hm(st.m)} · motivo registrado para ${esc(d.avisoCoord)}. Coordinación en camino.`, '<div class="ka-acciones"><button class="button primary" type="button" data-foco="rec-codigo">Escanear siguiente</button></div>')); }
    if (d.valida) { const r = st.registros.get(d.valida); r.pendiente = null; avanza(); evento(st.m, d.valida, 'Corrección', 'Adulto validado por coordinación', 'Coordinación de ejemplo'); pintaTodo(); }
    if (t.id === 'rec-sync-ahora') { $('rec-offline').checked = false; $('rec-offline').dispatchEvent(new Event('change', { bubbles: true })); }
  });
  function cambiaServicio() {
    modal('¿Qué servicio es?', `<p class="muted">Lo calculamos por la hora (${hm(st.m)}). Cámbialo si el servicio va retrasado.</p><form id="ka-servicio"><fieldset>${SERVICIOS.map(([n, h], si) => `<label class="checkline"><input type="radio" name="serv" value="${si}"${si === st.si ? ' checked' : ''}> <span>${esc(n)} · ${esc(h.split(' a ')[0])}<small>${si === sugerido() ? 'Sugerido' : inicioServicio(si) + 120 < st.m ? 'Terminó' : 'Abre ' + hm(inicioServicio(si) - 30)}</small></span></label>`).join('')}</fieldset><div class="ka-acciones"><button class="button primary" type="submit">Usar este servicio</button><button class="button" type="button" data-cerrar="1">Cancelar</button></div></form>`);
  }
  dialogo.addEventListener('submit', e => {
    if (e.target.id === 'ka-servicio') { e.preventDefault(); st.si = Number(e.target.elements.serv.value); dialogo.close(); pintaTodo(); }
    if (e.target.id === 'ka-alta') {
      e.preventDefault();
      const nombre = $('alta-nombre').value.trim(), adulto = $('alta-adulto').value.trim(), tel = $('alta-tel').value.trim(), edad = Number($('alta-edad').value);
      const err = !nombre ? 'Escribe el nombre del niño.' : !(edad >= 3 && edad <= 12) ? 'La edad debe estar entre 3 y 12 años.' : !adulto ? 'Escribe el nombre del adulto responsable.' : !/^\d{10}$/.test(tel) ? 'El teléfono debe tener 10 dígitos.' : !$('alta-datos').checked ? 'El adulto debe aceptar el aviso de privacidad para registrar al niño.' : '';
      if (err) { $('alta-msg').textContent = err; return; }
      const a = altaRapida({ nombre, edad, grupo: $('alta-grupo-sel').value, adulto, atencion: dialogo.querySelector('[name=alergia]:checked').value === 'si' });
      const r = st.registros.get(a.id);
      dialogo.close(); pintaTodo();
      resultado(tarjeta('ka-ok', '✓', `Dentro · ${hm(r.m)}`, `${esc(a.nombre)} · ${esc(NOMBRE_GRUPO[a.grupo])} · ${SIGLA[r.si]}`, `<div class="ka-codigo"><span>${esc(a.id)} · Registro provisional</span><small>Coordinación lo completa o lo une a un registro existente. Ya cuenta en el pase de lista.</small></div><div class="ka-codigo"><span>Código de recogida</span><strong>${esc(r.codigo)}</strong><small>Entrégalo al adulto. Solo ${esc(adulto)} puede recoger hoy.</small></div><div class="ka-acciones"><button class="button" type="button" data-etiqueta="${a.id}">Imprimir gafete</button><button class="button" type="button" data-temporal="${a.id}">Escanear gafete temporal en blanco</button><button class="button primary" type="button" data-foco="rec-codigo">Escanear siguiente</button></div><p class="form-status" id="rec-msg" role="status"></p>`));
    }
  });
  dialogo.addEventListener('click', e => {
    const b = e.target.closest('[data-edad]');
    if (b) { const i = $('alta-edad'); i.value = Math.min(12, Math.max(3, Number(i.value || 5) + Number(b.dataset.edad))); sugiereGrupo(); }
  });
  dialogo.addEventListener('change', e => {
    if (e.target.id === 'alta-edad') sugiereGrupo();
    if (e.target.name === 'alergia') $('alta-nota-caja').hidden = e.target.value !== 'si';
  });

  // ---------- Docente · Mi grupo hoy ----------
  addDemoView('lista', 'Mi grupo hoy', 'check', 'QUIÉN VINO HOY', 'Cada niño, <em>contado.</em>', 'La lista se llena sola con los check-ins de recepción. Corrige solo cuando algo no cuadre, con su motivo.', `
<div class="module-toolbar"><span class="badge" id="mg-grupo"></span><span id="mg-actualiza" class="muted" role="status"></span></div>
<div class="stats" id="mg-stats"></div>
<div class="grid"><section class="card" aria-labelledby="mg-dentro-t"><h2 id="mg-dentro-t">Dentro</h2><div id="mg-dentro"></div></section>
<section class="card" aria-labelledby="mg-esp-t"><h2 id="mg-esp-t">Esperados</h2><p class="muted">Avisaron que vienen y aún no pasan por recepción.</p><div id="mg-esperados"></div>
<h3>Entrega</h3><button class="button" type="button" disabled aria-describedby="mg-entrega-ayuda">Registrar entrega</button><p class="muted" id="mg-entrega-ayuda">Tu perfil no tiene permiso de entrega. Las entregas se hacen en recepción.</p></section></div>
<p class="form-status" id="mg-estado" role="status"></p>`);
  const gDocente = () => (window.ShalomKidsAsistencia.grupoDe || (n => (DOCENTES.indexOf(n) < 4 ? '4 a 6' : '7 a 12')))(sesion.docente);
  function pintaLista() {
    const g = gDocente(), c = cuenta(g), rs = delGrupo(g);
    $('mg-grupo').textContent = `${NOMBRE_GRUPO[g]} · ${g} años · ${SERVICIOS[st.si][0]} · ${SERVICIOS[st.si][1].split(' a ')[0]}`;
    $('mg-actualiza').textContent = 'Se actualiza con recepción. Solo tu grupo.';
    $('mg-stats').innerHTML = `<div class="stat"><strong>${c.dentro}</strong>Dentro</div><div class="stat"><strong>${c.esperados}</strong>Esperados</div><div class="stat"><strong>${c.entregados}</strong>Entregados</div>`;
    const dentro = rs.filter(r => r.estado === 'Dentro').sort((a, b) => b.m - a.m);
    $('mg-dentro').innerHTML = dentro.length ? `<ul class="ka-lista">${dentro.map(r => { const a = alumno(r.id); return `<li><div><strong>${esc(a.nombre)}</strong>${atencion(a)}<small>${esc(a.id)} · ${hm(r.m)} · ${r.corregido ? `Corregido por ${r.corregido.quien === sesion.docente ? 'ti' : esc(r.corregido.quien)}` : r.pendiente ? 'Entrega pendiente' : esc(origenCorto(r))}</small></div><button class="button" type="button" data-corregir="${r.id}">Corregir<span class="sr-only"> a ${esc(a.nombre)}</span></button></li>`; }).join('')}</ul>` : '<p class="muted">Nadie ha entrado todavía.</p>';
    const esp = rs.filter(r => r.estado === 'Por confirmar').sort((a, b) => a.m - b.m);
    $('mg-esperados').innerHTML = esp.length ? `<ul class="ka-lista">${esp.map(r => { const a = alumno(r.id); return `<li><div><strong>${esc(a.nombre)}</strong>${atencion(a)}<small>${esc(a.id)} · avisó ${hm(r.m)} · Por confirmar</small></div><button class="button" type="button" data-doc-entrada="${r.id}">Registrar entrada<span class="sr-only"> de ${esc(a.nombre)}</span></button></li>`; }).join('')}</ul>` : '<p class="muted">Nadie más avisó para este servicio.</p>';
  }
  $('lista').addEventListener('click', e => {
    const c = e.target.closest('[data-corregir]'), en = e.target.closest('[data-doc-entrada]');
    if (en) { const id = en.dataset.docEntrada; entrada(id, 'Docente'); st.undo = null; const r = st.registros.get(id); r.corregido = undefined; const ev = st.bitacora[st.bitacora.length - 1]; ev.quien = sesion.docente; pintaTodo(); $('mg-estado').textContent = `${alumno(id).nombre} entró (registrado por ti; ejemplo).`; }
    if (c) {
      const id = c.dataset.corregir, a = alumno(id), r = st.registros.get(id);
      modal(`Corregir · ${esc(a.nombre)}`, `<p>Ahora: ${esc(r.estado)} desde ${hm(r.m)} (${esc(origenCorto(r))}, recepción).</p><form id="ka-corregir" novalidate><input type="hidden" id="cor-id" value="${id}"><fieldset><legend>¿Qué pasó?</legend><label class="checkline"><input type="radio" name="que" value="servicio" checked> Está en otro servicio</label><label class="checkline"><input type="radio" name="que" value="fuera"> No está en el salón</label><label class="checkline"><input type="radio" name="que" value="entregado"> Ya se entregó (sin lectura)</label></fieldset>
<div id="cor-serv-caja"><label for="cor-serv">Servicio</label><select id="cor-serv">${SERVICIOS.map(([n], si) => `<option value="${si}"${si === r.si ? '' : ''}>${n}</option>`).join('')}</select></div>
<label for="cor-motivo">Motivo (obligatorio)</label><input id="cor-motivo" type="text" maxlength="120" required><p class="muted">La lectura original se conserva. La corrección queda con tu nombre y la hora en la bitácora.</p><p class="form-status" id="cor-msg" role="alert"></p><div class="ka-acciones"><button class="button primary" type="submit">Guardar corrección</button><button class="button" type="button" data-cerrar="1">Cancelar</button></div></form>`);
      $('cor-serv').value = String(r.si === 0 ? 1 : 0);
    }
  });
  dialogo.addEventListener('change', e => { if (e.target.name === 'que') $('cor-serv-caja').hidden = e.target.value !== 'servicio'; });
  dialogo.addEventListener('submit', e => {
    if (e.target.id !== 'ka-corregir') return;
    e.preventDefault();
    const motivo = $('cor-motivo').value.trim();
    if (!motivo) { $('cor-msg').textContent = 'Escribe el motivo de la corrección.'; return; }
    const id = $('cor-id').value;
    corregir(id, e.target.elements.que.value, motivo, Number($('cor-serv').value));
    dialogo.close(); pintaTodo();
    $('mg-estado').textContent = `Corrección guardada para ${alumno(id).nombre}. Queda con tu nombre en la bitácora.`;
  });

  // ---------- Familia · Mis hijos ----------
  const HIJOS = ['K-101', 'K-201'];
  const sel = { 'K-101': 1, 'K-201': 1 };
  let qr = 'A7F3-92KD', qrVence = Date.now() + 300000;
  // Opinión una sola vez por entrega: clave niño-servicio. En memoria, como el resto del demo.
  const opiniones = {};
  const VALORES = ['Bien', 'Muy bien', 'Mejorable'], DESTACA = ['Entrada rápida', 'Maestros', 'Actividad', 'Entrega'];
  const restante = () => { const s = Math.max(0, Math.ceil((qrVence - Date.now()) / 1000)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
  const renuevaQr = () => { qr = `${codigo()}-${codigo()}`; qrVence = Date.now() + 300000; };
  setInterval(() => { const t = document.getElementById('fam-qr-tiempo'); if (!t) return; if (Date.now() >= qrVence) { renuevaQr(); pintaFamilia(); } else t.textContent = restante(); }, 1000);
  const opinionCard = (id, r) => {
    const a = alumno(id), k = `${id}-${r.si}`, o = opiniones[k];
    if (o?.omitida || o?.visto) return '';
    if (o) return `<section class="card ka-opinion" aria-labelledby="op-t-${id}"><h2 id="op-t-${id}">Gracias por contarnos</h2><p>La coordinación de Kids lee cada opinión. Si pediste que te contactemos, te escribimos esta semana.</p><p class="muted">LO QUE ENVIASTE</p><p><strong>${esc(o.valor)}</strong>${o.bien.length ? ` · ${o.bien.map(esc).join(', ')}` : ''}</p>${o.texto ? `<p>${esc(o.texto)}</p>` : ''}<p class="muted">Shalom Kids · ${SIGLA[r.si]} servicio · ${fecha(HOY)}. En la app real llega a «Tu opinión» con el área Shalom Kids ya elegida.</p><button class="button" type="button" data-fam-volver="${k}">Volver a Mis hijos</button></section>`;
    return `<section class="card ka-opinion" aria-labelledby="op-t-${id}"><h2 id="op-t-${id}">Tu opinión</h2><p class="muted">Shalom Kids · ${SIGLA[r.si]} servicio · ${fecha(HOY)}</p><p>${esc(a.nombre)} fue entregado a las ${hm(r.entrega.m)}.</p>
<form data-fam-opinion="${k}" novalidate><fieldset><legend>¿Cómo les fue hoy?</legend><div class="ka-chips">${VALORES.map(v => `<label class="checkline"><input type="radio" name="valor" value="${v}"> ${v}</label>`).join('')}</div></fieldset>
<fieldset><legend>¿Qué salió bien? · opcional</legend><div class="ka-chips">${DESTACA.map(v => `<label class="checkline"><input type="checkbox" name="bien" value="${v}"> ${v}</label>`).join('')}</div></fieldset>
<label for="op-txt-${id}">¿Qué podemos mejorar? · opcional</label><textarea id="op-txt-${id}" name="texto" maxlength="500" aria-describedby="op-ayuda-${id}"></textarea><p class="muted" id="op-ayuda-${id}">No escribas nombres de otros niños.</p>
<p class="form-status" role="alert" data-op-msg></p><div class="ka-acciones"><button class="button primary" type="submit">Enviar opinión</button><button class="button" type="button" data-fam-op-no="${k}">Ahora no</button></div></form></section>`;
  };
  addDemoView('familia', 'Mis hijos', 'heart', 'SHALOM KIDS · FAMILIAS', 'Mis hijos, <em>domingo a domingo.</em>', 'Avisa a qué servicio vienen, muestra el QR en la puerta y sigue su estado en vivo.', `<div class="grid ka-fam"><div id="fam-hijos"></div><section class="card" aria-labelledby="fam-qr-t"><h2 id="fam-qr-t">QR de check-in para la puerta</h2><div id="fam-qr"></div></section></div>`);
  const famEstado = (id) => {
    const r = st.registros.get(id), pasos = [['Avisaste que viene', r ? hm(r.avisoM ?? (r.estado === 'Por confirmar' ? r.m : r.m)) : ''], ['Dentro', r && (r.estado === 'Dentro' || r.estado === 'Entregado') ? `Entró ${hm(r.m)}, confirmado en recepción` : 'Se confirma en la puerta'], ['Entregado', r?.entrega ? `${hm(r.entrega.m)} · ${esc(r.entrega.adulto)}` : 'Al terminar, cerca de 12:30 PM']];
    const nivel = !r ? -1 : r.estado === 'Por confirmar' ? 0 : r.estado === 'Dentro' ? 1 : 2;
    return `<ol class="ka-pasos">${pasos.map((p, i) => `<li${i <= nivel ? ' class="hecho"' : ''}${i === nivel ? ' aria-current="step"' : ''}><strong>${p[0]}</strong><small>${i <= nivel || i === 2 || i === 1 ? p[1] : ''}</small></li>`).join('')}</ol>`;
  };
  function pintaFamilia() {
    $('fam-hijos').innerHTML = HIJOS.map(id => {
      const a = alumno(id), r = st.registros.get(id), avisado = r && r.si === sel[id] && r.estado === 'Por confirmar', dentro = r && (r.estado === 'Dentro' || r.estado === 'Entregado');
      return `<section class="card" aria-label="${esc(a.nombre)}"><h2>${esc(a.nombre)}</h2><p class="muted">${esc(NOMBRE_GRUPO[a.grupo])} · ${a.edad} años</p>
${dentro ? '' : `<label for="fam-s-${id}">¿A qué servicio?</label><select id="fam-s-${id}" data-fam-serv="${id}">${SERVICIOS.map(([n, h], si) => `<option value="${si}"${sel[id] === si ? ' selected' : ''}>${SIGLA[si]} · ${esc(h.split(' a ')[0])}</option>`).join('')}</select>${avisado ? `<div class="ka-acciones"><span class="badge">Por confirmar · ${SIGLA[r.si]} servicio</span><button class="button" type="button" data-fam-no="${id}">Ya no viene</button></div>` : `<button class="button primary" type="button" data-fam-avisa="${id}">Avisar que viene hoy</button><p class="muted">Avisar ayuda a preparar la clase. La entrada se confirma en la puerta.</p>`}`}
${r ? famEstado(id) : ''}${dentro && r.codigo ? `<div class="ka-codigo"><span>Código de recogida</span><strong>${esc(r.estado === 'Entregado' ? '····' : r.codigo)}</strong><small>${r.estado === 'Entregado' ? 'Ya se usó.' : 'Muéstralo al recoger. Quien recoja debe estar autorizado.'}</small></div><p class="muted">Pueden recoger hoy: ${AUTORIZADOS.map(x => esc(x[0])).join(' · ')}</p><button class="button" type="button" data-fam-aut="1">Administrar autorizaciones</button>` : ''}</section>${r?.estado === 'Entregado' && r.entrega ? opinionCard(id, r) : ''}`;
    }).join('');
    const avisados = HIJOS.filter(id => st.registros.get(id)?.estado === 'Por confirmar');
    $('fam-qr').innerHTML = avisados.length ? `<p><strong>Muéstralo en la puerta</strong></p><div class="ka-qr" aria-hidden="true"></div><p><strong>${esc(qr)}</strong> · código opaco generado en el servidor</p><p class="badge">Se renueva en <span id="fam-qr-tiempo">${restante()}</span></p><p>${avisados.map(id => esc(alumno(id).nombre)).join(' y ')} · los avisos de hoy</p><p class="muted">Este código no contiene datos personales. Solo funciona hoy y caduca a los 5 minutos. Sube el brillo de la pantalla si no lo leen.</p><button class="button" type="button" id="fam-renueva">Renovar código</button>` : '<p class="muted">Avisa que viene a tu hijo para generar el QR. Un solo QR familiar da entrada a todos los hijos con aviso; recepción confirma cada niño.</p>';
  }
  $('familia').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.famAvisa) { avisar(b.dataset.famAvisa, sel[b.dataset.famAvisa]); pintaTodo(); }
    if (b.dataset.famNo) { cancelaAviso(b.dataset.famNo); pintaTodo(); }
    if (b.id === 'fam-renueva') { renuevaQr(); pintaFamilia(); }
    if (b.dataset.famOpNo) { opiniones[b.dataset.famOpNo] = { omitida: true }; pintaFamilia(); }
    if (b.dataset.famVolver) { opiniones[b.dataset.famVolver].visto = true; pintaFamilia(); $('fam-hijos').querySelector('h2')?.focus?.(); }
    if (b.dataset.famAut) modal('Quién puede recoger', `<p class="muted">Adultos autorizados para recoger a tus hijos. No mostramos teléfonos en esta lista.</p><ul class="ka-lista">${AUTORIZADOS.map(([n, d]) => `<li><div><strong>${esc(n)}</strong><small>${esc(d)}</small></div></li>`).join('')}</ul><p>Agregar o quitar a un adulto se confirma con coordinación en persona: así nadie cambia quién recoge solo desde un celular.</p><p class="form-status" role="status" id="fam-aut-msg"></p><div class="ka-acciones"><button class="button primary" type="button" id="fam-aut-pide">Pedir un cambio a coordinación</button><button class="button" type="button" data-cerrar="1">Cerrar</button></div>`);
  });
  dialogo.addEventListener('click', e => { if (e.target.id === 'fam-aut-pide') $('fam-aut-msg').textContent = 'Solicitud enviada a coordinación (ejemplo). Te atenderán en recepción el próximo domingo.'; });
  $('familia').addEventListener('submit', e => {
    const f = e.target.closest('[data-fam-opinion]'); if (!f) return;
    e.preventDefault();
    const valor = f.elements.valor.value;
    if (!VALORES.includes(valor)) { f.querySelector('[data-op-msg]').textContent = 'Elige cómo les fue hoy.'; f.querySelector('[name=valor]').focus(); return; }
    opiniones[f.dataset.famOpinion] = { valor, bien: [...f.querySelectorAll('[name=bien]:checked')].map(x => x.value).filter(v => DESTACA.includes(v)), texto: f.elements.texto.value.trim().slice(0, 500) };
    pintaFamilia();
    $('fam-hijos').querySelector('.ka-opinion h2')?.setAttribute('tabindex', '-1');
    $('fam-hijos').querySelector('.ka-opinion h2')?.focus();
  });
  $('familia').addEventListener('change', e => { if (e.target.dataset.famServ) sel[e.target.dataset.famServ] = Number(e.target.value); });

  // ---------- Decisiones abiertas ----------
  const DECISIONES = [
    ['01', 'Check-in', '¿Quién confirma la entrada?', 'Recepción, el maestro en su puerta, o la familia con su QR (autoservicio).', 'Recepción confirma; el QR familiar solo acelera. El docente, con permiso.'],
    ['02', 'Gafete', '¿Gafete permanente o etiqueta por domingo?', 'Permanente: rápido, pero se pierde. Etiqueta: impresora en la puerta y papel cada semana.', 'Gafete permanente + etiqueta opcional con código de recogida.'],
    ['03', 'Visitantes', '¿Qué datos mínimos se piden?', 'Hoy: nombre, edad, un adulto con teléfono, alergias sí/no + nota y consentimiento. ¿Hace falta identificación del adulto?', 'Sin identificación; solo ese adulto recoge.'],
    ['04', 'Cupo', '¿Hay cupo por grupo y servicio?', 'Si existe, ¿qué pasa al llenarse: lista de espera, otro servicio o se recibe igual?', 'Sin cupo; el contador solo informa.'],
    ['05', 'Recogida', '¿Código de recogida obligatorio?', '¿Basta con el gafete y un adulto autorizado reconocido? ¿Qué hacer si la familia perdió el código?', 'Código + adulto autorizado; sin código, decide coordinación.'],
    ['06', 'Sin conexión', '¿Se permiten entregas sin red?', 'Entradas en cola son de bajo riesgo; una entrega sin validar autorización actualizada, no.', 'Entradas sí; entregas solo con lista descargada y revisión posterior.'],
    ['07', 'Servicios', 'Niños que se quedan dos servicios', '¿Cuenta como dos asistencias? ¿Necesita nueva entrada o pasa solo?', 'Un registro por servicio; recepción lo pasa con un toque.'],
    ['08', 'Atención', '¿Quién ve el detalle de alergias?', 'Recepción solo ve el indicador. ¿El docente del grupo ve el detalle del día o solo coordinación?', 'Docente del grupo, en expediente, ese día.'],
    ['09', 'Cierre', '¿Cuándo un «Por confirmar» pasa a «No vino»?', 'Al terminar el servicio, a cierta hora o cuando coordinación cierre el día.', 'Al terminar el servicio, automático.'],
  ];
  addDemoView('decisiones', 'Decisiones abiertas', 'shield', 'PARA DECIDIR CON LA IGLESIA', 'Lo que este demo supone <em>y falta decidir.</em>', 'Cada supuesto está implementado así en el demo; cámbialo cuando la iglesia decida otra cosa.', `<div class="ka-decisiones">${DECISIONES.map(([n, tema, q, cuerpo, sup]) => `<article class="card"><p class="muted">${n} · ${tema.toUpperCase()}</p><h2>${q}</h2><p>${cuerpo}</p><p><strong>Supuesto:</strong> ${sup}</p></article>`).join('')}</div>`);

  function pintaTodo() {
    pintaRec(); pintaLista(); pintaFamilia();
    window.dispatchEvent(new CustomEvent('shalom-kids-asistencia'));
  }

  window.ShalomKidsAsistencia = {
    alumnos, alumno, st, hm, cuenta, delGrupo, entrada, unir, modal, dialogo, pintaTodo, SIGLA, NOMBRE_GRUPO, HOY, atencion, corregidas: () => st.correcciones,
    grupoDe: null,
  };
  window.addEventListener('shalom-kids-perfil', pintaTodo);
  window.addEventListener('shalom-kids-rol', pintaTodo);
  pintaTodo();
})();
