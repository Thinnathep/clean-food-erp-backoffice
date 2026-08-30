import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Plus, 
  Trash2, 
  ChevronRight, 
  UtensilsCrossed,
  X,
  AlertCircle,
  Leaf, 
  Flame, 
  Droplet, 
  Beef, 
  Fish, 
  Carrot, 
  Salad, 
  Coffee, 
  Apple
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useMenuStore } from '../../../store/menuStore';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';
import Select from 'react-select';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_OPTIONS = [
  { id: 'UtensilsCrossed', icon: <UtensilsCrossed /> },
  { id: 'Salad', icon: <Salad /> },
  { id: 'Beef', icon: <Beef /> },
  { id: 'Fish', icon: <Fish /> },
  { id: 'Carrot', icon: <Carrot /> },
  { id: 'Leaf', icon: <Leaf /> },
  { id: 'Apple', icon: <Apple /> },
  { id: 'Coffee', icon: <Coffee /> },
  { id: 'Flame', icon: <Flame /> },
  { id: 'Droplet', icon: <Droplet /> },
];

const renderIcon = (iconValue: string, size: number = 24) => {
  const found = ICON_OPTIONS.find(i => i.id === iconValue);
  if (found) {
    return React.cloneElement(found.icon as React.ReactElement<any>, { size });
  }
  // Fallback to emoji for older data
  return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{iconValue}</span>;
};

