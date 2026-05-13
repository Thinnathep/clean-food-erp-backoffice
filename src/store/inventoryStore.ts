import { create } from 'zustand';
import { fetchInventoryItems } from '../features/inventory/api';
import type { InventoryItem } from '../types';

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  loadItems: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await fetchInventoryItems();
      set({ items, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
