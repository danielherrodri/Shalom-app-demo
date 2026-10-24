import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
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
    const p = await request('auth/me/'); setProfile(p);
    const [g, m] = await Promise.all([request('groups/'), request('sessions/')]);
    setGroups(g.results); setMeetings(m.results);
  }
  function clear() { generation.current++; setProfile(null); setPeople([]); setGroups([]); setMeetings([]); setGroup(''); setMeeting(''); }
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
    setGroup(id); setPeople([]); setMeeting('');
    if (!id) return;
    const result = await request(`groups/${id}/people/`);
    if (generation.current === current) setPeople(result.results);
  }
  return <>
    <a className="sr-only focus:not-sr-only" href="#main">Ir al contenido</a>
    <header className="border-b border-stone-300 px-5 py-5"><div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4"><strong>Shalom</strong><span className="text-base">Desarrollo · solo datos ficticios</span>{profile && <button disabled={busy} onClick={() => void act(async () => {await request('auth/logout/', {}); clear();})}>Cerrar sesión</button>}</div></header>
    <main id="main" className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
      <h1 className="text-3xl font-bold">{profile ? 'Asistencia Kids' : 'Acceso de desarrollo'}</h1>
      <p>Primera base conectada a la API. No introducir información real.</p>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border-2 border-red-800 p-4 text-red-900">{error}</p>}
      <p role="status" aria-live="polite">{message || (busy ? 'Procesando…' : '')}</p>
      {!profile ? <form className="max-w-md space-y-5" onSubmit={event => {
        event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
        void act(async () => { await request('auth/login/', {username: data.get('username'), password: data.get('password')}); form.reset(); await load(); });
      }}>
        <div><label htmlFor="username" className="mb-2 block font-semibold">Usuario</label><input id="username" name="username" autoComplete="username" maxLength={150} required /></div>
        <div><label htmlFor="password" className="mb-2 block font-semibold">Contraseña</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required /></div>
        <button disabled={busy} type="submit">Iniciar sesión</button>
      </form> : <>
        <p className="text-base">Sesión de equipo compartido · cierre tras 5 minutos de inactividad.</p>
        {remaining <= 120 && <section aria-label="Aviso de vencimiento" className="space-y-3 rounded-xl border-2 border-amber-900 p-4"><p role="status">Tu sesión está por vencer. Puedes continuar trabajando.</p><button disabled={busy} onClick={() => void act(async () => {await request('auth/continue/', {}); setProfile(await request('auth/me/'));})}>Continuar sesión</button></section>}
        <div className="grid gap-6 sm:grid-cols-2"><div><label className="mb-2 block font-semibold" htmlFor="group">Grupo autorizado</label><select id="group" value={group} disabled={busy} onChange={e => void act(() => chooseGroup(e.target.value))}><option value="">Selecciona un grupo</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
        <div><label className="mb-2 block font-semibold" htmlFor="meeting">Sesión abierta</label><select id="meeting" value={meeting} disabled={!group || busy} onChange={e => setMeeting(e.target.value)}><option value="">Selecciona una sesión</option>{meetings.filter(m => m.group === group).map(m => <option key={m.id} value={m.id}>{new Date(m.starts_at!).toLocaleString('es-MX')}</option>)}</select></div></div>
        {!groups.length && <p>No tienes grupos asignados. Contacta a coordinación.</p>}
        {group && !people.length && !busy && <p>No hay integrantes en este grupo.</p>}
        <ul className="space-y-4">{people.map(person => <li key={person.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-400 bg-white p-5"><span className="font-semibold">{person.display_name}</span><button disabled={!meeting || busy} onClick={() => void act(async () => {const r = await request('attendance/', {meeting, person: person.id}); setMessage(r.created ? 'Entrada registrada.' : 'La entrada ya estaba registrada.'); setProfile(await request('auth/me/'));})}>Registrar entrada</button></li>)}</ul>
      </>}
    </main>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
