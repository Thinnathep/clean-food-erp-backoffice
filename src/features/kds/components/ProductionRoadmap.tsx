import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Wand2, 
  Calendar as CalendarIcon, 
  LayoutGrid, 
  List, 
  Search,
  ArrowRight,
  Sparkles,
  ClipboardList,
  Package
} from 'lucide-react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { useKdsStore } from '../../../store/kdsStore';
import { useAuthStore } from '../../../store/authStore';
import { getWeekDays } from '../../../lib/dateUtils';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ViewMode = 'week' | 'month';

// 1. Draggable Menu Item
const DraggableMenu: React.FC<{ menu: any; isSelected: boolean; onClick: () => void }> = ({ menu, isSelected, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `menu-${menu.id}`,
    data: { menu }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left group cursor-grab active:cursor-grabbing",
        isSelected 
          ? "bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/10" 
          : "bg-white border-slate-100 hover:border-emerald-200 hover:shadow-md",
        isDragging && "opacity-40 grayscale-[0.5]"
      )}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0 bg-slate-50 flex items-center justify-center">
        {menu.image_url ? (
          <img src={menu.image_url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        ) : (
          <Sparkles size={20} className="text-slate-200" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-xs font-bold leading-tight line-clamp-1",
          isSelected ? "text-emerald-700" : "text-slate-800"
        )}>{menu.name}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{menu.category}</p>
      </div>
      {isSelected && (
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg">
          <ArrowRight size={12} />
        </div>
      )}
    </div>
  );
};

// 2. Droppable Slot Component
interface DroppableSlotProps {
  date: string;
  meal: string;
  compact?: boolean;
  onSlotClick: (date: string, meal: string) => void;
  onRemove: (e: React.MouseEvent, date: string, meal: string) => void;
  onApplyAll: (date: string, meal: string, menuId: string) => void;
  onNoteChange: (date: string, meal: string, note: string) => void;
  slot: any;
  isActive: boolean;
  isAdmin: boolean;
}

const AddMealButton: React.FC<{ date: string; onAdd: (date: string) => void }> = ({ date, onAdd }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `add-meal-${date}`,
    data: { date, isAddButton: true }
  });

  return (
    <div ref={setNodeRef}>
      <button 
        onClick={() => onAdd(date)}
        className={cn(
          "w-full py-4 border-2 border-dashed rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-medium",
          isOver 
            ? "border-emerald-500 bg-emerald-50 text-emerald-600 scale-[1.02] shadow-md" 
            : "border-slate-100 text-slate-300 hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50/50"
        )}
      >
         <Sparkles size={14} className={isOver ? "animate-pulse" : ""} />
         {isOver ? "ปล่อยเพื่อเพิ่มมื้อใหม่" : "เพิ่มมื้ออาหาร"}
      </button>
    </div>
  );
};

