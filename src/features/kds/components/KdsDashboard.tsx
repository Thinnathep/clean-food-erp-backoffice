import React, { useEffect, useState } from "react";
import {
  ChefHat,
  CalendarDays,
  UtensilsCrossed,
  Calendar,
  MenuSquare,
  Package,
  ClipboardCheck,
  Users,
  Wand2,
  Database,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuStore } from "../../../store/menuStore";
import { useMemberStore } from "../../../store/memberStore";
import { useInventoryStore } from "../../../store/inventoryStore";

// Lazy Load heavy components
const ProductionRoadmap = React.lazy(() => import("./ProductionRoadmap").then(m => ({ default: m.ProductionRoadmap })));
const MemberPlanner = React.lazy(() => import("./MemberPlanner").then(m => ({ default: m.MemberPlanner })));
const TodayView = React.lazy(() => import("./TodayView").then(m => ({ default: m.TodayView })));
const ProductionSummary = React.lazy(() => import("./ProductionSummary").then(m => ({ default: m.ProductionSummary })));
const KitchenChecklist = React.lazy(() => import("./KitchenChecklist").then(m => ({ default: m.KitchenChecklist })));
const TemplateManagement = React.lazy(() => import("./TemplateManagement").then(m => ({ default: m.TemplateManagement })));
const MenuLibrary = React.lazy(() => import("./MenuLibrary").then(m => ({ default: m.MenuLibrary })));

type Tab = "checklist" | "today" | "global" | "member" | "summary" | "template";

