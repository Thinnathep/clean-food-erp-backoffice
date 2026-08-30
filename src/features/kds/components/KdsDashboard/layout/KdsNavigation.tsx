import React from "react";
import { motion } from "framer-motion";
import { 
  ChefHat, 
  CalendarDays, 
  Calendar, 
  Wand2, 
  Package,
  Flame
} from "lucide-react";
import type { Tab } from "../KdsDashboardProvider";

interface KdsNavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const TABS = [
  { id: "today", label: "วันนี้", icon: ChefHat },
  { id: "recipe", label: "สูตรเมนู", icon: Flame },
  { id: "member", label: "แผนลูกค้า", icon: Calendar },
  { id: "global", label: "แผนผลิต", icon: CalendarDays },
  { id: "template", label: "แม่แบบ", icon: Wand2 },
  { id: "summary", label: "สรุปยอด", icon: Package },
] as const;

export const KdsNavigation: React.FC<KdsNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex bg-slate-100/90 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto scrollbar-hide w-full xl:w-auto items-center shadow-inner gap-1">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 relative min-h-[38px] select-none cursor-pointer ${
              isActive 
                ? "text-white shadow-md shadow-slate-900/20" 
                : "text-slate-500 hover:text-slate-900 hover:bg-white/80"
            } active:scale-95`}
          >
            {isActive && (
              <motion.div 
                layoutId="active-kds-nav-tab" 
                className="absolute inset-0 rounded-xl -z-0 bg-slate-900" 
                initial={false}
                transition={{ type: "spring", stiffness: 380, damping: 28 }} 
              />
            )}
            
            <tab.icon 
              size={14} 
              className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110 text-emerald-400' : 'text-slate-400 group-hover:text-slate-600'}`} 
            />
            <span className="relative z-10 tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

