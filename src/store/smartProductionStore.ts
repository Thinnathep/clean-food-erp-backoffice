import { create } from 'zustand';
import { fetchKdsDailyProduction, updateSchedulesKitchenStatus, fetchBulkRecipes, fetchMemberSchedules } from '../features/kds/api';
import type { KdsDailyProductionRow } from '../features/kds/api';
import { toast } from 'sonner';

export interface SmartIngredientItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  menuRefs: { menuName: string; qty: number }[];
}

interface SmartProductionState {
  productionItems: KdsDailyProductionRow[];
  ingredientItems: Record<string, SmartIngredientItem[]>;
  packagingSchedules: any[]; // Member schedules for packaging view
  isLoading: boolean;
  selectedDate: string;
  
  // Actions
  setSelectedDate: (date: string) => void;
  fetchProductionPlan: (date: string) => Promise<void>;
  markProductionAsDone: (menuItemId: string, date: string) => Promise<void>;
}

export const useSmartProductionStore = create<SmartProductionState>((set, get) => ({
  productionItems: [],
  ingredientItems: {},
  packagingSchedules: [],
  isLoading: false,
  selectedDate: new Date().toISOString().split('T')[0],

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
    get().fetchProductionPlan(date);
  },

  fetchProductionPlan: async (date: string) => {
    try {
      set({ isLoading: true });
      
      const aggregatedRows = await fetchKdsDailyProduction(date);
      
      const menuIds = aggregatedRows.map(p => p.menu_item_id);
      let ingredientItems: Record<string, SmartIngredientItem[]> = {};
      
      if (menuIds.length > 0) {
        const recipes = await fetchBulkRecipes(menuIds);
        const aggIngredients: Record<string, SmartIngredientItem> = {};
        
        aggregatedRows.forEach(prodItem => {
          const menuRecipes = recipes.filter(r => r.menu_item_id === prodItem.menu_item_id);
          menuRecipes.forEach(recipeObj => {
            const recipe: any = recipeObj;
            const key = recipe.item_id || recipe.inventory_item_id;
            if (!key) return; // Skip if no valid item_id
            if (!aggIngredients[key]) {
              aggIngredients[key] = {
                id: key,
                name: recipe.item_name || recipe.name || 'Unknown',
                unit: recipe.storage_unit || recipe.unit || 'หน่วย',
                totalQuantity: 0,
                category: recipe.category || 'อื่นๆ',
                menuRefs: []
              };
            }
            const reqQty = recipe.quantity_required !== undefined ? recipe.quantity_required : recipe.quantity;
            const amount = (reqQty || 0) * prodItem.total_quantity;
            aggIngredients[key].totalQuantity += amount;
            aggIngredients[key].menuRefs.push({ menuName: prodItem.menu_name, qty: prodItem.total_quantity });
          });
        });
        
        ingredientItems = Object.values(aggIngredients).reduce((acc: any, item: any) => {
          const cat = item.category || 'อื่นๆ';
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        }, {});
        
        Object.keys(ingredientItems).forEach(cat => {
          ingredientItems[cat].sort((a, b) => a.name.localeCompare(b.name, 'th'));
        });
      }

      const packagingSchedules = await fetchMemberSchedules(date, date);

      set({ productionItems: aggregatedRows, ingredientItems, packagingSchedules, isLoading: false });
    } catch (error) {
      console.error(error);
      toast.error('โหลดข้อมูลการผลิตไม่สำเร็จ');
      set({ isLoading: false });
    }
  },

  markProductionAsDone: async (menuItemId: string, date: string) => {
    try {
      const items = get().productionItems.filter(p => p.menu_item_id === menuItemId);
      if (items.length === 0) return;
      
      let allScheduleIds: string[] = [];
      items.forEach(i => {
        allScheduleIds = [...allScheduleIds, ...i.schedule_ids];
      });

      set(state => ({
        productionItems: state.productionItems.map(p => 
          p.menu_item_id === menuItemId ? { ...p, kitchen_status: 'เสร็จสิ้น' } : p
        )
      }));

      await updateSchedulesKitchenStatus(allScheduleIds, 'เสร็จสิ้น');
      toast.success(`อัปเดตสถานะเมนูเรียบร้อย`);
      
      get().fetchProductionPlan(date);
    } catch (error) {
      toast.error('อัปเดตสถานะไม่สำเร็จ');
      get().fetchProductionPlan(date);
    }
  }
}));