export const TemplateManagement: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const { menus, loadMenus } = useMenuStore();

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('UtensilsCrossed');
  const [deleteConfirm, setDeleteConfirm] = useState<{ day: number; slot: number; id: string; name: string } | null>(null);

  useEffect(() => {
    fetchCategories();
    if (menus.length === 0) {
      loadMenus();
    }
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchTemplates();
    }
  }, [selectedCategory, selectedWeek]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('erp_system_configs')
      .select('value')
      .eq('key', 'TEMPLATE_CATEGORIES')
      .single();
    
    if (data && data.value) {
      const cats = data.value as any[];
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }
    } else {
      setCategories([
        { id: 'normal', name: 'เมนูปกติ', icon: 'UtensilsCrossed' }
      ]);
      if (!selectedCategory) setSelectedCategory('normal');
    }
  };

  const handleSaveNewCategory = async () => {
    if (!newCatName.trim()) {
      toast.error('กรุณาระบุชื่อ Template');
      return;
    }
    
    const id = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const newCategories = [...categories, { id, name: newCatName, icon: newCatIcon }];
    
    const { error } = await supabase
      .from('erp_system_configs')
      .upsert({
        key: 'TEMPLATE_CATEGORIES',
        value: newCategories,
        description: 'Categories for Menu Templates'
      });
      
    if (!error) {
      setCategories(newCategories);
      setSelectedCategory(id);
      setIsAddModalOpen(false);
      setNewCatName('');
      setNewCatIcon('UtensilsCrossed');
      toast.success('สร้าง Template ใหม่เรียบร้อย');
    } else {
      toast.error(error.message);
    }
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('menu_cycle_templates')
      .select('*')
      .eq('category', selectedCategory)
      .eq('week_number', selectedWeek)
      .order('day_of_week')
      .order('meal_slot');
    
    if (!error) setTemplates(data || []);
  };

  const handleSaveSlot = async (day: number, slot: number, menuName: string) => {
    if (!menuName) return;
    
    const existing = templates.find(t => 
      t.week_number === selectedWeek && 
      t.day_of_week === day && 
      t.meal_slot === slot
    );

    const payload = {
      category: selectedCategory,
      week_number: selectedWeek,
      day_of_week: day,
      meal_slot: slot,
      menu_name: menuName
    };

    if (existing) {
      const { error } = await supabase
        .from('menu_cycle_templates')
        .update(payload)
        .eq('id', existing.id);
      if (error) toast.error(error.message);
    } else {
      const { error } = await supabase
        .from('menu_cycle_templates')
        .insert([payload]);
      if (error) toast.error(error.message);
    }
    
    fetchTemplates();
    toast.success('อัปเดต Template เรียบร้อย');
  };

  const confirmDeleteSlot = async () => {
    if (!deleteConfirm) return;
    
    const { error } = await supabase
      .from('menu_cycle_templates')
      .delete()
      .eq('id', deleteConfirm.id);
    
    if (!error) {
      fetchTemplates();
      toast.success('ลบรายการเรียบร้อย');
    } else {
      toast.error(error.message);
    }
    setDeleteConfirm(null);
  };

  const DAYS = [
    { id: 1, name: 'จันทร์', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { id: 2, name: 'อังคาร', color: 'bg-pink-50 text-pink-700 border-pink-200' },
    { id: 3, name: 'พุธ', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { id: 4, name: 'พฤหัสบดี', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 5, name: 'ศุกร์', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 6, name: 'เสาร์', color: 'bg-purple-50 text-purple-700 border-purple-200' }
  ];

  return (
    <div className="flex flex-col bg-slate-50 min-h-full relative">
      {/* Top Controls Bar */}
      <div className="bg-white px-4 md:px-6 py-2.5 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-3 z-10 relative shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Layout size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-tight">จัดการแม่แบบเมนู 4 สัปดาห์</h3>
            <p className="text-[11px] text-slate-400">โครงสร้างเมนูหมุนเวียนอัตโนมัติประจำรอบสัปดาห์</p>
          </div>
        </div>

        {/* Week Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
          {[1, 2, 3, 4].map(w => (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all outline-none cursor-pointer",
                selectedWeek === w 
                  ? "bg-slate-900 text-white shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              สัปดาห์ที่ {w}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Category Sidebar */}
        <div className="w-full md:w-64 lg:w-72 bg-white/80 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-200/60 p-4 md:p-5 shrink-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">รูปแบบ Template</h3>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition-all focus:outline-none cursor-pointer"
              title="เพิ่ม Template ใหม่"
            >
              <Plus size={14} strokeWidth={2.5} />
            </button>
          </div>
          
          {/* Scrollable categories */}
          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-2xl transition-all duration-200 border outline-none shrink-0 md:shrink w-[160px] md:w-full cursor-pointer",
                  selectedCategory === cat.id 
                    ? "bg-indigo-50/80 border-indigo-200 text-indigo-800 font-black shadow-xs" 
                    : "bg-white border-slate-200/70 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-6 h-6 text-indigo-600">
                    {renderIcon(cat.icon, 18)}
                  </span>
                  <span className="text-xs font-bold tracking-tight truncate">{cat.name}</span>
                </div>
                {selectedCategory === cat.id && (
                  <div className="hidden md:block text-indigo-600">
                     <ChevronRight size={16} strokeWidth={2.5} />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          <div className="px-4 md:px-8 py-6 pb-12 overflow-x-auto custom-scrollbar">
            <div className="grid grid-cols-6 gap-3 md:gap-5 min-w-[900px] md:min-w-[1200px]">
              {DAYS.map(day => (
                <div key={day.id} className="space-y-4">
                  <div className={cn("text-center py-3 border rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-sm sticky top-0 z-10 backdrop-blur-md", day.color)}>
                    วัน{day.name}
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    {[1, 2, 3, 4, 5, 6].map(slot => {
                      const slotId = `${day.id}-${slot}`;
                      const isEditing = editingSlot === slotId;
                      const template = templates.find(t => 
                        t.week_number === selectedWeek && 
                        t.day_of_week === day.id && 
                        t.meal_slot === slot
                      );
                      
                      const options = menus.map(m => ({ value: m.name, label: `${m.name} (${m.category})` }));

                      return (
                        <div 
                          key={slot} 
                          className={cn(
                            "min-h-[110px] rounded-2xl border p-3.5 transition-all duration-200 relative group flex flex-col items-center justify-center text-center cursor-pointer",
                            template 
                              ? "bg-white border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-indigo-300" 
                              : "bg-slate-100/60 border-slate-200/60 border-dashed hover:bg-white hover:border-indigo-300 hover:shadow-2xs"
                          )}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.delete-btn')) return;
                            setEditingSlot(slotId);
                          }}
                        >
                          <span className="absolute -top-2.5 -left-2.5 w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-2xs z-10">
                            {slot}
                          </span>

                          <AnimatePresence>
                            {isEditing && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className="absolute inset-x-0 -top-2 z-30 bg-white rounded-2xl shadow-xl flex flex-col p-3 border border-indigo-200" 
                                onClick={e => e.stopPropagation()}
                              >
                                <div className="flex justify-between items-center mb-2 px-1">
                                  <span className="text-xs font-bold text-slate-700">เลือกเมนู มื้อที่ {slot}</span>
                                  <button onClick={() => setEditingSlot(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-1 transition-colors cursor-pointer">
                                    <X size={13} />
                                  </button>
                                </div>
                                <Select 
                                  autoFocus
                                  defaultMenuIsOpen
                                  menuPortalTarget={document.body}
                                  className="w-full text-left text-xs font-medium"
                                  options={options}
                                  placeholder="ค้นหาเมนู..."
                                  onChange={(selected: any) => {
                                    setEditingSlot(null);
                                    if (selected) {
                                      handleSaveSlot(day.id, slot, selected.value);
                                    }
                                  }}
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    menu: (base) => ({ 
                                      ...base, 
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                                    }),
                                    control: (base, state) => ({ 
                                      ...base, 
                                      minHeight: '38px', 
                                      borderRadius: '10px',
                                      borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                                      boxShadow: state.isFocused ? '0 0 0 1px #6366f1' : 'none',
                                      '&:hover': { borderColor: '#6366f1' }
                                    }),
                                    option: (base, state) => ({
                                      ...base,
                                      backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#e0e7ff' : 'white',
                                      color: state.isSelected ? 'white' : '#1e293b',
                                      cursor: 'pointer'
                                    })
                                  }}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {template ? (
                            <>
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-1.5 group-hover:scale-105 transition-all">
                                <UtensilsCrossed size={16} strokeWidth={2} />
                              </div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-2 px-1 leading-snug">
                                {template.menu_name}
                              </p>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm({ day: day.id, slot, id: template.id, name: template.menu_name });
                                }}
                                className="delete-btn absolute -top-1.5 -right-1.5 w-6 h-6 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all z-20 shadow-xs cursor-pointer"
                                title="ลบเมนู"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                               <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                                 <Plus size={14} strokeWidth={2.5} />
                                </div>
                               <span className="text-[10px] font-bold text-slate-500 tracking-wide">เพิ่มเมนู</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-md pointer-events-auto"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">สร้าง Template ใหม่</h3>
                    <p className="text-sm text-slate-500 mt-1">กำหนดรูปแบบหมวดหมู่เมนูที่คุณต้องการ</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-2 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">ชื่อ Template</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="เช่น ลดน้ำหนัก, เพิ่มกล้ามเนื้อ..."
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-base font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveNewCategory();
                      }}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider pl-1">เลือกไอคอน</label>
                    <div className="grid grid-cols-5 gap-2 bg-slate-50 p-2 rounded-2xl border-2 border-slate-200">
                      {ICON_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setNewCatIcon(opt.id)}
                          className={cn(
                            "aspect-square rounded-xl flex items-center justify-center transition-all",
                            newCatIcon === opt.id 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105" 
                              : "bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                          )}
                        >
                          {React.cloneElement(opt.icon as React.ReactElement<any>, { size: 24 })}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3.5 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={handleSaveNewCategory}
                    className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5"
                  >
                    สร้าง Template
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-[2rem] shadow-2xl p-8 w-full max-w-sm pointer-events-auto text-center"
              >
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
                  <AlertCircle size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">ยืนยันการลบเมนู</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  คุณต้องการลบเมนู <br/><span className="font-bold text-slate-800 text-base">"{deleteConfirm.name}"</span><br/> ออกจากมื้อที่ {deleteConfirm.slot} ใช่หรือไม่?
                </p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3.5 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button 
                    onClick={confirmDeleteSlot}
                    className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5"
                  >
                    ลบรายการ
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