const DroppableSlot: React.FC<DroppableSlotProps> = ({ 
  date, meal, compact, onSlotClick, onRemove, onApplyAll, onNoteChange, slot, isActive, isAdmin 
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${date}-${meal}`,
    data: { date, meal }
  });

  const menu = slot?.menu_items;

  if (compact) {
    return (
      <div 
        ref={setNodeRef}
        onClick={() => onSlotClick(date, meal)}
        className={cn(
          "group relative h-8 rounded-lg border transition-all flex items-center px-2 overflow-hidden cursor-pointer",
          isOver && "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 shadow-lg z-10",
          slot 
            ? "bg-emerald-50 border-emerald-100" 
            : isActive 
              ? "bg-slate-50 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50" 
              : "bg-slate-50/50 border-dashed border-slate-100"
        )}
      >
        {slot ? (
          <div className="flex items-center gap-1.5 w-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-[9px] font-medium text-emerald-800 truncate">{menu?.name}</span>
            {isAdmin && (
              <button 
                onClick={(e) => onRemove(e, date, meal)}
                className="absolute -right-1 -top-1 w-5 h-5 bg-white shadow-md border border-slate-100 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-all z-10"
              >
                <X size={10} />
              </button>
            )}
          </div>
        ) : (
          (isActive || isOver) && <div className="w-full text-center text-[8px] text-slate-300">วาง</div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      onClick={() => onSlotClick(date, meal)}
      className={cn(
        "group relative flex flex-col p-3 rounded-2xl border transition-all min-h-[110px]",
        isOver && "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 shadow-xl z-10 scale-[1.02]",
        slot 
          ? "bg-white border-emerald-100 shadow-sm ring-1 ring-emerald-500/5" 
          : isActive 
            ? "bg-slate-50/50 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-inner cursor-pointer" 
            : "bg-slate-50/30 border-dashed border-slate-200 opacity-60"
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-slate-700">
            มื้อที่ {meal === 'meal_1' ? '1' : '2'}
            <span className="text-[10px] text-slate-400 ml-1.5">(M{meal === 'meal_1' ? '1' : '2'})</span>
          </span>
        </div>
        {slot && isAdmin && (
          <button 
            onClick={(e) => onRemove(e, date, meal)}
            className="w-7 h-7 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all shadow-sm border border-red-100"
          >
            <X size={14} />
          </button>
        )}
      </div>
      
      {slot && menu ? (
        <div className="flex-1 flex flex-col">
          <div className="flex gap-3 items-start">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 shadow-sm bg-slate-50 flex items-center justify-center">
              {menu.image_url ? (
                <img src={menu.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Sparkles size={16} className="text-slate-200" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 leading-tight line-clamp-2">{menu.name}</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">{menu.category}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 relative">
            <textarea
              placeholder="บันทึกการผลิต..."
              value={slot.prep_notes || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onNoteChange(date, meal, e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 resize-none h-12 transition-all hover:bg-white"
            />
          </div>

          {isAdmin && (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onApplyAll(date, meal, menu.id);
              }}
              className="mt-3 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Wand2 size={13} />
              ลงเมนูให้ทุกคน
            </motion.button>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          {isActive || isOver ? (
             <>
               <div className={cn(
                 "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                 isOver ? "bg-emerald-500 text-white shadow-lg" : "bg-slate-50 text-slate-300"
               )}>
                  <Sparkles size={18} />
               </div>
               <span className={cn("text-xs font-medium", isOver ? "text-emerald-700" : "text-slate-400")}>
                 {isOver ? "ปล่อยเพื่อวาง" : "ว่าง - คลิกเพื่อลงเมนู"}
               </span>
             </>
          ) : (
            <span className="text-[10px] text-slate-200">ยังไม่ระบุ</span>
          )}
        </div>
      )}
    </div>
  );
};

export const ProductionRoadmap: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<any>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [pendingAddMealDate, setPendingAddMealDate] = useState<string | null>(null);
  
  const globalPlanSlots = useKdsStore(state => state.globalPlanSlots);
  const menus = useKdsStore(state => state.menus);
  const loadGlobalPlanner = useKdsStore(state => state.loadGlobalPlanner);
  const selectedMenuId = useKdsStore(state => state.selectedMenuId);
  const setSelectedMenuId = useKdsStore(state => state.setSelectedMenuId);
  const assignGlobalSlot = useKdsStore(state => state.assignGlobalSlot);
  const removeGlobalSlot = useKdsStore(state => state.removeGlobalSlot);
  const updateGlobalSlotNote = useKdsStore(state => state.updateGlobalSlotNote);
  const applyDailyMenuToAll = useKdsStore(state => state.applyDailyMenuToAll);
  
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);
  const [prepSummary, setPrepSummary] = useState<any[]>([]);
  const [isLoadingPrep, setIsLoadingPrep] = useState(false);

  const calculateDayNutrition = (date: string) => {
    const daySlots = globalPlanSlots.filter(s => s.delivery_date === date);
    return daySlots.reduce((acc, slot) => {
      const menu = slot.menu_items;
      if (menu) {
        acc.calories += Number(menu.calories || 0);
        acc.protein += Number(menu.protein || 0);
      }
      return acc;
    }, { calories: 0, protein: 0 });
  };

  const handleShowPrepSummary = async () => {
    setIsLoadingPrep(true);
    setIsPrepModalOpen(true);
    try {
      const weekDates = weekDays.map(d => d.date);
      const weekSlots = globalPlanSlots.filter(s => weekDates.includes(s.delivery_date));
      const menuItemIds = Array.from(new Set(weekSlots.map(s => s.menu_item_id)));
      
      if (menuItemIds.length === 0) {
        setPrepSummary([]);
        setIsLoadingPrep(false);
        return;
      }

      // Import the API function
      const { fetchBulkRecipes } = await import('../api');
      const recipes = await fetchBulkRecipes(menuItemIds);
      
      // Aggregate ingredients
      const aggregation: Record<string, any> = {};
      recipes.forEach(r => {
        const id = r.item_id;
        if (!aggregation[id]) {
          aggregation[id] = {
            name: r.item_name,
            unit: r.storage_unit,
            totalQty: 0
          };
        }
        aggregation[id].totalQty += r.quantity_required;
      });

      setPrepSummary(Object.values(aggregation));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPrep(false);
    }
  };

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load data when date or view mode changes
  useEffect(() => {
    let start, end;
    if (viewMode === 'week') {
      start = currentDate.startOf('isoWeek').format('YYYY-MM-DD');
      end = currentDate.endOf('isoWeek').format('YYYY-MM-DD');
    } else {
      start = currentDate.startOf('month').format('YYYY-MM-DD');
      end = currentDate.endOf('month').format('YYYY-MM-DD');
    }
    loadGlobalPlanner(start, end);
  }, [currentDate, viewMode, loadGlobalPlanner]);

  const weekDays = useMemo(() => getWeekDays(currentDate.startOf('isoWeek').toDate()), [currentDate]);
  
  const monthDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startOfGrid = startOfMonth.startOf('isoWeek');
    const endOfGrid = endOfMonth.endOf('isoWeek');
    
    const days = [];
    let curr = startOfGrid;
    while (curr.isBefore(endOfGrid) || curr.isSame(endOfGrid, 'day')) {
      days.push({
        date: curr.format('YYYY-MM-DD'),
        dayNum: curr.date(),
        isCurrentMonth: curr.month() === currentDate.month(),
        isToday: curr.isSame(dayjs(), 'day'),
        dayName: curr.format('ddd')
      });
      curr = curr.add(1, 'day');
    }
    return days;
  }, [currentDate]);

  const filteredMenus = useMemo(() => {
    if (!searchQuery) return menus.slice(0, 10);
    return menus.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10);
  }, [menus, searchQuery]);

  const handlePrev = () => setCurrentDate(prev => prev.subtract(1, viewMode));
  const handleNext = () => setCurrentDate(prev => prev.add(1, viewMode));
  const handleToday = () => setCurrentDate(dayjs());

  const getSlot = (date: string, meal: string) => {
    return globalPlanSlots.find(s => s.delivery_date === date && s.meal_type === meal);
  };

  const handleSlotClick = (date: string, meal: string) => {
    if (selectedMenuId) {
      assignGlobalSlot(date, meal, selectedMenuId);
    } else {
      setIsLibraryOpen(true);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent, date: string, meal: string) => {
    e.stopPropagation();
    removeGlobalSlot(date, meal);
  };

  const handleAddMeal = (date: string) => {
    if (selectedMenuId) {
      const slots = globalPlanSlots.filter(s => s.delivery_date === date);
      const nextMealNum = slots.length + 1;
      const mealKey = `meal_${nextMealNum}`;
      assignGlobalSlot(date, mealKey, selectedMenuId);
      // Optional: setSelectedMenuId(null);
    } else {
      setPendingAddMealDate(date);
      setIsLibraryOpen(true);
    }
  };

  const handleMenuClick = (menuId: string) => {
    if (pendingAddMealDate) {
      const slots = globalPlanSlots.filter(s => s.delivery_date === pendingAddMealDate);
      const nextMealNum = slots.length + 1;
      const mealKey = `meal_${nextMealNum}`;
      assignGlobalSlot(pendingAddMealDate, mealKey, menuId);
      setPendingAddMealDate(null);
      setIsLibraryOpen(false);
    } else {
      setSelectedMenuId(selectedMenuId === menuId ? null : menuId);
    }
  };
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveMenu(active.data.current?.menu);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveMenu(null);

    if (over && active.data.current?.menu) {
      const menu = active.data.current.menu;
      const overData = over.data.current as any;

      if (overData.isAddButton) {
        const slots = globalPlanSlots.filter(s => s.delivery_date === overData.date);
        const nextMealNum = slots.length + 1;
        const mealKey = `meal_${nextMealNum}`;
        assignGlobalSlot(overData.date, mealKey, menu.id);
      } else {
        const { date, meal } = overData as { date: string, meal: string };
        assignGlobalSlot(date, meal, menu.id);
      }
    }
  };

  const renderSlot = (date: string, meal: string, compact = false) => {
    const slot = getSlot(date, meal);
    const isActive = selectedMenuId !== null;

    return (
      <DroppableSlot 
        key={`${date}-${meal}`}
        date={date}
        meal={meal}
        compact={compact}
        onSlotClick={handleSlotClick}
        onRemove={handleRemoveClick}
        onApplyAll={applyDailyMenuToAll}
        onNoteChange={updateGlobalSlotNote}
        slot={slot}
        isActive={isActive}
        isAdmin={isAdmin}
      />
    );
  };

  return (
    <DndContext 
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden h-full">
        
        {/* 1. Enhanced Header */}
        <div className="bg-white px-6 py-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm relative z-30">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
                <CalendarIcon size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  แผนการผลิตหลัก
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Master Roadmap</span>
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-0.5">วางแผนเมนูมาตรฐานสำหรับครัว (ลากวางเมนูได้เลย)</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={handleShowPrepSummary}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all shadow-sm border bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
            >
              <ClipboardList size={16} />
              สรุปเตรียมของ
            </button>

            <button 
              onClick={() => setIsLibraryOpen(!isLibraryOpen)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all shadow-sm border",
                isLibraryOpen 
                  ? "bg-slate-900 text-white border-slate-900" 
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-600"
              )}
            >
              <Sparkles size={16} />
              {isLibraryOpen ? "ปิดรายการเมนู" : "เปิดรายการเมนู"}
            </button>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

            <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
              <button 
                onClick={() => setViewMode('week')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  viewMode === 'week' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <List size={16} /> สัปดาห์
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  viewMode === 'month' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <LayoutGrid size={16} /> รายเดือน
              </button>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />

            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
               <button 
                 onClick={handleToday}
                 className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all shadow-sm"
               >
                 วันนี้
               </button>
               <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                 <button onClick={handlePrev} className="p-2.5 text-slate-500 hover:bg-slate-50 border-r border-slate-100"><ChevronLeft size={18} /></button>
                 <div className="px-5 text-sm font-bold text-slate-900 min-w-[140px] text-center">
                    {viewMode === 'week' 
                      ? `สัปดาห์ที่ ${currentDate.isoWeek()}` 
                      : currentDate.format('MMMM YYYY')}
                 </div>
                 <button onClick={handleNext} className="p-2.5 text-slate-500 hover:bg-slate-50 border-l border-slate-100"><ChevronRight size={18} /></button>
               </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
          
          {/* 2. Main Calendar Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
             
             <AnimatePresence mode="wait">
               {viewMode === 'week' ? (
                 <motion.div 
                   key="week-view"
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6"
                 >
                   {weekDays.map(day => (
                     <div 
                       key={day.date} 
                       className={cn(
                         "bg-white rounded-[2rem] border overflow-hidden flex flex-col transition-all duration-500",
                         day.isToday 
                          ? "border-emerald-400 shadow-2xl shadow-emerald-500/10 ring-1 ring-emerald-500/20" 
                          : "border-slate-200/60 shadow-xl shadow-slate-200/20"
                       )}
                     >
                       <div className={cn(
                         "px-6 py-5 border-b flex items-center justify-between",
                         day.isToday ? "bg-emerald-500 text-white" : "bg-slate-50/50 border-slate-100"
                       )}>
                         <div>
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-[0.2em]",
                              day.isToday ? "text-emerald-100" : "text-slate-400"
                            )}>{day.dayName}</p>
                            <h3 className={cn(
                              "text-xl font-bold tracking-tight",
                              day.isToday ? "text-white" : "text-slate-800"
                            )}>{day.shortDate}</h3>
                         </div>

                         {/* Nutrition Mini Summary */}
                         <div className="flex flex-col items-end gap-0.5">
                            <div className="flex items-center gap-2">
                               <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", day.isToday ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600")}>
                                  P: {calculateDayNutrition(day.date).protein}g
                               </span>
                               <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", day.isToday ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
                                  C: {calculateDayNutrition(day.date).calories}
                               </span>
                            </div>
                         </div>
                       </div>
                       <div className="p-5 space-y-4 flex-1 flex flex-col bg-white overflow-y-auto max-h-[500px] custom-scrollbar">
                          {globalPlanSlots
                            .filter(s => s.delivery_date === day.date)
                            .sort((a, b) => a.meal_type.localeCompare(b.meal_type))
                            .map(slot => renderSlot(day.date, slot.meal_type))}
                          
                          <AddMealButton date={day.date} onAdd={handleAddMeal} />
                       </div>
                     </div>
                   ))}
                 </motion.div>
               ) : (
                 <motion.div 
                   key="month-view"
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.02 }}
                   className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200/50"
                 >
                   {/* Weekday Labels */}
                   <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                     {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                       <div key={d} className="py-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 border-r border-slate-100 last:border-0">
                         {d}
                       </div>
                     ))}
                   </div>

                   {/* Grid */}
                   <div className="grid grid-cols-7">
                     {monthDays.map((day, idx) => (
                       <div 
                         key={day.date} 
                         className={cn(
                           "min-h-[140px] border-r border-b border-slate-100 p-2.5 transition-colors group relative",
                           !day.isCurrentMonth && "bg-slate-50/30",
                           idx % 7 === 6 && "border-r-0"
                         )}
                       >
                         <div className="flex justify-between items-start mb-2 px-1">
                            <span className={cn(
                              "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                              day.isToday 
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                                : day.isCurrentMonth ? "text-slate-700" : "text-slate-300"
                            )}>
                              {day.dayNum}
                            </span>
                            {day.isToday && (
                              <div className="flex gap-1">
                                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              </div>
                            )}
                         </div>

                         <div className="space-y-1.5">
                            {renderSlot(day.date, 'meal_1', true)}
                            {renderSlot(day.date, 'meal_2', true)}
                         </div>
                       </div>
                     ))}
                   </div>
                 </motion.div>
               )}
             </AnimatePresence>

             {/* Legend */}
             <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-emerald-50/30 rounded-3xl border border-emerald-100/50">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Sparkles size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-slate-800">โหมดวางแผนอัจฉริยะ</p>
                      <p className="text-xs text-slate-500">คุณสามารถลากเมนูจากแถบด้านขวามาวาง หรือคลิกเลือกเมนูแล้วคลิกที่ช่องวันที่ต้องการได้</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                      <span className="text-[11px] font-bold text-slate-600">ลงเมนูแล้ว</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border border-dashed border-slate-300 bg-white" />
                      <span className="text-[11px] font-bold text-slate-600">ว่าง</span>
                   </div>
                </div>
             </div>
          </div>

          <AnimatePresence>
            {isLibraryOpen && (
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="fixed inset-y-0 right-0 w-full md:w-80 flex flex-col bg-white border-l border-slate-200 overflow-hidden shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[100]"
              >
                 <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                       <Sparkles size={20} className="text-emerald-400" />
                       <h3 className="font-bold text-lg">เลือกเมนู</h3>
                    </div>
                    <button 
                      onClick={() => setIsLibraryOpen(false)}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                       <X size={20} />
                    </button>
                 </div>

                 <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         type="text" 
                         placeholder="ค้นหาเมนูที่ต้องการ..." 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                       />
                    </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {filteredMenus.length > 0 ? (
                      filteredMenus.map(menu => (
                        <DraggableMenu 
                          key={menu.id} 
                          menu={menu} 
                          isSelected={selectedMenuId === menu.id}
                          onClick={() => handleMenuClick(menu.id)}
                        />
                      ))
                    ) : (
                      <div className="py-12 text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                            <Search size={24} />
                         </div>
                         <p className="text-xs font-medium text-slate-400">ไม่พบเมนูที่ค้นหา</p>
                      </div>
                    )}
                 </div>

                 {selectedMenuId && (
                   <div className="p-4 bg-white border-t border-slate-100">
                     <motion.div 
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="p-4 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/30"
                     >
                        <div className="flex items-center justify-between text-white mb-2">
                           <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 text-white">พร้อมวางเมนู</span>
                           <button onClick={() => setSelectedMenuId(null)} className="p-1 hover:bg-white/20 rounded-lg transition-all">
                              <X size={14} />
                           </button>
                        </div>
                        <p className="text-sm font-bold text-white line-clamp-1">
                           {menus.find(m => m.id === selectedMenuId)?.name}
                        </p>
                     </motion.div>
                   </div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Prep Summary Modal */}
        <AnimatePresence>
          {isPrepModalOpen && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPrepModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                  <div className="flex items-center gap-3">
                    <ClipboardList size={24} className="text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-xl">สรุปรายการเตรียมของ</h3>
                      <p className="text-xs text-slate-400">คำนวณจากเมนูทั้งหมดในสัปดาห์นี้</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsPrepModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  {isLoadingPrep ? (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-slate-500 font-medium">กำลังคำนวณวัตถุดิบ...</p>
                    </div>
                  ) : prepSummary.length > 0 ? (
                    <div className="space-y-3">
                      {prepSummary.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-emerald-200 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-200 transition-all">
                               <Package size={18} />
                            </div>
                            <span className="font-bold text-slate-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black text-slate-900">{item.totalQty.toLocaleString()}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">{item.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-4">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                         <ClipboardList size={40} />
                      </div>
                      <p className="text-slate-400">ยังไม่มีเมนูในสัปดาห์นี้ หรือเมนูยังไม่ได้ลงสูตรอาหาร</p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                   <p className="text-[10px] text-slate-400 max-w-[200px]">
                      * ข้อมูลนี้คำนวณจากสูตรอาหารพื้นฐานที่ระบุไว้ในระบบจัดการเมนู
                   </p>
                   <button 
                     onClick={() => setIsPrepModalOpen(false)}
                     className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                   >
                     รับทราบ
                   </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
          {activeMenu ? (
            <div className="flex items-center gap-4 p-3 rounded-2xl border bg-white border-emerald-500 shadow-2xl w-64 opacity-90 scale-105 pointer-events-none">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0 bg-slate-50 flex items-center justify-center">
                {activeMenu.image_url ? (
                  <img src={activeMenu.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Sparkles size={20} className="text-slate-200" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-tight line-clamp-1 text-slate-800">{activeMenu.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{activeMenu.category}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #E2E8F0;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #CBD5E1;
          }
        `}</style>
      </div>
    </DndContext>
  );
};


