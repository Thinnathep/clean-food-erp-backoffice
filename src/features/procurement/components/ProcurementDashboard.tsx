import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Plus, Search, FileText, Truck,
  X, Trash2, RefreshCw, AlertTriangle,
  DollarSign, Send, CheckCircle2, Calendar, Clock
} from 'lucide-react';
import Swal from 'sweetalert2';

// ─── Types ───
interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  payment_terms?: string;
  notes?: string;
  created_at: string;
  items?: POItem[];
}

interface POItem {
  id: string;
  inventory_item_id: string;
  item_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  storage_unit: string;
  current_stock: number;
  min_stock_level: number;
}

interface GoodsReceipt {
  id: string;
  gr_number: string;
  po_id: string;
  po_number?: string;
  received_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const PO_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'ฉบับร่าง', color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
  submitted: { label: 'ส่งใบสั่งซื้อแล้ว', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  confirmed: { label: 'ยืนยันออเดอร์', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  received: { label: 'รับสินค้าเข้าคลังแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  cancelled: { label: 'ยกเลิก', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

type TabKey = 'po' | 'gr' | 'prices';

export const ProcurementDashboard: React.FC<{ initialTab?: TabKey }> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'po');
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showReceiveGR, setShowReceiveGR] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [poRes, grRes, suppRes, invRes] = await Promise.all([
        supabase.from('erp_purchase_orders').select('*, erp_purchase_order_items(*, erp_inventory_items(name))').order('created_at', { ascending: false }).limit(50),
        supabase.from('erp_goods_receipts').select('*, erp_purchase_orders(po_number)').order('created_at', { ascending: false }).limit(30),
        supabase.from('erp_suppliers').select('id, name, contact_name, phone').order('name'),
        supabase.from('erp_inventory_items').select('id, name, storage_unit, current_stock, min_stock_level').is('deleted_at', null).order('name'),
      ]);

      const suppList = suppRes.data || [];
      const poData = (poRes.data || []).map((po: any) => ({
        ...po,
        supplier_name: suppList.find(s => s.id === po.supplier_id)?.name || po.supplier_id,
        items: (po.erp_purchase_order_items || []).map((item: any) => ({
          ...item,
          item_name: item.erp_inventory_items?.name || 'ไม่ระบุ',
        })),
      }));

      setPurchaseOrders(poData);
      setGoodsReceipts((grRes.data || []).map((gr: any) => ({
        ...gr,
        po_number: gr.erp_purchase_orders?.po_number || '-',
      })));
      setSuppliers(suppList);
      setInventoryItems(invRes.data || []);
    } catch {
      toast.error('โหลดข้อมูลจัดซื้อไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Sync initialTab when route changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Stats
  const monthPOs = purchaseOrders.filter(po => dayjs(po.order_date).isSame(dayjs(), 'month'));
  const totalPOAmount = monthPOs.reduce((s, po) => s + (po.total_amount || 0), 0);
  const pendingPOs = purchaseOrders.filter(po => po.status === 'confirmed' || po.status === 'submitted').length;
  const lowStockCount = inventoryItems.filter(i => i.current_stock < i.min_stock_level).length;

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchTerm || 
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── CRUD: Delete PO ──
  const deletePO = async (poId: string) => {
    const result = await Swal.fire({
      title: 'ต้องการลบใบสั่งซื้อนี้?',
      text: 'การลบจะไม่สามารถกู้คืนได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        await supabase.from('erp_purchase_order_items').delete().eq('purchase_order_id', poId);
        await supabase.from('erp_purchase_orders').delete().eq('id', poId);
        toast.success('ลบใบสั่งซื้อเรียบร้อยแล้ว');
        loadData();
      } catch (err: any) {
        toast.error('ลบไม่สำเร็จ: ' + err.message);
      }
    }
  };

  // ── CRUD: Submit PO ──
  const submitPO = async (poId: string) => {
    try {
      await supabase.from('erp_purchase_orders').update({ status: 'submitted' }).eq('id', poId);
      toast.success('ส่งใบสั่งซื้อเรียบร้อยแล้ว');
      loadData();
    } catch (err: any) {
      toast.error('ส่ง PO ไม่สำเร็จ: ' + err.message);
    }
  };

  // ── CRUD: Cancel PO ──
  const cancelPO = async (poId: string) => {
    try {
      await supabase.from('erp_purchase_orders').update({ status: 'cancelled' }).eq('id', poId);
      toast.success('ยกเลิกใบสั่งซื้อแล้ว');
      loadData();
    } catch (err: any) {
      toast.error('ยกเลิกไม่สำเร็จ: ' + err.message);
    }
  };

  const tabs = [
    { key: 'po' as TabKey, label: 'ใบสั่งซื้อ (PO)', icon: FileText, count: purchaseOrders.length },
    { key: 'gr' as TabKey, label: 'รับสินค้า (GR)', icon: Truck, count: goodsReceipts.length },
    { key: 'prices' as TabKey, label: 'ราคากลางซัพพลายเออร์', icon: DollarSign },
  ];

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shadow-slate-900/20 shrink-0">
              <ShoppingCart size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  ระบบจัดซื้อ & รับสินค้า
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Procurement Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">จัดการใบสั่งซื้อ (PO), รับของเข้าคลัง (GR) และราคากลางวัตถุดิบ</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Compact Header Tab Navigation Switcher */}
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button 
                  type="button" 
                  key={tab.key} 
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.key 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <tab.icon size={14} className={activeTab === tab.key ? "text-emerald-600" : "text-slate-400"} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === tab.key ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'po' && (
              <button 
                type="button" 
                onClick={() => setShowCreatePO(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>เปิด PO</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Top 4 Stats Bento Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {/* Card 1: PO Count */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">PO เดือนนี้</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{monthPOs.length} <span className="text-xs font-normal text-slate-400 font-sans">ใบ</span></p>
            </div>
          </div>

          {/* Card 2: Total PO Value */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">ยอดสั่งซื้อเดือนนี้</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">฿{totalPOAmount.toLocaleString()}</p>
            </div>
          </div>

          {/* Card 3: Pending POs */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">PO ค้างรับของ</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{pendingPOs} <span className="text-xs font-normal text-slate-400 font-sans">ใบ</span></p>
            </div>
          </div>

          {/* Card 4: Low Stock Alert */}
          <div className={`p-5 rounded-3xl border shadow-xs flex items-center gap-3.5 transition-colors ${
            lowStockCount > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-slate-200/80'
          }`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
              lowStockCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${lowStockCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                วัตถุดิบสต็อกต่ำ
              </p>
              <p className={`text-xl sm:text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-red-700 font-black' : 'text-slate-900'}`}>
                {lowStockCount} <span className="text-xs font-normal text-slate-400 font-sans">รายการ</span>
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar (Search & Filter) */}
        {activeTab === 'po' && (
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative group w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาเลขที่ PO หรือชื่อซัพพลายเออร์..."
                  className="w-full pl-10 pr-9 py-2 bg-slate-100/80 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all" 
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-0.5">
                {[
                  { key: 'all', label: 'ทั้งหมด' },
                  { key: 'draft', label: 'ฉบับร่าง' },
                  { key: 'submitted', label: 'ส่งแล้ว' },
                  { key: 'confirmed', label: 'ยืนยัน' },
                  { key: 'received', label: 'รับของแล้ว' },
                  { key: 'cancelled', label: 'ยกเลิก' },
                ].map(st => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => setStatusFilter(st.key)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      statusFilter === st.key 
                        ? 'bg-slate-900 text-white shadow-xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab Content Views ─── */}
        <AnimatePresence mode="wait">
          {activeTab === 'po' ? (
            <motion.div key="po-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <POList 
                orders={filteredPOs} 
                isLoading={isLoading}
                onSubmit={submitPO} 
                onCancel={cancelPO} 
                onDelete={deletePO}
                onReceive={(po) => { setSelectedPO(po); setShowReceiveGR(true); }} 
              />
            </motion.div>
          ) : activeTab === 'gr' ? (
            <motion.div key="gr-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <GRList receipts={goodsReceipts} isLoading={isLoading} />
            </motion.div>
          ) : activeTab === 'prices' ? (
            <motion.div key="prices-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <PriceListView />
            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>

      {/* ─── Create PO Modal (Responsive) ─── */}
      <AnimatePresence>
        {showCreatePO && (
          <CreatePODrawer
            suppliers={suppliers}
            inventoryItems={inventoryItems}
            onClose={() => setShowCreatePO(false)}
            onSaved={() => { setShowCreatePO(false); loadData(); }}
          />
        )}
      </AnimatePresence>

      {/* ─── Receive GR Modal (Responsive) ─── */}
      <AnimatePresence>
        {showReceiveGR && selectedPO && (
          <ReceiveGRDrawer
            po={selectedPO}
            onClose={() => { setShowReceiveGR(false); setSelectedPO(null); }}
            onSaved={() => { setShowReceiveGR(false); setSelectedPO(null); loadData(); }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// ─── PO List Component ───
const POList: React.FC<{
  orders: PurchaseOrder[];
  isLoading: boolean;
  onSubmit: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onReceive: (po: PurchaseOrder) => void;
}> = ({ orders, isLoading, onSubmit, onCancel, onDelete, onReceive }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/80 h-44 animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <FileText size={36} className="mx-auto mb-2 text-slate-300" />
        <h3 className="text-base font-bold text-slate-700">ไม่พบข้อมูลใบสั่งซื้อ (PO)</h3>
        <p className="text-xs text-slate-400 mt-1">กดปุ่ม "เปิดใบสั่งซื้อ (PO)" เพื่อเริ่มสร้างรายการใหม่</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {orders.map(po => {
        const st = PO_STATUS[po.status] || PO_STATUS.draft;
        return (
          <div 
            key={po.id} 
            className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-emerald-400/80 transition-all flex flex-col justify-between group"
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {po.po_number}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.color} ${st.bg} ${st.border}`}>
                  {st.label}
                </span>
              </div>

              {/* Supplier Info */}
              <div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {po.supplier_name || 'ไม่ระบุซัพพลายเออร์'}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {dayjs(po.order_date).format('DD/MM/YYYY')}
                  </span>
                  {po.payment_terms && (
                    <span className="font-mono font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                      {po.payment_terms}
                    </span>
                  )}
                </div>
              </div>

              {/* Items Preview */}
              {po.items && po.items.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    รายการสินค้า ({po.items.length} รายการ)
                  </span>
                  <div className="space-y-0.5 max-h-16 overflow-y-auto custom-scrollbar">
                    {po.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                        <span className="truncate mr-2">• {item.item_name}</span>
                        <span className="font-mono font-medium shrink-0">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {po.items.length > 3 && (
                      <p className="text-[10px] text-slate-400 italic text-right">+ อีก {po.items.length - 3} รายการ</p>
                    )}
                  </div>
                </div>
              )}

              {/* Total Price */}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดรวมทั้งสิ้น</span>
                <span className="text-lg font-bold font-mono text-emerald-700">
                  ฿{(po.total_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-3">
              {po.status === 'draft' && (
                <>
                  <button 
                    type="button" 
                    onClick={() => onDelete(po.id)} 
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="ลบใบสั่งซื้อ"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => onSubmit(po.id)} 
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Send size={13} /> ส่งใบสั่งซื้อ
                  </button>
                </>
              )}

              {po.status === 'submitted' && (
                <>
                  <button 
                    type="button" 
                    onClick={() => onCancel(po.id)} 
                    className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all"
                  >
                    ยกเลิก PO
                  </button>
                  <button 
                    type="button" 
                    onClick={() => onReceive(po)} 
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Truck size={14} /> รับสินค้าเข้าคลัง
                  </button>
                </>
              )}

              {po.status === 'confirmed' && (
                <button 
                  type="button" 
                  onClick={() => onReceive(po)} 
                  className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Truck size={14} /> รับสินค้าเข้าคลัง
                </button>
              )}

              {po.status === 'received' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold py-1">
                  <CheckCircle2 size={15} /> บันทึกเข้าสต็อกแล้ว
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── GR List Component ───
const GRList: React.FC<{ receipts: GoodsReceipt[]; isLoading: boolean }> = ({ receipts, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/80 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <Truck size={36} className="mx-auto mb-2 text-slate-300" />
        <h3 className="text-base font-bold text-slate-700">ยังไม่มีประวัติการรับสินค้า</h3>
        <p className="text-xs text-slate-400 mt-1">ประวัติจะเกิดขึ้นอัตโนมัติเมื่อกด "รับสินค้าเข้าคลัง" จากใบสั่งซื้อ</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">เลขที่ใบรับของ (GR)</th>
              <th className="px-4 py-4">อ้างอิงใบสั่งซื้อ (PO)</th>
              <th className="px-4 py-4">วันที่รับสินค้า</th>
              <th className="px-4 py-4 text-right">ยอดมูลค่ารับเข้า</th>
              <th className="px-6 py-4 text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {receipts.map(gr => (
              <tr key={gr.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-slate-900">
                  {gr.gr_number}
                </td>
                <td className="px-4 py-4 font-mono font-medium text-slate-600">
                  {gr.po_number}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {dayjs(gr.received_date).format('DD/MM/YYYY')}
                </td>
                <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700">
                  ฿{(gr.total_amount || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                    สมบูรณ์
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Price List Component ───
const PriceListView: React.FC = () => {
  const [prices, setPrices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('erp_supplier_price_lists')
          .select('*, erp_suppliers(name), erp_inventory_items(name, storage_unit)')
          .order('updated_at', { ascending: false })
          .limit(50);
        setPrices(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-3xl border border-slate-200/80 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
        <DollarSign size={36} className="mx-auto mb-2 text-slate-300" />
        <h3 className="text-base font-bold text-slate-700">ยังไม่มีบันทึกราคากลาง</h3>
        <p className="text-xs text-slate-400 mt-1">ระบบจะบันทึกราคากลางอัตโนมัติเมื่อมีการรับสินค้าจากซัพพลายเออร์</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">ชื่อวัตถุดิบ</th>
              <th className="px-4 py-4">ผู้จัดจำหน่าย (Supplier)</th>
              <th className="px-4 py-4 text-center">หน่วยนับ</th>
              <th className="px-4 py-4 text-right">ราคาต่อหน่วยล่าสุด</th>
              <th className="px-6 py-4 text-right">อัปเดตล่าสุด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {prices.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">
                  {p.erp_inventory_items?.name || '-'}
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {p.erp_suppliers?.name || '-'}
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[10px]">
                    {p.erp_inventory_items?.storage_unit || '-'}
                  </span>
                </td>
                <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700 text-sm">
                  ฿{(p.unit_price || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right text-slate-400 font-mono text-[11px]">
                  {p.updated_at ? dayjs(p.updated_at).format('DD/MM/YYYY') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Create PO Modal Drawer ───
const CreatePODrawer: React.FC<{
  suppliers: Supplier[];
  inventoryItems: InventoryItem[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ suppliers, inventoryItems, onClose, onSaved }) => {
  const [supplierId, setSupplierId] = useState('');
  const [orderDate, setOrderDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [deliveryDate, setDeliveryDate] = useState(dayjs().add(3, 'day').format('YYYY-MM-DD'));
  const [paymentTerms, setPaymentTerms] = useState('COD');
  const [items, setItems] = useState<{ itemId: string; qty: number; unit: string; price: number }[]>([
    { itemId: '', qty: 1, unit: '', price: 0 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => setItems(prev => [...prev, { itemId: '', qty: 1, unit: '', price: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'itemId') {
        const inv = inventoryItems.find(ii => ii.id === value);
        if (inv) updated.unit = inv.storage_unit;
      }
      return updated;
    }));
  };

  const addLowStockItems = () => {
    const low = inventoryItems.filter(i => i.current_stock < i.min_stock_level);
    if (low.length === 0) { 
      toast.info('ไม่มีรายการวัตถุดิบที่สต็อกต่ำกว่าเกณฑ์'); 
      return; 
    }
    const newItems = low.map(i => ({
      itemId: i.id,
      qty: Math.max(1, Math.ceil(i.min_stock_level - i.current_stock)),
      unit: i.storage_unit,
      price: 0,
    }));
    setItems(prev => [...prev.filter(i => i.itemId), ...newItems]);
    toast.success(`ดึง ${low.length} รายการสต็อกต่ำมาใส่ในใบสั่งซื้อแล้ว ✨`);
  };

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const vat = subtotal * 0.07;
  const total = subtotal + vat;

  const handleSave = async (asDraft: boolean) => {
    if (!supplierId) { toast.error('กรุณาเลือกผู้จัดจำหน่าย'); return; }
    const validItems = items.filter(i => i.itemId);
    if (validItems.length === 0) { toast.error('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ'); return; }

    setIsSaving(true);
    try {
      const prefix = 'PO-' + dayjs().format('YYYYMM') + '-';
      const { data: existing } = await supabase
        .from('erp_purchase_orders')
        .select('po_number')
        .like('po_number', `${prefix}%`)
        .order('po_number', { ascending: false })
        .limit(1);
      const lastNum = existing?.[0]?.po_number ? parseInt(existing[0].po_number.substring(prefix.length)) || 0 : 0;
      const poNumber = prefix + String(lastNum + 1).padStart(4, '0');

      const { data: po, error } = await supabase.from('erp_purchase_orders').insert({
        po_number: poNumber,
        supplier_id: supplierId,
        order_date: orderDate,
        expected_delivery_date: deliveryDate,
        status: asDraft ? 'draft' : 'submitted',
        payment_terms: paymentTerms,
        subtotal,
        vat_amount: vat,
        total_amount: total,
      }).select().single();

      if (error) throw error;

      await supabase.from('erp_purchase_order_items').insert(
        validItems.map((item, idx) => ({
          purchase_order_id: po.id,
          inventory_item_id: item.itemId,
          quantity: item.qty,
          unit: item.unit,
          unit_price: item.price,
          amount: item.qty * item.price,
          sort_order: idx,
        }))
      );

      toast.success(`สร้างใบสั่งซื้อ ${poNumber} สำเร็จ`);
      onSaved();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold">สร้างใบสั่งซื้อใหม่ (PO)</h2>
              <p className="text-[11px] text-slate-400">ระบุซัพพลายเออร์และรายการวัตถุดิบ</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                ผู้จัดจำหน่าย (Supplier) <span className="text-red-500">*</span>
              </label>
              <select 
                value={supplierId} 
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
              >
                <option value="">-- เลือกผู้จัดจำหน่าย --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เงื่อนไขการชำระเงิน</label>
              <select 
                value={paymentTerms} 
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
              >
                {['COD', 'NET15', 'NET30', 'NET60'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">วันที่สั่งซื้อ</label>
              <input 
                type="date" 
                value={orderDate} 
                onChange={e => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold" 
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">กำหนดส่งมอบ</label>
              <input 
                type="date" 
                value={deliveryDate} 
                onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold" 
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">รายการสินค้าที่จะสั่งซื้อ</h3>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={addLowStockItems}
                  className="text-[11px] text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1 rounded-xl flex items-center gap-1 font-bold transition-all shadow-xs"
                >
                  <AlertTriangle size={12} /> ดึงสต็อกต่ำอัตโนมัติ
                </button>
                <button 
                  type="button" 
                  onClick={addItem}
                  className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center gap-1 font-bold transition-all shadow-xs"
                >
                  <Plus size={13} /> เพิ่มแถว
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                  <div className="flex-1 min-w-[140px]">
                    {idx === 0 && <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">วัตถุดิบ</span>}
                    <select 
                      value={item.itemId} 
                      onChange={e => updateItem(idx, 'itemId', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-xs font-medium"
                    >
                      <option value="">-- เลือกวัตถุดิบ --</option>
                      {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.storage_unit})</option>)}
                    </select>
                  </div>

                  <div className="w-20">
                    {idx === 0 && <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">จำนวน</span>}
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.1}
                      value={item.qty} 
                      onChange={e => updateItem(idx, 'qty', +e.target.value || 1)}
                      className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-xl font-mono font-bold outline-none focus:border-emerald-500 text-xs" 
                    />
                  </div>

                  <div className="w-24">
                    {idx === 0 && <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">ราคา/หน่วย</span>}
                    <input 
                      type="number" 
                      min={0} 
                      step={0.01} 
                      value={item.price} 
                      onChange={e => updateItem(idx, 'price', +e.target.value || 0)}
                      className="w-full px-2 py-1.5 text-right bg-white border border-slate-200 rounded-xl font-mono font-bold outline-none focus:border-emerald-500 text-xs" 
                    />
                  </div>

                  <div className="w-24 text-right">
                    {idx === 0 && <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">รวม</span>}
                    <p className="py-1.5 text-xs font-bold font-mono text-slate-800">
                      ฿{(item.qty * item.price).toFixed(2)}
                    </p>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => removeItem(idx)} 
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Price Calculation Summary Box */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-64 bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>ยอดรวมสินค้า</span>
                <span className="font-mono">฿{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>ภาษีมูลค่าเพิ่ม VAT 7%</span>
                <span className="font-mono">฿{vat.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-sm">
                <span className="text-slate-800">ยอดรวมสุทธิ</span>
                <span className="text-emerald-700 font-mono">฿{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all"
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            onClick={() => handleSave(true)} 
            disabled={isSaving}
            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 disabled:opacity-50 transition-all"
          >
            บันทึกฉบับร่าง
          </button>
          <button 
            type="button" 
            onClick={() => handleSave(false)} 
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            ยืนยันส่ง PO
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Receive GR Modal Drawer ───
const ReceiveGRDrawer: React.FC<{
  po: PurchaseOrder;
  onClose: () => void;
  onSaved: () => void;
}> = ({ po, onClose, onSaved }) => {
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    po.items?.forEach(item => { initial[item.id] = item.quantity; });
    return initial;
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleReceive = async () => {
    setIsSaving(true);
    try {
      const prefix = 'GR-' + dayjs().format('YYYYMM') + '-';
      const { data: existing } = await supabase
        .from('erp_goods_receipts')
        .select('gr_number')
        .like('gr_number', `${prefix}%`)
        .order('gr_number', { ascending: false })
        .limit(1);
      const lastNum = existing?.[0]?.gr_number ? parseInt(existing[0].gr_number.substring(prefix.length)) || 0 : 0;
      const grNumber = prefix + String(lastNum + 1).padStart(4, '0');

      let totalAmount = 0;
      const grItems: any[] = [];

      for (const item of (po.items || [])) {
        const qty = receiveQtys[item.id] || 0;
        if (qty <= 0) continue;
        const amount = qty * item.unit_price;
        totalAmount += amount;
        grItems.push({
          inventory_item_id: item.inventory_item_id,
          received_qty: qty,
          unit: item.unit,
          unit_cost: item.unit_price,
          amount,
          quality_status: 'accepted',
        });

        // Update inventory
        const { error: rpcErr } = await supabase.rpc('increment_stock', { item_id: item.inventory_item_id, qty_add: qty });
        if (rpcErr) {
          // Fallback if RPC is not available
          const { data: inv } = await supabase.from('erp_inventory_items').select('current_stock').eq('id', item.inventory_item_id).single();
          if (inv) {
            await supabase.from('erp_inventory_items').update({ current_stock: (inv.current_stock || 0) + qty }).eq('id', item.inventory_item_id);
          }
        }
      }

      const { data: gr } = await supabase.from('erp_goods_receipts').insert({
        gr_number: grNumber,
        po_id: po.id,
        received_date: dayjs().format('YYYY-MM-DD'),
        total_amount: totalAmount,
        status: 'completed',
        received_by: '00000000-0000-0000-0000-000000000001',
      }).select().single();

      if (gr) {
        await supabase.from('erp_goods_receipt_items').insert(
          grItems.map(item => ({ ...item, goods_receipt_id: gr.id }))
        );
      }

      // Update PO status
      await supabase.from('erp_purchase_orders').update({ status: 'received' }).eq('id', po.id);

      toast.success(`รับสินค้า ${grNumber} เข้าสต็อกเรียบร้อยแล้ว ✨`);
      onSaved();
    } catch (err: any) {
      toast.error('รับสินค้าไม่สำเร็จ: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10"
      >
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <Truck size={18} />
            <div>
              <h2 className="text-base font-bold">บันทึกรับสินค้าเข้าคลัง (GR)</h2>
              <p className="text-[11px] text-emerald-100">อ้างอิง PO: {po.po_number}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-white/80 hover:text-white rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar text-xs">
          {(po.items || []).map(item => (
            <div key={item.id} className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2">
              <p className="font-bold text-slate-900 text-xs">{item.item_name || 'ไม่ระบุชื่อวัตถุดิบ'}</p>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">จำนวนที่สั่ง</span>
                  <span className="font-mono font-bold text-slate-700">{item.quantity} {item.unit}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">ราคา/หน่วย</span>
                  <span className="font-mono text-slate-700">฿{item.unit_price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">จำนวนที่รับจริง</span>
                  <input 
                    type="number" 
                    min={0} 
                    max={item.quantity}
                    value={receiveQtys[item.id] || 0}
                    onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: +e.target.value || 0 }))}
                    className="w-full px-2 py-1 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-center bg-white outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-all"
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            onClick={handleReceive} 
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
            ยืนยันการรับเข้าสต็อก
          </button>
        </div>
      </motion.div>
    </div>
  );
};
