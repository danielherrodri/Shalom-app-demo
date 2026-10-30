import { useEffect, useState } from 'react';
import { request, showDate } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { STATUS_LABELS, ages, type ClassSummary, type Item, type Swap } from './model';
import { SwapList, classLabel, type SwapStep } from './Swaps';

type Class = {
  id: string; date: string; service: string; starts_at: string; ends_at: string; group: string; min_age: number | null; max_age: number | null;
  lesson: { unit: string; title: string; manual_page: number | null; objective: string; materials: string } | null;
  lead: string | null; swapPending: boolean;
};
type MyItem = Item & { eventTitle: string; eventDate: string };
type MyLead = { id: string; date: string; group: string };
type Options = { teachers: { id: string; displayName: string }[]; classes?: ClassSummary[] };

const SWAP_DONE: Record<SwapStep, string> = { confirm: 'Permuta confirmada.', reject: 'Permuta rechazada.', cancel: 'Permuta retirada.' };

/** The signed-in teacher's own classes, days in charge, swaps and event tasks; the server returns nothing else. */
export function Agenda({ canSwap }: { canSwap: boolean }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [leads, setLeads] = useState<MyLead[]>([]);
  const [items, setItems] = useState<MyItem[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [ceding, setCeding] = useState<Class | null>(null);
  const [loaded, setLoaded] = useState(false);
  const task = useTask();
  async function load() {
    const [agenda, mine] = await Promise.all([
      request<{ classes: Class[]; leads: MyLead[]; items: MyItem[] }>('kids/agenda/'),
      request<{ results: Swap[] }>('kids/swaps/'),
    ]);
    setClasses(agenda.classes); setLeads(agenda.leads); setItems(agenda.items); setSwaps(mine.results); setLoaded(true);
  }
  useEffect(() => { void task.run(load); }, []);
  const advance = (item: MyItem, step: 'accept' | 'complete') => void task.run(async () => {
    await request(`kids/items/${item.id}/${step}/`, {});
    await load();
    return step === 'accept' ? 'Tarea aceptada.' : 'Tarea completada. ¡Gracias!';
  });
  const step = (swap: Swap, action: SwapStep) => void task.run(async () => {
    await request(`kids/swaps/${swap.id}/${action}/`, {});
    await load();
    return SWAP_DONE[action];
  });

  return <section aria-labelledby="agenda-title" className="shalom-admin">
    <h1 id="agenda-title">Mi agenda</h1>
    <p>Tus próximas clases de las siguientes 8 semanas, con su lección. Recibirás un recordatorio por correo 2 días antes. Si no puedes dar una, cédela: coordinación confirma la permuta.</p>
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
          {c.lead && <p className="shalom-field-hint">Encargado(a) del día: {c.lead}</p>}
          {c.swapPending && <p className="shalom-field-hint">Tienes una permuta por confirmar para esta clase.</p>}
        </div>
        {canSwap && !c.swapPending && ceding?.id !== c.id && <button type="button" className="shalom-secondary" disabled={task.busy}
          onClick={() => setCeding(c)}>Ceder la clase del {showDate(c.date)}</button>}
        {ceding?.id === c.id && <SwapForm entry={c} busy={task.busy} onCancel={() => setCeding(null)} onSubmit={values => void task.run(async () => {
          await request('kids/swaps/', { entry: c.id, ...values });
          setCeding(null);
          await load();
          return 'Permuta registrada. Coordinación la confirma; hasta entonces la clase sigue a tu nombre.';
        })} />}
      </li>)}
    </ul>}
    {leads.length > 0 && <>
      <h2>Días como encargado(a)</h2>
      <ul className="shalom-list">{leads.map(l => <li key={l.id}>
        <div><strong>{showDate(l.date, { weekday: 'long', day: 'numeric', month: 'long' })}</strong> <span className="shalom-field-hint">· {l.group}</span></div>
      </li>)}</ul>
    </>}
    {canSwap && <>
      <h2>Mis permutas</h2>
      <SwapList swaps={swaps} busy={task.busy} coordinator={false} onStep={step} empty="No tienes permutas en las próximas semanas." />
    </>}
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

/** Picks who covers a class and, for an exchange, which of their classes comes back. */
function SwapForm({ entry, busy, onCancel, onSubmit }: {
  entry: Class; busy: boolean; onCancel: () => void; onSubmit: (values: { to_teacher: string; return_entry: string | null }) => void;
}) {
  const [options, setOptions] = useState<Options>({ teachers: [] });
  const [teacher, setTeacher] = useState('');
  const [exchange, setExchange] = useState(false);
  const [error, setError] = useState('');
  const id = `swap-${entry.id}`;
  useEffect(() => {
    // The other teacher's classes are only asked for when an exchange needs them.
    const query = exchange && teacher ? `?teacher=${teacher}` : '';
    request<Options>(`kids/swaps/options/${query}`).then(setOptions, e => setError(e instanceof Error ? e.message : 'Ocurrió un error.'));
  }, [exchange, teacher]);
  const theirs = options.classes ?? [];
  return <form className="shalom-form" aria-label={`Ceder la clase del ${showDate(entry.date)}`} onSubmit={e => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onSubmit({ to_teacher: teacher, return_entry: exchange ? String(data.get('return_entry') || '') || null : null });
  }}>
    <p>{classLabel(entry)}. Solo para esta fecha; nada cambia hasta que coordinación lo confirme.</p>
    {error && <p role="alert" className="shalom-alert">{error}</p>}
    <Field htmlFor={`${id}-to`} label="¿Quién la cubre?">
      <select id={`${id}-to`} required value={teacher} onChange={e => setTeacher(e.target.value)}>
        <option value="">Selecciona a un docente</option>
        {options.teachers.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
      </select>
    </Field>
    <label className="shalom-check"><input type="checkbox" checked={exchange} onChange={e => setExchange(e.target.checked)} /> Es intercambio: yo cubro después una de sus clases</label>
    {exchange && <Field htmlFor={`${id}-back`} label="Su clase que cubro a cambio">
      <select id={`${id}-back`} name="return_entry" required>
        <option value="">{teacher ? (theirs.length ? 'Selecciona una clase' : 'No tiene clases próximas') : 'Primero elige quién cubre'}</option>
        {theirs.map(c => <option key={c.id} value={c.id}>{classLabel(c)}</option>)}
      </select>
    </Field>}
    <div className="shalom-inline-form">
      <button type="submit" disabled={busy || !teacher}>Registrar permuta</button>
      <button type="button" className="shalom-secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
    </div>
  </form>;
}
