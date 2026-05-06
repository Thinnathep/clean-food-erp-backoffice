import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { 
  ClipboardCheck, 
  Search,
  Check, Plus,
  Store, Clock, Trash2, Edit3, X, Library,
  MoreHorizontal, History, ChevronRight, LayoutGrid,
  GripVertical, Trash, Mic, MicOff, ShoppingBag,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKdsStore } from '../../../store/kdsStore';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import Swal from 'sweetalert2';

dayjs.locale('th');

export const KitchenChecklist: React.FC = () => {
  const { 
    checklist, checklistDate, setChecklistDate, 
    fetchChecklist, saveChecklistItem, removeChecklistItem,
    masterChecklist, fetchMasterChecklist, addItemsToDaily, addItemToMaster, updateMasterItem, removeMasterItem,
    checklistHistory, fetchChecklistHistory, bulkClearChecklist
  } = useKdsStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'history'>('history');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (viewMode === 'list') fetchChecklist(checklistDate);
    else fetchChecklistHistory();
    fetchMasterChecklist();
  }, [checklistDate, viewMode, fetchChecklist, fetchChecklistHistory, fetchMasterChecklist]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const filteredCategories = useMemo(() => {
    let filtered = checklist;
    if (searchTerm) {
      filtered = checklist.filter(item => 
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    const groups: Record<string, any[]> = {};
    filtered.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [checklist, searchTerm]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'เนื้อสัตว์': return 'text-red-500';
      case 'ผักและผลไม้': return 'text-emerald-500';
      case 'นมและโยเกิร์ต': return 'text-blue-500';
      case 'บรรจุภัณฑ์': return 'text-orange-500';
      case 'ข้าวและเส้น': return 'text-amber-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden font-prompt">
      {/* Header Area */}
      <div className="bg-white border-b border-slate-100 z-30">
        <div className="px-4 py-4 max-w-[1600px] mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 flex-none">
                  {viewMode === 'list' ? <ClipboardCheck size={20} /> : <History size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-medium text-slate-900 tracking-tight leading-none">
                    {viewMode === 'list' ? 'เช็คลิสต์ซื้อของ' : 'ประวัติและแผนงาน'}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    {viewMode === 'list' ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          value={checklistDate}
                          onChange={(e) => setChecklistDate(e.target.value)}
                          className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer outline-none border-none"
                        />
                        {checklist.length > 0 && (
                          <button 
                            onClick={() => setIsManageMode(!isManageMode)} 
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95 ${
                              isManageMode 
                                ? 'bg-amber-500 text-white shadow-amber-100 ring-1 ring-amber-200' 
                                : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-400 hover:text-amber-600'
                            }`}
                          >
                            <Edit3 size={14} />
                            {isManageMode ? 'เสร็จสิ้น' : 'จัดการแผน'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">รวมแผนการซื้อของทุกวันที่บันทึกไว้</span>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => { setViewMode(viewMode === 'list' ? 'history' : 'list'); setIsManageMode(false); }}
                className={`p-2 rounded-xl transition-all ${viewMode === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}
              >
                {viewMode === 'list' ? <History size={20} /> : <LayoutGrid size={20} />}
              </button>
            </div>

            {viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="ค้นหา..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {!isManageMode && (
                  <div className="flex gap-2">
                    <button onClick={() => setIsSelectorOpen(true)} className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform flex-none"><Library size={18} /></button>
                    <button onClick={() => setEditingItem({})} className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center active:scale-95 transition-transform flex-none"><Plus size={20} /></button>
                  </div>
                )}
                {isManageMode && (
                   <button 
                    onClick={() => {
                      Swal.fire({ title: 'ล้างทั้งหมด?', text: 'ลบรายการของวันนี้ทิ้งทั้งหมด?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ลบทั้งหมด' }).then(r => { if (r.isConfirmed) bulkClearChecklist(); });
                    }}
                    className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center active:scale-95 transition-transform flex-none"
                  >
                    <Trash size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30">
        {viewMode === 'list' ? (
          <div className="max-w-4xl mx-auto pb-20 px-4 pt-4">
            <AnimatePresence mode="popLayout">
              {Object.keys(filteredCategories).length > 0 ? (
                Object.keys(filteredCategories).map((category) => {
                  const isCollapsed = collapsedCategories.has(category);
                  return (
                    <div key={category} className="mb-4">
                      <button 
                        onClick={() => toggleCategory(category)}
                        className="w-full px-4 py-2 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-xl flex items-center justify-between sticky top-2 z-20 shadow-sm mb-2 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown size={14} className={`transition-transform duration-200 ${getCategoryColor(category)} ${isCollapsed ? '-rotate-90' : ''}`} />
                          <span className={`text-[10px] font-medium uppercase tracking-widest ${getCategoryColor(category)}`}>{category}</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">{filteredCategories[category].length} รายการ</span>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50"
                          >
                            {filteredCategories[category].map((item: any) => (
                              <CompactChecklistItem 
                                key={item.id} item={item} isManageMode={isManageMode}
                                onToggle={() => saveChecklistItem({ ...item, is_checked: !item.is_checked })}
                                onDelete={() => removeChecklistItem(item.id)}
                                onEdit={() => setEditingItem(item)}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-32 h-32 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative"
                  >
                    <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
                    <ShoppingBag size={56} className="text-indigo-600 relative z-10" />
                  </motion.div>
                  <h3 className="text-2xl font-medium text-slate-800 mb-2">วันนี้ยังไม่มีรายการซื้อของ</h3>
                  <p className="text-base text-slate-400 mb-8 max-w-[280px]">เลือกสินค้าจากคลังหรือเพิ่มรายการใหม่เพื่อเริ่มวางแผนงานวันนี้</p>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                      boxShadow: ["0px 0px 0px rgba(79, 70, 229, 0)", "0px 10px 25px rgba(79, 70, 229, 0.3)", "0px 0px 0px rgba(79, 70, 229, 0)"] 
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    onClick={() => setIsSelectorOpen(true)} 
                    className="px-10 py-5 bg-indigo-600 text-white rounded-3xl text-xl font-medium shadow-xl shadow-indigo-100 flex items-center gap-3"
                  >
                    <Plus size={24} /> เริ่มวางแผนวันนี้
                  </motion.button>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-4 max-w-4xl mx-auto space-y-4">
            <button onClick={() => { setChecklistDate(dayjs().format('YYYY-MM-DD')); setViewMode('list'); }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-[0.98] transition-transform"><Plus size={20} /> วางแผนซื้อของวันใหม่</button>
            <div className="pt-2">
              <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3 px-1">ประวัติและแผนงานที่บันทึกไว้</h3>
              <div className="space-y-3">
                {checklistHistory.length > 0 ? (
                  checklistHistory.map((day) => (
                    <button 
                      key={day.target_date} onClick={() => { setChecklistDate(day.target_date); setViewMode('list'); }}
                      className="w-full bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:border-indigo-200 transition-all active:scale-[0.98] text-left group shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                          <span className="text-[10px] font-medium text-slate-400 leading-none">{dayjs(day.target_date).format('MMM')}</span>
                          <span className="text-lg font-medium text-slate-800 leading-none mt-1">{dayjs(day.target_date).format('DD')}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{dayjs(day.target_date).format('ddddที่ D MMMM YYYY')}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${(day.completed_items / day.total_items) * 100}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-400">{day.completed_items}/{day.total_items} รายการ</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500 transition-all" />
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-30">
                    <History size={60} className="text-slate-300 mb-4" />
                    <p className="text-base font-medium text-slate-400">ยังไม่มีแผนงานที่บันทึกไว้</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isSelectorOpen && (
          <MasterSelector 
            masterList={masterChecklist}
            onClose={() => setIsSelectorOpen(false)}
            onConfirm={(selectedItems) => { addItemsToDaily(selectedItems); setIsSelectorOpen(false); }}
            onAddToMaster={addItemToMaster}
            onUpdateMaster={updateMasterItem}
            onDeleteMaster={removeMasterItem}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingItem(null)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed inset-y-0 right-0 w-full md:max-w-md bg-white z-[70] shadow-2xl flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg font-medium">{editingItem.id ? 'แก้ไข' : 'เพิ่มของใหม่'}</h3>
                <button onClick={() => setEditingItem(null)} className="p-2"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <ChecklistForm initialData={editingItem} onSave={(data) => { saveChecklistItem(data); setEditingItem(null); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-components optimized with larger text and no bold
const CompactChecklistItem: React.FC<{ item: any, isManageMode: boolean, onToggle: () => void, onDelete: () => void, onEdit: () => void }> = memo(({ item, isManageMode, onToggle, onDelete, onEdit }) => {
  return (
    <div className="relative overflow-hidden bg-white">
      <div 
        className={`relative z-10 flex items-center gap-3 px-4 py-5 transition-colors ${item.is_checked ? 'bg-slate-50/50' : 'bg-white'}`}
      >
        {isManageMode ? (
          <div className="flex-none text-slate-300 cursor-grab active:cursor-grabbing p-1"><GripVertical size={18} /></div>
        ) : (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggle(); }} 
            className={`flex-none w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${item.is_checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 bg-white shadow-sm'}`}
          >
            {item.is_checked && <Check size={18} strokeWidth={3} />}
          </button>
        )}
        <div className="flex-1 min-w-0" onClick={() => !isManageMode && onToggle()}>
          <div className={`text-lg font-medium truncate tracking-tight ${item.is_checked ? 'text-slate-300 line-through' : 'text-slate-800'}`}>{item.item_name}</div>
          {(item.vendor || item.target_time) && <div className="flex gap-2 mt-1.5">{item.vendor && <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-lg">@{item.vendor}</span>}{item.target_time && <span className="text-xs text-indigo-400 font-medium bg-indigo-50 px-2 py-0.5 rounded-lg">{item.target_time}</span>}</div>}
        </div>
        {isManageMode ? (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"><Edit3 size={18} /></button>
            <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
          </div>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-300 flex-none hover:bg-slate-50 rounded-xl"><MoreHorizontal size={20} /></button>
        )}
      </div>
    </div>
  );
});

// MASTER SELECTOR OPTIMIZED FOR X-LARGE TEXT & NO BOLD
const MasterSelector: React.FC<{ 
  masterList: any[], onClose: () => void, onConfirm: (items: any[]) => void, onAddToMaster: (item: any) => void, onUpdateMaster: (id: string, item: any) => void, onDeleteMaster: (id: string) => void
}> = ({ masterList, onClose, onConfirm, onAddToMaster, onUpdateMaster, onDeleteMaster }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ทั้งหมด');
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);
  const [masterFormData, setMasterFormData] = useState({ item_name: '', category: 'เนื้อสัตว์', vendor: '', target_time: '' });
  const [activeVoiceField, setActiveVoiceField] = useState<'search' | 'item_name' | 'vendor' | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const categoriesList = useMemo(() => {
    const cats = new Set(masterList.map(i => i.category));
    return ['ทั้งหมด', ...Array.from(cats)];
  }, [masterList]);

  const filteredMaster = useMemo(() => {
    return masterList.filter(item => {
      const matchSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = activeCategory === 'ทั้งหมด' || item.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [masterList, searchTerm, activeCategory]);

  const groupedCategories = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredMaster.forEach(item => { if (!groups[item.category]) groups[item.category] = []; groups[item.category].push(item); });
    return groups;
  }, [filteredMaster]);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const startVoiceInput = (field: 'search' | 'item_name' | 'vendor') => {
    if (!('webkitSpeechRecognition' in window)) return;
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setActiveVoiceField(field);
    recognition.onend = () => setActiveVoiceField(null);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (field === 'search') setSearchTerm(transcript);
      else setMasterFormData(prev => ({ ...prev, [field]: transcript }));
    };
    recognition.start();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden font-prompt md:inset-auto md:w-full md:max-w-2xl md:h-[85vh] md:rounded-3xl md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:shadow-2xl">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
        <h3 className="text-xl font-medium text-slate-900">จัดการคลังของทั้งหมด</h3>
        <div className="flex items-center gap-2">
           {!editingMasterId && (
            <button 
              onClick={() => setEditingMasterId('new')} 
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <Plus size={24} />
            </button>
          )}
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="p-5 flex flex-col gap-4 bg-slate-50/50">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาของในคลัง..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-2xl text-base outline-none shadow-sm focus:ring-1 focus:ring-indigo-500" 
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button onClick={() => startVoiceInput('search')} className={`p-3 rounded-2xl transition-all ${activeVoiceField === 'search' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400 border border-slate-200 shadow-sm'}`}><Mic size={20} /></button>
        </div>
        
        {/* Horizontal Category Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categoriesList.map(cat => (
            <button 
              key={cat} 
              onPointerDown={() => setActiveCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-white text-slate-500 border border-slate-200 shadow-sm'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {editingMasterId && (
        <div className="px-5 py-6 bg-indigo-50/50 border-y border-indigo-100 flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-white px-5 py-4 rounded-2xl shadow-sm">
            <input type="text" placeholder="ชื่อสินค้าใหม่..." value={masterFormData.item_name} onChange={e => setMasterFormData({ ...masterFormData, item_name: e.target.value })} className="flex-1 bg-transparent border-none text-lg outline-none font-medium" />
            <button onClick={() => startVoiceInput('item_name')} className={`p-2 rounded-xl transition-all ${activeVoiceField === 'item_name' ? 'bg-red-500 text-white' : 'text-slate-300'}`}><Mic size={20} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="flex items-center gap-3 bg-white px-4 py-4 rounded-2xl shadow-sm">
                <Store size={18} className="text-slate-400" />
                <input type="text" placeholder="ร้านประจำ..." value={masterFormData.vendor} onChange={e => setMasterFormData({ ...masterFormData, vendor: e.target.value })} className="flex-1 bg-transparent border-none text-sm outline-none font-medium" />
                <button onClick={() => startVoiceInput('vendor')} className={`p-1.5 rounded-lg transition-all ${activeVoiceField === 'vendor' ? 'bg-red-500 text-white' : 'text-slate-300'}`}><Mic size={16} /></button>
             </div>
             <div className="flex items-center gap-3 bg-white px-4 py-4 rounded-2xl shadow-sm">
                <Clock size={18} className="text-slate-400" />
                <input type="time" value={masterFormData.target_time} onChange={e => setMasterFormData({ ...masterFormData, target_time: e.target.value })} className="flex-1 bg-transparent border-none text-sm outline-none font-medium cursor-pointer" />
             </div>
          </div>
          <div className="flex gap-3">
            <select value={masterFormData.category} onChange={e => setMasterFormData({ ...masterFormData, category: e.target.value })} className="flex-1 px-5 py-4 bg-white rounded-2xl border-none text-base outline-none shadow-sm font-medium appearance-none"><option>เนื้อสัตว์</option><option>ผักและผลไม้</option><option>นมและโยเกิร์ต</option><option>เครื่องปรุง</option><option>บรรจุภัณฑ์</option><option>ข้าวและเส้น</option><option>อื่นๆ</option></select>
            <div className="flex gap-2"><button onClick={() => { setEditingMasterId(null); setMasterFormData({ item_name: '', category: 'เนื้อสัตว์', vendor: '', target_time: '' }); }} className="px-5 py-4 bg-white text-slate-400 rounded-2xl text-base font-medium shadow-sm border border-slate-100">ยกเลิก</button><button onClick={() => { if (editingMasterId === 'new') onAddToMaster(masterFormData); else onUpdateMaster(editingMasterId, masterFormData); setEditingMasterId(null); setMasterFormData({ item_name: '', category: 'เนื้อสัตว์', vendor: '', target_time: '' }); }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-base font-medium shadow-md">บันทึก</button></div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
        {Object.keys(groupedCategories).length > 0 ? Object.keys(groupedCategories).map(category => {
          const isCollapsed = collapsedCategories.has(category);
          return (
            <div key={category}>
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-3 bg-slate-50 text-[11px] font-medium uppercase text-slate-400 tracking-widest sticky top-0 z-10 flex justify-between items-center hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                  <span>{category}</span>
                </div>
                <span>{groupedCategories[category].length}</span>
              </button>
              
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden divide-y divide-slate-50"
                  >
                    {groupedCategories[category].map(item => (
                      <MasterItemRow key={item.id} item={item} isSelected={selectedIds.has(item.id)} onToggle={handleToggle} onEdit={(i) => { setEditingMasterId(i.id); setMasterFormData({ item_name: i.item_name, category: i.category, vendor: i.vendor || '', target_time: i.target_time || '' }); }} onDelete={onDeleteMaster} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center px-10">
            <Search size={48} className="mb-4" />
            <p className="text-lg font-medium">ไม่พบสินค้าที่คุณค้นหา</p>
          </div>
        )}
      </div>
      <div className="p-5 border-t border-slate-100 flex gap-4 bg-white">
        <button onClick={onClose} className="flex-1 py-5 bg-slate-100 text-slate-600 font-medium rounded-2xl active:scale-[0.98] transition-transform text-lg">ยกเลิก</button>
        <button disabled={selectedIds.size === 0} onClick={() => onConfirm(masterList.filter(i => selectedIds.has(i.id)))} className="flex-[2] py-5 bg-indigo-600 text-white font-medium rounded-2xl shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-[0.98] transition-transform text-lg">เพิ่มลงแผน ({selectedIds.size} รายการ)</button>
      </div>
    </div>
  );
};

// SUB-ROW FOR MASTER SELECTOR - OPTIMIZED FOR X-LARGE TEXT & NO BOLD
const MasterItemRow: React.FC<{ item: any, isSelected: boolean, onToggle: (id: string) => void, onEdit: (i: any) => void, onDelete: (id: string) => void }> = memo(({ item, isSelected, onToggle, onEdit, onDelete }) => {
  return (
    <div 
      onPointerDown={(e) => {
        e.preventDefault();
        onToggle(item.id);
      }}
      className={`flex items-center transition-colors cursor-pointer select-none ${isSelected ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50/80'}`}
    >
      <div className="flex-1 px-6 py-5 flex items-center justify-between text-left">
        <div>
          <div className={`text-xl font-medium tracking-tight ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>{item.item_name}</div>
          {(item.vendor || item.target_time) && (
            <div className="flex gap-2 mt-1">
              {item.vendor && <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">@{item.vendor}</span>}
              {item.target_time && <span className="text-[10px] text-indigo-400 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">{item.target_time}</span>}
            </div>
          )}
        </div>
        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'border-slate-200 bg-white shadow-sm'}`}>
          {isSelected && <Check size={18} strokeWidth={3} />}
        </div>
      </div>
      <div className="flex px-2 border-l border-slate-100" onPointerDown={e => e.stopPropagation()}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="p-4 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={20} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-4 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
      </div>
    </div>
  );
});

const ChecklistForm: React.FC<{ initialData?: any, onSave: (data: any) => void }> = ({ initialData, onSave }) => {
  const [formData, setFormData] = useState({ id: initialData?.id || undefined, item_name: initialData?.item_name || '', category: initialData?.category || 'เนื้อสัตว์', vendor: initialData?.vendor || '', target_time: initialData?.target_time || '', notes: initialData?.notes || '' });
  const [activeVoiceField, setActiveVoiceField] = useState<'item_name' | 'vendor' | null>(null);
  
  const categories = ['เนื้อสัตว์', 'ผักและผลไม้', 'นมและโยเกิร์ต', 'เครื่องปรุง', 'บรรจุภัณฑ์', 'ข้าวและเส้น', 'อื่นๆ'];

  const startVoiceInput = (field: 'item_name' | 'vendor') => {
    if (!('webkitSpeechRecognition' in window)) {
      Swal.fire('ขออภัย', 'เบราว์เซอร์นี้ไม่รองรับระบบสั่งงานด้วยเสียง', 'error');
      return;
    }
    
    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setActiveVoiceField(field);
    recognition.onend = () => setActiveVoiceField(null);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, [field]: transcript }));
    };
    recognition.start();
  };

  return (
    <div className="space-y-6 font-prompt">
      {/* Item Name with Voice Input */}
      <div className="bg-slate-100 rounded-2xl relative group focus-within:ring-1 focus-within:ring-indigo-200 shadow-inner">
        <div className="flex items-center px-6 py-5">
          <input 
            type="text" 
            placeholder="ระบุชื่อรายการ..." 
            value={formData.item_name} 
            onChange={e => setFormData({ ...formData, item_name: e.target.value })} 
            className="flex-1 bg-transparent border-none outline-none font-medium text-xl text-slate-800" 
          />
          <button 
            type="button"
            onClick={() => startVoiceInput('item_name')}
            className={`p-2 rounded-xl transition-all ${activeVoiceField === 'item_name' ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-200 hover:text-indigo-600'}`}
          >
            {activeVoiceField === 'item_name' ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">{categories.map(cat => (<button key={cat} onClick={() => setFormData({ ...formData, category: cat })} className={`px-2 py-4 rounded-2xl text-sm font-medium border transition-all ${formData.category === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50'}`}>{cat}</button>))}</div>
      
      <div className="space-y-4">
        {/* Vendor with Voice Input */}
        <div className="flex items-center gap-3 bg-slate-50 px-6 py-5 rounded-2xl border border-slate-100 shadow-sm relative group focus-within:ring-1 focus-within:ring-indigo-200">
          <Store size={20} className="text-slate-400" />
          <input type="text" placeholder="แหล่งซื้อ (เช่น ตลาดไท...)" value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} className="flex-1 bg-transparent border-none text-lg outline-none font-medium" />
          <button 
            type="button"
            onClick={() => startVoiceInput('vendor')}
            className={`p-2 rounded-xl transition-all ${activeVoiceField === 'vendor' ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600'}`}
          >
            {activeVoiceField === 'vendor' ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>

        {/* Time Input (Native Time Selector) */}
        <div className="flex items-center gap-3 bg-slate-50 px-6 py-5 rounded-2xl border border-slate-100 shadow-sm relative focus-within:ring-1 focus-within:ring-indigo-200">
          <Clock size={20} className="text-slate-400" />
          <div className="flex-1">
            <input 
              type="time" 
              value={formData.target_time} 
              onChange={e => setFormData({ ...formData, target_time: e.target.value })} 
              className="bg-transparent border-none text-xl outline-none font-medium text-slate-800 w-full cursor-pointer" 
            />
          </div>
        </div>
      </div>

      <textarea placeholder="จจดหมายเหตุ..." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-6 py-5 bg-slate-100 border-none rounded-2xl text-lg min-h-[140px] outline-none font-medium shadow-inner" />
      <button onClick={() => { const d = { ...formData }; if (!d.id) delete d.id; onSave(d); }} className="w-full py-6 bg-indigo-600 text-white rounded-2xl font-medium text-xl shadow-xl shadow-indigo-200 active:scale-[0.98] transition-transform">{initialData.id ? 'บันทึกแก้ไข' : 'เพิ่มลงแผนทันที'}</button>
    </div>
  );
};
