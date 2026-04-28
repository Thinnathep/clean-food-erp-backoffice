import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { Search, X, Plus, Upload, ImageIcon, Edit2, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { useKdsStore } from '../../../store/kdsStore';
import type { MenuItem } from '../../../types';

// --- Sub-component for Menu Item Card to prevent unnecessary re-renders ---
const MenuCard = memo(({ 
  menu, 
  isSelected, 
  onSelect, 
  onEdit, 
  onDelete 
}: { 
  menu: MenuItem, 
  isSelected: boolean, 
  onSelect: (id: string | null) => void,
  onEdit: (e: React.MouseEvent, menu: MenuItem) => void,
  onDelete: (e: React.MouseEvent, menu: MenuItem) => void
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
            <h4 className={`text-sm font-normal leading-tight break-words ${isSelected ? 'text-white' : 'text-slate-800'}`}>
              {menu.name}
            </h4>
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
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  editingMenuId: string | null,
  initialData: any,
  onSave: (data: any, file: File | null) => Promise<void>
}) => {
  const [formState, setFormState] = useState(initialData);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData.image_url);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all">
       <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-white/20">
          <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
             <div>
                <h3 className="text-lg font-normal text-slate-800 uppercase tracking-widest leading-none mb-1">
                  {editingMenuId ? 'แก้ไขข้อมูล' : 'เพิ่มเมนูใหม่'}
                </h3>
                <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">ข้อมูลจะถูกอัปเดตลงคลังทันที</p>
             </div>
             <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center shadow-sm">
               <X size={20} />
             </button>
          </div>
          
          <div className="p-8 space-y-6">
             <div onClick={() => fileInputRef.current?.click()} className="group relative w-full h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all overflow-hidden">
               {imagePreview ? (
                 <>
                   <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                   <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                     <Upload className="text-white" size={24} />
                   </div>
                 </>
               ) : (
                 <div className="flex flex-col items-center text-slate-400 transition-all group-hover:text-emerald-500">
                   <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4 border border-slate-100 group-hover:scale-110 transition-transform">
                      <Upload size={32} className="opacity-40" />
                   </div>
                   <span className="text-[11px] font-normal uppercase tracking-[0.2em]">คลิกเพื่ออัปโหลดรูปภาพ</span>
                 </div>
               )}
               <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
             </div>

             <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">ชื่อรายการอาหาร</label>
                    <input 
                      type="text" 
                      value={formState.name}
                      onChange={(e) => setFormState({...formState, name: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-sm font-normal focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                      placeholder="ระบุชื่อเมนูภาษาไทย..."
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">หมวดหมู่</label>
                      <select 
                        value={formState.category}
                        onChange={(e) => setFormState({...formState, category: e.target.value})}
                        className="w-full px-4 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-xs font-normal outline-none cursor-pointer"
                      >
                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-[10px] font-normal text-slate-400 uppercase tracking-widest mb-2 ml-1">กลุ่มเมนู</label>
                      <select 
                        value={formState.menu_group}
                        onChange={(e) => setFormState({...formState, menu_group: e.target.value as any})}
                        className="w-full px-4 py-4 bg-slate-50 border border-transparent rounded-[1.25rem] text-xs font-normal outline-none cursor-pointer"
                      >
                        {groups.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                      </select>
                  </div>
                </div>
             </div>
             
             <button 
               onClick={handleSave}
               disabled={!formState.name || isUploading}
               className="w-full py-5 bg-emerald-500 text-white rounded-[1.25rem] font-normal text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
             >
               {isUploading ? (
                 <><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> บันทึกข้อมูล...</>
               ) : (
                 <>{editingMenuId ? <Edit2 size={16} /> : <Plus size={16} />} {editingMenuId ? 'ยืนยันการแก้ไข' : 'บันทึกเมนูเข้าคลัง'}</>
               )}
             </button>
          </div>
       </div>
    </div>
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
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState({
    name: '',
    category: 'ผัดแห้ง',
    menu_group: 'pinto',
    protein: 0,
    calories: 0,
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
    setInitialFormData({
      name: '', category: 'ผัดแห้ง', menu_group: 'pinto', protein: 0, calories: 0, image_url: '', tags: [], is_available: true
    });
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = React.useCallback((e: React.MouseEvent, menu: MenuItem) => {
    e.stopPropagation();
    setEditingMenuId(menu.id);
    setInitialFormData({
      name: menu.name,
      category: menu.category,
      menu_group: menu.menu_group,
      protein: menu.protein || 0,
      calories: menu.calories || 0,
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

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-white custom-scrollbar">
        {filteredMenus.map(menu => (
          <MenuCard key={menu.id} menu={menu} isSelected={selectedMenuId === menu.id} onSelect={setSelectedMenuId} onEdit={handleOpenEdit} onDelete={handleDelete} />
        ))}
      </div>
      
      {selectedMenuId && (
        <div className="p-6 bg-slate-900 text-white shadow-2xl flex items-center justify-center gap-3 relative z-30">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          <p className="text-[10px] font-normal uppercase tracking-[0.2em]">เลือกมื้อในปฏิทินเพื่อวางเมนู</p>
        </div>
      )}

      <MenuFormModal 
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingMenuId={editingMenuId} initialData={initialFormData} onSave={handleSave}
      />
    </div>
  );
};
