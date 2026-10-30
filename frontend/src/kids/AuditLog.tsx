import { useEffect, useState } from 'react';
import { request } from '../api';
import { EmptyState } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';

type Entry = { id: string; action: string; actorName: string; target: string; created_at: string };
const SUBJECTS: Record<string, string> = { group: 'grupo', service: 'servicio', roster: 'clase del rol', lesson: 'lección', event: 'evento', item: 'tarea o material' };
const VERBS: Record<string, string> = { create: 'creó', update: 'modificó', delete: 'eliminó', aceptada: 'aceptó', completada: 'completó' };

export function describe(action: string): string {
  const [, subject, verb] = action.split('.');
  return `${VERBS[verb] ?? verb} ${SUBJECTS[subject] ?? subject}`;
}

/** Who changed what in Coordinación Kids, newest first (last 200 changes). */
export function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  useEffect(() => { void task.run(async () => { setEntries((await request<{ results: Entry[] }>('kids/audit/')).results); setLoaded(true); }); }, []);
  return <section aria-labelledby="audit-title" className="shalom-admin">
    <h1 id="audit-title">Bitácora</h1>
    <p>Cada cambio de Coordinación Kids queda registrado con quién lo hizo y cuándo. No se puede editar.</p>
    <Status {...task} />
    {loaded && !entries.length ? <EmptyState>Todavía no hay cambios registrados.</EmptyState> : <ul className="shalom-list">
      {entries.map(e => <li key={e.id}><span><strong>{e.actorName}</strong> {describe(e.action)}</span>
        <span className="shalom-field-hint">{new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span></li>)}
    </ul>}
  </section>;
}
