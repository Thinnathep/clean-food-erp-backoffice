import React, { useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, AlertTriangle, Package, UtensilsCrossed, ChevronLeft, ChevronRight, ChevronDown, X, Printer, Sparkles } from 'lucide-react';
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
  'ทานเล่น': 1.5,
  'สลัด': 2,
  'ซูวี': 3,
  'ซุป': 4,
  'ต้ม': 5,
  'แกง': 6,
  'เส้น': 7,
  'ผัด': 8,
  'ชุดเซต': 9,
  'แพ็กเกจ': 9,
  'เมนูหลัก': 10,
  'อื่นๆ': 99
};

const CATEGORY_COLORS: Record<string, string> = {
  'ของหวาน': '#E11D48', // rose-600
  'ทานเล่น': '#8B5CF6', // violet-500
  'สลัด': '#10B981', // emerald-500
  'ซูวี': '#4F46E5', // indigo-600
  'ซุป': '#0D9488', // teal-600
  'ต้ม': '#0D9488',
  'แกง': '#0D9488',
  'เส้น': '#D97706', // amber-600
  'ผัด': '#EA580C', // orange-600
  'ชุดเซต': '#475569', // slate-600
  'เมนูหลัก': '#475569' 
};

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

export const TodayView: React.FC = () => {
  const memberSchedules = useKdsStore(state => state.memberSchedules);
  const tasks = useKdsStore(state => state.tasks);
  const loadMemberPlanner = useKdsStore(state => state.loadMemberPlanner);
  const fetchTasks = useKdsStore(state => state.fetchTasks);
  const menus = useKdsStore(state => state.menus);
  
  const [parent] = useAutoAnimate();
  
  const [filterType, setFilterType] = useState<'all' | 'member' | 'retail' | 'extra' | 'menu'>('all');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryCategoryFilter, setSummaryCategoryFilter] = useState('all');
  const [selectedSummaryMenu, setSelectedSummaryMenu] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));


  useEffect(() => {
    let start = selectedDate;
    let end = selectedDate;

    if (viewMode === 'week') {
      const d = dayjs(selectedDate);
      const day = d.day();
      const diffToMonday = (day === 0 ? -6 : 1 - day);
      start = d.add(diffToMonday, 'day').format('YYYY-MM-DD');
      end = d.add(diffToMonday + 6, 'day').format('YYYY-MM-DD');
    }

    loadMemberPlanner(start, end);
    fetchTasks();

    const schedulesChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'erp_member_meal_schedules' },
        () => { 
          if (viewMode === 'week') {
            const d = dayjs(selectedDate);
            const day = d.day();
            const diffToMonday = (day === 0 ? -6 : 1 - day);
            const s = d.add(diffToMonday, 'day').format('YYYY-MM-DD');
            const e = d.add(diffToMonday + 6, 'day').format('YYYY-MM-DD');
            loadMemberPlanner(s, e);
          } else {
            loadMemberPlanner(selectedDate, selectedDate); 
          }
        }
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
  }, [selectedDate, viewMode]);

  const todayProduction = useMemo(() => {
    const todaySchedules = memberSchedules.filter(s => {
      const member = Array.isArray(s.members) ? s.members[0] : s.members;
      if (member?.is_banned) return false;
      
      if (viewMode === 'day') {
        if (s.delivery_date !== selectedDate) return false;
      } else {
        const d = dayjs(selectedDate);
        const day = d.day();
        const diffToMonday = (day === 0 ? -6 : 1 - day);
        const start = d.add(diffToMonday, 'day').format('YYYY-MM-DD');
        const end = d.add(diffToMonday + 6, 'day').format('YYYY-MM-DD');
        if (s.delivery_date < start || s.delivery_date > end) return false;
      }
      
      // If filtering specifically for extras
      if (filterType === 'extra') return s.is_extra_order;
      
      // If filtering for retail, we skip schedules
      if (filterType === 'retail') return false;
      
      // For 'all', 'menu', 'member', we show both regular and extras
      return true;
    });

    const todayTasks = tasks.filter(t => {
      const taskDate = dayjs(t.created_at).format('YYYY-MM-DD');
      
      if (viewMode === 'day') {
        if (taskDate !== selectedDate) return false;
      } else {
        const d = dayjs(selectedDate);
        const day = d.day();
        const diffToMonday = (day === 0 ? -6 : 1 - day);
        const start = d.add(diffToMonday, 'day').format('YYYY-MM-DD');
        const end = d.add(diffToMonday + 6, 'day').format('YYYY-MM-DD');
        if (taskDate < start || taskDate > end) return false;
      }

      // In 'extra' view, we only show schedules, not retail tasks
      if (filterType === 'extra') return false;
      
      // In other views (all, menu, member, retail), we show retail tasks
      return true;
    });

    const grouped: Record<string, any> = {};
    let specialNotes = 0;

    todaySchedules.forEach(schedule => {
      const memberData = Array.isArray(schedule.members) ? schedule.members[0] : schedule.members;
      const rawTime = (schedule.delivery_time || memberData?.delivery_time || '').trim();
      let timeLabel = getCleanTimeLabel(rawTime);
      
      if (viewMode === 'week') {
        const dateLabel = dayjs(schedule.delivery_date).locale('th').format('dddที่ DD');
        timeLabel = `${dateLabel} - ${timeLabel}`;
      }

      const memberName = memberData?.full_name || 'ไม่ระบุชื่อ';
      const menuName = schedule.menu_items?.name || 'ไม่ทราบชื่อเมนู';
      const groupKey = filterType === 'menu' ? menuName : memberName;
      
      let category = schedule.menu_items?.category || 'อื่นๆ';
      if (category.includes('ของหวาน')) category = 'ของหวาน';
      else if (category.includes('ทานเล่น')) category = 'ทานเล่น';
      else if (category.includes('เส้น')) category = 'เส้น';
      else if (category.includes('ผัด')) category = 'ผัด';
      else if (category.includes('สลัด')) category = 'สลัด';
      else if (category.includes('ซูวี')) category = 'ซูวี';
      else if (category.includes('ซุป')) category = 'ซุป';
      else if (category.includes('แกง')) category = 'แกง';
      else if (category.includes('ต้ม')) category = 'ต้ม';
      else if (category.includes('ชุดเซต') || category.includes('โปรโมชั่น')) category = 'ชุดเซต';

      if (!grouped[timeLabel]) {
        grouped[timeLabel] = { totalRoundQty: 0, members: {}, categoryStats: {}, sortKey: schedule.delivery_date + (rawTime || '99:99') };
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
        // Standard rice portion: ~108 kcal, ~23g Carbs
        kcal -= 108;
        carbs -= 23;
        
        // Ensure minimum 5g carbs remains for sauces/vegetables if the dish isn't purely plain
        // This prevents unrealistic "0 Carbs" for dishes like Teriyaki or Stir-fry
        carbs = Math.max(5, carbs);
      }

      // Ensure values are not negative
      kcal = Math.max(0, kcal);
      protein = Math.max(0, protein);
      carbs = Math.max(0, carbs);
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
        macros: `P:${protein} C:${carbs} F:${fat}`,
        mealType: schedule.meal_type
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

      const targetLabel = viewMode === 'week' 
        ? `${dayjs(task.created_at).locale('th').format('dddที่ DD')} - ${timeLabel}` 
        : timeLabel;

      if (!grouped[targetLabel]) {
        grouped[targetLabel] = { totalRoundQty: 0, members: {}, categoryStats: {}, sortKey: dayjs(task.created_at).format('YYYY-MM-DD') + '99:99' };
      }

      const qtyMatch = menuNameRaw.match(/\(x(\d+)\)/);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const groupKey = filterType === 'menu' ? (matchedMenu?.name || menuNameRaw) : memberName;


      if (!grouped[targetLabel].members[groupKey]) {
        grouped[targetLabel].members[groupKey] = {
          memberName: groupKey,
          totalQty: 0,
          hasNotes: false,
          isRetail: true,
          orders: []
        };
      }

      grouped[targetLabel].totalRoundQty += qty;
      grouped[targetLabel].members[groupKey].totalQty += qty;


      const kcal = Math.max(0, matchedMenu?.calories || 0);
      const protein = Math.max(0, matchedMenu?.protein || 0);
      const carbs = Math.max(0, matchedMenu?.carbs || 0);
      const fat = Math.max(0, matchedMenu?.fat || 0);

      grouped[targetLabel].members[groupKey].totalKcal += (kcal * qty);
      grouped[targetLabel].members[groupKey].totalP += (protein * qty);
      grouped[targetLabel].members[groupKey].totalC += (carbs * qty);
      grouped[targetLabel].members[groupKey].totalF += (fat * qty);

      grouped[targetLabel].members[groupKey].orders.push({
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

      grouped[targetLabel].categoryStats[category] = (grouped[targetLabel].categoryStats[category] || 0) + qty;
    });

    return { groups: grouped, specialNotesCount: specialNotes };
  }, [memberSchedules, tasks, menus, selectedDate, filterType, viewMode]);

  const weeklySummary = useMemo(() => {
    if (viewMode !== 'week') return null;

    const days: Record<string, any> = {};
    const menuTotals: Record<string, { qty: number; category: string; details: any[] }> = {};

    const d = dayjs(selectedDate);
    const day = d.day();
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    
    for (let i = 0; i < 7; i++) {
      const date = d.add(diffToMonday + i, 'day').format('YYYY-MM-DD');
      days[date] = { 
        date, 
        total: 0, 
        rounds: {} as Record<string, number>,
        topMenus: [] as { name: string; qty: number }[]
      };
    }

    const tempDayMenus: Record<string, Record<string, number>> = {};
    for (const date of Object.keys(days)) tempDayMenus[date] = {};

    // Process Member Schedules
    memberSchedules.forEach(s => {
      const memberData = Array.isArray(s.members) ? s.members[0] : s.members;
      
      if (days[s.delivery_date]) {
        days[s.delivery_date].total += s.quantity;
        const rawTime = (s.delivery_time || memberData?.delivery_time || '').trim();
        const round = getCleanTimeLabel(rawTime);
        days[s.delivery_date].rounds[round] = (days[s.delivery_date].rounds[round] || 0) + s.quantity;
        
        const name = s.menu_items?.name || 'Unknown';
        tempDayMenus[s.delivery_date][name] = (tempDayMenus[s.delivery_date][name] || 0) + s.quantity;
        
        if (!menuTotals[name]) {
          let category = s.menu_items?.category || 'อื่นๆ';
          if (category.includes('ของหวาน')) category = 'ของหวาน';
          else if (category.includes('ทานเล่น')) category = 'ทานเล่น';
          else if (category.includes('เส้น')) category = 'เส้น';
          else if (category.includes('ผัด')) category = 'ผัด';
          else if (category.includes('สลัด')) category = 'สลัด';
          else if (category.includes('ซูวี')) category = 'ซูวี';
          else if (category.includes('ซุป')) category = 'ซุป';
          else if (category.includes('แกง')) category = 'แกง';
          else if (category.includes('ต้ม')) category = 'ต้ม';
          else if (category.includes('ชุดเซต') || category.includes('โปรโมชั่น')) category = 'ชุดเซต';
          menuTotals[name] = { qty: 0, category, details: [] };
        }
        menuTotals[name].qty += s.quantity;
        menuTotals[name].details.push({
            id: s.id,
            date: s.delivery_date,
            time: round,
            memberName: memberData?.full_name || 'ไม่ระบุชื่อ',
            qty: s.quantity,
            notes: s.notes
        });
      }
    });

    // Process Retail Tasks
    tasks.forEach(t => {
      const taskDate = dayjs(t.created_at).format('YYYY-MM-DD');
      if (days[taskDate]) {
        const qtyMatch = (t.menu_name || '').match(/\(x(\d+)\)/);
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        
        days[taskDate].total += qty;
        const round = 'รายย่อย';
        days[taskDate].rounds[round] = (days[taskDate].rounds[round] || 0) + qty;
        
        const cleanName = (t.menu_name || '').replace(/\(x\d+\)/g, '').trim();
        tempDayMenus[taskDate][cleanName] = (tempDayMenus[taskDate][cleanName] || 0) + qty;

        if (!menuTotals[cleanName]) {
            menuTotals[cleanName] = { qty: 0, category: 'รายย่อย', details: [] };
        }
        menuTotals[cleanName].qty += qty;
        menuTotals[cleanName].details.push({
            id: t.id,
            date: taskDate,
            time: 'รายย่อย',
            memberName: 'ลูกค้ารายย่อย',
            qty: qty,
            notes: ''
        });
      }
    });

    // Populate top menus for each day
    Object.keys(days).forEach(date => {
      days[date].topMenus = Object.entries(tempDayMenus[date])
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 3);
    });

    const filteredMenus = Object.entries(menuTotals)
        .map(([name, data]) => ({ name, ...data }))
        .filter(m => {
            const matchesSearch = m.name.toLowerCase().includes(summarySearchTerm.toLowerCase());
            const matchesCategory = summaryCategoryFilter === 'all' || m.category === summaryCategoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => b.qty - a.qty);

    return {
      days: Object.values(days),
      menuTotals: filteredMenus
    };
  }, [memberSchedules, tasks, viewMode, selectedDate, summarySearchTerm, summaryCategoryFilter]);

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
    
    const allUniqueKeys = new Set<string>();
    Object.values(todayProduction.groups).forEach((timeGroup: any) => {
      Object.keys(timeGroup.members).forEach(key => allUniqueKeys.add(key));
    });
    
    const totalUniqueCount = allUniqueKeys.size;
    const unitLabel = filterType === 'menu' ? 'เมนู' : 'ลูกค้า';
    const unitSuffix = filterType === 'menu' ? 'รายการ' : 'ท่าน';

    return `ยอดผลิตรวม ${totalBoxes} กล่อง สำหรับ${unitLabel} ${totalUniqueCount} ${unitSuffix} โดยรอบที่งานเยอะที่สุดคือ ${busiestShift} (${shifts[0][1].totalRoundQty} กล่อง) ${todayProduction.specialNotesCount > 0 ? `และมีคำขอพิเศษ ${todayProduction.specialNotesCount} รายการ` : 'ไม่มีหมายเหตุพิเศษ'}`;
  }, [todayProduction, totalBoxes]);

  const changeDate = (days: number) => {
    if (viewMode === 'week') {
      setSelectedDate(prev => dayjs(prev).add(days * 7, 'day').format('YYYY-MM-DD'));
    } else {
      setSelectedDate(prev => dayjs(prev).add(days, 'day').format('YYYY-MM-DD'));
    }
  };

  const getDateLabel = () => {
    if (viewMode === 'week') {
        const d = dayjs(selectedDate);
        const day = d.day();
        const diffToMonday = (day === 0 ? -6 : 1 - day);
        const start = d.add(diffToMonday, 'day');
        const end = start.add(6, 'day');
        return `สัปดาห์นี้ (${start.format('D MMM')} - ${end.format('D MMM')})`;
    }
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
    text += `👤 ลูกค้า: คุณ${memberName}\n`;
    text += `⏰ รอบ: ${time}\n`;
    text += `──────────────────\n`;
    
    item.orders.forEach((o: any, i: number) => {
      text += `${i + 1}.${o.menuName} (x${o.qty})\n`;
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
              <p className="text-slate-500 text-xs font-semibold">
                {viewMode === 'day' ? 'รายการผลิตประจำวันที่' : (isSummaryMode ? 'สรุปภาพรวมสัปดาห์' : 'รายการผลิตประจำสัปดาห์')} • {dayjs(selectedDate).locale('th').format('ddddที่ DD MMM YYYY')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-1 flex gap-1 shadow-sm mr-2">
                <button 
                  onClick={() => setViewMode('day')}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    viewMode === 'day' ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  รายวัน
                </button>
                <button 
                  onClick={() => {
                    setViewMode('week');
                    setIsSummaryMode(true);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    viewMode === 'week' ? "bg-slate-900 text-white shadow-md shadow-slate-900/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  สัปดาห์
                </button>
            </div>

            {viewMode === 'week' && (
              <div className="bg-white border border-slate-100 rounded-2xl p-1 flex gap-1 shadow-sm">
                <button 
                  onClick={() => setIsSummaryMode(true)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    isSummaryMode ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  ภาพรวม
                </button>
                <button 
                  onClick={() => setIsSummaryMode(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[11px] font-bold transition-all",
                    !isSummaryMode ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  รายการละเอียด
                </button>
              </div>
            )}

            <div className="bg-white border border-slate-100 rounded-2xl p-1.5 flex items-center shadow-sm">
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

            <button 
              onClick={() => {
                setSelectedDate(dayjs().format('YYYY-MM-DD'));
                setViewMode('day');
              }} 
              className="px-6 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center active:scale-95"
            >
              วันนี้
            </button>
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
                <div>
                  <p className="text-[12px] uppercase text-slate-400 font-bold mb-1">{filterType === 'menu' ? 'จำนวนเมนู' : 'จำนวนลูกค้า'}</p>
                  <h3 className="text-3xl font-black text-slate-900">
                    {(() => {
                      const allKeys = new Set();
                      Object.values(todayProduction.groups).forEach((tg: any) => {
                        Object.keys(tg.members).forEach(k => allKeys.add(k));
                      });
                      return allKeys.size;
                    })()}
                    <span className="text-sm font-bold text-slate-400"> {filterType === 'menu' ? 'รายการ' : 'ท่าน'}</span>
                  </h3>
                </div>
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
            {viewMode === 'week' && isSummaryMode && weeklySummary && (
                <div className="space-y-12">
                    {/* Daily Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {weeklySummary.days.map((day: any, idx: number) => (
                            <motion.div 
                            key={day.date}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm flex flex-col items-center text-center gap-3 hover:shadow-lg transition-all group"
                            >
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{dayjs(day.date).locale('th').format('dddd')}</span>
                                    <span className="text-base font-black text-slate-900">{dayjs(day.date).locale('th').format('D MMM')}</span>
                                </div>
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-100 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all">
                                    <span className="text-3xl font-black text-slate-900 group-hover:text-emerald-600">{day.total}</span>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest -mt-1">กล่องรวม</p>
                                
                                <div className="w-full space-y-1 mt-2">
                                    {Object.entries(day.rounds).map(([round, qty]: [any, any]) => (
                                    <div key={round} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                        <span className="text-[11px] font-bold text-slate-500 truncate mr-2">{round}</span>
                                        <span className="text-xs font-black text-slate-900">{qty}</span>
                                    </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Weekly Menu Totals */}
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                            <div className="shrink-0">
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">สรุปยอดเตรียมอาหารทั้งสัปดาห์</h3>
                                <p className="text-slate-500 text-xs font-semibold mt-1">รายการเมนูทั้งหมดที่ต้องผลิตในสัปดาห์นี้</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                        <Sparkles size={16} />
                                    </div>
                                    <input 
                                        type="text"
                                        placeholder="ค้นหาชื่อเมนู..."
                                        value={summarySearchTerm}
                                        onChange={(e) => setSummarySearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-inner"
                                    />
                                    {summarySearchTerm && (
                                        <button 
                                            onClick={() => setSummarySearchTerm('')}
                                            className="absolute inset-y-0 right-4 flex items-center text-slate-300 hover:text-slate-500 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="relative min-w-[180px]">
                                    <select 
                                        value={summaryCategoryFilter}
                                        onChange={(e) => setSummaryCategoryFilter(e.target.value)}
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-inner appearance-none cursor-pointer"
                                    >
                                        <option value="all">ทุกหมวดหมู่</option>
                                        {Array.from(new Set(Object.keys(CATEGORY_PRIORITY)))
                                            .sort((a, b) => (CATEGORY_PRIORITY[a] || 99) - (CATEGORY_PRIORITY[b] || 99))
                                            .map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))
                                        }
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm shrink-0">
                                <UtensilsCrossed size={18} />
                                <span className="text-sm font-black">{weeklySummary.menuTotals.length} รายการ</span>
                            </div>
                        </div>
                        
                        <div className="divide-y divide-slate-100">
                            {Object.entries(
                                weeklySummary.menuTotals.reduce((acc: any, menu: any) => {
                                    const cat = menu.category || 'อื่นๆ';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(menu);
                                    return acc;
                                }, {} as Record<string, any[]>)
                            )
                            .sort(([catA], [catB]) => (CATEGORY_PRIORITY[catA] || 99) - (CATEGORY_PRIORITY[catB] || 99))
                            .map(([category, items]: [string, any]) => (
                                <div key={category} className="p-4 md:p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] || '#cbd5e1' }} />
                                        <h4 className="text-[13px] font-bold text-slate-600 uppercase tracking-widest">{category}</h4>
                                        <span className="text-[11px] font-bold text-slate-300">({items.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                        {items.map((menu: any, idx: number) => {
                                            const activeDays = Array.from(new Set(menu.details.map((d: any) => dayjs(d.date).day())));
                                            const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
                                            
                                            return (
                                                <div 
                                                    key={idx} 
                                                    onClick={() => setSelectedSummaryMenu(menu)}
                                                    className="p-2.5 bg-slate-50/50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-emerald-100 flex items-center justify-between gap-2 group cursor-pointer active:scale-95"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <div 
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" 
                                                            style={{ 
                                                                backgroundColor: `${CATEGORY_COLORS[category] || '#f1f5f9'}20`, 
                                                                color: CATEGORY_COLORS[category] || '#64748b' 
                                                            }}
                                                        >
                                                            <ChefHat size={14} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[15px] font-bold text-slate-800 truncate leading-none mb-1.5">{menu.name}</p>
                                                            <div className="flex gap-1">
                                                                {activeDays.sort((a: any, b: any) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)).map((d: any) => (
                                                                    <span key={d} className="text-[9px] font-black px-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                                                                        {dayLabels[d]}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shrink-0 min-w-[36px] text-center shadow-sm group-hover:bg-emerald-600 transition-colors">
                                                        <span className="text-sm font-black leading-none">{menu.qty}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(!isSummaryMode || viewMode === 'day') && (
                <>
                {Object.keys(todayProduction.groups).length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200 shadow-sm flex flex-col items-center"><ChefHat size={60} className="text-slate-100 mb-6" /><h3 className="text-xl font-bold text-slate-900 mb-2 italic">ไม่มีรายการผลิตในวันที่เลือก</h3><p className="text-slate-400 max-w-sm font-semibold">ระบบไม่พบแผนการจัดส่งในวันที่ {dayjs(selectedDate).locale('th').format('DD MMMM YYYY')}</p></div>
            ) : (
                Object.entries(todayProduction.groups)
                .sort((a, b) => {
                    if (viewMode === 'week') {
                        return a[1].sortKey.localeCompare(b[1].sortKey);
                    }
                    const [labelA] = a;
                    const [labelB] = b;
                    const getPriority = (label: string) => {
                        if (label.includes('เช้า')) return 1;
                        if (label.includes('เย็น')) return 2;
                        return 3;
                    };
                    return getPriority(labelA) - getPriority(labelB);
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
                </>
            )}
        </div>
      </div>

      {/* --- Kitchen Ticket Template (Thermal 80mm) --- */}
      <style>{`
        @media print {
          .custom-scrollbar { overflow: visible !important; }
        }
      `}</style>

        {/* Summary Detail Modal */}
        <AnimatePresence>
            {selectedSummaryMenu && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedSummaryMenu(null)}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner"
                                    style={{ 
                                        backgroundColor: `${CATEGORY_COLORS[selectedSummaryMenu.category] || '#f1f5f9'}20`, 
                                        color: CATEGORY_COLORS[selectedSummaryMenu.category] || '#64748b' 
                                    }}
                                >
                                    <ChefHat size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 leading-tight">{selectedSummaryMenu.name}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">รายละเอียดการผลิตทั้งสัปดาห์</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedSummaryMenu(null)}
                                className="w-10 h-10 rounded-xl bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center border border-slate-100 shadow-sm"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {/* Group details by date */}
                            {Object.entries(
                                selectedSummaryMenu.details.reduce((acc: any, d: any) => {
                                    if (!acc[d.date]) acc[d.date] = [];
                                    acc[d.date].push(d);
                                    return acc;
                                }, {})
                            )
                            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                            .map(([date, items]: [string, any]) => (
                                <div key={date} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <h4 className="text-sm font-black text-slate-900">
                                            {dayjs(date).locale('th').format('ddddที่ DD MMMM YYYY')}
                                        </h4>
                                        <div className="h-[1px] flex-1 bg-slate-100" />
                                        <span className="text-xs font-bold text-slate-400">
                                            รวม {items.reduce((sum: number, i: any) => sum + i.qty, 0)} กล่อง
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {items.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-emerald-100 transition-all group">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-900 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                                                        {item.qty}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 truncate">{item.memberName}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded uppercase tracking-wider">{item.time}</span>
                                                            {item.notes && (
                                                                <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
                                                                    <AlertTriangle size={10} /> {item.notes}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ยอดรวมทั้งสัปดาห์:</span>
                                <span className="text-xl font-black text-slate-900">{selectedSummaryMenu.qty} กล่อง</span>
                            </div>
                            <button 
                                onClick={() => setSelectedSummaryMenu(null)}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                ตกลง
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

    </div>
  );
};
