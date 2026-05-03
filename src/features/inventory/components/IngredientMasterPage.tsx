import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Database, Plus, Search, Edit2, Filter, ChevronDown, X, Trash2 } from 'lucide-react';
import { fetchInventoryItems, addInventoryItem, updateInventoryItem, deleteInventoryItem, fetchUnitConversions, addUnitConversion, deleteUnitConversion } from '../api';
import type { InventoryItem, UnitConversion } from '../../../types';
import Swal from 'sweetalert2';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const itemSchema = z.object({
  name: z.string().min(1, "ห้ามเว้นว่างชื่อวัตถุดิบ"),
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
      setConversions(data);
    } catch (error) {
      console.error('Error loading conversions:', error);
    }
  };

  const handleAddConversion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingItem) return;
    const formData = new FormData(e.currentTarget);
    const newConv = {
      item_id: editingItem.id,
      from_unit: formData.get('from_unit') as string,
      to_unit: editingItem.storage_unit,
      conversion_factor: Number(formData.get('factor'))
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
      setItems(itemsData);
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
    const cats = Array.from(new Set(items.map(i => i.category)));
    return ['All', ...cats];
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
      Swal.fire({ title: 'สำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณต้องการลบ "${item.name}" ใช่หรือไม่? (การลบอาจส่งผลต่อสูตรอาหารที่มีอยู่)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        await deleteInventoryItem(item.id);
        loadData();
        Swal.fire('ลบสำเร็จ!', '', 'success');
      } catch (error) {
        Swal.fire('Error', 'ไม่สามารถลบวัตถุดิบได้ เนื่องจากมีการใช้งานอยู่ในระบบ', 'error');
      }
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50/50 min-h-full overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-600/20">
                <Database size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-normal text-slate-800 uppercase tracking-tight">จัดการรายชื่อวัตถุดิบ</h1>
                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">ทะเบียนข้อมูลหลัก (Master Data)</p>
              </div>
           </div>
        </div>

        <button 
          onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }}
          className="w-full md:w-auto px-6 py-3 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-95 transition-all text-xs uppercase tracking-[0.15em]"
        >
          <Plus size={18} />
          <span>เพิ่มวัตถุดิบใหม่</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาวัตถุดิบ..."
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

          <div className="flex-1 text-right px-4 hidden md:block">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">แสดงทั้งหมด {filteredItems.length} รายการ</span>
          </div>
      </div>

      {/* Final Balanced Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 animate-pulse space-y-4">
              <div className="flex justify-between">
                <div className="w-8 h-8 bg-slate-100 rounded-xl"></div>
                <div className="h-5 w-16 bg-slate-50 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-slate-100 rounded"></div>
                <div className="h-2 w-1/2 bg-slate-50 rounded"></div>
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-between">
                <div className="h-6 w-12 bg-slate-50 rounded"></div>
                <div className="h-6 w-12 bg-slate-50 rounded"></div>
              </div>
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-400 text-xs uppercase tracking-widest">ไม่พบข้อมูลวัตถุดิบ</div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className="group bg-white p-4 rounded-[1.5rem] shadow-sm border border-slate-100 hover:border-emerald-500/30 hover:shadow-lg transition-all flex flex-col justify-between">
               <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                      <Database size={16} />
                    </div>
                    {(() => {
                      const getBadgeColor = (cat: string) => {
                        switch(cat) {
                          case 'เนื้อสัตว์': return 'bg-rose-50 text-rose-600 border-rose-100';
                          case 'ผัก/ผลไม้': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
                          case 'เครื่องปรุง': return 'bg-amber-50 text-amber-600 border-amber-100';
                          case 'ของแห้ง': return 'bg-slate-100 text-slate-600 border-slate-200';
                          case 'บรรจุภัณฑ์': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
                          case 'เครื่องดื่ม': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
                          default: return 'bg-slate-50 text-slate-500 border-slate-100';
                        }
                      };
                      return (
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border-2 ${getBadgeColor(item.category)}`}>
                          {item.category}
                        </span>
                      );
                    })()}
                  </div>
                  
                  <h3 className="text-base font-bold text-slate-800 line-clamp-1 mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-400 font-normal mb-3 uppercase tracking-wider">หน่วย: {item.storage_unit}</p>
                  
                  <div className="flex items-center justify-between py-3 border-t border-slate-50 mb-3">
                    <div className="text-left">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">สต็อกขั้นต่ำ</p>
                      <p className="text-sm text-slate-600 font-semibold">{item.min_stock_level} {item.storage_unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">ยอดปัจจุบัน</p>
                      <p className={`text-base font-black ${item.current_stock <= item.min_stock_level ? 'text-red-500' : 'text-emerald-600'}`}>
                        {item.current_stock} {item.storage_unit}
                      </p>
                    </div>
                  </div>
               </div>

               <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <button 
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="ลบวัตถุดิบ"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button 
                    onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-emerald-600 transition-all text-[9px] font-medium uppercase tracking-widest"
                  >
                    <Edit2 size={10} />
                    แก้ไข
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {/* --- Modal --- */}
      {isItemModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-md transition-all">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/20">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-normal text-slate-800 uppercase tracking-widest">{editingItem ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบใหม่'}</h3>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest">ข้อมูลตั้งต้นสำหรับระบบคลังสินค้า</p>
              </div>
              <button onClick={() => setIsItemModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">ชื่อวัตถุดิบ</label>
                  <input {...register("name")} className={`w-full px-5 py-4 bg-slate-50 border ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-emerald-500'} rounded-2xl text-sm outline-none focus:bg-white transition-all`} placeholder="เช่น อกไก่, ข้าวหอมมะลิ" />
                  {errors.name && <span className="text-red-500 text-xs ml-1 mt-1 block">{errors.name.message}</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">หมวดหมู่</label>
                    <select {...register("category")} className={`w-full px-5 py-4 bg-slate-50 border ${errors.category ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-emerald-500'} rounded-2xl text-sm outline-none focus:bg-white transition-all appearance-none`}>
                      <option value="">เลือกหมวดหมู่</option>
                      <option value="เนื้อสัตว์">🥩 เนื้อสัตว์</option>
                      <option value="ผัก/ผลไม้">🥦 ผัก/ผลไม้</option>
                      <option value="เครื่องปรุง">🧂 เครื่องปรุง</option>
                      <option value="ของแห้ง">🍝 ของแห้ง</option>
                      <option value="บรรจุภัณฑ์">📦 บรรจุภัณฑ์</option>
                      <option value="เครื่องดื่ม">🥤 เครื่องดื่ม</option>
                      <option value="อื่นๆ">❓ อื่นๆ</option>
                    </select>
                    {errors.category && <span className="text-red-500 text-xs ml-1 mt-1 block">{errors.category.message}</span>}
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">หน่วยนับ</label>
                    <select {...register("storage_unit")} className={`w-full px-5 py-4 bg-slate-50 border ${errors.storage_unit ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-emerald-500'} rounded-2xl text-sm outline-none focus:bg-white transition-all appearance-none`}>
                      <option value="">เลือกหน่วย</option>
                      <option value="g">กรัม (g)</option>
                      <option value="kg">กิโลกรัม (kg)</option>
                      <option value="ml">มิลลิลิตร (ml)</option>
                      <option value="L">ลิตร (L)</option>
                      <option value="ชิ้น">ชิ้น (pcs)</option>
                      <option value="ฟอง">ฟอง (unit)</option>
                      <option value="แพ็ค">แพ็ค (pack)</option>
                      <option value="ขวด">ขวด (bottle)</option>
                    </select>
                    {errors.storage_unit && <span className="text-red-500 text-xs ml-1 mt-1 block">{errors.storage_unit.message}</span>}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2 ml-1">แจ้งเตือนสต็อกต่ำกว่า (Min Level)</label>
                  <input {...register("min_stock_level", { valueAsNumber: true })} type="number" step="0.01" className={`w-full px-5 py-4 bg-slate-50 border ${errors.min_stock_level ? 'border-red-500 focus:border-red-500' : 'border-transparent focus:border-emerald-500'} rounded-2xl text-sm outline-none focus:bg-white transition-all`} />
                  {errors.min_stock_level && <span className="text-red-500 text-xs ml-1 mt-1 block">{errors.min_stock_level.message}</span>}
                </div>

                {/* Unit Conversion Section - Only for Editing */}
                {editingItem && (
                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">ตั้งค่าการแปลงหน่วย (สำหรับรับของ)</h4>
                    <div className="space-y-3">
                      {conversions.map(conv => (
                        <div key={conv.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-xs text-slate-600">1 {conv.from_unit} = {conv.conversion_factor} {conv.to_unit}</span>
                          <button type="button" onClick={() => handleDeleteConversion(conv.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      
                      <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/50">
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-2">เพิ่มหน่วยใหม่</p>
                        <div className="flex gap-2">
                           <input name="from_unit" placeholder="หน่วยใหญ่ (เช่น ลัง)" className="flex-1 px-3 py-2 bg-white border border-emerald-100 rounded-lg text-xs outline-none focus:border-emerald-500" form="conv-form" />
                           <input name="factor" type="number" step="0.01" placeholder="ตัวคูณ" className="w-20 px-3 py-2 bg-white border border-emerald-100 rounded-lg text-xs outline-none focus:border-emerald-500" form="conv-form" />
                           <button type="submit" form="conv-form" className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition-all">เพิ่ม</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button type="submit" className="w-full py-5 bg-emerald-500 text-white rounded-2xl font-normal text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20">บันทึกข้อมูล</button>
            </form>
            <form id="conv-form" onSubmit={handleAddConversion} className="hidden" />

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
