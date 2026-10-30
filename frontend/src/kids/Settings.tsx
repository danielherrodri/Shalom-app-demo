import { useEffect, useState } from 'react';
import { all, request } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { WEEKDAYS, ages, hours, numberOrNull, type Group, type Service } from './model';

const groupValues = (data: FormData) => ({
  name: String(data.get('name') ?? '').trim(), min_age: numberOrNull(data.get('min_age')), max_age: numberOrNull(data.get('max_age')),
  teachers_per_class: Number(data.get('teachers_per_class')), active: data.get('active') === 'on',
});
const serviceValues = (data: FormData) => ({
  name: String(data.get('name') ?? '').trim(), weekday: Number(data.get('weekday')),
  starts_at: String(data.get('starts_at')), ends_at: String(data.get('ends_at')), active: data.get('active') === 'on',
});

/** Groups (age ranges only), services and their schedules. A change here reaches the roster and agendas. */
export function Settings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const task = useTask();
  async function load() {
    const [g, s] = await Promise.all([all<Group>('kids/groups/'), all<Service>('kids/services/')]);
    setGroups(g); setServices(s);
  }
  useEffect(() => { void task.run(load); }, []);
  const save = (work: () => Promise<unknown>, done: string) => void task.run(async () => { await work(); await load(); return done; });

  return <section aria-labelledby="settings-title" className="shalom-admin">
    <h1 id="settings-title">Configuración</h1>
    <p>Grupos y horarios de los servicios. Los grupos solo guardan su rango de edad: aquí no se registra a ningún niño.</p>
    <Status {...task} />

    <h2>Grupos</h2>
    {!groups.length && !task.busy && <EmptyState>Todavía no hay grupos.</EmptyState>}
    <ul className="shalom-list">{groups.map(g => <li key={g.id}>
      <form className="shalom-inline-form" aria-label={`Grupo ${g.name}`} onSubmit={e => { e.preventDefault(); const values = groupValues(new FormData(e.currentTarget)); save(() => request(`kids/groups/${g.id}/`, values, 'PATCH'), `Grupo «${values.name}» guardado.`); }}>
        <GroupFields prefix={g.id} group={g} />
        <button type="submit" disabled={task.busy}>Guardar «{g.name}»</button>
      </form>
    </li>)}</ul>
    <form className="shalom-inline-form shalom-new" aria-label="Nuevo grupo" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const values = groupValues(new FormData(form)); save(async () => { await request('kids/groups/', values); form.reset(); }, `Grupo «${values.name}» creado.`); }}>
      <GroupFields prefix="nuevo" />
      <button type="submit" disabled={task.busy}>Agregar grupo</button>
    </form>

    <h2>Servicios y horarios</h2>
    {!services.length && !task.busy && <EmptyState>Todavía no hay servicios.</EmptyState>}
    <ul className="shalom-list">{services.map(s => <li key={s.id}>
      <form className="shalom-inline-form" aria-label={`Servicio ${s.name}`} onSubmit={e => { e.preventDefault(); const values = serviceValues(new FormData(e.currentTarget)); save(() => request(`kids/services/${s.id}/`, values, 'PATCH'), `Servicio «${values.name}» guardado.`); }}>
        <ServiceFields prefix={s.id} service={s} />
        <button type="submit" disabled={task.busy}>Guardar «{s.name}»</button>
      </form>
    </li>)}</ul>
    <form className="shalom-inline-form shalom-new" aria-label="Nuevo servicio" onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const values = serviceValues(new FormData(form)); save(async () => { await request('kids/services/', values); form.reset(); }, `Servicio «${values.name}» creado.`); }}>
      <ServiceFields prefix="nuevo" />
      <button type="submit" disabled={task.busy}>Agregar servicio</button>
    </form>
  </section>;
}

function GroupFields({ prefix, group }: { prefix: string; group?: Group }) {
  return <>
    <Field htmlFor={`g-name-${prefix}`} label="Nombre del grupo"><input id={`g-name-${prefix}`} name="name" required maxLength={80} defaultValue={group?.name} /></Field>
    <Field htmlFor={`g-min-${prefix}`} label="Edad mínima"><input id={`g-min-${prefix}`} name="min_age" type="number" min={0} max={17} defaultValue={group?.min_age ?? ''} /></Field>
    <Field htmlFor={`g-max-${prefix}`} label="Edad máxima"><input id={`g-max-${prefix}`} name="max_age" type="number" min={0} max={17} defaultValue={group?.max_age ?? ''} /></Field>
    <Field htmlFor={`g-seats-${prefix}`} label="Docentes por clase"><input id={`g-seats-${prefix}`} name="teachers_per_class" type="number" min={1} max={6} required defaultValue={group?.teachers_per_class ?? 2} /></Field>
    <label className="shalom-check"><input type="checkbox" name="active" defaultChecked={group?.active ?? true} /> Activo</label>
    {group && <p className="shalom-field-hint shalom-row-note">{ages(group)}</p>}
  </>;
}

function ServiceFields({ prefix, service }: { prefix: string; service?: Service }) {
  return <>
    <Field htmlFor={`s-name-${prefix}`} label="Nombre del servicio"><input id={`s-name-${prefix}`} name="name" required maxLength={60} defaultValue={service?.name} /></Field>
    <Field htmlFor={`s-day-${prefix}`} label="Día"><select id={`s-day-${prefix}`} name="weekday" defaultValue={service?.weekday ?? 6}>{WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}</select></Field>
    <Field htmlFor={`s-start-${prefix}`} label="Inicio"><input id={`s-start-${prefix}`} name="starts_at" type="time" required defaultValue={service?.starts_at.slice(0, 5)} /></Field>
    <Field htmlFor={`s-end-${prefix}`} label="Fin"><input id={`s-end-${prefix}`} name="ends_at" type="time" required defaultValue={service?.ends_at.slice(0, 5)} /></Field>
    <label className="shalom-check"><input type="checkbox" name="active" defaultChecked={service?.active ?? true} /> Activo</label>
    {service && <p className="shalom-field-hint shalom-row-note">{WEEKDAYS[service.weekday]} · {hours(service)}</p>}
  </>;
}
