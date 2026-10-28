"use strict";
// Vistas de Shalom Kids por perfil, con la estructura del control de clases (Mi agenda, Pase de lista, Lecciones, Asistencia, Alumnos, Maestros, Configuración).
// Datos ficticios en memoria: nada se guarda ni se envía. En la app real el servidor decide el perfil y filtra cada registro.
(() => {
  const { SERVICIOS, GRUPOS, DOMINGOS, DOCENTES, calendario, sesion, quienDa, fecha, esc, refrescar } = window.ShalomKidsRol;
  const $ = id => document.getElementById(id);
  const PAGINAS = { '4 a 6': 12, '7 a 12': 18 };
  const LECCIONES = {
    L9: { '4 a 6': ['Unidad 3', 'Dios hizo todo'], '7 a 12': ['Unidad 3', 'Dios llama a Samuel'] },
    L10: { '4 a 6': ['Unidad 3', 'Noé confía en Dios'], '7 a 12': ['Unidad 3', 'David y Goliat'] },
    L11: { '4 a 6': ['Unidad 4', 'Abraham obedece'], '7 a 12': ['Unidad 4', 'Daniel ora'] },
    L12: { '4 a 6': ['Unidad 4', 'José perdona'], '7 a 12': ['Unidad 4', 'Jonás aprende'] },
  };
  const tema = (g, leccion) => LECCIONES[leccion]?.[g] || ['Por definir', 'Por definir'];
  const pagina = (g, leccion) => PAGINAS[g] + 4 * (Number(leccion.slice(1)) - 9);
  const MAESTROS = [
    ...DOCENTES.map((nombre, i) => ({ nombre, grupo: i < 4 ? '4 a 6' : '7 a 12', perfil: 'Docente', acceso: i === 3 ? 'Invitación pendiente' : 'Activo' })),
    { nombre: 'Coordinación de ejemplo', grupo: 'Ambos', perfil: 'Administración', acceso: 'Activo' },
  ];
  const grupoDe = nombre => MAESTROS.find(m => m.nombre === nombre)?.grupo || '4 a 6';
  const A = window.ShalomKidsAsistencia;
  const ALUMNOS = A.alumnos;
  A.grupoDe = grupoDe;
  const RESUMEN_PREVIO = [['2026-10-11', [7, 9, 5], [6, 8, 3], 3], ['2026-10-18', [8, 8, 4], [5, 7, 4], 0], ['2026-10-25', [6, 8, 4], [5, 7, 3], 1]];
  const SIGLA = A.SIGLA;
  const horario = si => SERVICIOS[si][1];

  /** Turnos de una persona con permutas ya aplicadas: como «Asignaciones» del archivo, que se arma sola. */
  function turnosDe(nombre) {
    const filas = [];
    DOMINGOS.forEach((f, i) => GRUPOS.forEach(([g]) => {
      const dia = calendario[g][i];
      SERVICIOS.forEach(([s], si) => dia.turnos[si].filter(Boolean).forEach(programado => {
        if (quienDa(g, f, s, programado) === nombre) filas.push({ f, g, s, si, puesto: programado === nombre ? 'Docente' : `Cubre a ${programado}`, leccion: dia.leccion });
      }));
      if (dia.encargado === nombre) filas.push({ f, g, s: 'Todo el día', si: -1, puesto: 'Encargado(a) del día', leccion: dia.leccion });
    }));
    return filas;
  }

  // ---------- Docente ----------
  addDemoView('agenda', 'Mi agenda', 'calendar', 'TUS PRÓXIMAS CLASES', 'Tu agenda, <em>sin sorpresas.</em>', 'Tus turnos con horario, tema y página del manual, con las permutas ya aplicadas.', `
<div class="module-toolbar"><span class="badge" id="agenda-quien"></span><span id="agenda-total" role="status"></span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Domingo</th><th scope="col">Grupo y servicio</th><th scope="col">Puesto</th><th scope="col">Lección</th></tr></thead><tbody id="agenda-filas"></tbody></table>
<p class="muted">Solo ves tus propios turnos. Para cambiar uno, registra una permuta en «Rol de clases».</p></section>`);
  function pintaAgenda() {
    const filas = turnosDe(sesion.docente);
    $('agenda-quien').textContent = `${sesion.docente} · ${grupoDe(sesion.docente)} años`;
    $('agenda-total').textContent = `${filas.length} ${filas.length === 1 ? 'turno' : 'turnos'} en el periodo de ejemplo`;
    $('agenda-filas').innerHTML = filas.map(r => {
      const [unidad, t] = tema(r.g, r.leccion);
      return `<tr><td>${fecha(r.f)}</td><td>${esc(r.g)} años · ${esc(r.s)}${r.si >= 0 ? `<small>${esc(horario(r.si))}</small>` : ''}</td><td>${esc(r.puesto)}</td><td>${esc(r.leccion)} · ${esc(t)}<small>${esc(unidad)} · pág. ${pagina(r.g, r.leccion)}</small></td></tr>`;
    }).join('') || '<tr><td colspan="4">No tienes turnos en este periodo.</td></tr>';
  }

  // ---------- Ambos perfiles ----------
  addDemoView('lecciones', 'Lecciones', 'book', 'EL TEMARIO DE CADA DOMINGO', 'Qué enseñamos <em>cada semana.</em>', 'Temario de los dos grupos, con la página del manual del maestro.', `
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Domingo</th><th scope="col">4 a 6 · Tesoros del Rey</th><th scope="col">7 a 12 · Primarios</th></tr></thead><tbody>${DOMINGOS.map((f, i) => {
    const l = calendario['4 a 6'][i].leccion;
    return `<tr><td>${fecha(f)}<small>${esc(l)}</small></td>${GRUPOS.map(([g]) => { const [u, t] = tema(g, l); return `<td>${esc(t)}<small>${esc(u)} · pág. ${pagina(g, l)}</small></td>`; }).join('')}</tr>`;
  }).join('')}</tbody></table><p class="muted" id="lecciones-nota"></p></section>`);

  // ---------- Administración ----------
  addDemoView('asistencia', 'Asistencia', 'users', 'CUÁNTOS NIÑOS VINIERON', 'La asistencia, <em>de un vistazo.</em>', 'Todo sale de las lecturas de recepción y las correcciones de los docentes. Nadie captura aparte.', `
<div class="subheading"><h2>Resumen por domingo</h2><span>Debajo de cada total: 1er · 2° · 3er servicio</span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Domingo</th><th scope="col">Tesoros</th><th scope="col">Primarios</th><th scope="col">Total</th><th scope="col">Correcciones</th></tr></thead><tbody id="asistencia-resumen"></tbody></table>
<p class="muted">Cuenta niños con entrada confirmada (incluye provisionales y correcciones). Avisos sin llegada se reportan aparte como «No vino».</p><p class="muted" id="asistencia-novino" role="status"></p></section>
<div class="subheading"><h2>Bitácora</h2><span id="bitacora-titulo"></span></div>
<section class="card"><div class="ka-modos" role="group" aria-label="Filtrar la bitácora">${['Todo', 'Entradas', 'Entregas', 'Correcciones'].map(f => `<button type="button" class="button" data-bit="${f}" aria-pressed="${f === 'Todo'}">${f}</button>`).join('')}</div>
<table class="rol-resumen"><thead><tr><th scope="col">Hora</th><th scope="col">ID</th><th scope="col">Tipo</th><th scope="col">Origen</th><th scope="col">Quién</th></tr></thead><tbody id="bitacora-filas"></tbody></table></section>`);
  const TIPOS_BIT = { Entradas: ['Entrada'], Entregas: ['Entrega'], Correcciones: ['Corrección', 'Unión'] };
  function pintaAsistencia() {
    const cuenta = g => SIGLA.map((_, si) => A.delGrupo(g, si).filter(r => r.estado === 'Dentro' || r.estado === 'Entregado').length);
    const suma = xs => xs.reduce((a, b) => a + b, 0);
    const hoy = [A.HOY, cuenta('4 a 6'), cuenta('7 a 12'), A.corregidas()];
    const fila = ([f, a, b, c], enCurso) => `<tr><td>${fecha(f)}${enCurso ? ' <span class="badge">En curso</span>' : ''}</td><td><strong>${suma(a)}</strong><small>${a.map(n => n || '—').join(' · ')}</small></td><td><strong>${suma(b)}</strong><small>${b.map(n => n || '—').join(' · ')}</small></td><td><strong>${suma(a) + suma(b)}</strong></td><td>${c}</td></tr>`;
    $('asistencia-resumen').innerHTML = fila(hoy, true) + RESUMEN_PREVIO.slice().reverse().map(r => fila(r)).join('');
    const sinLlegar = [...A.st.registros.values()].filter(r => r.estado === 'Por confirmar').length;
    $('asistencia-novino').textContent = `${sinLlegar} ${sinLlegar === 1 ? 'aviso' : 'avisos'} sin llegada hoy; pasan a «No vino» al cerrar el servicio.`;
    const tipos = TIPOS_BIT[A.st.bitFiltro];
    const ev = A.st.bitacora.filter(e => !tipos || tipos.includes(e.tipo)).slice().sort((a, b) => b.m - a.m);
    $('bitacora-titulo').textContent = `${fecha(A.HOY)} · ${ev.length} ${ev.length === 1 ? 'registro' : 'registros'}`;
    $('bitacora-filas').innerHTML = ev.map(e => `<tr><td>${A.hm(e.m)}</td><td>${esc(e.id)}</td><td>${esc(e.tipo)}</td><td>${esc(e.origen)}</td><td>${esc(e.quien)}</td></tr>`).join('') || '<tr><td colspan="5">Sin registros con este filtro.</td></tr>';
    document.querySelectorAll('[data-bit]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bit === A.st.bitFiltro)));
  }
  $('asistencia').addEventListener('click', event => {
    const b = event.target.closest('[data-bit]');
    if (!b) return;
    A.st.bitFiltro = b.dataset.bit;
    pintaAsistencia();
  });

  addDemoView('alumnos', 'Alumnos y gafetes', 'sprout', 'REGISTRO DE NIÑOS', 'Cada niño, <em>en su grupo.</em>', 'Registro y gafetes. Aquí solo se corrigen edad, grupo o notas; los duplicados y provisionales se unen con cuidado.', `
<p class="notice" id="alumnos-aviso" role="status"></p>
<div class="module-toolbar"><div><label for="alumnos-buscar">Nombre o ID</label><input id="alumnos-buscar" type="search" autocomplete="off"></div><div><label for="alumnos-grupo">Grupo</label><select id="alumnos-grupo"><option value="">Todos</option>${GRUPOS.map(([g, n]) => `<option value="${g}">${g} años · ${n}</option>`).join('')}</select></div><span id="alumnos-total" role="status"></span></div>
<div class="ka-modos" role="group" aria-label="Filtrar por estado" id="alumnos-filtros"></div>
<div class="grid"><section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Gafete</th><th scope="col">Niño</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody id="alumnos-filas"></tbody></table>
<p class="form-status" id="alumnos-estado" role="status"></p><p class="muted">Sin fotos ni datos de contacto en esta lista. Las fotos de gafete se consultan en el expediente autorizado.</p></section>
<section class="card" id="alumnos-gafete" aria-labelledby="gafete-t"><h2 id="gafete-t">Gafete</h2><div id="gafete-cuerpo"><p class="muted">Elige un niño de la lista para ver su gafete.</p></div></section></div>`);
  let filtroEstado = 'Todos', gafeteId = '';
  const ESTADOS = [['Todos', () => true], ['Provisionales', a => a.provisional], ['Posible duplicado', a => a.estado === 'Posible duplicado'], ['Gafete inactivo', a => a.gafete === 'inactivo']];
  const visibles = () => {
    const g = $('alumnos-grupo').value, q = $('alumnos-buscar').value.trim().toLowerCase();
    return ALUMNOS.filter(a => a.estado !== 'Unido' && (!g || a.grupo === g) && (!q || a.nombre.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)));
  };
  function pintaAlumnos() {
    const lista = visibles(), prov = ALUMNOS.filter(a => a.provisional).length, dup = ALUMNOS.filter(a => a.estado === 'Posible duplicado').length;
    $('alumnos-aviso').textContent = prov || dup ? `${prov} ${prov === 1 ? 'registro provisional' : 'registros provisionales'} por completar y ${dup} ${dup === 1 ? 'posible duplicado' : 'posibles duplicados'}.` : 'Sin pendientes de registro.';
    $('alumnos-filtros').innerHTML = ESTADOS.map(([n, f]) => `<button type="button" class="button" data-estado="${n}" aria-pressed="${n === filtroEstado}">${n} · ${lista.filter(f).length}</button>`).join('');
    const filas = lista.filter(ESTADOS.find(([n]) => n === filtroEstado)[1]);
    $('alumnos-total').textContent = `${filas.length} niños de ejemplo`;
    $('alumnos-filas').innerHTML = filas.map(a => `<tr><td><button class="ka-enlace" type="button" data-gafete="${a.id}">${esc(a.id)}</button><small>${a.gafete === 'temporal' ? 'Temporal · ' : ''}${a.impresiones} ${a.impresiones === 1 ? 'impresión' : 'impresiones'}</small></td><td>${esc(a.nombre)}${A.atencion(a)}<small>${A.NOMBRE_GRUPO[a.grupo]} · ${a.edad} años${a.notas ? ` · ${esc(a.notas)}` : ''}</small></td><td><span class="badge">${esc(a.estado)}</span></td><td>${a.provisional || a.estado === 'Posible duplicado' ? `<button class="button" type="button" data-unir="${a.id}">${a.provisional ? 'Completar o unir' : 'Unir con su registro'}</button>` : a.gafete === 'inactivo' ? `<button class="button" type="button" data-reimprime="${a.id}">Imprimir nuevo</button>` : `<button class="button" type="button" data-gafete="${a.id}">Ver</button>`}</td></tr>`).join('') || '<tr><td colspan="4">Ningún niño coincide con el filtro.</td></tr>';
    pintaGafete();
  }
  function pintaGafete() {
    const a = ALUMNOS.find(x => x.id === gafeteId);
    if (!a) return;
    const lecturas = A.st.bitacora.filter(e => e.id === a.id && e.tipo === 'Entrada').length;
    $('gafete-cuerpo').innerHTML = `<div class="ka-qr" aria-hidden="true"></div><p><strong>${esc(a.nombre)}</strong><small>${A.NOMBRE_GRUPO[a.grupo]} · ${esc(a.id)}</small></p><dl class="ka-datos"><dt>Impresiones</dt><dd>${a.impresiones}</dd><dt>Última impresión</dt><dd>${esc(a.ultimaImpresion || (a.impresiones ? '18 oct 2026' : 'Sin imprimir'))}</dd><dt>Lecturas hoy</dt><dd>${lecturas}</dd><dt>Lecturas este mes</dt><dd>${(a.impresiones ? 2 + (Number(a.id.slice(-1)) % 4) : 0) + lecturas}</dd><dt>Estado del gafete</dt><dd>${a.gafete === 'activo' ? 'Activo' : a.gafete === 'temporal' ? 'Temporal' : 'Inactivo'}</dd></dl>
<div class="ka-acciones"><button class="button primary" type="button" data-reimprime="${a.id}">Reimprimir gafete</button><button class="button" type="button" data-desactiva="${a.id}"${a.gafete === 'inactivo' ? ' disabled' : ''}>Desactivar gafete perdido</button><button class="button" type="button" data-expediente="${a.id}">Abrir expediente autorizado</button></div>
<p class="muted">Al reimprimir, el QR anterior deja de funcionar. Quedará la ${a.impresiones + 1}ª impresión.</p>`;
  }
  $('alumnos-grupo').addEventListener('change', pintaAlumnos);
  $('alumnos-buscar').addEventListener('input', pintaAlumnos);
  $('alumnos').addEventListener('click', event => {
    const t = event.target.closest('button'); if (!t) return;
    const d = t.dataset, a = ALUMNOS.find(x => x.id === (d.gafete || d.unir || d.reimprime || d.desactiva || d.expediente));
    if (d.estado) { filtroEstado = d.estado; pintaAlumnos(); }
    if (d.gafete) { gafeteId = d.gafete; pintaGafete(); $('alumnos-estado').textContent = ''; }
    if (d.expediente) $('alumnos-estado').textContent = `El expediente de ${a.nombre} (contacto, salud y fotos) se abre solo con permiso de coordinación y queda en la bitácora. Este demo no tiene datos reales.`;
    if (d.reimprime) { a.impresiones += 1; a.ultimaImpresion = fecha(DOMINGOS[0]); if (a.gafete === 'inactivo') a.gafete = 'activo'; if (a.estado === 'Gafete inactivo') a.estado = 'Activo'; gafeteId = a.id; pintaAlumnos(); $('alumnos-estado').textContent = `Gafete de ${a.nombre} reimpreso (${a.impresiones}ª impresión). El QR anterior ya no funciona (ejemplo).`; }
    if (d.desactiva) { a.gafete = 'inactivo'; a.estado = 'Gafete inactivo'; pintaAlumnos(); $('alumnos-estado').textContent = `Gafete de ${a.nombre} desactivado. Si se escanea, recepción verá «Gafete desactivado».`; }
    if (d.unir) abreUnir(a);
  });
  /** Une un provisional o duplicado con el registro que queda; la asistencia de hoy se cuenta una sola vez. */
  function abreUnir(a) {
    const destinos = ALUMNOS.filter(x => x.id !== a.id && x.estado !== 'Unido' && !x.provisional && x.estado !== 'Posible duplicado');
    const sugerido = a.duplicaDe || destinos.find(x => x.id === 'K-109')?.id || destinos[0].id;
    A.modal('Unir registros', `<h3>¿${esc(a.nombre)} es el mismo niño que otro registro?</h3><form id="unir-form"><label for="unir-destino">Registro que queda</label><select id="unir-destino">${destinos.map(x => `<option value="${x.id}"${x.id === sugerido ? ' selected' : ''}>${esc(x.id)} · ${esc(x.nombre)} · ${x.edad} años</option>`).join('')}</select>
<p class="muted">Se retira ${esc(a.id)}. La asistencia de hoy pasa al registro que queda y se cuenta una sola vez. El gafete temporal deja de funcionar. Queda en la bitácora.</p><div class="ka-acciones"><button class="button primary" type="submit">Unir registros</button><button class="button" type="button" data-cerrar="1">Cancelar</button></div><input type="hidden" id="unir-id" value="${a.id}"></form>`);
  }
  A.dialogo.addEventListener('submit', event => {
    if (event.target.id !== 'unir-form') return;
    event.preventDefault();
    const id = $('unir-id').value, destino = $('unir-destino').value;
    A.unir(id, destino);
    A.dialogo.close();
    A.pintaTodo();
    $('alumnos-estado').textContent = `${id} quedó unido a ${destino}. La asistencia se cuenta en un solo registro.`;
  });

  addDemoView('maestros', 'Maestros', 'users', 'EL EQUIPO DOCENTE', 'Quién enseña <em>y cuándo.</em>', 'Lista del equipo, su perfil de acceso, clases asignadas y próxima fecha.', `
<div class="grid"><section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Maestro</th><th scope="col">Perfil y acceso</th><th scope="col">Clases</th></tr></thead><tbody id="maestros-filas"></tbody></table>
<p class="muted">Teléfonos y correos solo se consultan en el expediente del maestro; no se muestran en listas.</p></section>
<section class="card preparation"><span class="icon-box sand">${icon('users')}</span><h2>Agregar maestro</h2><form id="maestros-form" novalidate>
<label for="maestros-nombre">Nombre</label><input id="maestros-nombre" type="text" maxlength="60" placeholder="Docente G" required>
<label for="maestros-grupo">Grupo</label><select id="maestros-grupo">${GRUPOS.map(([g, n]) => `<option value="${g}">${g} años · ${n}</option>`).join('')}</select>
<label for="maestros-perfil">Perfil</label><select id="maestros-perfil"><option>Docente</option><option>Administración</option></select>
<button class="button primary" type="submit">Agregar e invitar</button><p class="form-status" id="maestros-estado" role="status"></p></form></section></div>`);
  function pintaMaestros() {
    $('maestros-filas').innerHTML = MAESTROS.map(m => {
      const t = m.perfil === 'Docente' ? turnosDe(m.nombre).filter(r => r.si >= 0) : [];
      return `<tr><td>${esc(m.nombre)}<small>${esc(m.grupo)}${m.grupo === 'Ambos' ? '' : ' años'}</small></td><td>${esc(m.perfil)}<small>${esc(m.acceso)}</small></td><td>${m.perfil === 'Docente' ? `<strong>${t.length}</strong><small>${t.length ? `Próxima: ${fecha(t[0].f)}` : 'Sin turnos'}</small>` : '<small>No da clases</small>'}</td></tr>`;
    }).join('');
  }
  $('maestros-form').addEventListener('submit', event => {
    event.preventDefault();
    const nombre = $('maestros-nombre').value.trim();
    if (!nombre) { $('maestros-estado').textContent = 'Escribe el nombre.'; return; }
    if (MAESTROS.some(m => m.nombre.toLowerCase() === nombre.toLowerCase())) { $('maestros-estado').textContent = 'Ya está en la lista.'; return; }
    const perfil = $('maestros-perfil').value;
    MAESTROS.splice(MAESTROS.length - 1, 0, { nombre, grupo: perfil === 'Docente' ? $('maestros-grupo').value : 'Ambos', perfil, acceso: 'Invitación pendiente' });
    if (perfil === 'Docente') { DOCENTES.push(nombre); const o = document.createElement('option'); o.textContent = nombre; $('rol-cubre').append(o); }
    $('maestros-nombre').value = '';
    pintaMaestros();
    $('maestros-estado').textContent = `${nombre} se agregó como ${perfil.toLowerCase()} (ejemplo; no se envió la invitación).`;
  });

  addDemoView('configuracion', 'Configuración', 'grid', 'HORARIOS DE LOS SERVICIOS', 'Un cambio, <em>en todas partes.</em>', 'Si cambia un horario, se modifica aquí y se actualiza en el rol, las agendas y Recepción.', `
<section class="card"><form id="config-form" novalidate><table class="rol-resumen"><thead><tr><th scope="col">Servicio</th><th scope="col">Inicio</th><th scope="col">Fin</th></tr></thead><tbody>${SERVICIOS.map(([s], si) => {
    const [ini, fin] = ['09:00', '10:30', '11:00', '12:30', '13:00', '14:30'].slice(si * 2, si * 2 + 2);
    return `<tr><td>${s}</td><td><input type="time" id="config-ini-${si}" aria-label="Inicio del ${s}" value="${ini}" required></td><td><input type="time" id="config-fin-${si}" aria-label="Fin del ${s}" value="${fin}" required></td></tr>`;
  }).join('')}</tbody></table><button class="button primary" type="submit">Guardar horarios de prueba</button><p class="form-status" id="config-estado" role="status"></p></form></section>`);
  const h12 = v => { const [h, m] = v.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  $('config-form').addEventListener('submit', event => {
    event.preventDefault();
    const nuevos = SERVICIOS.map((_, si) => [$(`config-ini-${si}`).value, $(`config-fin-${si}`).value]);
    if (nuevos.some(([a, b]) => !a || !b || a >= b)) { $('config-estado').textContent = 'Cada servicio debe terminar después de empezar.'; return; }
    nuevos.forEach(([a, b], si) => { SERVICIOS[si][1] = `${h12(a)} a ${h12(b)}`; });
    refrescar(); pintaTodo();
    $('config-estado').textContent = 'Horarios actualizados en el rol y las agendas (ejemplo; se reinicia al recargar).';
  });

  function pintaTodo() {
    pintaAgenda(); pintaAsistencia(); pintaAlumnos(); pintaMaestros();
    $('lecciones-nota').textContent = sesion.perfil === 'admin' ? 'Administración actualiza el temario al inicio de cada periodo.' : 'Consulta: el temario lo actualiza administración.';
  }
  window.addEventListener('shalom-kids-rol', pintaTodo);
  window.addEventListener('shalom-kids-perfil', pintaTodo);
  window.addEventListener('shalom-kids-asistencia', pintaTodo);
  pintaTodo();
})();
