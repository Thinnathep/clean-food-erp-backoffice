import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, CheckCircle2, Clock, Printer, Search, 
  MapPin, AlertTriangle, RefreshCw, Check, Box, Calendar, ChevronDown
} from 'lucide-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { toast } from 'sonner';
import { supabase } from '../../../../../config/supabase';
import { 
  getStoreDeliveryScheduleConfig, 
  DEFAULT_DELIVERY_DAYS,
  DAY_NAMES_TH, 
  calculateDeliveryRounds,
  formatActiveDaysLabel
} from '../../../../logistics/services/deliveryScheduleService';

dayjs.extend(isoWeek);

interface PackingItem {
  id: string;
  member_name: string;
  phone: string;
  address: string;
  drop_point?: string;
  box_count: number;
  package_name?: string;
  round_label?: string;
  is_remainder?: boolean;
  meals: string[];
  allergies?: string[];
  special_instructions?: string;
  is_packed: boolean;
  packed_at?: string;
}

export const KdsPackagingView: React.FC = () => {
  // 1 = Monday, 4 = Thursday (Default Store Delivery Schedule)
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(1);
  const [activeStoreDays, setActiveStoreDays] = useState<number[]>(DEFAULT_DELIVERY_DAYS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [packingList, setPackingList] = useState<PackingItem[]>([]);
  const [showAllDaysDropdown, setShowAllDaysDropdown] = useState(false);

  // Load Store Delivery Schedule config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getStoreDeliveryScheduleConfig();
        if (config && config.active_days && config.active_days.length > 0) {
          setActiveStoreDays(config.active_days);
          // If current selected day is not in active days, set to first active day
          if (!config.active_days.includes(selectedDayOfWeek)) {
            setSelectedDayOfWeek(config.active_days[0]);
          }
        }
      } catch (err) {
        console.warn('Using default delivery days [1, 4]', err);
      }
    };
    fetchConfig();
  }, []);

  // Load packing data based on selected day and active Pinto packages
  const loadPackingData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active Pinto packages with joined member & drop point info
      const { data: packages, error: pkgError } = await supabase
        .from('pinto_packages')
        .select(`
          id, package_name, meals_total, meals_remaining, delivery_days, delivery_rounds_plan, delivery_slot, internal_notes,
          members (id, full_name, phone, address, sub_district, district, province, allergy_notes, internal_notes, preferred_delivery_days),
          drop_point:erp_drop_points(name)
        `)
        .eq('status', 'active');

      if (pkgError) throw pkgError;

      // 2. Also try fetching today's/this week's specific date for the selected day of week
      const currentWeekStart = dayjs().startOf('isoWeek');
      const targetDate = currentWeekStart.add(selectedDayOfWeek - 1, 'day').format('YYYY-MM-DD');

      const { data: schedules } = await supabase
        .from('erp_member_meal_schedules')
        .select(`
          id, package_id, member_id, delivery_date, quantity, meal_type,
          menu_items (name)
        `)
        .eq('delivery_date', targetDate);

      // Map schedules by package_id
      const schedulesByPkg: Record<string, { totalQty: number; meals: string[] }> = {};
      if (schedules && schedules.length > 0) {
        schedules.forEach((s: any) => {
          if (!schedulesByPkg[s.package_id]) {
            schedulesByPkg[s.package_id] = { totalQty: 0, meals: [] };
          }
          schedulesByPkg[s.package_id].totalQty += (s.quantity || 1);
          if (s.menu_items?.name && !schedulesByPkg[s.package_id].meals.includes(s.menu_items.name)) {
            schedulesByPkg[s.package_id].meals.push(s.menu_items.name);
          }
        });
      }

      if (packages && packages.length > 0) {
        const formatted: PackingItem[] = [];

        packages.forEach((pkg: any) => {
          const member = Array.isArray(pkg.members) ? pkg.members[0] : pkg.members;
          if (!member) return;

          // Check if package or member delivers on selectedDayOfWeek
          const pkgDays: number[] = Array.isArray(pkg.delivery_days) && pkg.delivery_days.length > 0
            ? pkg.delivery_days
            : Array.isArray(member.preferred_delivery_days) && member.preferred_delivery_days.length > 0
              ? member.preferred_delivery_days
              : activeStoreDays;

          if (!pkgDays.includes(selectedDayOfWeek)) {
            // Not a delivery day for this customer
            return;
          }

          // Calculate dynamic round plan
          const totalMeals = pkg.meals_total || 15;
          const rounds = (Array.isArray(pkg.delivery_rounds_plan) && pkg.delivery_rounds_plan.length > 0)
            ? pkg.delivery_rounds_plan
            : calculateDeliveryRounds(totalMeals, 6);
          const remaining = pkg.meals_remaining ?? totalMeals;

          // Determine current box count
          // If schedule exists in database for this date, use exact schedule quantity
          let boxCount = 6;
          let isRemainder = false;
          let roundLabel = '';

          if (schedulesByPkg[pkg.id] && schedulesByPkg[pkg.id].totalQty > 0) {
            boxCount = schedulesByPkg[pkg.id].totalQty;
            isRemainder = boxCount < 6;
            roundLabel = isRemainder ? `ตามแผนครัว (รอบเศษ ${boxCount} กล่อง)` : `ตามแผนครัว (${boxCount} กล่อง)`;
          } else {
            // Calculate dynamic box count from package plan
            // e.g. for [6, 6, 3]: if remaining <= 3 -> remainder round 3
            if (remaining > 0 && remaining <= 3 && totalMeals === 15) {
              boxCount = 3;
              isRemainder = true;
              roundLabel = 'รอบที่ 3 (รอบเศษ 3 กล่อง)';
            } else if (remaining > 0 && remaining <= (rounds[rounds.length - 1] || 6) && rounds.length > 1) {
              boxCount = rounds[rounds.length - 1];
              isRemainder = boxCount < 6;
              roundLabel = isRemainder ? `รอบเศษสุดท้าย (${boxCount} กล่อง)` : `รอบปกติ (6 กล่อง)`;
            } else {
              boxCount = rounds[0] || 6;
              isRemainder = false;
              roundLabel = `รอบปกติ (6 กล่อง)`;
            }
          }

          const mealsList = schedulesByPkg[pkg.id]?.meals.length
            ? schedulesByPkg[pkg.id].meals
            : ['เมนูคลีนตามแผนครัวประจำรอบ'];

          const dropPointName = Array.isArray(pkg.drop_point)
            ? pkg.drop_point[0]?.name
            : pkg.drop_point?.name;

          const addressFull = member.address 
            ? `${member.address} ${member.sub_district || ''} ${member.district || ''}`.trim()
            : 'จัดส่งตามรอบร้าน';

          formatted.push({
            id: pkg.id,
            member_name: member.full_name || 'สมาชิกปิ่นโต',
            phone: member.phone || '-',
            address: addressFull,
            drop_point: dropPointName,
            box_count: boxCount,
            package_name: pkg.package_name,
            round_label: roundLabel,
            is_remainder: isRemainder,
            meals: mealsList,
            allergies: member.allergy_notes ? [member.allergy_notes] : [],
            special_instructions: member.internal_notes || pkg.internal_notes,
            is_packed: false
          });
        });

        setPackingList(formatted);
      } else {
        setPackingList([]);
      }
    } catch (err) {
      console.error('Error loading packing data:', err);
      // Graceful fallback to empty state
      setPackingList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDayOfWeek, activeStoreDays]);

  useEffect(() => {
    loadPackingData();
  }, [loadPackingData]);

  const togglePacked = (id: string) => {
    setPackingList(prev => prev.map(item => {
      if (item.id === id) {
        const nextState = !item.is_packed;
        if (nextState) toast.success(`จัดถุงของ "${item.member_name}" (${item.box_count} กล่อง) เรียบร้อย ✨`);
        return { ...item, is_packed: nextState, packed_at: nextState ? dayjs().format('HH:mm') : undefined };
      }
      return item;
    }));
  };

  const handlePrintAll = () => {
    toast.success(`ส่งคำสั่งพิมพ์สติ๊กเกอร์ป้ายติดถุงรอบวัน${DAY_NAMES_TH[selectedDayOfWeek]} ทั้งหมด ${packingList.length} ใบ`);
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

  const currentDayName = DAY_NAMES_TH[selectedDayOfWeek] || `วัน${selectedDayOfWeek}`;

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
                  รอบจัดส่ง: จันทร์ & พฤหัสบดี
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                ตรวจนับกล่องอาหาร แยกถุงตามสมาชิก/จุดส่ง (คำนวณจำนวนกล่อง 6 กล่อง หรือรอบเศษ 3 กล่อง อัตโนมัติ)
              </p>
            </div>
          </div>

          {/* Delivery Day Switcher & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Quick Days Switcher: Monday & Thursday + Active Store Days */}
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
              {activeStoreDays.map((dayNum) => (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => setSelectedDayOfWeek(dayNum)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedDayOfWeek === dayNum 
                      ? 'bg-white text-slate-900 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>วัน{DAY_NAMES_TH[dayNum]}</span>
                  {(dayNum === 1 || dayNum === 4) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="รอบหลักร้าน" />
                  )}
                </button>
              ))}

              {/* Custom Day Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAllDaysDropdown(!showAllDaysDropdown)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                    !activeStoreDays.includes(selectedDayOfWeek)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                  title="เลือกวันอื่นๆ"
                >
                  <Calendar size={13} />
                  <span>{!activeStoreDays.includes(selectedDayOfWeek) ? `วัน${DAY_NAMES_TH[selectedDayOfWeek]}` : 'วันอื่น'}</span>
                  <ChevronDown size={12} />
                </button>

                {showAllDaysDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-36 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setSelectedDayOfWeek(d);
                          setShowAllDaysDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                          selectedDayOfWeek === d
                            ? 'bg-emerald-50 text-emerald-800 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>วัน{DAY_NAMES_TH[d]}</span>
                        {(d === 1 || d === 4) && (
                          <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-100 px-1 rounded">หลัก</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handlePrintAll}
              disabled={filteredList.length === 0}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
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
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">ถุงจัดส่ง (รอบวัน{currentDayName})</p>
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

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-[11px] font-medium text-slate-400">
              รอบหลักร้าน: <strong className="text-slate-700">{formatActiveDaysLabel(activeStoreDays)}</strong>
            </span>
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
            <h3 className="text-base font-bold text-slate-800">ยังไม่มีรายการจัดถุงสำหรับรอบวัน{currentDayName}</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              ระบบเชื่อมโยงกับรอบจัดส่งของร้านและแผนอาหารปิ่นโต หากมีสมาชิกที่ถึงรอบส่งในวัน{currentDayName} ข้อมูลจะปรากฏที่นี่โดยอัตโนมัติ
            </p>
            <button
              type="button"
              onClick={loadPackingData}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 active:scale-95"
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
                    : item.is_remainder
                      ? 'border-amber-300/80 hover:border-amber-400 bg-amber-50/10'
                      : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.member_name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{item.phone}</p>
                      {item.package_name && (
                        <p className="text-[10px] text-emerald-700 font-medium mt-0.5">{item.package_name}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-1 rounded-xl font-bold font-mono text-xs ${
                        item.is_remainder
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-900 text-white'
                      }`}>
                        {item.box_count} กล่อง {item.is_remainder ? '(รอบเศษ)' : ''}
                      </span>
                      {item.round_label && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {item.round_label}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.address}</span>
                  </div>

                  {item.drop_point && (
                    <div className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100 font-medium">
                      จุดส่งกลุ่ม: <strong>{item.drop_point}</strong>
                    </div>
                  )}

                  {/* Meals List */}
                  <div className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                      รายการอาหารประจำถุง:
                    </span>
                    {item.meals.map((m, idx) => (
                      <p key={idx} className="truncate text-slate-700">• {m}</p>
                    ))}
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
                    onClick={() => toast.success(`พิมพ์ป้ายสติ๊กเกอร์ของ "${item.member_name}" (${item.box_count} กล่อง) เรียบร้อย`)}
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
