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
} from "lucide-react";
import { motion } from "framer-motion";
import { useMenuStore } from "../../../store/menuStore";
import { useMemberStore } from "../../../store/memberStore";

// Lazy Load heavy components to improve performance
const ProductionRoadmap = React.lazy(() => import("./ProductionRoadmap").then(m => ({ default: m.ProductionRoadmap })));
const MemberPlanner = React.lazy(() => import("./MemberPlanner").then(m => ({ default: m.MemberPlanner })));
const TodayView = React.lazy(() => import("./TodayView").then(m => ({ default: m.TodayView })));
const ProductionSummary = React.lazy(() => import("./ProductionSummary").then(m => ({ default: m.ProductionSummary })));
const KitchenChecklist = React.lazy(() => import("./KitchenChecklist").then(m => ({ default: m.KitchenChecklist })));
const TemplateManagement = React.lazy(() => import("./TemplateManagement").then(m => ({ default: m.TemplateManagement })));
const MenuLibrary = React.lazy(() => import("./MenuLibrary").then(m => ({ default: m.MenuLibrary })));

type Tab = "checklist" | "today" | "global" | "member" | "summary" | "template";

export const KdsDashboard: React.FC = () => {
  const loadMenus = useMenuStore((state) => state.loadMenus);
  const loadMemberData = useMemberStore((state) => state.loadMemberData);
  const menus = useMenuStore((state) => state.menus);
  const members = useMemberStore((state) => state.members);
  const activePackages = useMemberStore((state) => state.activePackages);

  const isLoadingMenu = useMenuStore((state) => state.isLoading);
  const isLoadingMember = useMemberStore((state) => state.isLoading);
  const menuError = useMenuStore((state) => state.error);
  const memberError = useMemberStore((state) => state.error);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const saved = localStorage.getItem("kds_active_tab");
    return (saved as Tab) || "today";
  });
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  useEffect(() => {
    loadMenus();
    loadMemberData();
  }, [loadMenus, loadMemberData]);

  useEffect(() => {
    localStorage.setItem("kds_active_tab", activeTab);
  }, [activeTab]);

  const isLoadingData = isLoadingMenu || isLoadingMember;
  const error = menuError || memberError;

  // If Error, show error screen
  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F8FAFC] p-4">
        <div className="bg-red-50 text-red-500 p-6 rounded-2xl w-full max-w-lg shadow-sm border border-red-100">
          <h3 className="text-lg font-normal mb-2">
            เกิดข้อผิดพลาดในการโหลดข้อมูล
          </h3>
          <p className="text-sm font-normal opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  // Skeleton UI for content
  const ContentSkeleton = () => (
    <div className="flex-1 p-6 space-y-6 overflow-hidden">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse"
          />
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
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full md:max-w-2xl transform transition-transform duration-500 ease-in-out ${isMenuDrawerOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}
      >
        <React.Suspense fallback={<div className="h-full bg-white flex items-center justify-center"><ChefHat className="animate-spin text-slate-200" size={40} /></div>}>
          <MenuLibrary onClose={() => setIsMenuDrawerOpen(false)} />
        </React.Suspense>
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
        <div className="bg-white px-4 md:px-6 py-3 border-b border-slate-200 shadow-sm z-20 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                <UtensilsCrossed size={20} />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none">
                  KDS Control
                </h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                    <MenuSquare size={10} /> {menus.length} เมนู
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                    <Users size={10} /> {members.length} สมาชิก
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                    <Package size={10} /> {activePackages.length} ACTIVE
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsMenuDrawerOpen(true)}
              className="flex bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl items-center gap-2 font-medium text-[11px] md:text-xs transition-all border border-emerald-100 shadow-sm"
            >
              <MenuSquare size={16} /> รายการเมนู
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-hide w-full lg:w-auto">
            {[
              {
                id: "template",
                label: "จัดการแม่แบบ",
                icon: Wand2,
                activeColor:
                  "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20",
              },

              {
                id: "checklist",
                label: "เช็คลิสต์เตรียมของ",
                icon: ClipboardCheck,
                activeColor:
                  "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20",
              },
              {
                id: "global",
                label: "แผนการผลิตหลัก",
                icon: CalendarDays,
                activeColor: "bg-slate-900 text-white",
              },
              {
                id: "member",
                label: "แผนลูกค้า",
                icon: Calendar,
                activeColor:
                  "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20",
              },
              {
                id: "today",
                label: "ทำอาหารวันนี้",
                icon: ChefHat,
                activeColor:
                  "bg-blue-500 text-white shadow-lg shadow-blue-500/20",
              },
              {
                id: "summary",
                label: "สรุปยอด",
                icon: Package,
                activeColor:
                  "bg-purple-600 text-white shadow-lg shadow-purple-500/20",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-[11px] md:text-sm font-medium whitespace-nowrap transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? tab.activeColor
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className={`absolute inset-0 rounded-xl -z-0 ${tab.activeColor.split(" ")[0]}`}
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <tab.icon size={16} className="relative z-10" />
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
            <React.Suspense fallback={<ContentSkeleton />}>
              {activeTab === "checklist" && <KitchenChecklist />}
              {activeTab === "global" && <ProductionRoadmap />}
              {activeTab === "member" && <MemberPlanner />}
              {activeTab === "today" && <TodayView />}
              {activeTab === "summary" && <ProductionSummary />}
              {activeTab === "template" && <TemplateManagement />}
            </React.Suspense>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
