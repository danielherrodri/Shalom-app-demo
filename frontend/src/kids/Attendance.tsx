import { useEffect, useRef, useState } from 'react';
import { request } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';

type Row = { id: string; name?: string; display_name?: string; group?: string; starts_at?: string };

export function Attendance({ onActivity }: { onActivity: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<Row[]>([]);
  const [meetings, setMeetings] = useState<Row[]>([]);
  const [people, setPeople] = useState<Row[]>([]);
  const [group, setGroup] = useState('');
  const [meeting, setMeeting] = useState('');
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  const generation = useRef(0);
  useEffect(() => { void task.run(async () => {
    const [g, m] = await Promise.all([request('groups/'), request('sessions/')]);
    setGroups(g.results); setMeetings(m.results); setLoaded(true);
    // Evita seleccionar entre opciones cuando solo hay una asignación autorizada.
    if (g.results.length === 1) {
      const assigned = g.results[0] as Row;
      const current = ++generation.current;
      setGroup(assigned.id);
      const open = (m.results as Row[]).filter(item => item.group === assigned.id);
      setMeeting(open.length === 1 ? open[0].id : '');
      const members = await request(`groups/${assigned.id}/people/`);
      if (generation.current === current) setPeople(members.results);
    }
  }); }, []);
  async function chooseGroup(id: string) {
    const current = ++generation.current;
    setGroup(id); setPeople([]); setMeeting(''); setSearch('');
    if (!id) return;
    const result = await request(`groups/${id}/people/`);
    if (generation.current === current) setPeople(result.results);
  }
  const visiblePeople = people.filter(person => (person.display_name ?? '').toLocaleLowerCase('es-MX').includes(search.trim().toLocaleLowerCase('es-MX')));
  const busy = task.busy;
  return <section aria-labelledby="kids-title">
    <h1 id="kids-title">Mi clase de hoy</h1>
    <p>No introducir información real.</p>
    <Status {...task} />
    <div className="grid gap-6 sm:grid-cols-2">
      <Field htmlFor="group" label="Grupo autorizado"><select id="group" value={group} disabled={busy} onChange={e => void task.run(() => chooseGroup(e.target.value))}><option value="">Selecciona un grupo</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
      <Field htmlFor="meeting" label="Sesión abierta"><select id="meeting" value={meeting} disabled={!group || busy} onChange={e => setMeeting(e.target.value)}><option value="">Selecciona una sesión</option>{meetings.filter(m => m.group === group).map(m => <option key={m.id} value={m.id}>{new Date(m.starts_at!).toLocaleString('es-MX')}</option>)}</select></Field>
    </div>
    {loaded && !groups.length && <EmptyState>No tienes grupos asignados. Contacta a coordinación.</EmptyState>}
    {group && !people.length && !busy && !task.error && <EmptyState>No hay integrantes en este grupo.</EmptyState>}
    {people.length > 0 && <Field htmlFor="people-search" label="Buscar alumno"><input id="people-search" type="search" value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" placeholder="Escribe un nombre" /></Field>}
    {people.length > 0 && visiblePeople.length === 0 && <EmptyState>No encontramos alumnos con ese nombre. Modifica la búsqueda.</EmptyState>}
    <ul className="space-y-4">{visiblePeople.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-400 bg-white p-5"><span className="font-semibold">{person.display_name}</span><button disabled={!meeting || busy} onClick={() => void task.run(async () => {const r = await request('attendance/', {meeting, person: person.id}); await onActivity(); return r.created ? 'Entrada registrada.' : 'La entrada ya estaba registrada.';})}>Registrar entrada</button></li>)}</ul>
  </section>;
}
