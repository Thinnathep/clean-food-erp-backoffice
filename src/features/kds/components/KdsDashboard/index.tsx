import React, { useEffect, useCallback, Suspense } from "react";
import { ChefHat } from "lucide-react";
import { useMenuStore } from "../../../../store/menuStore";
import { useMemberStore } from "../../../../store/memberStore";
import { useInventoryStore } from "../../../../store/inventoryStore";
import { useSmartProductionStore } from "../../../../store/smartProductionStore";
import { useNavigate } from "react-router-dom";

import { KdsDashboardProvider, useKdsDashboard } from "./KdsDashboardProvider";
import { KdsHeader } from "./layout/KdsHeader";
import { KdsNavigation } from "./layout/KdsNavigation";
import { DashboardSkeleton } from "./widgets/SkeletonLoaders";

// Lazy Load heavy components
const MenuLibrary = React.lazy(() => import("../MenuLibrary").then(m => ({ default: m.MenuLibrary })));
const ProductionRoadmap = React.lazy(() => import("../ProductionRoadmap").then(m => ({ default: m.ProductionRoadmap })));
const MemberPlanner = React.lazy(() => import("../MemberPlanner").then(m => ({ default: m.MemberPlanner })));
const TodayView = React.lazy(() => import("../TodayView").then(m => ({ default: m.TodayView })));
const ProductionSummary = React.lazy(() => import("../ProductionSummary").then(m => ({ default: m.ProductionSummary })));
const TemplateManagement = React.lazy(() => import("../TemplateManagement").then(m => ({ default: m.TemplateManagement })));

// New Smart Production Views
const KdsChecklistView = React.lazy(() => import("./views/KdsChecklistView").then(m => ({ default: m.KdsChecklistView })));
const KdsRecipeManagementView = React.lazy(() => import("./views/KdsRecipeManagementView").then(m => ({ default: m.KdsRecipeManagementView })));

const KdsDashboardContent: React.FC = () => {
  const navigate = useNavigate();
  
  const { 
    activeTab, 
    setActiveTab, 
    isMenuDrawerOpen, 
    setIsMenuDrawerOpen 
  } = useKdsDashboard();

  const loadMenus = useMenuStore((state) => state.loadMenus);
  const loadMemberData = useMemberStore((state) => state.loadMemberData);
  const loadInventory = useInventoryStore((state) => state.loadItems);
  
  const menus = useMenuStore((state) => state.menus);
  const members = useMemberStore((state) => state.members);
  const inventoryItems = useInventoryStore((state) => state.items);

  const isLoadingMenu = useMenuStore((state) => state.isLoading);
  const isLoadingMember = useMemberStore((state) => state.isLoading);
  const isLoadingInventory = useInventoryStore((state) => state.isLoading);

  const fetchProductionPlan = useSmartProductionStore((state) => state.fetchProductionPlan);
  const selectedDate = useSmartProductionStore((state) => state.selectedDate);

  useEffect(() => {
    loadMenus();
    loadMemberData();
    loadInventory();
    fetchProductionPlan(selectedDate);
  }, [loadMenus, loadMemberData, loadInventory, fetchProductionPlan, selectedDate]);

  const isLoadingData = isLoadingMenu || isLoadingMember || isLoadingInventory;

  const handleNavigateToMembers = useCallback(() => navigate('/members'), [navigate]);
  const handleNavigateToInventory = useCallback(() => navigate('/inventory/items'), [navigate]);

  return (
    <div className="flex min-h-full w-full bg-slate-50/50 relative font-prompt">
      {/* Drawer Overlay */}
      {isMenuDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[45] transition-all duration-300" 
          onClick={() => setIsMenuDrawerOpen(false)} 
        />
      )}

      {/* Menu Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full md:max-w-2xl transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) ${
          isMenuDrawerOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"
        }`}
      >
        <Suspense fallback={
          <div className="h-full bg-white flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl animate-pulse">
              <ChefHat className="text-slate-300" size={48} />
            </div>
            <p className="text-sm font-medium text-slate-400 animate-pulse">กำลังโหลดคลังเมนู...</p>
          </div>
        }>
          <MenuLibrary onClose={() => setIsMenuDrawerOpen(false)} />
        </Suspense>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-sm z-30 shrink-0 sticky top-0">
          <div className="px-3 md:px-6 py-2 md:py-3 flex flex-col xl:flex-row items-center justify-between gap-3">
            
            <KdsHeader 
              menusCount={menus.length}
              membersCount={members.length}
              inventoryCount={inventoryItems.length}
              onOpenMenuDrawer={() => setIsMenuDrawerOpen(true)}
              onNavigateToMembers={handleNavigateToMembers}
              onNavigateToInventory={handleNavigateToInventory}
            />

            <KdsNavigation 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
          </div>
        </div>

        {/* Dynamic Tab Content */}
        <div className="flex-1 flex flex-col bg-transparent relative">
          {isLoadingData ? (
            <DashboardSkeleton />
          ) : (
            <Suspense fallback={<DashboardSkeleton />}>
              {activeTab === "today" && <TodayView />}
              {activeTab === "recipe" && <KdsRecipeManagementView />}
              {activeTab === "global" && <ProductionRoadmap />}
              {activeTab === "member" && <MemberPlanner />}
              {activeTab === "summary" && <ProductionSummary />}
              {activeTab === "template" && <TemplateManagement />}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export const KdsDashboard: React.FC = () => {
  return (
    <KdsDashboardProvider>
      <KdsDashboardContent />
    </KdsDashboardProvider>
  );
};
