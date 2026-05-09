import { create } from 'zustand';
import { 
  fetchChecklistByDate, upsertChecklistItem, deleteChecklistItem, 
  fetchMasterChecklist, addMasterItemsToDaily, addToMaster, 
  updateMasterItem, deleteMasterItem, fetchChecklistDates, clearDailyChecklist 
} from '../features/kds/checklistApi';
import type { ChecklistItem, MasterChecklistItem } from '../features/kds/checklistApi';
import { toast } from 'sonner';
import Swal from 'sweetalert2';

interface ChecklistState {
  checklist: ChecklistItem[];
  masterChecklist: MasterChecklistItem[];
  checklistHistory: { target_date: string, total_items: number, completed_items: number }[];
  checklistDate: string;
  isLoading: boolean;

  setChecklistDate: (date: string) => void;
  loadChecklist: (date: string) => Promise<void>;
  saveItem: (item: Partial<ChecklistItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  
  loadMasterChecklist: () => Promise<void>;
  addMasterToDaily: (items: MasterChecklistItem[]) => Promise<void>;
  addToMaster: (item: Omit<MasterChecklistItem, 'id'>) => Promise<void>;
  updateMaster: (id: string, item: Partial<MasterChecklistItem>) => Promise<void>;
  removeMaster: (id: string) => Promise<void>;
  
  clearDaily: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklist: [],
  masterChecklist: [],
  checklistHistory: [],
  checklistDate: new Date().toISOString().split('T')[0],
  isLoading: false,

  setChecklistDate: (date) => set({ checklistDate: date }),

  loadChecklist: async (date) => {
    try {
      set({ isLoading: true });
      const data = await fetchChecklistByDate(date);
      set({ checklist: data, checklistDate: date, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      toast.error('โหลดเช็คลิสต์ไม่สำเร็จ');
    }
  },

  saveItem: async (item) => {
    try {
      const newItem = await upsertChecklistItem({ ...item, target_date: get().checklistDate });
      set(state => ({
        checklist: state.checklist.find(i => i.id === newItem.id)
          ? state.checklist.map(i => i.id === newItem.id ? newItem : i)
          : [newItem, ...state.checklist]
      }));
    } catch (error: any) {
      toast.error('บันทึกไม่สำเร็จ');
    }
  },

  removeItem: async (id) => {
    try {
      await deleteChecklistItem(id);
      set(state => ({ checklist: state.checklist.filter(i => i.id !== id) }));
      toast.success('ลบรายการแล้ว');
    } catch (error) {
      toast.error('ลบไม่สำเร็จ');
    }
  },

  loadMasterChecklist: async () => {
    try {
      const data = await fetchMasterChecklist();
      set({ masterChecklist: data });
    } catch (error) {
      console.error(error);
    }
  },

  addMasterToDaily: async (items) => {
    try {
      const date = get().checklistDate;
      await addMasterItemsToDaily(date, items);
      await get().loadChecklist(date);
      Swal.fire({ icon: 'success', title: 'เพิ่มสำเร็จ', timer: 1500 });
    } catch (error: any) {
      toast.error('เพิ่มไม่สำเร็จ');
    }
  },

  addToMaster: async (item) => {
    try {
      const newItem = await addToMaster(item);
      set(state => ({ masterChecklist: [...state.masterChecklist, newItem] }));
    } catch (error) {
      toast.error('เพิ่ม Master ไม่สำเร็จ');
    }
  },

  updateMaster: async (id, item) => {
    try {
      const updated = await updateMasterItem(id, item);
      set(state => ({ masterChecklist: state.masterChecklist.map(m => m.id === id ? updated : m) }));
    } catch (error) {
      toast.error('อัปเดตไม่สำเร็จ');
    }
  },

  removeMaster: async (id) => {
    try {
      await deleteMasterItem(id);
      set(state => ({ masterChecklist: state.masterChecklist.filter(m => m.id !== id) }));
    } catch (error) {
      toast.error('ลบไม่สำเร็จ');
    }
  },

  clearDaily: async () => {
    try {
      await clearDailyChecklist(get().checklistDate);
      set({ checklist: [] });
      toast.success('ล้างข้อมูลเช็คลิสต์แล้ว');
    } catch (error) {
      toast.error('ล้างข้อมูลไม่สำเร็จ');
    }
  },

  loadHistory: async () => {
    try {
      const data = await fetchChecklistDates();
      set({ checklistHistory: data });
    } catch (error) {
      console.error(error);
    }
  }
}));
