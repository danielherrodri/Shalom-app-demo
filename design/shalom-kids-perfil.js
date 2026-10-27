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
  const ALUMNOS = GRUPOS.flatMap(([g], gi) => 'ABCDEF'.split('').map((letra, i) => ({
    id: `K-${gi + 1}${String(i + 1).padStart(2, '0')}`, nombre: `Menor de ejemplo ${gi ? 'P' : ''}${letra}`, edad: gi ? 7 + i : 4 + (i % 3), grupo: g, impresiones: 1 + (i % 2), estado: 'Activo', notas: '',
  })));
  ALUMNOS.push({ id: 'K-107', nombre: 'Menor de ejemplo C', edad: 5, grupo: '4 a 6', impresiones: 1, estado: 'Posible duplicado', notas: 'Registrado dos veces en recepción' });
  // Pase de lista: «fecha|ID» → servicio al que vino (1°, 2° o 3°). Vacío = falta.
  const asistencia = new Map([[`${DOMINGOS[0]}|K-101`, '1°'], [`${DOMINGOS[0]}|K-102`, '2°'], [`${DOMINGOS[0]}|K-201`, '1°']]);
  const RESUMEN_PREVIO = [['2026-10-11', [7, 9, 5], [6, 8, 3]], ['2026-10-18', [8, 8, 4], [5, 7, 4]], ['2026-10-25', [6, 8, 4], [5, 7, 3]]];
  const BITACORA = [['2026-10-25', '8:52 AM', 'K-101', '4 a 6', '1°', 'Entrada'], ['2026-10-25', '10:41 AM', 'K-101', '4 a 6', '1°', 'Entrega'], ['2026-10-25', '10:56 AM', 'K-203', '7 a 12', '2°', 'Entrada']];
  const SIGLA = ['1°', '2°', '3°'];
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

  addDemoView('lista', 'Pase de lista', 'check', 'QUIÉN VINO HOY', 'Cada niño, <em>contado.</em>', 'Marca a qué servicio vino cada niño de tu grupo. Vacío = falta.', `
<div class="module-toolbar"><div><label for="lista-fecha">Domingo</label><select id="lista-fecha">${DOMINGOS.map(f => `<option value="${f}">${fecha(f)}</option>`).join('')}</select></div><span class="badge" id="lista-grupo"></span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Niño</th><th scope="col">Servicio al que vino</th></tr></thead><tbody id="lista-filas"></tbody></table>
<p class="form-status" id="lista-estado" role="status"></p></section>`);
  function pintaLista() {
    const g = grupoDe(sesion.docente), f = $('lista-fecha').value;
    const ninos = ALUMNOS.filter(a => a.grupo === g && a.estado === 'Activo');
    $('lista-grupo').textContent = `Solo tu grupo · ${g} años`;
    $('lista-filas').innerHTML = ninos.map(a => `<tr><td>${esc(a.nombre)}<small>${esc(a.id)}</small></td><td><select id="lista-${a.id}" aria-label="Servicio de ${esc(a.nombre)}" data-alumno="${a.id}"><option value="">Falta</option>${SIGLA.map(x => `<option${asistencia.get(`${f}|${a.id}`) === x ? ' selected' : ''}>${x}</option>`).join('')}</select></td></tr>`).join('');
    const presentes = ninos.filter(a => asistencia.has(`${f}|${a.id}`)).length;
    $('lista-estado').textContent = `${presentes} de ${ninos.length} presentes (ejemplo; se reinicia al recargar).`;
  }
  $('lista-fecha').addEventListener('change', pintaLista);
  $('lista-filas').addEventListener('change', event => {
    const id = event.target.dataset.alumno;
    if (!id || grupoDe(sesion.docente) !== ALUMNOS.find(a => a.id === id)?.grupo) return;
    const k = `${$('lista-fecha').value}|${id}`;
    if (event.target.value) asistencia.set(k, event.target.value); else asistencia.delete(k);
    pintaLista();
  });

  // ---------- Ambos perfiles ----------
  addDemoView('lecciones', 'Lecciones', 'book', 'EL TEMARIO DE CADA DOMINGO', 'Qué enseñamos <em>cada semana.</em>', 'Temario de los dos grupos, con la página del manual del maestro.', `
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Domingo</th><th scope="col">4 a 6 · Tesoros del Rey</th><th scope="col">7 a 12 · Primarios</th></tr></thead><tbody>${DOMINGOS.map((f, i) => {
    const l = calendario['4 a 6'][i].leccion;
    return `<tr><td>${fecha(f)}<small>${esc(l)}</small></td>${GRUPOS.map(([g]) => { const [u, t] = tema(g, l); return `<td>${esc(t)}<small>${esc(u)} · pág. ${pagina(g, l)}</small></td>`; }).join('')}</tr>`;
  }).join('')}</tbody></table><p class="muted" id="lecciones-nota"></p></section>`);

  // ---------- Administración ----------
  addDemoView('asistencia', 'Asistencia', 'users', 'CUÁNTOS NIÑOS VINIERON', 'La asistencia, <em>de un vistazo.</em>', 'Resumen por domingo y servicio de los dos grupos, y bitácora de gafetes.', `
<div class="subheading"><h2>Resumen por domingo</h2><span>Debajo de cada total: 1er · 2° · 3er servicio</span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Domingo</th><th scope="col">4 a 6</th><th scope="col">7 a 12</th><th scope="col">Total</th></tr></thead><tbody id="asistencia-resumen"></tbody></table>
<p class="muted">Los domingos de noviembre suman lo que marcan los docentes en «Pase de lista».</p></section>
<div class="subheading"><h2>Bitácora de gafetes</h2><span>Lecturas del código QR · ejemplo</span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Fecha y hora</th><th scope="col">Gafete</th><th scope="col">Grupo · servicio</th><th scope="col">Tipo</th></tr></thead><tbody>${BITACORA.map(([f, h, id, g, s, t]) => `<tr><td>${fecha(f)}<small>${h}</small></td><td>${id}</td><td>${g} años · ${s}</td><td>${t}</td></tr>`).join('')}</tbody></table></section>`);
  function pintaAsistencia() {
    const cuenta = (f, g) => SIGLA.map(x => ALUMNOS.filter(a => a.grupo === g && asistencia.get(`${f}|${a.id}`) === x).length);
    const filas = [...RESUMEN_PREVIO, ...DOMINGOS.map(f => [f, cuenta(f, '4 a 6'), cuenta(f, '7 a 12')])];
    const suma = xs => xs.reduce((a, b) => a + b, 0);
    $('asistencia-resumen').innerHTML = filas.slice().reverse().map(([f, a, b]) => `<tr><td>${fecha(f)}</td><td><strong>${suma(a)}</strong><small>${a.join(' · ')}</small></td><td><strong>${suma(b)}</strong><small>${b.join(' · ')}</small></td><td><strong>${suma(a) + suma(b)}</strong></td></tr>`).join('');
  }

  addDemoView('alumnos', 'Alumnos y gafetes', 'sprout', 'REGISTRO DE NIÑOS', 'Cada niño, <em>en su grupo.</em>', 'Registro y gafetes. Aquí solo se corrigen edad, grupo o notas; los duplicados se unen con cuidado.', `
<div class="module-toolbar"><div><label for="alumnos-grupo">Grupo</label><select id="alumnos-grupo"><option value="">Todos</option>${GRUPOS.map(([g, n]) => `<option value="${g}">${g} años · ${n}</option>`).join('')}</select></div><span id="alumnos-total" role="status"></span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Gafete</th><th scope="col">Niño</th><th scope="col">Grupo</th><th scope="col">Estado</th></tr></thead><tbody id="alumnos-filas"></tbody></table>
<p class="form-status" id="alumnos-estado" role="status"></p><p class="muted">Sin fotos ni datos de contacto en esta lista. Las fotos de gafete se consultan en el expediente autorizado.</p></section>`);
  function pintaAlumnos() {
    const g = $('alumnos-grupo').value, lista = ALUMNOS.filter(a => !g || a.grupo === g);
    $('alumnos-total').textContent = `${lista.length} niños de ejemplo`;
    $('alumnos-filas').innerHTML = lista.map(a => `<tr><td>${esc(a.id)}<small>${a.impresiones} ${a.impresiones === 1 ? 'impresión' : 'impresiones'}</small></td><td>${esc(a.nombre)}<small>${a.edad} años${a.notas ? ` · ${esc(a.notas)}` : ''}</small></td><td><select id="grupo-${a.id}" aria-label="Grupo de ${esc(a.nombre)}" data-grupo="${a.id}">${GRUPOS.map(([x]) => `<option${x === a.grupo ? ' selected' : ''}>${x}</option>`).join('')}</select></td><td>${a.estado === 'Posible duplicado' ? `<button class="button" type="button" data-unir="${a.id}">Unir con su registro</button>` : `<span class="badge">${esc(a.estado)}</span>`}</td></tr>`).join('');
  }
  $('alumnos-grupo').addEventListener('change', pintaAlumnos);
  $('alumnos-filas').addEventListener('change', event => {
    const a = ALUMNOS.find(x => x.id === event.target.dataset.grupo);
    if (!a) return;
    a.grupo = event.target.value;
    pintaAlumnos();
    $('alumnos-estado').textContent = `${a.nombre} pasa al grupo de ${a.grupo} años (ejemplo).`;
  });
  $('alumnos-filas').addEventListener('click', event => {
    const a = ALUMNOS.find(x => x.id === event.target.closest('[data-unir]')?.dataset.unir);
    if (!a) return;
    a.estado = 'Unido'; a.notas = 'Unido a K-103';
    pintaAlumnos();
    $('alumnos-estado').textContent = `${a.id} quedó unido a K-103. La asistencia se cuenta en un solo registro (ejemplo).`;
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

  addDemoView('configuracion', 'Configuración', 'grid', 'HORARIOS DE LOS SERVICIOS', 'Un cambio, <em>en todas partes.</em>', 'Si cambia un horario, se modifica aquí y se actualiza en el rol, las agendas y el pase de lista.', `
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
    pintaAgenda(); pintaLista(); pintaAsistencia(); pintaAlumnos(); pintaMaestros();
    $('lecciones-nota').textContent = sesion.perfil === 'admin' ? 'Administración actualiza el temario al inicio de cada periodo.' : 'Consulta: el temario lo actualiza administración.';
  }
  window.addEventListener('shalom-kids-rol', pintaTodo);
  window.addEventListener('shalom-kids-perfil', pintaTodo);
  pintaTodo();
})();
