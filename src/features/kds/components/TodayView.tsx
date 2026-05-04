import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, AlertTriangle, Package, UtensilsCrossed, ChevronLeft, ChevronRight, X, Printer, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import { useKdsStore } from '../../../store/kdsStore';
import { useAuthStore } from '../../../store/authStore';
import { closeKitchenSession, updateSchedulesKitchenStatus, updateOrdersKitchenStatus } from '../api';
import { supabase } from '../../../config/supabase';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { cn, isUUID } from '../../../lib/utils';
import type { MemberMealSchedule, KdsTask } from '../../../types';


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
  'ของหวาน': '#E11D48', // rose-600
  'ของหวาน/ว่าง': '#E11D48',
  'สลัด': '#10B981', // emerald-500
  'ซูวี': '#4F46E5', // indigo-600
  'ซุป': '#0D9488', // teal-600
  'ซุป/แกง': '#0D9488',
  'ซุป/ต้ม': '#0D9488',
  'ต้ม': '#0D9488',
  'แกง': '#0D9488',
  'แกง/ต้ม': '#0D9488',
  'เส้น': '#D97706', // amber-600
  'เมนูเส้น': '#D97706',
  'ผัด': '#EA580C', // orange-600
  'ผัดแห้ง': '#EA580C',
  'เมนูหลัก': '#475569' // slate-600
};

