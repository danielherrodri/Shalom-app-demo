import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, type ShalomArea } from './ui/AppShell';
import { Field, EmptyState } from './ui/Primitives';
import './style.css';

type Row = { id: string; name?: string; display_name?: string; group?: string; starts_at?: string };
type Profile = { username: string; activeAt: number; startedAt: number; idleSeconds: number; absoluteSeconds: number };
let csrf = '';
async function request(path: string, data?: unknown) {
  if (!csrf || path.endsWith('/login/')) {
    const response = await fetch('/api/v1/auth/csrf/', { credentials: 'same-origin', cache: 'no-store' });
    csrf = (await response.json()).csrfToken;
  }
  const response = await fetch('/api/v1/' + path, {
    method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'No fue posible completar la solicitud. Revisa los datos e intenta de nuevo.');
  if (path.endsWith('/login/')) csrf = '';
  return result;
}

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [area, setArea] = useState<ShalomArea>('home');
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<Row[]>([]);
  const [meetings, setMeetings] = useState<Row[]>([]);
  const [people, setPeople] = useState<Row[]>([]);
  const [group, setGroup] = useState('');
  const [meeting, setMeeting] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(300);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const generation = useRef(0);
  async function load() {
    const p = await request('auth/me/');
    const [g, m] = await Promise.all([request('groups/'), request('sessions/')]);
    setProfile(p); setGroups(g.results); setMeetings(m.results); setArea('kids');
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
  }
  function clear() { generation.current++; setProfile(null); setPeople([]); setGroups([]); setMeetings([]); setGroup(''); setMeeting(''); setSearch(''); setArea('home'); }
  async function act(task: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await task(); } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error.');
      try { await request('auth/me/'); } catch { clear(); }
    } finally { setBusy(false); }
  }
  useEffect(() => { void load().catch(() => clear()); }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => {
    if (!profile) return;
    const timer = window.setInterval(() => {
      const now = Date.now() / 1000;
      const seconds = Math.max(0, Math.ceil(Math.min(profile.activeAt + profile.idleSeconds, profile.startedAt + profile.absoluteSeconds) - now));
      setRemaining(seconds);
      if (!seconds) { clear(); setError('Tu sesión venció. Inicia sesión de nuevo.'); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [profile]);
  async function chooseGroup(id: string) {
    const current = ++generation.current;
    setGroup(id); setPeople([]); setMeeting(''); setSearch('');
    if (!id) return;
    const result = await request(`groups/${id}/people/`);
    if (generation.current === current) setPeople(result.results);
  }
  const visiblePeople = people.filter(person => (person.display_name ?? '').toLocaleLowerCase('es-MX').includes(search.trim().toLocaleLowerCase('es-MX')));
  return <AppShell
    activeArea={area}
    profileName={profile?.username}
    busy={busy}
    onNavigate={setArea}
    onLogout={() => void act(async () => { await request('auth/logout/', {}); clear(); })}
  >
    {profile && area === 'home' ? (
      <section className="shalom-dashboard">
        <h1>Tu espacio en Shalom</h1>
        <p>Accede directamente a tus tareas asignadas. Solo se muestra el módulo autorizado para esta base.</p>
        <div className="shalom-dashboard-card">
          <h2>Mi clase de hoy</h2>
          <p>Consulta tu grupo, verifica la sesión y registra entradas de ejemplo.</p>
          <button type="button" onClick={() => setArea('kids')}>Abrir asistencia Kids</button>
        </div>
      </section>
    ) : <>
      <h1 className="text-3xl font-bold">{profile ? 'Mi clase de hoy' : 'Acceso de desarrollo'}</h1>
      <p>Primera base conectada a la API. No introducir información real.</p>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red-800 p-4 text-red-900">{error}</p>}
      <p role="status" aria-live="polite">{message || (busy ? 'Procesando…' : '')}</p>
      {!profile ? <form className="max-w-md space-y-5" onSubmit={event => {
        event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
        void act(async () => { await request('auth/login/', {username: data.get('username'), password: data.get('password')}); form.reset(); await load(); });
      }}>
        <Field htmlFor="username" label="Usuario"><input id="username" name="username" autoComplete="username" maxLength={150} required /></Field>
        <Field htmlFor="password" label="Contraseña"><input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required /></Field>
        <button disabled={busy} type="submit">Iniciar sesión</button>
      </form> : <>
        <p className="text-base">Sesión de equipo compartido · cierre tras 5 minutos de inactividad.</p>
        {remaining <= 120 && <section aria-label="Aviso de vencimiento" className="space-y-3 rounded-xl border-2 border-amber-900 p-4"><p role="status">Tu sesión está por vencer. Puedes continuar trabajando.</p><button disabled={busy} onClick={() => void act(async () => {await request('auth/continue/', {}); setProfile(await request('auth/me/'));})}>Continuar sesión</button></section>}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field htmlFor="group" label="Grupo autorizado"><select id="group" value={group} disabled={busy} onChange={e => void act(() => chooseGroup(e.target.value))}><option value="">Selecciona un grupo</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
          <Field htmlFor="meeting" label="Sesión abierta"><select id="meeting" value={meeting} disabled={!group || busy} onChange={e => setMeeting(e.target.value)}><option value="">Selecciona una sesión</option>{meetings.filter(m => m.group === group).map(m => <option key={m.id} value={m.id}>{new Date(m.starts_at!).toLocaleString('es-MX')}</option>)}</select></Field>
        </div>
        {!groups.length && <EmptyState>No tienes grupos asignados. Contacta a coordinación.</EmptyState>}
        {group && !people.length && !busy && !error && <EmptyState>No hay integrantes en este grupo.</EmptyState>}
        {people.length > 0 && <Field htmlFor="people-search" label="Buscar alumno"><input id="people-search" type="search" value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" placeholder="Escribe un nombre" /></Field>}
        {people.length > 0 && visiblePeople.length === 0 && <EmptyState>No encontramos alumnos con ese nombre. Modifica la búsqueda.</EmptyState>}
        <ul className="space-y-4">{visiblePeople.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-400 bg-white p-5"><span className="font-semibold">{person.display_name}</span><button disabled={!meeting || busy} onClick={() => void act(async () => {const r = await request('attendance/', {meeting, person: person.id}); setMessage(r.created ? 'Entrada registrada.' : 'La entrada ya estaba registrada.'); setProfile(await request('auth/me/'));})}>Registrar entrada</button></li>)}</ul>
      </>}
    </>}
  </AppShell>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
