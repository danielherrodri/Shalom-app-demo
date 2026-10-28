import { ROLE_LABELS, request, type Role } from '../api';
import { Status, useTask } from '../ui/Status';

/** Accepting links the signed-in account to what administration prepared; the token lives only in memory. */
export function InvitationAccept({ token, onDone }: { token: string; onDone: () => Promise<void> }) {
  const task = useTask();
  return <section className="shalom-panel" aria-labelledby="invitation-title">
    <h1 id="invitation-title">Tu invitación a Shalom</h1>
    <p>Administración te invitó a usar Shalom con tu cuenta. Al aceptar, se agregan los perfiles que te asignaron.</p>
    <Status {...task} />
    <button type="button" disabled={task.busy} onClick={() => void task.run(async () => {
      const result = await request<{ roles: Role[] }>('invitations/accept/', { token });
      await onDone();
      return result.roles.length ? `Invitación aceptada. Perfiles: ${result.roles.map(role => ROLE_LABELS[role]).join(', ')}.` : 'Invitación aceptada.';
    })}>Aceptar invitación</button>
  </section>;
}
