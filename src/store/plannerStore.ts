import { create } from 'zustand';
import { dayjs } from '../lib/dateUtils';
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
  
  // UI Selection State
  selectedDate: string | null;
  selectedMealType: string | null;
  isPanelOpen: boolean;
  categoryFilter: string;

  setSelectedPackageId: (id: string | null) => void;
  loadGlobalPlanner: (start: string, end: string) => Promise<void>;
  loadMemberPlanner: (start: string, end: string, packageId?: string, silent?: boolean) => Promise<void>;
  
  // Selection Actions
  setCategoryFilter: (cat: string) => void;
  clearSelection: () => void;
  openMenuPanel: (date: string, meal: string) => void;
  
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
    boxSize?: string,
    isCompensatory?: boolean
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
  applyCycleTemplate: (startDate: string, endDate: string, category?: string) => Promise<void>;
  applyTemplateToMember: (
    pkgId: string, 
    memberId: string, 
    category: string, 
    options?: {
      startDate?: string;
      templateWeek?: number | 'all';
      overwriteRule?: 'skip' | 'overwrite';
      fillUntilDepleted?: boolean;
    }
  ) => Promise<void>;
  getProjectedRemaining: (pkgId: string) => number;
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
  selectedDate: null,
  selectedMealType: null,
  isPanelOpen: false,
  categoryFilter: '',

  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  clearSelection: () => set({ selectedDate: null, selectedMealType: null, isPanelOpen: false }),
  openMenuPanel: (date, meal) => set({ selectedDate: date, selectedMealType: meal, isPanelOpen: true }),
  
  getProjectedRemaining: (pkgId: string) => {
    const pkg = useMemberStore.getState().activePackages.find(p => p.id === pkgId);
    if (!pkg) return 0;
    const dbRemaining = pkg.meals_remaining ?? 0;
    const currentWeekSubQty = get().memberSchedules
      .filter(s => s.package_id === pkgId && !s.is_extra_order && !s.is_compensatory)
      .reduce((sum, s) => sum + (s.quantity || 1), 0);
    const delta = currentWeekSubQty - get().initialWeekSubscriptionQty;
    return dbRemaining - delta;
  },

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
        .filter(s => !s.is_extra_order && !s.is_compensatory)
        .reduce((sum, s) => sum + (s.quantity || 1), 0);

      // Preserve unsaved temp schedules so they don't disappear when navigating weeks
      const unsavedSchedules = get().memberSchedules.filter(s => s.id.toString().startsWith('temp_'));
      
      // Filter out overlapping DB records if an unsaved schedule exists for that date/meal
      const dbData = data.filter(dbSlot => {
        return !unsavedSchedules.some(u => 
          u.delivery_date === dbSlot.delivery_date && 
          u.meal_type === dbSlot.meal_type && 
          u.package_id === dbSlot.package_id
        );
      });

      const mergedSchedules = [...dbData, ...unsavedSchedules];

      set({ 
        memberSchedules: mergedSchedules, 
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

  assignMemberSlot: async (scheduleId, pkgId, memberId, date, meal, menuId, qty, time, notes, isExtraOrder = false, orderType = 'subscription', boxSize = 'regular', isCompensatory = false) => {
    const pkg = useMemberStore.getState().activePackages.find(p => p.id === pkgId);
    
    // Use the projected remaining to account for unsaved changes in the current view
    const projectedRemaining = get().getProjectedRemaining(pkgId);
    
    // If it's a new slot (or we are increasing quantity), check if we have enough quota
    const existingSlot = get().memberSchedules.find(s => s.id === scheduleId);
    const existingQty = existingSlot && !existingSlot.is_extra_order && !existingSlot.is_compensatory ? (existingSlot.quantity || 1) : 0;
    const netQtyIncrease = qty - existingQty;

    if (pkg && !isExtraOrder && !isCompensatory && projectedRemaining < netQtyIncrease) {
        toast.error('โควต้าไม่พอ! จำนวนมื้อที่เหลือไม่เพียงพอ ไม่สามารถลงมื้ออาหารปกติได้');
        return;
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
      is_compensatory: isCompensatory,
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
        const scheduleToDelete = get().memberSchedules.find(s => s.id === scheduleId);
        await removeMemberSchedule(scheduleId);
        
        set(state => ({
          memberSchedules: state.memberSchedules.filter(s => s.id !== scheduleId)
        }));
        
        if (scheduleToDelete && scheduleToDelete.package_id && !scheduleToDelete.package_id.toString().startsWith('retail_')) {
          const { data: allSchedules } = await supabase
            .from('erp_member_meal_schedules')
            .select('quantity, is_extra_order, is_compensatory')
            .eq('package_id', scheduleToDelete.package_id);
            
          if (allSchedules) {
            const totalUsed = allSchedules
              .filter(s => !s.is_extra_order && !s.is_compensatory)
              .reduce((sum, s) => sum + (s.quantity || 1), 0);
              
            const pkg = useMemberStore.getState().activePackages.find(p => p.id === scheduleToDelete.package_id);
            if (pkg) {
              const newRemaining = pkg.meals_total - totalUsed;
              await supabase
                .from('pinto_packages')
                .update({ meals_remaining: newRemaining })
                .eq('id', scheduleToDelete.package_id);
                
              await useMemberStore.getState().loadMemberData(true);
            }
          }
        }
        
        toast.success('ลบมื้ออาหารและคืนโควต้าเรียบร้อย');
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
    let skippedCount = 0;
    
    activePackages.forEach(pkg => {
        if (pkg.members?.is_banned) return;
        const existingIdx = newSchedules.findIndex(s => s.delivery_date === date && s.meal_type === mealType && s.package_id === pkg.id);
        
        // Strictly check quota for new slots
        if (existingIdx === -1) {
          const currentWeekSubQty = newSchedules
            .filter(s => s.package_id === pkg.id && !s.is_extra_order && !s.is_compensatory)
            .reduce((sum, s) => sum + (s.quantity || 1), 0);
          const delta = currentWeekSubQty - (pkg.id === get().selectedPackageId ? get().initialWeekSubscriptionQty : 0);
          const rem = (pkg.meals_remaining ?? 0) - delta;
          if (rem <= 0) {
            skippedCount++;
            return; // Skip this package as it has no quota
          }
        }
        
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
    
    if (skippedCount > 0) {
      toast.warning(`ลงเมนูให้ลูกค้าทุกคนแล้ว (ข้าม ${skippedCount} แพ็กเกจที่โควต้าหมด)`);
    } else {
      toast.success('ลงเมนูให้ลูกค้าทุกคนแล้ว (แบบร่าง)');
    }
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
      // 1. Prepare data - Separate into updates (have ID) and inserts (temp ID)
      const toUpdate: any[] = [];
      const toInsert: any[] = [];

      memberSchedules.forEach(s => {
        const isTemp = s.id.toString().startsWith('temp_');
        const data: any = {
          package_id: s.package_id?.toString().startsWith('retail_') ? null : s.package_id,
          member_id: s.member_id,
          delivery_date: s.delivery_date,
          meal_type: s.meal_type,
          menu_item_id: s.menu_item_id,
          quantity: s.quantity,
          delivery_time: s.delivery_time,
          notes: s.notes,
          is_extra_order: s.is_extra_order,
          meal_order_type: s.meal_order_type,
          is_compensatory: s.is_compensatory || false,
          box_size: s.box_size,
          kitchen_status: s.kitchen_status || 'pending'
        };

        if (isTemp) {
          toInsert.push(data);
        } else {
          data.id = s.id;
          toUpdate.push(data);
        }
      });

      // 2. Perform DB operations
      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('erp_member_meal_schedules')
          .upsert(toUpdate, { onConflict: 'id' });
        if (updateError) throw updateError;
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('erp_member_meal_schedules')
          .insert(toInsert);
        if (insertError) throw insertError;
      }

      let pkg: any;

      // 3. Recalculate and Update Package Balance
      // We fetch ALL schedules for this package to be 100% accurate
      if (selectedPackageId && !selectedPackageId.toString().startsWith('retail_')) {
        const { data: allSchedules, error: countError } = await supabase
          .from('erp_member_meal_schedules')
          .select('quantity, is_extra_order, is_compensatory')
          .eq('package_id', selectedPackageId);

        if (countError) throw countError;

        const totalUsed = allSchedules
          .filter(s => !s.is_extra_order && !s.is_compensatory)
          .reduce((sum, s) => sum + (s.quantity || 1), 0);
        pkg = useMemberStore.getState().activePackages.find(p => p.id === selectedPackageId);
        
        if (pkg) {
          // ALLOW NEGATIVE: Do not use Math.max(0, ...) so that exceeded meals show correctly.
          const newRemaining = pkg.meals_total - totalUsed;
          await supabase
            .from('pinto_packages')
            .update({ meals_remaining: newRemaining })
            .eq('id', selectedPackageId);
        }
      }

      // 4. Finalize & REFRESH immediately to get real IDs
      // This is CRITICAL to prevent duplication on subsequent saves
      await useMemberStore.getState().loadMemberData(true);
      
      // Clear the local state that was just saved to avoid "phantom" unsaved changes and wipe temp_ IDs
      set({ hasUnsavedChanges: false, isSaving: false, memberSchedules: [] });
      
      const startStr = dayjs().subtract(3, 'month').format('YYYY-MM-DD');
      const endStr = dayjs().add(9, 'month').format('YYYY-MM-DD');
      await get().loadMemberPlanner(startStr, endStr, selectedPackageId, true);
      
      toast.success('บันทึกแผนงานเรียบร้อย ✨');
    } catch (error: any) {
      set({ isSaving: false });
      console.error('Save failed:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    }
  },

  discardChanges: async () => {
    set({ hasUnsavedChanges: false, memberSchedules: [] });
    const selectedPackageId = get().selectedPackageId;
    if (selectedPackageId) {
      const startStr = dayjs().subtract(3, 'month').format('YYYY-MM-DD');
      const endStr = dayjs().add(9, 'month').format('YYYY-MM-DD');
      await get().loadMemberPlanner(startStr, endStr, selectedPackageId, true);
    }
    toast.success('ยกเลิกการเปลี่ยนแปลงเรียบร้อย');
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
    let skipped = false;
    
    copied.forEach(s => {
      if (!s.is_extra_order && !s.is_compensatory) {
        const currentWeekSubQty = newSchedules
          .filter(sch => sch.package_id === pkgId && !sch.is_extra_order && !sch.is_compensatory)
          .reduce((sum, sch) => sum + (sch.quantity || 1), 0);
        const delta = currentWeekSubQty - get().initialWeekSubscriptionQty;
        const pkg = useMemberStore.getState().activePackages.find(p => p.id === pkgId);
        const rem = (pkg?.meals_remaining ?? 0) - delta;
        
        if (rem < (s.quantity || 1)) {
          skipped = true;
          return; // Skip this slot due to insufficient quota
        }
      }
      const newSlot = { ...s, id: `temp_${Math.random()}`, delivery_date: targetDate, package_id: pkgId, member_id: memberId };
      newSchedules.push(newSlot as any);
    });
    
    set({ memberSchedules: newSchedules, hasUnsavedChanges: true });
    if (skipped) {
      toast.warning('วางแผนงานแล้ว (ข้ามบางมื้อเนื่องจากโควต้าไม่พอ)');
    } else {
      toast.success('วางแผนงานเรียบร้อย');
    }
  },

  clearDayPlan: async (date, pkgId) => {
    try {
      const toDelete = get().memberSchedules.filter(s => s.delivery_date === date && s.package_id === pkgId && !s.id.toString().startsWith('temp_'));
      
      for (const s of toDelete) {
        await removeMemberSchedule(s.id);
      }
      
      set(state => ({
        memberSchedules: state.memberSchedules.filter(s => !(s.delivery_date === date && s.package_id === pkgId)),
        hasUnsavedChanges: true
      }));
      
      if (toDelete.length > 0 && !pkgId.toString().startsWith('retail_')) {
        const { data: allSchedules } = await supabase
          .from('erp_member_meal_schedules')
          .select('quantity, is_extra_order, is_compensatory')
          .eq('package_id', pkgId);
          
        if (allSchedules) {
          const totalUsed = allSchedules
            .filter(s => !s.is_extra_order && !s.is_compensatory)
            .reduce((sum, s) => sum + (s.quantity || 1), 0);
            
          const pkg = useMemberStore.getState().activePackages.find(p => p.id === pkgId);
          if (pkg) {
            const newRemaining = pkg.meals_total - totalUsed;
            await supabase
              .from('pinto_packages')
              .update({ meals_remaining: newRemaining })
              .eq('id', pkgId);
              
            await useMemberStore.getState().loadMemberData(true);
          }
        }
      }
      toast.success('ล้างแผนและคืนโควต้าเรียบร้อย');
    } catch (error) {
      toast.error('ลบไม่สำเร็จ');
    }
  },

  applyCycleTemplate: async (start: string, end: string, category: string = 'normal') => {
    try {
      set({ isSaving: true });
      
      // 1. Fetch templates for this category
      const { data: templates, error: fetchErr } = await supabase
        .from('menu_cycle_templates')
        .select('*')
        .eq('category', category)
        .order('week_number')
        .order('day_of_week')
        .order('meal_slot');

      if (fetchErr) throw fetchErr;
      if (!templates || templates.length === 0) {
        throw new Error(`ไม่พบข้อมูลเมนูในระบบ Template หมวด ${category}`);
      }

      // 2. Fetch all menus to map by name
      const allMenus = useMenuStore.getState().menus;

      const startDate = dayjs(start);
      const endDate = dayjs(end);
      let curr = startDate;
      
      const insertData: any[] = [];

      while (curr.isBefore(endDate) || curr.isSame(endDate, 'day')) {
        const dateStr = curr.format('YYYY-MM-DD');
        const dayOfWeek = curr.day(); // 0=Sun, 1=Mon, ..., 6=Sat
        
        // Skip Sunday if no template (day 0)
        if (dayOfWeek !== 0) {
          // Determine week index (1-4)
          // Simple logic: Use (day of year / 7 % 4) or just relative to start
          // For now, let's use week of year % 4
          let weekNum = (curr.isoWeek() % 4);
          if (weekNum === 0) weekNum = 4;

          const dailyTemplates = templates.filter(t => t.week_number === weekNum && t.day_of_week === dayOfWeek);
          
          dailyTemplates.forEach(t => {
            const menu = allMenus.find(m => m.name === t.menu_name);
            if (menu) {
              insertData.push({
                delivery_date: dateStr,
                meal_type: `meal_${t.meal_slot}`,
                menu_item_id: menu.id,
                menu_name: menu.name,
                calories: menu.calories,
                protein: menu.protein,
                carbs: menu.carbs,
                fat: menu.fat,
                price: menu.base_price
              });
            }
          });
        }
        curr = curr.add(1, 'day');
      }

      if (insertData.length === 0) {
        throw new Error('ไม่พบเมนูที่ตรงกันในระบบฐานข้อมูลหลัก');
      }

      // 3. Bulk Upsert
      const { error } = await supabase
        .from('pinto_meal_plan')
        .upsert(insertData, { onConflict: 'delivery_date,meal_type' });

      if (error) throw error;

      await get().loadGlobalPlanner(start, end);
      set({ isSaving: false });
      toast.success('ลงเมนูรอบ 4 สัปดาห์เรียบร้อย');
    } catch (error: any) {
      set({ isSaving: false });
      console.error(error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลงเมนู');
    }
  },

  applyTemplateToMember: async (pkgId, memberId, category, options) => {
    try {
      set({ isLoading: true });
      
      // 1. Fetch templates for this category
      const { data: templates, error: fetchErr } = await supabase
        .from('menu_cycle_templates')
        .select('*')
        .eq('category', category)
        .order('week_number')
        .order('day_of_week')
        .order('meal_slot');

      if (fetchErr) throw fetchErr;
      if (!templates || templates.length === 0) {
        throw new Error(`ไม่พบข้อมูลเมนูในระบบ Template หมวด ${category}`);
      }

      const allMenus = useMenuStore.getState().menus;
      const newSchedules = [...get().memberSchedules];
      
      let skipped = false;
      const startDate = options?.startDate ? dayjs(options?.startDate) : dayjs().startOf('isoWeek');
      let currDate = startDate;
      
      const getRemainingQuota = (schedules: any[]) => {
        const currentWeekSubQty = schedules
          .filter(sch => sch.package_id === pkgId && !sch.is_extra_order && !sch.is_compensatory)
          .reduce((sum, sch) => sum + (sch.quantity || 1), 0);
        const delta = currentWeekSubQty - get().initialWeekSubscriptionQty;
        const pkg = useMemberStore.getState().activePackages.find(p => p.id === pkgId);
        return (pkg?.meals_remaining ?? 0) - delta;
      };

      const fillUntilDepleted = options?.fillUntilDepleted || false;
      const maxDays = fillUntilDepleted ? 365 : 7; 
      let daysProcessed = 0;
      let currentTemplateWeek = options?.templateWeek === 'all' ? 1 : (options?.templateWeek || 1);

      while (daysProcessed < maxDays) {
        const remainingQuota = getRemainingQuota(newSchedules);
        if (remainingQuota <= 0) {
          skipped = true;
          break; 
        }

        const dayOfWeek = currDate.day();
        if (dayOfWeek !== 0) { 
          const dailyTemplates = templates.filter(t => t.week_number === currentTemplateWeek && t.day_of_week === dayOfWeek);
          
          for (const t of dailyTemplates) {
            if (getRemainingQuota(newSchedules) <= 0) {
              skipped = true; break;
            }

            const menu = allMenus.find(m => m.name === t.menu_name);
            if (menu) {
              const targetDateStr = currDate.format('YYYY-MM-DD');
              const mealKey = `meal_${t.meal_slot}`;
              
              const existingIdx = newSchedules.findIndex(s => 
                s.delivery_date === targetDateStr && 
                s.meal_type === mealKey && 
                s.package_id === pkgId
              );

              // Overwrite logic
              if (existingIdx !== -1 && options?.overwriteRule === 'skip') {
                continue; 
              }

              const slotData = {
                id: existingIdx !== -1 ? newSchedules[existingIdx].id : `temp_${Math.random()}`,
                package_id: pkgId,
                member_id: memberId,
                delivery_date: targetDateStr,
                meal_type: mealKey as any,
                menu_item_id: menu.id,
                quantity: 1,
                box_size: 'regular',
                delivery_time: '', 
                kitchen_status: 'pending',
                notes: '',
                is_extra_order: false,
                meal_order_type: 'subscription',
                menu_items: menu
              };

              if (existingIdx !== -1) newSchedules[existingIdx] = slotData as any;
              else newSchedules.push(slotData as any);
            }
          }
        }
        
        currDate = currDate.add(1, 'day');
        daysProcessed++;
        
        // Next Monday: Advance week
        if (currDate.day() === 1) {
          if (options?.templateWeek === 'all' || fillUntilDepleted) {
            currentTemplateWeek = (currentTemplateWeek % 4) + 1;
          } else {
            if (!fillUntilDepleted) break; // Finished 1 week
          }
        }
      }

      set({ memberSchedules: newSchedules, hasUnsavedChanges: true, isLoading: false });
      if (skipped) {
        toast.warning(`ดึงเมนูแม่แบบเรียบร้อย (หยุดดึงเนื่องจากโควต้าหมด)`);
      } else {
        toast.success(`ดึงเมนูแม่แบบเรียบร้อย (กดบันทึกเพื่อยืนยัน)`);
      }
    } catch (error: any) {
      set({ isLoading: false });
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลงเมนู');
    }
  }
}));
