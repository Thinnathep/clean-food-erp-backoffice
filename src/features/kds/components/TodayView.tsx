import React, { useMemo, useEffect, useState } from 'react';
import { ChefHat, CheckCircle2, Clock, AlertTriangle, CalendarDays } from 'lucide-react';
import dayjs from 'dayjs';
import { useKdsStore } from '../../../store/kdsStore';
import { fetchTodayMeals } from '../api';
import { type PintoMealPlan, MEAL_TYPE_LABELS, CATEGORY_COLORS } from '../../../types';

export const TodayView: React.FC = () => {
  const memberSchedules = useKdsStore(state => state.memberSchedules);
  const loadMemberPlanner = useKdsStore(state => state.loadMemberPlanner);
  const tasks = useKdsStore(state => state.tasks);
  const fetchTasks = useKdsStore(state => state.fetchTasks);
  
  const [plannedMeals, setPlannedMeals] = useState<PintoMealPlan[]>([]);
  const [isLoadingPlanned, setIsLoadingPlanned] = useState(false);

  useEffect(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    loadMemberPlanner(todayStr, todayStr);
    fetchTasks(); 
    
    // Fetch planned meals from the new system
    setIsLoadingPlanned(true);
    fetchTodayMeals()
      .then(setPlannedMeals)
      .finally(() => setIsLoadingPlanned(false));
  }, [loadMemberPlanner, fetchTasks]);

  // Aggregate today's production from Member Schedules
  const todayProduction = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todaySchedules = memberSchedules.filter(s => s.delivery_date === todayStr);
    
    const summary: Record<string, { 
      menuName: string, 
      totalQty: number, 
      notes: { note: string, qty: number, memberName: string }[] 
    }> = {};

    todaySchedules.forEach(schedule => {
      if (!schedule.menu_items) return;
      const menuId = schedule.menu_items.id;
      
      if (!summary[menuId]) {
        summary[menuId] = {
          menuName: schedule.menu_items.name,
          totalQty: 0,
          notes: []
        };
      }
      
      summary[menuId].totalQty += schedule.quantity;
      if (schedule.notes) {
        summary[menuId].notes.push({
           note: schedule.notes,
           qty: schedule.quantity,
           memberName: schedule.members?.full_name || 'ลูกค้า'
        });
      }
    });

    return Object.values(summary).sort((a, b) => b.totalQty - a.totalQty);
  }, [memberSchedules]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#F8FAFC]">
      
      {/* Planned Menu Section (New System) */}
      <div className="mb-10">
        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <CalendarDays className="text-emerald-500" size={20} /> เมนูที่วางแผนไว้สำหรับวันนี้ (Global Plan)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoadingPlanned ? (
            <div className="col-span-full h-20 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold">
              กำลังโหลดแผนอาหาร...
            </div>
          ) : plannedMeals.length === 0 ? (
            <div className="col-span-full p-6 bg-slate-100 rounded-xl text-center text-slate-500 font-bold border border-slate-200">
              ยังไม่มีการวางแผนเมนูสำหรับวันนี้
            </div>
          ) : (
            plannedMeals.map((meal) => {
              const color = meal.menu_item ? (CATEGORY_COLORS[meal.menu_item.category] || '#10b981') : '#10b981';
              return (
                <div key={meal.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: `${color}15` }}>
                    {meal.meal_type === 'meal_1' ? '☀️' : '🌙'}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{MEAL_TYPE_LABELS[meal.meal_type]}</span>
                      {meal.is_published && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-black">เผยแพร่แล้ว</span>}
                    </div>
                    <h4 className="font-black text-slate-800">{meal.menu_name}</h4>
                    {meal.menu_item && (
                      <p className="text-[10px] font-bold text-slate-500 mt-1">
                        {meal.menu_item.calories} kcal · Protein {meal.menu_item.protein}g
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
             <ChefHat className="text-emerald-500" size={24}/> ยอดรวมทำอาหารวันนี้ (Auto-Count)
          </h2>
          <p className="text-xs md:text-sm font-bold text-slate-500 mt-1">สรุปยอดเตรียมวัตถุดิบและอาหารสำหรับลูกค้าผูกปิ่นโตทั้งหมด</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center flex-1 md:flex-none">
             <p className="text-[10px] font-black uppercase text-slate-400">เมนูที่ต้องทำ</p>
             <p className="text-lg font-black text-emerald-600">{todayProduction.length}</p>
           </div>
           <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center flex-1 md:flex-none">
             <p className="text-[10px] font-black uppercase text-slate-400">รวมทั้งหมด</p>
             <p className="text-lg font-black text-blue-600">
               {todayProduction.reduce((sum, item) => sum + item.totalQty, 0)} <span className="text-xs">กล่อง</span>
             </p>
           </div>
        </div>
      </div>

      {todayProduction.length === 0 ? (
         <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-100" />
            <h3 className="text-xl font-black text-slate-800">ไม่มีคิวทำอาหารปิ่นโตในวันนี้</h3>
            <p className="text-sm font-bold mt-2">ยอดเยี่ยม! พักผ่อนได้เลย หรือไปลุย Live Orders แทน</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {todayProduction.map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-800 leading-tight pr-4">{item.menuName}</h3>
                <span className="text-2xl font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-xl">
                  {item.totalQty}
                </span>
              </div>
              <div className="p-5 flex-1 bg-white">
                {item.notes.length > 0 ? (
                   <div>
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3 flex items-center gap-1">
                       <AlertTriangle size={12} /> รีเควสพิเศษ ({item.notes.length} กล่อง)
                     </h4>
                     <div className="space-y-2">
                       {item.notes.map((note, nIdx) => (
                         <div key={nIdx} className="bg-orange-50 border border-orange-100 p-2.5 rounded-lg">
                            <p className="text-xs font-black text-orange-800 mb-1 leading-tight">"{note.note}"</p>
                            <p className="text-[10px] font-bold text-orange-600/70">{note.memberName} (x{note.qty})</p>
                         </div>
                       ))}
                     </div>
                   </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                     <p className="text-xs font-bold text-slate-400">สูตรปกติทั้งหมด</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-8">
        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="text-blue-500" size={20} /> Live Orders (ออเดอร์หน้าร้าน/เดลิเวอรี่)
        </h3>
        {tasks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm font-bold">
            ไม่มีออเดอร์หน้าร้านที่กำลังรอ
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm font-bold">
            มีออเดอร์กำลังรอ {tasks.length} รายการ (ระบบแสดงใน KDS Order Card)
          </div>
        )}
      </div>
    </div>
  );
};