const StatusPill = ({ 
  icon: Icon, 
  count, 
  label, 
  description, 
  textColor,
  iconColor,
  onClick 
}: { 
  icon: any, 
  count: number, 
  label: string, 
  description: string, 
  textColor: string,
  iconColor: string,
  onClick: () => void 
}) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative flex items-center">
      <button
        onClick={() => {
          setShowInfo(!showInfo);
          setTimeout(() => setShowInfo(false), 3000);
        }}
        className="flex items-center gap-1.5 px-1 py-1 group transition-all"
      >
        <Icon size={15} className={`${iconColor} transition-transform group-hover:scale-110`} />
        <span className={`font-bold text-sm tracking-tight ${textColor}`}>{count}</span>
      </button>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="absolute top-full mt-2 left-0 z-50 min-w-[200px] bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-white/10 cursor-pointer"
          >
            <div className="flex items-start gap-2">
              <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-white mb-0.5 uppercase tracking-wider">{label}</p>
                <p className="text-[10px] text-slate-300 font-normal leading-relaxed">{description}</p>
                <p className="text-[9px] text-emerald-400 mt-2 font-medium flex items-center gap-1">คลิกเพื่อไปยังหน้าจัดการ <Database size={8}/></p>
              </div>
            </div>
            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45 border-t border-l border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const KdsDashboard: React.FC = () => {
  const loadMenus = useMenuStore((state) => state.loadMenus);
  const loadMemberData = useMemberStore((state) => state.loadMemberData);
  const loadInventory = useInventoryStore((state) => state.loadItems);
  
  const menus = useMenuStore((state) => state.menus);
  const members = useMemberStore((state) => state.members);
  const inventoryItems = useInventoryStore((state) => state.items);

  const isLoadingMenu = useMenuStore((state) => state.isLoading);
  const isLoadingMember = useMemberStore((state) => state.isLoading);
  const isLoadingInventory = useInventoryStore((state) => state.isLoading);
  
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem("kds_active_tab");
    return (saved as Tab) || "today";
  });
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  useEffect(() => {
    loadMenus();
    loadMemberData();
    loadInventory();
  }, [loadMenus, loadMemberData, loadInventory]);

  useEffect(() => {
    localStorage.setItem("kds_active_tab", activeTab);
  }, [activeTab]);

  const isLoadingData = isLoadingMenu || isLoadingMember || isLoadingInventory;

  const ContentSkeleton = () => (
    <div className="flex-1 p-6 space-y-6 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50 relative font-prompt">
      {/* 1. Master Menu Sidebar (Drawer) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full md:max-w-2xl transform transition-transform duration-500 ease-in-out ${isMenuDrawerOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}>
        <React.Suspense fallback={<div className="h-full bg-white flex items-center justify-center"><ChefHat className="animate-spin text-slate-200" size={40} /></div>}>
          <MenuLibrary onClose={() => setIsMenuDrawerOpen(false)} />
        </React.Suspense>
      </div>

      {isMenuDrawerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[45] transition-all duration-300" onClick={() => setIsMenuDrawerOpen(false)} />
      )}

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm z-20 shrink-0">
          <div className="px-3 md:px-6 py-2 md:py-3 flex flex-col xl:flex-row items-center justify-between gap-3">
            <div className="flex items-center justify-between w-full xl:w-auto gap-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm">
                  <UtensilsCrossed size={16} />
                </div>
                <div>
                  <h1 className="text-[10px] md:text-[11px] font-bold text-slate-400 tracking-[0.1em] leading-none mb-1.5 uppercase">Kitchen System</h1>
                  <div className="flex items-center gap-3">
                    <StatusPill 
                      icon={MenuSquare} 
                      count={menus.length} 
                      label="รายการเมนู" 
                      description="รวมเมนูอาหารทั้งหมดที่ใช้ในระบบห้องครัวและหน้าร้าน" 
                      iconColor="text-indigo-500"
                      textColor="text-indigo-900"
                      onClick={() => setIsMenuDrawerOpen(true)}
                    />
                    <div className="w-px h-3 bg-slate-200" />
                    <StatusPill 
                      icon={Users} 
                      count={members.length} 
                      label="สมาชิก" 
                      description="จำนวนลูกค้าที่สมัครแพ็กเกจและอยู่ในฐานข้อมูลสมาชิก" 
                      iconColor="text-amber-500"
                      textColor="text-amber-900"
                      onClick={() => setActiveTab("member")}
                    />
                    <div className="w-px h-3 bg-slate-200" />
                    <StatusPill 
                      icon={Database} 
                      count={inventoryItems.length} 
                      label="สต็อกวัตถุดิบ" 
                      description="รายการวัตถุดิบทั้งหมดที่มีการลงทะเบียนในคลังสินค้า" 
                      iconColor="text-emerald-500"
                      textColor="text-emerald-900"
                      onClick={() => window.location.href = '/inventory/items'}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsMenuDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-normal text-[11px] md:text-xs transition-all shadow-sm"
              >
                <MenuSquare size={14} /> <span className="hidden sm:inline">คลังเมนู</span><span className="sm:hidden">เมนู</span>
              </button>
            </div>

            {/* Compact Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-hide w-full xl:w-auto">
              {[
                { id: "template", label: "แม่แบบ", icon: Wand2, activeColor: "bg-indigo-600 text-white" },
                { id: "checklist", label: "เช็คลิสต์", icon: ClipboardCheck, activeColor: "bg-indigo-600 text-white" },
                { id: "global", label: "แผนผลิต", icon: CalendarDays, activeColor: "bg-slate-900 text-white" },
                { id: "member", label: "แผนลูกค้า", icon: Calendar, activeColor: "bg-emerald-500 text-white" },
                { id: "today", label: "วันนี้", icon: ChefHat, activeColor: "bg-blue-500 text-white" },
                { id: "summary", label: "สรุปยอด", icon: Package, activeColor: "bg-purple-600 text-white" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-normal whitespace-nowrap transition-all duration-300 relative ${
                    activeTab === tab.id ? tab.activeColor : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div layoutId="active-nav-pill" className={`absolute inset-0 rounded-lg -z-0 ${tab.activeColor.split(" ")[0]}`} transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
                  )}
                  <tab.icon size={14} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
          {isLoadingData ? (
            <ContentSkeleton />
          ) : (
            <React.Suspense fallback={<ContentSkeleton />}>
              {activeTab === "checklist" && <KitchenChecklist />}
              {activeTab === "global" && <ProductionRoadmap />}
              {activeTab === "member" && <MemberPlanner />}
              {activeTab === "today" && <TodayView />}
              {activeTab === "summary" && <ProductionSummary />}
              {activeTab === "template" && <TemplateManagement />}
            </React.Suspense>
          )}
        </div>
      </div>
    </div>
  );
};
