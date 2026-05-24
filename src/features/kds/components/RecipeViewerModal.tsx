import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Clock, Flame, ListChecks, CheckSquare } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import type { RecipeItem, RecipeStep } from '../../../types';

interface RecipeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItemId: string | null;
  menuName: string;
  totalQuantity: number;
}

export const RecipeViewerModal: React.FC<RecipeViewerModalProps> = ({ 
  isOpen, 
  onClose, 
  menuItemId, 
  menuName,
  totalQuantity
}) => {
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && menuItemId) {
      loadData();
      setCheckedSteps({});
      setActiveTab('ingredients');
    }
  }, [isOpen, menuItemId]);

  const loadData = async () => {
    if (!menuItemId) return;
    setIsLoading(true);
    try {
      // Load items
      const { data: itemsData } = await supabase
        .from('erp_recipes')
        .select(`
          *,
          erp_inventory_items (name, storage_unit)
        `)
        .eq('menu_item_id', menuItemId);
        
      if (itemsData) {
        setItems(itemsData.map(r => ({
          ...r,
          item_name: (r as any).erp_inventory_items?.name,
          storage_unit: (r as any).erp_inventory_items?.storage_unit,
        })) as any);
      }

      // Load steps
      const { data: stepsData } = await supabase
        .from('erp_recipe_steps')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .order('step_number', { ascending: true });
        
      if (stepsData) {
        setSteps(stepsData as any);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-orange-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{menuName}</h3>
                <p className="text-xs font-medium text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded-lg inline-block mt-0.5">
                  ยอดผลิตรวม {totalQuantity} กล่อง
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex p-2 bg-slate-50 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('ingredients')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'ingredients' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Flame size={16} /> ส่วนผสม (x{totalQuantity})
            </button>
            <button
              onClick={() => setActiveTab('steps')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'steps' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ListChecks size={16} /> วิธีทำ
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : activeTab === 'ingredients' ? (
              <div className="space-y-3">
                {items.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <p>ยังไม่ได้เพิ่มสูตรส่วนผสม</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="font-medium text-slate-800">{item.item_name}</h4>
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-700">
                          {item.quantity_required * totalQuantity}
                        </span>
                        <span className="text-xs font-medium text-slate-500 ml-1">{item.storage_unit}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {steps.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                    <p>ยังไม่ได้เพิ่มขั้นตอนวิธีทำ</p>
                  </div>
                ) : (
                  steps.map((step, idx) => (
                    <div 
                      key={step.id} 
                      onClick={() => setCheckedSteps(prev => ({ ...prev, [step.id]: !prev[step.id] }))}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex gap-4 ${
                        checkedSteps[step.id] 
                          ? 'bg-emerald-50/50 border-emerald-100' 
                          : 'bg-white border-slate-100 hover:border-emerald-200 shadow-sm'
                      }`}
                    >
                      <div className={`mt-0.5 shrink-0 transition-colors ${checkedSteps[step.id] ? 'text-emerald-500' : 'text-slate-300'}`}>
                        <CheckSquare size={20} className={checkedSteps[step.id] ? 'fill-emerald-100' : ''} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            checkedSteps[step.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            ขั้นตอนที่ {step.step_number}
                          </span>
                          {step.time_minutes > 0 && (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Clock size={12} /> {step.time_minutes} นาที
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${checkedSteps[step.id] ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                          {step.instruction}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
