import { useEffect, useRef, useState } from 'react';
import type { Me } from '../api';
import { Agenda } from './Agenda';
import { Attendance } from './Attendance';
import { AuditLog } from './AuditLog';
import { Events } from './Events';
import { Lessons } from './Lessons';
import { Roster } from './Roster';
import { Settings } from './Settings';
import { Team } from './Team';
import { TEAM_ROLES } from './model';

type Tab = 'clase' | 'agenda' | 'lecciones' | 'rol' | 'maestros' | 'eventos' | 'configuracion' | 'bitacora';
const LABELS: Record<Tab, string> = {
  clase: 'Mi clase de hoy', agenda: 'Mi agenda', lecciones: 'Lecciones', rol: 'Rol de clases', maestros: 'Maestros',
  eventos: 'Eventos Kids', configuracion: 'Configuración', bitacora: 'Bitácora',
};

/** Shalom Kids sections. Tabs only follow the profiles; the server checks every request again. */
export function Kids({ me, onActivity }: { me: Me; onActivity: () => Promise<void> }) {
  const coordinator = me.roles.includes('coordinacion_kids');
  const team = me.roles.some(role => TEAM_ROLES.includes(role));
  const tabs: Tab[] = ['clase', ...(team ? ['agenda', 'lecciones'] as Tab[] : []), ...(coordinator ? ['rol', 'maestros', 'eventos', 'configuracion', 'bitacora'] as Tab[] : [])];
  const [tab, setTab] = useState<Tab>(team && !coordinator ? 'agenda' : 'clase');
  const current = tabs.includes(tab) ? tab : 'clase';
  const nav = useRef<HTMLElement>(null);
  // On a phone the sections scroll sideways; keep the open one in view.
  useEffect(() => { nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [current]);
  return <div className="shalom-kids">
    {tabs.length > 1 && <nav ref={nav} aria-label="Secciones de Shalom Kids" className="shalom-tabs">
      {tabs.map(id => <button key={id} type="button" aria-current={current === id ? 'page' : undefined} onClick={() => setTab(id)}>{LABELS[id]}</button>)}
    </nav>}
    {current === 'clase' && <Attendance onActivity={onActivity} />}
    {current === 'agenda' && <Agenda />}
    {current === 'lecciones' && <Lessons canEdit={coordinator} />}
    {current === 'rol' && <Roster />}
    {current === 'maestros' && <Team />}
    {current === 'eventos' && <Events />}
    {current === 'configuracion' && <Settings />}
    {current === 'bitacora' && <AuditLog />}
  </div>;
}
