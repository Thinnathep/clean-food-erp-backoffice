import { create } from 'zustand';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { supabase } from '../config/supabase';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { KdsTask, MenuItem, PintoPackage, GlobalPlanSlot, MemberMealSchedule, Member } from '../types';
import { 
  fetchActiveKdsTasks, finishKdsTask, fetchMenuItems, createMenuItem, uploadMenuImage, updateMenuItem, deleteMenuItem,
  fetchGlobalPlanSlots, upsertGlobalPlanSlot, deleteGlobalPlanSlot,
  fetchActivePackages, fetchMemberSchedules, removeMemberSchedule, updateMemberScheduleNote,
  updateMemberProfile as updateMemberProfileApi, createMember,
  fetchMembers, createPintoPackage, deletePintoPackage,
  createRetailOrder
} from '../features/kds/api';
import { fetchChecklistByDate, upsertChecklistItem, deleteChecklistItem, fetchMasterChecklist, addMasterItemsToDaily, addToMaster, updateMasterItem, deleteMasterItem, fetchChecklistDates, clearDailyChecklist } from '../features/kds/checklistApi';
import type { ChecklistItem, MasterChecklistItem } from '../features/kds/checklistApi';

interface KdsState {
  tasks: KdsTask[];
  isLoadingTasks: boolean;
  
  // Master Data
  menus: MenuItem[];
  globalPlanSlots: GlobalPlanSlot[];
  activePackages: PintoPackage[];
  memberSchedules: MemberMealSchedule[]; 
  members: Member[];
  
  selectedPackageId: string | null;
  isLoadingData: boolean;
  hasUnsavedChanges: boolean;
  isLoadingPlanner: boolean;
  error: string | null;
  
  // UI State
  searchTerm: string;
  categoryFilter: string;
  groupFilter: string;
  selectedMenuId: string | null;
  isMenuPanelOpen: boolean;

  // Actions
  setSearchTerm: (term: string) => void;
  setCategoryFilter: (cat: string) => void;
  setGroupFilter: (group: string) => void;
  setSelectedMenuId: (id: string | null) => void;
  setSelectedPackageId: (id: string | null) => void;
  setIsMenuPanelOpen: (isOpen: boolean) => void;
  
  // Fetchers
  fetchTasks: (silent?: boolean) => Promise<void>;
  markTaskAsDone: (orderUuid: string) => Promise<void>;
  loadMasterData: (silent?: boolean) => Promise<void>;
  loadGlobalPlanner: (start: string, end: string) => Promise<void>;
  loadMemberPlanner: (start: string, end: string, packageId?: string, silent?: boolean) => Promise<void>;
  fetchAllMembers: () => Promise<void>;
  
