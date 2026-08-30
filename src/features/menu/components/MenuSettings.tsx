import React, { useState, useMemo } from 'react';
import { 
  Search, Settings, Eye, EyeOff, PackageX, 
  PackageCheck, X, Utensils
} from 'lucide-react';
import { toast } from 'sonner';
import { useMenuStore } from '../../../store/menuStore';

export const MenuSettings: React.FC = () => {
  const { menus, updateMenu } = useMenuStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [groupFilter, setGroupFilter] = useState('ทั้งหมด');

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menus.map(m => m.category))).filter(Boolean);
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
      toast.success('อัปเดตสถานะสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Settings size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  ตั้งค่าจัดการอาหาร
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Menu Controls
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">จัดการสถานะเปิด/ปิดการแสดงผลหน้าร้าน และสถานะสินค้าหมดสต็อก</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Toolbar & Filters */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative group w-full md:w-80">
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

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {groups.map(g => (
                    <option key={g} value={g}>กลุ่ม: {g === 'All' ? 'ทั้งหมด' : g === 'Member' ? 'ปิ่นโต' : g === 'Retail Only' ? 'ขายปลีก' : g}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 sm:flex-none">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full sm:w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>หมวด: {c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Controls Table / Cards ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">เมนูอาหาร</th>
                  <th className="px-4 py-4">หมวดหมู่</th>
                  <th className="px-4 py-4">กลุ่มเป้าหมาย</th>
                  <th className="px-6 py-4 text-center">แสดงผลหน้าร้าน (Visibility)</th>
                  <th className="px-6 py-4 text-center">สถานะสต็อก (Stock Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMenus.map(menu => (
                  <tr key={menu.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Menu Item */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/60 flex items-center justify-center">
                          {menu.image_url ? (
                            <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <Utensils size={18} className="text-slate-400 opacity-60" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm line-clamp-1">{menu.name}</p>
                          <p className="font-mono text-emerald-700 font-bold text-[11px]">฿{(menu.base_price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-semibold text-[10px]">
                        {menu.category || 'ทั่วไป'}
                      </span>
                    </td>

                    {/* Group */}
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${
                        menu.menu_group === 'Member' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : menu.menu_group === 'Retail Only'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {menu.menu_group === 'Member' ? 'ปิ่นโต' : menu.menu_group === 'Retail Only' ? 'ขายปลีก' : 'ทั้งหมด'}
                      </span>
                    </td>

                    {/* Visibility Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(menu.id, 'is_available', menu.is_available)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                            menu.is_available 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {menu.is_available ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-slate-400" />}
                          <span>{menu.is_available ? 'เปิดแสดง' : 'ซ่อนเมนู'}</span>
                        </button>
                      </div>
                    </td>

                    {/* Stock Status Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(menu.id, 'is_out_of_stock', !!menu.is_out_of_stock)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                            menu.is_out_of_stock 
                              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {menu.is_out_of_stock ? <PackageX size={14} className="text-red-600" /> : <PackageCheck size={14} className="text-emerald-600" />}
                          <span>{menu.is_out_of_stock ? 'สินค้าหมด' : 'มีพร้อมขาย'}</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}

                {filteredMenus.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <Utensils size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-slate-700 text-xs">ไม่พบรายการเมนูที่ค้นหา</p>
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
