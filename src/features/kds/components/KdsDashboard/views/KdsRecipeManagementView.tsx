import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { supabase } from '../../../../../config/supabase';
import { useMenuStore } from '../../../../../store/menuStore';
import { useInventoryStore } from '../../../../../store/inventoryStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, 
  Save, 
  Plus, 
  Search, 
  ArrowRight, 
  Leaf,
  UtensilsCrossed,
  X,
  AlertCircle,
  Info,
  PanelLeftClose,
  Menu,
  ArrowLeft,
  ListChecks
} from 'lucide-react';
import { toast } from 'sonner';

export const KdsRecipeManagementView: React.FC = () => {
  const { menus } = useMenuStore();
  const { items: inventoryItems } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<any[]>([]);
  const [steps, setSteps] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ทั้งหมด");

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = menus.map(m => m.category || 'ไม่ระบุหมวดหมู่');
    return ["ทั้งหมด", ...Array.from(new Set(cats))];
  }, [menus]);

  // Computed menus
  const filteredMenus = useMemo(() => {
    return menus.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === "ทั้งหมด" || 
                            (m.category || 'ไม่ระบุหมวดหมู่') === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [menus, searchTerm, selectedCategory]);

  const selectedMenu = menus.find(m => m.id === selectedMenuId);

  useEffect(() => {
    if (selectedMenuId) {
      loadRecipeData(selectedMenuId);
    } else {
      setIngredients([]);
      setSteps([]);
    }
  }, [selectedMenuId]);

  const loadRecipeData = async (menuId: string) => {
    setIsLoading(true);
    try {
      const { data: ingData, error: ingError } = await supabase
        .from('erp_recipes')
        .select('*')
        .eq('menu_item_id', menuId);
      
      if (ingError) throw ingError;

      const { data: stepsData, error: stepsError } = await supabase
        .from('erp_recipe_steps')
        .select('*')
        .eq('menu_item_id', menuId)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Load Units Dictionary
      const { data: unitsData, error: unitsError } = await supabase
        .from('erp_units')
        .select('*')
        .order('category', { ascending: true });
        
      if (!unitsError && unitsData) {
        setUnits(unitsData);
      }

      setIngredients(ingData || []);
      setSteps(stepsData || []);
    } catch (error: any) {
      console.error('Error loading recipe:', error);
      toast.error('โหลดข้อมูลสูตรไม่สำเร็จ: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { id: `temp-${Date.now()}`, inventory_item_id: '', quantity: 1, unit: 'กรัม', isNew: true }]);
  };

  const handleUpdateIngredient = (index: number, field: string, value: any) => {
    const newIngs = [...ingredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    
    if (field === 'inventory_item_id') {
      const invItem = inventoryItems.find(i => i.id === value);
      if (invItem && invItem.storage_unit) {
        newIngs[index].unit = invItem.storage_unit;
      }
    }
    
    setIngredients(newIngs);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngs = [...ingredients];
    newIngs.splice(index, 1);
    setIngredients(newIngs);
  };

  const handleAddStep = () => {
    setSteps([...steps, { id: `temp-${Date.now()}`, step_number: steps.length + 1, instruction: '', isNew: true }]);
  };

  const handleUpdateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index].instruction = value;
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = [...steps];
    newSteps.splice(index, 1);
    newSteps.forEach((s, i) => { s.step_number = i + 1; });
    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!selectedMenuId) return;
    
    const invalidIngs = ingredients.some(i => !i.inventory_item_id || !i.quantity);
    if (invalidIngs) {
      toast.error("กรุณาระบุวัตถุดิบและปริมาณให้ครบถ้วน");
      return;
    }
    const invalidSteps = steps.some(s => !s.instruction.trim());
    if (invalidSteps) {
      toast.error("กรุณาระบุรายละเอียดขั้นตอนให้ครบถ้วน");
      return;
    }

    setIsSaving(true);
    try {
      await supabase.from('erp_recipes').delete().eq('menu_item_id', selectedMenuId);
      await supabase.from('erp_recipe_steps').delete().eq('menu_item_id', selectedMenuId);

      if (ingredients.length > 0) {
        const ingPayload = ingredients.map(i => ({
          menu_item_id: selectedMenuId,
          inventory_item_id: i.inventory_item_id,
          quantity: parseFloat(i.quantity),
          unit: i.unit
        }));
        const { error: ingError } = await supabase.from('erp_recipes').insert(ingPayload);
        if (ingError) throw ingError;
      }

      if (steps.length > 0) {
        const stepsPayload = steps.map(s => ({
          menu_item_id: selectedMenuId,
          step_number: s.step_number,
          instruction: s.instruction
        }));
        const { error: stepsError } = await supabase.from('erp_recipe_steps').insert(stepsPayload);
        if (stepsError) throw stepsError;
      }

      toast.success("บันทึกสูตรอาหารเรียบร้อยแล้ว");
      loadRecipeData(selectedMenuId);
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] w-full flex bg-[#F7F7F8] overflow-hidden relative">
      
      {/* Left Sidebar - Collapsible */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div 
            initial={{ maxWidth: 0, opacity: 0 }}
            animate={{ maxWidth: "100%", opacity: 1 }}
            exit={{ maxWidth: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`h-full flex flex-col bg-white border-r border-slate-200/60 shrink-0 z-30 md:z-10 absolute md:relative left-0 right-0 md:right-auto shadow-[5px_0_25px_-5px_rgba(0,0,0,0.1)] md:shadow-[2px_0_15px_-3px_rgba(0,0,0,0.03)]
              ${selectedMenuId ? 'hidden md:flex' : 'flex w-full md:w-auto'}
            `}
          >
            <div className="w-full md:w-72 flex flex-col h-full">
              <div className="pt-6 px-6 pb-4">
                <div className="flex justify-between items-start mb-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                    <ChefHat size={24} className="text-orange-500 shrink-0" />
                    สูตรเมนู
                  </h1>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    title="ซ่อนแถบเมนู"
                  >
                    <PanelLeftClose size={20} />
                  </button>
                </div>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  คลังจัดการสูตรอาหารทั้งหมด
                </p>
              </div>

        <div className="px-4 mb-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-orange-500" size={16} />
            <input
              type="text"
              placeholder="ค้นหาชื่อเมนู..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 mb-4">
          <Select
            options={categories.map(cat => ({ value: cat, label: cat === "ทั้งหมด" ? "ทุกหมวดหมู่" : cat }))}
            value={{ value: selectedCategory, label: selectedCategory === "ทั้งหมด" ? "ทุกหมวดหมู่" : selectedCategory }}
            onChange={(option) => setSelectedCategory(option?.value || "ทั้งหมด")}
            isSearchable={true}
            placeholder="ค้นหาหมวดหมู่..."
            noOptionsMessage={() => "ไม่พบหมวดหมู่"}
            styles={{
              control: (base, state) => ({
                ...base,
                border: state.isFocused ? '1px solid #f97316' : '1px solid #f1f5f9',
                boxShadow: state.isFocused ? '0 0 0 2px rgba(249, 115, 22, 0.2)' : 'none',
                backgroundColor: '#f8fafc',
                minHeight: '42px',
                borderRadius: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }),
              menu: (base) => ({
                ...base,
                zIndex: 100,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }),
              option: (base, state) => ({
                ...base,
                fontWeight: '600',
                padding: '10px 16px',
                fontSize: '0.875rem',
                backgroundColor: state.isSelected ? '#f97316' : state.isFocused ? '#fff7ed' : 'white',
                color: state.isSelected ? 'white' : '#334155',
                cursor: 'pointer',
                ':active': {
                  backgroundColor: '#fb923c'
                }
              }),
              singleValue: (base) => ({
                ...base,
                color: '#475569'
              })
            }}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 pb-8 custom-scrollbar">
          <div className="space-y-1">
            {filteredMenus.map((menu) => {
              const isSelected = selectedMenuId === menu.id;
              return (
                <button
                  key={menu.id}
                  onClick={() => setSelectedMenuId(menu.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-200 group flex items-center justify-between border
                    ${isSelected 
                      ? 'bg-orange-50 border-orange-200 shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }
                  `}
                >
                  <div className="min-w-0 pr-3">
                    <p className={`font-bold truncate text-[14px] ${isSelected ? 'text-orange-700' : 'text-slate-700 group-hover:text-slate-900'}`}>
                      {menu.name}
                    </p>
                    <p className={`text-[11px] font-bold tracking-wide mt-0.5 ${isSelected ? 'text-orange-500' : 'text-slate-400'}`}>
                      {menu.category || 'ไม่ระบุหมวดหมู่'}
                    </p>
                  </div>
                  <ArrowRight 
                    size={16} 
                    className={`shrink-0 transition-all duration-300 ${isSelected ? 'text-orange-500 translate-x-0' : 'text-slate-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} 
                  />
                </button>
              );
            })}
          </div>
          
              {filteredMenus.length === 0 && (
                <div className="flex flex-col items-center justify-center pt-10 pb-8 text-slate-400">
                  <Search size={28} className="opacity-20 mb-3" />
                  <p className="font-medium text-sm">ไม่พบเมนูที่ค้นหา</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Workspace */}
      <div className={`flex-1 h-full bg-[#FAFAFA] relative overflow-hidden flex-col ${!selectedMenuId ? 'hidden md:flex' : 'flex'}`}>
        {/* Toggle button when sidebar is closed */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="hidden md:block absolute top-6 left-6 z-30 p-2.5 bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 rounded-xl shadow-sm transition-all"
            title="แสดงแถบเมนู"
          >
            <Menu size={20} />
          </button>
        )}

        {!selectedMenuId ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-28 h-28 rounded-full bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6"
            >
              <UtensilsCrossed size={36} className="text-slate-300" />
            </motion.div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
              พื้นที่จัดการสูตรอาหาร
            </h2>
            <p className="text-slate-500 font-medium text-center max-w-sm leading-relaxed">
              เลือกเมนูอาหารจากรายการด้านซ้ายเพื่อกำหนดวัตถุดิบและขั้นตอนการทำอาหารให้เชฟ
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className={`shrink-0 py-3 md:py-4 border-b border-slate-200/60 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 bg-white z-20 shadow-2xs transition-all duration-300 ${!isSidebarOpen ? 'px-4 md:px-8 md:pl-20' : 'px-4 md:px-6'}`}>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setSelectedMenuId(null)}
                  className="md:hidden p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors shrink-0"
                >
                  <ArrowLeft size={18} />
                </button>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`header-${selectedMenuId}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                      {selectedMenu?.category || 'ไม่ระบุหมวดหมู่'}
                    </span>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight truncate">
                      {selectedMenu?.name}
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    รหัสเมนู: {(selectedMenu as any)?.menu_code || 'ไม่มีรหัส'}
                  </p>
                </motion.div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[38px]"
              >
                <Save size={15} />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกสูตรอาหาร 💾'}</span>
              </motion.button>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-emerald-600 animate-spin"></div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-8 py-10 custom-scrollbar">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="max-w-4xl mx-auto space-y-12 pb-20"
                >
                  
                  {/* Bill of Materials */}
                  <section>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          สูตรวัตถุดิบ (BOM)
                          <div className="group relative inline-flex ml-1">
                            <AlertCircle size={18} className="text-emerald-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                              <p className="font-bold mb-1">สูตรวัตถุดิบ (BOM)</p>
                              <p className="text-slate-300">ใช้กำหนดส่วนผสมทั้งหมดที่ต้องใช้สำหรับ 1 เสิร์ฟ เพื่อให้ระบบคำนวณการตัดสต็อกได้แม่นยำ</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">ส่วนผสมที่ต้องใช้ต่อ 1 เสิร์ฟ/กล่อง</p>
                      </div>
                      <button 
                        onClick={handleAddIngredient}
                        className="w-full sm:w-auto justify-center group flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm whitespace-nowrap"
                      >
                        <Plus size={16} className="text-emerald-600 transition-transform group-hover:rotate-90" /> 
                        เพิ่มวัตถุดิบ
                      </button>
                    </div>

                    <div className="space-y-3">
                      {ingredients.length === 0 ? (
                        <div className="py-10 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400">
                          <Leaf size={28} className="mb-3 opacity-40 text-emerald-500" />
                          <p className="font-bold text-slate-500">ยังไม่ได้ระบุวัตถุดิบ</p>
                          <p className="text-sm mt-1">เพิ่มวัตถุดิบจากคลังสินค้าของคุณเพื่อสร้างสูตร</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {ingredients.map((ing, idx) => (
                            <motion.div 
                              initial={{ opacity: 0, height: 0, scale: 0.95 }}
                              animate={{ opacity: 1, height: 'auto', scale: 1 }}
                              exit={{ opacity: 0, height: 0, scale: 0.95 }}
                              key={ing.id || idx}
                              className="group flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3 md:p-2 md:pl-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all relative"
                            >
                              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div className="w-full md:w-[250px] md:flex-1">
                                <Select
                                  options={inventoryItems.map(item => ({ value: item.id, label: item.name }))}
                                  value={inventoryItems.find(i => i.id === ing.inventory_item_id) ? { value: ing.inventory_item_id, label: inventoryItems.find(i => i.id === ing.inventory_item_id)?.name } : null}
                                  onChange={(selectedOption) => handleUpdateIngredient(idx, 'inventory_item_id', selectedOption?.value)}
                                  placeholder="ค้นหาวัตถุดิบ..."
                                  noOptionsMessage={() => "ไม่พบวัตถุดิบ"}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    control: (base) => ({
                                      ...base,
                                      border: 0,
                                      boxShadow: 'none',
                                      backgroundColor: 'transparent',
                                      minHeight: '44px',
                                      fontWeight: 'bold',
                                    }),
                                    menu: (base) => ({
                                      ...base,
                                      borderRadius: '0.75rem',
                                      overflow: 'hidden',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                    }),
                                    option: (base, state) => ({
                                      ...base,
                                      fontWeight: '600',
                                      padding: '10px 16px',
                                      backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#ecfdf5' : 'white',
                                      color: state.isSelected ? 'white' : '#334155',
                                      ':active': {
                                        backgroundColor: '#34d399'
                                      }
                                    }),
                                    placeholder: (base) => ({
                                      ...base,
                                      color: '#94a3b8',
                                      fontWeight: '500'
                                    }),
                                    singleValue: (base) => ({
                                      ...base,
                                      color: '#1e293b'
                                    })
                                  }}
                                />
                              </div>
                              <div className="hidden md:block w-px h-8 bg-slate-100"></div>
                              <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                                <div className="flex-1 md:flex-none md:w-28 relative bg-slate-50 md:bg-transparent rounded-xl md:rounded-none border border-slate-100 md:border-transparent focus-within:border-emerald-300 transition-all">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={ing.quantity}
                                    onChange={(e) => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                                    className="w-full py-2.5 px-3 md:px-2 bg-transparent font-mono text-lg font-bold text-slate-900 text-right focus:outline-none placeholder:text-slate-300"
                                  />
                                </div>
                                <div className="flex-1 md:flex-none md:w-36">
                                <Select
                                  options={units.map(u => ({ value: u.name, label: u.name }))}
                                  value={ing.unit ? { value: ing.unit, label: ing.unit } : null}
                                  onChange={(selectedOption) => handleUpdateIngredient(idx, 'unit', selectedOption?.value)}
                                  placeholder="เลือกหน่วย"
                                  noOptionsMessage={() => "ไม่มีหน่วยนี้"}
                                  menuPortalTarget={document.body}
                                  styles={{
                                    menuPortal: base => ({ ...base, zIndex: 9999 }),
                                    control: (base) => ({
                                      ...base,
                                      border: 0,
                                      boxShadow: 'none',
                                      backgroundColor: 'transparent',
                                      minHeight: '44px',
                                      fontWeight: 'bold',
                                    }),
                                    menu: (base) => ({
                                      ...base,
                                      borderRadius: '0.75rem',
                                      overflow: 'hidden',
                                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                                    }),
                                    option: (base, state) => ({
                                      ...base,
                                      fontWeight: '600',
                                      padding: '8px 12px',
                                      fontSize: '0.875rem',
                                      backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#ecfdf5' : 'white',
                                      color: state.isSelected ? 'white' : '#334155',
                                    }),
                                    singleValue: (base) => ({
                                      ...base,
                                      color: '#64748b'
                                    })
                                  }}
                                />
                                </div>
                                <button 
                                  onClick={() => handleRemoveIngredient(idx)}
                                  className="w-12 h-12 md:w-10 md:h-10 flex items-center justify-center bg-rose-50 md:bg-transparent text-rose-500 md:text-slate-400 hover:text-rose-600 md:hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </section>

                  {/* Standard Operating Procedures (Steps) */}
                  <section>
                    <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          ขั้นตอนการทำอาหาร (Cooking Steps)
                          <div className="group relative inline-flex ml-1">
                            <Info size={18} className="text-blue-500 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                              <p className="font-bold mb-1">ขั้นตอนการทำอาหาร (SOP)</p>
                              <p className="text-slate-300">เขียนอธิบายวิธีทำให้เชฟเห็นในหน้าจอห้องครัว ควรอธิบายให้สั้น กระชับ และเข้าใจง่าย</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">วิธีทำตามลำดับขั้นตอน (SOP)</p>
                      </div>
                      <button 
                        onClick={handleAddStep}
                        className="w-full sm:w-auto justify-center group flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm whitespace-nowrap"
                      >
                        <Plus size={16} className="text-blue-600 transition-transform group-hover:rotate-90" /> 
                        เพิ่มขั้นตอน
                      </button>
                    </div>

                    <div className="space-y-4 relative">
                      {steps.length === 0 ? (
                        <div className="py-10 px-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400">
                          <ListChecks size={28} className="mb-3 opacity-40 text-blue-500" />
                          <p className="font-bold text-slate-500">ยังไม่มีขั้นตอนการทำ</p>
                          <p className="text-sm mt-1">เพิ่มขั้นตอนเพื่อใช้อ้างอิงในระบบหน้าจอของเชฟ</p>
                        </div>
                      ) : (
                        <div className="relative pl-2">
                          {/* Timeline vertical line */}
                          <div className="absolute left-8 top-6 bottom-6 w-0.5 bg-slate-200 -z-10"></div>
                          
                          <AnimatePresence>
                            {steps.map((step, idx) => (
                              <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, height: 0 }}
                                key={step.id || idx}
                                className="group relative flex flex-col md:flex-row gap-3 md:gap-5 items-start mb-5 md:mb-4 last:mb-0"
                              >
                                {/* Step Header Mobile / Desktop Icon */}
                                <div className="flex items-center gap-3 w-full md:w-auto md:contents">
                                  <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 mt-0 md:mt-1 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center shadow-sm relative z-10 group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
                                    <span className="text-base md:text-lg font-black text-slate-700 group-hover:text-blue-600">{step.step_number}</span>
                                  </div>
                                  <span className="font-bold text-slate-700 md:hidden">ขั้นตอนที่ {step.step_number}</span>
                                  <button 
                                    onClick={() => handleRemoveStep(idx)}
                                    className="ml-auto w-10 h-10 flex md:hidden items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-colors"
                                  >
                                    <X size={18} />
                                  </button>
                                </div>
                                
                                {/* Step Content */}
                                <div className="w-full flex-1 bg-white border border-slate-200 rounded-2xl p-1 md:pr-3 transition-all hover:border-blue-300 hover:shadow-md focus-within:border-blue-500 focus-within:shadow-md flex overflow-hidden relative">
                                  <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  <textarea
                                    value={step.instruction}
                                    onChange={(e) => handleUpdateStep(idx, e.target.value)}
                                    placeholder={`พิมพ์อธิบายขั้นตอนที่ ${step.step_number} ที่นี่...`}
                                    className="w-full p-4 bg-transparent text-slate-700 font-medium leading-relaxed resize-none min-h-[100px] focus:outline-none"
                                  />
                                  <div className="pt-3 hidden md:block">
                                    <button 
                                      onClick={() => handleRemoveStep(idx)}
                                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                    >
                                      <X size={18} />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </section>
                  
                </motion.div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
