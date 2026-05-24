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
  { id: "today", label: "วันนี้", icon: ChefHat, activeColor: "bg-blue-600 text-white shadow-blue-500/40" },
  { id: "recipe", label: "สูตรเมนู", icon: Flame, activeColor: "bg-orange-500 text-white shadow-orange-500/40" },
  { id: "member", label: "แผนลูกค้า", icon: Calendar, activeColor: "bg-emerald-600 text-white shadow-emerald-500/40" },
  { id: "global", label: "แผนผลิต", icon: CalendarDays, activeColor: "bg-slate-900 text-white shadow-slate-900/40" },
  { id: "template", label: "แม่แบบ", icon: Wand2, activeColor: "bg-purple-600 text-white shadow-purple-600/40" },
  { id: "summary", label: "สรุปยอด", icon: Package, activeColor: "bg-rose-600 text-white shadow-rose-600/40" },
] as const;

export const KdsNavigation: React.FC<KdsNavigationProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex bg-slate-100/80 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 overflow-x-auto scrollbar-hide w-full xl:w-auto items-center shadow-inner gap-0.5">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const bgClass = tab.activeColor.split(" ").find(c => c.startsWith("bg-"));
        
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] md:text-xs font-medium whitespace-nowrap transition-colors duration-300 relative min-h-[40px] group ${
              isActive 
                ? tab.activeColor 
                : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
            } active:scale-95`}
          >
            {isActive && (
              <motion.div 
                layoutId="active-kds-nav-tab" 
                className={`absolute inset-0 rounded-lg -z-0 ${bgClass}`} 
                initial={false}
                transition={{ type: "spring", stiffness: 350, damping: 25 }} 
              />
            )}
            
            <tab.icon 
              size={14} 
              className={`relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'}`} 
            />
            <span className="relative z-10 tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
