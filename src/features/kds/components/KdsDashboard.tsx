import React, { useEffect, useState } from 'react'; 
import { ChefHat, CalendarDays, UtensilsCrossed, Calendar, MenuSquare, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useKdsStore } from '../../../store/kdsStore';
import { MenuLibrary } from './MenuLibrary';
import { GlobalPlanner } from './GlobalPlanner';
import { MemberPlanner } from './MemberPlanner';
import { TodayView } from './TodayView';
import { ProductionSummary } from './ProductionSummary';

type Tab = 'today' | 'global' | 'member' | 'summary';

export const KdsDashboard: React.FC = () => {
  const loadMasterData = useKdsStore(state => state.loadMasterData);
  const isLoadingData = useKdsStore(state => state.isLoadingData);
  const error = useKdsStore(state => state.error);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('kds_active_tab');
    return (saved as Tab) || 'today';
  });
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    localStorage.setItem('kds_active_tab', activeTab);
  }, [activeTab]);

  // If Error, show error screen
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC] p-4">
         <div className="bg-red-50 text-red-500 p-6 rounded-2xl w-full max-w-lg shadow-sm border border-red-100">
            <h3 className="text-lg font-normal mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
            <p className="text-sm font-normal opacity-80">{error}</p>
         </div>
      </div>
    );
  }

  // Skeleton UI for content
  const ContentSkeleton = () => (
    <div className="flex-1 p-6 space-y-6 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 h-80 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        <div className="lg:col-span-2 h-80 bg-white rounded-2xl border border-slate-100 animate-pulse" />
      </div>
      <div className="h-64 bg-white rounded-2xl border border-slate-100 animate-pulse" />
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 relative">
      
      {/* 1. Master Menu Sidebar (Full Screen Drawer) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full md:max-w-2xl transform transition-transform duration-500 ease-in-out ${isMenuDrawerOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
        <MenuLibrary onClose={() => setIsMenuDrawerOpen(false)} />
      </div>

      {/* Overlay for Drawer */}
      {isMenuDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] transition-all duration-300" 
          onClick={() => setIsMenuDrawerOpen(false)}
        />
      )}

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Header & Tabs */}
        <div className="bg-white px-4 md:px-6 py-4 border-b border-slate-200 shadow-sm z-20 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl md:text-2xl font-normal text-slate-900 tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="text-emerald-500" /> KDS Control
              </h1>
              <p className="text-xs md:text-sm font-normal text-slate-500 mt-1">ระบบจัดแผนอาหารและห้องครัว</p>
            </div>
            
            {/* Mobile Open Menu Button */}
            <button 
              onClick={() => setIsMenuDrawerOpen(true)}
              className="flex bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-2 rounded-xl items-center gap-2 font-normal text-xs transition-colors"
            >
              <MenuSquare size={16} /> รายการเมนู
            </button>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-hide relative">
            {[
              { id: 'global', label: 'แผนร้าน', icon: CalendarDays, activeColor: 'bg-slate-900 text-white' },
              { id: 'member', label: 'แผนลูกค้า', icon: Calendar, activeColor: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' },
              { id: 'today', label: 'ทำอาหารวันนี้', icon: ChefHat, activeColor: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' },
              { id: 'summary', label: 'สรุปยอด', icon: Package, activeColor: 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 relative ${
                  activeTab === tab.id ? tab.activeColor : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className={`absolute inset-0 rounded-xl -z-0 ${tab.activeColor.split(' ')[0]}`}
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <tab.icon size={18} className="relative z-10" />
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
          {isLoadingData ? (
            <ContentSkeleton />
          ) : (
            <>
              {activeTab === 'global' && <GlobalPlanner />}
              {activeTab === 'member' && <MemberPlanner />}
              {activeTab === 'today' && <TodayView />}
              {activeTab === 'summary' && <ProductionSummary />}
            </>
          )}
        </div>
        
      </div>
    </div>
  );
};
