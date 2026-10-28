import { useState } from 'react';
import { request, type Me } from '../api';
import { Status, useTask } from '../ui/Status';

export function Security({ me, onSignedOut }: { me: Me; onSignedOut: (notice: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const task = useTask();
  const minutes = Math.round(me.idleSeconds / 60);
  return <section className="shalom-panel" aria-labelledby="security-title">
    <h1 id="security-title">Seguridad de tu cuenta</h1>
    <Status {...task} />
    <dl className="shalom-facts">
      <div><dt>Verificación en dos pasos</dt><dd>{me.mfaEnrolled ? 'Activa' : 'No configurada'}</dd></div>
      <div><dt>Esta sesión</dt><dd>Se cierra tras {minutes} minutos sin actividad y, como máximo, a las {Math.round(me.absoluteSeconds / 3600)} horas.</dd></div>
    </dl>
    <h2>Cerrar sesión en todos los dispositivos</h2>
    <p>Úsalo si perdiste un celular o entraste desde un equipo que no es tuyo. Tendrás que volver a entrar con un enlace por correo.</p>
    {!confirming
      ? <button type="button" className="shalom-secondary" onClick={() => setConfirming(true)}>Cerrar todas mis sesiones</button>
      : <div className="shalom-confirm" role="group" aria-label="Confirmar cierre de sesiones">
          <p>¿Cerrar todas tus sesiones, incluida esta?</p>
          <button type="button" disabled={task.busy} onClick={() => void task.run(async () => {
            await request('auth/logout-everywhere/', {});
            onSignedOut('Cerramos tu sesión en todos los dispositivos.');
          })}>Sí, cerrar todas</button>
          <button type="button" className="shalom-secondary" onClick={() => setConfirming(false)}>Cancelar</button>
        </div>}
  </section>;
}
