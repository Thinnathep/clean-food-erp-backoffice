import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cf_sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem('cf_sidebar_collapsed', JSON.stringify(collapsed));
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        setMobileOpen={setMobileOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={handleSetCollapsed}
      />
      <main className={`flex-1 flex flex-col min-w-0 relative ${isCollapsed ? 'xl:ml-[72px]' : 'xl:ml-[260px]'} transition-all duration-300 overflow-hidden`}>
        {/* Mobile Header (Shown on iPad & Mobile) */}
        <div className="xl:hidden bg-slate-900 text-white p-4 flex items-center justify-between z-10 shadow-md shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
              🍃
            </div>
            <h1 className="text-sm font-bold tracking-tight leading-tight">
              CLEAN FOOD <span className="text-emerald-400 font-semibold block text-[10px] tracking-wider">ERP SYSTEM</span>
            </h1>
          </div>
          <button 
            title="เปิดเมนู" 
            type="button" 
            onClick={() => setMobileOpen(true)} 
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Menu size={22} />
          </button>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
};
