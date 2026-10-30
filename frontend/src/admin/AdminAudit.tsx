import { useEffect, useState } from 'react';
import { request } from '../api';
import { EmptyState } from '../ui/Primitives';

type Entry = { id: string; action: string; actorName: string; target: string; created_at: string };
const ACTIONS: Record<string, string> = {
  'account.create': 'creó su cuenta', 'account.deactivate': 'dio de baja a', 'account.reactivate': 'reactivó a',
  'role.grant': 'asignó el perfil', 'role.confirm': 'confirmó el perfil', 'role.revoke': 'quitó el perfil',
  'role.bootstrap': 'recibió por comando del servidor el perfil',
  'invitation.create': 'invitó a', 'invitation.revoke': 'canceló la invitación a', 'invitation.accept': 'aceptó una invitación',
  'mfa.enroll': 'activó la verificación en dos pasos', 'mfa.reset': 'reinició la verificación en dos pasos de',
  'session.revoke_all': 'cerró sus sesiones en todos los dispositivos',
};
// Actions on one's own account: the target repeats the actor, so it is left out.
const SELF = new Set(['account.create', 'invitation.accept', 'mfa.enroll', 'session.revoke_all']);

/** Who changed accounts, profiles and invitations, newest first (last 200). Reloaded after each change. */
export function AdminAudit({ version }: { version: number }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => {
    if (!version) return;
    request<{ results: Entry[] }>('admin/audit/').then(page => setEntries(page.results), () => setEntries(null));
  }, [version]);
  return <>
    <h2>Bitácora</h2>
    <p className="shalom-field-hint">Cada cambio de cuentas, perfiles e invitaciones queda registrado con quién lo hizo y cuándo. No se puede editar.</p>
    {entries && !entries.length ? <EmptyState>Todavía no hay cambios registrados.</EmptyState> : <ul className="shalom-list">
      {(entries ?? []).map(e => <li key={e.id}>
        <span><strong>{e.actorName}</strong> {ACTIONS[e.action] ?? e.action}{!SELF.has(e.action) && e.target && <> {e.target}</>}</span>
        <span className="shalom-field-hint">{new Date(e.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
      </li>)}
    </ul>}
  </>;
}
