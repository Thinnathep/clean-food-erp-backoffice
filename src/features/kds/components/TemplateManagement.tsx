import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Plus, 
  Trash2, 
  ChevronRight, 
  UtensilsCrossed,
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useMenuStore } from '../../../store/menuStore';
import { toast } from 'sonner';
import { cn } from '../../../lib/utils';

const CATEGORIES = [
  { id: 'normal', name: 'เมนูปกติ', icon: '🥗' },
  { id: 'non_spicy', name: 'ไม่เผ็ด', icon: '🥦' },
  { id: 'no_rice', name: 'ไม่เอาข้าว', icon: '🥚' },
  { id: 'protein_plus', name: 'เน้นโปรตีน', icon: '🍗' },
  { id: 'custom_1', name: 'เมนูอื่นๆ', icon: '✨' }
];

export const TemplateManagement: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('normal');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [templates, setTemplates] = useState<any[]>([]);
  const { menus, loadMenus } = useMenuStore();

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  useEffect(() => {
    if (menus.length === 0) {
      loadMenus();
    }
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('menu_cycle_templates')
      .select('*')
      .eq('category', selectedCategory)
      .order('week_number')
      .order('day_of_week')
      .order('meal_slot');
    
    if (!error) setTemplates(data || []);
  };

  const handleSaveSlot = async (day: number, slot: number, menuName: string) => {
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
      menu_name: menuName,
      template_name: CATEGORIES.find(c => c.id === selectedCategory)?.name
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

  const handleClearSlot = async (day: number, slot: number) => {
    const existing = templates.find(t => 
      t.week_number === selectedWeek && 
      t.day_of_week === day && 
      t.meal_slot === slot
    );
    if (!existing) return;

    const { error } = await supabase
      .from('menu_cycle_templates')
      .delete()
      .eq('id', existing.id);
    
    if (!error) {
      fetchTemplates();
      toast.success('ลบรายการเรียบร้อย');
    }
  };


  const DAYS = [
    { id: 1, name: 'จันทร์' },
    { id: 2, name: 'อังคาร' },
    { id: 3, name: 'พุธ' },
    { id: 4, name: 'พฤหัสบดี' },
    { id: 5, name: 'ศุกร์' },
    { id: 6, name: 'เสาร์' }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-5 border-b border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <Layout size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">จัดการแม่แบบเมนู (Menu Templates)</h2>
            <p className="text-sm text-slate-500 font-medium">กำหนดสำรับมาตรฐานสำหรับแต่ละกลุ่มลูกค้า</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 p-4 space-y-2 overflow-y-auto">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-4">เลือกประเภท Template</h3>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                selectedCategory === cat.id 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm font-bold" 
                  : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </div>
              {selectedCategory === cat.id && <ChevronRight size={16} />}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Week Selector */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-center gap-4">
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                onClick={() => setSelectedWeek(w)}
                className={cn(
                  "px-6 py-2 rounded-xl text-sm font-bold transition-all border",
                  selectedWeek === w 
                    ? "bg-slate-900 text-white shadow-lg border-slate-900" 
                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-500 hover:text-indigo-600"
                )}
              >
                สัปดาห์ที่ {w}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-6 gap-4 min-w-[1000px]">
              {DAYS.map(day => (
                <div key={day.id} className="space-y-4">
                  <div className="text-center py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm">
                    วัน{day.name}
                  </div>
                  {[1, 2, 3].map(slot => {
                    const template = templates.find(t => 
                      t.week_number === selectedWeek && 
                      t.day_of_week === day.id && 
                      t.meal_slot === slot
                    );
                    
                    return (
                      <div 
                        key={slot} 
                        className={cn(
                          "min-h-[120px] rounded-2xl border-2 border-dashed p-3 transition-all relative group flex flex-col items-center justify-center text-center",
                          template 
                            ? "bg-white border-indigo-200 shadow-sm" 
                            : "bg-slate-50 border-slate-200 hover:bg-white hover:border-indigo-300"
                        )}
                      >
                        <span className="absolute -top-2 -left-2 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-200">
                          {slot}
                        </span>

                        {template ? (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-2">
                              <UtensilsCrossed size={20} />
                            </div>
                            <p className="text-sm font-bold text-slate-900 line-clamp-2 px-1">
                              {template.menu_name}
                            </p>
                            <button 
                              onClick={() => handleClearSlot(day.id, slot)}
                              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                             <Plus size={24} className="text-slate-400" />
                             <span className="text-[10px] font-bold text-slate-400">เพิ่มเมนู</span>
                          </div>
                        )}

                        <select 
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          value=""
                          onChange={(e) => handleSaveSlot(day.id, slot, e.target.value)}
                        >
                          <option value="">เลือกเมนู...</option>
                          {menus.map(m => (
                            <option key={m.id} value={m.name}>{m.name} ({m.category})</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
