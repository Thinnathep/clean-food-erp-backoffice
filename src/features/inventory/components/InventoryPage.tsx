import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Package, Search, ArrowUpCircle, AlertTriangle, Filter, ChevronDown, CheckCircle2, X, ClipboardCheck, MapPin, Plus } from 'lucide-react';
import { fetchInventoryItems, fetchSuppliers, recordStockIn, fetchUnitConversions, fetchLocations, recordAdjustment } from '../api';
import type { InventoryItem, Supplier, UnitConversion, InventoryLocation } from '../../../types';
import { supabase } from '../../../config/supabase';
import Swal from 'sweetalert2';

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
      setItems(itemsData);
      setSuppliers(suppliersData);
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
      setConversions(data);
    } catch (e) { console.error(e); }
  };

  const loadLocations = async () => {
    try {
      const data = await fetchLocations();
      setLocations(data);
    } catch (e) { console.error(e); }
  };

  const handleAdjustment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedItemForAdjustment) return;

    const formData = new FormData(e.currentTarget);
    const actualQty = Number(formData.get('actual_qty'));
    
    const adjData = {
      item_id: selectedItemForAdjustment.id,
      location_id: formData.get('location_id') as string || undefined,
      expected_qty: selectedItemForAdjustment.current_stock,
      actual_qty: actualQty,
      discrepancy: actualQty - selectedItemForAdjustment.current_stock,
      reason: formData.get('reason') as string,
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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category)));
    return ['All', ...cats];
  }, [items]);

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
      location_id: locationId && locationId !== '' ? locationId : null,
      qty: finalQty,
      unit_cost: unitCostPerBase,
      purchase_unit: selectedUnitId === 'base' ? selectedItemForStockIn.storage_unit : conversions.find(c => c.id === selectedUnitId)?.from_unit,
      purchase_qty: qtyInput,
      receipt_no: formData.get('receipt_no') as string,
      supplier_id: supplierId && supplierId !== '' ? supplierId : null,
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

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 min-h-full">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20">
                <Package size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-normal text-slate-800 uppercase tracking-tight">เช็คสต็อกปัจจุบัน</h1>
                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">ตรวจสอบยอดคงเหลือและรับของเข้าคลัง</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full md:w-auto">
           {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="h-2 w-16 bg-slate-50 rounded"></div>
                    <div className="h-4 w-12 bg-slate-100 rounded"></div>
                  </div>
                </div>
              ))
           ) : (
             <>
               <button 
                 onClick={() => setIsLocationModalOpen(true)}
                 className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center justify-between gap-4 hover:border-indigo-500 hover:shadow-md transition-all group relative overflow-hidden"
               >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      <MapPin size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">สถานที่เก็บสินค้า</p>
                      <p className="text-xl font-normal text-slate-800">{locations.length} แห่ง</p>
                      <p className="text-[9px] text-indigo-500 font-bold mt-1 transition-opacity">คลิกเพื่อจัดการ →</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-sm">
                    <Plus size={16} />
                  </div>
               </button>

               <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center gap-4 min-w-[150px]">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">รายการทั้งหมด</p>
                    <p className="text-xl font-normal text-slate-800">{items.length}</p>
                  </div>
               </div>

               <div className={`p-4 rounded-[1.5rem] shadow-sm border flex items-center gap-4 min-w-[150px] transition-colors ${lowStockCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest leading-none mb-1 ${lowStockCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>สต็อกต่ำกว่าเกณฑ์</p>
                    <p className={`text-xl font-normal ${lowStockCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{lowStockCount}</p>
                  </div>
               </div>
             </>
           )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex flex-col md:flex-row gap-3 w-full">
              <div className="relative group w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาวัตถุดิบเพื่อเช็คสต็อก..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all placeholder:text-slate-300"
                />
              </div>

              <div className="relative group w-full md:w-48">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-xs uppercase tracking-widest outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-all"
                >
                  {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'ทุกหมวดหมู่' : c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={14} />
              </div>
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                   <th className="px-6 py-4 text-[10px] font-normal text-slate-400 uppercase tracking-widest border-b border-slate-50">ชื่อวัตถุดิบ</th>
                   <th className="px-6 py-4 text-[10px] font-normal text-slate-400 uppercase tracking-widest border-b border-slate-50">หน่วย</th>
                   <th className="px-6 py-4 text-[10px] font-normal text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">คงเหลือ</th>
                   <th className="px-6 py-4 text-[10px] font-normal text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">ขั้นต่ำ</th>
                   <th className="px-6 py-4 text-[10px] font-normal text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">ราคาเฉลี่ย/หน่วย</th>
                   <th className="px-6 py-4 text-[10px] font-normal text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                            <div className="space-y-2">
                               <div className="h-3 w-32 bg-slate-100 rounded"></div>
                               <div className="h-2 w-16 bg-slate-50 rounded"></div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-5"><div className="h-4 w-10 bg-slate-50 rounded mx-auto"></div></td>
                      <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-50 rounded ml-auto"></div></td>
                      <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-50 rounded ml-auto"></div></td>
                      <td className="px-6 py-5"><div className="h-4 w-16 bg-slate-50 rounded ml-auto"></div></td>
                      <td className="px-6 py-5"><div className="h-8 w-24 bg-slate-100 rounded-xl mx-auto"></div></td>
                    </tr>
                  ))
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs uppercase tracking-widest">ไม่พบข้อมูลวัตถุดิบ</td></tr>
                ) : (
                  filteredItems.map(item => {
                    const isLow = item.current_stock <= item.min_stock_level;
                    return (
                      <tr key={item.id} className={`group transition-colors hover:bg-slate-50/30 ${isLow ? 'bg-red-50/20' : ''}`}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${isLow ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                              {item.name.charAt(0)}
                            </div>
                             <div>
                                <p className="text-sm font-normal text-slate-700">{item.name}</p>
                                {(() => {
                                  const getBadgeColor = (cat: string) => {
                                    switch(cat) {
                                      case 'เนื้อสัตว์': return 'bg-rose-50 text-rose-600';
                                      case 'ผัก/ผลไม้': return 'bg-emerald-50 text-emerald-600';
                                      case 'เครื่องปรุง': return 'bg-amber-50 text-amber-600';
                                      case 'ของแห้ง': return 'bg-slate-100 text-slate-600';
                                      case 'บรรจุภัณฑ์': return 'bg-indigo-50 text-indigo-600';
                                      case 'เครื่องดื่ม': return 'bg-cyan-50 text-cyan-600';
                                      default: return 'bg-slate-50 text-slate-500';
                                    }
                                  };
                                  return (
                                    <p className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[8px] font-semibold uppercase tracking-wider ${getBadgeColor(item.category)}`}>
                                      {item.category}
                                    </p>
                                  );
                                })()}
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-md text-[9px] font-normal uppercase tracking-wider">{item.storage_unit}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                           <p className={`text-sm font-normal ${isLow ? 'text-red-500' : 'text-slate-600'}`}>
                             {item.current_stock.toLocaleString()}
                           </p>
                        </td>
                        <td className="px-6 py-5 text-right text-slate-400 text-xs">{item.min_stock_level.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right">
                           <p className="text-sm text-emerald-600 font-normal">฿{item.avg_unit_cost.toFixed(2)}</p>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => { setSelectedItemForStockIn(item); setIsStockInModalOpen(true); }}
                                className="w-full h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm text-[10px] uppercase tracking-widest font-medium"
                                title="รับของเข้าสต็อก"
                              >
                                <ArrowUpCircle size={16} />
                                รับของเข้า
                              </button>
                              <button 
                                onClick={() => { setSelectedItemForAdjustment(item); setIsAdjustmentModalOpen(true); }}
                                className="w-full h-10 bg-slate-50 text-slate-500 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all shadow-sm text-[10px] uppercase tracking-widest font-medium"
                                title="ตรวจนับสต็อกจริง"
                              >
                                <ClipboardCheck size={16} />
                                ตรวจนับ
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

      {/* --- Modals --- */}
      {isStockInModalOpen && selectedItemForStockIn && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/20">
            <div className="px-8 py-6 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30">
              <div>
                <h3 className="text-lg font-normal text-emerald-800 uppercase tracking-widest">รับของเข้าสต็อก</h3>
                <p className="text-[10px] text-emerald-600 font-normal uppercase tracking-widest">{selectedItemForStockIn.name}</p>
              </div>
              <button onClick={() => setIsStockInModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleStockIn} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">หน่วยที่รับเข้า</label>
                    <select name="unit_id" value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all">
                      <option value="base">{selectedItemForStockIn.storage_unit} (หน่วยพื้นฐาน)</option>
                      {conversions.map(c => <option key={c.id} value={c.id}>{c.from_unit}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">จำนวนที่รับเข้า</label>
                    <input name="qty" type="number" step="0.01" required className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all" placeholder="0.00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">ราคาต่อหน่วย ({selectedUnitId === 'base' ? selectedItemForStockIn.storage_unit : conversions.find(c => c.id === selectedUnitId)?.from_unit})</label>
                    <input name="unit_cost" type="number" step="0.01" required className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all" placeholder="0.00" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2 ml-1">
                      <label className="block text-[10px] text-slate-400 uppercase tracking-widest">สถานที่เก็บสินค้า</label>
                      <button type="button" onClick={() => setIsLocationModalOpen(true)} className="text-[9px] text-indigo-500 font-bold hover:underline">จัดการ</button>
                    </div>
                    <select name="location_id" className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all">
                      <option value="">เลือกสถานที่เก็บ</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">ซัพพลายเออร์ (Supplier)</label>
                  <select name="supplier_id" className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all">
                    <option value="">เลือกซัพพลายเออร์</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">เลขที่ใบเสร็จ / บันทึกเพิ่มเติม</label>
                  <input name="receipt_no" className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all" placeholder="เช่น IV-2026-001" />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-normal text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">ยืนยันการรับของ</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isAdjustmentModalOpen && selectedItemForAdjustment && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/20">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <div>
                <h3 className="text-lg font-normal text-slate-800 uppercase tracking-widest">ตรวจนับสต็อก (Stock Take)</h3>
                <p className="text-[10px] text-slate-500 font-normal uppercase tracking-widest">{selectedItemForAdjustment.name}</p>
              </div>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleAdjustment} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between">
                   <div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">ยอดเดิมในระบบ</p>
                      <p className="text-lg font-bold text-slate-700">{selectedItemForAdjustment.current_stock} {selectedItemForAdjustment.storage_unit}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">หน่วยนับหลัก</p>
                      <p className="text-sm text-slate-500">{selectedItemForAdjustment.storage_unit}</p>
                   </div>
                </div>
                
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">จำนวนที่นับได้จริง ({selectedItemForAdjustment.storage_unit})</label>
                  <input name="actual_qty" type="number" step="0.01" required className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all font-bold" placeholder="ระบุจำนวนที่นับได้..." autoFocus />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest">สถานที่ตรวจนับ</label>
                    <button type="button" onClick={() => setIsLocationModalOpen(true)} className="text-[9px] text-indigo-500 font-bold hover:underline">จัดการ</button>
                  </div>
                  <select name="location_id" className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all">
                    <option value="">เลือกสถานที่</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">เหตุผลการปรับปรุงยอด (ถ้ามี)</label>
                  <textarea name="reason" className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all min-h-[80px]" placeholder="เช่น ของเน่าเสีย, นับสต็อกประจำสัปดาห์..." />
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-normal text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">บันทึกการตรวจนับ</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {isLocationModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/20">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-indigo-50/30">
              <div>
                <h3 className="text-lg font-normal text-indigo-800 uppercase tracking-widest">จัดการสถานที่เก็บสินค้า</h3>
                <p className="text-[9px] text-indigo-600 font-normal uppercase tracking-widest">เพิ่มหรือลบจุดวางสินค้าในคลัง</p>
              </div>
              <button onClick={() => setIsLocationModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {locations.map(loc => (
                    <div key={loc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-700">{loc.name}</p>
                        {loc.description && <p className="text-[10px] text-slate-400">{loc.description}</p>}
                      </div>
                    </div>
                  ))}
               </div>

               <div className="pt-6 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">เพิ่มสถานที่ใหม่</p>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const name = fd.get('loc_name') as string;
                    if (!name) return;
                    try {
                      const { error } = await supabase.from('erp_inventory_locations').insert({ name, description: fd.get('loc_desc') as string });
                      if (error) throw error;
                      loadLocations();
                      (e.target as HTMLFormElement).reset();
                    } catch (e) { Swal.fire('Error', 'ไม่สามารถเพิ่มสถานที่ได้', 'error'); }
                  }} className="space-y-3">
                    <input name="loc_name" placeholder="ชื่อสถานที่ (เช่น ตู้เย็น 1)" required className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all" />
                    <input name="loc_desc" placeholder="คำอธิบายสั้นๆ (ถ้ามี)" className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-indigo-500 transition-all" />
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20">บันทึกสถานที่</button>
                  </form>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