export const TodayView: React.FC = () => {
  const memberSchedules = useKdsStore(state => state.memberSchedules);
  const tasks = useKdsStore(state => state.tasks);
  const loadMemberPlanner = useKdsStore(state => state.loadMemberPlanner);
  const fetchTasks = useKdsStore(state => state.fetchTasks);
  const menus = useKdsStore(state => state.menus);
  
  const [parent] = useAutoAnimate();
  
  const [filterType, setFilterType] = useState<'all' | 'member' | 'retail' | 'extra' | 'menu'>('all');

  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));


  useEffect(() => {
    loadMemberPlanner(selectedDate, selectedDate);
    fetchTasks();

    const schedulesChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'erp_member_meal_schedules' },
        () => { loadMemberPlanner(selectedDate, selectedDate); }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => { fetchTasks(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(schedulesChannel);
    };
  }, [selectedDate]);

  const todayProduction = useMemo(() => {
    const todaySchedules = memberSchedules.filter(s => {
      if (s.delivery_date !== selectedDate) return false;
      if (filterType === 'member') return !s.is_extra_order;
      if (filterType === 'extra') return s.is_extra_order;
      if (filterType === 'retail') return false;
      return true;
    });

    
    const todayTasks = tasks.filter(t => {
      if (filterType === 'member' || filterType === 'extra') return false;
      return dayjs(t.created_at).format('YYYY-MM-DD') === selectedDate;
    });

    const grouped: Record<string, any> = {};
    let specialNotes = 0;

    const getCleanTimeLabel = (rawTime: string) => {
      if (!rawTime) return 'ออเดอร์สั่งด่วน (Retail)';
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
      const memberName = memberData?.full_name || 'ไม่ระบุชื่อ';
      const menuName = schedule.menu_items?.name || 'ไม่ทราบชื่อเมนู';
      const groupKey = filterType === 'menu' ? menuName : memberName;
      
      let category = schedule.menu_items?.category || 'อื่นๆ';
      // ... (category simplification logic)
      if (category.includes('ของหวาน')) category = 'ของหวาน';
      else if (category.includes('เส้น')) category = 'เส้น';
      else if (category.includes('ผัด')) category = 'ผัด';
      else if (category.includes('สลัด')) category = 'สลัด';
      else if (category.includes('ซูวี')) category = 'ซูวี';
      else if (category.includes('ซุป') || category.includes('ต้ม') || category.includes('แกง')) category = 'ซุป/แกง';

      if (!grouped[timeLabel]) {
        grouped[timeLabel] = { totalRoundQty: 0, members: {}, categoryStats: {} };
      }

      if (!grouped[timeLabel].members[groupKey]) {
        grouped[timeLabel].members[groupKey] = {
          memberName: groupKey,
          totalQty: 0,
          totalKcal: 0,
          totalP: 0,
          totalC: 0,
          totalF: 0,
          hasNotes: false,
          hasExtraOrder: false,
          orders: []
        };
      }


      if (schedule.notes) {
        specialNotes++;
        grouped[timeLabel].members[groupKey].hasNotes = true;
      }


      if (schedule.is_extra_order) {
        grouped[timeLabel].members[groupKey].hasExtraOrder = true;
      }

      grouped[timeLabel].totalRoundQty += schedule.quantity;
      grouped[timeLabel].members[groupKey].totalQty += schedule.quantity;

      
      let kcal = schedule.menu_items?.calories || 0;
      let protein = schedule.menu_items?.protein || 0;
      let carbs = schedule.menu_items?.carbs || 0;
      let fat = schedule.menu_items?.fat || 0;

      if (schedule.notes?.includes('[ไม่รับข้าว]')) {
        kcal -= 108;
        carbs -= 23;
      }

      // Ensure values are not negative
      kcal = Math.max(0, kcal);
      carbs = Math.max(0, carbs);
      protein = Math.max(0, protein);
      fat = Math.max(0, fat);

      grouped[timeLabel].members[groupKey].totalKcal += (kcal * schedule.quantity);
      grouped[timeLabel].members[groupKey].totalP += (protein * schedule.quantity);
      grouped[timeLabel].members[groupKey].totalC += (carbs * schedule.quantity);
      grouped[timeLabel].members[groupKey].totalF += (fat * schedule.quantity);

      grouped[timeLabel].members[groupKey].orders.push({
        id: schedule.id,
        menuId: schedule.menu_items?.id,
        menuName: filterType === 'menu' ? memberName : menuName,
        category,

        qty: schedule.quantity,
        note: schedule.notes || '',
        deliveryTime: rawTime,
        type: 'member',
        status: schedule.kitchen_status,
        isExtra: schedule.is_extra_order || false,
        createdAt: schedule.created_at || '',
        kcal,
        macros: `P:${protein} C:${carbs} F:${fat}`
      });

      grouped[timeLabel].categoryStats[category] = (grouped[timeLabel].categoryStats[category] || 0) + schedule.quantity;
    });

    todayTasks.forEach(task => {
      const timeLabel = 'ออเดอร์สั่งด่วน (Retail)';
      const memberName = 'ลูกค้ารายย่อย';
      const menuNameRaw = task.menu_name || '';
      const cleanTaskName = menuNameRaw.replace(/\(x\d+\)/g, '').trim();
      const matchedMenu = menus.find(m => m.name.trim() === cleanTaskName) || 
                          menus.find(m => cleanTaskName.includes(m.name.trim()));
      
      const menuId = matchedMenu?.id || `retail_${task.id}`;
      const category = matchedMenu?.category || 'รายย่อย';

      if (!grouped[timeLabel]) {
        grouped[timeLabel] = { totalRoundQty: 0, members: {}, categoryStats: {} };
      }

      const qtyMatch = menuNameRaw.match(/\(x(\d+)\)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const groupKey = filterType === 'menu' ? (matchedMenu?.name || menuNameRaw) : memberName;


      if (!grouped[timeLabel].members[groupKey]) {
        grouped[timeLabel].members[groupKey] = {
          memberName: groupKey,
          totalQty: 0,
          hasNotes: false,
          isRetail: true,
          orders: []
        };
      }

      grouped[timeLabel].totalRoundQty += qty;
      grouped[timeLabel].members[groupKey].totalQty += qty;


      const kcal = Math.max(0, matchedMenu?.calories || 0);
      const protein = Math.max(0, matchedMenu?.protein || 0);
      const carbs = Math.max(0, matchedMenu?.carbs || 0);
      const fat = Math.max(0, matchedMenu?.fat || 0);

      grouped[timeLabel].members[groupKey].totalKcal += (kcal * qty);
      grouped[timeLabel].members[groupKey].totalP += (protein * qty);
      grouped[timeLabel].members[groupKey].totalC += (carbs * qty);
      grouped[timeLabel].members[groupKey].totalF += (fat * qty);

      grouped[timeLabel].members[groupKey].orders.push({
        id: task.id,
        menuId,
        menuName: filterType === 'menu' ? memberName : (matchedMenu?.name || menuNameRaw),
        category,

        qty: qty,
        note: '',
        type: 'retail',
        status: task.kitchen_status,
        createdAt: task.created_at,
        isRetail: true,
        kcal,
        macros: `P:${protein} C:${carbs} F:${fat}`
      });

      grouped[timeLabel].categoryStats[category] = (grouped[timeLabel].categoryStats[category] || 0) + qty;
    });

    return { groups: grouped, specialNotesCount: specialNotes };
  }, [memberSchedules, tasks, menus, selectedDate, filterType]);

  const toggleComplete = async (_time: string, _memberId: string, item: any) => {
    const isCurrentlyDone = item.orders.every((o: any) => 
      o.status === 'ready' || o.status === 'done' || o.status === 'เสร็จสิ้น'
    );
    
    const newMemberStatus = isCurrentlyDone ? 'pending' : 'done';
    const newRetailStatus = isCurrentlyDone ? 'ยืนยันแล้ว' : 'เสร็จสิ้น';



    const memberOrderIds = item.orders
      .filter((o: any) => o.type === 'member' && isUUID(o.id))
      .map((o: any) => o.id);
    
    const retailOrderIds = item.orders
      .filter((o: any) => o.type === 'retail' && isUUID(o.id))
      .map((o: any) => o.id);

    // --- Optimistic Update ---
    const store = useKdsStore.getState();
    const newSchedules = store.memberSchedules.map(s => {
      if (memberOrderIds.includes(s.id)) return { ...s, kitchen_status: newMemberStatus };
      return s;
    });
    const newTasks = store.tasks.map(t => {
      if (retailOrderIds.includes(t.id)) return { ...t, kitchen_status: newRetailStatus };
      return t;
    });
    useKdsStore.setState({ 
      memberSchedules: newSchedules as MemberMealSchedule[], 
      tasks: newTasks as KdsTask[] 
    });
    // --------------------------

    try {
      const promises = [];
      if (memberOrderIds.length > 0) promises.push(updateSchedulesKitchenStatus(memberOrderIds, newMemberStatus));
      if (retailOrderIds.length > 0) promises.push(updateOrdersKitchenStatus(retailOrderIds, newRetailStatus));
      
      await Promise.all(promises);
      
      // Update data in background
      loadMemberPlanner(selectedDate, selectedDate, undefined, true);
      fetchTasks(true);

      if (!isCurrentlyDone) {
        const user = useAuthStore.getState().user;
        
        // Group orders by menuId to update sessions
        const menuQuantities: Record<string, number> = {};
        item.orders.forEach((o: any) => {
          if (o.menuId && isUUID(o.menuId)) {
            menuQuantities[o.menuId] = (menuQuantities[o.menuId] || 0) + o.qty;
          }
        });

        for (const [realMenuId, qty] of Object.entries(menuQuantities)) {
          const { data: session } = await supabase
            .from('erp_kitchen_sessions')
            .select('id')
            .eq('session_date', selectedDate)
            .eq('menu_item_id', realMenuId)
            .maybeSingle();

          let targetSessionId = session?.id;

          if (!targetSessionId) {
            const { data: newSession } = await supabase
              .from('erp_kitchen_sessions')
              .insert({
                session_date: selectedDate,
                menu_item_id: realMenuId,
                planned_qty: qty
              })
              .select()
              .single();
            if (newSession) targetSessionId = newSession.id;
          }

          if (targetSessionId) {
            await closeKitchenSession({
              sessionId: targetSessionId,
              actualQty: qty,
              currentStaffId: user?.id
            });
          }
        }
        useKdsStore.getState().loadMasterData(true);
      }

      toast.success(isCurrentlyDone ? 'ยกเลิกสถานะสำเร็จ' : 'บันทึกสถานะเสร็จสิ้น', {
        description: !isCurrentlyDone ? `จัดเตรียมอาหารของ ${item.memberName} เรียบร้อยแล้ว` : undefined,
      });
    } catch (error: any) {

      console.error('Toggle status error:', error);
      Swal.fire('Error', 'ไม่สามารถเปลี่ยนสถานะได้: ' + error.message, 'error');
    }
  };

  const toggleSingleItem = async (order: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyDone = order.status === 'ready' || order.status === 'done' || order.status === 'เสร็จสิ้น';
    const newStatus = order.type === 'member' 
      ? (isCurrentlyDone ? 'pending' : 'done')
      : (isCurrentlyDone ? 'ยืนยันแล้ว' : 'เสร็จสิ้น');

    // --- Optimistic Update ---
    const store = useKdsStore.getState();
    if (order.type === 'member') {
      const newSchedules = store.memberSchedules.map(s => 
        s.id === order.id ? { ...s, kitchen_status: newStatus as 'done' | 'pending' | 'cooking' } : s
      );
      useKdsStore.setState({ memberSchedules: newSchedules as MemberMealSchedule[] });
    } else {
      const newTasks = store.tasks.map(t => 
        t.id === order.id ? { ...t, kitchen_status: newStatus } : t
      );
      useKdsStore.setState({ tasks: newTasks as KdsTask[] });
    }
    // --------------------------

    try {
      if (order.type === 'member') {
        await updateSchedulesKitchenStatus([order.id], newStatus);
      } else {
        await updateOrdersKitchenStatus([order.id], newStatus);
      }
      
      if (!isCurrentlyDone && order.menuId) {
        const user = useAuthStore.getState().user;

        
        if (isUUID(order.menuId)) {
          const { data: session } = await supabase
            .from('erp_kitchen_sessions')
            .select('id')
            .eq('session_date', selectedDate)
            .eq('menu_item_id', order.menuId)
            .maybeSingle();

          let targetSessionId = session?.id;
          if (!targetSessionId) {
            const { data: newSession } = await supabase
              .from('erp_kitchen_sessions')
              .insert({ session_date: selectedDate, menu_item_id: order.menuId, planned_qty: order.qty })
              .select().single();
            if (newSession) targetSessionId = newSession.id;
          }

          if (targetSessionId) {
            await closeKitchenSession({ sessionId: targetSessionId, actualQty: order.qty, currentStaffId: user?.id });
          }
        }
      }

      loadMemberPlanner(selectedDate, selectedDate, undefined, true);
      fetchTasks(true);
      useKdsStore.getState().loadMasterData(true);
    } catch (error: any) {
      console.error('Toggle single item error:', error);
      Swal.fire('Error', 'ไม่สามารถเปลี่ยนสถานะได้: ' + error.message, 'error');
    }
  };

  const handleToggleClick = async (time: string, memberName: string, item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyDone = item.orders.every((o: any) => 
      o.status === 'ready' || o.status === 'done' || o.status === 'เสร็จสิ้น'
    );

    if (!isCurrentlyDone) {
      const result = await Swal.fire({
        title: 'ยืนยันการจัดเตรียม',
        html: `ยืนยันการจัดเตรียมอาหารของ <b>${memberName}</b><br/>จำนวน <b>${item.totalQty}</b> กล่อง ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
      });

      if (result.isConfirmed) {
        toggleComplete(time, memberName, item);
      }
    } else {
      toggleComplete(time, memberName, item);
    }
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
    const totalMembers = Object.values(todayProduction.groups).reduce((acc: number, g: any) => acc + Object.keys(g.members).length, 0);
    return `ยอดผลิตรวม ${totalBoxes} กล่อง สำหรับลูกค้า ${totalMembers} ท่าน โดยรอบที่งานเยอะที่สุดคือ ${busiestShift} (${shifts[0][1].totalRoundQty} กล่อง) ${todayProduction.specialNotesCount > 0 ? `และมีคำขอพิเศษ ${todayProduction.specialNotesCount} รายการ` : 'ไม่มีหมายเหตุพิเศษ'}`;
  }, [todayProduction, totalBoxes]);

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

  const [nutritionModal, setNutritionModal] = useState<{ open: boolean; memberName: string; item: any; time: string } | null>(null);

  const handleCopyNutrition = (memberName: string, item: any, time: string) => {
    const dateStr = dayjs(selectedDate).locale('th').format('DD MMMM YYYY');
    let text = `📋 ข้อมูลโภชนาการประจำวันที่ ${dateStr}\n`;
    text += `👤 ลูกค้า: ${memberName}\n`;
    text += `⏰ รอบ: ${time}\n`;
    text += `──────────────────\n`;
    
    item.orders.forEach((o: any, i: number) => {
      text += `${i + 1}. ${o.menuName} (x${o.qty})\n`;
      text += `   🔥 ${o.kcal * o.qty} kcal | ${o.macros}\n`;
    });
    
    text += `──────────────────\n`;
    text += `📊 ยอดรวมทั้งหมด: ${Math.max(0, item.totalKcal)} kcal\n`;
    text += `💪 P:${Math.max(0, item.totalP).toFixed(1)} C:${Math.max(0, item.totalC).toFixed(1)} F:${Math.max(0, item.totalF).toFixed(1)}`;

    navigator.clipboard.writeText(text);
    toast.success('คัดลอกข้อมูลแล้ว', {
      description: 'คุณสามารถวางข้อมูลโภชนาการได้ทันที'
    });
  };


  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar print:bg-white print:p-0">
      {/* Nutrition Modal */}
      <AnimatePresence>
        {nutritionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-none">ข้อมูลโภชนาการ</h3>
                  <p className="text-base font-bold text-slate-900 mt-1 uppercase tracking-tight">{nutritionModal.memberName}</p>
                </div>
                <button 
                  onClick={() => setNutritionModal(null)} 
                  className="p-2 hover:bg-white rounded-xl transition-colors shadow-sm text-slate-400 hover:text-slate-900 active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 max-h-[50vh] overflow-y-auto space-y-2 custom-scrollbar">
                {nutritionModal.item.orders.map((o: any, idx: number) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-base truncate">{o.menuName}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                        🔥 <span className="text-slate-900 font-bold">{o.kcal * o.qty}</span> KCAL | {o.macros}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-white px-2.5 py-1 rounded-xl shadow-sm border border-slate-100 min-w-[40px]">
                      <span className="text-[12px] font-black text-slate-900">x{o.qty}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="flex justify-between items-end mb-6 relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">ยอดรวมโภชนาการประจำวัน</p>
                    <h4 className="text-4xl font-bold tracking-tighter">{nutritionModal.item.totalKcal} <span className="text-sm font-bold opacity-30 tracking-normal ml-1">KCAL</span></h4>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                        <p className="text-[13px] font-bold tracking-widest leading-none">
                            <span className="text-slate-400">P:</span><span className="text-blue-400">{Math.max(0, nutritionModal.item.totalP).toFixed(0)}</span>
                        </p>
                        <p className="text-[13px] font-bold tracking-widest leading-none">
                            <span className="text-slate-400">C:</span><span className="text-emerald-400">{Math.max(0, nutritionModal.item.totalC).toFixed(0)}</span>
                        </p>
                        <p className="text-[13px] font-bold tracking-widest leading-none">
                            <span className="text-slate-400">F:</span><span className="text-amber-400">{Math.max(0, nutritionModal.item.totalF).toFixed(0)}</span>
                        </p>
                    </div>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCopyNutrition(nutritionModal.memberName, nutritionModal.item, nutritionModal.time)}
                  className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles size={20} /> คัดลอกข้อมูลสรุป
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden flex-wrap">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <ChefHat size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight whitespace-nowrap">แผนงานเตรียมอาหาร</h2>
              <p className="text-slate-500 text-xs font-semibold">รายการผลิตประจำวันที่ • {dayjs(selectedDate).locale('th').format('ddddที่ DD MMM YYYY')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-1 flex gap-1 shadow-sm mr-2">
                <button 
                  onClick={() => setFilterType('menu')} 
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    filterType === 'menu' ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  เมนู
                </button>
                <button 
                  onClick={() => setFilterType('member')} 
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    filterType === 'member' ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  สมาชิก
                </button>

                <button 
                  onClick={() => setFilterType('retail')} 
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    filterType === 'retail' ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  รายย่อย
                </button>
                <button 
                  onClick={() => setFilterType('extra')} 
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    filterType === 'extra' ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  สั่งแยก
                </button>
                {filterType !== 'all' && <button onClick={() => setFilterType('all')} className="px-2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
            </div>

            <button onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))} className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center active:scale-95">วันนี้</button>
            <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex items-center shadow-sm">
                <button onClick={() => changeDate(-1)} className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><ChevronLeft size={18} /></button>
                <div className="px-6 text-center min-w-[140px]">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">{getDateLabel()}</p>
                    <p className="text-sm font-bold text-slate-700 leading-none">{dayjs(selectedDate).locale('th').format('D MMMM YYYY')}</p>
                </div>
                <button onClick={() => changeDate(1)} className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><ChevronRight size={18} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><Package size={28} /></div>
                <div><p className="text-[12px] uppercase text-slate-400 font-bold mb-1">ยอดผลิตรวม</p><h3 className="text-3xl font-black text-slate-900">{totalBoxes} <span className="text-sm font-bold text-slate-400">กล่อง</span></h3></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><UtensilsCrossed size={28} /></div>
                <div><p className="text-[12px] uppercase text-slate-400 font-bold mb-1">จำนวนลูกค้า</p><h3 className="text-3xl font-black text-slate-900">{Object.values(todayProduction.groups).reduce((acc: number, group: any) => acc + Object.keys(group.members).length, 0)}<span className="text-sm font-bold text-slate-400"> ท่าน</span></h3></div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><AlertTriangle size={28} /></div>
                <div><p className="text-[12px] uppercase text-slate-400 font-bold mb-1">หมายเหตุแพ้อาหาร</p><h3 className="text-3xl font-black text-slate-900">{todayProduction.specialNotesCount} <span className="text-sm font-bold text-slate-400">รายการ</span></h3></div>
            </div>
            <div className="bg-emerald-500 p-6 rounded-2xl shadow-lg flex flex-col items-center text-center gap-4 border border-emerald-400">
                <div className="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm"><CheckCircle2 size={28} /></div>
                <div><p className="text-[12px] uppercase text-emerald-100 font-bold mb-1">สถานะระบบ</p><h3 className="text-xl font-black text-white italic">พร้อมทำงาน</h3></div>
            </div>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl text-white relative overflow-hidden shadow-xl print:border print:border-slate-900 print:text-black print:bg-white print:shadow-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl shrink-0 w-fit"><ChefHat size={24} className="text-white" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">วิเคราะห์งานครัว (Kitchen Insights)</p><p className="text-base font-semibold leading-relaxed text-slate-200 print:text-slate-800">{kitchenInsight}</p></div>
          </div>
        </div>

        <div className="space-y-16">
            {Object.keys(todayProduction.groups).length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200 shadow-sm flex flex-col items-center"><ChefHat size={60} className="text-slate-100 mb-6" /><h3 className="text-xl font-bold text-slate-900 mb-2 italic">ไม่มีรายการผลิตในวันที่เลือก</h3><p className="text-slate-400 max-w-sm font-semibold">ระบบไม่พบแผนการจัดส่งในวันที่ {dayjs(selectedDate).locale('th').format('DD MMMM YYYY')}</p></div>
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
                                <div><h3 className="text-2xl font-semibold text-slate-900 tracking-tight uppercase">รอบจัดส่ง: {time}</h3><div className="flex items-center gap-4 mt-0.5"><span className="text-sm font-medium text-slate-400 flex items-center gap-2"><Package size={14} /> ยอดผลิตรวม {group.totalRoundQty} กล่อง</span></div></div>
                            </div>
                            <div className="flex flex-wrap gap-2 ml-8 print:hidden">
                                {Object.entries(group.categoryStats).sort((a, b) => (CATEGORY_PRIORITY[a[0]] || 99) - (CATEGORY_PRIORITY[b[0]] || 99)).map(([cat, qty]) => (
                                    <div key={cat} className="px-3 py-1 bg-white border border-slate-200 rounded-full flex items-center gap-2 shadow-sm"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#CBD5E1' }}></div><span className="text-[10px] font-bold text-slate-500">{cat}</span><span className="text-[11px] font-black text-slate-900">{qty as number}</span></div>
                                ))}
                            </div>
                        </div>

                        <div ref={parent} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">

                            {Object.entries(group.members)
                                .sort(([a], [b]) => a.localeCompare(b, 'th'))
                                .map(([memberName, item]: [string, any]) => {
                                const isDone = item.orders.every((o: any) => o.status === 'ready' || o.status === 'done' || o.status === 'เสร็จสิ้น');
                                return (
                                <div 
                                  key={memberName} 
                                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 group relative ${isDone ? 'border-slate-300 shadow-inner' : ''}`}
                                >
                                    {/* Header Section (Always Prominent) */}
                                    <div className="p-4 pb-0 flex justify-between items-start gap-2 relative z-10">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <motion.button 
                                                  whileTap={{ scale: 0.9 }}
                                                  onClick={(e) => handleToggleClick(time, memberName, item, e)}
                                                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md ${isDone ? 'bg-emerald-500 text-white shadow-emerald-500/40' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 border border-emerald-100'}`}
                                                >
                                                    <CheckCircle2 size={22} strokeWidth={2} />
                                                </motion.button>
                                                {item.isRetail && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-slate-900 text-white shadow-sm">รายย่อย</span>}
                                                {item.hasExtraOrder && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-orange-500 text-white shadow-sm">สั่งแยก</span>}
                                                {item.hasNotes && !isDone && <AlertTriangle size={16} className="text-red-500 animate-pulse" />}
                                            </div>
                                            <h4 className={`text-lg font-semibold transition-colors ${isDone ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-emerald-600'}`}>{memberName}</h4>
                                        </div>
                                        <div 
                                          onClick={(e) => handleToggleClick(time, memberName, item, e)}
                                          className={`cursor-pointer ${isDone ? 'bg-slate-300' : 'bg-slate-900'} text-white px-2.5 py-2 rounded-xl flex flex-col items-center justify-center shrink-0 min-w-[44px] shadow-lg transition-all hover:scale-105 active:scale-95`}
                                        >
                                            <span className="text-[20px] font-bold leading-none">{item.totalQty}</span>
                                            <span className="text-[8px] font-bold uppercase opacity-60 leading-none mt-1">BOX</span>
                                        </div>
                                    </div>

                                    {/* Content Section (Faded when Done) */}
                                    <div className={`px-4 pt-3 flex flex-col gap-3 flex-1 ${isDone ? 'opacity-25 grayscale-[1]' : ''}`}>
                                        <div className="space-y-2">
                                            {item.orders.map((order: any, oIdx: number) => {
                                                const orderDone = order.status === 'ready' || order.status === 'done' || order.status === 'เสร็จสิ้น';
                                                return (
                                                <div 
                                                  key={oIdx} 
                                                  onClick={(e) => toggleSingleItem(order, e)}
                                                  className={`p-2 rounded-xl border transition-all cursor-pointer ${orderDone ? 'bg-slate-50 border-transparent opacity-60' : 'bg-slate-50 border-slate-100 hover:border-emerald-300 hover:bg-white hover:shadow-sm'}`}
                                                >
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[order.category] || '#CBD5E1' }}></span>
                                                                <span className="text-[11px] font-semibold text-slate-900 uppercase tracking-tight">{order.category}</span>
                                                                {order.isExtra && <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-1 rounded uppercase tracking-widest ml-1">สั่งแยก</span>}
                                                            </div>
                                                            <p className={`text-[14px] font-medium leading-tight ${orderDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{order.menuName}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`text-[14px] font-bold ${orderDone ? 'text-slate-300' : 'text-slate-900'}`}>x{order.qty}</span>
                                                            {orderDone && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                        </div>
                                                    </div>
                                                    {order.note && (
                                                        <div className={`mt-1.5 flex gap-1.5 items-start p-1.5 rounded-lg ${orderDone ? 'bg-slate-100/30' : 'bg-amber-50'}`}>
                                                            <AlertTriangle size={10} className={`${orderDone ? 'text-slate-200' : 'text-amber-500'} shrink-0 mt-0.5`} />
                                                            <p className={`text-[11px] font-bold leading-tight italic ${orderDone ? 'text-slate-300' : 'text-amber-700'}`}>{order.note}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )})}
                                        </div>
                                    </div>

                                    <div className="px-4 pb-4 flex flex-col gap-2">
                                        <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-100">
                                            <p className="text-[9px] font-bold text-slate-900 uppercase tracking-[0.1em]">ข้อมูลโภชนาการรวม</p>
                                            <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">{Math.max(0, item.totalKcal)} KCAL</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <motion.button 
                                              whileHover={{ y: -1 }}
                                              whileTap={{ scale: 0.96 }}
                                              onClick={(e) => { e.stopPropagation(); window.print(); }}
                                              className="flex items-center justify-center gap-2 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 transition-all border border-slate-100"
                                            >
                                                <Printer size={13} /> พิมพ์ใบสั่ง
                                            </motion.button>
                                            <motion.button 
                                              whileHover={{ y: -1 }}
                                              whileTap={{ scale: 0.96 }}
                                              onClick={(e) => { e.stopPropagation(); setNutritionModal({ open: true, memberName, item, time }); }}
                                              className="flex items-center justify-center gap-2 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-[10px] font-bold text-emerald-600 transition-all border border-emerald-100"
                                            >
                                                <Sparkles size={13} /> โภชนาการ
                                            </motion.button>
                                        </div>
                                    </div>

                                    <div 
                                      onClick={(e) => handleToggleClick(time, memberName, item, e)}
                                      className={`h-12 border-t flex items-center justify-center gap-2 cursor-pointer transition-all ${isDone ? 'bg-slate-800 border-slate-900 hover:bg-slate-700' : 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-100'}`}
                                    >
                                        {isDone ? (
                                            <>
                                                <X size={14} className="text-white" />
                                                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                                                    ยกเลิกรายการ (UNDO)
                                                </span>
                                            </>
                                        ) : (
                                            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600`}>
                                                ยืนยันแพ็คอาหาร (READY)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    </section>
                ))
            )}
        </div>
      </div>

      {/* --- Kitchen Ticket Template (Thermal 80mm) --- */}
      <style>{`
        @media print {
          .custom-scrollbar { overflow: visible !important; }
        }
      `}</style>

    </div>
  );
};
