import { useEffect, useState } from 'react';
import { onSessionEnded, request, takeFragmentToken, type Me, type Role } from './api';
import { CompleteProfile } from './access/CompleteProfile';
import { InvitationAccept } from './access/InvitationAccept';
import { Mfa } from './access/Mfa';
import { Security } from './access/Security';
import { SignIn } from './access/SignIn';
import { Admin } from './admin/Admin';
import { Attendance } from './kids/Attendance';
import { AppShell, type ShalomArea } from './ui/AppShell';

type Stage = 'loading' | 'signin' | 'profile' | 'app';
const KIDS_ROLES: Role[] = ['docente', 'voluntario', 'preparacion', 'coordinacion_kids'];
// The emailed token is single-use: StrictMode's second effect run must not spend or discard it.
let landingHandled = false;

export function App() {
  const [stage, setStage] = useState<Stage>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [area, setArea] = useState<ShalomArea>('home');
  const [notice, setNotice] = useState('');
  const [invitation, setInvitation] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(Infinity);

  async function refresh() {
    const current = await request<Me>('auth/me/');
    setMe(current); setStage('app');
  }
  function signOut(message = '') {
    setMe(null); setArea('home'); setStage('signin'); setNotice(message);
  }
  useEffect(() => {
    onSessionEnded(message => signOut(message));
    if (landingHandled) return;
    landingHandled = true;
    const path = window.location.pathname.replace(/\/+$/, '');
    const token = path === '/entrar' || path === '/invitacion' ? takeFragmentToken() : '';
    if (path === '/entrar' || path === '/invitacion') window.history.replaceState(null, '', '/');
    void (async () => {
      if (path === '/entrar') {
        if (!token) return signOut('Este enlace ya no es válido. Pide uno nuevo.');
        try {
          const result = await request<{ status: string }>('auth/link/consume/', { token });
          if (result.status === 'complete_profile') return setStage('profile');
        } catch (e) { return signOut(e instanceof Error ? e.message : ''); }
      }
      if (path === '/invitacion') setInvitation(token);
      try { await refresh(); } catch { signOut(path === '/invitacion' && token ? 'Para aceptar tu invitación, primero entra con tu correo y luego abre de nuevo el enlace de la invitación.' : ''); }
    })();
  }, []);

  useEffect(() => {
    if (!me) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil(Math.min(me.activeAt + me.idleSeconds, me.startedAt + me.absoluteSeconds) - Date.now() / 1000));
      setRemaining(seconds);
      if (!seconds) signOut('Tu sesión venció. Inicia sesión de nuevo.');
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [me]);

  async function logout() {
    setBusy(true);
    try { await request('auth/logout/', {}); } catch { /* the session is gone either way */ }
    finally { setBusy(false); signOut('Cerraste tu sesión.'); }
  }

  const roles = me?.roles ?? [];
  const isAdmin = roles.includes('administracion');
  // Kids appears for its profiles and for shared Kids equipment; the server scopes every group anyway.
  const showKids = !!me && (roles.some(role => KIDS_ROLES.includes(role)) || me.idleSeconds <= 300);
  const areas: ShalomArea[] = me && !me.mfaPending ? ['home', ...(showKids ? ['kids' as const] : []), ...(isAdmin ? ['admin' as const] : []), 'security'] : ['home'];
  const current = areas.includes(area) ? area : 'home';

  let content;
  if (stage === 'loading') content = <p role="status">Cargando…</p>;
  else if (stage === 'signin') content = <>
    {notice && <p role="status" className="shalom-notice">{notice}</p>}
    <SignIn onSignedIn={refresh} />
  </>;
  else if (stage === 'profile') content = <CompleteProfile onCreated={refresh} onRestart={() => signOut()} />;
  else if (me?.mfaPending) content = <Mfa enrolled={me.mfaEnrolled} onVerified={refresh} />;
  else if (me && invitation) content = <InvitationAccept token={invitation} onDone={async () => { await refresh(); setInvitation(''); }} />;
  else if (me && current === 'kids') content = <Attendance onActivity={refresh} />;
  else if (me && current === 'admin') content = <Admin me={me} />;
  else if (me && current === 'security') content = <Security me={me} onSignedOut={signOut} />;
  else if (me) content = <Home me={me} areas={areas} onNavigate={setArea} />;

  return <AppShell activeArea={current} areas={areas} profileName={me?.displayName} busy={busy} onNavigate={setArea} onLogout={() => void logout()}>
    {me && remaining <= 120 && <SessionWarning seconds={remaining} onContinue={async () => { await request('auth/continue/', {}); await refresh(); }} />}
    {content}
  </AppShell>;
}

function SessionWarning({ seconds, onContinue }: { seconds: number; onContinue: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return <section aria-label="Aviso de vencimiento" className="shalom-warning">
    <p role="status">Tu sesión se cerrará en {Math.ceil(seconds / 60)} {seconds > 60 ? 'minutos' : 'minuto'} por inactividad.</p>
    <button type="button" disabled={busy} onClick={() => { setBusy(true); void onContinue().catch(() => {}).finally(() => setBusy(false)); }}>Continuar sesión</button>
  </section>;
}

function Home({ me, areas, onNavigate }: { me: Me; areas: ShalomArea[]; onNavigate: (area: ShalomArea) => void }) {
  return <section className="shalom-dashboard" aria-labelledby="home-title">
    <h1 id="home-title">Hola, {me.displayName}</h1>
    {!me.roles.length && !areas.includes('kids') && <p className="shalom-empty">Tu cuenta está lista. Administración te asignará los perfiles de las actividades en las que participas.</p>}
    {areas.includes('kids') && <div className="shalom-dashboard-card">
      <h2>Mi clase de hoy</h2>
      <p>Consulta tu grupo, verifica la sesión y registra entradas.</p>
      <button type="button" onClick={() => onNavigate('kids')}>Abrir asistencia Kids</button>
    </div>}
    {areas.includes('admin') && <div className="shalom-dashboard-card">
      <h2>Administración</h2>
      <p>Cuentas, perfiles, confirmaciones pendientes e invitaciones.</p>
      <button type="button" onClick={() => onNavigate('admin')}>Abrir administración</button>
    </div>}
  </section>;
}
