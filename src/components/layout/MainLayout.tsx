import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar isMobileOpen={isMobileOpen} setMobileOpen={setMobileOpen} />
      
      <main className="flex-1 flex flex-col min-w-0 relative xl:ml-20 transition-all duration-300 overflow-hidden">
        {/* Mobile Header (Now includes iPad & iPad Pro) */}
        <div className="xl:hidden bg-slate-900 text-white p-4 flex items-center justify-between z-10 shadow-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">🍃</span>
            </div>
            <h1 className="text-base font-normal tracking-tight leading-none">CLEAN FOOD<br/><span className="text-emerald-400 text-xs">ERP SYSTEM</span></h1>
          </div>
          <button onClick={() => setMobileOpen(true)} className="text-slate-300 hover:text-white">
            <Menu size={24} />
          </button>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative scrollbar-hide">
          {children}
        </div>
      </main>
    </div>
  );
};
