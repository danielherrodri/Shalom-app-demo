import { useEffect, useState } from 'react';
import { localDate, request, showDate } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { STATUS_LABELS, numberOrNull, type Item, type KidsEvent, type Member } from './model';

/** Events with tasks and materials. Assigning is not accepting: each person accepts in «Mi agenda». */
export function Events() {
  const [events, setEvents] = useState<KidsEvent[]>([]);
  const [team, setTeam] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  async function load() {
    const [e, t] = await Promise.all([request<{ results: KidsEvent[] }>('kids/events/'), request<{ results: Member[] }>('kids/team/')]);
    setEvents(e.results); setTeam(t.results); setLoaded(true);
  }
  useEffect(() => { void task.run(load); }, []);
  const act = (work: () => Promise<unknown>, done: string) => void task.run(async () => { await work(); await load(); return done; });

  return <section aria-labelledby="events-title" className="shalom-admin">
    <h1 id="events-title">Eventos Kids</h1>
    <p>Tareas y materiales de cada evento. Asignar no equivale a aceptar: cada persona acepta su tarea en «Mi agenda».</p>
    <Status {...task} />
    {loaded && !events.length && <EmptyState>Todavía no hay eventos.</EmptyState>}
    {events.map(event => <section key={event.id} aria-labelledby={`ev-${event.id}`} className="shalom-event">
      <div className="shalom-event-head">
        <h2 id={`ev-${event.id}`}>{event.title} <span className="shalom-field-hint">· {showDate(event.date, { day: 'numeric', month: 'long', year: 'numeric' })}{!event.active && ' · archivado'}</span></h2>
        <button type="button" className="shalom-secondary" disabled={task.busy} onClick={() => act(() => request(`kids/events/${event.id}/`, { active: !event.active }, 'PATCH'), event.active ? 'Evento archivado.' : 'Evento reactivado.')}>{event.active ? `Archivar «${event.title}»` : `Reactivar «${event.title}»`}</button>
      </div>
      {event.description && <p>{event.description}</p>}
      {!event.items.length ? <EmptyState>Sin tareas ni materiales.</EmptyState> : <ul className="shalom-list">
        {event.items.map(item => <ItemRow key={item.id} item={item} busy={task.busy} editable={event.active} act={act} />)}
      </ul>}
      {event.active && <form className="shalom-inline-form shalom-new" aria-label={`Agregar a ${event.title}`} onSubmit={e => {
        e.preventDefault();
        const form = e.currentTarget; const data = new FormData(form);
        const values = {
          kind: String(data.get('kind')), title: String(data.get('title') ?? '').trim(), assignee: String(data.get('assignee') || '') || null,
          due_date: String(data.get('due_date') || '') || null, quantity: numberOrNull(data.get('quantity')),
        };
        act(async () => { await request(`kids/events/${event.id}/items/`, values); form.reset(); }, values.kind === 'material' ? 'Material agregado.' : 'Tarea agregada.');
      }}>
        <Field htmlFor={`kind-${event.id}`} label="Tipo"><select id={`kind-${event.id}`} name="kind"><option value="tarea">Tarea</option><option value="material">Material</option></select></Field>
        <Field htmlFor={`title-${event.id}`} label="Qué hace falta"><input id={`title-${event.id}`} name="title" required maxLength={120} /></Field>
        <Field htmlFor={`who-${event.id}`} label="Responsable (opcional)"><select id={`who-${event.id}`} name="assignee" defaultValue=""><option value="">Sin asignar</option>{team.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></Field>
        <Field htmlFor={`due-${event.id}`} label="Fecha límite (opcional)"><input id={`due-${event.id}`} name="due_date" type="date" min={localDate()} /></Field>
        <Field htmlFor={`qty-${event.id}`} label="Cantidad (materiales)"><input id={`qty-${event.id}`} name="quantity" type="number" min={1} max={100000} /></Field>
        <button type="submit" disabled={task.busy}>Agregar</button>
      </form>}
    </section>)}
    <h2>Nuevo evento</h2>
    <form className="shalom-form" onSubmit={e => {
      e.preventDefault();
      const form = e.currentTarget; const data = new FormData(form);
      const values = { title: String(data.get('title') ?? '').trim(), date: String(data.get('date')), description: String(data.get('description') ?? '').trim() };
      act(async () => { await request('kids/events/', values); form.reset(); }, 'Evento creado.');
    }}>
      <Field htmlFor="event-title" label="Nombre del evento"><input id="event-title" name="title" required maxLength={120} /></Field>
      <Field htmlFor="event-date" label="Fecha"><input id="event-date" name="date" type="date" required /></Field>
      <Field htmlFor="event-description" label="Descripción (opcional)"><textarea id="event-description" name="description" maxLength={1000} rows={3} /></Field>
      <button type="submit" disabled={task.busy}>Crear evento</button>
    </form>
  </section>;
}

function ItemRow({ item, busy, editable, act }: { item: Item; busy: boolean; editable: boolean; act: (work: () => Promise<unknown>, done: string) => void }) {
  return <li>
    <div>
      <strong>{item.title}</strong> <span className="shalom-field-hint">· {item.kind === 'material' ? 'Material' : 'Tarea'}</span>
      <p className="shalom-field-hint">{item.assigneeName ?? 'Sin responsable'} · {STATUS_LABELS[item.status]}{item.due_date && ` · límite ${showDate(item.due_date)}`}</p>
    </div>
    {editable && item.kind === 'material' && <form className="shalom-inline-form" onSubmit={e => {
      e.preventDefault();
      const received = Number(new FormData(e.currentTarget).get('received'));
      act(() => request(`kids/items/${item.id}/`, { received }, 'PATCH'), 'Material actualizado.');
    }}>
      <Field htmlFor={`rec-${item.id}`} label={`Recibidos de ${item.quantity}`}><input id={`rec-${item.id}`} name="received" type="number" min={0} max={item.quantity ?? undefined} defaultValue={item.received} /></Field>
      <button type="submit" disabled={busy}>Guardar «{item.title}»</button>
    </form>}
    {editable && <button type="button" className="shalom-secondary" disabled={busy} onClick={() => act(() => request(`kids/items/${item.id}/`, {}, 'DELETE'), 'Eliminado del evento.')}>Eliminar «{item.title}»</button>}
  </li>;
}
