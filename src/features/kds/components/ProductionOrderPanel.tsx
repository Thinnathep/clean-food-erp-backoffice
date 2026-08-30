import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Factory, Play, CheckCircle2, XCircle, Clock, Plus,
  ChevronDown, RefreshCw, Scissors, X, Printer
} from 'lucide-react';

// ─── Animation Tokens ───
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

// ─── Types ───
interface ProdOrder {
  id: string;
  production_date: string;
  shift: string;
  status: string;
  total_items: number;
  total_produced: number;
  total_waste: number;
  stock_deducted: boolean;
  notes?: string;
  created_at: string;
  items?: ProdOrderItem[];
}

interface ProdOrderItem {
  id: string;
  menu_item_id: string;
  planned_qty: number;
  actual_qty: number;
  waste_qty: number;
  yield_percentage: number;
  status: string;
  menu_items?: { name: string; image_url?: string };
}

interface MealDemand {
  menu_item_id: string;
  menu_name: string;
  total_qty: number;
}

// ─── Status Map ───
const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: 'ฉบับร่าง', color: 'text-slate-600', bg: 'bg-slate-100', icon: <Clock size={13} /> },
  in_progress: { label: 'กำลังผลิต', color: 'text-amber-700', bg: 'bg-amber-50', icon: <Play size={13} /> },
  completed: { label: 'เสร็จสิ้น', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <CheckCircle2 size={13} /> },
  cancelled: { label: 'ยกเลิก', color: 'text-red-700', bg: 'bg-red-50', icon: <XCircle size={13} /> },
};

