import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Search, X, Check,
  Eye, Receipt, RefreshCw, Trash2, Send, Ban
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
interface InvoiceRow {
  id: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  customer_name: string;
  issue_date: string;
  total_amount: number;
  vat_amount: number;
  created_at: string;
}

interface InvoiceItemDraft {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

const TYPE_LABELS: Record<string, string> = {
  receipt: 'ใบเสร็จ',
  tax_invoice: 'ใบกำกับภาษี',
  tax_invoice_full: 'ใบกำกับภาษีเต็มรูปแบบ',
  quotation: 'ใบเสนอราคา',
  billing_note: 'ใบวางบิล',
  credit_note: 'ใบลดหนี้',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'ฉบับร่าง', color: 'text-slate-600', bg: 'bg-slate-100' },
  issued: { label: 'ออกแล้ว', color: 'text-blue-700', bg: 'bg-blue-50' },
  paid: { label: 'ชำระแล้ว', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  cancelled: { label: 'ยกเลิก', color: 'text-red-700', bg: 'bg-red-50' },
  voided: { label: 'Void', color: 'text-red-700', bg: 'bg-red-50' },
};

export const InvoiceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('erp_invoices')
        .select('id, invoice_number, invoice_type, status, customer_name, issue_date, total_amount, vat_amount, created_at')
        .order('created_at', { ascending: false }).limit(50);
      if (filterType) query = query.eq('invoice_type', filterType);
      if (filterStatus) query = query.eq('status', filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      setInvoices(data || []);
    } catch {
      toast.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  // CRUD actions
  const issueInvoice = async (id: string) => {
    await supabase.from('erp_invoices').update({ status: 'issued' }).eq('id', id);
    toast.success('ออกใบเสร็จแล้ว');
    loadInvoices();
  };

  const markPaid = async (id: string) => {
    await supabase.from('erp_invoices').update({ status: 'paid' }).eq('id', id);
    toast.success('บันทึกชำระแล้ว');
    loadInvoices();
  };

  const voidInvoice = async (id: string) => {
    await supabase.from('erp_invoices').update({ status: 'voided' }).eq('id', id);
    toast.success('ยกเลิก (Void) แล้ว');
    loadInvoices();
  };

  const deleteInvoice = async (id: string) => {
    if (!window.confirm('ต้องการลบใบเสร็จนี้ใช่ไหม?')) return;
    await supabase.from('erp_invoice_items').delete().eq('invoice_id', id);
    await supabase.from('erp_invoices').delete().eq('id', id);
    toast.success('ลบเรียบร้อย');
    loadInvoices();
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return inv.invoice_number?.toLowerCase().includes(q) || inv.customer_name?.toLowerCase().includes(q);
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-indigo-100 rounded-xl shrink-0">
            <Receipt size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">ใบเสร็จ / ใบแจ้งหนี้</h2>
            <p className="text-[11px] text-slate-500">สร้าง จัดการ ออกใบเสร็จ ใบกำกับภาษี</p>
          </div>
        </div>
        <button title="Button" type="button" onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 active:scale-[0.97] transition-all min-h-[44px] self-start sm:self-auto">
          <Plus size={16} /> สร้างใบเสร็จ
        </button>
      </motion.div>

      {/* 💡 Helper Guide Banner */}
      <motion.div variants={fadeUp} className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-blue-800 font-bold">
          <Receipt size={14} className="text-blue-700 shrink-0" />
          <span>คู่มือการออกเอกสาร & ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
        </div>
        <p className="text-slate-600 text-[11px] leading-relaxed">
          • <strong>ใบเสร็จรับเงิน (Receipt)</strong>: สำหรับลูกค้าทั่วไปที่ชำระค่าอาหารแล้ว<br />
          • <strong>ใบกำกับภาษีเต็มรูป (Full Tax Invoice)</strong>: สำหรับลูกค้านิติบุคคล ระบุเลขผู้เสียภาษีและที่อยู่บริษัท<br />
          • <strong>ภาษี 7% รวมในยอด (VAT Included)</strong>: ระบบคำนวณฐานภาษี = ยอดรวม × 7 ÷ 107 ให้อัตโนมัติ
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input title="Input field" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาเลขที่ หรือชื่อลูกค้า..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/20 min-h-[44px]" />
        </div>
        <div className="flex gap-2">
          <select title="Select option" value={filterType} onChange={e => setFilterType(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white min-h-[44px]">
            <option value="">ทุกประเภท</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select title="Select option" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white min-h-[44px]">
            <option value="">ทุกสถานะ</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Invoice List */}
      <motion.div variants={fadeUp}>
        {isLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-[3px] border-indigo-400/20 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <FileText size={44} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">ยังไม่มีใบเสร็จ</p>
            <p className="text-sm text-slate-400 mt-1">กดปุ่ม "สร้างใบเสร็จ" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="px-4 py-3 font-medium">เลขที่</th>
                      <th className="px-4 py-3 font-medium">ประเภท</th>
                      <th className="px-4 py-3 font-medium">ลูกค้า</th>
                      <th className="px-4 py-3 font-medium">วันที่</th>
                      <th className="px-4 py-3 font-medium text-right">ยอดรวม</th>
                      <th className="px-4 py-3 font-medium text-center">สถานะ</th>
                      <th className="px-4 py-3 font-medium text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map(inv => {
                      const st = STATUS_MAP[inv.status] || STATUS_MAP.draft;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-900">{inv.invoice_number}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{TYPE_LABELS[inv.invoice_type] || inv.invoice_type}</td>
                          <td className="px-4 py-2.5 text-slate-700">{inv.customer_name}</td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{dayjs(inv.issue_date).format('DD/MM/YY')}</td>
                          <td className="px-4 py-2.5 text-right font-medium">฿{(inv.total_amount || 0).toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${st.color} ${st.bg}`}>{st.label}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <InvoiceActions inv={inv} onIssue={issueInvoice} onPaid={markPaid} onVoid={voidInvoice} onDelete={deleteInvoice} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {filteredInvoices.map(inv => {
                const st = STATUS_MAP[inv.status] || STATUS_MAP.draft;
                return (
                  <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-slate-900">{inv.invoice_number}</span>
                        <span className={`ml-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${st.color} ${st.bg}`}>{st.label}</span>
                      </div>
                      <InvoiceActions inv={inv} onIssue={issueInvoice} onPaid={markPaid} onVoid={voidInvoice} onDelete={deleteInvoice} />
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{inv.customer_name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-slate-400">{TYPE_LABELS[inv.invoice_type] || inv.invoice_type} · {dayjs(inv.issue_date).format('DD/MM/YY')}</span>
                      <span className="font-semibold text-slate-900 text-sm">฿{(inv.total_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateInvoiceDrawer onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); loadInvoices(); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Invoice Actions ───
const InvoiceActions: React.FC<{
  inv: InvoiceRow;
  onIssue: (id: string) => void;
  onPaid: (id: string) => void;
  onVoid: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ inv, onIssue, onPaid, onVoid, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button title="Button" type="button" onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 min-w-[32px] min-h-[32px] flex items-center justify-center">
        <Eye size={15} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 4 }}
              className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1 min-w-[140px]"
            >
              {inv.status === 'draft' && (
                <>
                  <button title="Button" type="button" onClick={() => { onIssue(inv.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg min-h-[36px]">
                    <Send size={13} /> ออกใบเสร็จ
                  </button>
                  <button title="Button" type="button" onClick={() => { onDelete(inv.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg min-h-[36px]">
                    <Trash2 size={13} /> ลบ
                  </button>
                </>
              )}
              {inv.status === 'issued' && (
                <>
                  <button title="Button" type="button" onClick={() => { onPaid(inv.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg min-h-[36px]">
                    <Check size={13} /> ชำระแล้ว
                  </button>
                  <button title="Button" type="button" onClick={() => { onVoid(inv.id); setOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg min-h-[36px]">
                    <Ban size={13} /> Void
                  </button>
                </>
              )}
              {['paid', 'cancelled', 'voided'].includes(inv.status) && (
                <p className="px-3 py-2 text-xs text-slate-400">ไม่มีการดำเนินการ</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Create Invoice Drawer ───
const CreateInvoiceDrawer: React.FC<{ onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [invoiceType, setInvoiceType] = useState('receipt');
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [issueDate, setIssueDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [items, setItems] = useState<InvoiceItemDraft[]>([{ description: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, amount: 0 }]);
  const [includeVat, setIncludeVat] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit: 'ชิ้น', unit_price: 0, amount: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItemDraft, val: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      if (field === 'quantity' || field === 'unit_price') updated.amount = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const vatAmount = includeVat ? subtotal * 0.07 : 0;
  const total = subtotal + vatAmount;

  const handleSave = async () => {
    if (!customerName.trim()) { toast.error('กรุณาระบุชื่อลูกค้า'); return; }
    if (items.every(i => !i.description.trim())) { toast.error('กรุณาเพิ่มรายการ'); return; }
    setIsSaving(true);
    try {
      const prefix = 'INV-' + dayjs().format('YYYYMM') + '-';
      const { data: existing } = await supabase.from('erp_invoices').select('invoice_number')
        .like('invoice_number', `${prefix}%`).order('invoice_number', { ascending: false }).limit(1);
      const lastNum = existing?.[0]?.invoice_number ? parseInt(existing[0].invoice_number.substring(prefix.length)) || 0 : 0;
      const invNumber = prefix + String(lastNum + 1).padStart(4, '0');

      const { data: inv, error } = await supabase.from('erp_invoices').insert({
        invoice_number: invNumber,
        invoice_type: invoiceType,
        status: 'draft',
        customer_name: customerName,
        customer_tax_id: customerTaxId || null,
        subtotal,
        amount_before_vat: subtotal,
        vat_rate: includeVat ? 7.0 : 0,
        vat_amount: vatAmount,
        total_amount: total,
        issue_date: issueDate,
      }).select().single();

      if (error) throw error;

      const validItems = items.filter(i => i.description.trim());
      if (validItems.length > 0) {
        await supabase.from('erp_invoice_items').insert(
          validItems.map((item, idx) => ({
            invoice_id: inv.id,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            amount: item.amount,
            sort_order: idx,
          }))
        );
      }

      toast.success(`สร้าง ${invNumber} สำเร็จ`);
      onSaved();
    } catch (err: any) {
      toast.error('เกิดข้อผิดพลาด: ' + (err.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      role="dialog" aria-modal="true" aria-label="สร้างใบเสร็จ"
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
      onKeyDown={e => e.key === 'Escape' && onClose()}>
      <motion.div
        initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const }}
        className="bg-white w-full sm:w-[600px] sm:max-h-[85vh] max-h-[90vh] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-900">สร้างใบเสร็จใหม่</h2>
          <button title="Button" type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">ประเภท</label>
              <select title="Select option" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white min-h-[44px]">
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">วันที่ออก</label>
              <input title="Input field" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">ชื่อลูกค้า *</label>
              <input title="Input field" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="ชื่อ-สกุล หรือบริษัท"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm min-h-[44px]" />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1.5">เลข Tax ID</label>
              <input title="Input field" type="text" value={customerTaxId} onChange={e => setCustomerTaxId(e.target.value)}
                placeholder="13 หลัก (ถ้ามี)"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm min-h-[44px]" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">รายการ</h3>
              <button title="Button" type="button" onClick={addItem} className="text-xs text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg flex items-center gap-1 min-h-[32px]">
                <Plus size={12} /> เพิ่ม
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[140px]">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">รายละเอียด</p>}
                    <input title="Input field" type="text" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                      placeholder="รายละเอียด"
                      className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm min-h-[40px]" />
                  </div>
                  <div className="w-14">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">จำนวน</p>}
                    <input title="Input field" type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', +e.target.value || 1)}
                      className="w-full px-2 py-2 text-center border border-slate-200 rounded-lg text-sm min-h-[40px]" />
                  </div>
                  <div className="w-20">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">ราคา</p>}
                    <input title="Input field" type="number" min={0} step={0.01} value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', +e.target.value || 0)}
                      className="w-full px-2 py-2 text-right border border-slate-200 rounded-lg text-sm min-h-[40px]" />
                  </div>
                  <div className="w-20 text-right">
                    {idx === 0 && <p className="text-[10px] text-slate-400 mb-1">รวม</p>}
                    <p className="py-2 text-sm font-medium text-slate-700">฿{item.amount.toFixed(2)}</p>
                  </div>
                  <button title="Button" type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600 min-h-[40px]"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* VAT */}
          <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
            <input title="Input field" type="checkbox" checked={includeVat} onChange={e => setIncludeVat(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-indigo-600" />
            <span className="text-slate-700">VAT 7%</span>
          </label>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-full sm:w-56 bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">ยอดรวม</span><span>฿{subtotal.toFixed(2)}</span></div>
              {includeVat && <div className="flex justify-between"><span className="text-slate-500">VAT 7%</span><span>฿{vatAmount.toFixed(2)}</span></div>}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold">
                <span>ยอดสุทธิ</span><span className="text-indigo-700">฿{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-slate-100 shrink-0">
          <button title="Button" type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px]">ยกเลิก</button>
          <button title="Button" type="button" onClick={handleSave} disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]">
            {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
            บันทึก
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
