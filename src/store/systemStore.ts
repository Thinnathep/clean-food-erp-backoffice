import { create } from 'zustand';
import { supabase } from '../config/supabase';

interface SystemState {
  isKitchenOpen: boolean;
  notificationSoundEnabled: boolean;
  autoRefreshInterval: number;
  isLoading: boolean;
  loadSystemSettings: () => Promise<void>;
  setKitchenStatus: (isOpen: boolean) => Promise<void>;
  updateSystemConfig: (config: Partial<{ notificationSoundEnabled: boolean; autoRefreshInterval: number }>) => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  isKitchenOpen: true,
  notificationSoundEnabled: true,
  autoRefreshInterval: 30,
  isLoading: false,
  loadSystemSettings: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('erp_settings')
        .select('key, value')
        .in('key', ['kitchen_status', 'system_config']);
      
      const kitchenStatus = data?.find(d => d.key === 'kitchen_status')?.value;
      const systemConfig = data?.find(d => d.key === 'system_config')?.value;

      set({ 
        isKitchenOpen: kitchenStatus?.is_open ?? true,
        notificationSoundEnabled: systemConfig?.notificationSoundEnabled ?? true,
        autoRefreshInterval: systemConfig?.autoRefreshInterval ?? 30,
        isLoading: false 
      });
    } catch (err: any) {
      console.error('Error loading system settings:', err);
      set({ isLoading: false });
    }
  },
  setKitchenStatus: async (isOpen: boolean) => {
    try {
      const { error } = await supabase
        .from('erp_settings')
        .upsert({ 
          key: 'kitchen_status', 
          value: { is_open: isOpen }, 
          updated_at: new Date().toISOString() 
        });
      
      if (!error) {
        set({ isKitchenOpen: isOpen });
      }
    } catch (err: any) {
      console.error('Error setting kitchen status:', err);
    }
  },
  updateSystemConfig: async (config) => {
    try {
      const { data: current } = await supabase
        .from('erp_settings')
        .select('value')
        .eq('key', 'system_config')
        .single();
      
      const newValue = { ...(current?.value || {}), ...config };
      const { error } = await supabase
        .from('erp_settings')
        .upsert({ key: 'system_config', value: newValue, updated_at: new Date().toISOString() });
      
      if (!error) set(config);
    } catch (err: any) {
      console.error('Error updating config:', err);
    }
  },
}));
