import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import dayjs from 'dayjs';
import { useKdsStore } from '../../../store/kdsStore';
import { useAuthStore } from '../../../store/authStore';
import { getWeekDays, formatDisplayDate } from '../../../lib/dateUtils';

export const GlobalPlanner: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const [currentWeekStart, setCurrentWeekStart] = useState(dayjs().startOf('isoWeek' as any).toDate());
  
  const globalPlanSlots = useKdsStore(state => state.globalPlanSlots);
  const loadGlobalPlanner = useKdsStore(state => state.loadGlobalPlanner);
  const selectedMenuId = useKdsStore(state => state.selectedMenuId);
  const assignGlobalSlot = useKdsStore(state => state.assignGlobalSlot);
  const removeGlobalSlot = useKdsStore(state => state.removeGlobalSlot);

  const weekDays = getWeekDays(currentWeekStart);
  
  useEffect(() => {
    const startStr = dayjs(currentWeekStart).format('YYYY-MM-DD');
    const endStr = dayjs(currentWeekStart).add(6, 'day').format('YYYY-MM-DD');
    loadGlobalPlanner(startStr, endStr);
  }, [currentWeekStart, loadGlobalPlanner]);

  const handlePrevWeek = () => setCurrentWeekStart(dayjs(currentWeekStart).subtract(1, 'week').toDate());
  const handleNextWeek = () => setCurrentWeekStart(dayjs(currentWeekStart).add(1, 'week').toDate());

  const getSlot = (date: string, meal: 'meal_1' | 'meal_2') => {
    return globalPlanSlots.find(s => s.delivery_date === date && s.meal_type === meal);
  };

  const handleSlotClick = (date: string, meal: 'meal_1' | 'meal_2') => {
    if (selectedMenuId) {
      assignGlobalSlot(date, meal, selectedMenuId);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent, date: string, meal: 'meal_1' | 'meal_2') => {
    e.stopPropagation();
    if (window.confirm('ลบเมนูตั้งต้นออกจากมื้อนี้?')) {
      removeGlobalSlot(date, meal);
    }
  };

  const renderSlotCell = (date: string, meal: 'meal_1' | 'meal_2', label: string) => {
    const slot = getSlot(date, meal);
    const isInteractive = selectedMenuId !== null;

    return (
      <div 
        onClick={() => handleSlotClick(date, meal)}
        className={`relative flex flex-col p-3 rounded-xl min-h-[100px] border transition-all ${
          slot 
            ? 'bg-emerald-50 border-emerald-200' 
            : isInteractive 
              ? 'bg-slate-50 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer' 
              : 'bg-slate-50 border-dashed border-slate-200 opacity-60'
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
          {slot && isAdmin && (
            <button 
              onClick={(e) => handleRemoveClick(e, date, meal)}
              className="w-5 h-5 rounded-full bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shadow-sm transition-all"
            >
              <X size={12} />
            </button>
          )}
        </div>
        
        {slot && slot.menu_items ? (
          <div className="flex-1">
            <p className="text-xs font-black text-slate-800 leading-tight mb-1">{slot.menu_items.name}</p>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            {isInteractive && <span className="text-xs font-bold text-slate-300">คลิกเพื่อวางเมนูหลัก</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 z-10">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">แผนเมนูหลักประจำสัปดาห์</h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            ตั้งค่าเมนูมาตรฐานของทางร้าน
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
            <button onClick={handlePrevWeek} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><ChevronLeft size={16} /></button>
            <span className="px-3 text-[10px] font-black uppercase tracking-widest text-emerald-600">
               {formatDisplayDate(weekDays[0].date)}
            </span>
            <button onClick={handleNextWeek} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-4">
          {weekDays.map(day => (
            <div key={day.date} className={`bg-white rounded-2xl border ${day.isToday ? 'border-emerald-400 shadow-md ring-2 ring-emerald-500/10' : 'border-slate-200 shadow-sm'} overflow-hidden flex flex-col`}>
              <div className={`px-4 py-3 border-b ${day.isToday ? 'bg-emerald-500 text-white' : 'bg-slate-50 border-slate-100'}`}>
                <p className={`text-[10px] font-black uppercase tracking-widest ${day.isToday ? 'text-emerald-100' : 'text-slate-400'}`}>{day.dayName}</p>
                <h3 className={`text-lg font-black ${day.isToday ? 'text-white' : 'text-slate-800'}`}>{day.shortDate}</h3>
              </div>
              <div className="p-3 space-y-3 flex-1 flex flex-col bg-white">
                {renderSlotCell(day.date, 'meal_1', 'มื้อที่ 1 (M1)')}
                {renderSlotCell(day.date, 'meal_2', 'มื้อที่ 2 (M2)')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
