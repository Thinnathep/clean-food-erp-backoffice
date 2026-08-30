import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, 
  Utensils, Clock, Camera, Flame, 
  Save, Package, ListChecks, Calculator,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useMenuStore } from '../../../store/menuStore';
import type { MenuItem } from '../../../types';
import { useInventoryStore } from '../../../store/inventoryStore';

interface MenuManagementProps {
  type: 'member' | 'retail';
}

// ─── Modern Bento Menu Card ───
const MenuCard = React.memo(({ 
  item, 
  index = 0,
  onEdit, 
  onDelete 
}: { 
  item: MenuItem; 
  index?: number;
  onEdit: (item: MenuItem) => void; 
  onDelete: (item: MenuItem) => void;
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-400/80 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs">
      
      {/* Image & Quick Action Overlay */}
      <div className="relative aspect-video overflow-hidden bg-slate-100 flex items-center justify-center">
        {item.image_url && !imgError ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading={index < 8 ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300 gap-1">
            <Utensils size={28} className="opacity-40" />
            <span className="text-[10px] font-medium text-slate-400">ไม่มีรูปภาพ</span>
          </div>
        )}

        {/* Status Pills */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-start z-10">
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs ${
            item.is_available 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-700 text-white'
          }`}>
            {item.is_available ? 'แสดงหน้าร้าน' : 'ซ่อน'}
          </span>
          {item.is_out_of_stock && (
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs bg-red-500 text-white">
              หมด (Sold Out)
            </span>
          )}
        </div>

        {/* Action Overlay */}
        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
          <button 
            type="button"
            onClick={() => onEdit(item)}
            className="w-10 h-10 bg-white text-slate-800 rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-md active:scale-95"
            title="แก้ไขเมนู"
          >
            <Edit2 size={16} />
          </button>
          <button 
            type="button"
            onClick={() => onDelete(item)}
            className="w-10 h-10 bg-white text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-md active:scale-95"
            title="ลบเมนู"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      {/* Content Body */}
      <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
              {item.name}
            </h3>
            <span className="text-sm font-bold font-mono text-emerald-700 shrink-0">
              ฿{(item.base_price || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold text-[10px]">
              {item.category || 'ทั่วไป'}
            </span>
            <div className="flex items-center gap-1 font-mono">
              <Clock size={12} className="text-slate-400" />
              <span>{item.prep_time_minutes || 15} นาที</span>
            </div>
          </div>
        </div>

        {/* Nutritional Macros Breakdown Bento */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-50 rounded-2xl border border-slate-100 text-center font-mono">
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">KCAL</p>
            <p className="text-xs font-black text-orange-600">{item.calories || 0}</p>
          </div>
          <div className="border-l border-slate-200/60 pl-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">PROT</p>
            <p className="text-xs font-bold text-blue-600">{item.protein || 0}g</p>
          </div>
          <div className="border-l border-slate-200/60 pl-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">CARB</p>
            <p className="text-xs font-bold text-emerald-600">{item.carbs || 0}g</p>
          </div>
          <div className="border-l border-slate-200/60 pl-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">FAT</p>
            <p className="text-xs font-bold text-amber-600">{item.fat || 0}g</p>
          </div>
        </div>
      </div>

    </div>
  );
});

export const MenuManagement: React.FC<MenuManagementProps> = ({ type }) => {
  const { 
    menus, 
    addMenu, 
    updateMenu, 
    removeMenu, 
    uploadImage, 
    isLoading 
  } = useMenuStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [activePanelTab, setActivePanelTab] = useState<'general' | 'recipe' | 'steps' | 'overheads'>('general');
  const { items: inventoryItems, loadItems } = useInventoryStore();

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menus.map(m => m.category))).filter(Boolean);
    return ['ทั้งหมด', ...cats];
  }, [menus]);

  const filteredMenus = useMemo(() => {
    return menus.filter(m => {
      const matchesGroup = type === 'member' 
        ? m.menu_group !== 'Retail Only' 
        : m.menu_group === 'Retail Only' || m.menu_group === 'All';
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'ทั้งหมด' || m.category === categoryFilter;
      return matchesGroup && matchesSearch && matchesCategory;
    });
  }, [menus, searchQuery, categoryFilter, type]);

  const handleOpenAdd = () => {
    setEditingItem({
      name: '',
      category: 'เมนูหลัก',
      menu_group: type === 'member' ? 'Member' : 'Retail Only',
      base_price: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: '',
      image_url: '',
      is_available: true,
      is_out_of_stock: false,
      tags: [],
      prep_time_minutes: 15,
      recipe_items: [],
      recipe_steps: [],
      packaging_cost: 0,
      labor_cost: 0,
      transport_cost: 0,
      overhead_cost: 0
    });
    setActivePanelTab('general');
    setIsPanelOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem({ 
      ...item,
      recipe_items: item.recipe_items || [],
      recipe_steps: item.recipe_steps || [],
      packaging_cost: item.packaging_cost || 0,
      labor_cost: item.labor_cost || 0,
      transport_cost: item.transport_cost || 0,
      overhead_cost: item.overhead_cost || 0
    });
    setActivePanelTab('general');
    setIsPanelOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem?.name) {
      toast.error('กรุณาระบุชื่อเมนูอาหาร');
      return;
    }

    const { recipe_items, recipe_steps, ...menuData } = editingItem;

    const promise = (async () => {
      let targetId = editingItem.id;
      if (!targetId) {
        targetId = await addMenu(menuData as Omit<MenuItem, 'id'>);
      } else {
        await updateMenu(targetId, menuData);
      }
      
      const { saveRecipeData } = useMenuStore.getState();
      if (saveRecipeData) {
        await saveRecipeData(
          targetId, 
          recipe_items || [], 
          recipe_steps || []
        );
      }
      return targetId;
    })();

    toast.promise(promise, {
      loading: 'กำลังบันทึกข้อมูลเมนู...',
      success: () => {
        setIsPanelOpen(false);
        setEditingItem(null);
        return editingItem.id ? 'อัปเดตเมนูสำเร็จ ✨' : 'เพิ่มเมนูใหม่สำเร็จ ✨';
      },
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล'
    });
  };

  const handleDelete = async (item: MenuItem) => {
    const result = await Swal.fire({
      title: 'ลบเมนูอาหาร?',
      text: `คุณต้องการลบ "${item.name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      toast.promise(removeMenu(item.id), {
        loading: 'กำลังลบเมนู...',
        success: 'ลบเมนูอาหารสำเร็จ',
        error: 'เกิดข้อผิดพลาดในการลบเมนู'
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImage(file);
      setEditingItem(prev => prev ? { ...prev, image_url: url } : null);
      setIsUploading(false);
      toast.success('อัปโหลดรูปภาพสำเร็จ');
    } catch {
      setIsUploading(false);
      toast.error('อัปโหลดรูปภาพล้มเหลว');
    }
  };

  const title = type === 'member' ? 'จัดการเมนูสมาชิก (ปิ่นโต)' : 'จัดการเมนูหน้าร้าน (Retail)';
  const subtitle = type === 'member' 
    ? 'รายการเมนูสำหรับสมาชิกคอร์สอาหารคลีนและการวางแผนมื้อส่ง' 
    : 'รายการเมนูอาหารคลีนพร้อมทานสำหรับจำหน่ายหน้าร้าน';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <BookOpen size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  {title}
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {type === 'member' ? 'Member Course' : 'Retail Menu'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              type="button" 
              onClick={handleOpenAdd}
              className="w-full md:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>เพิ่มเมนูใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Toolbar & Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative group w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อเมนูอาหาร..."
                className="w-full pl-10 pr-9 py-2 bg-slate-100/80 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all" 
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="text-right w-full sm:w-auto">
              <span className="text-[11px] font-medium text-slate-400">แสดง {filteredMenus.length} จาก {menus.length} รายการ</span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((c) => {
              const isSelected = categoryFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Menu Grid ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, n) => (
              <div key={n} className="h-72 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
            ))}
          </div>
        ) : filteredMenus.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Utensils size={36} className="mx-auto mb-2 text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">ไม่พบข้อมูลเมนูอาหาร</h3>
            <p className="text-xs text-slate-400 mt-1">กดปุ่ม "เพิ่มเมนูใหม่" หรือเปลี่ยนคำค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-12">
            {filteredMenus.map((item, idx) => (
              <MenuCard 
                key={item.id} 
                item={item} 
                index={idx}
                onEdit={handleEdit} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        )}

      </div>

      {/* ─── Modern Slide-over / Bottom Sheet Editor ─── */}
      <AnimatePresence>
        {isPanelOpen && editingItem && (
          <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-end backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.25 }}
              className="bg-white w-full sm:w-[500px] h-[92vh] sm:h-full shadow-2xl flex flex-col sm:rounded-l-3xl rounded-t-3xl overflow-hidden z-10"
            >
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                    <Utensils size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {editingItem.id ? 'แก้ไขข้อมูลเมนู' : 'เพิ่มเมนูอาหารใหม่'}
                    </h3>
                    <p className="text-[11px] text-slate-400">สูตรอาหาร สารอาหาร และต้นทุน</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsPanelOpen(false)} 
                  className="p-1.5 text-white/80 hover:text-white rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-tabs Switcher */}
              <div className="flex bg-slate-100 p-1.5 border-b border-slate-200 shrink-0 gap-1">
                {[
                  { id: 'general', label: 'ทั่วไป', icon: Edit2 },
                  { id: 'recipe', label: 'สูตร (BOM)', icon: Package },
                  { id: 'steps', label: 'วิธีทำ', icon: ListChecks },
                  { id: 'overheads', label: 'ต้นทุน', icon: Calculator }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePanelTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activePanelTab === tab.id 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <tab.icon size={13} className={activePanelTab === tab.id ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs custom-scrollbar">
                
                {/* ── Tab 1: General Info ── */}
                {activePanelTab === 'general' && (
                  <div className="space-y-4">
                    {/* Image Box */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">รูปภาพอาหาร</label>
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 group flex items-center justify-center">
                        {isUploading ? (
                          <div className="flex items-center justify-center gap-2 text-slate-500 font-bold">
                            <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <span>กำลังอัปโหลด...</span>
                          </div>
                        ) : (
                          <>
                            {editingItem.image_url ? (
                              <img src={editingItem.image_url} alt={editingItem.name || ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                                <Camera size={24} className="text-slate-300" />
                                <span className="text-[11px]">คลิกเพื่อเลือกไฟล์รูปภาพ</span>
                              </div>
                            )}
                            <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-bold gap-1">
                              <Camera size={20} />
                              <span>{editingItem.image_url ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        ชื่อรายการอาหาร <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={editingItem.name || ''} 
                        onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-bold text-slate-900" 
                        placeholder="เช่น อกไก่ซูวีซอสเห็ดทรัฟเฟิล"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">หมวดหมู่</label>
                        <select 
                          value={editingItem.category || 'เมนูหลัก'} 
                          onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                        >
                          <option value="เมนูหลัก">เมนูหลัก</option>
                          <option value="เส้น">เส้น</option>
                          <option value="ผัด">ผัด</option>
                          <option value="ซุป/แกง">ซุป/แกง</option>
                          <option value="ซูวี (Sous-vide)">ซูวี (Sous-vide)</option>
                          <option value="สลัด">สลัด</option>
                          <option value="ของหวาน">ของหวาน</option>
                          <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                          <option value="อาหารเสริม">อาหารเสริม</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">กลุ่มเป้าหมาย</label>
                        <select 
                          value={editingItem.menu_group || (type === 'member' ? 'Member' : 'Retail Only')} 
                          onChange={e => setEditingItem({ ...editingItem, menu_group: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-medium"
                        >
                          <option value="Member">ปิ่นโต (Member)</option>
                          <option value="Retail Only">ขายปลีก (Retail)</option>
                          <option value="All">ทั้งหมด (All)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">ราคาพื้นฐาน (฿)</label>
                        <input 
                          type="number" 
                          value={editingItem.base_price || 0} 
                          onChange={e => setEditingItem({ ...editingItem, base_price: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono font-bold" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">เวลาเตรียม (นาที)</label>
                        <input 
                          type="number" 
                          value={editingItem.prep_time_minutes || 15} 
                          onChange={e => setEditingItem({ ...editingItem, prep_time_minutes: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono font-bold" 
                        />
                      </div>
                    </div>

                    {/* Macros Container */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Flame size={14} className="text-orange-500" /> ข้อมูลโภชนาการ (Nutritional Macros)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                          {editingItem.calories || 0} KCAL
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 font-mono">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 mb-1">แคลอรี่</label>
                          <input 
                            type="number" 
                            value={editingItem.calories || 0} 
                            onChange={e => setEditingItem({ ...editingItem, calories: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-xl font-bold text-xs" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-blue-600 mb-1">โปรตีน(g)</label>
                          <input 
                            type="number" 
                            value={editingItem.protein || 0} 
                            onChange={e => setEditingItem({ ...editingItem, protein: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-xl font-bold text-xs" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-emerald-600 mb-1">คาร์บ(g)</label>
                          <input 
                            type="number" 
                            value={editingItem.carbs || 0} 
                            onChange={e => setEditingItem({ ...editingItem, carbs: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-xl font-bold text-xs" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-amber-600 mb-1">ไขมัน(g)</label>
                          <input 
                            type="number" 
                            value={editingItem.fat || 0} 
                            onChange={e => setEditingItem({ ...editingItem, fat: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 text-center bg-white border border-slate-200 rounded-xl font-bold text-xs" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Visibility Toggles */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div 
                        onClick={() => setEditingItem({ ...editingItem, is_available: !editingItem.is_available })}
                        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          editingItem.is_available ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="font-bold text-xs">แสดงผลหน้าร้าน</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${editingItem.is_available ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                      </div>

                      <div 
                        onClick={() => setEditingItem({ ...editingItem, is_out_of_stock: !editingItem.is_out_of_stock })}
                        className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                          editingItem.is_out_of_stock ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <span className="font-bold text-xs">สินค้าหมดสต็อก</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${editingItem.is_out_of_stock ? 'bg-red-500' : 'bg-slate-300'}`} />
                      </div>
                    </div>

                  </div>
                )}

                {/* ── Tab 2: Recipe BOM ── */}
                {activePanelTab === 'recipe' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">ส่วนผสมและวัตถุดิบ (BOM)</h4>
                        <p className="text-[10px] text-slate-400">กำหนดวัตถุดิบและบรรจุภัณฑ์ที่ตัดสต็อก</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newId = Math.random().toString();
                          setEditingItem({
                            ...editingItem,
                            recipe_items: [...(editingItem.recipe_items || []), { id: newId, item_id: '', quantity_required: 1, yield_percentage: 100 } as any]
                          });
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Plus size={13} /> เพิ่มวัตถุดิบ
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(editingItem.recipe_items || []).map((ritem, idx) => (
                        <div key={ritem.id || idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex gap-2 items-center">
                          <div className="flex-1">
                            <select
                              value={ritem.item_id}
                              onChange={(e) => {
                                const newItems = [...(editingItem.recipe_items || [])];
                                newItems[idx] = { ...newItems[idx], item_id: e.target.value };
                                setEditingItem({ ...editingItem, recipe_items: newItems });
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-medium"
                            >
                              <option value="">-- เลือกวัตถุดิบ --</option>
                              {inventoryItems.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name} ({inv.storage_unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-20">
                            <input
                              type="number"
                              step="0.01"
                              value={ritem.quantity_required}
                              onChange={(e) => {
                                const newItems = [...(editingItem.recipe_items || [])];
                                newItems[idx] = { ...newItems[idx], quantity_required: Number(e.target.value) };
                                setEditingItem({ ...editingItem, recipe_items: newItems });
                              }}
                              className="w-full px-2 py-1.5 text-xs text-center font-mono font-bold bg-white rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...(editingItem.recipe_items || [])];
                              newItems.splice(idx, 1);
                              setEditingItem({ ...editingItem, recipe_items: newItems });
                            }}
                            className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      {!(editingItem.recipe_items?.length) && (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Package size={24} className="mx-auto mb-1.5 opacity-40" />
                          <p className="font-bold">ยังไม่มีรายการส่วนผสม</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Tab 3: Cooking Steps ── */}
                {activePanelTab === 'steps' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">ขั้นตอนการปรุง (Instructions)</h4>
                        <p className="text-[10px] text-slate-400">สำหรับส่งต่อให้กุ๊กในหน้าจอ KDS</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newId = Math.random().toString();
                          setEditingItem({
                            ...editingItem,
                            recipe_steps: [...(editingItem.recipe_steps || []), { id: newId, instruction: '', time_minutes: 5, step_number: (editingItem.recipe_steps?.length || 0) + 1 } as any]
                          });
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Plus size={13} /> เพิ่มขั้นตอน
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(editingItem.recipe_steps || []).map((step, idx) => (
                        <div key={step.id || idx} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                              ขั้นตอนที่ {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newSteps = [...(editingItem.recipe_steps || [])];
                                newSteps.splice(idx, 1);
                                setEditingItem({ ...editingItem, recipe_steps: newSteps });
                              }}
                              className="text-slate-300 hover:text-red-500"
                            >
                              <X size={15} />
                            </button>
                          </div>
                          <textarea
                            value={step.instruction}
                            onChange={(e) => {
                              const newSteps = [...(editingItem.recipe_steps || [])];
                              newSteps[idx] = { ...newSteps[idx], instruction: e.target.value };
                              setEditingItem({ ...editingItem, recipe_steps: newSteps });
                            }}
                            placeholder="ระบุวิธีทำ..."
                            rows={2}
                            className="w-full px-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 outline-none resize-none focus:border-emerald-500"
                          />
                        </div>
                      ))}

                      {!(editingItem.recipe_steps?.length) && (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <ListChecks size={24} className="mx-auto mb-1.5 opacity-40" />
                          <p className="font-bold">ยังไม่มีขั้นตอนการปรุง</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Tab 4: Overheads Costing ── */}
                {activePanelTab === 'overheads' && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">ต้นทุนแฝง (Costing)</h4>
                      <p className="text-[10px] text-slate-400">สำหรับคำนวณ GP และตัด 4 กองทุน</p>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                        <span className="font-bold text-slate-700">ค่าบรรจุภัณฑ์ (บาท)</span>
                        <input 
                          type="number" 
                          value={editingItem.packaging_cost || 0}
                          onChange={e => setEditingItem({ ...editingItem, packaging_cost: Number(e.target.value) })}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                        <span className="font-bold text-slate-700">ค่าแรงต่อกล่อง (บาท)</span>
                        <input 
                          type="number" 
                          value={editingItem.labor_cost || 0}
                          onChange={e => setEditingItem({ ...editingItem, labor_cost: Number(e.target.value) })}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                        <span className="font-bold text-slate-700">ค่าขนส่งเฉลี่ย (บาท)</span>
                        <input 
                          type="number" 
                          value={editingItem.transport_cost || 0}
                          onChange={e => setEditingItem({ ...editingItem, transport_cost: Number(e.target.value) })}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                        <span className="font-bold text-slate-700">ค่าโสหุ้ย/เบ็ดเตล็ด (บาท)</span>
                        <input 
                          type="number" 
                          value={editingItem.overhead_cost || 0}
                          onChange={e => setEditingItem({ ...editingItem, overhead_cost: Number(e.target.value) })}
                          className="w-24 px-2 py-1 text-right font-mono font-bold bg-white border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Drawer Footer Actions */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsPanelOpen(false)} 
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  type="button" 
                  onClick={handleSave} 
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Save size={14} /> บันทึกข้อมูล
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
