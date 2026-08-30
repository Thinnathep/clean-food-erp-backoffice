import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import {
  TrendingUp, AlertTriangle, ShoppingCart, Package, Check,
  BarChart3, ArrowRight, RefreshCw
} from 'lucide-react';

// ─── Animation Tokens ───
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface ForecastRow {
  item_id: string;
  item_name: string;
  storage_unit: string;
  current_stock: number;
  min_stock_level: number;
  demand_7d: number;
  shortage: number;
  status: 'sufficient' | 'low' | 'critical';
}

export const DemandForecastView: React.FC = () => {
  const [forecastData, setForecastData] = useState<ForecastRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadForecast = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = dayjs();
      const next7 = today.add(7, 'day');

      const { data: schedules } = await supabase
        .from('erp_member_meal_schedules')
        .select('menu_item_id, quantity')
        .gte('delivery_date', today.format('YYYY-MM-DD'))
        .lte('delivery_date', next7.format('YYYY-MM-DD'));

      const menuDemand = new Map<string, number>();
      (schedules || []).forEach((s: any) => {
        const cur = menuDemand.get(s.menu_item_id) || 0;
        menuDemand.set(s.menu_item_id, cur + (s.quantity || 1));
      });

      if (menuDemand.size === 0) {
        setForecastData([]);
        setIsLoading(false);
        return;
      }

      const menuIds = Array.from(menuDemand.keys());
      const { data: recipes } = await supabase
        .from('erp_recipes')
        .select('menu_item_id, item_id, quantity_required, yield_percentage')
        .in('menu_item_id', menuIds)
        .is('deleted_at', null);

      const itemDemand = new Map<string, number>();
      (recipes || []).forEach((r: any) => {
        const menuQty = menuDemand.get(r.menu_item_id) || 0;
        const yieldFactor = (r.yield_percentage || 100) / 100;
        const ingredientQty = (r.quantity_required || 0) * menuQty / yieldFactor;
        const cur = itemDemand.get(r.item_id) || 0;
        itemDemand.set(r.item_id, cur + ingredientQty);
      });

      const itemIds = Array.from(itemDemand.keys());
      if (itemIds.length === 0) { setForecastData([]); setIsLoading(false); return; }

      const { data: items } = await supabase
        .from('erp_inventory_items')
        .select('id, name, storage_unit, current_stock, min_stock_level')
        .in('id', itemIds);

      const rows: ForecastRow[] = (items || []).map((item: any) => {
        const demand = itemDemand.get(item.id) || 0;
        const shortage = demand - item.current_stock;
        let status: 'sufficient' | 'low' | 'critical' = 'sufficient';
        if (item.current_stock < demand) status = 'critical';
        else if (item.current_stock < item.min_stock_level * 1.5) status = 'low';
        return {
          item_id: item.id,
          item_name: item.name,
          storage_unit: item.storage_unit,
          current_stock: item.current_stock,
          min_stock_level: item.min_stock_level,
          demand_7d: demand,
          shortage: Math.max(0, shortage),
          status,
        };
      }).sort((a: ForecastRow, b: ForecastRow) => b.shortage - a.shortage);

      setForecastData(rows);
    } catch {
      toast.error('โหลดข้อมูลพยากรณ์ไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  const criticalItems = forecastData.filter(f => f.status === 'critical');
  const lowItems = forecastData.filter(f => f.status === 'low');
  const sufficientItems = forecastData.filter(f => f.status === 'sufficient');

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-5xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-blue-100 rounded-xl shrink-0">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">พยากรณ์วัตถุดิบ 7 วัน</h2>
              <p className="text-[11px] text-slate-500">คำนวณจาก Pinto schedules × สูตรอาหาร (BOM)</p>
            </div>
          </div>
          <button onClick={loadForecast}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-[0.97] transition-all min-h-[44px] self-start sm:self-auto">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            รีเฟรช
          </button>
        </motion.div>

        {/* 💡 Helper Guide Banner */}
        <motion.div variants={fadeUp} className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-blue-800 font-bold">
            <TrendingUp size={14} className="text-blue-700 shrink-0" />
            <span>ระบบพยากรณ์ความต้องการวัตถุดิบล่วงหน้า 7 วัน (Demand Forecasting)</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            • <strong>สูตรคำนวณ</strong>: จำนวนกล่องแพ็กเกจปิ่นโตใน 7 วันข้างหน้า × ปริมาณวัตถุดิบตามสูตรอาหาร (BOM) ÷ Yield %<br />
            • <strong>สถานะขาดแน่นอน (Critical)</strong>: ปริมาณสต็อกปัจจุบันน้อยกว่าความต้องการผลิต ควรรีบกดออกใบสั่งซื้อ (PO) ในหมวดจัดซื้อ
          </p>
        </motion.div>

        {/* Summary */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl border border-red-200 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-red-500 mb-0.5 font-medium">ขาดแน่นอน</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600">{criticalItems.length}</p>
            <p className="text-[10px] text-red-400 hidden sm:block">ต้องสั่งซื้อด่วน</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-amber-600 mb-0.5 font-medium">ใกล้หมด</p>
            <p className="text-2xl sm:text-3xl font-bold text-amber-600">{lowItems.length}</p>
            <p className="text-[10px] text-amber-400 hidden sm:block">ควรเตรียมสั่ง</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-3 sm:p-4 text-center">
            <p className="text-[10px] sm:text-xs text-emerald-600 mb-0.5 font-medium">เพียงพอ</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{sufficientItems.length}</p>
            <p className="text-[10px] text-emerald-400 hidden sm:block">ไม่ต้องสั่ง</p>
          </div>
        </motion.div>

        {/* Forecast Table / Cards */}
        <motion.div variants={fadeUp}>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-[3px] border-blue-400/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : forecastData.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <BarChart3 size={44} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">ไม่มีข้อมูลพยากรณ์</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">อาจไม่มี Schedule สำหรับ 7 วันข้างหน้า</p>
            </div>
          ) : (
            <>
              {/* CTA */}
              {criticalItems.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <a href="/procurement"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 active:scale-[0.97] transition-all min-h-[44px]">
                    <ShoppingCart size={15} />
                    สร้าง PO ({criticalItems.length} รายการ)
                    <ArrowRight size={14} />
                  </a>
                </div>
              )}

              {/* Desktop Table */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="px-4 py-3 font-medium">วัตถุดิบ</th>
                        <th className="px-4 py-3 font-medium text-right">สต็อก</th>
                        <th className="px-4 py-3 font-medium text-right">ต้องการ 7 วัน</th>
                        <th className="px-4 py-3 font-medium text-right">ขาด/เกิน</th>
                        <th className="px-4 py-3 font-medium text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {forecastData.map(row => (
                        <motion.tr key={row.item_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className={`hover:bg-slate-50/50 ${row.status === 'critical' ? 'bg-red-50/30' : row.status === 'low' ? 'bg-amber-50/20' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-900">{row.item_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{row.current_stock.toFixed(1)} {row.storage_unit}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{row.demand_7d.toFixed(1)} {row.storage_unit}</td>
                          <td className="px-4 py-3 text-right">
                            {row.shortage > 0 ? (
                              <span className="font-bold text-red-600">-{row.shortage.toFixed(1)}</span>
                            ) : (
                              <span className="text-emerald-600">+{(row.current_stock - row.demand_7d).toFixed(1)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={row.status} />
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-2">
                {forecastData.map(row => (
                  <motion.div key={row.item_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-xl border p-3 ${
                      row.status === 'critical' ? 'border-red-200' :
                      row.status === 'low' ? 'border-amber-200' : 'border-slate-200'
                    }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Package size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 text-sm">{row.item_name}</span>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-slate-400">สต็อก</p>
                        <p className="text-sm font-semibold text-slate-700">{row.current_stock.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">ต้องการ</p>
                        <p className="text-sm font-semibold text-slate-900">{row.demand_7d.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">ขาด/เกิน</p>
                        {row.shortage > 0 ? (
                          <p className="text-sm font-bold text-red-600">-{row.shortage.toFixed(1)}</p>
                        ) : (
                          <p className="text-sm font-semibold text-emerald-600">+{(row.current_stock - row.demand_7d).toFixed(1)}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'critical') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[11px] font-medium">
      <AlertTriangle size={11} /> ขาด
    </span>
  );
  if (status === 'low') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-medium">
      <AlertTriangle size={11} /> ใกล้หมด
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-medium">
      <Check size={11} /> เพียงพอ
    </span>
  );
};
