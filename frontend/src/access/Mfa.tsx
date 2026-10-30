import { useState } from 'react';
import { request } from '../api';
import { Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';

type Setup = { secret: string; uri: string; qr: string };

// Only an inline SVG built by the server: inside <img> it cannot run scripts or load anything.
const isQr = (src: string) => src.startsWith('data:image/svg+xml');

/** Second factor for privileged profiles: first enrollment, then a code in every new session. */
export function Mfa({ enrolled, onVerified }: { enrolled: boolean; onVerified: () => Promise<void> }) {
  const [setup, setSetup] = useState<Setup | null>(null);
  const task = useTask();
  const confirming = !enrolled;

  function submitCode(form: HTMLFormElement) {
    const code = String(new FormData(form).get('code') ?? '').replace(/\s/g, '');
    void task.run(async () => {
      await request(confirming ? 'auth/mfa/confirm/' : 'auth/mfa/verify/', { code });
      // The key is shown once; drop it from memory as soon as it is confirmed.
      setSetup(null);
      form.reset();
      await onVerified();
    });
  }

  return <section className="shalom-panel" aria-labelledby="mfa-title">
    <h1 id="mfa-title">{confirming ? 'Activa la verificación en dos pasos' : 'Verifica tu identidad'}</h1>
    <p>{confirming
      ? 'Tu perfil permite ver o cambiar información delicada. Además del enlace por correo, pediremos un código de una app de autenticación (por ejemplo, Google Authenticator o Microsoft Authenticator).'
      : 'Escribe el código de 6 dígitos que muestra tu app de autenticación.'}</p>
    <Status {...task} />
    {confirming && !setup && <button type="button" disabled={task.busy} onClick={() => void task.run(async () => setSetup(await request<Setup>('auth/mfa/setup/', {})))}>Generar mi clave</button>}
    {confirming && setup && <ol className="shalom-steps">
      <li>En tu app de autenticación, agrega una cuenta nueva.</li>
      <li>
        {isQr(setup.qr) && <>
          <p>Desde la computadora, escanea este código con la cámara de tu app (no lo compartas ni le tomes captura):</p>
          <img className="shalom-qr" src={setup.qr} width={180} height={180} alt="Código QR con tu clave de configuración para la app de autenticación" />
          <p>O elige «Ingresar una clave de configuración» y escribe esta clave:</p>
        </>}
        {!isQr(setup.qr) && <p>Elige «Ingresar una clave de configuración» y escribe esta clave (no la compartas ni le tomes captura):</p>}
        <p className="shalom-secret" aria-label="Clave de configuración">{setup.secret.match(/.{1,4}/g)?.join(' ')}</p>
        <p className="shalom-field-hint">En el celular también puedes <a href={setup.uri}>abrirla directamente en tu app</a>.</p>
      </li>
      <li>Escribe abajo el código que aparece.</li>
    </ol>}
    {(!confirming || setup) && <form className="shalom-form" onSubmit={event => { event.preventDefault(); submitCode(event.currentTarget); }}>
      <Field htmlFor="code" label="Código de 6 dígitos">
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\s*(\d\s*){6}" maxLength={9} required />
      </Field>
      <button disabled={task.busy} type="submit">{confirming ? 'Activar' : 'Verificar'}</button>
    </form>}
    {!confirming && <p className="shalom-field-hint">¿Perdiste tu dispositivo? Pide a otra persona de administración, en persona, que reinicie tu verificación.</p>}
  </section>;
}
