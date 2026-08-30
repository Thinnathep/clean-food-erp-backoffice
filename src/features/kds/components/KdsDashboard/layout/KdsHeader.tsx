import React from "react";
import { MenuSquare, Users, Database, BookOpen } from "lucide-react";

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
    <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4 w-full xl:w-auto">
      {/* Title & Brand Badge */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
            ระบบห้องครัว KDS
          </h1>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold">
            Kitchen Ops
          </span>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Clean Food Chiang Rai
        </p>
      </div>

      {/* 3 Bento Quick Metric Chips */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={onOpenMenuDrawer}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="ดูรายการเมนูทั้งหมด"
        >
          <MenuSquare size={14} className="text-indigo-600" />
          <span>{menusCount} เมนู</span>
        </button>

        <button
          onClick={onNavigateToMembers}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/80 hover:bg-amber-100 text-amber-700 border border-amber-100/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="ดูข้อมูลสมาชิก"
        >
          <Users size={14} className="text-amber-600" />
          <span>{membersCount} สมาชิก</span>
        </button>

        <button
          onClick={onNavigateToInventory}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border border-emerald-100/80 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="ดูสต็อกวัตถุดิบ"
        >
          <Database size={14} className="text-emerald-600" />
          <span>{inventoryCount} สต็อก</span>
        </button>

        <button
          onClick={onOpenMenuDrawer}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer min-h-[34px]"
        >
          <BookOpen size={14} />
          <span className="hidden sm:inline">คลังสูตรอาหาร</span>
          <span className="sm:hidden">คลังสูตร</span>
        </button>
      </div>
    </div>
  );
};
