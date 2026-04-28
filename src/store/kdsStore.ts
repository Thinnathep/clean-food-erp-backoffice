import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { KdsTask, MenuItem, PintoPackage, GlobalPlanSlot, MemberMealSchedule, Member } from '../types';
import { 
  fetchActiveKdsTasks, finishKdsTask, fetchMenuItems, createMenuItem, uploadMenuImage, updateMenuItem, deleteMenuItem,
  fetchGlobalPlanSlots, upsertGlobalPlanSlot, deleteGlobalPlanSlot,
  fetchActivePackages, fetchMemberSchedules, upsertMemberSchedule, removeMemberSchedule, updateMemberScheduleNote,
  updateMemberProfile as updateMemberProfileApi, createMember, decrementMealsRemaining,
  fetchMembers, createPintoPackage, deletePintoPackage 
} from '../features/kds/api';

interface KdsState {
  tasks: KdsTask[];
  isLoadingTasks: boolean;
  
  // Master Data
  menus: MenuItem[];
  globalPlanSlots: GlobalPlanSlot[];
  activePackages: PintoPackage[];
  memberSchedules: MemberMealSchedule[];
  members: Member[];
  
  isLoadingData: boolean;
  isLoadingPlanner: boolean;
  error: string | null;
  
  // UI State
  searchTerm: string;
  categoryFilter: string;
  groupFilter: string;
  selectedMenuId: string | null;
  selectedPackageId: string | null;
  isMenuPanelOpen: boolean;

  // Actions
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (cat: string) => void;
  setGroupFilter: (group: string) => void;
  setSelectedMenuId: (id: string | null) => void;
  setSelectedPackageId: (id: string | null) => void;
  setIsMenuPanelOpen: (isOpen: boolean) => void;
  
  // Fetchers
  fetchTasks: () => Promise<void>;
  markTaskAsDone: (orderUuid: string) => Promise<void>;
  loadMasterData: () => Promise<void>;
  loadGlobalPlanner: (start: string, end: string) => Promise<void>;
  loadMemberPlanner: (start: string, end: string, packageId?: string) => Promise<void>;
  fetchAllMembers: () => Promise<void>;
  
  // Mutators (Global)
  assignGlobalSlot: (date: string, meal: 'meal_1' | 'meal_2', menuId: string) => Promise<void>;
  removeGlobalSlot: (date: string, meal: 'meal_1' | 'meal_2') => Promise<void>;
  
