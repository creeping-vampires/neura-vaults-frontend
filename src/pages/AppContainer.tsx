import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import UnicornStudioEmbed from "@/components/ChromaBGs-Vyun";
import ComingSoon from "@/components/ComingSoon";

interface AppContainerProps {
  children: React.ReactNode;
}

const AppContainer: React.FC<AppContainerProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsSmallMobile(window.innerWidth < 600);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isSidebarOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.sidebar-container') && !target.closest('.burger-menu')) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isSmallMobile) {
    return <ComingSoon />;
  }

  return (
    <div className="h-screen flex flex-row relative">
      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        isMobile={isMobile}
      />
      
      {/* Main content area */}
      <div className={`w-full flex flex-col overflow-hidden transition-all duration-300`}>
        <Navbar 
          onToggleSidebar={toggleSidebar}
          isMobile={isMobile}
        />
        {/* Main content */}
        <div className="h-full absolute inset-0">
          <UnicornStudioEmbed projectId="lHlDvoJDIXCxxXVqTNOC" />
        </div>
        <main className="w-full flex-1 overflow-auto relative z-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppContainer;
