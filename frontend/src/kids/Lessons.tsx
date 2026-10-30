import { useEffect, useState } from 'react';
import { all, localDate, request, showDate } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { ages, numberOrNull, type Group, type Lesson } from './model';

/** Lessons for the next 120 days; coordination writes them, the team reads them. */
export function Lessons({ canEdit }: { canEdit: boolean }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  async function load() {
    const end = new Date(); end.setDate(end.getDate() + 120);
    const [l, g] = await Promise.all([all<Lesson>(`kids/lessons/?from=${localDate()}&to=${localDate(end)}`), all<Group>('kids/groups/')]);
    setLessons(l); setGroups(g); setLoaded(true);
  }
  useEffect(() => { void task.run(load); }, []);
  const groupName = (id: string) => groups.find(g => g.id === id)?.name ?? 'Grupo';

  return <section aria-labelledby="lessons-title" className="shalom-admin">
    <h1 id="lessons-title">Lecciones</h1>
    <p>Qué enseñamos cada semana en cada grupo, con la página del manual del maestro.{!canEdit && ' Coordinación actualiza el temario.'}</p>
    <Status {...task} />
    {loaded && !lessons.length ? <EmptyState>No hay lecciones registradas en los próximos meses.</EmptyState> : <ul className="shalom-list">
      {lessons.map(l => <li key={l.id}>
        <div>
          <p className="shalom-overline">{showDate(l.date)} · {groupName(l.group)}</p>
          <strong>{l.title}</strong>{l.unit && <span className="shalom-field-hint"> · {l.unit}</span>}{l.manual_page && <span className="shalom-field-hint"> · pág. {l.manual_page}</span>}
          {l.objective && <p>{l.objective}</p>}
          {l.materials && <p className="shalom-field-hint">Materiales: {l.materials}</p>}
        </div>
        {canEdit && <button type="button" className="shalom-secondary" disabled={task.busy} onClick={() => void task.run(async () => { await request(`kids/lessons/${l.id}/`, {}, 'DELETE'); await load(); return 'Lección eliminada.'; })}>Eliminar «{l.title}»</button>}
      </li>)}
    </ul>}
    {canEdit && <>
      <h2>Registrar lección</h2>
      <form className="shalom-form" onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget; const data = new FormData(form);
        const values = {
          date: String(data.get('date')), group: String(data.get('group')), unit: String(data.get('unit') ?? '').trim(), title: String(data.get('title') ?? '').trim(),
          manual_page: numberOrNull(data.get('manual_page')), objective: String(data.get('objective') ?? '').trim(), materials: String(data.get('materials') ?? '').trim(),
        };
        void task.run(async () => { await request('kids/lessons/', values); form.reset(); await load(); return 'Lección registrada.'; });
      }}>
        <Field htmlFor="lesson-date" label="Fecha"><input id="lesson-date" name="date" type="date" required min={localDate()} /></Field>
        <Field htmlFor="lesson-group" label="Grupo"><select id="lesson-group" name="group" required defaultValue=""><option value="">Selecciona un grupo</option>{groups.filter(g => g.active).map(g => <option key={g.id} value={g.id}>{g.name} · {ages(g)}</option>)}</select></Field>
        <Field htmlFor="lesson-title" label="Título"><input id="lesson-title" name="title" required maxLength={120} /></Field>
        <Field htmlFor="lesson-unit" label="Unidad (opcional)"><input id="lesson-unit" name="unit" maxLength={60} /></Field>
        <Field htmlFor="lesson-page" label="Página del manual (opcional)"><input id="lesson-page" name="manual_page" type="number" min={1} max={2000} /></Field>
        <Field htmlFor="lesson-objective" label="Objetivo (opcional)"><textarea id="lesson-objective" name="objective" maxLength={1000} rows={3} /></Field>
        <Field htmlFor="lesson-materials" label="Materiales (opcional)"><textarea id="lesson-materials" name="materials" maxLength={1000} rows={2} /></Field>
        <button type="submit" disabled={task.busy}>Registrar lección</button>
      </form>
    </>}
  </section>;
}
