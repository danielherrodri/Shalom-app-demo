import { useEffect, useState } from 'react';
import { ASSIGNABLE, PRIVILEGED, ROLE_LABELS, all, request, type Me, type Role } from '../api';
import { EmptyState, Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';
import { AdminAudit } from './AdminAudit';

type Account = { id: string; username: string; displayName: string; roles: Role[] };
type Grant = { id: string; user: string; role: Role; granted_by: string; confirmed: boolean };
type Invitation = { id: string; email: string; roles: Role[]; expires_at: string };

const plain = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const deactivated = ({ upcomingClasses }: { upcomingClasses: number }) => upcomingClasses
  ? `Cuenta dada de baja. Tenía ${upcomingClasses === 1 ? '1 clase o día a cargo' : `${upcomingClasses} clases o días a cargo`} en Shalom Kids: avisa a Coordinación Kids para reasignarlos.`
  : 'Cuenta dada de baja.';

/** Administration of accounts, profiles and invitations. Every rule is enforced again by the server. */
export function Admin({ me }: { me: Me }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inactive, setInactive] = useState<Account[]>([]);
  const [query, setQuery] = useState('');
  // The account and step waiting for a second click: reset of the second factor or deactivation.
  const [confirming, setConfirming] = useState<{ id: string; step: 'reset' | 'deactivate' } | null>(null);
  const [auditVersion, setAuditVersion] = useState(0);
  const task = useTask();
  async function load() {
    const [a, g, i, off] = await Promise.all([all<Account>('admin/accounts/'), all<Grant>('admin/grants/'), all<Invitation>('admin/invitations/'), all<Account>('admin/accounts/?status=inactive')]);
    setAccounts(a); setGrants(g); setInvitations(i); setInactive(off); setAuditVersion(v => v + 1);
  }
  useEffect(() => { void task.run(load); }, []);
  const name = (id: string) => [...accounts, ...inactive].find(a => a.id === id)?.displayName ?? 'Cuenta sin nombre';
  const pending = grants.filter(g => !g.confirmed);
  const act = (work: () => Promise<unknown>, done: string | ((result: any) => string)) =>
    void task.run(async () => { const result = await work(); await load(); return typeof done === 'string' ? done : done(result); });
  const wanted = plain(query);
  const shown = wanted ? accounts.filter(a => plain(a.displayName).includes(wanted) || plain(a.username).includes(wanted)) : accounts;
  const asking = (id: string, step: 'reset' | 'deactivate') => confirming?.id === id && confirming.step === step;

  return <section aria-labelledby="admin-title" className="shalom-admin">
    <h1 id="admin-title">Administración</h1>
    <p>Los perfiles de Coordinación Kids, Administración y Finanzas se activan cuando otra persona de administración los confirma.</p>
    <Status {...task} />

    <h2>Por confirmar</h2>
    {!pending.length ? <EmptyState>No hay perfiles esperando confirmación.</EmptyState> : <ul className="shalom-list">
      {pending.map(g => <li key={g.id}>
        <span><strong>{name(g.user)}</strong> · {ROLE_LABELS[g.role]} <span className="shalom-field-hint">· lo asignó {name(g.granted_by)}</span></span>
        {g.granted_by === me.id || g.user === me.id
          ? <span className="shalom-field-hint">Debe confirmarlo otra persona</span>
          : <button type="button" disabled={task.busy} onClick={() => act(() => request(`admin/grants/${g.id}/confirm/`, {}), 'Perfil confirmado.')}>Confirmar</button>}
      </li>)}
    </ul>}

    <h2>Cuentas</h2>
    <Field htmlFor="account-search" label="Buscar por nombre o usuario">
      <input id="account-search" type="search" autoComplete="off" maxLength={120} value={query} onChange={event => setQuery(event.target.value)} />
    </Field>
    {!shown.length && !task.busy ? <EmptyState>{query ? 'Ninguna cuenta activa coincide con la búsqueda.' : 'No hay cuentas activas.'}</EmptyState> : <ul className="shalom-list">
      {shown.map(account => <li key={account.id} className="shalom-account">
        <div>
          <strong>{account.displayName}</strong>{account.id === me.id && <span className="shalom-field-hint"> (tú)</span>}
          <ul className="shalom-chips" aria-label={`Perfiles de ${account.displayName}`}>
            {grants.filter(g => g.user === account.id).map(g => <li key={g.id}>
              {ROLE_LABELS[g.role]}{!g.confirmed && ' (pendiente)'}
              <button type="button" className="shalom-chip-action" disabled={task.busy} aria-label={`Quitar ${ROLE_LABELS[g.role]} a ${account.displayName}`}
                onClick={() => act(() => request(`admin/grants/${g.id}/revoke/`, {}), 'Perfil retirado.')}>Quitar</button>
            </li>)}
          </ul>
        </div>
        {account.id !== me.id && <form className="shalom-inline-form" onSubmit={event => {
          event.preventDefault();
          const role = new FormData(event.currentTarget).get('role');
          if (role) act(() => request('admin/grants/', { user: account.id, role }), PRIVILEGED.includes(role as Role) ? 'Perfil asignado; falta la confirmación de otra persona.' : 'Perfil asignado.');
        }}>
          <Field htmlFor={`role-${account.id}`} label="Asignar perfil">
            <select id={`role-${account.id}`} name="role" required defaultValue="">
              <option value="">Selecciona un perfil</option>
              {ASSIGNABLE.filter(role => !grants.some(g => g.user === account.id && g.role === role)).map(role => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </Field>
          <button type="submit" disabled={task.busy}>Asignar</button>
        </form>}
        {account.id !== me.id && (!asking(account.id, 'reset')
          ? <button type="button" className="shalom-secondary" onClick={() => setConfirming({ id: account.id, step: 'reset' })}>Reiniciar verificación en dos pasos</button>
          : <div className="shalom-confirm" role="group" aria-label={`Confirmar reinicio de ${account.displayName}`}>
              <p>Hazlo solo en persona, después de confirmar su identidad. También se cerrarán sus sesiones.</p>
              <button type="button" disabled={task.busy} onClick={() => { setConfirming(null); act(() => request(`admin/accounts/${account.id}/mfa-reset/`, {}), 'Verificación reiniciada y sesiones cerradas.'); }}>Sí, reiniciar</button>
              <button type="button" className="shalom-secondary" onClick={() => setConfirming(null)}>Cancelar</button>
            </div>)}
        {account.id !== me.id && (!asking(account.id, 'deactivate')
          ? <button type="button" className="shalom-secondary" aria-label={`Dar de baja a ${account.displayName}`} onClick={() => setConfirming({ id: account.id, step: 'deactivate' })}>Dar de baja</button>
          : <div className="shalom-confirm" role="group" aria-label={`Confirmar baja de ${account.displayName}`}>
              <p>Se le quitarán todos sus perfiles, se cerrarán sus sesiones y ya no podrá entrar. Sus invitaciones pendientes y sus permutas por confirmar se cancelan. Puedes reactivarla después, sin perfiles.</p>
              <button type="button" disabled={task.busy} onClick={() => { setConfirming(null); act(() => request<{ upcomingClasses: number }>(`admin/accounts/${account.id}/deactivate/`, {}), deactivated); }}>Sí, dar de baja</button>
              <button type="button" className="shalom-secondary" onClick={() => setConfirming(null)}>Cancelar</button>
            </div>)}
      </li>)}
    </ul>}

    <h2>Invitaciones</h2>
    <form className="shalom-form" onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget; const data = new FormData(form);
      act(async () => { await request('admin/invitations/', { email: String(data.get('email') ?? '').trim(), roles: data.getAll('roles') }); form.reset(); }, 'Invitación enviada. Vence en 7 días.');
    }}>
      <Field htmlFor="invite-email" label="Correo de la persona"><input id="invite-email" name="email" type="email" autoComplete="off" maxLength={254} required /></Field>
      <fieldset className="shalom-roles">
        <legend>Perfiles que recibirá al aceptar</legend>
        {ASSIGNABLE.map(role => <label key={role} className="shalom-check"><input type="checkbox" name="roles" value={role} /> {ROLE_LABELS[role]}</label>)}
        <p className="shalom-field-hint">El perfil Joven requiere el consentimiento del tutor y todavía no se puede asignar.</p>
      </fieldset>
      <button type="submit" disabled={task.busy}>Enviar invitación</button>
    </form>
    {!invitations.length ? <EmptyState>No hay invitaciones pendientes.</EmptyState> : <ul className="shalom-list">
      {invitations.map(inv => <li key={inv.id}>
        <span><strong>{inv.email}</strong> · {inv.roles.map(r => ROLE_LABELS[r]).join(', ') || 'sin perfiles'} <span className="shalom-field-hint">· vence {new Date(inv.expires_at).toLocaleDateString('es-MX')}</span></span>
        <button type="button" className="shalom-secondary" disabled={task.busy} onClick={() => act(() => request(`admin/invitations/${inv.id}/revoke/`, {}), 'Invitación cancelada.')}>Cancelar</button>
      </li>)}
    </ul>}

    <h2>Cuentas dadas de baja</h2>
    {!inactive.length ? <EmptyState>No hay cuentas dadas de baja.</EmptyState> : <ul className="shalom-list">
      {inactive.map(account => <li key={account.id}>
        <strong>{account.displayName}</strong>
        <button type="button" className="shalom-secondary" disabled={task.busy} aria-label={`Reactivar a ${account.displayName}`}
          onClick={() => act(() => request(`admin/accounts/${account.id}/reactivate/`, {}), 'Cuenta reactivada, sin perfiles. Asígnale los que necesite.')}>Reactivar</button>
      </li>)}
    </ul>}

    <AdminAudit version={auditVersion} />
  </section>;
}
