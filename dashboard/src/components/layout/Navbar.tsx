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
    <nav className="w-full h-14 bg-white dark:bg-[#0d0d11] border-b border-gray-200 dark:border-[#17171e]/60 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 transition-colors z-30 select-none">
      
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

        {/* Desktop Breadcrumbs */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          <span>workspace</span>
          <span className="text-gray-300 dark:text-[#17171e]">/</span>
          <span className="text-gray-900 dark:text-[#f7f8f8]">{getBreadcrumbName()}</span>
        </div>
      </div>

      {/* Right section: Theme Toggle, User Details & Logout */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-[#15151c] hover:bg-gray-100 dark:hover:bg-[#1f1f2a] border border-gray-200 dark:border-[#17171e] transition-all focus:outline-none"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>

        {user && (
          <span className="hidden sm:inline text-xs font-semibold text-gray-500 dark:text-slate-400">
            {user.email}
          </span>
        )}
        
        <button
          onClick={logout}
          className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white bg-gray-50 dark:bg-[#15151c] hover:bg-gray-100 dark:hover:bg-[#1f1f2a] border border-gray-200 dark:border-[#17171e] px-2.5 py-1.5 rounded-md transition-colors"
        >
          Logout
        </button>
      </div>

    </nav>
  );
};

export default Navbar;
