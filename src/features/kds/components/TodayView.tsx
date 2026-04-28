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
        orders: { memberName: string, qty: number, note: string, deliveryTime?: string }[] 
      }>>
    }> = {};

    todaySchedules.forEach(schedule => {
      if (!schedule.menu_items) return;
      
      const memberData = Array.isArray(schedule.members) ? schedule.members[0] : schedule.members;
      const rawTime = (schedule.delivery_time || memberData?.delivery_time || '').trim();
      let timeLabel = 'ไม่ระบุเวลา';
      
      if (rawTime) {
        // Detect shifts but keep the original time info
        const isMorning = rawTime.includes('เช้า') || /([0-9]|1[0-1])[:.]\d{2}/.test(rawTime) || rawTime.toLowerCase().includes('morning');
        const isEvening = rawTime.includes('เย็น') || /(1[2-9]|2[0-3])[:.]\d{2}/.test(rawTime) || rawTime.toLowerCase().includes('evening');

        if (isMorning && !rawTime.includes('เช้า')) {
          timeLabel = `รอบเช้า (${rawTime})`;
        } else if (isEvening && !rawTime.includes('เย็น')) {
          timeLabel = `รอบเย็น (${rawTime})`;
        } else {
          timeLabel = rawTime;
        }
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
          orders: []
        };
      }
      
      const memberName = (Array.isArray(schedule.members) ? schedule.members[0]?.full_name : schedule.members?.full_name) || 'ไม่ระบุชื่อ';
      
      grouped[timeLabel].totalRoundQty += schedule.quantity;
      grouped[timeLabel].categories[category][menuId].totalQty += schedule.quantity;
      grouped[timeLabel].categories[category][menuId].orders.push({
        memberName,
        qty: schedule.quantity,
        note: schedule.notes || '',
        deliveryTime: rawTime
      });
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
    <div className="flex-1 overflow-y-auto bg-[#F1F5F9] custom-scrollbar print:bg-white print:p-0">
      
      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4 p-8">
        <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Production Worksheet</h1>
        <div className="flex justify-between mt-4">
          <div>
            <p className="text-slate-500 text-xs uppercase font-bold">Date</p>
            <p className="text-lg font-semibold">{dayjs().format('DD MMMM YYYY')}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs uppercase font-bold">Total Output</p>
            <p className="text-lg font-semibold">{totalBoxes} Boxes</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto print:p-0 print:max-w-none">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <ChefHat className="text-emerald-500" size={28} />
              การเตรียมอาหารวันนี้
            </h2>
            <p className="text-slate-500 text-sm mt-1">สรุปรายการผลิตและจัดส่งประจำวันที่ {dayjs().format('DD/MM/YYYY')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <Printer size={18} /> พิมพ์ใบงาน
            </button>
            <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>
            <div className="flex -space-x-2 overflow-hidden">
               {/* Decorative avatars representing "international" feel */}
               <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700 uppercase">K</div>
               <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 uppercase">D</div>
               <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-700 uppercase">S</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Package size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Production</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalBoxes} <span className="text-sm font-normal text-slate-400">กล่อง</span></h3>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Unique Menus</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {Object.values(todayProduction).reduce((acc, group) => {
                  let count = 0;
                  Object.values(group.categories).forEach(cat => count += Object.keys(cat).length);
                  return acc + count;
                }, 0)}
                <span className="text-sm font-normal text-slate-400"> รายการ</span>
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Live Orders</p>
              <h3 className="text-2xl font-bold text-slate-900">{tasks.length} <span className="text-sm font-normal text-slate-400">ออเดอร์</span></h3>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl shadow-lg flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform"></div>
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold">Status</p>
              <h3 className="text-xl font-bold text-white">System Ready</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Production Sections */}
          <div className="lg:col-span-9 space-y-12 print:col-span-12">
            
            {Object.keys(todayProduction).length === 0 ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-slate-200 shadow-sm flex flex-col items-center print:border-none print:shadow-none">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <ChefHat size={48} className="text-slate-200" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No Production Planned</h3>
                <p className="text-slate-400 max-w-sm">ไม่พบข้อมูลการจัดส่งในวันนี้ กรุณาตรวจสอบแผนการจัดส่งในเมนู "แผนลูกค้า"</p>
              </div>
            ) : (
              Object.entries(todayProduction)
                .sort(([a], [b]) => (TIME_PRIORITY[a] || 99) - (TIME_PRIORITY[b] || 99))
                .map(([time, group]) => (
                <section key={time} className="space-y-6 print:break-inside-avoid print:mt-10">
                  <div className="flex items-end justify-between border-b border-slate-200 pb-4 mb-2 print:border-slate-900">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-10 rounded-full ${time.toLowerCase().includes('เช้า') || time.toLowerCase().includes('morning') ? 'bg-orange-500 shadow-lg shadow-orange-200' : time.toLowerCase().includes('เย็น') || time.toLowerCase().includes('evening') ? 'bg-indigo-500 shadow-lg shadow-indigo-200' : 'bg-emerald-500 shadow-lg shadow-emerald-200'}`}></div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3 print:text-3xl">
                          {time}
                          <span className="text-sm font-normal text-slate-400 px-3 py-1 bg-slate-100 rounded-full print:hidden">รอบการผลิต</span>
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium print:text-slate-700">จำนวนรวมทั้งสิ้น {group.totalRoundQty} กล่อง</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    {Object.entries(group.categories).map(([category, menus]) => (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm print:text-slate-900 print:border-none print:shadow-none">{category}</h4>
                          <div className="flex-1 h-[1px] bg-slate-200 print:bg-slate-300"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-1">
                          {Object.values(menus).map((item, idx) => (
                            <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-all group print:border-slate-300 print:shadow-none print:rounded-none">
                              {/* Menu Card Header */}
                              <div className="p-5 border-b border-slate-50 flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors print:text-xl">{item.menuName}</h3>
                                  <div className="flex items-center gap-2 mt-2">
                                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Qty:</span>
                                     <span className="text-sm font-bold text-slate-900">{item.totalQty}</span>
                                     <span className="text-[10px] text-slate-300 uppercase font-bold">Boxes</span>
                                  </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-all">
                                  <UtensilsCrossed size={20} />
                                </div>
                              </div>

                              {/* Members List (Customer Names) */}
                              <div className="bg-slate-50/50 p-4 flex-1 space-y-3">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                   <CalendarDays size={12} className="text-slate-300" />
                                   Customer Assignments
                                 </p>
                                 <div className="space-y-2">
                                    {item.orders.map((order, oIdx) => (
                                      <div key={oIdx} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1 print:border-slate-200">
                                         <div className="flex justify-between items-center gap-2">
                                            <span className="text-xs font-bold text-slate-700 truncate">{order.memberName}</span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                               {order.deliveryTime && (
                                                 <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1">
                                                   <Clock size={10} /> {order.deliveryTime}
                                                 </span>
                                               )}
                                               <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">x{order.qty}</span>
                                            </div>
                                         </div>
                                         {order.note && (
                                           <div className="mt-1 flex gap-2 items-start">
                                              <div className="p-1 bg-amber-50 text-amber-500 rounded-md shrink-0">
                                                <AlertTriangle size={10} />
                                              </div>
                                              <p className="text-[10px] text-amber-700 font-medium leading-normal italic">
                                                "{order.note}"
                                              </p>
                                           </div>
                                         )}
                                      </div>
                                    ))}
                                 </div>
                              </div>

                              {/* Card Footer */}
                              <div className="p-3 bg-white border-t border-slate-50 flex items-center justify-center">
                                 <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-emerald-300 transition-colors">Verified for Production</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* Right Sidebar: Live Tasks & Summary */}
          <aside className="lg:col-span-3 space-y-6 print:hidden">
             
             {/* Live Orders Card */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    ออเดอร์สด (Live Tasks)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Real-time requests</p>
                </div>
                
                <div className="p-6 space-y-4">
                  {tasks.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package size={20} className="text-slate-200" />
                      </div>
                      <p className="text-xs font-medium text-slate-400">ยังไม่มีออเดอร์ใหม่</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       {tasks.map((task, tidx) => (
                         <div key={tidx} className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-3">
                            <div className="w-8 h-8 bg-white text-purple-500 rounded-lg flex items-center justify-center shadow-sm shrink-0">
                               <UtensilsCrossed size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                               <p className="text-[11px] font-bold text-purple-900 truncate">{task.menu_name}</p>
                               <p className="text-[9px] text-purple-500 font-bold uppercase">{task.order_id}</p>
                            </div>
                         </div>
                       ))}
                       <p className="text-[10px] text-center text-slate-400 mt-4 italic">
                         จัดเตรียมและส่งมอบตามคิว
                       </p>
                    </div>
                  )}
                </div>
             </div>

             {/* Production Insight Card */}
             <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full"></div>
                <div className="relative z-10">
                   <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-4">Production Summary</h4>
                   <p className="text-slate-400 text-[11px] leading-relaxed mb-6 font-medium">
                     ยอดรวมแผนผลิตอาหารในวันนี้ คือ <span className="text-white font-bold">{totalBoxes} กล่อง</span> ระบบจะแสดงผลแยกตามรอบส่งอัตโนมัติ
                   </p>
                   
                   <div className="space-y-5">
                      <div>
                         <div className="flex justify-between items-center text-[10px] mb-2 font-bold">
                            <span className="text-slate-500 uppercase tracking-tighter">Manufacturing Progress</span>
                            <span className="text-emerald-400">ACTIVE</span>
                         </div>
                         <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden shadow-inner">
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full" style={{ width: totalBoxes > 0 ? '60%' : '0%' }}></div>
                         </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                           <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                              <AlertTriangle size={14} />
                           </div>
                           <p className="text-[9px] text-slate-300 font-medium leading-normal">
                             กรุณาตรวจสอบ "หมายเหตุจากลูกค้า" เสมอก่อนเริ่มทำการผลิต
                           </p>
                        </div>
                      </div>
                   </div>
                </div>
             </div>

          </aside>
        </div>
      </div>
    </div>
  );
};
