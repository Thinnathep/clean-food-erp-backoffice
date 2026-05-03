import { supabase } from '../../config/supabase';
import type { InventoryItem, InventoryBatch, Supplier, UnitConversion, InventoryLocation, InventoryAdjustment } from '../../types';

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

export const deleteInventoryItem = async (id: string) => {
  const { error } = await supabase
    .from('erp_inventory_items')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const recordStockIn = async (batch: Partial<InventoryBatch>, currentItem: InventoryItem) => {
  const { data: batchData, error: batchError } = await supabase
    .from('erp_inventory_batches')
    .insert([batch])
    .select()
    .single();

  if (batchError) {
    console.error('Supabase Stock In Error:', batchError);
    throw batchError;
  }

  const qty = Number(batch.qty) || 0;
  const cost = Number(batch.unit_cost) || 0;
  
  const currentStock = Number(currentItem.current_stock) || 0;
  const currentAvgCost = Number(currentItem.avg_unit_cost) || 0;
  
  const newStock = currentStock + qty;
  const oldTotalCost = Math.max(0, currentStock) * currentAvgCost;
  const newTotalCost = qty * cost;
  const newAvgCost = newStock > 0 ? (oldTotalCost + newTotalCost) / newStock : cost;

  const { error: updateError } = await supabase
    .from('erp_inventory_items')
    .update({
      current_stock: newStock,
      avg_unit_cost: newAvgCost,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentItem.id);

  if (updateError) throw updateError;

  const { error: txError } = await supabase
    .from('erp_inventory_transactions')
    .insert({
      inventory_item_id: currentItem.id,
      type: 'STOCK_IN',
      qty_changed: qty,
      reason: `รับของเข้า - ใบเสร็จ: ${batch.receipt_no}`
    });
  if (txError) console.error('TX log failed:', txError);

  return batchData;
};

// --- Unit Conversions ---
export const fetchUnitConversions = async (itemId: string): Promise<UnitConversion[]> => {
  const { data, error } = await supabase
    .from('erp_unit_conversions')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const addUnitConversion = async (conv: Partial<UnitConversion>) => {
  const { data, error } = await supabase
    .from('erp_unit_conversions')
    .insert([conv])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteUnitConversion = async (id: string) => {
  const { error } = await supabase
    .from('erp_unit_conversions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// --- Locations ---
export const fetchLocations = async (): Promise<InventoryLocation[]> => {
  const { data, error } = await supabase
    .from('erp_inventory_locations')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
};

// --- Adjustments ---
export const recordAdjustment = async (adj: Partial<InventoryAdjustment>) => {
  const { data, error } = await supabase
    .from('erp_inventory_adjustments')
    .insert([adj])
    .select()
    .single();

  if (error) throw error;

  // Update current stock
  const { error: updateError } = await supabase
    .from('erp_inventory_items')
    .update({ 
      current_stock: adj.actual_qty,
      last_counted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', adj.item_id);

  if (updateError) throw updateError;

  // Log transaction
  await supabase.from('erp_inventory_transactions').insert({
    inventory_item_id: adj.item_id,
    type: 'ADJUSTMENT',
    qty_changed: adj.discrepancy,
    location_id: adj.location_id,
    reason: `ปรับปรุงยอดสต็อก (Stock Take): ${adj.reason || ''}`
  });

  return data;
};
