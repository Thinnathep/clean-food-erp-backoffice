import { supabase } from '../../config/supabase';
import type { InventoryItem, InventoryBatch, Supplier } from '../../types';

export const fetchInventoryItems = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase
    .from('erp_inventory_items')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from('erp_suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const addInventoryItem = async (item: Partial<InventoryItem>) => {
  const { data, error } = await supabase
    .from('erp_inventory_items')
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
  const { data, error } = await supabase
    .from('erp_inventory_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const recordStockIn = async (batch: Partial<InventoryBatch>, currentItem: InventoryItem) => {
  // 1. Insert into batches
  const { data: batchData, error: batchError } = await supabase
    .from('erp_inventory_batches')
    .insert([batch])
    .select()
    .single();

  if (batchError) throw batchError;

  // 2. Calculate new stock and average cost
  const qty = Number(batch.qty) || 0;
  const cost = Number(batch.unit_cost) || 0;
  
  const currentStock = Number(currentItem.current_stock) || 0;
  const currentAvgCost = Number(currentItem.avg_unit_cost) || 0;
  
  const newStock = currentStock + qty;
  
  // Weighted Average: (OldTotalCost + NewTotalCost) / NewTotalStock
  // If current stock is 0 or less, the new cost becomes the average cost
  const oldTotalCost = Math.max(0, currentStock) * currentAvgCost;
  const newTotalCost = qty * cost;
  const newAvgCost = newStock > 0 ? (oldTotalCost + newTotalCost) / newStock : cost;

  // 3. Update inventory item
  const { error: updateError } = await supabase
    .from('erp_inventory_items')
    .update({
      current_stock: newStock,
      avg_unit_cost: newAvgCost,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentItem.id);

  if (updateError) throw updateError;

  return batchData;
};
