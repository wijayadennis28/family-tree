import { NavLink } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Users,
  Gear,
  UsersFour,
  UserGear,
  Shield,
  LockKey,
  Bell,
  X,
} from '@phosphor-icons/react';

const mainNav = [
  { to: '/people',         labelKey: 'sidebar.people',   icon: <Users /> },
  { to: '/families',       labelKey: 'sidebar.families', icon: <UsersFour /> },
];

const settingsNav = { to: '/settings', labelKey: 'sidebar.settings', icon: <Gear /> };

const notificationsNav = { to: '/notifications', labelKey: 'sidebar.notifications', icon: <Bell /> };

const adminNav = [
  { to: '/admin/users',     labelKey: 'sidebar.users',     icon: <UserGear /> },
  { to: '/admin/roles',     labelKey: 'sidebar.roles',     icon: <Shield /> },
  { to: '/admin/abilities', labelKey: 'sidebar.abilities', icon: <LockKey /> },
];

function SidebarItem({ to, labelKey, icon, end, onClick }) {
  const { t } = useLanguage();
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
          isActive
            ? 'text-ft-accent bg-ft-rail-active border-ft-rail-active-border shadow-sm'
            : 'text-ft-text-3 border-transparent hover:text-ft-text-2 hover:bg-ft-surface-2'
        }`
      }
      title={t(labelKey)}
    >
      <span className="text-lg leading-none transition-transform duration-200 group-hover:scale-110">{icon}</span>
      <span className="truncate">{t(labelKey)}</span>
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="px-3 pt-4 pb-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-ft-text-3/80">
      {children}
    </div>
  );
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen }) {
  const { isAdmin, user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'Super Admin';
  const { t } = useLanguage();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = 'hidden';
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [mobileMenuOpen, setMobileMenuOpen]);

  return (
    <>
      {/* Desktop sidebar — 220px white rail with icon + text */}
      <aside className="hidden md:flex flex-col w-[220px] self-stretch bg-white border-r border-ft-border-hair py-5 px-3 shrink-0">
        {/* Main navigation */}
        <div className="flex flex-col gap-1">
          <SectionLabel>{t('sidebar.main')}</SectionLabel>
          {mainNav.map(item => (
            <SidebarItem key={item.to} {...item} />
          ))}
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-1 mt-2">
          <SectionLabel>{t('sidebar.preferences')}</SectionLabel>
          <SidebarItem {...settingsNav} />
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="flex flex-col gap-1 mt-2 pt-4 border-t border-ft-border-hair">
            <SectionLabel>{t('sidebar.admin')}</SectionLabel>
            {adminNav.map(item => {
              if (item.to === '/admin/users' && !isSuperAdmin) return null;
              return <SidebarItem key={item.to} {...item} />;
            })}
          </div>
        )}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ft-border-hair z-40 flex items-center px-1 pb-1">
        {mainNav.map(({ to, labelKey, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1.5 flex-1 min-w-0 relative ${
                isActive ? 'text-ft-accent' : 'text-ft-text-3'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="text-xl leading-none">{icon}</span>
                <span className="text-[0.6rem] font-medium truncate w-full text-center">{t(labelKey)}</span>
                {isActive && (
                  <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-ft-accent" />
                )}
              </>
            )}
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-1.5 flex-1 min-w-0 relative ${
              isActive ? 'text-ft-accent' : 'text-ft-text-3'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Gear className="text-xl" />
              <span className="text-[0.6rem] font-medium truncate w-full text-center">{t('sidebar.settings')}</span>
              {isActive && (
                <span className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-ft-accent" />
              )}
            </>
          )}
        </NavLink>
      </nav>

      {/* Mobile full navigation drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-50"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div
            className="md:hidden fixed inset-y-0 left-0 w-[280px] max-w-[80vw] bg-white shadow-xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={t('sidebar.menu')}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-ft-border-hair">
              <span className="text-sm font-bold uppercase tracking-wider text-ft-text-3">
                {t('sidebar.menu')}
              </span>
              <button
                onClick={closeMobileMenu}
                aria-label={t('common.close')}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-ft-text-3 hover:text-ft-text-1 hover:bg-ft-surface-2 transition-colors"
              >
                <X />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-1">
                <SectionLabel>{t('sidebar.main')}</SectionLabel>
                {mainNav.map(item => (
                  <SidebarItem key={item.to} {...item} onClick={closeMobileMenu} />
                ))}
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <SectionLabel>{t('sidebar.preferences')}</SectionLabel>
                <SidebarItem {...settingsNav} onClick={closeMobileMenu} />
                <SidebarItem {...notificationsNav} onClick={closeMobileMenu} />
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-1 mt-2 pt-4 border-t border-ft-border-hair">
                  <SectionLabel>{t('sidebar.admin')}</SectionLabel>
                  {adminNav.map(item => {
                    if (item.to === '/admin/users' && !isSuperAdmin) return null;
                    return <SidebarItem key={item.to} {...item} onClick={closeMobileMenu} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
