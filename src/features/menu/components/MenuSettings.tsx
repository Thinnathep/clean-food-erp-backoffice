import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Settings,
  Eye,
  EyeOff,
  PackageX,
  PackageCheck,
  ChevronDown,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useMenuStore } from '../../../store/menuStore';

export const MenuSettings: React.FC = () => {
  const { menus, updateMenu } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [groupFilter, setGroupFilter] = useState('ทั้งหมด');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menus.map(m => m.category)));
    return ['ทั้งหมด', ...cats];
  }, [menus]);

  const groups = ['ทั้งหมด', 'Member', 'Retail Only', 'All'];

  const filteredMenus = useMemo(() => {
    return menus.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'ทั้งหมด' || m.category === categoryFilter;
      const matchesGroup = groupFilter === 'ทั้งหมด' || m.menu_group === groupFilter;
      return matchesSearch && matchesCategory && matchesGroup;
    });
  }, [menus, searchQuery, categoryFilter, groupFilter]);

  const handleToggle = async (id: string, field: 'is_available' | 'is_out_of_stock', currentValue: boolean) => {
    try {
      await updateMenu(id, { [field]: !currentValue });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-prompt">
      {/* Header */}
      <div className="px-8 py-8 shrink-0 bg-white border-b border-slate-100 flex items-center justify-between z-10 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ตั้งค่าจัดการอาหาร</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">จัดการสถานะการแสดงผลและสต็อกแบบรวดเร็ว</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 transition-colors appearance-none cursor-pointer"
              >
                {groups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none hover:bg-slate-100 transition-colors appearance-none cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อเมนู..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Content (Data Table) */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#f1f5f9]">เมนูอาหาร</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">กลุ่มเป้าหมาย</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">แสดงผลหน้าร้าน (Visibility)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะสต็อก (Stock)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 relative z-0">
                <AnimatePresence>
                  {filteredMenus.map((menu, index) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: Math.min(index * 0.02, 0.5) }}
                      key={menu.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* Name Col */}
                      <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[1px_0_0_0_#f1f5f9] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                            <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" loading="lazy" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 line-clamp-1">{menu.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">฿{menu.base_price}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                          {menu.category}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          menu.menu_group === 'All' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                          menu.menu_group === 'Member' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                          'border-orange-200 bg-orange-50 text-orange-700'
                        }`}>
                          {menu.menu_group}
                        </span>
                      </td>

                      {/* Visibility Toggle */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => handleToggle(menu.id, 'is_available', menu.is_available)}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 flex items-center shadow-inner ${
                              menu.is_available ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
                            }`}
                          >
                            <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                          <div className="flex items-center gap-1.5 min-w-[70px]">
                            {menu.is_available ? (
                              <><Eye size={14} className="text-emerald-500"/><span className="text-xs font-bold text-emerald-600">แสดง</span></>
                            ) : (
                              <><EyeOff size={14} className="text-slate-400"/><span className="text-xs font-bold text-slate-500">ซ่อน</span></>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Stock Toggle */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => handleToggle(menu.id, 'is_out_of_stock', !!menu.is_out_of_stock)}
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-300 flex items-center shadow-inner ${
                              menu.is_out_of_stock ? 'bg-orange-500 justify-end' : 'bg-slate-200 justify-start'
                            }`}
                          >
                            <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-sm" />
                          </div>
                          <div className="flex items-center gap-1.5 min-w-[70px]">
                            {menu.is_out_of_stock ? (
                              <><PackageX size={14} className="text-orange-500"/><span className="text-xs font-bold text-orange-600">หมด</span></>
                            ) : (
                              <><PackageCheck size={14} className="text-slate-400"/><span className="text-xs font-bold text-slate-500">มีของ</span></>
                            )}
                          </div>
                        </div>
                      </td>

                    </motion.tr>
                  ))}
                </AnimatePresence>
                
                {filteredMenus.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm bg-slate-50/50">
                      ไม่พบข้อมูลที่ค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
