import { NavLink } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const nav = [
  { to: '/',              label: 'Dashboard',      icon: '📊', end: true },
  { to: '/members',       label: 'Members',        icon: '👥' },
  { to: '/events',        label: 'Events',         icon: '📅' },
  { to: '/gallery',       label: 'Gallery',        icon: '🖼️' },
  { to: '/notifications', label: 'Notifications',  icon: '🔔' },
  { to: '/stats',         label: 'Statistics',     icon: '📈' },
];

const adminNav = [
  { to: '/admin/users',       label: 'Users',       icon: '🔑' },
  { to: '/admin/invitations', label: 'Invitations', icon: '✉️' },
  { to: '/admin/audit',       label: 'Audit Log',   icon: '📋' },
];

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Family Admin';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-label">Navigation</div>
      {nav.map(({ to, label, icon, end }) => (
        <NavLink key={to} to={to} end={end}>{icon} {label}</NavLink>
      ))}

      {isAdmin && (
        <>
          <div className="sidebar-label" style={{ marginTop: 12 }}>Admin</div>
          {adminNav.map(({ to, label, icon }) => (
            <NavLink key={to} to={to}>{icon} {label}</NavLink>
          ))}
        </>
      )}
    </aside>
  );
}
