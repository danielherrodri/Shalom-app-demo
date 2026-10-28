export type Role = 'joven' | 'familia' | 'voluntario' | 'caja' | 'preparacion' | 'docente' | 'coordinacion_kids' | 'administracion' | 'finanzas';

export type Me = {
  id: string; username: string; displayName: string; roles: Role[]; mfaPending: boolean; mfaEnrolled: boolean;
  activeAt: number; startedAt: number; idleSeconds: number; absoluteSeconds: number;
};

export type Page<T> = { count: number; next: string | null; results: T[] };

export const ROLE_LABELS: Record<Role, string> = {
  joven: 'Joven', familia: 'Familia / tutor', voluntario: 'Voluntario', caja: 'Caja', preparacion: 'Preparación',
  docente: 'Docente', coordinacion_kids: 'Coordinación Kids', administracion: 'Administración', finanzas: 'Finanzas',
};
// Mirrors PRIVILEGED_ROLES on the server; the server still decides.
export const PRIVILEGED: Role[] = ['coordinacion_kids', 'administracion', 'finanzas'];
// Joven waits for the tutor's consent (phase 3), so it is never offered.
export const ASSIGNABLE = (Object.keys(ROLE_LABELS) as Role[]).filter(role => role !== 'joven');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

// Same wording as the server's INVALID_LINK: the signup window is over.
export const INVALID_LINK = 'Este enlace ya no es válido. Pide uno nuevo.';
const GENERIC = 'No fue posible completar la solicitud. Revisa los datos e intenta de nuevo.';
let csrf = '';
let unauthorized = (_message: string) => {};
/** Called when the server ends the session (inactivity, time limit or closed elsewhere). */
export function onSessionEnded(handler: (message: string) => void) { unauthorized = handler; }

async function freshCsrf() {
  const response = await fetch('/api/v1/auth/csrf/', { credentials: 'same-origin', cache: 'no-store' });
  csrf = (await response.json()).csrfToken;
}

export async function request<T = any>(path: string, data?: unknown): Promise<T> {
  const post = data !== undefined;
  if (post && !csrf) await freshCsrf();
  const response = await fetch('/api/v1/' + path, {
    method: post ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: post ? { 'Content-Type': 'application/json', 'X-CSRFToken': csrf } : {},
    body: post ? JSON.stringify(data) : undefined,
  });
  // Signing in, verifying or closing a session rotates the session and its CSRF token.
  if (post && path.startsWith('auth/')) csrf = '';
  const result = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail = result && typeof result.detail === 'string' ? result.detail : GENERIC;
    if (response.status === 401 && path !== 'auth/me/') { csrf = ''; unauthorized(detail); }
    throw new ApiError(detail, response.status);
  }
  return result as T;
}

/** Reads every page of a small admin listing. */
export async function all<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const result = await request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${page}`);
    rows.push(...result.results);
    if (!result.next) return rows;
  }
}

/** Takes a single-use token from the URL fragment and removes it from the address bar and history. */
export function takeFragmentToken(): string {
  const token = window.location.hash.slice(1);
  if (token) window.history.replaceState(null, '', window.location.pathname);
  return /^[A-Za-z0-9_-]{20,128}$/.test(token) ? token : '';
}
