import React, { useMemo, useEffect, useState } from 'react';
import { ChefHat, CheckCircle2, AlertTriangle, Package, UtensilsCrossed, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { useKdsStore } from '../../../store/kdsStore';

const CATEGORY_PRIORITY: Record<string, number> = {
  'ของหวาน': 1,
  'ของหวาน/ว่าง': 1,
  'สลัด': 2,
  'ซูวี': 3,
  'ซุป': 4,
  'ซุป/แกง': 4,
  'ซุป/ต้ม': 4,
  'ต้ม': 5,
  'แกง': 6,
  'แกง/ต้ม': 6,
  'เส้น': 7,
  'เมนูเส้น': 7,
  'ผัด': 8,
  'ผัดแห้ง': 8,
  'ชุดเซต/โปรโมชั่น': 9,
  'แพ็กเกจ': 9,
  'เมนูหลัก': 10,
  'อื่นๆ': 99
};

const CATEGORY_COLORS: Record<string, string> = {
  'ของหวาน': '#EC4899',
  'ของหวาน/ว่าง': '#EC4899',
  'สลัด': '#10B981',
  'ซูวี': '#6366F1',
  'ซุป': '#F59E0B',
  'ซุป/แกง': '#F59E0B',
  'ซุป/ต้ม': '#F59E0B',
  'ต้ม': '#F59E0B',
  'แกง': '#EF4444',
  'แกง/ต้ม': '#EF4444',
  'เส้น': '#8B5CF6',
  'เมนูเส้น': '#8B5CF6',
  'ผัด': '#F97316',
  'ผัดแห้ง': '#F97316',
  'เมนูหลัก': '#64748B'
};

export const TodayView: React.FC = () => {
  const memberSchedules = useKdsStore(state => state.memberSchedules);
  const loadMemberPlanner = useKdsStore(state => state.loadMemberPlanner);
  const fetchTasks = useKdsStore(state => state.fetchTasks);
  
  // Date State
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  // State for tracking completed menus with localStorage persistence
  const [completedMenus, setCompletedMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMemberPlanner(selectedDate, selectedDate);
    fetchTasks();

    // Load completed menus from localStorage for SELECTED date
    const saved = localStorage.getItem(`kds_done_${selectedDate}`);
    if (saved) {
      try {
        setCompletedMenus(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to parse saved completed menus', e);
      }
    } else {
      setCompletedMenus(new Set());
    }
  }, [selectedDate, loadMemberPlanner, fetchTasks]);

  const todayProduction = useMemo(() => {
    const todaySchedules = memberSchedules.filter(s => s.delivery_date === selectedDate);
    const grouped: Record<string, any> = {};
    let specialNotes = 0;

    const getCleanTimeLabel = (rawTime: string) => {
      if (!rawTime) return 'ไม่ระบุเวลา';
      const timeMatch = rawTime.match(/(\d{1,2})[:.](\d{2})/);
      const hour = timeMatch ? parseInt(timeMatch[1]) : -1;
      const isEvening = (hour >= 14 && hour <= 21) || rawTime.includes('เย็น') || rawTime.toLowerCase().includes('evening');
      const isMorning = (hour >= 4 && hour <= 13) || rawTime.includes('เช้า') || rawTime.toLowerCase().includes('morning');
      const cleanTime = rawTime.replace(/รอบเช้า|รอบเย็น|\(Morning\)|\(Evening\)/g, '').trim().replace(/^\(|\)$/g, '');

      if (isEvening) return `รอบเย็น (${cleanTime})`;
      if (isMorning) return `รอบเช้า (${cleanTime})`;
      return rawTime;
    };

    todaySchedules.forEach(schedule => {
      const memberData = Array.isArray(schedule.members) ? schedule.members[0] : schedule.members;
      const rawTime = (schedule.delivery_time || memberData?.delivery_time || '').trim();
      const timeLabel = getCleanTimeLabel(rawTime);
      const menuId = schedule.menu_items?.id || 'unknown';
      
      // Normalize category names
      let category = schedule.menu_items?.category || 'อื่นๆ';
      if (category.includes('ของหวาน')) category = 'ของหวาน';
      else if (category.includes('เส้น')) category = 'เส้น';
      else if (category.includes('ผัด')) category = 'ผัด';
      else if (category.includes('สลัด')) category = 'สลัด';
      else if (category.includes('ซูวี') || category.toLowerCase().includes('sous-vide')) category = 'ซูวี';
      else if (category.includes('ซุป') || category.includes('ต้ม') || category.includes('แกง')) category = 'ซุป/แกง';

      if (!grouped[timeLabel]) {
        grouped[timeLabel] = { totalRoundQty: 0, menus: {}, categoryStats: {} };
      }

      if (!grouped[timeLabel].menus[menuId]) {
        grouped[timeLabel].menus[menuId] = {
          menuName: schedule.menu_items?.name || 'ไม่ทราบชื่อเมนู',
          totalQty: 0,
          category,
          hasNotes: false,
          orders: []
        };
      }

      const memberName = memberData?.full_name || 'ไม่ระบุชื่อ';
      if (schedule.notes) {
        specialNotes++;
        grouped[timeLabel].menus[menuId].hasNotes = true;
      }

      grouped[timeLabel].totalRoundQty += schedule.quantity;
      grouped[timeLabel].menus[menuId].totalQty += schedule.quantity;
      grouped[timeLabel].menus[menuId].orders.push({
        memberName,
        qty: schedule.quantity,
        note: schedule.notes || '',
        deliveryTime: rawTime
      });

      // Update category stats
      grouped[timeLabel].categoryStats[category] = (grouped[timeLabel].categoryStats[category] || 0) + schedule.quantity;
    });

    return { groups: grouped, specialNotesCount: specialNotes };
  }, [memberSchedules, selectedDate]);

  const toggleComplete = (time: string, menuId: string) => {
    const key = `${time}-${menuId}`;
    
    setCompletedMenus(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      
      // Save to localStorage
      localStorage.setItem(`kds_done_${selectedDate}`, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const totalBoxes = useMemo(() => {
    let total = 0;
    Object.values(todayProduction.groups).forEach((group: any) => {
      total += group.totalRoundQty;
    });
    return total;
  }, [todayProduction.groups]);

  const kitchenInsight = useMemo(() => {
    if (Object.keys(todayProduction.groups).length === 0) return "วันนี้ยังไม่มีรายการผลิตที่ต้องดำเนินการ";
    const shifts = Object.entries(todayProduction.groups).sort((a: any, b: any) => b[1].totalRoundQty - a[1].totalRoundQty);
    const busiestShift = shifts[0][0];
    const totalMenus = Object.values(todayProduction.groups).reduce((acc: number, g: any) => acc + Object.keys(g.menus).length, 0);
    return `ยอดออเดอร์ทั้งหมด ${totalBoxes} กล่อง จากรายการอาหาร ${totalMenus} ชนิด โดยรอบจัดส่งที่ต้องเร่งมือที่สุดคือ ${busiestShift} (${shifts[0][1].totalRoundQty} กล่อง) ${todayProduction.specialNotesCount > 0 ? `และมีหมายเหตุแพ้อาหาร/คำขอพิเศษที่ต้องระวัง ${todayProduction.specialNotesCount} รายการ` : 'ไม่มีหมายเหตุพิเศษเพิ่มเติม'}`;
  }, [todayProduction, totalBoxes]);

  const handlePrint = () => { window.print(); };

  const changeDate = (days: number) => {
    setSelectedDate(prev => dayjs(prev).add(days, 'day').format('YYYY-MM-DD'));
  };

  const getDateLabel = () => {
    const diff = dayjs(selectedDate).diff(dayjs().startOf('day'), 'day');
    if (diff === 0) return 'วันนี้';
    if (diff === 1) return 'พรุ่งนี้';
    if (diff === -1) return 'เมื่อวาน';
    return dayjs(selectedDate).locale('th').format('dddd');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar print:bg-white print:p-0">
      
      {/* Print Header */}
      <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-4 p-8">
        <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tighter">ใบสั่งงานผลิตอาหารประจำวัน</h1>
        <div className="flex justify-between mt-6">
          <div className="space-y-1">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">วันที่จัดส่ง</p>
            <p className="text-xl font-bold text-slate-900">{dayjs(selectedDate).locale('th').format('DD MMMM YYYY')}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">ยอดผลิตรวมทั้งหมด</p>
            <p className="text-xl font-bold text-slate-900">{totalBoxes} กล่อง</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-10 space-y-8 max-w-full mx-auto print:p-0">
        
        {/* Header Section with Date Navigator */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ChefHat size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">แผนงานเตรียมอาหาร</h2>
              <p className="text-slate-500 text-xs font-semibold">รายการผลิตประจำวันที่ • {dayjs(selectedDate).locale('th').format('ddddที่ DD MMM YYYY')}</p>
            </div>
          </div>

          <div className="flex items-stretch gap-4">
            <button 
              onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
              className="px-5 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center active:scale-95"
            >
              วันนี้
            </button>

            {/* Date Switcher UI */}
            <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex items-center shadow-sm">
                <button 
                  onClick={() => changeDate(-1)}
                  className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="px-6 text-center min-w-[140px]">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">{getDateLabel()}</p>
                    <p className="text-sm font-bold text-slate-700 leading-none">{dayjs(selectedDate).locale('th').format('D MMMM YYYY')}</p>
                </div>
                <button 
                  onClick={() => changeDate(1)}
                  className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"
                >
                  <ChevronRight size={18} />
                </button>
            </div>

            <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95">
                <Printer size={16} /> พิมพ์ใบงานครัว
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Package size={20} /></div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">ยอดผลิตรวม</p>
                    <h3 className="text-xl font-bold text-slate-900">{totalBoxes} <span className="text-xs font-bold text-slate-400">กล่อง</span></h3>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0"><UtensilsCrossed size={20} /></div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">ชนิดเมนูอาหาร</p>
                    <h3 className="text-xl font-bold text-slate-900">
                        {Object.values(todayProduction.groups).reduce((acc: number, group: any) => acc + Object.keys(group.menus).length, 0)}
                        <span className="text-xs font-bold text-slate-400"> รายการ</span>
                    </h3>
                </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle size={20} /></div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">หมายเหตุแพ้อาหาร</p>
                    <h3 className="text-xl font-bold text-slate-900">{todayProduction.specialNotesCount} <span className="text-xs font-bold text-slate-400">รายการ</span></h3>
                </div>
            </div>
            <div className="bg-emerald-500 p-5 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 text-white rounded-xl flex items-center justify-center shrink-0"><CheckCircle2 size={20} /></div>
                <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-100 font-bold">สถานะ</p>
                    <h3 className="text-lg font-bold text-white italic">ระบบพร้อมทำงาน</h3>
                </div>
            </div>
        </div>

        {/* Kitchen Insights */}
        <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden shadow-xl print:border print:border-slate-900 print:text-black print:bg-white print:shadow-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl shrink-0 w-fit">
              <ChefHat size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">วิเคราะห์งานครัว (Kitchen Insights)</p>
              <p className="text-base font-semibold leading-relaxed text-slate-200 print:text-slate-800">
                {kitchenInsight}
              </p>
            </div>
          </div>
        </div>

        {/* Main List */}
        <div className="space-y-16">
            {Object.keys(todayProduction.groups).length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200 shadow-sm flex flex-col items-center">
                    <ChefHat size={60} className="text-slate-100 mb-6" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2 italic">ไม่มีรายการผลิตในวันที่เลือก</h3>
                    <p className="text-slate-400 max-w-sm font-semibold">ระบบไม่พบแผนการจัดส่งในวันที่ {dayjs(selectedDate).locale('th').format('DD MMMM YYYY')}</p>
                </div>
            ) : (
                Object.entries(todayProduction.groups)
                .sort(([a], [b]) => {
                    const getPriority = (label: string) => {
                        if (label.includes('เช้า')) return 1;
                        if (label.includes('เย็น')) return 2;
                        return 3;
                    };
                    return getPriority(a) - getPriority(b);
                })
                .map(([time, group]: [string, any]) => (
                    <section key={time} className="space-y-6 print:break-inside-avoid">
                        <div className="flex flex-col gap-4 border-b-2 border-slate-100 pb-6">
                            <div className="flex items-center gap-6">
                                <div className={`h-10 w-1.5 rounded-full ${time.includes('เย็น') ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-orange-500 shadow-lg shadow-orange-500/20'}`}></div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-slate-900 tracking-tight uppercase">รอบจัดส่ง: {time}</h3>
                                    <div className="flex items-center gap-4 mt-0.5">
                                        <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                                            <Package size={14} /> ยอดผลิตรวม {group.totalRoundQty} กล่อง
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* NEW: Shift Category Summary Chips */}
                            <div className="flex flex-wrap gap-2 ml-8 print:hidden">
                                {Object.entries(group.categoryStats)
                                    .sort((a, b) => (CATEGORY_PRIORITY[a[0]] || 99) - (CATEGORY_PRIORITY[b[0]] || 99))
                                    .map(([cat, qty]) => (
                                    <div key={cat} className="px-3 py-1 bg-white border border-slate-200 rounded-full flex items-center gap-2 shadow-sm">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#CBD5E1' }}></div>
                                        <span className="text-[10px] font-bold text-slate-500">{cat}</span>
                                        <span className="text-[11px] font-black text-slate-900">{qty as number}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Compact Grid of Menu Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {Object.entries(group.menus)
                                .sort((a: any, b: any) => (CATEGORY_PRIORITY[a[1].category] || 99) - (CATEGORY_PRIORITY[b[1].category] || 99))
                                .map(([menuId, item]: [string, any]) => {
                                    const isDone = completedMenus.has(`${time}-${menuId}`);
                                    return (
                                    <div 
                                      key={menuId} 
                                      onClick={() => toggleComplete(time, menuId)}
                                      className={`bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 group relative cursor-pointer ${isDone ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                    >
                                        
                                        {/* Prominent Category Header Bar */}
                                        <div className="h-1 w-full opacity-60" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#94A3B8' }}></div>
                                        
                                        <div className="p-3 flex flex-col gap-2.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md w-fit text-white shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[item.category] || '#94A3B8' }}>
                                                            {item.category}
                                                        </span>
                                                        {/* NEW: Special Request Indicator Icon */}
                                                        {item.hasNotes && !isDone && (
                                                            <div className="animate-bounce">
                                                                <AlertTriangle size={12} className="text-red-500 fill-red-50" />
                                                            </div>
                                                        )}
                                                        {isDone && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                    </div>
                                                    <h4 className={`text-[13px] font-medium leading-tight transition-colors line-clamp-2 ${isDone ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-emerald-600'}`}>
                                                        {item.menuName}
                                                    </h4>
                                                </div>
                                                <div className={`${isDone ? 'bg-slate-200' : 'bg-slate-900'} text-white px-2 py-1.5 rounded-xl flex flex-col items-center justify-center shrink-0 min-w-[38px] shadow-md transition-colors`}>
                                                    <span className="text-[7px] font-medium uppercase opacity-50 leading-none">QTY</span>
                                                    <span className="text-sm font-bold leading-none mt-1">{item.totalQty}</span>
                                                </div>
                                            </div>

                                            <div className="h-[0.5px] bg-slate-100"></div>

                                            <div className="overflow-y-auto custom-scrollbar max-h-[100px]">
                                                <div className="space-y-1.5">
                                                   {item.orders.map((order: any, oIdx: number) => (
                                                     <div key={oIdx} className={`px-2 py-1.5 rounded-md border border-transparent transition-all ${isDone ? 'bg-slate-50/10' : 'bg-slate-50/30 hover:border-slate-100 hover:bg-white'}`}>
                                                        <div className="flex justify-between items-center gap-2">
                                                           <span className={`text-[11px] font-medium truncate ${isDone ? 'text-slate-300' : 'text-slate-600'}`}>{order.memberName}</span>
                                                           <span className={`text-[10px] font-semibold ${isDone ? 'text-slate-200' : 'text-slate-400'}`}>x{order.qty}</span>
                                                        </div>
                                                        {order.note && (
                                                          <div className={`mt-1 flex gap-1 items-start p-1.5 rounded-md ${isDone ? 'bg-slate-50' : 'bg-amber-50/50'}`}>
                                                             <AlertTriangle size={8} className={`${isDone ? 'text-slate-300' : 'text-amber-500'} shrink-0 mt-0.5`} />
                                                             <p className={`text-[9px] font-medium leading-tight italic truncate ${isDone ? 'text-slate-300' : 'text-amber-700'}`}>
                                                               {order.note}
                                                             </p>
                                                          </div>
                                                        )}
                                                     </div>
                                                   ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-2 bg-slate-50/10 border-t border-slate-50 flex items-center justify-center">
                                            <span className={`text-[8px] font-medium uppercase tracking-widest italic ${isDone ? 'text-emerald-500' : 'text-slate-300 group-hover:text-emerald-400'}`}>
                                                {isDone ? 'FINISHED' : 'READY'}
                                            </span>
                                        </div>
                                    </div>
                                )})}
                        </div>
                    </section>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
