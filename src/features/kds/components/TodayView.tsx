import React, { useMemo, useEffect, useState } from 'react';
import { ChefHat, CheckCircle2, Clock, AlertTriangle, CalendarDays, Package, UtensilsCrossed } from 'lucide-react';
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
    
    setIsLoadingPlanned(true);
    fetchTodayMeals()
      .then(setPlannedMeals)
      .finally(() => setIsLoadingPlanned(false));
  }, [loadMemberPlanner, fetchTasks]);

  const todayProduction = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todaySchedules = memberSchedules.filter(s => s.delivery_date === todayStr);
    
    // Group by Delivery Time first, then Menu
    const grouped: Record<string, Record<string, { 
      menuName: string, 
      totalQty: number, 
      image_url?: string,
      category?: string,
      notes: { note: string, qty: number, memberName: string }[] 
    }>> = {};

    todaySchedules.forEach(schedule => {
      if (!schedule.menu_items) return;
      
      const rawTime = schedule.delivery_time || '';
      let timeLabel = 'ไม่ระบุเวลา';
      
      // Normalize to Morning/Evening based on string content
      if (rawTime.includes('เช้า') || rawTime.includes('11:00') || rawTime.toLowerCase().includes('morning')) {
        timeLabel = 'รอบเช้า (Morning)';
      } else if (rawTime.includes('เย็น') || rawTime.includes('15:00') || rawTime.toLowerCase().includes('evening')) {
        timeLabel = 'รอบเย็น (Evening)';
      } else if (rawTime) {
        timeLabel = rawTime;
      }
      
      const menuId = schedule.menu_items.id;
      
      if (!grouped[timeLabel]) grouped[timeLabel] = {};
      
      if (!grouped[timeLabel][menuId]) {
        grouped[timeLabel][menuId] = {
          menuName: schedule.menu_items.name,
          totalQty: 0,
          image_url: schedule.menu_items.image_url,
          category: schedule.menu_items.category,
          notes: []
        };
      }
      
      grouped[timeLabel][menuId].totalQty += schedule.quantity;
      if (schedule.notes) {
        grouped[timeLabel][menuId].notes.push({
           note: schedule.notes,
           qty: schedule.quantity,
           memberName: (Array.isArray(schedule.members) ? schedule.members[0]?.full_name : schedule.members?.full_name) || 'ไม่ระบุชื่อ'
        });
      }
    });

    return grouped;
  }, [memberSchedules]);

  const totalBoxes = useMemo(() => {
    let total = 0;
    Object.values(todayProduction).forEach(timeGroup => {
      Object.values(timeGroup).forEach(menu => {
        total += menu.totalQty;
      });
    });
    return total;
  }, [todayProduction]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC] custom-scrollbar">
      
      {/* Header Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-[2rem] shadow-xl shadow-emerald-200 text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <ChefHat size={24} />
            </div>
            <span className="text-xs font-normal bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">จำนวนเมนู</span>
          </div>
          <p className="text-emerald-100 text-sm font-normal uppercase tracking-widest mb-1">เมนูที่จะทำในวันนี้</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-normal tracking-tight">
              {Object.values(todayProduction).reduce((acc, curr) => acc + Object.keys(curr).length, 0)}
            </h2>
            <span className="text-emerald-100 text-sm">รายการ</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl">
              <Package size={24} />
            </div>
            <span className="text-xs font-normal text-slate-400 uppercase tracking-widest">Auto-Count</span>
          </div>
          <p className="text-slate-500 text-sm font-normal uppercase tracking-widest mb-1">จำนวนกล่องทั้งหมด</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-normal text-slate-900 tracking-tight">{totalBoxes}</h2>
            <span className="text-slate-400 text-sm">กล่อง</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-xs font-normal text-slate-400 uppercase tracking-widest">Live</span>
          </div>
          <p className="text-slate-500 text-sm font-normal uppercase tracking-widest mb-1">ออเดอร์สดวันนี้</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-normal text-slate-900 tracking-tight">{tasks.length}</h2>
            <span className="text-slate-400 text-sm">รายการ</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Meal Plans & Auto-Count */}
        <div className="lg:col-span-8 space-y-8">
          <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-xl font-normal text-slate-900 tracking-tight">รายการเตรียมอาหาร (Production List)</h3>
                  <p className="text-sm font-normal text-slate-400 mt-1">สรุปจำนวนที่ต้องทำแยกตามเมนูและรอบส่ง</p>
               </div>
               <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CalendarDays size={20} />
               </div>
            </div>

            {Object.keys(todayProduction).length === 0 ? (
               <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ChefHat size={32} className="text-slate-200" />
                  </div>
                  <h4 className="text-lg font-normal text-slate-400">ยังไม่มีแผนอาหารสำหรับวันนี้</h4>
                  <p className="text-sm text-slate-300 font-normal mt-1">กรุณาจัดแผนอาหารที่ "แผนลูกค้า" เพื่อเริ่มการผลิต</p>
               </div>
            ) : (
              Object.entries(todayProduction).sort(([a], [b]) => a.localeCompare(b)).map(([time, menus]) => (
                <div key={time} className="mb-10 last:mb-0">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-1.5 h-8 rounded-full ${time.includes('เช้า') ? 'bg-orange-400' : time.includes('เย็น') ? 'bg-blue-400' : 'bg-emerald-500'}`}></div>
                    <div>
                      <h3 className="text-xl font-normal text-slate-800 flex items-center gap-2">
                        {time}
                        {time.includes('เช้า') && <Clock size={18} className="text-orange-400" />}
                        {time.includes('เย็น') && <Clock size={18} className="text-blue-400" />}
                      </h3>
                      <p className="text-xs text-slate-400 font-normal uppercase tracking-widest mt-1">
                        {Object.values(menus).length} รายการเมนู
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.values(menus).map((item, idx) => (
                      <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col group">
                        <div className="p-6 pb-4 flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                             <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-slate-400 block mb-2">{item.category || 'MAIN DISH'}</span>
                             <h3 className="text-lg font-normal text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors">{item.menuName}</h3>
                          </div>
                          <div className="bg-emerald-500 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                            <span className="text-xl font-normal leading-none">{item.totalQty}</span>
                            <span className="text-[8px] uppercase tracking-tighter opacity-80 mt-1">กล่อง</span>
                          </div>
                        </div>
                        
                        <div className="px-6 pb-6 mt-auto">
                          {item.notes.length > 0 ? (
                             <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-4">
                               <div className="flex items-center gap-2 mb-3">
                                 <div className="p-1 bg-orange-100 text-orange-500 rounded-lg">
                                   <AlertTriangle size={12} />
                                 </div>
                                 <span className="text-[10px] font-normal uppercase tracking-widest text-orange-600">หมายเหตุจากลูกค้า ({item.notes.length})</span>
                               </div>
                               <div className="space-y-2">
                                 {item.notes.map((note, nIdx) => (
                                   <div key={nIdx} className="flex gap-2 items-start">
                                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0"></div>
                                      <div>
                                        <p className="text-xs font-normal text-orange-800 leading-relaxed italic">"{note.note}"</p>
                                        <p className="text-[10px] text-orange-600/60 font-normal mt-0.5">โดย {note.memberName} (x{note.qty})</p>
                                      </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-300 text-xs font-normal py-2 justify-center border border-dashed border-slate-100 rounded-2xl">
                               <CheckCircle2 size={12} /> ไม่มีหมายเหตุพิเศษสำหรับเมนูนี้
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Right Column: Live Orders & Side Info */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-normal text-slate-800 mb-6 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
              ออเดอร์สด (Live Orders)
            </h3>
            
            {tasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Clock size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-normal text-slate-400">ไม่มีออเดอร์ที่กำลังดำเนินการในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl flex items-center gap-4">
                   <div className="p-3 bg-white rounded-xl text-purple-500 shadow-sm">
                     <UtensilsCrossed size={18} />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-normal text-purple-900">กำลังทำออเดอร์สด</p>
                     <p className="text-xs text-purple-600 font-normal">{tasks.length} รายการที่ต้องส่งมอบในวันนี้</p>
                   </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 font-normal px-4">
                  ดูรายละเอียดและจัดการสถานะได้ที่หน้า KDS Live (Order Card)
                </p>
              </div>
            )}
          </section>

          <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
             <h4 className="text-xs font-normal uppercase tracking-[0.3em] text-emerald-400 mb-4">Production Summary</h4>
             <p className="text-slate-300 text-sm font-normal leading-relaxed mb-6">
               จำนวนเมนูทั้งหมดที่ต้องเตรียมสำหรับวันนี้คือ {totalBoxes} กล่อง โดยแบ่งตามรอบส่งที่ลูกค้าเลือกไว้ในระบบ
             </p>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-normal">
                   <span className="text-slate-400">ความคืบหน้าการผลิต</span>
                   <span className="text-emerald-400 flex items-center gap-1">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                     กำลังดำเนินการ
                   </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                   <div className="bg-emerald-500 h-full rounded-full" style={{ width: totalBoxes > 0 ? '45%' : '0%' }}></div>
                </div>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};
