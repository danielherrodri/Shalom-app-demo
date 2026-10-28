import { useEffect, useRef, useState } from 'react';

export type Notice = { error: string; message: string };

/** Error and progress messages: errors take focus, progress is announced politely. */
export function Status({ error, message, busy }: Notice & { busy: boolean }) {
  const errorRef = useRef<HTMLParagraphElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  // A button disabled while working drops focus to <body>; keep keyboard users next to the outcome.
  useEffect(() => { if (message && document.activeElement === document.body) messageRef.current?.focus(); }, [message]);
  return <>
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="shalom-alert">{error}</p>}
    <p ref={messageRef} tabIndex={-1} role="status" aria-live="polite" className="shalom-live">{message || (busy ? 'Procesando…' : '')}</p>
  </>;
}

/** Runs one request at a time and keeps its outcome for Status. */
export function useTask() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run(task: () => Promise<string | void>) {
    setBusy(true); setError(''); setMessage('');
    try {
      const done = await task();
      if (done) setMessage(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error.');
      return false;
    } finally { setBusy(false); }
  }
  return { busy, error, message, run, setError };
}
