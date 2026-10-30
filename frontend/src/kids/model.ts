import type { Role } from '../api';

export type Group = { id: string; name: string; min_age: number | null; max_age: number | null; teachers_per_class: number; active: boolean };
export type Service = { id: string; name: string; weekday: number; starts_at: string; ends_at: string; active: boolean };
export type Member = { id: string; displayName: string; roles: Role[]; upcoming: number; next: string | null; groups: string[] };
export type RosterRow = { id: string; date: string; service: string; group: string; teacher: string; teacherName: string; reminded: boolean };
export type Lead = { id: string; date: string; group: string; lead: string; leadName: string; reminded: boolean };
export type ClassSummary = { id: string; date: string; service: string; starts_at: string; group: string };
export type Swap = {
  id: string; status: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada'; entry: ClassSummary; returnEntry: ClassSummary | null;
  from: string; fromName: string; to: string; toName: string; createdAt: string;
};
export type Lesson = { id: string; date: string; group: string; unit: string; title: string; manual_page: number | null; objective: string; materials: string };
export type Item = {
  id: string; event: string; kind: 'tarea' | 'material'; title: string; assignee: string | null; assigneeName: string | null;
  due_date: string | null; quantity: number | null; received: number; status: 'pendiente' | 'aceptada' | 'completada';
};
export type KidsEvent = { id: string; title: string; date: string; description: string; active: boolean; items: Item[] };

// Python weekdays, as the server stores them: Monday is 0, Sunday is 6.
export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const STATUS_LABELS: Record<Item['status'], string> = { pendiente: 'Pendiente de aceptar', aceptada: 'Aceptada', completada: 'Completada' };
export const SWAP_LABELS: Record<Swap['status'], string> = { pendiente: 'Por confirmar', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada' };
export const TEAM_ROLES: Role[] = ['docente', 'voluntario', 'preparacion', 'coordinacion_kids'];

export function ages(group: Pick<Group, 'min_age' | 'max_age'>): string {
  if (group.min_age === null && group.max_age === null) return 'Sin rango de edad';
  if (group.min_age === null) return `Hasta ${group.max_age} años`;
  if (group.max_age === null) return `Desde ${group.min_age} años`;
  return `${group.min_age} a ${group.max_age} años`;
}

export const hours = (service: Pick<Service, 'starts_at' | 'ends_at'>) => `${service.starts_at.slice(0, 5)} a ${service.ends_at.slice(0, 5)}`;

/** Python weekday of a YYYY-MM-DD date. */
export function weekdayOf(value: string): number {
  const [y, m, d] = value.split('-').map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** Turns empty form values into null so optional numbers are cleared rather than sent as "". */
export function numberOrNull(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? '').trim();
  return text === '' ? null : Number(text);
}
