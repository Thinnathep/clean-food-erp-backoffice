import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChefHat, Calendar, Users, Package, Wallet, Truck, Settings, LogOut, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { path: '/kds', icon: ChefHat, label: 'งานห้องครัว (KDS)' },
  { path: '/members', icon: Users, label: 'สมาชิก & ปิ่นโต' },
  { path: '/inventory', icon: Package, label: 'สต็อกวัตถุดิบ' },
  { path: '/finance', icon: Wallet, label: 'บัญชี' },
  { path: '/logistics', icon: Truck, label: 'ระบบจัดส่ง' },
];

export const Sidebar: React.FC<{ 
  isMobileOpen: boolean; 
  setMobileOpen: (open: boolean) => void 
}> = ({ isMobileOpen, setMobileOpen }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { logout, user } = useAuthStore();

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed md:relative inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isExpanded ? 'w-64' : 'w-20'}
      `}>
        {/* Header */}
        <div className={`p-4 md:p-6 flex items-center justify-between border-b border-slate-800 ${!isExpanded && 'md:justify-center'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                  <span className="text-white text-xs">🍃</span>
              </div>
              <h1 className={`text-lg font-normal tracking-tight leading-tight whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden md:block w-0'}`}>
                CLEAN FOOD<br/><span className="text-emerald-400">ERP SYSTEM</span>
              </h1>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 scrollbar-hide">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl transition-all font-normal text-sm whitespace-nowrap overflow-hidden group
                ${isExpanded ? 'px-4 py-3' : 'px-0 py-3 justify-center'}
                ${isActive 
                    ? 'bg-emerald-500/10 text-emerald-400' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
              title={!isExpanded ? item.label : undefined}
            >
              <item.icon size={20} className={`flex-shrink-0 ${isExpanded ? '' : 'mx-auto'}`} />
              <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden md:block w-0'}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
        
        {/* Footer Area */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* User Info (Mobile / Expanded) */}
          <div className={`px-2 py-2 mb-2 bg-slate-800/50 rounded-lg border border-slate-700/50 flex items-center gap-2 overflow-hidden ${!isExpanded && 'hidden md:flex justify-center'}`}>
             <div className="w-6 h-6 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-[10px] font-normal">
               {user?.name?.charAt(0) || 'A'}
             </div>
             <div className={`flex-1 min-w-0 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
               <p className="text-[10px] font-normal text-white truncate">{user?.name}</p>
               <p className="text-[8px] text-slate-400 uppercase tracking-widest">{user?.role}</p>
             </div>
          </div>

          <button 
            title="Settings"
            className={`flex items-center gap-3 w-full rounded-xl transition-all font-normal text-sm text-slate-400 hover:text-white hover:bg-white/5
              ${isExpanded ? 'px-4 py-3 text-left' : 'px-0 py-3 justify-center'}`}
          >
            <Settings size={20} className="flex-shrink-0" />
            <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden w-0'}`}>ตั้งค่าระบบ</span>
          </button>

          <button 
            onClick={logout}
            title="Logout"
            className={`flex items-center gap-3 w-full rounded-xl transition-all font-normal text-sm text-red-400 hover:text-white hover:bg-red-500/20
              ${isExpanded ? 'px-4 py-3 text-left' : 'px-0 py-3 justify-center'}`}
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 hidden w-0'}`}>ออกจากระบบ</span>
          </button>
        </div>

        {/* Desktop Expand Toggle */}
        <button 
          onClick={toggleExpand}
          className="hidden md:flex absolute -right-3 top-8 bg-slate-800 hover:bg-emerald-500 text-white p-1 rounded-full border border-slate-700 shadow-lg transition-colors z-50"
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </aside>
    </>
  );
};
