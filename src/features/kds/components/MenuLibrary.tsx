import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Plus, Upload, ImageIcon, Edit2, Trash2, Eye, Beaker } from 'lucide-react';
import Swal from 'sweetalert2';
import { useKdsStore } from '../../../store/kdsStore';
import type { MenuItem, RecipeItem, InventoryItem } from '../../../types';
import { fetchMenuRecipes, fetchInventoryForRecipes, addMenuRecipe, deleteMenuRecipe, updateMenuTargetCost } from '../api';

// --- Sub-component for Menu Item Card to prevent unnecessary re-renders ---
const MenuCard = memo(({ 
  menu, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete,
  onView
}: { 
  menu: MenuItem, 
  isSelected: boolean, 
  onSelect: (id: string | null) => void,
  onEdit: (e: React.MouseEvent, menu: MenuItem) => void,
  onDelete: (e: React.MouseEvent, menu: MenuItem) => void,
  onView: (e: React.MouseEvent, menu: MenuItem) => void
}) => {
  const isOutOfStock = !menu.is_available;

  return (
    <div 
      onClick={() => !isOutOfStock && onSelect(isSelected ? null : menu.id)}
      className={`group relative p-3 rounded-2xl border-2 transition-all cursor-pointer ${
        isOutOfStock 
          ? 'bg-slate-50 border-transparent opacity-60 grayscale cursor-not-allowed'
          : isSelected 
            ? 'bg-emerald-500 border-emerald-600 shadow-xl shadow-emerald-500/30 -translate-y-1' 
            : 'bg-white border-slate-100 hover:border-emerald-100 hover:bg-slate-50/50 shadow-sm'
      }`}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          {menu.image_url ? (
              <img src={menu.image_url} alt={menu.name} className="w-14 h-14 rounded-xl object-cover bg-slate-100 shadow-sm ring-2 ring-white" />
          ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200">
                <ImageIcon size={20} />
              </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <h4 className={`text-sm font-normal leading-tight break-words mb-1 ${isSelected ? 'text-white' : 'text-slate-800'}`}>
              {menu.name}
            </h4>
            <div className="flex gap-2 text-[9px] font-normal opacity-70">
              <span className={isSelected ? 'text-white' : 'text-slate-500'}>🔥 {menu.calories || 0} kcal</span>
              <span className={isSelected ? 'text-white' : 'text-slate-500'}>🥩 P: {menu.protein || 0}g</span>
              <span className={isSelected ? 'text-white' : 'text-slate-500'}>🍚 C: {menu.carbs || 0}g</span>
              <span className={isSelected ? 'text-white' : 'text-slate-500'}>🥑 F: {menu.fat || 0}g</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className={`text-[10px] font-normal uppercase tracking-tight px-3 py-1 rounded-lg ${
              isSelected 
                ? 'bg-black/20 text-white' 
                : menu.menu_group === 'pinto'
                  ? 'bg-orange-100 text-orange-700'
                  : menu.menu_group === 'special'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
            }`}>
              {menu.menu_group === 'pinto' ? 'ปิ่นโต' : menu.menu_group === 'special' ? 'พิเศษ' : 'ทั่วไป'}
            </span>
            
            <div className="flex gap-1">
              <button 
                onClick={(e) => onEdit(e, menu)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isSelected ? 'bg-white/20 text-white hover:bg-white hover:text-emerald-500' : 'bg-slate-100 text-slate-500 hover:bg-emerald-500 hover:text-white shadow-sm'
                }`}
                title="แก้ไข"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={(e) => onDelete(e, menu)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isSelected ? 'bg-white/20 text-white hover:bg-red-500' : 'bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white shadow-sm'
                }`}
                title="ลบ"
              >
                <Trash2 size={14} />
              </button>
              <button 
                onClick={(e) => onView(e, menu)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isSelected ? 'bg-white/20 text-white hover:bg-emerald-500' : 'bg-slate-100 text-slate-500 hover:bg-blue-500 hover:text-white shadow-sm'
                }`}
                title="ดูรายละเอียด"
              >
                <Eye size={14} />
              </button>
            </div>

            {isOutOfStock && (
              <span className="text-[10px] font-normal text-red-500 uppercase tracking-widest ml-auto">ของหมด</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Separate Modal Component to isolate typing state from the list ---
const MenuFormModal = memo(({ 
  isOpen, 
  onClose, 
  editingMenuId, 
  initialData, 
  onSave,
  isViewOnly = false,
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  editingMenuId: string | null,
  initialData: any,
  onSave: (data: any, file: File | null) => Promise<void>,
  isViewOnly?: boolean
}) => {
  const [formState, setFormState] = useState(initialData);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.image_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [newRecipe, setNewRecipe] = useState({ item_id: '', qty: 0, yield: 100 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedInventoryItem = useMemo(() => {
    return inventoryItems.find(i => i.id === newRecipe.item_id);
  }, [newRecipe.item_id, inventoryItems]);

  useEffect(() => {
    if (isOpen && editingMenuId) {
      loadRecipeData();
    }
  }, [isOpen, editingMenuId]);

  const loadRecipeData = async () => {
    if (!editingMenuId) return;
    try {
      const [recipeData, invData] = await Promise.all([
        fetchMenuRecipes(editingMenuId),
        fetchInventoryForRecipes()
      ]);
      setRecipes(recipeData);
      setInventoryItems(invData);
    } catch (error) {
      console.error("Error loading recipes:", error);
    }
  };

  const calculateTotalCost = useMemo(() => {
    return recipes.reduce((sum, r) => {
      const cost = (r.quantity_required * (r.avg_unit_cost || 0)) / (r.yield_percentage / 100);
      return sum + cost;
    }, 0);
  }, [recipes]);

  const handleAddRecipe = async () => {
    try {
      if (!newRecipe.item_id) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกวัตถุดิบก่อนครับ', 'warning');
        return;
      }
      if (newRecipe.qty <= 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาระบุปริมาณที่ต้องใช้', 'warning');
        return;
      }

      await addMenuRecipe({
        menu_item_id: editingMenuId!,
        menu_name: formState.name || 'ไม่มีชื่อเมนู',
        item_id: newRecipe.item_id,
        quantity_required: newRecipe.qty,
        yield_percentage: newRecipe.yield || 100
      });
      
      const updatedRecipes = await fetchMenuRecipes(editingMenuId!);
      setRecipes(updatedRecipes);
      
      // อัปเดตต้นทุนเป้าหมายในตารางเมนูหลัก
      const newTotal = updatedRecipes.reduce((sum, r) => {
        const cost = (r.quantity_required * (r.avg_unit_cost || 0)) / (r.yield_percentage / 100);
        return sum + cost;
      }, 0);
      await updateMenuTargetCost(editingMenuId!, newTotal);
      
      setIsAddingRecipe(false);
      setNewRecipe({ item_id: '', qty: 0, yield: 100 });
      Swal.fire({ title: 'เพิ่มวัตถุดิบแล้ว', icon: 'success', timer: 1000, showConfirmButton: false });
    } catch (error: any) {
      console.error("Add recipe error:", error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ (อาจเป็นเพราะยังไม่ได้ตั้งค่าสิทธิ์เข้าถึงในฐานข้อมูล)', 'error');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบวัตถุดิบนี้ออกจากสูตรอาหารใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        await deleteMenuRecipe(id);
        const updatedRecipes = await fetchMenuRecipes(editingMenuId!);
        setRecipes(updatedRecipes);
        
        // อัปเดตต้นทุนเป้าหมาย
        const newTotal = updatedRecipes.reduce((sum, r) => {
          const cost = (r.quantity_required * (r.avg_unit_cost || 0)) / (r.yield_percentage / 100);
          return sum + cost;
        }, 0);
        await updateMenuTargetCost(editingMenuId!, newTotal);

        Swal.fire({ title: 'ลบเรียบร้อย', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (error) {
        console.error("Delete recipe error:", error);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบวัตถุดิบได้', 'error');
      }
    }
  };

  useEffect(() => {
    setFormState(initialData);
    setImagePreview(initialData.image_url);
    setSelectedFile(null);
  }, [initialData]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      await onSave(formState, selectedFile);
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };
  const categories = [
    { value: 'ของหวาน', label: 'ของหวาน' },
    { value: 'สลัด', label: 'สลัด' },
    { value: 'ซูวี', label: 'ซูวี (Sous-vide)' },
    { value: 'ซุป/แกง', label: 'ซุป/แกง' },
    { value: 'ผัด', label: 'ผัด' },
    { value: 'เส้น', label: 'เส้น' },
    { value: 'เมนูหลัก', label: 'เมนูหลัก' }
  ];

  const groups = [
    { value: 'pinto', label: 'ปิ่นโต' },
    { value: 'standard', label: 'ทั่วไป' },
    { value: 'special', label: 'พิเศษ' }
  ];

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 z-[50] flex items-center justify-center p-2 md:p-8 backdrop-blur-md transition-all overflow-hidden">
       <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden animate-scale-in border border-white/20">
          {/* Sticky Header */}
          <div className="sticky top-0 z-[110] px-6 py-4 md:px-8 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white/95 backdrop-blur-md">
             <div>
                <h3 className="text-xl font-normal text-slate-800 uppercase tracking-widest leading-none mb-1">
                  {isViewOnly ? 'รายละเอียดเมนู' : editingMenuId ? 'แก้ไขข้อมูลเมนู' : 'เพิ่มเมนูใหม่ลงคลัง'}
                </h3>
                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">
                  {isViewOnly ? 'ตรวจสอบข้อมูลโภชนาการและรายละเอียด' : 'รายละเอียดครบถ้วนช่วยให้จัดการง่ายขึ้น'}
                </p>
             </div>
             <button 
               onClick={onClose} 
               className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center shadow-sm border border-slate-100 active:scale-90"
               title="ปิดหน้าต่าง"
             >
               <X size={24} />
             </button>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto custom-scrollbar">
            {/* Left side: Image Upload */}
            <div className="w-full md:w-2/5 p-8 border-r border-slate-50 bg-slate-50/30">
               <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-4 ml-1">รูปภาพประกอบเมนู</label>
               <div onClick={() => !isViewOnly && fileInputRef.current?.click()} className={`group relative w-full aspect-square bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center transition-all overflow-hidden shadow-sm ${!isViewOnly ? 'cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30' : 'cursor-default'}`}>
                 {imagePreview ? (
                   <>
                     <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                     {!isViewOnly && (
                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                         <Upload className="text-white" size={24} />
                       </div>
                     )}
                   </>
                 ) : (
                   <div className="flex flex-col items-center text-slate-400 transition-all group-hover:text-emerald-500">
                     <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center shadow-inner mb-4 border border-slate-100 group-hover:scale-110 transition-transform">
                        <Upload size={32} className="opacity-40" />
                     </div>
                     <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-center px-4">
                       {isViewOnly ? 'ไม่มีรูปภาพ' : 'คลิกเพื่ออัปโหลด'}
                     </span>
                   </div>
                 )}
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
               </div>
               <p className="mt-4 text-[9px] text-slate-400 text-center uppercase tracking-widest leading-relaxed">
                 แนะนำรูปภาพขนาด 1:1 <br/> รองรับไฟล์ JPG, PNG, WEBP
               </p>
            </div>

            {/* Right side: Form Fields */}
            <div className="flex-1 p-8 space-y-6">
               <div className="space-y-4">
                  <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">ชื่อรายการอาหาร</label>
                      <input 
                        type="text" 
                        value={formState.name}
                        onChange={(e) => !isViewOnly && setFormState({...formState, name: e.target.value})}
                        readOnly={isViewOnly}
                        className={`w-full px-5 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-sm font-normal outline-none transition-all ${!isViewOnly ? 'focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5' : 'cursor-default opacity-70'}`}
                        placeholder="ระบุชื่อเมนูภาษาไทย..."
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">หมวดหมู่</label>
                        <select 
                          value={formState.category}
                          onChange={(e) => setFormState({...formState, category: e.target.value})}
                          disabled={isViewOnly}
                          className={`w-full px-4 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-xs font-normal outline-none cursor-pointer focus:bg-white transition-all ${isViewOnly ? 'cursor-default opacity-80' : ''}`}
                        >
                          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">กลุ่มเมนู</label>
                        <select 
                          value={formState.menu_group}
                          onChange={(e) => setFormState({...formState, menu_group: e.target.value as any})}
                          disabled={isViewOnly}
                          className={`w-full px-4 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-xs font-normal outline-none cursor-pointer focus:bg-white transition-all ${isViewOnly ? 'cursor-default opacity-80' : ''}`}
                        >
                          {groups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">แคลอรี่ (kcal)</label>
                        <input 
                          type="number" 
                          value={formState.calories}
                          onChange={(e) => !isViewOnly && setFormState({...formState, calories: Number(e.target.value)})}
                          readOnly={isViewOnly}
                          className={`w-full px-5 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-sm font-normal outline-none transition-all ${!isViewOnly ? 'focus:bg-white focus:border-emerald-500' : 'cursor-default opacity-70'}`}
                          placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">โปรตีน (g)</label>
                        <input 
                          type="number" 
                          value={formState.protein}
                          onChange={(e) => !isViewOnly && setFormState({...formState, protein: Number(e.target.value)})}
                          readOnly={isViewOnly}
                          className={`w-full px-5 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-sm font-normal outline-none transition-all ${!isViewOnly ? 'focus:bg-white focus:border-emerald-500' : 'cursor-default opacity-70'}`}
                          placeholder="0"
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">คาร์บ (g)</label>
                        <input 
                          type="number" 
                          value={formState.carbs}
                          onChange={(e) => !isViewOnly && setFormState({...formState, carbs: Number(e.target.value)})}
                          readOnly={isViewOnly}
                          className={`w-full px-5 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-sm font-normal outline-none transition-all ${!isViewOnly ? 'focus:bg-white focus:border-emerald-500' : 'cursor-default opacity-70'}`}
                          placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">ไขมัน (g)</label>
                        <input 
                          type="number" 
                          value={formState.fat}
                          onChange={(e) => !isViewOnly && setFormState({...formState, fat: Number(e.target.value)})}
                          readOnly={isViewOnly}
                          className={`w-full px-5 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-sm font-normal outline-none transition-all ${!isViewOnly ? 'focus:bg-white focus:border-emerald-500' : 'cursor-default opacity-70'}`}
                          placeholder="0"
                        />
                    </div>
                  </div>
               </div>

               {/* Phase 3: Recipe Management Section */}
               {editingMenuId && (
                 <div className="mt-8 pt-8 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-4 px-1">
                      <div className="flex items-center gap-2 text-slate-800">
                        <Beaker size={18} className="text-emerald-500" />
                        <h4 className="text-sm font-semibold">สูตรอาหาร & วัตถุดิบหลัก</h4>
                      </div>
                      {!isViewOnly && (
                        <button 
                          onClick={() => setIsAddingRecipe(true)}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-normal uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          <Plus size={14} /> เพิ่มวัตถุดิบ
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl overflow-hidden border border-slate-100">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="bg-white/50 text-slate-500 font-medium">
                            <th className="px-4 py-3">วัตถุดิบ</th>
                            <th className="px-4 py-3 text-right">ปริมาณ</th>
                            <th className="px-4 py-3 text-right">% ส่วนที่ใช้ได้จริง</th>
                            <th className="px-4 py-3 text-right">ต้นทุน/จาน</th>
                            {!isViewOnly && <th className="px-4 py-3"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recipes.length === 0 ? (
                            <tr>
                              <td colSpan={isViewOnly ? 4 : 5} className="px-4 py-6 text-center text-slate-400 italic">ยังไม่มีการระบุสูตรอาหาร</td>
                            </tr>
                          ) : (
                            recipes.map(r => {
                              const itemCost = (r.quantity_required * (r.avg_unit_cost || 0)) / (r.yield_percentage / 100);
                              return (
                                <tr key={r.id} className="group hover:bg-white transition-colors">
                                  <td className="px-4 py-3 text-slate-700 font-normal">
                                    {r.item_name}
                                    <span className="ml-2 text-[8px] text-slate-400">({r.storage_unit})</span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-600">{r.quantity_required}</td>
                                  <td className="px-4 py-3 text-right text-slate-400">{r.yield_percentage}%</td>
                                  <td className="px-4 py-3 text-right text-emerald-600 font-normal">฿{itemCost.toFixed(2)}</td>
                                  {!isViewOnly && (
                                    <td className="px-4 py-3 text-right">
                                      <button 
                                        onClick={() => handleDeleteRecipe(r.id)} 
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                                        title="ลบวัตถุดิบ"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot className="bg-emerald-50/50 border-t border-emerald-100">
                          <tr className="text-emerald-700 font-semibold">
                            <td className="px-4 py-3">รวมต้นทุนวัตถุดิบสุทธิ</td>
                            <td colSpan={2}></td>
                            <td className="px-4 py-3 text-right font-normal text-xs tracking-tight">฿{calculateTotalCost.toFixed(2)}</td>
                            {!isViewOnly && <td></td>}
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* ฟอร์มเพิ่มวัตถุดิบแบบเข้าใจง่าย */}
                    {isAddingRecipe && (
                      <div className="mt-4 p-6 bg-emerald-50/30 border border-emerald-100 rounded-[2rem] shadow-inner animate-scale-in">
                        <div className="space-y-5">
                          {/* 1. เลือกของ */}
                          <div>
                             <label className="block text-xs font-semibold text-slate-700 mb-2 ml-1">1. เลือกวัตถุดิบที่ใช้ในเมนูนี้</label>
                             <select 
                               value={newRecipe.item_id} 
                               onChange={(e) => setNewRecipe({...newRecipe, item_id: e.target.value})}
                               className="w-full px-4 py-3 bg-white rounded-2xl text-sm outline-none border border-slate-200 focus:border-emerald-500 shadow-sm transition-all"
                             >
                               <option value="">-- คลิกเพื่อเลือกวัตถุดิบ --</option>
                               {inventoryItems.map(i => (
                                 <option key={i.id} value={i.id}>{i.name} (คลังมี: {i.current_stock} {i.storage_unit})</option>
                               ))}
                             </select>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* 2. ใส่ปริมาณ */}
                            <div>
                               <label className="block text-sm font-bold text-slate-800 mb-2 ml-1">
                                 2. ใช้ปริมาณกี่ {selectedInventoryItem?.storage_unit || 'หน่วย'}?
                               </label>
                               <div className="relative">
                                 <input 
                                   type="number" 
                                   value={newRecipe.qty || ''} 
                                   onChange={(e) => setNewRecipe({...newRecipe, qty: Number(e.target.value)})}
                                   className="w-full px-5 py-4 bg-white rounded-2xl text-lg font-semibold outline-none border-2 border-slate-100 focus:border-emerald-500 shadow-sm transition-all placeholder:font-normal placeholder:text-slate-300"
                                   placeholder="เช่น 500"
                                 />
                                 {selectedInventoryItem && (
                                   <div className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-100 rounded-lg text-slate-500 font-bold">
                                     {selectedInventoryItem.storage_unit}
                                   </div>
                                 )}
                               </div>
                            </div>

                            {/* 3. ค่า Yield */}
                            <div>
                               <label className="block text-sm font-bold text-slate-800 mb-2 ml-1">
                                 3. ของที่ซื้อมา ใช้ได้จริงกี่ %?
                               </label>
                               <div className="relative">
                                 <input 
                                   type="number" 
                                   value={newRecipe.yield || ''} 
                                   onChange={(e) => setNewRecipe({...newRecipe, yield: Number(e.target.value)})}
                                   className="w-full px-5 py-4 bg-white rounded-2xl text-lg font-semibold outline-none border-2 border-slate-100 focus:border-emerald-500 shadow-sm transition-all"
                                   placeholder="100"
                                 />
                                 <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</div>
                               </div>
                               <p className="mt-3 text-[11px] text-slate-500 leading-relaxed bg-white/50 p-3 rounded-xl border border-slate-100 shadow-sm">
                                 <strong className="text-emerald-600">คำแนะนำ:</strong><br/>
                                 • ถ้าใช้ได้หมดทุกส่วน (เช่น น้ำเปล่า, ซอส) **ให้ใส่ 100**<br/>
                                 • ถ้ามีส่วนที่ต้องทิ้ง (เช่น ปอกเปลือก, ตัดมันออก) **ให้ใส่ตัวเลขที่เหลือจริง** เช่น 80 หรือ 90
                               </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button onClick={handleAddRecipe} className="flex-1 py-3.5 bg-emerald-500 text-white rounded-2xl text-sm font-semibold hover:bg-emerald-600 transition-all shadow-md active:scale-95">เพิ่มลงในสูตรอาหาร</button>
                          <button onClick={() => setIsAddingRecipe(false)} className="px-6 py-3.5 bg-slate-100 text-slate-500 rounded-2xl text-sm font-medium hover:bg-slate-200 transition-all">ยกเลิก</button>
                        </div>
                      </div>
                    )}
                 </div>
               )}
               
               {!isViewOnly && (
                 <button 
                   onClick={handleSave}
                   disabled={!formState.name || isUploading}
                   className="w-full py-5 bg-emerald-500 text-white rounded-[1.25rem] font-normal text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                 >
                   {isUploading ? (
                     <><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> กำลังบันทึก...</>
                   ) : (
                     <>{editingMenuId ? <Edit2 size={16} /> : <Plus size={16} />} {editingMenuId ? 'ยืนยันการแก้ไขข้อมูล' : 'บันทึกเมนูเข้าคลัง'}</>
                   )}
                 </button>
               )}
            </div>
          </div>
       </div>
    </div>,
    document.body
  );
});

export const MenuLibrary: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const menus = useKdsStore(state => state.menus);
  const searchTerm = useKdsStore(state => state.searchTerm);
  const setSearchTerm = useKdsStore(state => state.setSearchTerm);
  const categoryFilter = useKdsStore(state => state.categoryFilter);
  const setCategoryFilter = useKdsStore(state => state.setCategoryFilter);
  const groupFilter = useKdsStore(state => state.groupFilter);
  const setGroupFilter = useKdsStore(state => state.setGroupFilter);
  const selectedMenuId = useKdsStore(state => state.selectedMenuId);
  const setSelectedMenuId = useKdsStore(state => state.setSelectedMenuId);
  const addMenuItem = useKdsStore(state => state.addMenuItem);
  const updateMenuItem = useKdsStore(state => state.updateMenuItem);
  const deleteMenuItem = useKdsStore(state => state.deleteMenuItem);
  const uploadImage = useKdsStore(state => state.uploadImage);

  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState({
    name: '',
    category: 'ผัดแห้ง',
    menu_group: 'pinto',
    protein: 0,
    calories: 0,
    carbs: 0,
    fat: 0,
    image_url: '',
    tags: [],
    is_available: true
  });


  const filteredMenus = useMemo(() => {
    return menus.filter(menu => {
      const matchSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'All' || menu.category === categoryFilter;
      const matchGroup = groupFilter === 'All' || menu.menu_group === groupFilter;
      return matchSearch && matchCategory && matchGroup;
    });
  }, [menus, searchTerm, categoryFilter, groupFilter]);

  const handleOpenAdd = React.useCallback(() => {
    setEditingMenuId(null);
    setIsViewOnly(false);
    setInitialFormData({
      name: '', 
      category: 'ผัดแห้ง', 
      menu_group: 'pinto', 
      protein: 0, 
      calories: 0, 
      carbs: 0,
      fat: 0,
      image_url: '', 
      tags: [], 
      is_available: true
    });
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = React.useCallback((e: React.MouseEvent, menu: MenuItem) => {
    e.stopPropagation();
    setEditingMenuId(menu.id);
    setIsViewOnly(false);
    setInitialFormData({
      name: menu.name,
      category: menu.category,
      menu_group: menu.menu_group,
      protein: menu.protein || 0,
      calories: menu.calories || 0,
      carbs: menu.carbs || 0,
      fat: menu.fat || 0,
      image_url: menu.image_url || '',
      tags: (menu.tags as any) || [],
      is_available: menu.is_available
    });
    setIsModalOpen(true);
  }, []);

  const handleOpenView = React.useCallback((e: React.MouseEvent, menu: MenuItem) => {
    e.stopPropagation();
    setEditingMenuId(menu.id);
    setIsViewOnly(true);
    setInitialFormData({
      name: menu.name,
      category: menu.category,
      menu_group: menu.menu_group,
      protein: menu.protein || 0,
      calories: menu.calories || 0,
      carbs: menu.carbs || 0,
      fat: menu.fat || 0,
      image_url: menu.image_url || '',
      tags: (menu.tags as any) || [],
      is_available: menu.is_available
    });
    setIsModalOpen(true);
  }, []);

  const handleDelete = React.useCallback(async (e: React.MouseEvent, menu: MenuItem) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `ต้องการลบ "${menu.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบ!',
      cancelButtonText: 'ยกเลิก',
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'rounded-[2rem]',
        confirmButton: 'rounded-xl',
        cancelButton: 'rounded-xl'
      }
    });

    if (result.isConfirmed) {
      await deleteMenuItem(menu.id);
      Swal.fire({ title: 'ลบสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  }, [deleteMenuItem]);

  const handleSave = React.useCallback(async (formData: any, file: File | null) => {
    let finalImageUrl = formData.image_url;
    if (file) {
      finalImageUrl = await uploadImage(file);
    }

    if (editingMenuId) {
      await updateMenuItem(editingMenuId, { ...formData, image_url: finalImageUrl });
    } else {
      await addMenuItem({ ...formData, image_url: finalImageUrl });
    }

    setIsModalOpen(false);
    Swal.fire({ title: 'สำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
  }, [editingMenuId, uploadImage, updateMenuItem, addMenuItem]);

  return (
    <div className="w-full bg-white border-l xl:border-l-0 xl:border-r border-slate-200 h-full flex flex-col flex-shrink-0 relative overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner"><ImageIcon size={20} className="opacity-80" /></div>
             <div><h3 className="font-normal text-slate-800 uppercase tracking-widest text-xs">คลังเมนูหลัก</h3><p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">{filteredMenus.length} รายการ</p></div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={handleOpenAdd} className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg active:scale-95"><Plus size={20} /></button>
             {onClose && (<button onClick={onClose} className="xl:hidden w-10 h-10 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center hover:bg-slate-200"><X size={20} /></button>)}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="relative group">
            <Search className="absolute left-4 top-3.5 text-slate-300 group-focus-within:text-emerald-500" size={18} />
            <input 
              type="text" 
              value={localSearchTerm} 
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearchTerm(val);
                setSearchTerm(val);
              }}
              placeholder="ค้นหาเมนูอาหาร..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm font-normal focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex gap-2">
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-1/3 bg-slate-50 text-slate-600 text-[10px] font-normal uppercase tracking-widest rounded-xl px-3 py-3 outline-none focus:bg-white focus:border-emerald-500 transition-all">
              <option value="All">ทุกกลุ่ม</option><option value="pinto">ปิ่นโต</option><option value="standard">ทั่วไป</option><option value="special">พิเศษ</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="flex-1 bg-slate-50 text-slate-600 text-[10px] font-normal uppercase tracking-widest rounded-xl px-3 py-3 outline-none focus:bg-white focus:border-emerald-500 transition-all">
              <option value="All">ทุกหมวดหมู่</option>
              <option value="ของหวาน">ของหวาน</option>
              <option value="สลัด">สลัด</option>
              <option value="ซูวี">ซูวี</option>
              <option value="ซุป/แกง">ซุป/แกง</option>
              <option value="ผัด">ผัด</option>
              <option value="เส้น">เส้น</option>
              <option value="เมนูหลัก">เมนูหลัก</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white custom-scrollbar">
        {filteredMenus.map(menu => (
          <MenuCard 
            key={menu.id} 
            menu={menu} 
            isSelected={selectedMenuId === menu.id} 
            onSelect={setSelectedMenuId} 
            onEdit={handleOpenEdit} 
            onDelete={handleDelete}
            onView={handleOpenView}
          />
        ))}
      </div>
      
      {selectedMenuId && (
        <div className="p-6 bg-slate-900 text-white shadow-2xl flex items-center justify-center gap-3 relative z-30">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          <p className="text-[10px] font-normal uppercase tracking-[0.2em]">เลือกมื้อในปฏิทินเพื่อวางเมนู</p>
        </div>
      )}

      <MenuFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingMenuId={editingMenuId} 
        initialData={initialFormData} 
        onSave={handleSave}
        isViewOnly={isViewOnly}
      />
    </div>
  );
};
