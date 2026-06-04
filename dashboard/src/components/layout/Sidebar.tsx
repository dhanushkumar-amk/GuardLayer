import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { useNotificationsStore } from '../../store/notifications.store';

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
  const hasNewThreat = useNotificationsStore((state) => state.hasNewThreat);
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

  const getItemIcon = (name: string, isActive: boolean) => {
    const strokeClass = isActive ? 'text-[#ff5a1f]' : 'text-slate-500 group-hover:text-slate-300';
    
    switch (name) {
      case 'Overview':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case 'Threats':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'Audit Log':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'API Keys':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-3.414-1.414l-6.586 6.586a2 2 0 00-.586 1.414v2h2a2 2 0 001.414-.586l6.586-6.586M19 4a5 5 0 01-7 7L4 19v3h3l8-8a5 5 0 017-7z" />
          </svg>
        );
      case 'Config':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        );
      case 'Analytics':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'Settings':
        return (
          <svg className={`h-4.5 w-4.5 mr-3 transition-colors ${strokeClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

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
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">
            {section.title}
          </h4>
          <nav className="space-y-1">
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center w-full px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-slate-800/50 text-white shadow-sm border border-[#17171e] border-l-2 border-l-[#ff5a1f] pl-[10px] rounded-l-none'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/20 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {getItemIcon(item.name, isActive)}
                    <span className="flex-grow">{item.name}</span>
                    {item.name === 'Threats' && hasNewThreat && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] animate-pulse shadow-sm shadow-[#ff5a1f]" />
                    )}
                  </>
                )}
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
