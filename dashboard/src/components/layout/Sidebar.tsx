import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
}

interface SidebarSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const sections: SidebarSection[] = [
    {
      title: 'Security',
      items: [
        { name: 'Overview', path: ROUTES.OVERVIEW },
        { name: 'Threats', path: ROUTES.THREATS },
        { name: 'Audit Log', path: ROUTES.AUDIT },
      ],
    },
    {
      title: 'Management',
      items: [
        { name: 'API Keys', path: ROUTES.KEYS },
        { name: 'Config', path: ROUTES.CONFIG },
      ],
    },
    {
      title: 'System',
      items: [
        { name: 'Analytics', path: ROUTES.ANALYTICS },
        { name: 'Settings', path: ROUTES.SETTINGS },
      ],
    },
  ];

  const renderLogo = () => (
    <NavLink
      to={ROUTES.OVERVIEW}
      className="flex items-center h-14 px-6 border-b border-gray-200 dark:border-[#17171e]/60 transition-colors select-none"
    >
      {/* Scotch-style square brand box logo container */}
      <div className="w-8 h-8 rounded-lg bg-[#ff5a1f] flex items-center justify-center shadow-md shadow-orange-500/10 mr-2.5 flex-shrink-0">
        <svg
          className="h-4.5 w-4.5 text-white"
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
      <span className="text-gray-900 dark:text-white font-extrabold text-base tracking-tight">
        GuardLayer
      </span>
    </NavLink>
  );

  const renderContent = () => (
    <div className="flex flex-col gap-6 py-6 px-4">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <h4 className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">
            {section.title}
          </h4>
          <nav className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center w-full px-3 py-1.5 text-sm rounded-md transition-all ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 dark:bg-slate-800/60 dark:text-white font-medium border-l-2 border-[#ff5a1f] pl-2.5 rounded-l-none'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/40'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/20 dark:bg-black/50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#0d0d11] border-r border-gray-200 dark:border-[#17171e]/60 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 border-b border-gray-200 dark:border-[#17171e]/60 px-4">
          <span className="font-bold text-gray-900 dark:text-white">Navigation</span>
          <button
            type="button"
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
          {renderContent()}
        </div>
      </aside>

      {/* Desktop Persistent Sidebar (Full Height) */}
      <aside className="w-64 border-r border-gray-200 dark:border-[#17171e]/60 h-screen sticky top-0 hidden md:flex flex-col overflow-hidden flex-shrink-0 bg-white dark:bg-[#0d0d11] transition-colors">
        {renderLogo()}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