  assignMemberSlot: (
    scheduleId: string | null, 
    pkgId: string, 
    memberId: string, 
    date: string, 
    meal: string, 
    menuId: string, 
    qty: number, 
    time: string, 
    notes: string
  ) => Promise<void>;
  updateMemberNote: (scheduleId: string, note: string) => Promise<void>;
  removeMemberSlot: (scheduleId: string) => Promise<void>;
  addMenuItem: (menuItem: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  
  // Member Management
  updateMemberProfile: (memberId: string, updates: Partial<Member>) => Promise<void>;
  addNewMember: (member: Omit<Member, 'id'>) => Promise<void>;
  addPintoPackage: (pkg: Omit<PintoPackage, 'id'>) => Promise<void>;
  cancelPintoPackage: (id: string) => Promise<void>;
  
  // Draft System
  hasUnsavedChanges: boolean;
  saveMemberSchedules: () => Promise<void>;
  discardChanges: () => Promise<void>;
  
  // Copy/Paste
  copiedDaySlots: MemberMealSchedule[] | null;
  copyDayPlan: (date: string) => void;
  pasteDayPlan: (targetDate: string, pkgId: string, memberId: string) => Promise<void>;
}

export const useKdsStore = create<KdsState>()(
  persist(
    (set, get) => ({
      tasks: [],
      isLoadingTasks: false,
  
  menus: [],
  globalPlanSlots: [],
  activePackages: [],
  memberSchedules: [],
  members: [],
  isLoadingData: false,
  isLoadingPlanner: false,
  error: null,
  hasUnsavedChanges: false,
  
  searchTerm: '',
  categoryFilter: 'All',
  groupFilter: 'All',
  selectedMenuId: null,
  selectedPackageId: null,
  isMenuPanelOpen: false,

  setSearchTerm: (term) => set({ searchTerm: term }),
  setCategoryFilter: (cat) => set({ categoryFilter: cat }),
  setGroupFilter: (group) => set({ groupFilter: group }),
  setSelectedMenuId: (id) => set({ selectedMenuId: id }),
  setSelectedPackageId: (id) => set({ selectedPackageId: id }),
  setIsMenuPanelOpen: (isOpen) => set({ isMenuPanelOpen: isOpen }),

  fetchTasks: async () => {
    try {
      set({ isLoadingTasks: true, error: null });
      const data = await fetchActiveKdsTasks();
      set({ tasks: data, isLoadingTasks: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingTasks: false });
    }
  },
  markTaskAsDone: async (orderUuid) => {
    try {
      await finishKdsTask(orderUuid);
      await get().fetchTasks();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadMasterData: async () => {
    try {
      set({ isLoadingData: true, error: null });
      const [menusData, packagesData, membersData] = await Promise.all([
        fetchMenuItems(),
        fetchActivePackages(),
        fetchMembers()
      ]);
      set({ menus: menusData, activePackages: packagesData, members: membersData, isLoadingData: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
    }
  },

  fetchAllMembers: async () => {
    try {
      const data = await fetchMembers();
      set({ members: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
  
  loadGlobalPlanner: async (startDate, endDate) => {
    try {
      const slots = await fetchGlobalPlanSlots(startDate, endDate);
      set({ globalPlanSlots: slots });
    } catch (error: any) {
      console.error(error);
    }
  },

  loadMemberPlanner: async (startDate, endDate, packageId) => {
     try {
       set({ isLoadingPlanner: true });
       const schedules = await fetchMemberSchedules(startDate, endDate, packageId);
       set({ memberSchedules: schedules, isLoadingPlanner: false, hasUnsavedChanges: false });
     } catch (error: any) {
       set({ error: error.message, isLoadingPlanner: false });
     }
  },
  
  assignGlobalSlot: async (date, meal, menuId) => {
    try {
      await upsertGlobalPlanSlot(date, meal, menuId);
      // Optimistic update
      const menu = get().menus.find(m => m.id === menuId);
      const newSlot: GlobalPlanSlot = { id: Math.random().toString(), delivery_date: date, meal_type: meal, menu_item_id: menuId, menu_items: menu };
      set(state => ({
        globalPlanSlots: [...state.globalPlanSlots.filter(s => !(s.delivery_date === date && s.meal_type === meal)), newSlot]
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  removeGlobalSlot: async (date, meal) => {
    try {
      await deleteGlobalPlanSlot(date, meal);
      set(state => ({
        globalPlanSlots: state.globalPlanSlots.filter(s => !(s.delivery_date === date && s.meal_type === meal))
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  assignMemberSlot: async (scheduleId, pkgId, memberId, date, meal, menuId, qty, time, notes) => {
     // LOCAL UPDATE ONLY (DRAFT MODE)
     const menu = get().menus.find(m => m.id === menuId);
     const newSlot: MemberMealSchedule = {
       id: scheduleId || `temp_${Math.random()}`,
       package_id: pkgId,
       member_id: memberId,
       delivery_date: date,
       meal_type: meal as any,
       menu_item_id: menuId,
       quantity: qty,
       box_size: 'regular',
       delivery_time: time,
       kitchen_status: 'pending',
       notes: notes,
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
  
  saveMemberSchedules: async () => {
    const schedules = get().memberSchedules;
    const pkgId = get().selectedPackageId;
    if (!pkgId) return;

    try {
      set({ isLoadingData: true });
      
      // 1. Save all schedules to Supabase
      const promises = schedules.map(s => 
        upsertMemberSchedule(
          s.id.startsWith('temp_') ? null : s.id,
          s.package_id,
          s.member_id,
          s.delivery_date,
          s.meal_type,
          s.menu_item_id,
          s.quantity,
          s.delivery_time || '',
          s.notes
        )
      );
      
      await Promise.all(promises);

      // 2. SMART DEDUCTION: Calculate meals used per package in the current draft
      // We group by package_id and count the number of meals
      const usageMap: Record<string, number> = {};
      
      // We only count NEW schedules (temp_) or modified ones? 
      // Actually, if we are saving the WHOLE draft, we should probably only deduct 
      // what was newly added. This is tricky.
      
      // For now, let's implement the logic: 
      // Count all items in the CURRENT state that are "temp_" (newly added)
      schedules.forEach(s => {
        if (s.id.startsWith('temp_')) {
          usageMap[s.package_id] = (usageMap[s.package_id] || 0) + s.quantity;
        }
      });
      
      // Apply deductions
      const deductionPromises = Object.entries(usageMap).map(([pkgId, amount]) => 
        decrementMealsRemaining(pkgId, amount)
      );
      
      await Promise.all(deductionPromises);
      
      set({ hasUnsavedChanges: false, isLoadingData: false });
      
      // 3. REFRESH ENTIRE WEEK
      if (schedules.length > 0) {
        // Find min and max dates in the current schedules to reload the range
        const dates = schedules.map(s => s.delivery_date).sort();
        const start = dates[0];
        const end = dates[dates.length - 1];
        await get().loadMemberPlanner(start, end, pkgId);
      }
      
      // Clear localStorage draft is handled automatically by persist if we were to reset,
      // but here we just mark as saved.
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
    }
  },

  discardChanges: async () => {
    const pkgId = get().selectedPackageId;
    if (!pkgId) return;
    // We need dates to re-fetch. This is a bit tricky if we don't store view range.
    // For now, let's just trigger a reload if the user knows what they are doing.
    set({ hasUnsavedChanges: false });
  },

  updateMemberProfile: async (memberId, updates) => {
    try {
      set({ isLoadingData: true });
      
      // บันทึกทุกฟิลด์ที่ส่งมาจาก UI (รวมถึง ตำบล, อำเภอ, รหัสไปรษณีย์ และอื่นๆ)
      const updatableFields = {
        ...updates
      };
      // ป้องกันการส่ง id ซ้ำซ้อนไปที่ Supabase
      delete (updatableFields as any).id;
      delete (updatableFields as any).created_at;
      delete (updatableFields as any).updated_at;

      await updateMemberProfileApi(memberId, updatableFields);
      
      const membersData = await fetchMembers();
      
      set({ 
        members: membersData,
        isLoadingData: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
      throw error;
    }
  },

  addPintoPackage: async (pkg) => {
    try {
      set({ isLoadingData: true });
      await createPintoPackage(pkg);
      const packagesData = await fetchActivePackages();
      set({ activePackages: packagesData, isLoadingData: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
    }
  },

  cancelPintoPackage: async (id) => {
    if (!confirm('ยืนยันการยกเลิกแพ็กเกจนี้? ข้อมูลการจัดส่งจะถูกลบออกทั้งหมด')) return;
    try {
      set({ isLoadingData: true });
      await deletePintoPackage(id);
      const packagesData = await fetchActivePackages();
      set({ 
        activePackages: packagesData, 
        selectedPackageId: get().selectedPackageId === id ? null : get().selectedPackageId,
        isLoadingData: false 
      });
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
    }
  },

  addNewMember: async (member) => {
    try {
      set({ isLoadingData: true });
      await createMember(member);
      const membersData = await fetchMembers();
      set({ members: membersData, isLoadingData: false });
    } catch (error: any) {
      set({ error: error.message, isLoadingData: false });
      throw error;
    }
  },
  
  removeMemberSlot: async (scheduleId) => {
      try {
        await removeMemberSchedule(scheduleId);
        set(state => ({
          memberSchedules: state.memberSchedules.filter(s => s.id !== scheduleId)
        }));
      } catch (error: any) {
        set({ error: error.message });
      }
  },
  
  updateMemberNote: async (scheduleId, note) => {
      try {
        await updateMemberScheduleNote(scheduleId, note);
        set(state => ({
           memberSchedules: state.memberSchedules.map(s => s.id === scheduleId ? { ...s, notes: note } : s)
        }));
      } catch (error: any) {
         set({ error: error.message });
      }
  },

  addMenuItem: async (menuItem: Omit<MenuItem, 'id'>) => {
    try {
      const newItem = await createMenuItem(menuItem);
      set(state => ({ menus: [...state.menus, newItem] }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>) => {
    try {
      const updated = await updateMenuItem(id, updates);
      set(state => ({
        menus: state.menus.map(m => m.id === id ? updated : m)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteMenuItem: async (id) => {
    try {
      await deleteMenuItem(id);
      set(state => ({
        menus: state.menus.filter(m => m.id !== id)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  uploadImage: async (file) => {
    try {
      return await uploadMenuImage(file);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  copiedDaySlots: null,
  copyDayPlan: (date) => {
    const slots = get().memberSchedules.filter(s => s.delivery_date === date);
    set({ copiedDaySlots: slots });
  },
  pasteDayPlan: async (targetDate, pkgId, memberId) => {
    const slots = get().copiedDaySlots;
    if (!slots || slots.length === 0) return;

    // Use assignMemberSlot for each copied slot to keep it in Draft Mode
    for (const slot of slots) {
      await get().assignMemberSlot(
        null, // new draft record
        pkgId,
        memberId,
        targetDate,
        slot.meal_type,
        slot.menu_item_id,
        slot.quantity,
        slot.delivery_time || '',
        slot.notes || ''
      );
    }
    // No need to re-fetch or set loading, as assignMemberSlot updates local state
  }
}), {
  name: 'kds-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ 
    memberSchedules: state.memberSchedules,
    hasUnsavedChanges: state.hasUnsavedChanges,
    selectedPackageId: state.selectedPackageId
  }),
}));

// ── KDS Weekly Planner Store (Added) ──

interface PlannerStore {
  currentWeekStart: string;
  selectedDate: string | null;    // YYYY-MM-DD
  selectedMealType: string | null;  // meal_1 | meal_2
  menuSearch: string;
  categoryFilter: string;
  isPanelOpen: boolean;

  setWeek: (weekStart: string) => void;
  prevWeek: () => void;
  nextWeek: () => void;
  goToToday: () => void;
  selectSlot: (date: string, mealType: string) => void;
  clearSelection: () => void;
  setMenuSearch: (q: string) => void;
  setCategoryFilter: (c: string) => void;
}

import { getWeekStart, toISO, dayjs } from '../lib/dateUtils';

export const usePlannerStore = create<PlannerStore>((set, get) => ({
  currentWeekStart: toISO(getWeekStart()),
  selectedDate: null,
  selectedMealType: null,
  menuSearch: '',
  categoryFilter: '',
  isPanelOpen: false,

  setWeek: (w) => set({ currentWeekStart: w, selectedDate: null, selectedMealType: null, isPanelOpen: false }),
  prevWeek: () => set(s => ({
    currentWeekStart: toISO(dayjs(s.currentWeekStart).subtract(1, 'week')),
    selectedDate: null, selectedMealType: null, isPanelOpen: false
  })),
  nextWeek: () => set(s => ({
    currentWeekStart: toISO(dayjs(s.currentWeekStart).add(1, 'week')),
    selectedDate: null, selectedMealType: null, isPanelOpen: false
  })),
  goToToday: () => set({
    currentWeekStart: toISO(getWeekStart()),
    selectedDate: null, selectedMealType: null, isPanelOpen: false
  }),
  selectSlot: (date, mealType) => {
    const s = get();
    if (s.selectedDate === date && s.selectedMealType === mealType) {
      set({ selectedDate: null, selectedMealType: null, isPanelOpen: false });
    } else {
      set({ selectedDate: date, selectedMealType: mealType, isPanelOpen: true });
    }
  },
  clearSelection: () => set({ selectedDate: null, selectedMealType: null, isPanelOpen: false }),
  setMenuSearch: (menuSearch) => set({ menuSearch }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
}));
