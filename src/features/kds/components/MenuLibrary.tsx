import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Plus, Upload, ImageIcon, Edit2, Trash2, Eye, Beaker, UtensilsCrossed } from 'lucide-react';
import Swal from 'sweetalert2';
import { useMenuStore } from '../../../store/menuStore';
import type { MenuItem, RecipeItem, InventoryItem } from '../../../types';
import { fetchMenuRecipes, fetchInventoryForRecipes, addMenuRecipe, deleteMenuRecipe, updateMenuTargetCost } from '../api';

// --- Category Theme Helper ---
const getCategoryTheme = (category?: string) => {
  switch (category) {
    case 'ของหวาน':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', icon: '🍓' };
    case 'สลัด':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: '🥗' };
    case 'ซูวี':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', icon: '🥩' };
    case 'ซุป/แกง':
    case 'ซุป':
    case 'แกง':
    case 'ต้ม':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500', icon: '🍲' };
    case 'ผัด':
    case 'ผัดแห้ง':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', icon: '🍳' };
    case 'เส้น':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', icon: '🍜' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500', icon: '🍱' };
  }
};

// --- Sub-component for Menu Item Card ---
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
  const theme = getCategoryTheme(menu.category);

  return (
    <div 
      onClick={() => onSelect(isSelected ? null : menu.id)}
      className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isSelected 
          ? 'bg-slate-900 border-slate-900 text-white shadow-xl -translate-y-0.5 ring-4 ring-emerald-500/20' 
          : 'bg-white border-slate-200/90 hover:border-emerald-400 hover:shadow-md'
      }`}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex gap-3 items-start">
          {/* Thumbnail / Food Icon Tile */}
          <div className="relative shrink-0">
            {menu.image_url ? (
              <img 
                src={menu.image_url} 
                alt={menu.name} 
                className="w-14 h-14 rounded-xl object-cover bg-slate-100 shadow-2xs border border-slate-100" 
              />
            ) : (
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-2xs border ${isSelected ? 'bg-slate-800 border-slate-700' : `${theme.bg} ${theme.border}`}`}>
                {theme.icon}
              </div>
            )}
          </div>

          {/* Title and Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {/* Category Badge */}
              <span className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isSelected 
                  ? 'bg-white/20 text-white' 
                  : `${theme.bg} ${theme.text} border ${theme.border}`
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : theme.dot}`} />
                {menu.category || 'เมนูหลัก'}
              </span>

              {/* Group Badge */}
              <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                isSelected 
                  ? 'bg-white/10 text-white' 
                  : menu.menu_group === 'pinto'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : menu.menu_group === 'special'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {menu.menu_group === 'pinto' ? 'ปิ่นโต' : menu.menu_group === 'special' ? 'พิเศษ' : 'เมนูร้าน'}
              </span>

              {/* Status Badge */}
              {isOutOfStock ? (
                <span className="text-[9px] font-medium bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-md border border-rose-200">
                  🚫 พักขาย
                </span>
              ) : (
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${isSelected ? 'text-emerald-300' : 'text-emerald-700 bg-emerald-50 border border-emerald-100'}`}>
                  ✅ พร้อมเสิร์ฟ
                </span>
              )}
            </div>

            {/* Menu Name - PRIMARY FOCAL POINT: Bold */}
            <h4 className={`text-xs sm:text-sm font-bold leading-snug break-words line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
              {menu.name}
            </h4>
          </div>
        </div>

        {/* Nutritional Macro Chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${
            isSelected 
              ? 'bg-amber-500/20 text-amber-300' 
              : 'bg-amber-50 text-amber-800 border border-amber-200/80'
          }`}>
            🔥 <strong className="font-semibold">{menu.calories || 0}</strong> kcal
          </span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${
            isSelected 
              ? 'bg-sky-500/20 text-sky-300' 
              : 'bg-sky-50 text-sky-800 border border-sky-200/80'
          }`}>
            🥩 P: <strong className="font-semibold">{menu.protein || 0}g</strong>
          </span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${
            isSelected 
              ? 'bg-emerald-500/20 text-emerald-300' 
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
          }`}>
            🍚 C: <strong className="font-semibold">{menu.carbs || 0}g</strong>
          </span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md ${
            isSelected 
              ? 'bg-purple-500/20 text-purple-300' 
              : 'bg-purple-50 text-purple-800 border border-purple-200/80'
          }`}>
            🥑 F: <strong className="font-semibold">{menu.fat || 0}g</strong>
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1">
          {menu.target_cost ? (
            <span className={`text-[10px] ${isSelected ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold'}`}>
              ต้นทุน: ฿{Number(menu.target_cost).toFixed(1)}
            </span>
          ) : (
            <span className={`text-[9px] font-normal ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
              สูตรมาตรฐาน
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={(e) => onEdit(e, menu)}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-medium transition-all cursor-pointer ${
              isSelected 
                ? 'bg-white/20 text-white hover:bg-white hover:text-slate-900' 
                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200'
            }`}
            title="แก้ไขเมนู"
          >
            <Edit2 size={11} /> แก้ไข
          </button>
          <button 
            type="button"
            onClick={(e) => onView(e, menu)}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-medium transition-all cursor-pointer ${
              isSelected 
                ? 'bg-white/20 text-white hover:bg-sky-400 hover:text-white' 
                : 'bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200'
            }`}
            title="ดูสูตร BOM"
          >
            <Eye size={11} /> สูตร
          </button>
          <button 
            type="button"
            onClick={(e) => onDelete(e, menu)}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              isSelected 
                ? 'bg-white/20 text-white hover:bg-rose-500 hover:text-white' 
                : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200'
            }`}
            title="เก็บเข้าคลัง (Archive)"
          >
            <Trash2 size={11} />
          </button>
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
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกวัตถุดิบก่อนค่ะ', 'warning');
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
    { value: 'ของหวาน', label: 'ของหวาน 🍓' },
    { value: 'ทานเล่น', label: 'ทานเล่น 🥟' },
    { value: 'สลัด', label: 'สลัด 🥗' },
    { value: 'ซูวี', label: 'ซูวี (Sous-vide) 🥩' },
    { value: 'ซุป', label: 'ซุป 🍲' },
    { value: 'แกง', label: 'แกง 🥘' },
    { value: 'ต้ม', label: 'ต้ม 🥣' },
    { value: 'ผัด', label: 'ผัด 🍳' },
    { value: 'เส้น', label: 'เส้น 🍜' },
    { value: 'เมนูหลัก', label: 'เมนูหลัก 🍱' },
    { value: 'ชุดเซต', label: 'ชุดเซต / โปรโมชั่น 🎁' }
  ];

  const groups = [
    { value: 'pinto', label: 'ปิ่นโต (Pinto Package)' },
    { value: 'standard', label: 'เมนูร้านทั่วไป (Retail)' },
    { value: 'special', label: 'เมนูพิเศษ / เสริม (Special)' }
  ];

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-3 md:p-6 backdrop-blur-sm transition-all overflow-hidden font-prompt">
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-scale-in">
          {/* Header */}
          <div className="px-6 py-4 md:px-8 md:py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <UtensilsCrossed size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {isViewOnly ? 'รายละเอียดเมนูและสูตร BOM' : editingMenuId ? 'แก้ไขข้อมูลเมนู' : 'เพิ่มเมนูใหม่ลงคลัง'}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    {isViewOnly ? 'ตรวจสอบข้อมูลโภชนาการและรายการวัตถุดิบ' : 'กรอกรายละเอียดเพื่อคำนวณสารอาหารและต้นทุน'}
                  </p>
                </div>
             </div>
             <button 
               type="button"
               onClick={onClose} 
               className="w-9 h-9 rounded-xl bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center border border-slate-200 cursor-pointer shadow-2xs"
               title="ปิดหน้าต่าง"
             >
               <X size={18} />
             </button>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row overflow-y-auto custom-scrollbar">
            {/* Left side: Image Upload */}
            <div className="w-full md:w-2/5 p-6 border-r border-slate-100 bg-slate-50/40 flex flex-col items-center">
               <label className="block text-xs font-medium text-slate-700 mb-3 self-start">รูปภาพประกอบเมนู</label>
               <div 
                 onClick={() => !isViewOnly && fileInputRef.current?.click()} 
                 className={`group relative w-full aspect-square bg-white border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center transition-all overflow-hidden shadow-2xs ${!isViewOnly ? 'cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30' : 'cursor-default'}`}
               >
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
                   <div className="flex flex-col items-center text-slate-400 transition-all group-hover:text-emerald-600">
                     <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 border border-emerald-100 text-emerald-600">
                        <ImageIcon size={28} />
                     </div>
                     <span className="text-xs font-medium text-center px-4">
                       {isViewOnly ? 'ไม่มีรูปภาพ' : 'คลิกเพื่ออัปโหลดรูปภาพ'}
                     </span>
                     <span className="text-[10px] text-slate-400 mt-1 font-normal">JPG, PNG, WEBP</span>
                   </div>
                 )}
                 <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
               </div>
               
               <div className="w-full mt-4 p-3 bg-white rounded-xl border border-slate-200 text-center">
                 <p className="text-[11px] font-medium text-slate-600">
                   สถานะเมนู: <span className="font-semibold">{formState.is_available ? '✅ เปิดให้สั่งซื้อได้' : '🚫 พักการขายชั่วคราว'}</span>
                 </p>
                 {!isViewOnly && (
                   <button
                     type="button"
                     onClick={() => setFormState({ ...formState, is_available: !formState.is_available })}
                     className={`mt-2 w-full py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                       formState.is_available 
                         ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' 
                         : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                     }`}
                   >
                     {formState.is_available ? 'สลับเป็น: พักการขาย' : 'สลับเป็น: เปิดใช้งาน'}
                   </button>
                 )}
               </div>
            </div>

            {/* Right side: Form Fields */}
            <div className="flex-1 p-6 space-y-5">
               <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">ชื่อรายการอาหาร</label>
                      <input 
                        type="text" 
                        value={formState.name}
                        onChange={(e) => !isViewOnly && setFormState({...formState, name: e.target.value})}
                        readOnly={isViewOnly}
                        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none transition-all ${!isViewOnly ? 'focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' : 'cursor-default opacity-80'}`}
                        placeholder="ระบุชื่อเมนูภาษาไทย..."
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">หมวดหมู่</label>
                        <select 
                          value={formState.category}
                          onChange={(e) => setFormState({...formState, category: e.target.value})}
                          disabled={isViewOnly}
                          className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer focus:bg-white transition-all ${isViewOnly ? 'cursor-default opacity-80' : ''}`}
                        >
                          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">กลุ่มเมนู</label>
                        <select 
                          value={formState.menu_group}
                          onChange={(e) => setFormState({...formState, menu_group: e.target.value as any})}
                          disabled={isViewOnly}
                          className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none cursor-pointer focus:bg-white transition-all ${isViewOnly ? 'cursor-default opacity-80' : ''}`}
                        >
                          {groups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                    </div>
                  </div>

                  {/* Macros Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                        <label className="block text-[10px] font-medium text-amber-800 uppercase mb-1">🔥 แคลอรี่ (kcal)</label>
                        <input 
                          type="number" 
                          value={formState.calories || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => !isViewOnly && setFormState({...formState, calories: Math.round(Number(e.target.value))})}
                          readOnly={isViewOnly}
                          className="w-full px-2 py-1.5 bg-white border border-amber-200 rounded-lg text-sm font-semibold text-amber-900 outline-none text-center"
                          placeholder="0"
                        />
                    </div>
                    <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-200">
                        <label className="block text-[10px] font-medium text-sky-800 uppercase mb-1">🥩 โปรตีน (g)</label>
                        <input 
                          type="number" 
                          value={formState.protein || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => !isViewOnly && setFormState({...formState, protein: Math.round(Number(e.target.value))})}
                          readOnly={isViewOnly}
                          className="w-full px-2 py-1.5 bg-white border border-sky-200 rounded-lg text-sm font-semibold text-sky-900 outline-none text-center"
                          placeholder="0"
                        />
                    </div>
                    <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                        <label className="block text-[10px] font-medium text-emerald-800 uppercase mb-1">🍚 คาร์บ (g)</label>
                        <input 
                          type="number" 
                          value={formState.carbs || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => !isViewOnly && setFormState({...formState, carbs: Math.round(Number(e.target.value))})}
                          readOnly={isViewOnly}
                          className="w-full px-2 py-1.5 bg-white border border-emerald-200 rounded-lg text-sm font-semibold text-emerald-900 outline-none text-center"
                          placeholder="0"
                        />
                    </div>
                    <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200">
                        <label className="block text-[10px] font-medium text-purple-800 uppercase mb-1">🥑 ไขมัน (g)</label>
                        <input 
                          type="number" 
                          value={formState.fat || ''}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => !isViewOnly && setFormState({...formState, fat: Math.round(Number(e.target.value))})}
                          readOnly={isViewOnly}
                          className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-semibold text-purple-900 outline-none text-center"
                          placeholder="0"
                        />
                    </div>
                  </div>
               </div>

               {/* Recipe BOM Section */}
               {editingMenuId && (
                 <div className="mt-6 pt-5 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-slate-900">
                        <Beaker size={16} className="text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-bold">สูตรมาตรฐาน & วัตถุดิบ (BOM)</h4>
                      </div>
                      {!isViewOnly && (
                        <button 
                          type="button"
                          onClick={() => setIsAddingRecipe(true)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100"
                        >
                          <Plus size={13} /> เพิ่มวัตถุดิบ
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-100/70 text-slate-500 font-semibold border-b border-slate-200">
                            <th className="px-3.5 py-2">วัตถุดิบ</th>
                            <th className="px-3 py-2 text-right">ปริมาณ</th>
                            <th className="px-3 py-2 text-right">% Yield</th>
                            <th className="px-3.5 py-2 text-right">ต้นทุน/จาน</th>
                            {!isViewOnly && <th className="px-2 py-2"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70">
                          {recipes.length === 0 ? (
                            <tr>
                              <td colSpan={isViewOnly ? 4 : 5} className="px-4 py-5 text-center text-slate-400 italic font-normal">
                                ยังไม่มีการระบุสูตรวัตถุดิบสำหรับเมนูนี้
                              </td>
                            </tr>
                          ) : (
                            recipes.map(r => {
                              const itemCost = (r.quantity_required * (r.avg_unit_cost || 0)) / (r.yield_percentage / 100);
                              return (
                                <tr key={r.id} className="hover:bg-white transition-colors">
                                  <td className="px-3.5 py-2 text-slate-800 font-medium">
                                    {r.item_name}
                                    <span className="ml-1 text-[10px] text-slate-400 font-normal">({r.storage_unit})</span>
                                  </td>
                                  <td className="px-3 py-2 text-right text-slate-600 font-normal">{r.quantity_required}</td>
                                  <td className="px-3 py-2 text-right text-slate-500 font-normal">{r.yield_percentage}%</td>
                                  <td className="px-3.5 py-2 text-right text-emerald-700 font-semibold">฿{itemCost.toFixed(2)}</td>
                                  {!isViewOnly && (
                                    <td className="px-2 py-2 text-right">
                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteRecipe(r.id)} 
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                                        title="ลบวัตถุดิบ"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        <tfoot className="bg-emerald-50 border-t border-emerald-200">
                          <tr className="text-emerald-900 font-bold text-xs">
                            <td className="px-3.5 py-2">รวมต้นทุนวัตถุดิบสุทธิ</td>
                            <td colSpan={2}></td>
                            <td className="px-3.5 py-2 text-right text-sm font-bold">฿{calculateTotalCost.toFixed(2)}</td>
                            {!isViewOnly && <td></td>}
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Add Ingredient Form */}
                    {isAddingRecipe && (
                      <div className="mt-3 p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-2xs space-y-3">
                        <div>
                           <label className="block text-xs font-medium text-slate-800 mb-1">เลือกวัตถุดิบจากคลัง</label>
                           <select 
                             value={newRecipe.item_id} 
                             onChange={(e) => setNewRecipe({...newRecipe, item_id: e.target.value})}
                             className="w-full px-3 py-2 bg-white rounded-xl text-xs font-medium outline-none border border-slate-200 focus:border-emerald-500 shadow-2xs"
                           >
                             <option value="">-- คลิกเพื่อเลือกวัตถุดิบ --</option>
                             {inventoryItems.map(i => (
                               <option key={i.id} value={i.id}>{i.name} (คงเหลือ: {i.current_stock} {i.storage_unit})</option>
                             ))}
                           </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                             <label className="block text-xs font-medium text-slate-800 mb-1">
                               ปริมาณ ({selectedInventoryItem?.storage_unit || 'หน่วย'})
                             </label>
                             <input 
                               type="number" 
                               value={newRecipe.qty || ''} 
                               onFocus={(e) => e.target.select()}
                               onChange={(e) => setNewRecipe({...newRecipe, qty: Number(e.target.value)})}
                               className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold outline-none border border-slate-200 focus:border-emerald-500 shadow-2xs"
                               placeholder="เช่น 150"
                             />
                          </div>

                          <div>
                             <label className="block text-xs font-medium text-slate-800 mb-1">
                               % Yield (ใช้ได้จริง)
                             </label>
                             <input 
                               type="number" 
                               value={newRecipe.yield || ''} 
                               onFocus={(e) => e.target.select()}
                               onChange={(e) => setNewRecipe({...newRecipe, yield: Number(e.target.value)})}
                               className="w-full px-3 py-2 bg-white rounded-xl text-xs font-semibold outline-none border border-slate-200 focus:border-emerald-500 shadow-2xs"
                               placeholder="100"
                             />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button 
                            type="button"
                            onClick={handleAddRecipe} 
                            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all shadow-2xs cursor-pointer"
                          >
                            บันทึกวัตถุดิบลงสูตร
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsAddingRecipe(false)} 
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-200 transition-all cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                 </div>
               )}
               
               {!isViewOnly && (
                 <button 
                   type="button"
                   onClick={handleSave}
                   disabled={!formState.name || isUploading}
                   className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-semibold text-sm hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-4"
                 >
                   {isUploading ? (
                     <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> กำลังบันทึก...</>
                   ) : (
                     <>{editingMenuId ? <Edit2 size={16} /> : <Plus size={16} />} {editingMenuId ? 'ยืนยันการแก้ไขข้อมูลเมนู' : 'บันทึกเมนูใหม่เข้าคลัง'}</>
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
  const menus = useMenuStore(state => state.menus);
  const searchTerm = useMenuStore(state => state.searchTerm);
  const setSearchTerm = useMenuStore(state => state.setSearchTerm);
  const categoryFilter = useMenuStore(state => state.categoryFilter);
  const setCategoryFilter = useMenuStore(state => state.setCategoryFilter);
  const selectedMenuId = useMenuStore(state => state.selectedMenuId);
  const setSelectedMenuId = useMenuStore(state => state.setSelectedMenuId);
  const addMenu = useMenuStore(state => state.addMenu);
  const updateMenu = useMenuStore(state => state.updateMenu);
  const removeMenu = useMenuStore(state => state.removeMenu);
  const uploadImage = useMenuStore(state => state.uploadImage);

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

  const [typeFilter, setTypeFilter] = useState<'all' | 'member' | 'retail' | 'extra'>('all');

  const filteredMenus = useMemo(() => {
    return menus.filter(menu => {
      const matchSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'All' || menu.category === categoryFilter;
      
      // Type filtering logic
      let matchType = true;
      if (typeFilter === 'member') matchType = menu.menu_group === 'pinto';
      if (typeFilter === 'retail') matchType = menu.menu_group === 'standard';
      if (typeFilter === 'extra') matchType = menu.menu_group === 'special';

      return matchSearch && matchCategory && matchType;
    });
  }, [menus, searchTerm, categoryFilter, typeFilter]);

  // Counts for tabs
  const countAll = menus.length;
  const countMember = useMemo(() => menus.filter(m => m.menu_group === 'pinto').length, [menus]);
  const countRetail = useMemo(() => menus.filter(m => m.menu_group === 'standard').length, [menus]);
  const countExtra = useMemo(() => menus.filter(m => m.menu_group === 'special').length, [menus]);

  const handleOpenAdd = React.useCallback(() => {
    setEditingMenuId(null);
    setIsViewOnly(false);
    setInitialFormData({
      name: '', 
      category: 'ผัด', 
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
      title: 'ยืนยันการเก็บเข้าคลัง?',
      text: `ต้องการเก็บเข้าคลัง (Archive) "${menu.name}"? ประวัติเดิมจะยังคงอยู่และตรวจสอบได้`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน, เก็บเข้าคลัง!',
      cancelButtonText: 'ยกเลิก',
      cancelButtonColor: '#94a3b8',
      confirmButtonColor: '#f97316',
      customClass: {
        popup: 'rounded-3xl',
        confirmButton: 'rounded-xl font-semibold',
        cancelButton: 'rounded-xl font-semibold'
      }
    });

    if (result.isConfirmed) {
      await removeMenu(menu.id);
      Swal.fire({ title: 'เก็บเข้าคลังเรียบร้อย!', icon: 'success', timer: 1500, showConfirmButton: false });
    }
  }, [removeMenu]);

  const handleSave = React.useCallback(async (formData: any, file: File | null) => {
    let finalImageUrl = formData.image_url;
    if (file) {
      finalImageUrl = await uploadImage(file);
    }

    if (editingMenuId) {
      await updateMenu(editingMenuId, { ...formData, image_url: finalImageUrl });
    } else {
      await addMenu({ ...formData, image_url: finalImageUrl });
    }

    setIsModalOpen(false);
    Swal.fire({ title: 'สำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
  }, [editingMenuId, uploadImage, updateMenu, addMenu]);

  const categoriesList = [
    { value: 'All', label: 'ทุกหมวดหมู่' },
    { value: 'ของหวาน', label: '🍓 ของหวาน' },
    { value: 'สลัด', label: '🥗 สลัด' },
    { value: 'ซูวี', label: '🥩 ซูวี' },
    { value: 'ซุป/แกง', label: '🍲 ซุป/แกง' },
    { value: 'ผัด', label: '🍳 ผัด' },
    { value: 'เส้น', label: '🍜 เส้น' },
    { value: 'เมนูหลัก', label: '🍱 เมนูหลัก' },
  ];

  return (
    <div className="w-full bg-white border-l border-slate-200 h-full flex flex-col flex-shrink-0 relative overflow-hidden font-prompt shadow-2xl">
      {/* Top Header */}
      <div className="p-4 md:p-5 border-b border-slate-200/80 bg-white sticky top-0 z-20 space-y-3.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-sm">
               <UtensilsCrossed size={20} strokeWidth={2.2} />
             </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className="font-bold text-slate-900 text-sm md:text-base tracking-tight">คลังเมนูอาหารหลัก</h3>
                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                   {filteredMenus.length} รายการ
                 </span>
               </div>
               <p className="text-[11px] text-slate-500 font-normal">รายการอาหารและสูตรมาตรฐาน KDS</p>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
               type="button"
               onClick={handleOpenAdd} 
               className="h-9 px-3 bg-emerald-600 text-white rounded-xl flex items-center gap-1.5 hover:bg-emerald-700 transition-all shadow-xs text-xs font-semibold active:scale-95 cursor-pointer"
             >
               <Plus size={16} /> <span>เพิ่มเมนู</span>
             </button>
             {onClose && (
               <button 
                 type="button"
                 onClick={onClose} 
                 className="w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                 title="ปิดหน้าต่าง"
               >
                 <X size={18} />
               </button>
             )}
          </div>
        </div>
        
        {/* Type Filter Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 gap-1">
          {[
            { id: 'all', label: 'ทั้งหมด', count: countAll },
            { id: 'member', label: 'สมาชิก (ปิ่นโต)', count: countMember },
            { id: 'retail', label: 'เมนูร้าน', count: countRetail },
            { id: 'extra', label: 'พิเศษ', count: countExtra },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id as any)}
              className={`flex-1 py-1.5 text-[11px] rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                typeFilter === tab.id 
                  ? 'bg-slate-900 text-white font-semibold shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${typeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600" size={15} />
            <input 
              type="text" 
              value={localSearchTerm} 
              onChange={(e) => {
                const val = e.target.value;
                setLocalSearchTerm(val);
                setSearchTerm(val);
              }}
              placeholder="ค้นหาชื่อเมนู..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-normal text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
            />
            {localSearchTerm && (
              <button 
                type="button"
                onClick={() => {
                  setLocalSearchTerm('');
                  setSearchTerm('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)} 
            className="bg-slate-50 text-slate-700 text-xs font-medium rounded-xl px-3 py-2 border border-slate-200 outline-none focus:bg-white focus:border-emerald-500 transition-all cursor-pointer shrink-0"
          >
            {categoriesList.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50/50 custom-scrollbar">
        {filteredMenus.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <UtensilsCrossed size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">ไม่พบเมนูที่ค้นหา</p>
            <p className="text-xs text-slate-400 mt-0.5 font-normal">ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ดูนะคะ</p>
          </div>
        ) : (
          filteredMenus.map(menu => (
            <MenuCard 
              key={menu.id} 
              menu={menu} 
              isSelected={selectedMenuId === menu.id} 
              onSelect={setSelectedMenuId} 
              onEdit={handleOpenEdit} 
              onDelete={handleDelete}
              onView={handleOpenView}
            />
          ))
        )}
      </div>
      
      {selectedMenuId && (
        <div className="p-3 bg-slate-900 text-white shadow-2xl flex items-center justify-center gap-2 relative z-30 shrink-0">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
          <p className="text-xs font-medium">เลือกมื้อในปฏิทินทางซ้ายเพื่อวางเมนูนี้</p>
          <button 
            type="button"
            onClick={() => setSelectedMenuId(null)}
            className="ml-2 text-[10px] underline text-slate-400 hover:text-white cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* Form / View Modal */}
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
