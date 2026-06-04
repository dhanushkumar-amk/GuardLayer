import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useThemeStore } from '../../store/theme.store';
import { ROUTES } from '../../lib/constants';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();

  const getBreadcrumbName = () => {
    switch (location.pathname) {
      case ROUTES.OVERVIEW:
        return 'Overview';
      case ROUTES.THREATS:
        return 'Security / Threats';
      case ROUTES.AUDIT:
        return 'Security / Audit Log';
      case ROUTES.KEYS:
        return 'Management / API Keys';
      case ROUTES.CONFIG:
        return 'Management / Configuration';
      case ROUTES.ANALYTICS:
        return 'System / Analytics';
      case ROUTES.SETTINGS:
        return 'System / Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <nav className="w-full h-14 bg-gradient-to-r from-[#0d0d11] via-[#09090c] to-[#0d0d11] border-b border-[#17171e] flex items-center justify-between px-4 sm:px-6 flex-shrink-0 transition-colors z-30 select-none shadow-md shadow-black/10">
      
      {/* Left section: Hamburger (Mobile) / Brand (Mobile) / Breadcrumb (Desktop) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Mobile Brand Logo */}
        <NavLink
          to={ROUTES.OVERVIEW}
          className="flex md:hidden items-center gap-1.5 text-gray-900 dark:text-white font-bold text-sm"
        >
          <div className="w-6 h-6 rounded bg-[#ff5a1f] flex items-center justify-center mr-1">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <span>GuardLayer</span>
        </NavLink>

        {/* Desktop Status and Breadcrumbs */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-md text-[9px] font-mono text-emerald-400 font-bold uppercase select-none tracking-wider shadow-sm shadow-emerald-950/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            System Live
          </div>
          
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>workspace</span>
            <span className="text-[#17171e]">/</span>
            <span className="text-slate-300 font-bold">{getBreadcrumbName()}</span>
          </div>
        </div>
      </div>

      {/* Right section: Profile badge and Logout */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-[#121217]/50 border border-[#17171e] hover:border-[#ff5a1f]/10 px-2.5 py-1 rounded-full transition-all">
            <div className="w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-orange-600 to-[#ff5a1f] flex items-center justify-center text-white text-[9px] font-black uppercase shadow-inner">
              {user.email.slice(0, 2)}
            </div>
            <span className="text-[11px] font-bold text-slate-400 tracking-tight pr-1">
              {user.email}
            </span>
          </div>
        )}
        
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-[#15151c] hover:bg-[#1f1f2a] border border-[#17171e] hover:border-[#ff5a1f]/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm hover:shadow-orange-500/5 active:scale-95"
        >
          <svg className="h-3.5 w-3.5 text-slate-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>

    </nav>
  );
};

export default Navbar;
