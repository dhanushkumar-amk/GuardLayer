import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-white dark:bg-[#080710] text-gray-900 dark:text-[#f7f8f8] flex overflow-hidden font-sans transition-colors">
      {/* Left Navigation Sidebar - takes full height of the viewport */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Right Content Area - scrolls independently */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar inside the content area */}
        <Navbar onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
        
        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto py-6 px-6 sm:px-8">
          <div className="max-w-5xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
