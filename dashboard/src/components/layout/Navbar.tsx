import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../lib/constants';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const navLinks = [
    { name: 'Overview', path: ROUTES.OVERVIEW },
    { name: 'Threats', path: ROUTES.THREATS },
    { name: 'Audit Log', path: ROUTES.AUDIT },
    { name: 'API Keys', path: ROUTES.KEYS },
    { name: 'Config', path: ROUTES.CONFIG },
    { name: 'Analytics', path: ROUTES.ANALYTICS },
    { name: 'Settings', path: ROUTES.SETTINGS },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        
        {/* Left section: Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500"
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
          
          <NavLink to={ROUTES.OVERVIEW} className="flex items-center gap-2 text-gray-900 font-bold text-lg select-none">
            <svg
              className="h-5 w-5 text-gray-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>GuardLayer</span>
          </NavLink>
        </div>

        {/* Center section: Horizontal Links */}
        <div className="hidden md:flex space-x-6 h-full">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `inline-flex items-center h-14 border-b-2 px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </div>

        {/* Right section: User Details & Logout */}
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden sm:inline text-sm text-gray-500 font-medium">
              {user.email}
            </span>
          )}
          <button
            onClick={logout}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
