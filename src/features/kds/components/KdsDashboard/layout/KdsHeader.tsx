import React from "react";
import { UtensilsCrossed, MenuSquare, Users, Database } from "lucide-react";
import { StatusMetricPill } from "../widgets/StatusMetricPill";

interface KdsHeaderProps {
  menusCount: number;
  membersCount: number;
  inventoryCount: number;
  onOpenMenuDrawer: () => void;
  onNavigateToMembers: () => void;
  onNavigateToInventory: () => void;
}

export const KdsHeader: React.FC<KdsHeaderProps> = ({
  menusCount,
  membersCount,
  inventoryCount,
  onOpenMenuDrawer,
  onNavigateToMembers,
  onNavigateToInventory
}) => {
  return (
    <div className="flex items-center justify-between w-full xl:w-auto gap-3">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-8 h-8 md:w-9 md:h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm shrink-0">
          <UtensilsCrossed size={16} />
        </div>
        
        <div>
          <h1 className="text-[10px] md:text-[11px] font-bold text-slate-400 tracking-[0.1em] leading-none mb-1.5 uppercase">Kitchen System</h1>
          
          <div className="flex items-center gap-3">
            <StatusMetricPill 
              icon={MenuSquare} 
              count={menusCount} 
              label="รายการเมนู" 
              description="รวมเมนูอาหารทั้งหมดที่ใช้ในระบบ" 
              iconColor="text-indigo-500"
              textColor="text-indigo-900"
              onClick={onOpenMenuDrawer}
            />
            <div className="w-px h-3 bg-slate-200" />
            <StatusMetricPill 
              icon={Users} 
              count={membersCount} 
              label="สมาชิก" 
              description="จำนวนลูกค้าที่สมัครแพ็กเกจ" 
              iconColor="text-amber-500"
              textColor="text-amber-900"
              onClick={onNavigateToMembers}
            />
            <div className="w-px h-3 bg-slate-200" />
            <StatusMetricPill 
              icon={Database} 
              count={inventoryCount} 
              label="สต็อก" 
              description="วัตถุดิบทั้งหมดที่มีในคลัง" 
              iconColor="text-emerald-500"
              textColor="text-emerald-900"
              onClick={onNavigateToInventory}
            />
          </div>
        </div>
      </div>

      <button
        onClick={onOpenMenuDrawer}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg font-normal text-[11px] md:text-xs transition-all shadow-sm shrink-0"
      >
        <MenuSquare size={14} /> 
        <span className="hidden sm:inline">คลังเมนู</span>
        <span className="sm:hidden">เมนู</span>
      </button>
    </div>
  );
};
