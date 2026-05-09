import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, 
  Utensils, Clock, Camera, Flame, 
  Save, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { useMenuStore } from '../../../store/menuStore';
import type { MenuItem } from '../../../types';

interface MenuManagementProps {
  type: 'member' | 'retail';
}

// Ultra-lightweight Menu Card
const MenuCard = React.memo(({ 
  item, 
  onEdit, 
  onDelete 
}: { 
  item: MenuItem; 
  onEdit: (item: MenuItem) => void; 
  onDelete: (item: MenuItem) => void;
}) => (
  <div className="group bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all duration-200 overflow-hidden relative">
    <div className="relative aspect-video overflow-hidden bg-slate-100">
      <img 
        src={item.image_url} 
        alt={item.name} 
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute top-3 left-3 flex gap-2">
        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-sm ${
          item.is_available ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {item.is_available ? 'Active' : 'Hidden'}
        </span>
      </div>
      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button 
          onClick={() => onEdit(item)}
          className="w-10 h-10 bg-white text-slate-800 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
        >
          <Edit2 size={18} />
        </button>
        <button 
          onClick={() => onDelete(item)}
          className="w-10 h-10 bg-white text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
    
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-sm font-medium text-slate-800 line-clamp-1 flex-1">{item.name}</h3>
        <span className="text-sm font-bold text-emerald-600">฿{item.base_price}</span>
      </div>
      
      <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-xl">
        <div className="flex-1 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Kcal</p>
          <p className="text-xs font-bold text-orange-500">{item.calories}</p>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex-1 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Prot</p>
          <p className="text-xs font-bold text-blue-500">{item.protein}g</p>
        </div>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex-1 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Carb</p>
          <p className="text-xs font-bold text-emerald-500">{item.carbs}g</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
          {item.category}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <Clock size={12} />
          {item.prep_time_minutes}m
        </div>
      </div>
    </div>
  </div>
));

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

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menus.map(m => m.category)));
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
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop',
      is_available: true,
      tags: [],
      prep_time_minutes: 15
    });
    setIsPanelOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem({ ...item });
    setIsPanelOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem?.name) {
      toast.error('กรุณาระบุชื่อเมนู');
      return;
    }

    const promise = editingItem.id 
      ? updateMenu(editingItem.id, editingItem)
      : addMenu(editingItem as Omit<MenuItem, 'id'>);

    toast.promise(promise, {
      loading: 'กำลังบันทึกข้อมูล...',
      success: () => {
        setIsPanelOpen(false);
        setEditingItem(null);
        return editingItem.id ? 'อัปเดตเมนูสำเร็จ' : 'เพิ่มเมนูใหม่สำเร็จ';
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
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-lg px-6 py-2.5 font-medium',
        cancelButton: 'rounded-lg px-6 py-2.5 font-medium'
      }
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
    } catch (error: any) {
      setIsUploading(false);
      toast.error('อัปโหลดรูปภาพล้มเหลว');
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden relative">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${isPanelOpen ? 'mr-[400px]' : 'mr-0'}`}>
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar h-full">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-4 sticky top-0 bg-slate-50 z-10 py-2 border-b border-slate-100">
            <div className="flex items-center gap-6 flex-1 max-w-4xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="ค้นหาเมนู..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:border-emerald-500 transition-all outline-none shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                {categories.slice(0, 5).map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      categoryFilter === cat ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-medium shadow-sm"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">เพิ่มเมนูใหม่</span>
            </button>
          </div>

          {/* Grid Layout */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Utensils size={32} className="opacity-20" />
              </div>
              <p className="font-medium text-slate-500">ไม่พบข้อมูลเมนูที่ต้องการ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
              {filteredMenus.map((item) => (
                <MenuCard 
                  key={item.id} 
                  item={item} 
                  onEdit={handleEdit} 
                  onDelete={handleDelete} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Side Panel (Editor) */}
      <div className={`fixed top-0 right-0 w-[400px] h-screen bg-white border-l border-slate-100 shadow-2xl z-[100] flex flex-col transition-transform duration-200 ease-in-out ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Panel Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingItem?.id ? 'แก้ไขข้อมูลเมนู' : 'เพิ่มเมนูใหม่'}
            </h3>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">
              {editingItem?.id ? 'Update menu details' : 'Configure new dish'}
            </p>
          </div>
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {editingItem && (
            <>
              {/* Image Section */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">รูปภาพเมนูอาหาร</label>
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 group">
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                      <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img src={editingItem.image_url} className="w-full h-full object-cover" />
                      <label className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="text-white mb-2" size={28} />
                        <span className="text-white text-xs font-medium">เปลี่ยนรูปภาพ</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* General Info */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ชื่อรายการอาหาร</label>
                  <input 
                    type="text"
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:border-emerald-500 outline-none transition-all font-medium"
                    placeholder="ระบุชื่อเมนู..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">หมวดหมู่</label>
                    <select 
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none cursor-pointer"
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">กลุ่มเป้าหมาย</label>
                    <select 
                      value={editingItem.menu_group}
                      onChange={(e) => setEditingItem({ ...editingItem, menu_group: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none cursor-pointer"
                    >
                      <option value="Member">ปิ่นโต</option>
                      <option value="Retail Only">ขายปลีก</option>
                      <option value="All">ทั้งหมด</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">ราคาพื้นฐาน (บาท)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                    <input 
                      type="number"
                      value={editingItem.base_price}
                      onChange={(e) => setEditingItem({ ...editingItem, base_price: Number(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Macros */}
              <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Flame size={14} className="text-orange-500" /> สารอาหาร (Macros)
                  </h4>
                  <div className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-lg">
                    {editingItem.calories} KCAL
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-bold ml-1">โปรตีน (G)</p>
                      <input 
                        type="number" 
                        value={editingItem.protein}
                        onChange={(e) => setEditingItem({ ...editingItem, protein: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium outline-none"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-bold ml-1">คาร์โบไฮเดรต (G)</p>
                      <input 
                        type="number" 
                        value={editingItem.carbs}
                        onChange={(e) => setEditingItem({ ...editingItem, carbs: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium outline-none"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-bold ml-1">ไขมัน (G)</p>
                      <input 
                        type="number" 
                        value={editingItem.fat}
                        onChange={(e) => setEditingItem({ ...editingItem, fat: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-medium outline-none"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-400 font-bold ml-1">แคลอรี่รวม</p>
                      <input 
                        type="number" 
                        value={editingItem.calories}
                        onChange={(e) => setEditingItem({ ...editingItem, calories: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-sm font-bold text-orange-600 outline-none"
                      />
                   </div>
                </div>
              </div>

              {/* Visibility */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={() => setEditingItem({ ...editingItem, is_available: !editingItem.is_available })}
                    className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-all duration-200 flex items-center ${
                      editingItem.is_available ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">สถานะการแสดงผล</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div className="px-8 py-6 border-t border-slate-50 flex gap-3 bg-white sticky bottom-0 z-10">
          <button 
            onClick={() => setIsPanelOpen(false)}
            className="flex-1 py-3.5 bg-slate-50 text-slate-600 rounded-2xl text-sm font-medium hover:bg-slate-100 transition-all"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-bold shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            บันทึกข้อมูล
          </button>
        </div>
      </div>

      {/* Backdrop for Panel */}
      {isPanelOpen && (
        <div 
          onClick={() => setIsPanelOpen(false)}
          className="fixed inset-0 bg-slate-900/10 z-[90]"
        />
      )}
    </div>
  );
};
