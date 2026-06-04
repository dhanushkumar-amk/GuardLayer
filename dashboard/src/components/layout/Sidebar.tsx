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

  const renderContent = () => (
    <div className="flex flex-col gap-6 py-6 px-4">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1.5">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
            {section.title}
          </h4>
          <nav className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
          className="fixed inset-0 bg-gray-900/20 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Off-canvas Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-14 border-b border-gray-200 px-4">
          <span className="font-bold text-gray-900">Navigation</span>
          <button
            type="button"
            className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50 focus:outline-none"
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

      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 border-r border-gray-200 h-[calc(100vh-3.5rem)] sticky top-14 hidden md:block overflow-y-auto flex-shrink-0 bg-white">
        {renderContent()}
      </aside>
    </>
  );
};

export default Sidebar;
