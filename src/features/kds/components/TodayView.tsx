import React, { useMemo, useEffect } from 'react';
import { ChefHat, CheckCircle2, Clock, AlertTriangle, CalendarDays, Package, UtensilsCrossed, Printer } from 'lucide-react';
import dayjs from 'dayjs';
import { useKdsStore } from '../../../store/kdsStore';

const TIME_PRIORITY: Record<string, number> = {
  'รอบเช้า (Morning)': 1,
  'รอบเย็น (Evening)': 2,
  'ไม่ระบุเวลา': 3
};

export const TodayView: React.FC = () => {
  const memberSchedules = useKdsStore(state => state.memberSchedules);
  const loadMemberPlanner = useKdsStore(state => state.loadMemberPlanner);
  const tasks = useKdsStore(state => state.tasks);
  const fetchTasks = useKdsStore(state => state.fetchTasks);
  

  useEffect(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    loadMemberPlanner(todayStr, todayStr);
    fetchTasks(); 
  }, [loadMemberPlanner, fetchTasks]);

  const todayProduction = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todaySchedules = memberSchedules.filter(s => s.delivery_date === todayStr);
    
    // Group by Delivery Time -> Category -> Menu
    const grouped: Record<string, {
      totalRoundQty: number,
      categories: Record<string, Record<string, { 
        menuName: string, 
        totalQty: number, 
        image_url?: string,
        category?: string,
        notes: { note: string, qty: number, memberName: string }[] 
      }>>
    }> = {};

    todaySchedules.forEach(schedule => {
      if (!schedule.menu_items) return;
      
      const rawTime = schedule.delivery_time || '';
      let timeLabel = 'ไม่ระบุเวลา';
      
      if (rawTime.includes('เช้า') || rawTime.includes('11:00') || rawTime.toLowerCase().includes('morning')) {
        timeLabel = 'รอบเช้า (Morning)';
      } else if (rawTime.includes('เย็น') || rawTime.includes('15:00') || rawTime.toLowerCase().includes('evening')) {
        timeLabel = 'รอบเย็น (Evening)';
      } else if (rawTime) {
        timeLabel = rawTime;
      }
      
      if (!grouped[timeLabel]) {
        grouped[timeLabel] = { totalRoundQty: 0, categories: {} };
      }
      
      const category = schedule.menu_items.category || 'อื่นๆ';
      if (!grouped[timeLabel].categories[category]) {
        grouped[timeLabel].categories[category] = {};
      }
      
      const menuId = schedule.menu_items.id;
      if (!grouped[timeLabel].categories[category][menuId]) {
        grouped[timeLabel].categories[category][menuId] = {
          menuName: schedule.menu_items.name,
          totalQty: 0,
          image_url: schedule.menu_items.image_url,
          category: schedule.menu_items.category,
          notes: []
        };
      }
      
      grouped[timeLabel].categories[category][menuId].totalQty += schedule.quantity;
      grouped[timeLabel].totalRoundQty += schedule.quantity;

      if (schedule.notes) {
        grouped[timeLabel].categories[category][menuId].notes.push({
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
    Object.values(todayProduction).forEach(group => {
      total += group.totalRoundQty;
    });
    return total;
  }, [todayProduction]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F8FAFC] custom-scrollbar print:bg-white print:p-0">
      
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
        <h1 className="text-3xl font-bold text-slate-900">รายการเตรียมอาหาร (Production Sheet)</h1>
        <p className="text-slate-600 mt-2">ประจำวันที่: {dayjs().format('DD/MM/YYYY')}</p>
        <p className="text-slate-600">จำนวนทั้งหมด: {totalBoxes} กล่อง</p>
      </div>

      {/* Header Stats Bar - Hidden on Print */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 print:hidden">
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
              {Object.values(todayProduction).reduce((acc, group) => {
                let count = 0;
                Object.values(group.categories).forEach(cat => count += Object.keys(cat).length);
                return acc + count;
              }, 0)}
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
        <div className="lg:col-span-8 space-y-8 print:col-span-12">
          <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-0">
            <div className="flex items-center justify-between mb-8 print:hidden">
               <div>
                  <h3 className="text-xl font-normal text-slate-900 tracking-tight">รายการเตรียมอาหาร (Production List)</h3>
                  <p className="text-sm font-normal text-slate-400 mt-1">สรุปจำนวนที่ต้องทำแยกตามเมนูและรอบส่ง</p>
               </div>
               <div className="flex gap-2">
                 <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-normal transition-all"
                 >
                   <Printer size={18} /> พิมพ์ใบงาน
                 </button>
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <CalendarDays size={20} />
                 </div>
               </div>
            </div>

            {Object.keys(todayProduction).length === 0 ? (
               <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 print:hidden">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ChefHat size={32} className="text-slate-200" />
                  </div>
                  <h4 className="text-lg font-normal text-slate-400">ยังไม่มีแผนอาหารสำหรับวันนี้</h4>
                  <p className="text-sm text-slate-300 font-normal mt-1">กรุณาจัดแผนอาหารที่ "แผนลูกค้า" เพื่อเริ่มการผลิต</p>
               </div>
            ) : (
              Object.entries(todayProduction)
                .sort(([a], [b]) => (TIME_PRIORITY[a] || 99) - (TIME_PRIORITY[b] || 99))
                .map(([time, group]) => (
                <div key={time} className="mb-12 last:mb-0 print:break-inside-avoid print:mb-8">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4 print:border-slate-900">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-8 rounded-full print:hidden ${time.includes('เช้า') ? 'bg-orange-400' : time.includes('เย็น') ? 'bg-blue-400' : 'bg-emerald-500'}`}></div>
                      <div>
                        <h3 className="text-xl font-normal text-slate-800 flex items-center gap-2 print:text-2xl print:font-bold">
                          {time}
                          {time.includes('เช้า') && <Clock size={18} className="text-orange-400 print:hidden" />}
                          {time.includes('เย็น') && <Clock size={18} className="text-blue-400 print:hidden" />}
                        </h3>
                        <p className="text-xs text-slate-400 font-normal uppercase tracking-widest mt-1 print:text-slate-600">
                          {Object.keys(group.categories).length} หมวดหมู่
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-100 px-4 py-2 rounded-2xl print:bg-transparent print:p-0">
                       <span className="text-xs font-normal text-slate-500 uppercase tracking-tighter block print:text-slate-900">ยอดรวมรอบนี้</span>
                       <span className="text-lg font-normal text-slate-900 print:text-xl print:font-bold">{group.totalRoundQty} กล่อง</span>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    {Object.entries(group.categories).map(([category, menus]) => (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-emerald-500 rounded-full print:hidden"></div>
                           <h4 className="text-xs font-normal uppercase tracking-[0.2em] text-emerald-600 print:text-sm print:font-bold print:text-slate-900">{category}</h4>
                           <div className="flex-1 h-[1px] bg-emerald-100 print:bg-slate-300"></div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-1">
                          {Object.values(menus).map((item, idx) => (
                            <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col group print:rounded-none print:border-b print:border-slate-200 print:shadow-none print:pb-4">
                              <div className="p-6 pb-4 flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                   <h3 className="text-lg font-normal text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors print:text-xl print:font-semibold">{item.menuName}</h3>
                                </div>
                                <div className="bg-emerald-500 text-white w-14 h-14 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-emerald-200 shrink-0 print:bg-white print:text-slate-900 print:border print:border-slate-900 print:shadow-none">
                                  <span className="text-xl font-normal leading-none print:font-bold">{item.totalQty}</span>
                                  <span className="text-[8px] uppercase tracking-tighter opacity-80 mt-1 print:opacity-100">กล่อง</span>
                                </div>
                              </div>
                              
                              <div className="px-6 pb-6 mt-auto">
                                {item.notes.length > 0 ? (
                                   <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-4 print:bg-white print:border-slate-300 print:rounded-none">
                                     <div className="flex items-center gap-2 mb-3">
                                       <div className="p-1 bg-orange-100 text-orange-500 rounded-lg print:hidden">
                                         <AlertTriangle size={12} />
                                       </div>
                                       <span className="text-[10px] font-normal uppercase tracking-widest text-orange-600 print:text-slate-900">หมายเหตุจากลูกค้า ({item.notes.length})</span>
                                     </div>
                                     <div className="space-y-2">
                                       {item.notes.map((note, nIdx) => (
                                         <div key={nIdx} className="flex gap-2 items-start">
                                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0 print:bg-slate-900"></div>
                                            <div>
                                              <p className="text-xs font-normal text-orange-800 leading-relaxed italic print:text-slate-900">"{note.note}"</p>
                                              <p className="text-[10px] text-orange-600/60 font-normal mt-0.5 print:text-slate-500">โดย {note.memberName} (x{note.qty})</p>
                                            </div>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-300 text-xs font-normal py-2 justify-center border border-dashed border-slate-100 rounded-2xl print:hidden">
                                     <CheckCircle2 size={12} /> ไม่มีหมายเหตุพิเศษสำหรับเมนูนี้
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>

        {/* Right Column: Live Orders & Side Info - Hidden on Print */}
        <div className="lg:col-span-4 space-y-8 print:hidden">
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
