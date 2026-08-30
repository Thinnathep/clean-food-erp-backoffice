import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Database, Plus, Search, Edit2, 
  X, Trash2, ArrowRightLeft, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  fetchInventoryItems, addInventoryItem, updateInventoryItem, 
  deleteInventoryItem, fetchUnitConversions, addUnitConversion, deleteUnitConversion 
} from '../api';
import type { InventoryItem, UnitConversion } from '../../../types';
import Swal from 'sweetalert2';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const itemSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อวัตถุดิบ"),
  category: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  storage_unit: z.string().min(1, "กรุณาเลือกหน่วยนับ"),
  min_stock_level: z.number().min(0, "ต้องมากกว่าหรือเท่ากับ 0")
});

type ItemFormValues = z.infer<typeof itemSchema>;

export const IngredientMasterPage: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [conversions, setConversions] = useState<UnitConversion[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      category: '',
      storage_unit: '',
      min_stock_level: 0
    }
  });

  useEffect(() => {
    if (editingItem) {
      setValue('name', editingItem.name);
      setValue('category', editingItem.category);
      setValue('storage_unit', editingItem.storage_unit);
      setValue('min_stock_level', editingItem.min_stock_level);
      loadConversions(editingItem.id);
    } else {
      reset();
      setConversions([]);
    }
  }, [editingItem, setValue, reset]);

  const loadConversions = async (itemId: string) => {
    try {
      const data = await fetchUnitConversions(itemId);
      setConversions(data || []);
    } catch (error) {
      console.error('Error loading conversions:', error);
    }
  };

  const handleAddConversion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);
    const fromUnit = formData.get('from_unit') as string;
    const factor = Number(formData.get('factor'));

    if (!fromUnit || !factor) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาระบุหน่วยและตัวคูณ' });
      return;
    }

    const newConv = {
      item_id: editingItem.id,
      from_unit: fromUnit,
      to_unit: editingItem.storage_unit,
      conversion_factor: factor
    };

    try {
      await addUnitConversion(newConv);
      loadConversions(editingItem.id);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถเพิ่มการแปลงหน่วยได้', 'error');
    }
  };

  const handleDeleteConversion = async (id: string) => {
    try {
      await deleteUnitConversion(id);
      if (editingItem) loadConversions(editingItem.id);
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถลบการแปลงหน่วยได้', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const itemsData = await fetchInventoryItems();
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error loading ingredient data:', error);
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลวัตถุดิบได้', 'error');
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

  const categories = useMemo(() => {
    const defaultCats = ['เนื้อสัตว์', 'ผัก/ผลไม้', 'เครื่องปรุง', 'ของแห้ง', 'บรรจุภัณฑ์', 'เครื่องดื่ม'];
    const dynamicCats = Array.from(new Set(items.map(i => i.category))).filter(Boolean);
    const combined = Array.from(new Set([...defaultCats, ...dynamicCats]));
    return ['All', ...combined];
  }, [items]);

  const onSubmit: SubmitHandler<ItemFormValues> = async (data) => {
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, data);
      } else {
        await addInventoryItem({ 
          ...data, 
          current_stock: 0, 
          avg_unit_cost: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      setIsItemModalOpen(false);
      loadData();
      Swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบวัตถุดิบ?',
      text: `คุณต้องการลบ "${item.name}" ใช่หรือไม่? การลบอาจส่งผลต่อสูตรอาหารที่มีอยู่`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        await deleteInventoryItem(item.id);
        loadData();
        Swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', timer: 1200, showConfirmButton: false });
      } catch (error) {
        Swal.fire('Error', 'ไม่สามารถลบวัตถุดิบได้ เนื่องจากมีการใช้งานอยู่ในระบบ', 'error');
      }
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
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Database size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  จัดการรายชื่อวัตถุดิบ
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Master Data
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">ทะเบียนข้อมูลหลักวัตถุดิบและระบบแปลงหน่วยนับ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button 
              onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
              className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>เพิ่มวัตถุดิบใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Toolbar & Category Filters */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative group w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อวัตถุดิบ..."
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

        {/* Ingredients Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-200/80 h-48 animate-pulse space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 bg-slate-100 rounded-xl" />
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-3 w-1/2 bg-slate-100 rounded" />
                </div>
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Database size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-800">ไม่พบข้อมูลวัตถุดิบ</h3>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มวัตถุดิบใหม่"</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isLow = item.current_stock <= item.min_stock_level;

              return (
                <div 
                  key={item.id} 
                  className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-400/80 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold font-mono">
                        {item.name.charAt(0)}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(item.category)}`}>
                        {item.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">หน่วยจัดเก็บ: <span className="text-slate-700 font-semibold">{item.storage_unit}</span></p>
                    </div>

                    {/* Stock status container */}
                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">สต็อกขั้นต่ำ</span>
                        <span className="font-mono font-bold text-slate-700">
                          {item.min_stock_level.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{item.storage_unit}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">คงเหลือ</span>
                        <span className={`font-mono font-black ${isLow ? 'text-red-500' : 'text-emerald-600'}`}>
                          {item.current_stock.toLocaleString()} <span className="text-[10px] font-normal opacity-80">{item.storage_unit}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                    <button 
                      onClick={() => handleDelete(item)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="ลบวัตถุดิบ"
                    >
                      <Trash2 size={15} />
                    </button>
                    
                    <button 
                      onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                    >
                      <Edit2 size={13} /> แก้ไขข้อมูล
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ─── Modal Form (Desktop Centered / Mobile Bottom Sheet) ─── */}
      {isItemModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Database size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{editingItem ? 'แก้ไขข้อมูลวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}</h3>
                  <p className="text-[11px] text-slate-400">ทะเบียนข้อมูลหลักสำหรับคลังสินค้า</p>
                </div>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  ชื่อวัตถุดิบ <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register("name")} 
                  className={`w-full px-3 py-2 bg-slate-50 border ${errors.name ? 'border-red-400' : 'border-slate-200'} rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all`} 
                  placeholder="เช่น อกไก่ลอกหนัง, ข้าวกล้อง กข43" 
                />
                {errors.name && <span className="text-red-500 text-[10px] mt-1 block">{errors.name.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    หมวดหมู่ <span className="text-red-500">*</span>
                  </label>
                  <select 
                    {...register("category")} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    <option value="เนื้อสัตว์">🥩 เนื้อสัตว์</option>
                    <option value="ผัก/ผลไม้">🥦 ผัก/ผลไม้</option>
                    <option value="เครื่องปรุง">🧂 เครื่องปรุง</option>
                    <option value="ของแห้ง">🍝 ของแห้ง</option>
                    <option value="บรรจุภัณฑ์">📦 บรรจุภัณฑ์</option>
                    <option value="เครื่องดื่ม">🥤 เครื่องดื่ม</option>
                    <option value="อื่นๆ">❓ อื่นๆ</option>
                  </select>
                  {errors.category && <span className="text-red-500 text-[10px] mt-1 block">{errors.category.message}</span>}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    หน่วยจัดเก็บหลัก <span className="text-red-500">*</span>
                  </label>
                  <select 
                    {...register("storage_unit")} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold"
                  >
                    <option value="">-- เลือกหน่วย --</option>
                    <option value="g">กรัม (g)</option>
                    <option value="kg">กิโลกรัม (kg)</option>
                    <option value="ml">มิลลิลิตร (ml)</option>
                    <option value="L">ลิตร (L)</option>
                    <option value="ชิ้น">ชิ้น (pcs)</option>
                    <option value="ฟอง">ฟอง (unit)</option>
                    <option value="แพ็ค">แพ็ค (pack)</option>
                    <option value="ขวด">ขวด (bottle)</option>
                  </select>
                  {errors.storage_unit && <span className="text-red-500 text-[10px] mt-1 block">{errors.storage_unit.message}</span>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  แจ้งเตือนสต็อกต่ำกว่า (Min Stock Level)
                </label>
                <input 
                  {...register("min_stock_level", { valueAsNumber: true })} 
                  type="number" 
                  step="0.01" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                />
                {errors.min_stock_level && <span className="text-red-500 text-[10px] mt-1 block">{errors.min_stock_level.message}</span>}
              </div>

              {/* Unit Conversion Section - When Editing */}
              {editingItem && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <ArrowRightLeft size={14} className="text-emerald-600" />
                    <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      การแปลงหน่วยรับของ (Unit Conversions)
                    </h4>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                    {conversions.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">ยังไม่มีการตั้งค่าหน่วยแปลงสำหรับรับสินค้า</p>
                    ) : (
                      conversions.map(conv => (
                        <div key={conv.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <span className="font-semibold text-slate-700 font-mono">
                            1 {conv.from_unit} = {conv.conversion_factor} {conv.to_unit}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => handleDeleteConversion(conv.id)} 
                            className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Add Conversion Sub-Form */}
                  <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200/60 space-y-2">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">เพิ่มหน่วยแปลงใหม่</span>
                    <div className="flex gap-2">
                      <input 
                        name="from_unit" 
                        placeholder="หน่วยใหญ่ (เช่น ลัง, แพ็ค)" 
                        className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs outline-none focus:border-emerald-500" 
                        form="conv-form" 
                      />
                      <input 
                        name="factor" 
                        type="number" 
                        step="0.01" 
                        placeholder="ตัวคูณ" 
                        className="w-20 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs font-mono font-bold outline-none focus:border-emerald-500" 
                        form="conv-form" 
                      />
                      <button 
                        type="submit" 
                        form="conv-form" 
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-xs"
                      >
                        เพิ่ม
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} /> บันทึกข้อมูล
                </button>
              </div>
            </form>
            <form id="conv-form" onSubmit={handleAddConversion} className="hidden" />
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};