export const ProductionOrderPanel: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [orders, setOrders] = useState<ProdOrder[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('erp_production_orders')
        .select(`*, erp_production_order_items(*, menu_items(name, image_url))`)
        .eq('production_date', selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped = (data || []).map((o: any) => ({
        ...o,
        items: o.erp_production_order_items || [],
      }));
      setOrders(mapped);
    } catch {
      toast.error('โหลดใบสั่งผลิตไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Create Production Order from Today's Schedules ──
  const createFromSchedule = async () => {
    setIsCreating(true);
    try {
      const { data: schedules } = await supabase
        .from('erp_member_meal_schedules')
        .select('menu_item_id, quantity, menu_items(name)')
        .eq('delivery_date', selectedDate);

      const { data: mealPlan } = await supabase
        .from('pinto_meal_plan')
        .select('menu_item_id, current_orders, menu_name')
        .eq('delivery_date', selectedDate)
        .eq('is_published', true);

      const demandMap = new Map<string, MealDemand>();
      (schedules || []).forEach((s: any) => {
        const existing = demandMap.get(s.menu_item_id);
        if (existing) existing.total_qty += s.quantity || 1;
        else demandMap.set(s.menu_item_id, {
          menu_item_id: s.menu_item_id,
          menu_name: s.menu_items?.name || 'ไม่ระบุ',
          total_qty: s.quantity || 1,
        });
      });

      (mealPlan || []).forEach((mp: any) => {
        if (mp.menu_item_id && !demandMap.has(mp.menu_item_id)) {
          demandMap.set(mp.menu_item_id, {
            menu_item_id: mp.menu_item_id,
            menu_name: mp.menu_name || 'ไม่ระบุ',
            total_qty: mp.current_orders || 0,
          });
        }
      });

      const demands = Array.from(demandMap.values()).filter(d => d.total_qty > 0);
      if (demands.length === 0) {
        toast.error('ไม่พบรายการเมนูที่ต้องผลิตในวันนี้');
        setIsCreating(false);
        return;
      }

      const { data: po, error: poErr } = await supabase
        .from('erp_production_orders')
        .insert({
          production_date: selectedDate,
          shift: dayjs().hour() < 12 ? 'morning' : 'evening',
          status: 'draft',
          total_items: demands.length,
        })
        .select()
        .single();

      if (poErr) throw poErr;

      const items = demands.map(d => ({
        production_order_id: po.id,
        menu_item_id: d.menu_item_id,
        planned_qty: d.total_qty,
        actual_qty: 0,
        waste_qty: 0,
        status: 'pending',
      }));

      const { error: itemsErr } = await supabase
        .from('erp_production_order_items')
        .insert(items);
      if (itemsErr) throw itemsErr;

      toast.success(`สร้างใบสั่งผลิต — ${demands.length} เมนู`);
      loadOrders();
    } catch (err: any) {
      toast.error('สร้างไม่สำเร็จ: ' + (err.message || ''));
    } finally {
      setIsCreating(false);
    }
  };

  // ── Update Item Qty (optimistic) ──
  const updateItemQty = async (itemId: string, field: 'actual_qty' | 'waste_qty', value: number) => {
    // Optimistic update
    setOrders(prev => prev.map(o => ({
      ...o,
      items: o.items?.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      ),
    })));

    const { error } = await supabase
      .from('erp_production_order_items')
      .update({ [field]: value })
      .eq('id', itemId);

    if (error) {
      toast.error('อัปเดตไม่สำเร็จ');
      loadOrders(); // Revert
    }
  };

  // ── Cancel Order ──
  const cancelOrder = async (orderId: string) => {
    await supabase.from('erp_production_orders').update({ status: 'cancelled' }).eq('id', orderId);
    toast.success('ยกเลิกใบสั่งผลิตแล้ว');
    loadOrders();
  };

  // ── Complete Order + BOM Deduction ──
  const completeOrder = async (order: ProdOrder) => {
    if (!order.items || order.items.length === 0) {
      toast.error('ไม่มีรายการในใบสั่งผลิต');
      return;
    }

    try {
      let totalProduced = 0;
      let totalWaste = 0;

      for (const item of order.items) {
        totalProduced += item.actual_qty;
        totalWaste += item.waste_qty;

        await supabase
          .from('erp_production_order_items')
          .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            yield_percentage: item.planned_qty > 0 ? ((item.actual_qty / item.planned_qty) * 100) : 0,
          })
          .eq('id', item.id);

        // BOM Auto-deduction
        const { data: recipes } = await supabase
          .from('erp_recipes')
          .select('id, item_id, quantity_required, yield_percentage, erp_inventory_items(id, name, storage_unit, avg_unit_cost, current_stock)')
          .eq('menu_item_id', item.menu_item_id)
          .is('deleted_at', null);

        if (recipes) {
          for (const recipe of recipes) {
            const invItem = (recipe as any).erp_inventory_items;
            if (!invItem) continue;

            const qtyToDeduct = (recipe.quantity_required || 0) * item.actual_qty / ((recipe.yield_percentage || 100) / 100);

            await supabase.from('erp_stock_deductions').insert({
              production_order_id: order.id,
              production_order_item_id: item.id,
              inventory_item_id: invItem.id,
              recipe_id: recipe.id,
              qty_deducted: qtyToDeduct,
              unit: invItem.storage_unit,
              unit_cost_at_deduction: invItem.avg_unit_cost || 0,
              total_cost: qtyToDeduct * (invItem.avg_unit_cost || 0),
            });

            const newStock = Math.max(0, (invItem.current_stock || 0) - qtyToDeduct);
            await supabase
              .from('erp_inventory_items')
              .update({ current_stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', invItem.id);
          }
        }
      }

      await supabase.from('erp_production_orders').update({
        status: 'completed',
        stock_deducted: true,
        total_produced: totalProduced,
        total_waste: totalWaste,
        completed_at: new Date().toISOString(),
      }).eq('id', order.id);

      toast.success('✅ ผลิตเสร็จ — ตัดสต็อกวัตถุดิบเรียบร้อย');
      loadOrders();
    } catch (err: any) {
      toast.error('ยืนยันไม่สำเร็จ: ' + (err.message || ''));
    }
  };

  const startProduction = async (orderId: string) => {
    await supabase.from('erp_production_orders').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', orderId);
    toast.success('เริ่มผลิต!');
    loadOrders();
  };

  // Stats
  const totalPlanned = orders.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + i.planned_qty, 0) || 0), 0);
  const totalActual = orders.reduce((s, o) => s + o.total_produced, 0);
  const totalWasteAll = orders.reduce((s, o) => s + o.total_waste, 0);

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-5xl mx-auto"
      >
        {/* Header — responsive */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-violet-100 rounded-xl shrink-0">
              <Factory size={20} className="text-violet-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">ใบสั่งผลิต</h2>
              <p className="text-[11px] text-slate-500">BOM Auto-deduction — ตัดสต็อกอัตโนมัติเมื่อผลิตเสร็จ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <input title="Input field"
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/20 min-h-[44px]"
            />
            <button title="Button" type="button"
              onClick={createFromSchedule}
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 active:scale-[0.97] transition-all disabled:opacity-50 min-h-[44px] shrink-0"
            >
              {isCreating ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              <span className="hidden sm:inline">สร้างจากรายการวันนี้</span>
              <span className="sm:hidden">สร้าง</span>
            </button>
          </div>
        </motion.div>

        {/* 💡 Helper Guide Banner */}
        <motion.div variants={fadeUp} className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-violet-800 font-bold">
            <Factory size={14} className="text-violet-700 shrink-0" />
            <span>คู่มือการทำงานใบสั่งผลิต & ระบบตัดสต็อกอัตโนมัติ (BOM Auto-Deduction)</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            • <strong>สร้างจากรายการวันนี้</strong>: ระบบจะดึงยอดออเดอร์ของสมาชิกตามรอบส่งมาสร้างเป็นใบสั่งงานครัวให้อัตโนมัติ<br />
            • <strong>ตัดสต็อกอัตโนมัติ (Auto-deduction)</strong>: เมื่อปรุงเสร็จและกดปุ่ม "เสร็จสิ้น" ระบบจะคำนวณสูตรอาหาร (BOM) และตัดวัตถุดิบออกจากสต็อกตามจำนวนผลิตจริงทันที
          </p>
        </motion.div>

        {/* Summary Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">แผนผลิต</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{totalPlanned}</p>
            <p className="text-[10px] text-slate-400">กล่อง</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">ผลิตจริง</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{totalActual}</p>
            <p className="text-[10px] text-slate-400">กล่อง</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">ของเสีย</p>
            <p className="text-xl sm:text-2xl font-bold text-red-500">{totalWasteAll}</p>
            <p className="text-[10px] text-slate-400">กล่อง</p>
          </div>
        </motion.div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-violet-400/20 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div variants={fadeUp} className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Factory size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">ไม่มีใบสั่งผลิตสำหรับวันที่เลือก</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">กดปุ่ม "สร้างจากรายการวันนี้" เพื่อดึง Schedule</p>
          </motion.div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {orders.map((order) => {
              const st = STATUS_MAP[order.status] || STATUS_MAP.draft;
              const isExpanded = expandedOrder === order.id;

              return (
                <motion.div
                  key={order.id}
                  variants={fadeUp}
                  layout
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  {/* Order Header — touch-friendly */}
                  <button title="Button" type="button"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50/50 active:bg-slate-100/50 transition-colors text-left min-h-[52px]"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium ${st.color} ${st.bg}`}>
                        {st.icon} {st.label}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        กะ{order.shift === 'morning' ? 'เช้า' : 'เย็น'} — {order.items?.length || 0} เมนู
                      </span>
                      {order.stock_deducted && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium">
                          <Scissors size={10} /> ตัดสต็อกแล้ว
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 hidden sm:inline">{dayjs(order.created_at).format('HH:mm')}</span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Expanded Items */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                        className="overflow-hidden border-t border-slate-100"
                      >
                        <div className="p-3 sm:p-4 space-y-3">
                          {/* Mobile: Card layout | Desktop: Table */}
                          <div className="hidden sm:block">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-[11px] text-slate-500 uppercase border-b border-slate-100">
                                  <th className="pb-2 text-left font-medium">เมนู</th>
                                  <th className="pb-2 text-center font-medium w-16">แผน</th>
                                  <th className="pb-2 text-center font-medium w-24">ผลิตจริง</th>
                                  <th className="pb-2 text-center font-medium w-24">ของเสีย</th>
                                  <th className="pb-2 text-center font-medium w-16">Yield</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {(order.items || []).map(item => {
                                  const yieldPct = item.planned_qty > 0 ? ((item.actual_qty / item.planned_qty) * 100).toFixed(0) : '-';
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50/50">
                                      <td className="py-2.5 text-slate-900 font-medium">{item.menu_items?.name || 'ไม่ระบุ'}</td>
                                      <td className="py-2.5 text-center text-slate-600">{item.planned_qty}</td>
                                      <td className="py-2.5">
                                        {order.status !== 'completed' ? (
                                          <input title="Input field" type="number" min={0} value={item.actual_qty}
                                            onChange={e => updateItemQty(item.id, 'actual_qty', +e.target.value || 0)}
                                            className="w-full text-center px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/20 min-h-[36px]" />
                                        ) : (
                                          <span className="text-center block text-emerald-700 font-semibold">{item.actual_qty}</span>
                                        )}
                                      </td>
                                      <td className="py-2.5">
                                        {order.status !== 'completed' ? (
                                          <input title="Input field" type="number" min={0} value={item.waste_qty}
                                            onChange={e => updateItemQty(item.id, 'waste_qty', +e.target.value || 0)}
                                            className="w-full text-center px-2 py-1.5 border border-red-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300/20 min-h-[36px]" />
                                        ) : (
                                          <span className="text-center block text-red-500">{item.waste_qty}</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 text-center">
                                        <span className={`text-xs font-semibold ${
                                          Number(yieldPct) >= 90 ? 'text-emerald-600' :
                                          Number(yieldPct) >= 70 ? 'text-amber-600' :
                                          yieldPct === '-' ? 'text-slate-400' : 'text-red-500'
                                        }`}>{yieldPct}{yieldPct !== '-' ? '%' : ''}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile Card View */}
                          <div className="sm:hidden space-y-2">
                            {(order.items || []).map(item => {
                              const yieldPct = item.planned_qty > 0 ? ((item.actual_qty / item.planned_qty) * 100).toFixed(0) : '-';
                              return (
                                <div key={item.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-slate-900 text-sm">{item.menu_items?.name || 'ไม่ระบุ'}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      Number(yieldPct) >= 90 ? 'bg-emerald-50 text-emerald-700' :
                                      Number(yieldPct) >= 70 ? 'bg-amber-50 text-amber-700' :
                                      'bg-slate-100 text-slate-500'
                                    }`}>{yieldPct}{yieldPct !== '-' ? '%' : '-'}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <p className="text-[10px] text-slate-400 mb-0.5">แผน</p>
                                      <p className="text-sm font-semibold text-slate-700">{item.planned_qty}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-emerald-500 mb-0.5">ผลิตจริง</p>
                                      {order.status !== 'completed' ? (
                                        <input title="Input field" type="number" min={0} value={item.actual_qty}
                                          onChange={e => updateItemQty(item.id, 'actual_qty', +e.target.value || 0)}
                                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-center min-h-[36px]" />
                                      ) : (
                                        <p className="text-sm font-semibold text-emerald-600">{item.actual_qty}</p>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-red-400 mb-0.5">ของเสีย</p>
                                      {order.status !== 'completed' ? (
                                        <input title="Input field" type="number" min={0} value={item.waste_qty}
                                          onChange={e => updateItemQty(item.id, 'waste_qty', +e.target.value || 0)}
                                          className="w-full px-2 py-1.5 border border-red-100 rounded-lg text-sm text-center min-h-[36px]" />
                                      ) : (
                                        <p className="text-sm font-semibold text-red-500">{item.waste_qty}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-50">
                            <button title="Button" type="button" onClick={() => window.print()}
                              className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium active:scale-[0.97] transition-all min-h-[44px]">
                              <Printer size={15} /> พิมพ์ใบสั่งงาน
                            </button>
                            {order.status === 'draft' && (
                              <>
                                <button title="Button" type="button" onClick={() => cancelOrder(order.id)}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 bg-red-50 rounded-xl text-sm font-medium hover:bg-red-100 active:scale-[0.97] transition-all min-h-[44px]">
                                  <X size={15} /> ยกเลิก
                                </button>
                                <button title="Button" type="button" onClick={() => startProduction(order.id)}
                                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 text-amber-800 rounded-xl text-sm font-medium hover:bg-amber-200 active:scale-[0.97] transition-all min-h-[44px]">
                                  <Play size={15} /> เริ่มผลิต
                                </button>
                              </>
                            )}
                            {order.status === 'in_progress' && (
                              <button title="Button" type="button" onClick={() => completeOrder(order)}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 active:scale-[0.97] transition-all min-h-[44px]">
                                <CheckCircle2 size={16} /> ยืนยันผลิตเสร็จ — ตัดสต็อก
                              </button>
                            )}
                            {order.status === 'completed' && (
                              <div className="flex items-center justify-center gap-2 text-emerald-600 py-2">
                                <CheckCircle2 size={16} />
                                <span className="text-sm font-medium">ผลิตเสร็จ — ตัดสต็อกแล้ว</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
