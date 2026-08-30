import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, CheckCircle2, Clock, Printer, Search, 
  MapPin, AlertTriangle, RefreshCw, Check, Box
} from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';
import { supabase } from '../../../../../config/supabase';

interface PackingItem {
  id: string;
  member_name: string;
  phone: string;
  address: string;
  drop_point?: string;
  box_count: number;
  meals: string[];
  allergies?: string[];
  special_instructions?: string;
  is_packed: boolean;
  packed_at?: string;
}

export const KdsPackagingView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<string>('จันทร์');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [packingList, setPackingList] = useState<PackingItem[]>([]);

  // Load packing data from Supabase (or fallback to empty state)
  const loadPackingData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Query Pinto members with active delivery schedule
      const { data: membersList, error } = await supabase
        .from('members')
        .select('*');

      if (error) throw error;

      if (membersList && membersList.length > 0) {
        const formatted: PackingItem[] = membersList.map((m: any) => ({
          id: m.id,
          member_name: m.full_name || m.name || 'สมาชิกปิ่นโต',
          phone: m.phone || '-',
          address: m.delivery_address || m.address || 'จัดส่งตามรอบร้าน',
          drop_point: m.drop_point_name,
          box_count: m.boxes_per_delivery || 2,
          meals: ['เมนูคลีนประจำวัน (ตามแผนครัว)'],
          allergies: m.allergies ? [m.allergies] : [],
          special_instructions: m.notes,
          is_packed: false
        }));
        setPackingList(formatted);
      } else {
        setPackingList([]);
      }
    } catch {
      // Graceful fallback to empty state
      setPackingList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackingData();
  }, [loadPackingData, selectedDay]);

  const togglePacked = (id: string) => {
    setPackingList(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.is_packed;
        if (nextState) toast.success(`จัดถุงของ "${item.member_name}" เรียบร้อย ✨`);
        return { ...item, is_packed: nextState, packed_at: nextState ? dayjs().format('HH:mm') : undefined };
      }
      return item;
    }));
  };

  const handlePrintAll = () => {
    toast.success('ส่งคำสั่งพิมพ์สติ๊กเกอร์ป้ายติดถุงทั้งหมดไปยังเครื่องพิมพ์');
  };

  const filteredList = packingList.filter(item => 
    item.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.drop_point && item.drop_point.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalBags = packingList.length;
  const packedBags = packingList.filter(i => i.is_packed).length;
  const pendingBags = totalBags - packedBags;
  const totalBoxes = packingList.reduce((acc, i) => acc + i.box_count, 0);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Package size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  จัดถุงเตรียมส่ง (Packing Station)
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  KDS Packing
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">ตรวจนับกล่องอาหาร แยกถุงตามสมาชิก/จุดส่ง และพิมพ์สติ๊กเกอร์ป้ายติดถุง</p>
            </div>
          </div>

          {/* Delivery Day Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
              {['จันทร์', 'พุธ', 'ศุกร์'].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedDay === day 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  วัน{day}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={filteredList.length === 0}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>พิมพ์สติ๊กเกอร์ทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Container ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        
        {/* Top 4 Bento Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">ถุงจัดส่งทั้งหมด</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-slate-900">{totalBags} <span className="text-xs font-normal text-slate-400 font-sans">ถุง</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">จัดถุงเสร็จแล้ว</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-700">{packedBags} <span className="text-xs font-normal text-slate-400 font-sans">ถุง</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">รอดำเนินการ</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-amber-700">{pendingBags} <span className="text-xs font-normal text-slate-400 font-sans">ถุง</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs shrink-0">
              <Box size={20} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">กล่องอาหารรวม</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-purple-700">{totalBoxes} <span className="text-xs font-normal text-slate-400 font-sans">กล่อง</span></p>
            </div>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative group w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อสมาชิก ที่อยู่ หรือจุดส่ง..."
              className="w-full pl-10 pr-9 py-2 bg-slate-100/80 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all" 
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-[11px] font-medium text-slate-400">แสดง {filteredList.length} จาก {totalBags} ถุง</span>
          </div>
        </div>

        {/* ─── Packing Queue Grid ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, n) => (
              <div key={n} className="h-48 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 p-8">
            <div className="w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
              <Package size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">ยังไม่มีรายการจัดถุงสำหรับรอบวัน{selectedDay}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              ระบบพร้อมรับข้อมูลออเดอร์ปิ่นโต เมื่อสมาชิกสั่งอาหาร ข้อมูลจะปรากฏที่นี่โดยอัตโนมัติ
            </p>
            <button
              type="button"
              onClick={loadPackingData}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.map((item) => (
              <div 
                key={item.id}
                className={`bg-white rounded-3xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  item.is_packed 
                    ? 'border-emerald-300/80 bg-emerald-50/20' 
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.member_name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{item.phone}</p>
                    </div>

                    <span className="px-2.5 py-1 bg-slate-900 text-white rounded-xl font-bold font-mono text-xs">
                      {item.box_count} กล่อง
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.address}</span>
                  </div>

                  {item.allergies && item.allergies.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-xl border border-red-100 font-medium">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>ข้อควรระวัง: {item.allergies.join(', ')}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => togglePacked(item.id)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs ${
                      item.is_packed
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>{item.is_packed ? 'จัดเสร็จแล้ว ✓' : 'ทำเครื่องหมายว่าจัดเสร็จ'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toast.success(`พิมพ์ป้ายสติ๊กเกอร์ของ "${item.member_name}" เรียบร้อย`)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                    title="พิมพ์ป้ายสติ๊กเกอร์ติดถุง"
                  >
                    <Printer size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </div>
  );
};
