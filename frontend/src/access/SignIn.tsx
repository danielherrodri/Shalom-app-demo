import { useEffect, useState } from 'react';
import { request } from '../api';
import { Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';

type Providers = { emailLink: boolean; google: boolean; localPassword: boolean };

export function SignIn({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [sentTo, setSentTo] = useState('');
  const task = useTask();
  useEffect(() => { void request<Providers>('auth/providers/').then(setProviders).catch(() => setProviders({ emailLink: true, google: false, localPassword: false })); }, []);

  if (sentTo) return <section className="shalom-panel" aria-labelledby="sent-title">
    <h1 id="sent-title">Revisa tu correo</h1>
    <p>Si <strong>{sentTo}</strong> puede entrar a Shalom, te enviamos un enlace. Ábrelo en este dispositivo; vence en 15 minutos y solo funciona una vez.</p>
    <p className="shalom-field-hint">¿No llegó? Revisa la carpeta de correo no deseado o espera unos minutos antes de pedir otro.</p>
    <button type="button" className="shalom-secondary" onClick={() => setSentTo('')}>Usar otro correo</button>
  </section>;

  return <section className="shalom-panel" aria-labelledby="signin-title">
    <h1 id="signin-title">Entrar a Shalom</h1>
    <p>Sin contraseña: te enviamos un enlace a tu correo.</p>
    <Status {...task} />
    <form className="shalom-form" onSubmit={event => {
      event.preventDefault();
      const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
      void task.run(async () => { await request('auth/link/', { email }); setSentTo(email); });
    }}>
      <Field htmlFor="email" label="Correo electrónico">
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} required />
      </Field>
      <button disabled={task.busy} type="submit">Enviarme el enlace</button>
    </form>
    {providers && !providers.google && <p className="shalom-field-hint">La opción «Continuar con Google» estará disponible más adelante.</p>}
    {providers?.localPassword && <LocalLogin onSignedIn={onSignedIn} />}
  </section>;
}

/** Synthetic-data development adapter; the server refuses it outside development. */
function LocalLogin({ onSignedIn }: { onSignedIn: () => Promise<void> }) {
  const task = useTask();
  return <details className="shalom-details">
    <summary>Acceso de desarrollo (equipo compartido de Kids)</summary>
    <p className="shalom-field-hint">Solo con cuentas ficticias. Cierra la sesión tras 5 minutos de inactividad.</p>
    <Status {...task} />
    <form className="shalom-form" onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget; const data = new FormData(form);
      void task.run(async () => {
        await request('auth/login/', { username: data.get('username'), password: data.get('password') });
        form.reset();
        await onSignedIn();
      });
    }}>
      <Field htmlFor="username" label="Usuario"><input id="username" name="username" autoComplete="username" maxLength={150} required /></Field>
      <Field htmlFor="password" label="Contraseña"><input id="password" name="password" type="password" autoComplete="current-password" maxLength={1024} required /></Field>
      <button disabled={task.busy} type="submit">Iniciar sesión</button>
    </form>
  </details>;
}
