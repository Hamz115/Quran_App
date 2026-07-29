import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PwaInstallButton from './PwaInstallButton';

type IconProps = { className?: string };

const icons = {
  overview: 'M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z',
  sessions: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  reader: 'M12 6.5v14m0-14C10.8 5.5 9.2 5 7.5 5S4.2 5.5 3 6.5v13c1.2-1 2.8-1.5 4.5-1.5s3.3.5 4.5 1.5m0-13c1.2-1 2.8-1.5 4.5-1.5s3.3.5 4.5 1.5v13c-1.2-1-2.8-1.5-4.5-1.5s-3.3.5-4.5 1.5',
  reports: 'M5 20V10m5 10V4m5 16v-7m5 7V7',
  contacts: 'M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-4A4.5 4.5 0 0 0 3 18.5V20m6.5-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5 1a3.5 3.5 0 0 1 4 3.5V20m-4-17a3.5 3.5 0 0 1 0 7',
  mistakes: 'M12 9v4m0 4h.01M10.3 4.7 2.8 18a1.3 1.3 0 0 0 1.1 2h16.2a1.3 1.3 0 0 0 1.1-2L13.7 4.7a2 2 0 0 0-3.4 0Z',
  tutorial: 'M3 10.5 12 5l9 5.5-9 5.5-9-5.5Zm3 2.5v4.5c3.5 2.7 8.5 2.7 12 0V13',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5c0-.5 0-.9-.1-1.3l2-1.6-2-3.5-2.5 1a8.5 8.5 0 0 0-2.2-1.3L14.2 3h-4.1l-.4 2.3c-.8.3-1.5.7-2.2 1.3l-2.5-1-2 3.5 2 1.6c-.1.4-.1.8-.1 1.3s0 .9.1 1.3l-2 1.6 2 3.5 2.5-1c.7.6 1.4 1 2.2 1.3l.4 2.3h4.1l.4-2.3c.8-.3 1.5-.7 2.2-1.3l2.5 1 2-3.5-2-1.6c.1-.4.1-.8.1-1.3Z',
  refresh: 'M20 6v5h-5M4 18v-5h5m10.5-2a8 8 0 0 0-14-3M4.5 14a8 8 0 0 0 14 3',
  sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.4 6.4L17 17m-10-10L5.6 5.6m12.8 0L17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.5 8.5 0 1 0 12 12Z',
  chevron: 'm9 18 6-6-6-6',
};

function Icon({ path, className = 'h-5 w-5' }: IconProps & { path: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const mainNav = [
  { to: '/', label: 'Overview', icon: icons.overview, end: true },
  { to: '/sessions', label: 'Sessions', icon: icons.sessions },
  { to: '/reader', label: 'Quran Reader', icon: icons.reader },
];

const secondaryNav = [
  { to: '/contacts', label: 'Contacts', icon: icons.contacts },
  { to: '/mistakes', label: 'Mistakes', icon: icons.mistakes },
];

function DesktopNavLink({ to, label, icon, end }: { to: string; label: string; icon: string; end?: boolean }) {
  const location = useLocation();
  const [path, query] = to.split('?');
  const queryMatches = query ? location.search.includes(query) : !location.search;
  const active = path === '/'
    ? location.pathname === '/' && queryMatches
    : location.pathname === path && queryMatches;

  return (
    <NavLink
      to={to}
      end={end}
      className={() => `desktop-nav-link ${active ? 'desktop-nav-link-active' : ''}`}
    >
      <Icon path={icon} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}` || 'QT';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'QuranTrack User';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="desktop-app-shell">
      <aside className="desktop-sidebar">
        <div className="desktop-brand">
          <img className="desktop-brand-mark" src="/qurantrack-icon.png" alt="QuranTrack" />
          <div className="desktop-brand-name">QuranTrack</div>
          <div className="desktop-brand-tagline">RECITE · LISTEN · IMPROVE</div>
        </div>

        <nav className="desktop-sidebar-nav" aria-label="Primary navigation">
          {mainNav.map((item) => <DesktopNavLink key={item.label} {...item} />)}
          <div className="desktop-nav-divider" />
          {secondaryNav.map((item) => <DesktopNavLink key={item.label} {...item} />)}
        </nav>

        <div className="desktop-sidebar-footer">
          <Link to="/settings?section=tutorial" className="desktop-nav-link">
            <Icon path={icons.tutorial} />
            <span>Tutorial</span>
          </Link>
          <DesktopNavLink to="/settings" label="Settings" icon={icons.settings} />
          <PwaInstallButton />

          <button type="button" className="desktop-account" onClick={() => setShowUserMenu(!showUserMenu)}>
            <span className="desktop-avatar">{initials}</span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-medium">{fullName}</span>
              <span className="block text-xs text-white/55">Listener · Reciter</span>
            </span>
            <Icon path={icons.chevron} className="ml-auto h-4 w-4" />
          </button>

          {showUserMenu && (
            <div className="desktop-account-menu">
              <div className="border-b border-white/10 px-3 py-2">
                <p className="truncate text-xs text-white/60">{user?.email}</p>
              </div>
              <Link to="/settings" onClick={() => setShowUserMenu(false)}>Account settings</Link>
              <button type="button" onClick={handleLogout}>Sign out</button>
            </div>
          )}

          <div className="desktop-version-row">
            <span>v2.0.0</span>
            <span>Web · PWA</span>
            <span className="desktop-status-dot" />
          </div>
        </div>
      </aside>

      <div className="desktop-app-body">
        <header className="desktop-mobile-header">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/logo.png" alt="" className="h-8 w-8" />
            QuranTrack
          </Link>
          <div className="flex items-center gap-2">
            <PwaInstallButton compact />
            <span className="desktop-avatar">{initials}</span>
          </div>
        </header>

        <main className="desktop-main-content">
          <Outlet />
        </main>

        <footer className="desktop-status-bar">
          <span className="desktop-status-product">QuranTrack</span>
          <span>Supabase cloud workspace</span>
          <span className="desktop-status-dot" />
          <span className="ml-auto hidden xl:inline">“And recite the Qur’an with measured recitation.”</span>
        </footer>
      </div>

      <nav className="desktop-mobile-nav" aria-label="Mobile navigation">
        {mainNav.slice(0, 3).map((item) => (
          <NavLink key={item.label} to={item.to} end={item.end} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon path={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
