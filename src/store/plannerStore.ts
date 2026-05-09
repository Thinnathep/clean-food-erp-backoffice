import { create } from 'zustand';
import type { MemberMealSchedule, GlobalPlanSlot } from '../types';
import { 
  fetchGlobalPlanSlots, upsertGlobalPlanSlot, deleteGlobalPlanSlot,
  fetchMemberSchedules, removeMemberSchedule
} from '../features/kds/api';
import { supabase } from '../config/supabase';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useMemberStore } from './memberStore';
import { useMenuStore } from './menuStore';

interface PlannerState {
  globalPlanSlots: GlobalPlanSlot[];
  memberSchedules: MemberMealSchedule[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  selectedPackageId: string | null;
  copiedDaySlots: MemberMealSchedule[] | null;
  initialWeekSubscriptionQty: number; // Sum of subscription meal qty when loaded from DB

  setSelectedPackageId: (id: string | null) => void;
  loadGlobalPlanner: (start: string, end: string) => Promise<void>;
  loadMemberPlanner: (start: string, end: string, packageId?: string, silent?: boolean) => Promise<void>;
  
  assignGlobalSlot: (date: string, meal: string, menuId: string) => Promise<void>;
  removeGlobalSlot: (date: string, meal: string) => Promise<void>;
  
  assignMemberSlot: (
    scheduleId: string | null, 
    pkgId: string, 
    memberId: string, 
    date: string, 
    meal: string, 
    menuId: string, 
    qty: number, 
    time: string, 
    notes: string,
    isExtraOrder?: boolean,
    orderType?: 'subscription' | 'a-la-carte',
    boxSize?: string
  ) => Promise<void>;
  
  removeMemberSlot: (scheduleId: string) => Promise<void>;
  applyDailyMenuToAll: (date: string, mealType: string, menuId: string) => Promise<void>;
  
  saveChanges: () => Promise<void>;
  discardChanges: () => Promise<void>;
  
  copyDayPlan: (date: string) => void;
  pasteDayPlan: (targetDate: string, pkgId: string, memberId: string) => Promise<void>;
  clearDayPlan: (date: string, pkgId: string) => Promise<void>;
  clearCopiedPlan: () => void;
  updateGlobalSlotNote: (date: string, meal: string, note: string) => Promise<void>;
}

export const usePlannerStore = create<PlannerState>((set, get) => ({
  globalPlanSlots: [],
  memberSchedules: [],
  isLoading: false,
  isSaving: false,
  hasUnsavedChanges: false,
  selectedPackageId: null,
  copiedDaySlots: null,
  initialWeekSubscriptionQty: 0,

  clearCopiedPlan: () => set({ copiedDaySlots: null }),

  updateGlobalSlotNote: async (date, meal, note) => {
    try {
        const { error } = await supabase
            .from('pinto_meal_plan')
            .update({ prep_notes: note })
            .eq('delivery_date', date)
            .eq('meal_type', meal);
        
        if (error) throw error;
        set(state => ({
            globalPlanSlots: state.globalPlanSlots.map(s => 
                (s.delivery_date === date && s.meal_type === meal) 
                ? { ...s, prep_notes: note } 
                : s
            )
        }));
    } catch (error) {
        toast.error('บันทึกโน้ตไม่สำเร็จ');
    }
  },

  setSelectedPackageId: (id) => set({ selectedPackageId: id }),

  loadGlobalPlanner: async (start, end) => {
    try {
      const slots = await fetchGlobalPlanSlots(start, end);
      set({ globalPlanSlots: slots });
    } catch (error) {
      console.error('Load global planner failed', error);
    }
  },

  loadMemberPlanner: async (start, end, packageId, silent = false) => {
    try {
      if (!silent) set({ isLoading: true });
      const data = await fetchMemberSchedules(start, end, packageId);
      
      const subQty = data
        .filter(s => !s.is_extra_order)
        .reduce((sum, s) => sum + (s.quantity || 1), 0);

      set({ 
        memberSchedules: data, 
        initialWeekSubscriptionQty: subQty,
        isLoading: false, 
        selectedPackageId: packageId || null 
      });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error('โหลดข้อมูลตารางมื้ออาหารไม่สำเร็จ');
    }
  },

  assignGlobalSlot: async (date, meal, menuId) => {
    try {
      await upsertGlobalPlanSlot(date, meal, menuId);
      await get().loadGlobalPlanner(date, date); // Refresh
      toast.success('บันทึกแผนรายวันเรียบร้อย');
    } catch (error: any) {
      toast.error('บันทึกแผนไม่สำเร็จ');
    }
  },

  removeGlobalSlot: async (date, meal) => {
    try {
      await deleteGlobalPlanSlot(date, meal);
      set(state => ({
        globalPlanSlots: state.globalPlanSlots.filter(s => !(s.delivery_date === date && s.meal_type === meal))
      }));
    } catch (error) {
      toast.error('ลบแผนไม่สำเร็จ');
    }
  },

  assignMemberSlot: async (scheduleId, pkgId, memberId, date, meal, menuId, qty, time, notes, isExtraOrder = false, orderType = 'subscription', boxSize = 'regular') => {
    const pkg = useMemberStore.getState().activePackages.find(p => p.id === pkgId);
    if (pkg && !isExtraOrder && pkg.meals_remaining < qty) {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'เกินโควต้า!',
            text: 'จำนวนมื้อที่เหลือไม่เพียงพอ ยืนยันที่จะลงมื้ออาหารหรือไม่?',
            showCancelButton: true
        });
        if (!result.isConfirmed) return;
    }

    const menu = useMenuStore.getState().menus.find(m => m.id === menuId);
    const newSlot: MemberMealSchedule = {
      id: scheduleId || `temp_${Math.random()}`,
      package_id: pkgId,
      member_id: memberId,
      delivery_date: date,
      meal_type: meal as any,
      menu_item_id: menuId,
      quantity: qty,
      box_size: boxSize,
      delivery_time: time,
      kitchen_status: 'pending',
      notes: notes,
      is_extra_order: isExtraOrder,
      meal_order_type: orderType,
      menu_items: menu
    };

    set(state => ({
      memberSchedules: [
        ...state.memberSchedules.filter(s => !(s.delivery_date === date && s.meal_type === meal && s.package_id === pkgId)),
        newSlot
      ],
      hasUnsavedChanges: true
    }));
  },

  removeMemberSlot: async (scheduleId) => {
    if (scheduleId.toString().startsWith('temp_')) {
      set(state => ({
        memberSchedules: state.memberSchedules.filter(s => s.id !== scheduleId),
        hasUnsavedChanges: true
      }));
    } else {
      try {
        await removeMemberSchedule(scheduleId);
        set(state => ({
          memberSchedules: state.memberSchedules.filter(s => s.id !== scheduleId)
        }));
        toast.success('ลบมื้ออาหารเรียบร้อย');
      } catch (error) {
        toast.error('ลบไม่สำเร็จ');
      }
    }
  },

  applyDailyMenuToAll: async (date, mealType, menuId) => {
    const { activePackages } = useMemberStore.getState();
    const menu = useMenuStore.getState().menus.find(m => m.id === menuId);
    if (!menu) return;

    const result = await Swal.fire({
      title: 'ยืนยันการลงเมนูหลัก?',
      text: `ต้องการลงเมนู "${menu.name}" ให้กับลูกค้าทุกคน?`,
      icon: 'question',
      showCancelButton: true
    });

    if (!result.isConfirmed) return;

    const newSchedules = [...get().memberSchedules];
    activePackages.forEach(pkg => {
        if (pkg.members?.is_banned) return;
        const existingIdx = newSchedules.findIndex(s => s.delivery_date === date && s.meal_type === mealType && s.package_id === pkg.id);
        const slotData = {
            id: existingIdx !== -1 ? newSchedules[existingIdx].id : `temp_${Math.random()}`,
            package_id: pkg.id,
            member_id: pkg.member_id,
            delivery_date: date,
            meal_type: mealType as any,
            menu_item_id: menuId,
            quantity: 1,
            box_size: 'regular',
            delivery_time: pkg.members?.delivery_time || '',
            kitchen_status: 'pending',
            notes: '',
            is_extra_order: false,
            meal_order_type: 'subscription',
            menu_items: menu
        };
        if (existingIdx !== -1) newSchedules[existingIdx] = slotData as any;
        else newSchedules.push(slotData as any);
    });

    set({ memberSchedules: newSchedules, hasUnsavedChanges: true });
    toast.success('ลงเมนูให้ลูกค้าทุกคนแล้ว (แบบร่าง)');
  },

  saveChanges: async () => {
    const { memberSchedules, selectedPackageId } = get();
    if (!selectedPackageId || memberSchedules.length === 0) {
      set({ hasUnsavedChanges: false });
      return;
    }

    if (get().isSaving) return; // Prevent double save
    set({ isSaving: true });
    try {
      // 1. Prepare data for bulk upsert
      const upsertData = memberSchedules.map(s => {
        const data: any = {
          package_id: s.package_id,
          member_id: s.member_id,
          delivery_date: s.delivery_date,
          meal_type: s.meal_type,
          menu_item_id: s.menu_item_id,
          quantity: s.quantity,
          delivery_time: s.delivery_time,
          notes: s.notes,
          is_extra_order: s.is_extra_order,
          meal_order_type: s.meal_order_type,
          box_size: s.box_size,
          kitchen_status: s.kitchen_status || 'pending'
        };
        // Only include ID if it's not a temp ID
        if (!s.id.toString().startsWith('temp_')) {
          data.id = s.id;
        }
        return data;
      });

      // 2. Bulk Upsert
      const { error: upsertError } = await supabase
        .from('erp_member_meal_schedules')
        .upsert(upsertData, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      // 3. Recalculate and Update Package Balance
      // We fetch ALL schedules for this package to be 100% accurate
      const { data: allSchedules, error: countError } = await supabase
        .from('erp_member_meal_schedules')
        .select('quantity')
        .eq('package_id', selectedPackageId)
        .eq('is_extra_order', false);

      if (countError) throw countError;

      const totalUsed = allSchedules.reduce((sum, s) => sum + (s.quantity || 1), 0);
      const pkg = useMemberStore.getState().activePackages.find(p => p.id === selectedPackageId);
      
      if (pkg) {
        const newRemaining = Math.max(0, pkg.meals_total - totalUsed);
        await supabase
          .from('pinto_packages')
          .update({ meals_remaining: newRemaining })
          .eq('id', selectedPackageId);
      }

      // 4. Finalize & REFRESH immediately to get real IDs
      // This is CRITICAL to prevent duplication on subsequent saves
      await useMemberStore.getState().loadMemberData(true);
      
      // Clear the local state that was just saved to avoid "phantom" unsaved changes
      set({ hasUnsavedChanges: false, isSaving: false });
      
      Swal.fire({ icon: 'success', title: 'บันทึกแผนงานเรียบร้อย', timer: 1500, toast: true, position: 'top-end', showConfirmButton: false });
    } catch (error: any) {
      set({ isSaving: false });
      console.error('Save failed:', error);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการบันทึก', text: error.message });
    }
  },

  discardChanges: async () => {
    set({ hasUnsavedChanges: false });
    // Reload would be better but requires knowing date range
  },

  copyDayPlan: (date) => {
    const slots = get().memberSchedules.filter(s => s.delivery_date === date);
    set({ copiedDaySlots: slots });
    toast.success('คัดลอกแผนรายวันแล้ว');
  },

  pasteDayPlan: async (targetDate, pkgId, memberId) => {
    const copied = get().copiedDaySlots;
    if (!copied) return;
    
    const newSchedules = [...get().memberSchedules];
    copied.forEach(s => {
      const newSlot = { ...s, id: `temp_${Math.random()}`, delivery_date: targetDate, package_id: pkgId, member_id: memberId };
      newSchedules.push(newSlot as any);
    });
    set({ memberSchedules: newSchedules, hasUnsavedChanges: true });
    toast.success('วางแผนงานเรียบร้อย');
  },

  clearDayPlan: async (date, pkgId) => {
    set(state => ({
      memberSchedules: state.memberSchedules.filter(s => !(s.delivery_date === date && s.package_id === pkgId)),
      hasUnsavedChanges: true
    }));
  }
}));