  // Mutators (Global)
  assignGlobalSlot: (date: string, meal: string, menuId: string) => Promise<void>;
  removeGlobalSlot: (date: string, meal: string) => Promise<void>;
  updateGlobalSlotNote: (date: string, meal: string, note: string) => Promise<void>;
  applyDailyMenuToAll: (date: string, meal: string, menuId: string) => Promise<void>;
  
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
  updateMemberNote: (scheduleId: string, note: string) => Promise<void>;
  removeMemberSlot: (scheduleId: string) => Promise<void>;
  addMenuItem: (menuItem: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  
  // Member Management
  updateMemberProfile: (memberId: string, updates: Partial<Member>) => Promise<void>;
  addNewMember: (member: Omit<Member, 'id'>) => Promise<Member>;
  addPintoPackage: (pkg: Omit<PintoPackage, 'id'>) => Promise<void>;
  cancelPintoPackage: (id: string) => Promise<void>;
  createQuickRetailOrder: (data: { 
    phone: string, 
    full_name: string, 
    menu_item_id: string,
    menu_name: string, 
    quantity: number, 
    notes?: string 
  }) => Promise<void>;
  banMember: (id: string, reason: string) => Promise<void>;
  unbanMember: (id: string, reason: string) => Promise<void>;
  
  // Draft System
  saveMemberSchedules: () => Promise<void>;
  discardChanges: () => Promise<void>;
  
  // Copy/Paste
  copiedDaySlots: MemberMealSchedule[] | null;
  copyDayPlan: (date: string) => void;
  pasteDayPlan: (targetDate: string, pkgId: string, memberId: string) => Promise<void>;
  clearDayPlan: (date: string, pkgId: string) => Promise<void>;
  clearCopiedPlan: () => void;

  // Checklist
  checklist: ChecklistItem[];
  checklistDate: string;
  setChecklistDate: (date: string) => void;
  fetchChecklist: (date: string) => Promise<void>;
  saveChecklistItem: (item: Partial<ChecklistItem>) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  
  // Master & Daily
  masterChecklist: MasterChecklistItem[];
  fetchMasterChecklist: () => Promise<void>;
  addItemsToDaily: (items: MasterChecklistItem[]) => Promise<void>;
  addItemToMaster: (item: Omit<MasterChecklistItem, 'id'>) => Promise<void>;
  updateMasterItem: (id: string, item: Partial<MasterChecklistItem>) => Promise<void>;
  removeMasterItem: (id: string) => Promise<void>;
  bulkClearChecklist: () => Promise<void>;
  
  // History
  checklistHistory: { target_date: string, total_items: number, completed_items: number }[];
  fetchChecklistHistory: () => Promise<void>;
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
      copiedDaySlots: null,
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

      fetchTasks: async (silent = false) => {
        try {
          if (!silent) set({ isLoadingTasks: true, error: null });
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
      
      checklist: [],
      checklistDate: new Date().toISOString().split('T')[0],
      setChecklistDate: (date) => set({ checklistDate: date }),
      fetchChecklist: async (date) => {
        try {
          const data = await fetchChecklistByDate(date);
          set({ checklist: data, checklistDate: date });
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      saveChecklistItem: async (item) => {
        try {
          const newItem = await upsertChecklistItem({ ...item, target_date: get().checklistDate });
          set(state => ({
            checklist: state.checklist.find(i => i.id === newItem.id)
              ? state.checklist.map(i => i.id === newItem.id ? newItem : i)
              : [newItem, ...state.checklist]
          }));
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      removeChecklistItem: async (id) => {
        try {
          await deleteChecklistItem(id);
          set(state => ({
            checklist: state.checklist.filter(i => i.id !== id)
          }));
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      masterChecklist: [],
      fetchMasterChecklist: async () => {
        try {
          const data = await fetchMasterChecklist();
          set({ masterChecklist: data });
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      addItemsToDaily: async (items) => {
        try {
          const date = get().checklistDate;
          await addMasterItemsToDaily(date, items);
          await get().fetchChecklist(date);
          Swal.fire({ icon: 'success', title: 'เพิ่มสำเร็จ', text: `เพิ่ม ${items.length} รายการลงในเช็คลิสต์แล้ว`, timer: 1500 });
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      addItemToMaster: async (item) => {
        try {
          const newItem = await addToMaster(item);
          set(state => ({
            masterChecklist: [...state.masterChecklist, newItem]
          }));
        } catch (error: any) {
          set({ error: error.message });
          // Fallback fetch if error occurs
          await get().fetchMasterChecklist();
        }
      },
      updateMasterItem: async (id, item) => {
        try {
          const updated = await updateMasterItem(id, item);
          set(state => ({
            masterChecklist: state.masterChecklist.map(m => m.id === id ? updated : m)
          }));
        } catch (error: any) {
          set({ error: error.message });
          await get().fetchMasterChecklist();
        }
      },
      removeMasterItem: async (id) => {
        // Optimistic delete
        const previousList = get().masterChecklist;
        set(state => ({
          masterChecklist: state.masterChecklist.filter(m => m.id !== id)
        }));

        try {
          await deleteMasterItem(id);
        } catch (error: any) {
          // Revert if failed
          set({ masterChecklist: previousList, error: error.message });
          Swal.fire({ icon: 'error', title: 'ลบไม่สำเร็จ', text: error.message });
        }
      },
      bulkClearChecklist: async () => {
        try {
          const date = get().checklistDate;
          await clearDailyChecklist(date);
          set({ checklist: [] });
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      checklistHistory: [],
      fetchChecklistHistory: async () => {
        try {
          const data = await fetchChecklistDates();
          set({ checklistHistory: data });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      loadMasterData: async (silent = false) => {
        try {
          if (!silent) set({ isLoadingData: true, error: null });
          const [menusData, packagesData, membersData] = await Promise.all([
            fetchMenuItems(),
            fetchActivePackages(),
            fetchMembers()
          ]);

          const allSchedules = await fetchMemberSchedules('2020-01-01', '2030-12-31');
          set({ 
            menus: menusData, 
            activePackages: packagesData, 
            members: membersData, 
            memberSchedules: allSchedules,
            isLoadingData: false 
          });
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

      loadMemberPlanner: async (startDate, endDate, packageId, silent = false) => {
         try {
           if (!silent) set({ isLoadingPlanner: true, error: null });
           if (packageId && packageId.toString().startsWith('temp_')) {
             set({ isLoadingPlanner: false });
             return;
           }
           const dbSchedules = await fetchMemberSchedules(startDate, endDate, packageId);
           
           set(state => {
             const unsavedForThisPkg = state.memberSchedules.filter(s => 
               (packageId ? s.package_id === packageId : true) && s.id.toString().startsWith('temp_')
             );

             const otherSchedules = state.memberSchedules.filter(s => {
               const isSaved = !s.id.toString().startsWith('temp_');
               const inDateRange = s.delivery_date >= startDate && s.delivery_date <= endDate;
               const matchesPackage = packageId ? s.package_id === packageId : true;
               return !(isSaved && inDateRange && matchesPackage);
             });

             const merged = [...otherSchedules, ...dbSchedules];
             
             unsavedForThisPkg.forEach(u => {
               const idx = merged.findIndex(m => 
                 m.delivery_date === u.delivery_date && 
                 m.meal_type === u.meal_type && 
                 m.package_id === u.package_id
               );
               if (idx !== -1) merged[idx] = u;
               else merged.push(u);
             });

             return { 
               memberSchedules: merged, 
               isLoadingPlanner: false,
               selectedPackageId: packageId 
             };
           });
         } catch (error: any) {
           set({ error: error.message, isLoadingPlanner: false });
         }
      },
      
      assignGlobalSlot: async (date, meal, menuId) => {
        try {
          await upsertGlobalPlanSlot(date, meal as any, menuId);
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
          await deleteGlobalPlanSlot(date, meal as any);
          set(state => ({
            globalPlanSlots: state.globalPlanSlots.filter(s => !(s.delivery_date === date && s.meal_type === meal))
          }));
        } catch (error: any) {
          set({ error: error.message });
        }
      },

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
        } catch (error: any) {
          console.error(error);
        }
      },

      applyDailyMenuToAll: async (date, mealType, menuId) => {
        const { activePackages, menus, memberSchedules } = get();
        const menu = menus.find(m => m.id === menuId);
        if (!menu) return;

        const result = await Swal.fire({
          title: 'ยืนยันการลงเมนูหลัก?',
          text: `ต้องการลงเมนู "${menu.name}" ให้กับลูกค้าทุกคนที่มีแพ็กเกจในวันที่ ${date} ใช่หรือไม่?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'ยืนยัน',
          cancelButtonText: 'ยกเลิก'
        });

        if (!result.isConfirmed) return;

        set({ isLoadingData: true });
        try {
          const newSchedules = [...memberSchedules];
          
          activePackages.forEach(pkg => {
            const member = Array.isArray(pkg.members) ? pkg.members[0] : pkg.members;
            if (member?.is_banned) return;

            // Find existing slot for this member on this date/meal
            const existingIdx = newSchedules.findIndex(s => 
              s.delivery_date === date && 
              s.meal_type === mealType && 
              s.package_id === pkg.id
            );

            if (existingIdx !== -1) {
              // Update existing
              newSchedules[existingIdx] = {
                ...newSchedules[existingIdx],
                menu_item_id: menuId,
                menu_items: menu,
                kitchen_status: 'pending'
              };
            } else {
              // Create new slot
              newSchedules.push({
                id: `temp_${Math.random()}`,
                package_id: pkg.id,
                member_id: pkg.member_id,
                delivery_date: date,
                meal_type: mealType as any,
                menu_item_id: menuId,
                quantity: 1,
                box_size: 'regular',
                delivery_time: member?.delivery_time || '',
                kitchen_status: 'pending',
                notes: '',
                is_extra_order: false,
                meal_order_type: 'subscription',
                menu_items: menu
              });
            }
          });

          set({ 
            memberSchedules: newSchedules, 
            hasUnsavedChanges: true,
            isLoadingData: false 
          });

          toast.success(`ลงเมนู "${menu.name}" ให้ลูกค้าทุกคนแล้ว`, {
            description: "อย่าลืมกดปุ่ม 'ยืนยันบันทึกแผนงาน' เพื่อบันทึกข้อมูล"
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingData: false });
          Swal.fire('Error', 'ไม่สามารถลงเมนูได้: ' + error.message, 'error');
        }
      },

      assignMemberSlot: async (scheduleId, pkgId, memberId, date, meal, menuId, qty, time, notes, isExtraOrder = false, orderType = 'subscription', boxSize = 'regular') => {
         const pkg = get().activePackages.find(p => p.id === pkgId);
         if (pkg && !isExtraOrder) {
           const currentRemaining = pkg.meals_remaining;
           const newRemaining = currentRemaining - qty;

           if (newRemaining < 0) {
             const result = await Swal.fire({
               icon: 'warning',
               title: 'เกินโควต้าแพ็กเกจ!',
               text: `ลูกค้าลงมื้ออาหารเกินโควต้าที่เหลืออยู่ (เหลือ ${currentRemaining} มื้อ, กำลังจะลง ${qty} มื้อ) ยืนยันที่จะลงมื้ออาหารที่เกินโควต้าหรือไม่?`,
               showCancelButton: true,
               confirmButtonText: 'ยืนยัน (ยอมให้ติดลบ)',
               cancelButtonText: 'ยกเลิก',
               confirmButtonColor: '#f59e0b'
             });

             if (!result.isConfirmed) return;
           }
         }

         const menu = get().menus.find(m => m.id === menuId);
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

      saveMemberSchedules: async () => {
        const schedules = get().memberSchedules;
        const pkgId = get().selectedPackageId;
        const isRetail = pkgId?.toString().startsWith('retail_');
        const pkg = get().activePackages.find(p => p.id === pkgId);
        
        if (!pkgId || (!pkg && !isRetail)) return;

        try {
          set({ isLoadingData: true });
          const packageSchedules = schedules.filter(s => s.package_id === pkgId);

          if (pkg && !isRetail) {
            const totalSubscriptionPlanned = packageSchedules
              .filter(s => !s.is_extra_order)
              .reduce((sum, s) => sum + (s.quantity || 1), 0);
            
            const projectedRemaining = pkg.meals_total - totalSubscriptionPlanned;

            if (projectedRemaining < 0) {
              const result = await Swal.fire({
                icon: 'warning',
                title: 'มื้ออาหารเกินโควต้า!',
                text: `คุณกำลังบันทึกมื้ออาหารเกินโควต้า (โควต้าทั้งหมด ${pkg.meals_total} มื้อ, ใช้ไปแล้ว ${totalSubscriptionPlanned} มื้อ) ยืนยันการบันทึกหรือไม่?`,
                showCancelButton: true,
                confirmButtonText: 'ยืนยันการบันทึก',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#f59e0b'
              });

              if (!result.isConfirmed) {
                set({ isLoadingData: false });
                return;
              }
            }
          }

          for (const s of packageSchedules) {
            const { error } = await supabase
              .from('erp_member_meal_schedules')
              .upsert({
                id: s.id && s.id.toString().startsWith('temp_') ? undefined : s.id,
                package_id: isRetail ? null : s.package_id,
                member_id: s.member_id,
                delivery_date: s.delivery_date,
                meal_type: s.meal_type,
                menu_item_id: s.menu_item_id,
                quantity: s.quantity,
                delivery_time: s.delivery_time,
                notes: s.notes,
                kitchen_status: s.kitchen_status || 'pending',
                is_extra_order: s.is_extra_order || false,
                meal_order_type: s.meal_order_type || 'subscription'
              });
            if (error) throw error;
          }

          if (pkgId && !isRetail) {
            const allSchedulesInDB = await fetchMemberSchedules('2020-01-01', '2030-12-31', pkgId);
            const actualSubscriptionUsedTotal = allSchedulesInDB
              .filter(s => !s.is_extra_order)
              .reduce((sum, s) => sum + (s.quantity || 1), 0);
              
            const finalRemaining = (pkg?.meals_total || 0) - actualSubscriptionUsedTotal;

            await supabase
              .from('pinto_packages')
              .update({ meals_remaining: finalRemaining })
              .eq('id', pkgId);
          }

          await get().loadMasterData();
          set({ hasUnsavedChanges: false, isLoadingData: false });

          Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            timer: 1500,
            showConfirmButton: false
          });
        } catch (error: any) {
          console.error('Save error:', error);
          set({ error: error.message, isLoadingData: false });
          Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.message
          });
        }
      },

      discardChanges: async () => {
        set({ hasUnsavedChanges: false });
        await get().loadMasterData();
      },

      updateMemberProfile: async (memberId, updates) => {
        try {
          set({ isLoadingData: true });
          const updatableFields = { ...updates };
          delete (updatableFields as any).id;
          delete (updatableFields as any).created_at;
          delete (updatableFields as any).updated_at;

          await updateMemberProfileApi(memberId, updatableFields);
          const [membersData, packagesData] = await Promise.all([
            fetchMembers(),
            fetchActivePackages()
          ]);
          
          set({ 
            members: membersData,
            activePackages: packagesData,
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
          const newMember = await createMember(member);
          const membersData = await fetchMembers();
          set({ members: membersData, isLoadingData: false });
          return newMember;
        } catch (error: any) {
          set({ error: error.message, isLoadingData: false });
          throw error;
        }
      },

      createQuickRetailOrder: async (data) => {
        try {
          set({ isLoadingData: true });
          let memberId = '';
          const existingMember = get().members.find(m => m.phone === data.phone);
          
          if (existingMember) {
            if ((existingMember as any).is_banned) {
              throw new Error(`เบอร์โทรศัพท์นี้ถูกระงับการใช้งาน: ${(existingMember as any).ban_reason || 'ไม่ระบุเหตุผล'}`);
            }
            memberId = existingMember.id;
          } else {
            const newMember = await createMember({
              full_name: data.full_name,
              phone: data.phone,
              member_type: 'retail',
              source: 'Quick Order'
            });
            memberId = newMember.id;
            await get().loadMasterData(); 
          }

          await createRetailOrder({
            member_id: memberId,
            menu_item_id: data.menu_item_id,
            menu_name: data.menu_name,
            quantity: data.quantity,
            notes: data.notes
          });

          await get().fetchTasks(); 
          set({ isLoadingData: false });
        } catch (error: any) {
          set({ error: error.message, isLoadingData: false });
          throw error;
        }
      },

      banMember: async (id, reason) => {
        try {
          set({ isLoadingData: true });
          
          const { error: memberError } = await supabase
            .from('members')
            .update({ 
              is_banned: true, 
              ban_reason: reason,
              banned_at: new Date().toISOString()
            })
            .eq('id', id);

          if (memberError) throw memberError;

          const { data: member } = await supabase
            .from('members')
            .select('phone, full_name')
            .eq('id', id)
            .single();

          if (member) {
            await supabase.from('erp_blacklist').upsert({
              phone: member.phone,
              full_name: member.full_name,
              reason: reason
            });
          }

          await supabase.from('erp_member_ban_logs').insert({
            member_id: id,
            action: 'BAN',
            reason: reason
          });

          await get().loadMasterData();
          set({ isLoadingData: false });
          
          Swal.fire({
            icon: 'success',
            title: 'ระงับผู้ใช้งานเรียบร้อยแล้ว',
            text: 'รายชื่อนี้จะถูกจัดอยู่ใน Blacklist ของระบบ',
            timer: 2000
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingData: false });
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
          throw error;
        }
      },

      unbanMember: async (id, reason) => {
        set({ isLoadingData: true });
        try {
          const { error } = await supabase
            .from('members')
            .update({ 
              is_banned: false,
              ban_reason: null,
              banned_at: null
            })
            .eq('id', id);

          if (error) throw error;

          const member = get().members.find(m => m.id === id);
          if (member) {
            await supabase.from('erp_blacklist').delete().eq('phone', member.phone);
            await supabase.from('erp_member_ban_logs').insert({
              member_id: id,
              action: 'UNBAN',
              reason: reason
            });
          }

          await get().loadMasterData();
          set({ isLoadingData: false });
          
          Swal.fire({
            icon: 'success',
            title: 'ยกเลิกการระงับสำเร็จ',
            text: 'สมาชิกสามารถสั่งอาหารได้ตามปกติแล้ว',
            timer: 2000
          });
        } catch (error: any) {
          set({ error: error.message, isLoadingData: false });
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
          throw error;
        }
      },

      removeMemberSlot: async (scheduleId) => {
          try {
            const schedule = get().memberSchedules.find(s => s.id === scheduleId);
            const pkgId = get().selectedPackageId;
            if (schedule && !scheduleId.startsWith('temp_') && pkgId) {
              await removeMemberSchedule(scheduleId);
              const allPackageSchedules = await fetchMemberSchedules('2020-01-01', '2030-12-31', pkgId);
              const totalUsed = allPackageSchedules
                .filter(s => !s.is_extra_order)
                .reduce((sum, s) => sum + (s.quantity || 1), 0);
              
              const targetPackage = get().activePackages.find(p => p.id === pkgId);
              if (targetPackage) {
                const newRemaining = Math.max(0, targetPackage.meals_total - totalUsed);
                const { error } = await supabase
                  .from('pinto_packages')
                  .update({ meals_remaining: newRemaining })
                  .eq('id', targetPackage.id);
                if (error) throw new Error(error.message);
                
                set(state => ({
                  activePackages: state.activePackages.map(p => 
                    p.id === targetPackage.id ? { ...p, meals_remaining: newRemaining } : p
                  )
                }));
              }
            }
            
            set(state => ({
              memberSchedules: state.memberSchedules.filter(s => s.id !== scheduleId),
              hasUnsavedChanges: true
            }));
          } catch (error: any) {
            set({ error: error.message });
          }
      },
      
      updateMemberNote: async (scheduleId, note) => {
          try {
            if (!scheduleId.startsWith('temp_')) {
              await updateMemberScheduleNote(scheduleId, note);
            }
            set(state => ({
               memberSchedules: state.memberSchedules.map(s => s.id === scheduleId ? { ...s, notes: note } : s),
               hasUnsavedChanges: true
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

      copyDayPlan: (date) => {
        const pkgId = get().selectedPackageId;
        const slots = get().memberSchedules.filter(s => s.delivery_date === date && s.package_id === pkgId);
        set({ copiedDaySlots: slots });
      },
      pasteDayPlan: async (targetDate, pkgId, memberId) => {
        const slots = get().copiedDaySlots;
        if (!slots || slots.length === 0) return;
        for (const slot of slots) {
          await get().assignMemberSlot(
            null,
            pkgId,
            memberId,
            targetDate,
            slot.meal_type,
            slot.menu_item_id,
            slot.quantity,
            slot.delivery_time || '',
            slot.notes || '',
            slot.is_extra_order || false,
            slot.meal_order_type || 'subscription',
            slot.box_size || 'regular'
          );
        }
      },
      clearDayPlan: async (date, pkgId) => {
        const slotsToDelete = get().memberSchedules.filter(s => s.delivery_date === date && s.package_id === pkgId);
        try {
          const realIds = slotsToDelete.filter(s => !s.id.startsWith('temp_')).map(s => s.id);
          if (realIds.length > 0) {
            for (const id of realIds) {
              await removeMemberSchedule(id);
            }
          }
          set(state => ({
            memberSchedules: state.memberSchedules.filter(s => !(s.delivery_date === date && s.package_id === pkgId)),
            hasUnsavedChanges: true
          }));
        } catch (error: any) {
          set({ error: error.message });
        }
      },
      clearCopiedPlan: () => set({ copiedDaySlots: null })
    }), 
    {
      name: 'kds-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        memberSchedules: state.memberSchedules,
        hasUnsavedChanges: state.hasUnsavedChanges,
        selectedPackageId: state.selectedPackageId
      }),
    }
  )
);

// ── KDS Weekly Planner Store ──
interface PlannerStore {
  currentWeekStart: string;
  selectedDate: string | null;
  selectedMealType: string | null;
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
