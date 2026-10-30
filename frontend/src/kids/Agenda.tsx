import { useEffect, useState } from 'react';
import { request, showDate } from '../api';
import { EmptyState } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { STATUS_LABELS, ages, type Item } from './model';

type Class = {
  id: string; date: string; service: string; starts_at: string; ends_at: string; group: string; min_age: number | null; max_age: number | null;
  lesson: { unit: string; title: string; manual_page: number | null; objective: string; materials: string } | null;
};
type MyItem = Item & { eventTitle: string; eventDate: string };

/** The signed-in teacher's own classes and event tasks; the server returns nothing else. */
export function Agenda() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [items, setItems] = useState<MyItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  async function load() {
    const agenda = await request<{ classes: Class[]; items: MyItem[] }>('kids/agenda/');
    setClasses(agenda.classes); setItems(agenda.items); setLoaded(true);
  }
  useEffect(() => { void task.run(load); }, []);
  const advance = (item: MyItem, step: 'accept' | 'complete') => void task.run(async () => {
    await request(`kids/items/${item.id}/${step}/`, {});
    await load();
    return step === 'accept' ? 'Tarea aceptada.' : 'Tarea completada. ¡Gracias!';
  });

  return <section aria-labelledby="agenda-title" className="shalom-admin">
    <h1 id="agenda-title">Mi agenda</h1>
    <p>Tus próximas clases de las siguientes 8 semanas, con su lección. Recibirás un recordatorio por correo 2 días antes.</p>
    <Status {...task} />
    <h2>Mis clases</h2>
    {loaded && !classes.length ? <EmptyState>No tienes clases programadas. Coordinación arma el rol de clases.</EmptyState> : <ul className="shalom-list">
      {classes.map(c => <li key={c.id} className="shalom-card-row">
        <div>
          <p className="shalom-overline">{showDate(c.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h3>{c.group} <span className="shalom-field-hint">· {ages(c)}</span></h3>
          <p>{c.service} · {c.starts_at} a {c.ends_at}</p>
          {c.lesson ? <div className="shalom-lesson">
            <p><strong>{c.lesson.title}</strong>{c.lesson.unit && ` · ${c.lesson.unit}`}{c.lesson.manual_page && ` · pág. ${c.lesson.manual_page}`}</p>
            {c.lesson.objective && <p>{c.lesson.objective}</p>}
            {c.lesson.materials && <p className="shalom-field-hint">Materiales: {c.lesson.materials}</p>}
          </div> : <p className="shalom-field-hint">La lección de este día todavía no está registrada.</p>}
        </div>
      </li>)}
    </ul>}
    <h2>Mis tareas de eventos</h2>
    {loaded && !items.length ? <EmptyState>No tienes tareas pendientes.</EmptyState> : <ul className="shalom-list">
      {items.map(item => <li key={item.id}>
        <div>
          <strong>{item.title}</strong> <span className="shalom-field-hint">· {item.eventTitle}, {showDate(item.eventDate)}</span>
          <p className="shalom-field-hint">{STATUS_LABELS[item.status]}{item.due_date && ` · fecha límite: ${showDate(item.due_date)}`}{item.quantity !== null && ` · ${item.received} de ${item.quantity} recibidos`}</p>
        </div>
        {item.status === 'pendiente' && <button type="button" disabled={task.busy} onClick={() => advance(item, 'accept')}>Aceptar «{item.title}»</button>}
        {item.status === 'aceptada' && <button type="button" disabled={task.busy} onClick={() => advance(item, 'complete')}>Marcar «{item.title}» como completada</button>}
      </li>)}
    </ul>}
  </section>;
}
