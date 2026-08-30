import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, Search, ArrowUpCircle, AlertTriangle, 
  CheckCircle2, X, ClipboardCheck, MapPin, 
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  fetchInventoryItems, fetchSuppliers, recordStockIn, 
  fetchUnitConversions, fetchLocations, recordAdjustment 
} from '../api';
import type { InventoryItem, Supplier, UnitConversion, InventoryLocation } from '../../../types';
import { supabase } from '../../../config/supabase';
import Swal from 'sweetalert2';
import { toast } from 'sonner';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modals state
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedItemForStockIn, setSelectedItemForStockIn] = useState<InventoryItem | null>(null);
  const [selectedItemForAdjustment, setSelectedItemForAdjustment] = useState<InventoryItem | null>(null);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('base');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [itemsData, suppliersData] = await Promise.all([
        fetchInventoryItems(),
        fetchSuppliers()
      ]);
      setItems(itemsData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลสต็อกได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  const lowStockCount = useMemo(() => {
    return items.filter(item => item.current_stock <= item.min_stock_level).length;
  }, [items]);

  const categories = useMemo(() => {
    const defaultCats = ['เนื้อสัตว์', 'ผัก/ผลไม้', 'เครื่องปรุง', 'ของแห้ง', 'บรรจุภัณฑ์', 'เครื่องดื่ม'];
    const dynamicCats = Array.from(new Set(items.map(i => i.category))).filter(Boolean);
    const combined = Array.from(new Set([...defaultCats, ...dynamicCats]));
    return ['All', ...combined];
  }, [items]);

  useEffect(() => {
    if (selectedItemForStockIn && isStockInModalOpen) {
      loadConversions(selectedItemForStockIn.id);
      loadLocations();
      setSelectedUnitId('base');
    }
  }, [selectedItemForStockIn, isStockInModalOpen]);

  useEffect(() => {
    if (selectedItemForAdjustment && isAdjustmentModalOpen) {
      loadLocations();
    }
  }, [selectedItemForAdjustment, isAdjustmentModalOpen]);

  const loadConversions = async (itemId: string) => {
    try {
      const data = await fetchUnitConversions(itemId);
      setConversions(data || []);
    } catch (e) { console.error(e); }
  };

  const loadLocations = async () => {
    try {
      const data = await fetchLocations();
      setLocations(data || []);
    } catch (e) { console.error(e); }
  };

  const handleAdjustment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemForAdjustment) return;

    const formData = new FormData(e.currentTarget);
    const actualQty = Number(formData.get('actual_qty'));
    
    const adjData = {
      item_id: selectedItemForAdjustment.id,
      location_id: (formData.get('location_id') as string) || null,
      expected_qty: selectedItemForAdjustment.current_stock,
      actual_qty: actualQty,
      discrepancy: actualQty - selectedItemForAdjustment.current_stock,
      reason: (formData.get('reason') as string) || null,
      created_at: new Date().toISOString()
    };

    try {
      await recordAdjustment(adjData);
      setIsAdjustmentModalOpen(false);
      loadData();
      Swal.fire({ title: 'ปรับปรุงยอดสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถบันทึกการปรับปรุงยอดได้', 'error');
    }
  };

  const handleStockIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemForStockIn) return;

    const formData = new FormData(e.currentTarget);
    const qtyInput = Number(formData.get('qty'));
    const unitId = formData.get('unit_id') as string;
    
    let finalQty = qtyInput;
    if (unitId !== 'base') {
      const conv = conversions.find(c => c.id === unitId);
      if (conv) finalQty = qtyInput * conv.conversion_factor;
    }

    const supplierId = formData.get('supplier_id') as string;
    const locationId = formData.get('location_id') as string;

    const rawPrice = Number(formData.get('unit_cost'));
    const unitCostPerBase = selectedUnitId === 'base' ? rawPrice : (rawPrice / (finalQty / qtyInput));

    const batchData = {
      inventory_item_id: selectedItemForStockIn.id,
      location_id: (locationId && locationId !== '') ? locationId : null,
      qty: finalQty,
      unit_cost: unitCostPerBase,
      purchase_unit: (selectedUnitId === 'base' ? selectedItemForStockIn.storage_unit : conversions.find(c => c.id === selectedUnitId)?.from_unit) || null,
      purchase_qty: qtyInput,
      receipt_no: (formData.get('receipt_no') as string) || null,
      supplier_id: (supplierId && supplierId !== '') ? supplierId : null,
      received_at: new Date().toISOString()
    };

    try {
      await recordStockIn(batchData, selectedItemForStockIn);
      setIsStockInModalOpen(false);
      loadData();
      Swal.fire({ title: 'รับของเข้าสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถบันทึกการรับของได้', 'error');
    }
  };

  const getBadgeStyle = (cat: string) => {
    switch(cat) {
      case 'เนื้อสัตว์': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'ผัก/ผลไม้': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'เครื่องปรุง': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ของแห้ง': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'บรรจุภัณฑ์': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'เครื่องดื่ม': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center shadow-md shadow-slate-900/20 shrink-0">
              <Package size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  เช็คสต็อกวัตถุดิบคงเหลือ
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Live Stock
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">ตรวจสอบยอดคงคลัง รับของเข้า และตรวจนับสต็อกจริง</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Top 3 Stats Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: Storage Locations */}
          <div 
            onClick={() => setIsLocationModalOpen(true)}
            className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-400/80 cursor-pointer transition-all group flex items-center justify-between"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs shrink-0">
                <MapPin size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">จุดจัดเก็บสินค้า</p>
                <p className="text-2xl font-bold font-mono text-slate-900">{locations.length} <span className="text-xs font-normal text-slate-400 font-sans">จุด</span></p>
                <p className="text-[10px] text-indigo-600 font-semibold group-hover:underline">คลิกจัดการจุดวางสินค้า →</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Plus size={16} />
            </div>
          </div>

          {/* Card 2: Total Items */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">รายการทั้งหมด</p>
              <p className="text-2xl font-bold font-mono text-slate-900">{items.length} <span className="text-xs font-normal text-slate-400 font-sans">รายการ</span></p>
              <p className="text-[10px] text-emerald-600 font-medium">ครอบคลุมทุกหมวดหมู่</p>
            </div>
          </div>

          {/* Card 3: Low Stock Warnings */}
          <div className={`p-5 rounded-3xl border shadow-xs flex items-center gap-3.5 transition-colors sm:col-span-2 lg:col-span-1 ${
            lowStockCount > 0 ? 'bg-red-50/70 border-red-200' : 'bg-white border-slate-200/80'
          }`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
              lowStockCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'
            }`}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${lowStockCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                สต็อกต่ำกว่าเกณฑ์
              </p>
              <p className={`text-2xl font-bold font-mono ${lowStockCount > 0 ? 'text-red-700 font-black' : 'text-slate-900'}`}>
                {lowStockCount} <span className="text-xs font-normal text-slate-400 font-sans">รายการ</span>
              </p>
              <p className={`text-[10px] font-medium ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {lowStockCount > 0 ? '⚠️ ควรเปิดใบสั่งซื้อ (PO) เติมสต็อก' : 'ระดับสต็อกอยู่ในเกณฑ์ปกติ'}
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Category Filters */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative group w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาวัตถุดิบเพื่อเช็คสต็อก..."
                className="w-full pl-10 pr-9 py-2 bg-slate-100/80 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-right w-full sm:w-auto">
              <span className="text-[11px] font-medium text-slate-400">แสดง {filteredItems.length} จาก {items.length} รายการ</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((c) => {
              const isSelected = categoryFilter === c;
              const count = c === 'All' ? items.length : items.filter(i => i.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{c === 'All' ? 'ทั้งหมด' : c}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Inventory Master Table ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">ชื่อวัตถุดิบ & หมวดหมู่</th>
                  <th className="px-4 py-4 text-center">หน่วยนับ</th>
                  <th className="px-4 py-4 text-right">ยอดคงเหลือ</th>
                  <th className="px-4 py-4 text-right">เกณฑ์ขั้นต่ำ</th>
                  <th className="px-4 py-4 text-right">ราคาเฉลี่ย/หน่วย</th>
                  <th className="px-6 py-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-40 bg-slate-100 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded ml-auto" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded ml-auto" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded ml-auto" /></td>
                      <td className="px-6 py-4"><div className="h-8 w-32 bg-slate-100 rounded-xl mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Package size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-bold text-slate-700">ไม่พบรายการวัตถุดิบที่ค้นหา</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isLow = item.current_stock <= item.min_stock_level;

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${isLow ? 'bg-red-50/20' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                              isLow ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm leading-tight">{item.name}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold border ${getBadgeStyle(item.category)}`}>
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
                            {item.storage_unit}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right font-mono font-bold text-sm">
                          <span className={isLow ? 'text-red-500 font-black' : 'text-slate-900'}>
                            {item.current_stock.toLocaleString()}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right font-mono text-slate-500 text-xs">
                          {item.min_stock_level.toLocaleString()}
                        </td>

                        <td className="px-4 py-4 text-right font-mono font-bold text-emerald-700">
                          ฿{(item.avg_unit_cost || 0).toFixed(2)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => { setSelectedItemForStockIn(item); setIsStockInModalOpen(true); }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all shadow-xs active:scale-95"
                              title="รับของเข้าสต็อก"
                            >
                              <ArrowUpCircle size={14} className="text-emerald-600" />
                              <span>รับของเข้า</span>
                            </button>

                            <button 
                              onClick={() => { setSelectedItemForAdjustment(item); setIsAdjustmentModalOpen(true); }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all shadow-xs active:scale-95"
                              title="ตรวจนับสต็อกจริง"
                            >
                              <ClipboardCheck size={14} className="text-slate-500" />
                              <span>ตรวจนับ</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── Modal 1: Stock In Modal ─── */}
      {isStockInModalOpen && selectedItemForStockIn && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <ArrowUpCircle size={18} />
                <div>
                  <h3 className="text-base font-bold">รับของเข้าสต็อก</h3>
                  <p className="text-[11px] text-emerald-100">{selectedItemForStockIn.name}</p>
                </div>
              </div>
              <button onClick={() => setIsStockInModalOpen(false)} className="p-1.5 text-white/80 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStockIn} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">หน่วยที่รับเข้า</label>
                  <select 
                    name="unit_id" 
                    value={selectedUnitId} 
                    onChange={(e) => setSelectedUnitId(e.target.value)} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="base">{selectedItemForStockIn.storage_unit} (หน่วยหลัก)</option>
                    {conversions.map(c => <option key={c.id} value={c.id}>{c.from_unit} (x{c.conversion_factor})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">จำนวนที่รับเข้า <span className="text-red-500">*</span></label>
                  <input 
                    name="qty" 
                    type="number" 
                    step="0.01" 
                    required 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:border-emerald-500" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    ราคาต่อหน่วย ({selectedUnitId === 'base' ? selectedItemForStockIn.storage_unit : conversions.find(c => c.id === selectedUnitId)?.from_unit}) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="unit_cost" 
                    type="number" 
                    step="0.01" 
                    required 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold outline-none focus:border-emerald-500" 
                    placeholder="0.00" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">สถานที่จัดเก็บ</label>
                  <select 
                    name="location_id" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="">-- ไม่ระบุจุดวาง --</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ซัพพลายเออร์ (Supplier)</label>
                <select 
                  name="supplier_id" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- เลือกซัพพลายเออร์ --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เลขที่ใบเสร็จ / หมายเหตุ</label>
                <input 
                  name="receipt_no" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" 
                  placeholder="เช่น IV-2026-001, ตลาดสดรอบเช้า" 
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsStockInModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> ยืนยันการรับของ
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─── Modal 2: Stock Take (Adjustment) Modal ─── */}
      {isAdjustmentModalOpen && selectedItemForAdjustment && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <ClipboardCheck size={18} />
                <div>
                  <h3 className="text-base font-bold">ตรวจนับสต็อก (Stock Take)</h3>
                  <p className="text-[11px] text-slate-400">{selectedItemForAdjustment.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="p-1.5 text-white/80 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustment} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ยอดเดิมในระบบ</span>
                  <span className="font-mono text-base font-bold text-slate-900">
                    {selectedItemForAdjustment.current_stock.toLocaleString()} {selectedItemForAdjustment.storage_unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">หน่วยนับหลัก</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-bold text-[10px]">
                    {selectedItemForAdjustment.storage_unit}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  จำนวนที่นับได้จริง ({selectedItemForAdjustment.storage_unit}) <span className="text-red-500">*</span>
                </label>
                <input 
                  name="actual_qty" 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-emerald-500 focus:bg-white" 
                  placeholder="ระบุจำนวนจริงที่นับได้..." 
                  autoFocus 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">สถานที่ตรวจนับ</label>
                <select 
                  name="location_id" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">-- ไม่ระบุสถานที่ --</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เหตุผลการปรับปรุงยอด</label>
                <textarea 
                  name="reason" 
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 focus:bg-white resize-none" 
                  placeholder="เช่น ตรวจนับประจำสัปดาห์, สินค้าชำรุด/หมดอายุ..." 
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> บันทึกการตรวจนับ
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ─── Modal 3: Location Management Modal ─── */}
      {isLocationModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <MapPin size={18} />
                <div>
                  <h3 className="text-base font-bold">จัดการสถานที่เก็บสินค้า</h3>
                  <p className="text-[11px] text-indigo-100">จุดวางและคลังย่อย</p>
                </div>
              </div>
              <button onClick={() => setIsLocationModalOpen(false)} className="p-1.5 text-white/80 hover:text-white rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {locations.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-4">ยังไม่มีข้อมูลจุดเก็บสินค้า</p>
                ) : (
                  locations.map(loc => (
                    <div key={loc.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{loc.name}</p>
                        {loc.description && <p className="text-[10px] text-slate-400">{loc.description}</p>}
                      </div>
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    </div>
                  ))
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">เพิ่มจุดจัดเก็บใหม่</span>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const name = fd.get('loc_name') as string;
                  if (!name) return;
                  try {
                    const { error } = await supabase.from('erp_inventory_locations').insert({ 
                      name, 
                      description: fd.get('loc_desc') as string 
                    });
                    if (error) throw error;
                    loadLocations();
                    (e.target as HTMLFormElement).reset();
                    toast.success('เพิ่มจุดจัดเก็บเรียบร้อยแล้ว');
                  } catch { 
                    Swal.fire('Error', 'ไม่สามารถเพิ่มสถานที่ได้', 'error'); 
                  }
                }} className="space-y-2">
                  <input 
                    name="loc_name" 
                    placeholder="ชื่อสถานที่ (เช่น ตู้แช่เย็น 1, ชั้นวางแห้ง A)" 
                    required 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs" 
                  />
                  <input 
                    name="loc_desc" 
                    placeholder="คำอธิบายสั้นๆ (ถ้ามี)" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-xs" 
                  />
                  <button 
                    type="submit" 
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    + เพิ่มจุดจัดเก็บ
                  </button>
                </form>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsLocationModalOpen(false)}
                className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
              >
                เสร็จสิ้น
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};
