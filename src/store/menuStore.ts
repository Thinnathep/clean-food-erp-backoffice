import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem } from '../types';
import { fetchMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, uploadMenuImage } from '../features/kds/api';
import { toast } from 'sonner';

interface MenuState {
  menus: MenuItem[];
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  categoryFilter: string;
  groupFilter: string;
  selectedMenuId: string | null;
  isMenuPanelOpen: boolean;

  setSearchTerm: (term: string) => void;
  setCategoryFilter: (cat: string) => void;
  setGroupFilter: (group: string) => void;
  setSelectedMenuId: (id: string | null) => void;
  setIsMenuPanelOpen: (isOpen: boolean) => void;

  loadMenus: (silent?: boolean) => Promise<void>;
  addMenu: (menuItem: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenu: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  removeMenu: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      menus: [],
      isLoading: false,
      error: null,
      searchTerm: '',
      categoryFilter: 'All',
      groupFilter: 'All',
      selectedMenuId: null,
      isMenuPanelOpen: false,

      setSearchTerm: (term) => set({ searchTerm: term }),
      setCategoryFilter: (cat) => set({ categoryFilter: cat }),
      setGroupFilter: (group) => set({ groupFilter: group }),
      setSelectedMenuId: (id) => set({ selectedMenuId: id }),
      setIsMenuPanelOpen: (isOpen) => set({ isMenuPanelOpen: isOpen }),

      loadMenus: async (silent = false) => {
        try {
          if (!silent) set({ isLoading: true, error: null });
          const data = await fetchMenuItems();
          set({ menus: data, isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          toast.error('โหลดข้อมูลเมนูไม่สำเร็จ');
        }
      },

      addMenu: async (menuItem) => {
        try {
          const newItem = await createMenuItem(menuItem);
          set(state => ({ menus: [...state.menus, newItem] }));
          toast.success('เพิ่มเมนูใหม่เรียบร้อย');
        } catch (error: any) {
          toast.error('เพิ่มเมนูไม่สำเร็จ: ' + error.message);
          throw error;
        }
      },

      updateMenu: async (id, updates) => {
        try {
          const updated = await updateMenuItem(id, updates);
          set(state => ({
            menus: state.menus.map(m => m.id === id ? updated : m)
          }));
          toast.success('อัปเดตเมนูเรียบร้อย');
        } catch (error: any) {
          toast.error('อัปเดตเมนูไม่สำเร็จ: ' + error.message);
          throw error;
        }
      },

      removeMenu: async (id) => {
        try {
          await deleteMenuItem(id);
          set(state => ({
            menus: state.menus.filter(m => m.id !== id)
          }));
          toast.success('ลบเมนูเรียบร้อย');
        } catch (error: any) {
          toast.error('ลบเมนูไม่สำเร็จ');
          throw error;
        }
      },

      uploadImage: async (file) => {
        try {
          return await uploadMenuImage(file);
        } catch (error: any) {
          toast.error('อัปโหลดรูปภาพไม่สำเร็จ');
          throw error;
        }
      }
    }),
    { name: 'menu-storage' }
  )
);
