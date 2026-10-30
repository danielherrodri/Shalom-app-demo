import { useEffect, useState } from 'react';
import { ROLE_LABELS, request, showDate } from '../api';
import { EmptyState } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import type { Member } from './model';

/** Kids team with profiles and upcoming classes. Contact data is not listed. */
export function Team() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  useEffect(() => { void task.run(async () => { setMembers((await request<{ results: Member[] }>('kids/team/')).results); setLoaded(true); }); }, []);
  const teachers = members.filter(m => m.roles.includes('docente'));
  const others = members.filter(m => !m.roles.includes('docente'));
  return <section aria-labelledby="team-title" className="shalom-admin">
    <h1 id="team-title">Maestros</h1>
    <p>El equipo docente y quién enseña cuándo. Para sumar a alguien, Administración le envía una invitación con el perfil Docente; los teléfonos y correos no se muestran en listas.</p>
    <Status {...task} />
    <h2>Equipo docente</h2>
    {loaded && !teachers.length ? <EmptyState>Todavía no hay personas con el perfil Docente.</EmptyState> : <ul className="shalom-list">
      {teachers.map(m => <li key={m.id}>
        <span><strong>{m.displayName}</strong><span className="shalom-field-hint"> · {m.groups.length ? m.groups.join(', ') : 'Sin grupo en el rol'}</span></span>
        <span className="shalom-field-hint">{m.upcoming ? `${m.upcoming} ${m.upcoming === 1 ? 'clase' : 'clases'} · próxima: ${showDate(m.next!)}` : 'Sin clases programadas'}</span>
      </li>)}
    </ul>}
    <h2>Resto del equipo Kids</h2>
    {loaded && !others.length ? <EmptyState>No hay más personas en el equipo Kids.</EmptyState> : <ul className="shalom-list">
      {others.map(m => <li key={m.id}><strong>{m.displayName}</strong><span className="shalom-field-hint">{m.roles.map(r => ROLE_LABELS[r]).join(', ')}</span></li>)}
    </ul>}
  </section>;
}
