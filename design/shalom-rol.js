"use strict";
// Rol de clases de Kids: el mismo cálculo que hace el sistema operativo de Shalom Kids (Apps Script) con calendarios y permutas.
// Datos ficticios en memoria: nada se guarda ni se envía.
(() => {
  const SERVICIOS = [['1er servicio', '9:00 AM a 10:30 AM'], ['2° servicio', '11:00 AM a 12:30 PM'], ['3er servicio', '1:00 PM a 2:30 PM']];
  const GRUPOS = [['4 a 6', 'Tesoros del Rey'], ['7 a 12', 'Primarios']];
  const DOMINGOS = ['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22'];
  const DOCENTES = ['Docente A', 'Docente B', 'Docente C', 'Docente D', 'Docente E', 'Docente F'];
  // Calendario: por grupo y domingo, [Docente 1, Docente 2] de cada servicio y la persona encargada del día.
  const calendario = {
    '4 a 6': DOMINGOS.map((_, i) => ({ turnos: [['Docente A', 'Docente B'], ['Docente C', ''], ['Docente D', '']], encargado: i % 2 ? 'Docente C' : 'Docente A', leccion: 'L' + (9 + i) })),
    '7 a 12': DOMINGOS.map((_, i) => ({ turnos: [['Docente E', ''], ['Docente F', 'Docente B'], ['', '']], encargado: 'Docente E', leccion: 'L' + (9 + i) })),
  };
  const permutas = [{ grupo: '4 a 6', fecha: DOMINGOS[1], servicio: '1er servicio', cede: 'Docente B', cubre: 'Docente F', devuelve: '', servicioDevuelve: '', motivo: 'Viaje', registro: 'admin', confirmada: true }];
  // Perfil de la sesión de ejemplo. En la app real lo decide el servidor, nunca el navegador.
  const sesion = { perfil: 'docente', docente: 'Docente A' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fecha = t => { const [y, m, d] = t.split('-').map(Number); return `${d} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][m - 1]} ${y}`; };
  const clave = (g, f, s, quien) => [g, f, s, quien.toLowerCase()].join('|');

  /** Quién da cada turno: si alguien lo cedió, quien lo cubre; si es el turno devuelto de un intercambio, quien cedió. */
  function quienDa(g, f, s, programado) {
    const k = clave(g, f, s, programado);
    const cubre = permutas.find(p => clave(p.grupo, p.fecha, p.servicio, p.cede) === k);
    if (cubre) return cubre.cubre;
    const devuelve = permutas.find(p => p.devuelve && clave(p.grupo, p.devuelve, p.servicioDevuelve, p.cubre) === k);
    return devuelve ? devuelve.cede : programado;
  }

  const section = addDemoView('rol', 'Rol de clases', 'calendar', 'CADA DOMINGO, CADA GRUPO', 'Quién da <em>cada clase.</em>', 'El rol de los dos grupos con los cambios ya aplicados: elige un domingo y registra una permuta.', `
<div class="module-toolbar"><div><label for="rol-fecha">Domingo</label><select id="rol-fecha">${DOMINGOS.map(f => `<option value="${f}">${fecha(f)}</option>`).join('')}</select></div><span class="badge" id="rol-perfil">Rol de ejemplo</span></div>
<div class="grid"><section aria-labelledby="rol-titulo"><div class="subheading"><h2 id="rol-titulo">Rol del domingo</h2><span id="rol-cambios" role="status"></span></div><div id="rol-grupos" class="menu-days"></div></section>
<section class="card preparation"><span class="icon-box sand">${icon('users')}</span><h2>Registrar permuta</h2><p id="rol-form-ayuda">Para un solo domingo. Si es intercambio, indica cuándo devuelve el turno.</p>
<form id="rol-form" novalidate>
<label for="rol-grupo">Grupo</label><select id="rol-grupo">${GRUPOS.map(([g, n]) => `<option value="${g}">${g} años · ${n}</option>`).join('')}</select>
<label for="rol-servicio">Servicio</label><select id="rol-servicio">${SERVICIOS.map(([s]) => `<option>${s}</option>`).join('')}</select>
<label for="rol-cede">Cede su turno</label><select id="rol-cede"></select>
<label for="rol-cubre">Lo cubre</label><select id="rol-cubre">${DOCENTES.map(d => `<option>${d}</option>`).join('')}</select>
<label class="checkline"><input type="checkbox" id="rol-intercambio">Es intercambio: después le devuelve el turno</label>
<div id="rol-devuelve" hidden><label for="rol-devuelve-fecha">Domingo en que devuelve</label><select id="rol-devuelve-fecha"></select>
<label for="rol-devuelve-servicio">Servicio en que devuelve</label><select id="rol-devuelve-servicio">${SERVICIOS.map(([s]) => `<option>${s}</option>`).join('')}</select></div>
<label for="rol-motivo">Motivo (opcional)</label><input id="rol-motivo" type="text" maxlength="120" placeholder="Viaje, enfermedad…">
<button class="button primary" type="submit" id="rol-registrar">Registrar permuta</button>
<p class="form-status" id="rol-estado" role="status"></p></form></section></div>
<div id="rol-permutas"></div>`);

  const $ = id => document.getElementById(id);
  const actual = () => $('rol-fecha').value;
  function pinta() {
    const f = actual(), i = DOMINGOS.indexOf(f);
    $('rol-grupos').innerHTML = GRUPOS.map(([g, nombre]) => {
      const dia = calendario[g][i];
      return `<article class="card rol-grupo"><h3>${g} años · ${nombre}</h3><p class="muted">${esc(dia.leccion)} · Encargado(a): ${esc(dia.encargado)}</p>${SERVICIOS.map(([s, h], si) => {
        const ds = dia.turnos[si].filter(Boolean);
        return `<div class="rol-turno"><strong>${s} · ${h}</strong>${ds.length ? `<ul>${ds.map(p => { const da = quienDa(g, f, s, p); return `<li>${esc(da)}${da !== p ? ` <span class="badge">⇄ cubre a ${esc(p)}</span>` : ''}</li>`; }).join('')}</ul>` : '<p class="muted">Sin docente asignado en el calendario.</p>'}</div>`;
      }).join('')}</article>`;
    }).join('');
    const n = permutas.filter(p => p.fecha === f || p.devuelve === f).length;
    $('rol-cambios').textContent = n ? `${n} ${n === 1 ? 'permuta' : 'permutas'} este domingo` : 'Sin permutas este domingo';
    listaPermutas(f);
    $('rol-devuelve-fecha').innerHTML = DOMINGOS.filter(x => x > f).map(x => `<option value="${x}">${fecha(x)}</option>`).join('');
    cedentes();
  }
  function cedentes() {
    const g = $('rol-grupo').value, si = SERVICIOS.findIndex(([s]) => s === $('rol-servicio').value);
    const programados = calendario[g][DOMINGOS.indexOf(actual())].turnos[si].filter(Boolean);
    // Un docente solo cede sus propios turnos; administración puede registrar cualquiera.
    const ds = sesion.perfil === 'admin' ? programados : programados.filter(d => d === sesion.docente);
    $('rol-cede').innerHTML = ds.length ? ds.map(d => `<option>${esc(d)}</option>`).join('') : '<option value="">Nadie tiene ese turno</option>';
    suplente();
    $('rol-registrar').disabled = !ds.length;
    $('rol-estado').textContent = ds.length ? '' : sesion.perfil === 'admin' ? 'Ese turno no tiene docentes en el calendario: elige otro grupo, servicio o domingo.' : `${sesion.docente} no tiene ese turno: elige otro grupo, servicio o domingo.`;
  }
  /** Permutas del domingo: administración ve todas y las confirma; el docente solo ve las suyas. */
  function listaPermutas(f) {
    const visibles = permutas.filter(p => (p.fecha === f || p.devuelve === f) && (sesion.perfil === 'admin' || [p.cede, p.cubre].includes(sesion.docente)));
    $('rol-permutas').innerHTML = `<div class="subheading"><h2>Permutas de este domingo</h2><span>${sesion.perfil === 'admin' ? 'Todas · confirma las que registraron docentes' : 'Solo las tuyas'}</span></div>` +
      (visibles.length ? `<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Grupo y servicio</th><th scope="col">Cede → cubre</th><th scope="col">Estado</th></tr></thead><tbody>${visibles.map(p => `<tr><td>${esc(p.grupo)} años · ${esc(p.servicio)}${p.devuelve ? `<small>Devuelve el ${fecha(p.devuelve)} · ${esc(p.servicioDevuelve)}</small>` : ''}</td><td>${esc(p.cede)} → ${esc(p.cubre)}${p.motivo ? `<small>${esc(p.motivo)}</small>` : ''}</td><td>${p.confirmada ? '<span class="badge">Confirmada</span>' : sesion.perfil === 'admin' ? `<button class="button" type="button" data-confirmar="${permutas.indexOf(p)}">Confirmar</button>` : '<span class="badge">Por confirmar</span>'}</td></tr>`).join('')}</tbody></table></section>`
        : '<p class="muted">No hay permutas que mostrar en este domingo.</p>');
  }
  $('rol-permutas').addEventListener('click', event => {
    const boton = event.target.closest('[data-confirmar]');
    if (!boton || sesion.perfil !== 'admin') return;
    permutas[Number(boton.dataset.confirmar)].confirmada = true;
    pinta();
    $('rol-estado').textContent = 'Permuta confirmada (ejemplo; no se avisó a nadie).';
  });
  $('rol-fecha').addEventListener('change', pinta);
  /** Propone como suplente a alguien distinto de quien cede. */
  function suplente() { if ($('rol-cubre').value === $('rol-cede').value) $('rol-cubre').value = DOCENTES.find(d => d !== $('rol-cede').value); }
  $('rol-cede').addEventListener('change', suplente);
  ['rol-grupo', 'rol-servicio'].forEach(id => $(id).addEventListener('change', cedentes));
  $('rol-intercambio').addEventListener('change', e => { $('rol-devuelve').hidden = !e.target.checked; });
  $('rol-form').addEventListener('submit', event => {
    event.preventDefault();
    const p = { grupo: $('rol-grupo').value, fecha: actual(), servicio: $('rol-servicio').value, cede: $('rol-cede').value, cubre: $('rol-cubre').value,
      devuelve: $('rol-intercambio').checked ? $('rol-devuelve-fecha').value : '', servicioDevuelve: $('rol-intercambio').checked ? $('rol-devuelve-servicio').value : '', motivo: $('rol-motivo').value.trim(),
      registro: sesion.perfil, confirmada: sesion.perfil === 'admin' };
    if (sesion.perfil !== 'admin' && p.cede !== sesion.docente) { $('rol-estado').textContent = 'Solo puedes ceder tus propios turnos.'; return; }
    if (p.cede === p.cubre) { $('rol-estado').textContent = 'Elige a otra persona para cubrir el turno.'; return; }
    if ($('rol-intercambio').checked && !p.devuelve) { $('rol-estado').textContent = 'No hay un domingo posterior en el ejemplo para devolver el turno.'; return; }
    if (permutas.some(x => clave(x.grupo, x.fecha, x.servicio, x.cede) === clave(p.grupo, p.fecha, p.servicio, p.cede))) { $('rol-estado').textContent = 'Ya hay una permuta para ese turno.'; return; }
    permutas.push(p);
    $('rol-motivo').value = ''; $('rol-intercambio').checked = false; $('rol-devuelve').hidden = true;
    pinta();
    $('rol-estado').textContent = p.confirmada ? `Listo: ${p.cubre} cubre a ${p.cede} (ejemplo; se reinicia al recargar).` : `Registrada: ${p.cubre} cubre a ${p.cede}. Queda por confirmar por administración (ejemplo).`;
    window.dispatchEvent(new CustomEvent('shalom-kids-rol'));
  });
  /** Cambia el perfil de la sesión de ejemplo y vuelve a pintar el rol. */
  function setPerfil(perfil) {
    sesion.perfil = perfil === 'admin' ? 'admin' : 'docente';
    $('rol-perfil').textContent = sesion.perfil === 'admin' ? 'Administración · todos los turnos' : `Docente · ${sesion.docente}`;
    $('rol-form-ayuda').textContent = sesion.perfil === 'admin'
      ? 'Para un solo domingo. Si es intercambio, indica cuándo devuelve el turno.'
      : 'Cede uno de tus turnos para un solo domingo. Administración la confirma.';
    pinta();
  }
  // Lo usan Mi agenda, Asistencia, Maestros y Configuración (shalom-kids-perfil.js).
  window.ShalomKidsRol = { SERVICIOS, GRUPOS, DOMINGOS, DOCENTES, calendario, permutas, sesion, quienDa, fecha, esc, setPerfil, refrescar: pinta };
  setPerfil(sesion.perfil);
})();
