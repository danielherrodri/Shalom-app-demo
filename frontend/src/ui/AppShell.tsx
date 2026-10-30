import type { ReactNode } from 'react';
import logo from '../../../assets/shalom-logo.png';

export type ShalomArea = 'home' | 'kids' | 'admin' | 'security';

const LABELS: Record<ShalomArea, string> = { home: 'Inicio', kids: 'Shalom Kids', admin: 'Administración', security: 'Mi cuenta' };
// The phone bar fits four short labels at 360 px; the full names stay in the sidebar and title.
const SHORT: Record<ShalomArea, string> = { home: 'Inicio', kids: 'Kids', admin: 'Admin', security: 'Cuenta' };

type AppShellProps = {
  activeArea: ShalomArea;
  // Areas the signed-in profiles may open; the server still checks every request.
  areas: ShalomArea[];
  profileName?: string;
  busy: boolean;
  onNavigate: (area: ShalomArea) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function AppShell({ activeArea, areas, profileName, busy, onNavigate, onLogout, children }: AppShellProps) {
  // No navigation beyond Inicio before authentication.
  const links = (profileName ? areas : ['home' as const]).map(id => ({ id, label: LABELS[id], short: SHORT[id] }));
  const navigation = (mobile: boolean) => links.map(link => (
    <button
      key={link.id}
      type="button"
      className={mobile ? 'shalom-mobile-link' : 'shalom-nav-link'}
      aria-current={activeArea === link.id ? 'page' : undefined}
      onClick={() => onNavigate(link.id)}
    >
      {mobile ? link.short : link.label}
    </button>
  ));
  return (
    <div className="shalom-shell">
      <a className="shalom-skip" href="#main">Saltar al contenido</a>
      <aside className="shalom-sidebar" aria-label="Navegación principal">
        <div className="shalom-brand">
          <img src={logo} alt="Shalom" />
          <span>UNA CASA PARA TODOS</span>
        </div>
        <p className="shalom-nav-heading">TU ESPACIO</p>
        <nav aria-label="Secciones de Shalom">{navigation(false)}</nav>
        <p className="shalom-sidebar-note">Versión en desarrollo · Solo datos ficticios</p>
      </aside>
      <div className="shalom-workspace">
        <header className="shalom-topbar">
          <div className="shalom-header-brand">
            <img src={logo} alt="Shalom" />
            <span>UNA CASA PARA TODOS</span>
          </div>
          <span className="shalom-topbar-title">Shalom <span aria-hidden="true">/</span> {LABELS[activeArea]}</span>
          {profileName ? (
            <div className="shalom-session">
              <span className="shalom-session-name">{profileName}</span>
              <button className="shalom-logout" type="button" disabled={busy} onClick={onLogout}>Cerrar sesión</button>
            </div>
          ) : <span className="shalom-demo-pill">Desarrollo</span>}
        </header>
        <main id="main" tabIndex={-1} className="shalom-content">{children}</main>
      </div>
      <nav className="shalom-mobile-nav" aria-label="Navegación móvil">{navigation(true)}</nav>
    </div>
  );
}
