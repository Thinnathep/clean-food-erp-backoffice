import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { POOL_CONFIG } from '../types';
import type { PoolType, FundPool, ExpenseCategory } from '../types';
import { fetchInventoryItems, recordStockIn } from '../../inventory/api';
import type { InventoryItem } from '../../../types';
import { toast } from 'sonner';
import { 
  TrendingDown, X, 
  AlertCircle, Calculator, Box, PlusCircle
} from 'lucide-react';

interface Props {
  onSaved: () => void;
  isDarkMode?: boolean;
}

export const ExpenseRecorder: React.FC<Props> = ({ onSaved, isDarkMode = false }) => {
  const [pools, setPools] = useState<FundPool[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolType | ''>('');
  const [selectedCat, setSelectedCat] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  // Inventory Integration State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isStockIn, setIsStockIn] = useState(false);
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('');
  const [stockInQty, setStockInQty] = useState('');

  useEffect(() => {
    fetchMeta();
    fetchInventory();
  }, []);

  const fetchMeta = async () => {
    const { data: pData } = await supabase.from('erp_fund_pools').select('*').order('sort_order');
    const { data: cData } = await supabase.from('erp_expense_categories').select('*').eq('is_active', true).order('sort_order');
    setPools(pData || []);
    setCategories(cData || []);
  };

  const fetchInventory = async () => {
    try {
      const items = await fetchInventoryItems();
      setInventoryItems(items);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const activePoolData = pools.find(p => p.pool_type === selectedPool);
  const filteredCats = categories.filter(c => c.pool_type === selectedPool);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool || !amount) return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
    
    setIsSubmitting(true);
    try {
      const amt = Number(amount);
      
      // 1. Record Transaction
      const { data: tx, error: txErr } = await supabase.from('erp_fund_transactions').insert({
        pool_type: selectedPool,
        direction: 'OUT',
        amount: amt,
        category: selectedCat,
        description,
        source_type: 'EXPENSE',
        receipt_url: receiptUrl,
        notes
      }).select().single();

      if (txErr) throw txErr;

      // 2. Update Fund Balance
      const { error: rpcErr } = await supabase.rpc('increment_fund_pool', { 
        p_pool_type: selectedPool, 
        p_amount: -amt 
      });
      if (rpcErr) throw rpcErr;

      // 3. Inventory Stock In (Optional)
      if (isStockIn && selectedInventoryItemId && stockInQty) {
        const invItem = inventoryItems.find(i => i.id === selectedInventoryItemId);
        if (invItem) {
          const qty = Number(stockInQty);
          const unitCost = amt / qty;
          await recordStockIn({
            inventory_item_id: selectedInventoryItemId,
            qty,
            unit_cost: unitCost,
            received_at: new Date().toISOString(),
            receipt_no: description || 'EXP-' + tx.id.slice(0, 8)
          }, invItem);
          toast.success('รับสินค้าเข้าสต็อกเรียบร้อย');
        }
      }

      toast.success('บันทึกรายจ่ายเรียบร้อย');
      setAmount(''); setDescription(''); setNotes(''); setReceiptUrl(null); setIsStockIn(false); setSelectedInventoryItemId(''); setStockInQty('');
      onSaved();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Theme helpers ──
  const card = isDarkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = isDarkMode
    ? 'bg-slate-900/60 border-slate-700 text-slate-200 placeholder-slate-600 focus:border-emerald-500'
    : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-emerald-500';
  const heading = isDarkMode ? 'text-white' : 'text-slate-800';
  const subtext = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className={`lg:col-span-2 rounded-2xl border p-6 transition-all ${card}`}>
        <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${heading}`}>
          <TrendingDown size={20} className="text-red-500" /> บันทึกรายจ่าย
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Pool Selection */}
          <div>
            <label className={`block text-xs font-bold mb-2 uppercase tracking-wider ${subtext}`}>หักเงินจากกองทุน</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(['MATERIAL', 'LABOR', 'OPS', 'PROFIT'] as PoolType[]).map(pt => {
                const cfg = POOL_CONFIG[pt];
                const pool = pools.find(p => p.pool_type === pt);
                return (
                  <button key={pt} type="button" onClick={() => setSelectedPool(pt)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                      selectedPool === pt 
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' 
                        : 'border-slate-100 bg-slate-50 opacity-60'
                    }`}>
                    <span className="text-lg mb-1">{cfg.icon}</span>
                    <span className={`text-[10px] font-bold ${selectedPool === pt ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {cfg.label.split('/')[0]}
                    </span>
                    <span className="text-[9px] opacity-50 mt-0.5">฿{(pool?.current_balance || 0).toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold mb-1 ${subtext}`}>หมวดหมู่</label>
              <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
                className={`w-full p-2.5 border rounded-xl text-sm outline-none transition-all ${inputBase}`}>
                <option value="">เลือกหมวดหมู่...</option>
                {filteredCats.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold mb-1 ${subtext}`}>จำนวนเงิน (฿)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full p-2.5 border rounded-xl text-lg font-bold text-red-500 outline-none transition-all ${inputBase}`}
                required />
            </div>
          </div>

          {/* Inventory Link (Only for MATERIAL) */}
          {selectedPool === 'MATERIAL' && (
             <div className={`p-4 rounded-2xl border ${isStockIn ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                      <Box size={18} className={isStockIn ? 'text-emerald-500' : 'text-slate-400'} />
                      <p className={`text-sm font-bold ${isStockIn ? 'text-emerald-700' : 'text-slate-600'}`}>เชื่อมสต็อก (Stock In)</p>
                   </div>
                   <button 
                     type="button"
                     onClick={() => setIsStockIn(!isStockIn)}
                     className={`w-10 h-5 rounded-full relative transition-all ${isStockIn ? 'bg-emerald-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isStockIn ? 'left-5' : 'left-0.5'}`} />
                   </button>
                </div>
                
                {isStockIn && (
                   <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div>
                         <label className="block text-[10px] font-bold text-slate-500 mb-1">เลือกวัตถุดิบ</label>
                         <select 
                           value={selectedInventoryItemId} 
                           onChange={e => setSelectedInventoryItemId(e.target.value)}
                           className="w-full p-2 text-xs border rounded-lg bg-white outline-none focus:border-emerald-500"
                         >
                            <option value="">-- ค้นหาวัตถุดิบ --</option>
                            {inventoryItems.map(item => (
                               <option key={item.id} value={item.id}>{item.name} ({item.storage_unit})</option>
                            ))}
                         </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">จำนวนที่รับเข้า</label>
                            <div className="flex items-center gap-2">
                               <input 
                                 type="number" 
                                 value={stockInQty} 
                                 onChange={e => setStockInQty(e.target.value)}
                                 className="w-full p-2 text-xs border rounded-lg bg-white outline-none"
                                 placeholder="0"
                               />
                               <span className="text-[10px] text-slate-400">
                                  {inventoryItems.find(i => i.id === selectedInventoryItemId)?.storage_unit || '-'}
                               </span>
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">เฉลี่ยต้นทุน</label>
                            <p className="text-xs font-bold text-slate-700 pt-2">
                               ฿{(Number(amount) / (Number(stockInQty) || 1)).toFixed(2)} / หน่วย
                            </p>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          )}

          {/* Details */}
          <div>
            <label className={`block text-xs font-bold mb-1 ${subtext}`}>รายละเอียดรายจ่าย</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="เช่น ซื้อไก่ 50kg ตลาดไท"
              className={`w-full p-2.5 border rounded-xl text-sm outline-none transition-all ${inputBase}`} />
          </div>

          {/* Receipt Upload UI */}
          <div className={`p-4 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all ${
            receiptUrl ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
          }`}>
             {receiptUrl ? (
                <div className="relative w-full flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white border border-emerald-100 flex items-center justify-center overflow-hidden">
                         <img src={receiptUrl} alt="Receipt" className="object-cover w-full h-full" />
                      </div>
                      <div>
                         <p className="text-xs font-bold text-emerald-700">อัปโหลดใบเสร็จแล้ว</p>
                         <p className="text-[10px] text-slate-500">receipt_image.jpg</p>
                      </div>
                   </div>
                   <button onClick={() => setReceiptUrl(null)} className="p-1.5 hover:bg-red-100 text-red-500 rounded-lg transition-all">
                      <X size={16} />
                   </button>
                </div>
             ) : (
                <button type="button" onClick={() => setReceiptUrl('https://placehold.co/400x600?text=Receipt+Preview')}
                  className="flex flex-col items-center gap-2 text-slate-500 hover:text-emerald-500 transition-colors">
                   <PlusCircle size={24} />
                   <span className="text-xs font-medium">แนบไฟล์ใบเสร็จ (JPG/PNG)</span>
                </button>
             )}
          </div>

          <button type="submit" disabled={isSubmitting || !selectedPool || !amount}
            className="w-full py-3.5 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all disabled:opacity-40">
            {isSubmitting ? 'กำลังบันทึก...' : '💸 บันทึกรายจ่าย'}
          </button>
        </form>
      </div>

      {/* Right Column: Context */}
      <div className="space-y-6">
        {/* Budget Status */}
        <div className={`rounded-2xl border p-5 transition-all ${card}`}>
          <h3 className={`text-xs font-bold mb-4 uppercase tracking-widest flex items-center gap-2 ${subtext}`}>
            <Calculator size={14} /> สถานะงบประมาณรายเดือน
          </h3>
          <div className="space-y-5">
            {pools.map(p => {
              const cfg = POOL_CONFIG[p.pool_type];
              const spent = p.total_out || 0;
              const target = p.target_amount || 1;
              const pct = Math.min(100, (spent / target) * 100);
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ฿{spent.toLocaleString()} / ฿{target.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-end">
                    <span className={`text-[9px] font-bold ${pct > 90 ? 'text-red-500' : 'text-slate-400'}`}>
                      {pct.toFixed(1)}% ของงบที่ตั้งไว้
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warning Card */}
        {activePoolData && activePoolData.current_balance < (activePoolData.target_amount * 0.2) && (
           <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 animate-pulse">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <div>
                 <p className="text-xs font-bold text-red-600 uppercase">คำเตือน: เงินกองทุนต่ำมาก</p>
                 <p className="text-[10px] text-red-500 mt-1">
                    ยอดเงินในกอง {activePoolData.display_name} เหลือเพียง ฿{activePoolData.current_balance.toLocaleString()} 
                    ซึ่งต่ำกว่า 20% ของงบประมาณที่ควรมี
                 </p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
