import { useEffect, useState } from 'react';
import { ApiError, INVALID_LINK, request } from '../api';
import { Field } from '../ui/Primitives';
import { Status, useTask } from '../ui/Status';

type Text = { version: string; body: string };
type Texts = { aviso: Text; dato_sensible: Text };

export function CompleteProfile({ onCreated, onRestart }: { onCreated: () => Promise<void>; onRestart: () => void }) {
  const [texts, setTexts] = useState<Texts | null>(null);
  const [closed, setClosed] = useState('');
  // The server ends the signup window (minor, expired or used link): the form cannot be retried.
  const [ended, setEnded] = useState('');
  const task = useTask();
  async function loadTexts() {
    try { setTexts(await request<Texts>('auth/consents/')); }
    catch (e) { setClosed(e instanceof Error ? e.message : 'El registro todavía no está disponible.'); }
  }
  useEffect(() => { void loadTexts(); }, []);
  const today = new Date().toISOString().slice(0, 10);

  if (closed || ended) return <section className="shalom-panel" aria-labelledby="profile-title">
    <h1 id="profile-title">Completa tu perfil</h1>
    <p role="alert" className="shalom-alert" tabIndex={-1}>{closed || ended}</p>
    {ended && <button type="button" onClick={onRestart}>Volver al inicio</button>}
  </section>;

  return <section className="shalom-panel" aria-labelledby="profile-title">
    <h1 id="profile-title">Completa tu perfil</h1>
    <p>Tu correo ya está verificado. Falta lo mínimo para crear tu cuenta. Los perfiles (docente, familia, voluntariado…) los asigna administración.</p>
    <Status {...task} />
    {!texts ? <p>Cargando los textos…</p> : <form className="shalom-form" onSubmit={event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void task.run(async () => {
        try {
          await request('auth/profile/', {
            display_name: String(data.get('display_name') ?? '').trim(),
            birth_date: data.get('birth_date'),
            privacy_version: texts.aviso.version,
            sensitive_version: texts.dato_sensible.version,
            accept_privacy: data.get('accept_privacy') === 'on',
            accept_sensitive: data.get('accept_sensitive') === 'on',
          });
        } catch (e) {
          // The texts changed while the form was open: show the new version before asking again.
          if (e instanceof ApiError && e.status === 409) await loadTexts();
          if (e instanceof ApiError && (e.status === 403 || e.message === INVALID_LINK)) setEnded(e.message);
          throw e;
        }
        await onCreated();
      });
    }}>
      <Field htmlFor="display_name" label="¿Cómo quieres que te llamemos?" hint="Se muestra a las personas que coordinan tus actividades.">
        <input id="display_name" name="display_name" autoComplete="nickname" maxLength={120} required />
      </Field>
      <Field htmlFor="birth_date" label="Fecha de nacimiento" hint="Solo la usamos para confirmar que eres mayor de edad; no la guardamos.">
        <input id="birth_date" name="birth_date" type="date" max={today} min="1900-01-01" required />
      </Field>
      <Consent id="accept_privacy" title="Aviso de privacidad" text={texts.aviso}
        label="Leí el aviso de privacidad y autorizo el tratamiento de mis datos." />
      <Consent id="accept_sensitive" title="Dato sensible: afiliación religiosa" text={texts.dato_sensible}
        label="Autorizo expresamente el tratamiento de mi dato sensible." />
      <button disabled={task.busy} type="submit">Crear mi cuenta</button>
    </form>}
  </section>;
}

function Consent({ id, title, text, label }: { id: string; title: string; text: Text; label: string }) {
  return <fieldset className="shalom-consent">
    <legend>{title} <span className="shalom-version">versión {text.version}</span></legend>
    <div className="shalom-consent-text" tabIndex={0} role="region" aria-label={title}>{text.body}</div>
    <label className="shalom-check"><input type="checkbox" id={id} name={id} required /> {label}</label>
  </fieldset>;
}
