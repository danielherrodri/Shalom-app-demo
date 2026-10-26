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
  const permutas = [{ grupo: '4 a 6', fecha: DOMINGOS[1], servicio: '1er servicio', cede: 'Docente B', cubre: 'Docente F', devuelve: '', servicioDevuelve: '', motivo: 'Viaje' }];
  const resumen = [['2026-10-11', [21, 7, 9, 5], [17, 6, 8, 3]], ['2026-10-18', [20, 8, 8, 4], [16, 5, 7, 4]], ['2026-10-25', [18, 6, 8, 4], [15, 5, 7, 3]]];
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

  const section = addDemoView('rol', 'Rol de clases', 'calendar', 'CADA DOMINGO, CADA GRUPO', 'Quién da <em>cada clase.</em>', 'El rol de los dos grupos con los cambios ya aplicados: elige un domingo, registra una permuta y revisa la asistencia.', `
<div class="module-toolbar"><div><label for="rol-fecha">Domingo</label><select id="rol-fecha">${DOMINGOS.map(f => `<option value="${f}">${fecha(f)}</option>`).join('')}</select></div><span class="badge">Rol de ejemplo · coordinación</span></div>
<div class="grid"><section aria-labelledby="rol-titulo"><div class="subheading"><h2 id="rol-titulo">Rol del domingo</h2><span id="rol-cambios" role="status"></span></div><div id="rol-grupos" class="menu-days"></div></section>
<aside class="card preparation"><span class="icon-box sand">${icon('users')}</span><h2>Registrar permuta</h2><p>Para un solo domingo. Si es intercambio, indica cuándo devuelve el turno.</p>
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
<p class="form-status" id="rol-estado" role="status"></p></form></aside></div>
<div class="subheading"><h2>Resumen de asistencia</h2><span>Niños por domingo y servicio · ejemplo</span></div>
<section class="card"><table class="rol-resumen"><thead><tr><th scope="col">Domingo</th><th scope="col">4 a 6</th><th scope="col">7 a 12</th><th scope="col">Total</th></tr></thead>
<tbody>${resumen.slice().reverse().map(([f, a, b]) => `<tr><td>${fecha(f)}</td><td><strong>${a[0]}</strong><small>${a.slice(1).join(' · ')}</small></td><td><strong>${b[0]}</strong><small>${b.slice(1).join(' · ')}</small></td><td><strong>${a[0] + b[0]}</strong></td></tr>`).join('')}</tbody></table>
<p class="muted">Debajo de cada total: niños en el 1er · 2° · 3er servicio.</p></section>`);

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
    $('rol-devuelve-fecha').innerHTML = DOMINGOS.filter(x => x > f).map(x => `<option value="${x}">${fecha(x)}</option>`).join('');
    cedentes();
  }
  function cedentes() {
    const g = $('rol-grupo').value, si = SERVICIOS.findIndex(([s]) => s === $('rol-servicio').value);
    const ds = calendario[g][DOMINGOS.indexOf(actual())].turnos[si].filter(Boolean);
    $('rol-cede').innerHTML = ds.length ? ds.map(d => `<option>${esc(d)}</option>`).join('') : '<option value="">Nadie tiene ese turno</option>';
    $('rol-registrar').disabled = !ds.length;
    $('rol-estado').textContent = ds.length ? '' : 'Ese turno no tiene docentes en el calendario: elige otro grupo, servicio o domingo.';
  }
  $('rol-fecha').addEventListener('change', pinta);
  ['rol-grupo', 'rol-servicio'].forEach(id => $(id).addEventListener('change', cedentes));
  $('rol-intercambio').addEventListener('change', e => { $('rol-devuelve').hidden = !e.target.checked; });
  $('rol-form').addEventListener('submit', event => {
    event.preventDefault();
    const p = { grupo: $('rol-grupo').value, fecha: actual(), servicio: $('rol-servicio').value, cede: $('rol-cede').value, cubre: $('rol-cubre').value,
      devuelve: $('rol-intercambio').checked ? $('rol-devuelve-fecha').value : '', servicioDevuelve: $('rol-intercambio').checked ? $('rol-devuelve-servicio').value : '', motivo: $('rol-motivo').value.trim() };
    if (p.cede === p.cubre) { $('rol-estado').textContent = 'Elige a otra persona para cubrir el turno.'; return; }
    if ($('rol-intercambio').checked && !p.devuelve) { $('rol-estado').textContent = 'No hay un domingo posterior en el ejemplo para devolver el turno.'; return; }
    if (permutas.some(x => clave(x.grupo, x.fecha, x.servicio, x.cede) === clave(p.grupo, p.fecha, p.servicio, p.cede))) { $('rol-estado').textContent = 'Ya hay una permuta para ese turno.'; return; }
    permutas.push(p);
    $('rol-motivo').value = ''; $('rol-intercambio').checked = false; $('rol-devuelve').hidden = true;
    pinta();
    $('rol-estado').textContent = `Listo: ${p.cubre} cubre a ${p.cede} (ejemplo; se reinicia al recargar).`;
  });
  pinta();
})();
