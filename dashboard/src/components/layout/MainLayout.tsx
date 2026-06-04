import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import RightPanel from './RightPanel';
import type { AnchorLink } from './RightPanel';

interface MainLayoutProps {
  children: React.ReactNode;
  rightPanelLinks?: AnchorLink[];
  rightPanelActiveId?: string;
  onRightPanelLinkClick?: (id: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  rightPanelLinks = [],
  rightPanelActiveId,
  onRightPanelLinkClick,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
      
      {/* Layout wrapper */}
      <div className="flex flex-1 pt-14 w-full max-w-(--breakpoint-xl) mx-auto relative px-4 sm:px-6 lg:px-8">
        {/* Left Navigation Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        
        {/* Center Main Scrollable Content */}
        <main className="flex-1 min-w-0 py-6 px-4 md:px-8 overflow-y-auto">
          {children}
        </main>
        
        {/* Right Sticky Anchor Link Panel */}
        <RightPanel
          links={rightPanelLinks}
          activeId={rightPanelActiveId}
          onLinkClick={onRightPanelLinkClick}
        />
      </div>
    </div>
  );
};

export default MainLayout;
