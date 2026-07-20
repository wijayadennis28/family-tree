import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Tree, SignOut, List } from '@phosphor-icons/react';
import LanguageSwitcher from '../ui/LanguageSwitcher';

/* ──────────────────────────────────────────
   Top app bar — white 64px, gradient brand
   tile + "Family Atlas" + workspace subtitle.
   ────────────────────────────────────────── */
export default function Header({ onMenuToggle }) {
  const { user, logout, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logout(token);
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  // ponytail: subtitle = "<LastName> family workspace" derived from user's
  // last name token; falls back to a neutral label. No API field for this.
  const lastName = user?.name?.trim().split(/\s+/).pop();
  const subtitle = lastName
    ? t('header.familyWorkspace', { family: lastName })
    : t('header.appWorkspace');

  return (
    <header className="flex items-center justify-between h-[60px] px-4 md:px-5 bg-white sticky top-0 z-50 border-b border-ft-border-hair shrink-0">
      {/* Brand — gradient tile + title */}
      <Link to="/" className="flex items-center gap-2.5 no-underline transition-opacity duration-200 hover:opacity-85 active:scale-[0.97]">
        <span
          className="w-9 h-9 rounded-[12px] flex items-center justify-center text-base shrink-0 text-white shadow-ft-sm"
          style={{ background: 'linear-gradient(135deg, #2f6bff 0%, #8bb7ff 100%)' }}
        >
          <Tree />
        </span>          <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight text-ft-text-1">{t('common.appName')}</span>
          <span className="hidden sm:inline text-[12px] font-normal text-ft-text-2 mt-0.5">{subtitle}</span>
        </span>
      </Link>

      {/* Right — mobile menu + user + logout */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onMenuToggle}
          aria-label={t('header.menu')}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-ft-text-2 hover:text-ft-accent hover:bg-ft-rail-active active:scale-[0.95] transition-all"
        >
          <List className="text-xl" />
        </button>
        <div className="flex items-center gap-2.5 px-1 py-1 rounded-xl transition-colors duration-200 cursor-default hover:bg-ft-surface-2">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-ft-accent text-white flex items-center justify-center text-xs font-bold shadow-ft-sm">
            {initials}
          </div>
          <span className="text-sm font-medium text-ft-text-2 hidden md:inline max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
            {user?.name}
          </span>
        </div>

        <LanguageSwitcher />

        <button
          onClick={handleLogout}
          aria-label={t('header.signOut')}
          className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg text-ft-text-3 hover:text-ft-accent hover:bg-ft-rail-active active:scale-[0.95] transition-all"
        >
          <SignOut />
        </button>
      </div>
    </header>
  );
}
