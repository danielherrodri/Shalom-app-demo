import { useEffect, useState } from 'react';
import { all, localDate, request, showDate } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { ages, hours, weekdayOf, type Group, type Member, type RosterRow, type Service } from './model';

function shift(value: string, days: number): string {
  const [y, m, d] = value.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
}

/** First date from today on which an active service takes place (Sunday when there are none yet). */
function nextServiceDate(services: Service[]): string {
  const days = new Set(services.filter(s => s.active).map(s => s.weekday));
  let day = localDate();
  for (let i = 0; i < 7 && !days.has(weekdayOf(day)) && days.size; i++) day = shift(day, 1);
  return days.size ? day : shift(day, (6 - weekdayOf(day) + 7) % 7);
}

/** Who gives each class on a given day. The server checks profiles, schedules, conflicts and seats. */
export function Roster() {
  const [services, setServices] = useState<Service[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Member[]>([]);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [day, setDay] = useState('');
  const task = useTask();
  async function loadDay(value: string) {
    setRows((await request<{ results: RosterRow[] }>(`kids/roster/?from=${value}&to=${value}`)).results);
  }
  useEffect(() => { void task.run(async () => {
    const [s, g, t] = await Promise.all([all<Service>('kids/services/'), all<Group>('kids/groups/'), request<{ results: Member[] }>('kids/team/')]);
    setServices(s); setGroups(g); setTeachers(t.results.filter(m => m.roles.includes('docente')));
    const first = nextServiceDate(s);
    setDay(first);
    await loadDay(first);
  }); }, []);
  const choose = (value: string) => { if (!value) return; setDay(value); void task.run(() => loadDay(value)); };
  const act = (work: () => Promise<unknown>, done: string) => void task.run(async () => { await work(); await loadDay(day); return done; });
  const today = services.filter(s => s.active && day && s.weekday === weekdayOf(day));
  const activeGroups = groups.filter(g => g.active);

  return <section aria-labelledby="roster-title" className="shalom-admin">
    <h1 id="roster-title">Rol de clases</h1>
    <p>Quién da cada clase. Cada docente recibe un recordatorio por correo 2 días antes y lo ve en «Mi agenda».</p>
    <div className="shalom-inline-form">
      <Field htmlFor="roster-day" label="Fecha"><input id="roster-day" type="date" min={localDate()} value={day} onChange={e => choose(e.target.value)} /></Field>
      <button type="button" className="shalom-secondary" disabled={task.busy || !day || shift(day, -7) < localDate()} onClick={() => choose(shift(day, -7))}>Semana anterior</button>
      <button type="button" className="shalom-secondary" disabled={task.busy || !day} onClick={() => choose(shift(day, 7))}>Semana siguiente</button>
    </div>
    <Status {...task} />
    {day && <h2>{showDate(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>}
    {day && !today.length && !task.busy && <EmptyState>No hay servicios ese día. Elige otra fecha o revisa la Configuración.</EmptyState>}
    {today.length > 0 && !activeGroups.length && <EmptyState>No hay grupos activos. Agrégalos en Configuración.</EmptyState>}
    {today.map(service => <section key={service.id} aria-labelledby={`svc-${service.id}`} className="shalom-roster-service">
      <h3 id={`svc-${service.id}`}>{service.name} · {hours(service)}</h3>
      <ul className="shalom-list">{activeGroups.map(group => {
        const assigned = rows.filter(r => r.service === service.id && r.group === group.id);
        const free = teachers.filter(t => !assigned.some(a => a.teacher === t.id));
        const label = `${group.name}, ${service.name}`;
        return <li key={group.id} className="shalom-account">
          <div>
            <strong>{group.name}</strong> <span className="shalom-field-hint">· {ages(group)} · {assigned.length} de {group.teachers_per_class}</span>
            {assigned.length ? <ul className="shalom-chips" aria-label={`Docentes de ${label}`}>{assigned.map(a => <li key={a.id}>
              {a.teacherName}{a.reminded && <span className="shalom-field-hint"> · recordado</span>}
              <button type="button" className="shalom-chip-action" disabled={task.busy} aria-label={`Quitar a ${a.teacherName} de ${label}`}
                onClick={() => act(() => request(`kids/roster/${a.id}/`, {}, 'DELETE'), `${a.teacherName} ya no está en ${label}.`)}>Quitar</button>
            </li>)}</ul> : <p className="shalom-field-hint">Sin docente asignado.</p>}
          </div>
          {assigned.length < group.teachers_per_class && <form className="shalom-inline-form" onSubmit={e => {
            e.preventDefault();
            const teacher = String(new FormData(e.currentTarget).get('teacher') ?? '');
            if (teacher) act(() => request('kids/roster/', { date: day, service: service.id, group: group.id, teacher }), `Docente asignado a ${label}.`);
          }}>
            <Field htmlFor={`t-${service.id}-${group.id}`} label={`Docente para ${label}`}>
              <select id={`t-${service.id}-${group.id}`} name="teacher" required defaultValue="">
                <option value="">{free.length ? 'Selecciona a un docente' : 'No hay docentes disponibles'}</option>
                {free.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
              </select>
            </Field>
            <button type="submit" disabled={task.busy || !free.length}>Asignar</button>
          </form>}
        </li>;
      })}</ul>
    </section>)}
  </section>;
}
