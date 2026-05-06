import { supabase } from '../../config/supabase';
import dayjs from 'dayjs';

export interface ChecklistItem {
  id: string;
  category: string;
  item_name: string;
  is_checked: boolean;
  target_date: string;
  target_time?: string;
  vendor?: string;
  notes?: string;
  updated_at: string;
}

export interface MasterChecklistItem {
  id: string;
  category: string;
  item_name: string;
  vendor?: string;
  target_time?: string;
}

export const fetchChecklistByDate = async (date: string): Promise<ChecklistItem[]> => {
  const { data, error } = await supabase
    .from('erp_kitchen_checklist')
    .select('*')
    .eq('target_date', date)
    .order('category', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchMasterChecklist = async (): Promise<MasterChecklistItem[]> => {
  const { data, error } = await supabase
    .from('erp_kitchen_checklist_master')
    .select('*')
    .order('category', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const upsertChecklistItem = async (item: Partial<ChecklistItem>): Promise<ChecklistItem> => {
  const cleanItem = { ...item };
  if (!cleanItem.id) delete cleanItem.id;
  
  const { data, error } = await supabase
    .from('erp_kitchen_checklist')
    .upsert([
      { 
        ...cleanItem, 
        updated_at: new Date().toISOString() 
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const addMasterItemsToDaily = async (date: string, masterItems: MasterChecklistItem[]): Promise<void> => {
  const dailyItems = masterItems.map(item => ({
    category: item.category,
    item_name: item.item_name,
    vendor: item.vendor,
    target_time: item.target_time,
    target_date: date,
    is_checked: false
  }));

  const { error } = await supabase
    .from('erp_kitchen_checklist')
    .insert(dailyItems);

  if (error) throw error;
};

export const deleteChecklistItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('erp_kitchen_checklist')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const addToMaster = async (item: Omit<MasterChecklistItem, 'id'>): Promise<MasterChecklistItem> => {
  const { data, error } = await supabase
    .from('erp_kitchen_checklist_master')
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateMasterItem = async (id: string, item: Partial<MasterChecklistItem>): Promise<MasterChecklistItem> => {
  const { data, error } = await supabase
    .from('erp_kitchen_checklist_master')
    .update(item)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteMasterItem = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('erp_kitchen_checklist_master')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const fetchChecklistDates = async (): Promise<{ target_date: string, total_items: number, completed_items: number }[]> => {
  const { data, error } = await supabase
    .from('erp_kitchen_checklist')
    .select('target_date, is_checked');

  if (error) throw error;
  if (!data) return [];

  const groups: Record<string, { total: number, completed: number }> = {};
  data.forEach(item => {
    if (!groups[item.target_date]) groups[item.target_date] = { total: 0, completed: 0 };
    groups[item.target_date].total++;
    if (item.is_checked) groups[item.target_date].completed++;
  });

  return Object.entries(groups)
    .map(([date, stats]) => ({
      target_date: date,
      total_items: stats.total,
      completed_items: stats.completed
    }))
    .sort((a, b) => dayjs(b.target_date).unix() - dayjs(a.target_date).unix());
};

export const clearDailyChecklist = async (date: string): Promise<void> => {
  const { error } = await supabase
    .from('erp_kitchen_checklist')
    .delete()
    .eq('target_date', date);

  if (error) throw error;
};
