import React from 'react';

export interface AnchorLink {
  id: string;
  label: string;
}

interface RightPanelProps {
  links?: AnchorLink[];
  activeId?: string;
  onLinkClick?: (id: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  links = [],
  activeId,
  onLinkClick,
}) => {
  // If there are no links, render a hidden spacer to preserve layout spacing if needed,
  // or return null. We hide it on screens smaller than lg (desktop focus).
  if (!links || links.length === 0) {
    return <aside className="w-56 hidden lg:block flex-shrink-0" />;
  }

  return (
    <aside className="w-56 hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto bg-white py-6 px-4 flex-shrink-0 border-l border-gray-100">
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          On this page
        </h4>
        <nav className="flex flex-col space-y-2">
          {links.map((link) => {
            const isActive = activeId === link.id;
            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => {
                  if (onLinkClick) {
                    e.preventDefault();
                    onLinkClick(link.id);
                  }
                }}
                className={`text-sm transition-colors block py-0.5 ${
                  isActive
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default RightPanel;
