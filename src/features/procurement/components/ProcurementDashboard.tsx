import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Plus, Search, FileText, Package, Truck,
  Check, X, Eye, Trash2, RefreshCw, Edit3, AlertTriangle,
  ChevronDown, DollarSign, Send
} from 'lucide-react';

// ─── Animation Tokens ───
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

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

const PO_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'ฉบับร่าง', color: 'text-slate-600', bg: 'bg-slate-100' },
  submitted: { label: 'ส่งแล้ว', color: 'text-blue-700', bg: 'bg-blue-50' },
  confirmed: { label: 'ยืนยัน', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  received: { label: 'รับแล้ว', color: 'text-violet-700', bg: 'bg-violet-50' },
  cancelled: { label: 'ยกเลิก', color: 'text-red-700', bg: 'bg-red-50' },
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

      const poData = (poRes.data || []).map((po: any) => ({
        ...po,
        supplier_name: suppliers.find(s => s.id === po.supplier_id)?.name || po.supplier_id,
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
      setSuppliers(suppRes.data || []);
      setInventoryItems(invRes.data || []);
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Stats
  const monthPOs = purchaseOrders.filter(po => dayjs(po.order_date).isSame(dayjs(), 'month'));
  const totalPOAmount = monthPOs.reduce((s, po) => s + (po.total_amount || 0), 0);
  const pendingPOs = purchaseOrders.filter(po => po.status === 'confirmed').length;
  const lowStockCount = inventoryItems.filter(i => i.current_stock < i.min_stock_level).length;

  const filteredPOs = purchaseOrders.filter(po => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return po.po_number?.toLowerCase().includes(q) || po.supplier_name?.toLowerCase().includes(q);
  });

  // ── CRUD: Delete PO ──
  const deletePO = async (poId: string) => {
    if (!window.confirm('ต้องการลบใบสั่งซื้อนี้ใช่ไหม?')) return;
    await supabase.from('erp_purchase_order_items').delete().eq('purchase_order_id', poId);
    await supabase.from('erp_purchase_orders').delete().eq('id', poId);
    toast.success('ลบ PO แล้ว');
    loadData();
  };

  // ── CRUD: Submit PO ──
  const submitPO = async (poId: string) => {
    await supabase.from('erp_purchase_orders').update({ status: 'submitted' }).eq('id', poId);
    toast.success('ส่ง PO แล้ว');
    loadData();
  };

  // ── CRUD: Cancel PO ──
  const cancelPO = async (poId: string) => {
    await supabase.from('erp_purchase_orders').update({ status: 'cancelled' }).eq('id', poId);
    toast.success('ยกเลิก PO แล้ว');
    loadData();
  };

  const tabs = [
    { key: 'po' as TabKey, label: 'ใบสั่งซื้อ', icon: FileText },
    { key: 'gr' as TabKey, label: 'รับสินค้า', icon: Truck },
    { key: 'prices' as TabKey, label: 'ราคากลาง', icon: DollarSign },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-orange-100 rounded-xl shrink-0">
              <ShoppingCart size={20} className="text-orange-600" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">ระบบจัดซื้อ</h2>
              <p className="text-[11px] text-slate-500">Purchase Orders · Goods Receiving · Price List</p>
            </div>
          </div>
          {activeTab === 'po' && (
            <button onClick={() => setShowCreatePO(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 active:scale-[0.97] transition-all min-h-[44px] self-start sm:self-auto">
              <Plus size={16} /> สร้าง PO ใหม่
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">PO เดือนนี้</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{monthPOs.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">ยอดสั่งซื้อ</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-600">฿{totalPOAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">PO ค้างรับ</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{pendingPOs}</p>
          </div>
          <div className={`rounded-xl border p-3 sm:p-4 ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5">สต็อกต่ำ</p>
            <p className={`text-xl sm:text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{lowStockCount}</p>
          </div>
        </motion.div>

        {/* Tab Bar */}
        <motion.div variants={fadeUp} className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                activeTab === tab.key ? 'text-orange-700' : 'text-slate-500 hover:text-slate-800'
              }`}>
              {activeTab === tab.key && (
                <motion.div layoutId="procTab" className="absolute inset-0 bg-white rounded-lg border border-orange-200 shadow-sm" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <tab.icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </button>
          ))}
        </motion.div>

        {/* Search */}
        {activeTab === 'po' && (
          <motion.div variants={fadeUp} className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="ค้นหา PO หรือผู้จัดจำหน่าย..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/20 min-h-[44px]" />
          </motion.div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}>
            {activeTab === 'po' && (
              <POList orders={filteredPOs} isLoading={isLoading}
                onSubmit={submitPO} onCancel={cancelPO} onDelete={deletePO}
                onReceive={(po) => { setSelectedPO(po); setShowReceiveGR(true); }} />
            )}
            {activeTab === 'gr' && <GRList receipts={goodsReceipts} isLoading={isLoading} />}
            {activeTab === 'prices' && <PriceListView />}
          </motion.div>
        </AnimatePresence>

        {/* Create PO Drawer */}
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

        {/* Receive GR Drawer */}
        <AnimatePresence>
          {showReceiveGR && selectedPO && (
            <ReceiveGRDrawer
              po={selectedPO}
              onClose={() => { setShowReceiveGR(false); setSelectedPO(null); }}
              onSaved={() => { setShowReceiveGR(false); setSelectedPO(null); loadData(); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ─── PO List ───
const POList: React.FC<{
  orders: PurchaseOrder[];
  isLoading: boolean;
  onSubmit: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onReceive: (po: PurchaseOrder) => void;
}> = ({ orders, isLoading, onSubmit, onCancel, onDelete, onReceive }) => {
  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-orange-400/20 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (orders.length === 0) return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
      <FileText size={44} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium text-slate-500">ยังไม่มีใบสั่งซื้อ</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {orders.map(po => {
        const st = PO_STATUS[po.status] || PO_STATUS.draft;
        return (
          <div key={po.id} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-semibold text-slate-900">{po.po_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${st.color} ${st.bg}`}>{st.label}</span>
                </div>
                <p className="text-sm text-slate-600">{po.supplier_name || '-'}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>{dayjs(po.order_date).format('DD/MM/YY')}</span>
                  <span className="font-semibold text-slate-700">฿{(po.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {po.status === 'draft' && (
                  <>
                    <button onClick={() => onSubmit(po.id)} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 min-h-[36px] inline-flex items-center gap-1">
                      <Send size={12} /> ส่ง
                    </button>
                    <button onClick={() => onDelete(po.id)} className="px-2.5 py-2 text-red-500 hover:bg-red-50 rounded-lg min-h-[36px]">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
                {po.status === 'submitted' && (
                  <button onClick={() => onCancel(po.id)} className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 min-h-[36px] inline-flex items-center gap-1">
                    <X size={12} /> ยกเลิก
                  </button>
                )}
                {po.status === 'confirmed' && (
                  <button onClick={() => onReceive(po)} className="px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-100 min-h-[36px] inline-flex items-center gap-1">
                    <Truck size={13} /> รับสินค้า
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── GR List ───
const GRList: React.FC<{ receipts: GoodsReceipt[]; isLoading: boolean }> = ({ receipts, isLoading }) => {
  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-orange-400/20 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (receipts.length === 0) return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
      <Truck size={44} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium text-slate-500">ยังไม่มีใบรับสินค้า</p>
    </div>
  );
  return (
    <div className="space-y-2">
      {receipts.map(gr => (
        <div key={gr.id} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-xs font-semibold text-slate-900">{gr.gr_number}</span>
              <p className="text-sm text-slate-500 mt-0.5">PO: {gr.po_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">฿{(gr.total_amount || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-400">{dayjs(gr.received_date).format('DD/MM/YY')}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Price List ───
const PriceListView: React.FC = () => {
  const [prices, setPrices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('erp_supplier_price_lists')
        .select('*, erp_suppliers(name), erp_inventory_items(name, storage_unit)')
        .order('updated_at', { ascending: false })
        .limit(50);
      setPrices(data || []);
      setIsLoading(false);
    })();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-orange-400/20 border-t-orange-500 rounded-full animate-spin" /></div>;
  if (prices.length === 0) return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
      <DollarSign size={44} className="mx-auto mb-3 text-slate-300" />
      <p className="font-medium text-slate-500">ยังไม่มีราคากลาง</p>
      <p className="text-sm text-slate-400 mt-1">ราคาจะเพิ่มเมื่อมีการรับสินค้า</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {prices.map(p => (
        <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">{p.erp_inventory_items?.name || '-'}</p>
              <p className="text-xs text-slate-500">{p.erp_suppliers?.name || '-'} · {p.erp_inventory_items?.storage_unit || ''}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-orange-700 text-sm">฿{(p.unit_price || 0).toFixed(2)}</p>
              <p className="text-[10px] text-slate-400">{p.updated_at ? dayjs(p.updated_at).format('DD/MM/YY') : '-'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Create PO Drawer ───
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
  const [notes, setNotes] = useState('');
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
    if (low.length === 0) { toast.error('ไม่มีรายการสต็อกต่ำ'); return; }
    const newItems = low.map(i => ({
      itemId: i.id,
      qty: Math.max(1, Math.ceil(i.min_stock_level - i.current_stock)),
      unit: i.storage_unit,
      price: 0,
    }));
    setItems(prev => [...prev.filter(i => i.itemId), ...newItems]);
    toast.success(`เพิ่ม ${low.length} รายการสต็อกต่ำ`);
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
        notes,
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

      toast.success(`สร้าง ${poNumber} สำเร็จ`);
      onSaved();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-label="สร้างใบสั่งซื้อ"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}>
      <motion.div
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-white w-full sm:w-[600px] sm:max-h-[85vh] max-h-[90vh] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">สร้างใบสั่งซื้อ</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">ผู้จัดจำหน่าย *</label>
              <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white min-h-[44px]">
                <option value="">เลือก...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">เงื่อนไขชำระ</label>
              <select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white min-h-[44px]">
                {['COD', 'NET15', 'NET30', 'NET60'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">วันที่สั่ง</label>
              <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">กำหนดส่ง</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm min-h-[44px]" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">รายการ</h3>
              <div className="flex gap-2">
                <button onClick={addLowStockItems}
                  className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg flex items-center gap-1 min-h-[32px]">
                  <AlertTriangle size={12} /> สต็อกต่ำ
                </button>
                <button onClick={addItem}
                  className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1 min-h-[32px]">
                  <Plus size={12} /> เพิ่ม
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[140px]">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">วัตถุดิบ</p>}
                    <select value={item.itemId} onChange={e => updateItem(idx, 'itemId', e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm min-h-[40px]">
                      <option value="">เลือก...</option>
                      {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div className="w-16">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">จำนวน</p>}
                    <input type="number" min={1} value={item.qty} onChange={e => updateItem(idx, 'qty', +e.target.value || 1)}
                      className="w-full px-2 py-2 text-center border border-slate-200 rounded-lg text-sm min-h-[40px]" />
                  </div>
                  <div className="w-20">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">ราคา</p>}
                    <input type="number" min={0} step={0.01} value={item.price} onChange={e => updateItem(idx, 'price', +e.target.value || 0)}
                      className="w-full px-2 py-2 text-right border border-slate-200 rounded-lg text-sm min-h-[40px]" />
                  </div>
                  <div className="w-20 text-right">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">รวม</p>}
                    <p className="py-2 text-sm font-medium text-slate-700">฿{(item.qty * item.price).toFixed(2)}</p>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600 min-h-[40px]">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-full sm:w-56 bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">รวม</span><span>฿{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VAT 7%</span><span>฿{vat.toFixed(2)}</span></div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold">
                <span>ยอดรวม</span><span className="text-orange-700">฿{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]">ยกเลิก</button>
          <button onClick={() => handleSave(true)} disabled={isSaving}
            className="px-4 py-2.5 border border-slate-200 text-sm font-medium text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 min-h-[44px]">
            บันทึกฉบับร่าง
          </button>
          <button onClick={() => handleSave(false)} disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-xl hover:bg-orange-700 disabled:opacity-50 min-h-[44px]">
            {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            ส่ง PO
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Receive GR Drawer ───
const ReceiveGRDrawer: React.FC<{
  po: PurchaseOrder;
  onClose: () => void;
  onSaved: () => void;
}> = ({ po, onClose, onSaved }) => {
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (po.items) {
      const initial: Record<string, number> = {};
      po.items.forEach(item => { initial[item.id] = item.quantity; });
      setReceiveQtys(initial);
    }
  }, [po]);

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
        await supabase.rpc('increment_stock', { item_id: item.inventory_item_id, qty_add: qty })
          .then(() => {})
          .catch(async () => {
            // Fallback if RPC doesn't exist
            const { data: inv } = await supabase.from('erp_inventory_items').select('current_stock').eq('id', item.inventory_item_id).single();
            if (inv) {
              await supabase.from('erp_inventory_items').update({ current_stock: (inv.current_stock || 0) + qty }).eq('id', item.inventory_item_id);
            }
          });
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

      toast.success(`รับสินค้า ${grNumber} — อัปเดตสต็อกแล้ว`);
      onSaved();
    } catch (err: any) {
      toast.error('รับสินค้าไม่สำเร็จ: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-label="รับสินค้า"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}>
      <motion.div
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        className="bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">รับสินค้า</h2>
            <p className="text-xs text-slate-500">PO: {po.po_number}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {(po.items || []).map(item => (
            <div key={item.id} className="bg-slate-50 rounded-xl p-3">
              <p className="font-medium text-slate-900 text-sm mb-2">{item.item_name || 'ไม่ระบุ'}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-slate-400">สั่ง</p>
                  <p className="text-sm font-semibold">{item.quantity} {item.unit}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">ราคา</p>
                  <p className="text-sm">฿{item.unit_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-500">รับจริง</p>
                  <input type="number" min={0} max={item.quantity}
                    value={receiveQtys[item.id] || 0}
                    onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: +e.target.value || 0 }))}
                    className="w-full px-2 py-1.5 border border-emerald-200 rounded-lg text-sm text-center bg-white min-h-[36px]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]">ยกเลิก</button>
          <button onClick={handleReceive} disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 min-h-[44px]">
            {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
            ยืนยันรับสินค้า
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
