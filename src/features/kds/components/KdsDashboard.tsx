import React, { useEffect, useState } from 'react'; 
import { ChefHat, CalendarDays, UtensilsCrossed, Calendar, MenuSquare, Package } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  if (isLoadingData) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC]">
         <div className="animate-pulse flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-emerald-600 font-bold tracking-widest uppercase">Loading Master Data...</p>
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC] p-4">
         <div className="bg-red-50 text-red-500 p-6 rounded-2xl w-full max-w-lg shadow-sm border border-red-100">
           <h3 className="text-lg font-black mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
           <p className="text-sm font-bold opacity-80">{error}</p>
         </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 relative">
      
      {/* 1. Master Menu Sidebar (Always Fixed Drawer) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[380px] transform transition-transform duration-500 ease-in-out ${isMenuDrawerOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
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
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="text-emerald-500" /> KDS Control
              </h1>
              <p className="text-xs md:text-sm font-bold text-slate-500 mt-1">ระบบจัดแผนอาหารและห้องครัว</p>
            </div>
            
            {/* Mobile Open Menu Button */}
            <button 
              onClick={() => setIsMenuDrawerOpen(true)}
              className="hidden xl:flex bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-2 rounded-xl items-center gap-2 font-bold text-xs"
            >
              <MenuSquare size={16} /> เลือกเมนู
            </button>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('global')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-black whitespace-nowrap transition-all ${
                activeTab === 'global' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <CalendarDays size={16} /> แผนร้าน
            </button>
            <button
              onClick={() => setActiveTab('member')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-black whitespace-nowrap transition-all ${
                activeTab === 'member' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Calendar size={16} /> แผนลูกค้า
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-black whitespace-nowrap transition-all ${
                activeTab === 'today' ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <ChefHat size={16} /> ทำอาหารวันนี้
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-black whitespace-nowrap transition-all ${
                activeTab === 'summary' ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Package size={16} /> สรุปยอด
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
          {activeTab === 'global' && <GlobalPlanner />}
          {activeTab === 'member' && <MemberPlanner />}
          {activeTab === 'today' && <TodayView />}
          {activeTab === 'summary' && <ProductionSummary />}
          
          {/* Floating Action Button (FAB) - Always Visible */}
          <button 
            onClick={() => setIsMenuDrawerOpen(!isMenuDrawerOpen)}
            className="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
          >
            <MenuSquare size={24} />
            <div className="absolute right-full mr-4 bg-slate-800 text-white px-4 py-2 rounded-2xl text-sm font-black opacity-0 xl:group-hover:opacity-100 transition-all pointer-events-none border border-slate-700 shadow-xl translate-x-2 xl:group-hover:translate-x-0">
               คลังเมนูหลัก
            </div>
          </button>
        </div>
        
      </div>
    </div>
  );
};
