import { create } from 'zustand';
import type { KdsTask } from '../types';
import { fetchActiveKdsTasks, finishKdsTask } from '../features/kds/api';
import { toast } from 'sonner';

interface KdsState {
  tasks: KdsTask[];
  isLoading: boolean;
  error: string | null;

  fetchTasks: (silent?: boolean) => Promise<void>;
  markAsDone: (orderUuid: string) => Promise<void>;
}

export const useKdsStore = create<KdsState>((set) => ({
  tasks: [],
  isLoading: false,
  error: null,

  fetchTasks: async (silent = false) => {
    try {
      if (!silent) set({ isLoading: true, error: null });
      const data = await fetchActiveKdsTasks();
      set({ tasks: data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      toast.error('โหลดข้อมูล KDS ไม่สำเร็จ');
    }
  },

  markAsDone: async (orderUuid) => {
    try {
      await finishKdsTask(orderUuid);
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== orderUuid)
      }));
      toast.success('ทำออเดอร์เสร็จสิ้น');
    } catch (error: any) {
      toast.error('ดำเนินการไม่สำเร็จ: ' + error.message);
    }
  }
}));
