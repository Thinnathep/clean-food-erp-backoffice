import React, { useState, useMemo, useEffect } from 'react';
import { useKdsStore } from '../../../store/kdsStore';
import { useAuthStore } from '../../../store/authStore';
import {
  UtensilsCrossed, Clock, ChevronLeft, ChevronRight, Package, BarChart3,
  Calendar as CalendarIcon, Printer,
  User, Sparkles, AlertCircle, TrendingUp, ChefHat
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/th';
import Swal from 'sweetalert2';

type TabType = 'dashboard' | 'production' | 'calendar';

// ─── Shared Design Tokens ───────────────────────────────────────────────────
const TAB_CONFIG = [
  { key: 'dashboard' as TabType, label: 'วิเคราะห์ข้อมูล', icon: BarChart3, adminOnly: true },
  { key: 'production' as TabType, label: 'รายการผลิต', icon: ChefHat, adminOnly: false },
  { key: 'calendar' as TabType, label: 'ปฏิทิน', icon: CalendarIcon, adminOnly: false },
];

const PKG_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

const DELIVERY_COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

function getPkgColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return PKG_COLORS[Math.abs(h) % PKG_COLORS.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Pill tab navigator */
function TabNav({ active, onChange, canViewDashboard }: {
  active: TabType; onChange: (t: TabType) => void; canViewDashboard: boolean;
}) {
  return (
    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
      {TAB_CONFIG.filter(t => !t.adminOnly || canViewDashboard).map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            active === tab.key
              ? 'text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {active === tab.key && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-slate-900 rounded-lg"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <tab.icon size={13} className="relative z-10" />
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Date / month navigator */
function DateNav({
  label, value, onPrev, onNext, onToday, isDark = false, onPrint
}: {
  label: string; value: string;
  onPrev: () => void; onNext: () => void; onToday?: () => void;
  isDark?: boolean; onPrint?: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2">
      {onToday && (
        <button
          onClick={onToday}
          className={`px-6 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center ${
            isDark 
              ? 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700' 
              : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
          }`}
        >
          วันนี้
        </button>
      )}

      <div className={`flex items-center rounded-xl border overflow-hidden ${
        isDark ? 'border-slate-700 bg-slate-800/60' : 'border-slate-200 bg-white'
      }`}>
        <button
          onClick={onPrev}
          className={`p-2.5 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}
        >
          <ChevronLeft size={16} />
        </button>
        <div className={`px-4 text-center min-w-[148px] border-x ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {label}
          </p>
          <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</p>
        </div>
        <button
          onClick={onNext}
          className={`p-2.5 transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-50 text-slate-500'}`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {onPrint && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPrint}
          className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors"
          title="พิมพ์รายงาน"
        >
          <Printer size={16} />
        </motion.button>
      )}
    </div>
  );
}

/** KPI stat card for dashboard */
function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number;
  icon: React.ElementType; color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      </div>
    </motion.div>
  );
}

/** Single production card */
function ProductionCard({ item, idx }: { item: any; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="p-5 border-b border-slate-50 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0">
            <UtensilsCrossed size={18} />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-lg leading-tight truncate">{item.name}</h4>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">เมนูประจำวัน</p>
          </div>
        </div>
        {/* Total badge */}
        <div className="shrink-0 text-right">
          <span className="inline-flex items-baseline gap-1 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
            <span className="text-3xl font-black text-emerald-600 leading-none">{item.total}</span>
            <span className="text-sm font-bold text-emerald-500">กล่อง</span>
          </span>
        </div>
      </div>

      {/* Round breakdown */}
      <div className="p-5 grid grid-cols-2 gap-3">
        {Object.entries(item.rounds).map(([round, count]: [string, any]) => (
          <div key={round} className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-blue-500 shrink-0" />
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{round}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {count}<span className="text-sm font-medium text-slate-400 ml-1">boxes</span>
            </p>
          </div>
        ))}
      </div>

      {/* Special notes */}
      {item.notes.length > 0 && (
        <div className="px-5 pb-5">
          <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-100">
            <div className="flex items-center gap-2 mb-2.5">
              <AlertCircle size={13} className="text-rose-500" />
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">หมายเหตุพิเศษ</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {item.notes.map((note: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-rose-700 font-medium">{note.text}</span>
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{note.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ monthlyStats, currentMonth }: { monthlyStats: any; currentMonth: any }) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const pieRef = React.useRef<HTMLDivElement>(null);
  const [barSize, setBarSize] = React.useState({ width: 0, height: 0 });
  const [pieSize, setPieSize] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const updateSize = () => {
      if (barRef.current) {
        const w = barRef.current.offsetWidth;
        setBarSize({ width: w, height: w / 2.2 });
      }
      if (pieRef.current) {
        const w = pieRef.current.offsetWidth;
        setPieSize({ width: w, height: w / 1.2 });
      }
    };

    const observer = new ResizeObserver(updateSize);
    if (barRef.current) observer.observe(barRef.current);
    if (pieRef.current) observer.observe(pieRef.current);
    
    updateSize();
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="ยอดผลิตรวม" value={monthlyStats.totalMeals} icon={Package} color="bg-blue-50 text-blue-600" />
        <KpiCard label="ลูกค้าที่รับ" value={monthlyStats.activeMembers} icon={User} color="bg-emerald-50 text-emerald-600" />
        <KpiCard label="เมนูหลากหลาย" value={monthlyStats.distinctMenus} icon={UtensilsCrossed} color="bg-purple-50 text-purple-600" />
        <KpiCard label="เฉลี่ยต่อวัน" value={(monthlyStats.totalMeals / (currentMonth.daysInMonth() || 1)).toFixed(1)} icon={TrendingUp} color="bg-amber-50 text-amber-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
            <h3 className="text-sm font-semibold text-slate-700">เมนูยอดนิยมประจำเดือน</h3>
          </div>
          <div className="w-full min-w-0" ref={barRef}>
            {barSize.width > 0 && (
              <BarChart 
                width={barSize.width} 
                height={barSize.height} 
                layout="vertical" 
                data={monthlyStats.popularityData} 
                margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#64748b"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#10b981" 
                  radius={[0, 6, 6, 0]} 
                  barSize={18}
                  animationDuration={1000}
                />
              </BarChart>
            )}
            {barSize.width === 0 && (
              <div className="w-full h-[240px] bg-slate-50 animate-pulse rounded-xl" />
            )}
          </div>
        </div>

        {/* Pie chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
            <h3 className="text-sm font-semibold text-slate-700">การจัดส่งตามรอบ</h3>
          </div>
          <div className="w-full min-w-0 overflow-hidden relative" ref={pieRef}>
            {pieSize.width > 0 && (
              <PieChart width={pieSize.width} height={pieSize.height}>
                <Pie
                  data={monthlyStats.roundData}
                  innerRadius={58}
                  outerRadius={76}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1000}
                  cx="50%"
                  cy="50%"
                >
                  {monthlyStats.roundData.map((_: any, i: number) => (
                    <Cell key={i} fill={DELIVERY_COLORS[i % DELIVERY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            )}
            {pieSize.width === 0 && (
              <div className="w-full h-[200px] bg-slate-50 animate-pulse rounded-full border-8 border-slate-100 mx-auto max-w-[160px]" />
            )}
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-2">
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">ยอดรวม</p>
              <p className="text-2xl font-light text-slate-800">{monthlyStats.totalMeals}</p>
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-col gap-2">
            {monthlyStats.roundData.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DELIVERY_COLORS[i % DELIVERY_COLORS.length] }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-medium text-slate-700">{item.value} กล่อง</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Production Tab ───────────────────────────────────────────────────────────
function ProductionTab({ dailySummary }: { dailySummary: any[] }) {
  if (dailySummary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200">
        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <UtensilsCrossed className="text-slate-200 mb-4" size={56} />
        </motion.div>
        <h3 className="text-lg font-light text-slate-400">ยังไม่มีรายการผลิตในวันนี้</h3>
        <p className="text-xs text-slate-300 mt-2 uppercase tracking-widest">No production data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
      {dailySummary.map((item, idx) => (
        <ProductionCard key={idx} item={item} idx={idx} />
      ))}
    </div>
  );
}



// ─── Calendar Tab ─────────────────────────────────────────────────────────────
const WEEKDAYS_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function CalendarTab({ calendarData, activePackages }: {
  calendarData: any[];
  activePackages: any[];
}) {
  // Pre-calculate estimated end dates for each package
  const packagesWithEstimates = useMemo(() => {
    return activePackages.map(pkg => {
      // Basic estimation: if we don't have enough data, assume 2 meals/day
      const avgMealsPerDay = 2; 
      const daysLeft = Math.ceil(pkg.meals_remaining / avgMealsPerDay);
      const estimatedEnd = dayjs().add(daysLeft, 'day').format('YYYY-MM-DD');
      
      return {
        ...pkg,
        display_end_date: estimatedEnd // Use this for drawing the bar
      };
    });
  }, [activePackages]);

  // Filter packages for a specific date using estimated end date
  const getPackagesForDateWithEstimate = (date: string) => {
    return packagesWithEstimates.filter(pkg => {
      const cur = dayjs(date);
      return !cur.isBefore(dayjs(pkg.start_date), 'day') && !cur.isAfter(dayjs(pkg.display_end_date), 'day');
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAYS_EN.map((d, i) => (
          <div
            key={d}
            className={`py-3 text-center text-[10px] font-black tracking-widest ${
              i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7" style={{ minHeight: 640 }}>
        {calendarData.map((day, idx) => {
          const packages = day.date ? getPackagesForDateWithEstimate(day.date) : [];
          const isToday = day.date === dayjs().format('YYYY-MM-DD');
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;

          return (
            <div
              key={idx}
              className={`min-h-[120px] border-r border-b border-slate-50 flex flex-col transition-colors hover:bg-slate-50/50 ${
                !day.isCurrentMonth ? 'bg-slate-50/40' : ''
              } ${isWeekend && day.isCurrentMonth ? 'bg-slate-50/20' : ''}`}
            >
              {/* Date number container with padding */}
              <div className="flex items-start justify-between p-2 pb-1">
                {day.date ? (
                  <span
                    className={`text-sm font-medium leading-none ${
                      isToday
                        ? 'w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs font-bold'
                        : !day.isCurrentMonth
                        ? 'text-slate-300'
                        : isWeekend
                        ? 'text-rose-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {dayjs(day.date).date()}
                  </span>
                ) : (
                  <span />
                )}
                {isToday && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1" />}
              </div>

              {/* Package bars - NO horizontal padding to allow continuity */}
              <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                {packages.slice(0, 5).map((pkg) => {
                  const memberName =
                    (Array.isArray(pkg.members) ? pkg.members[0]?.full_name : pkg.members?.full_name) || '?';
                  
                  const isStart = day.date === pkg.start_date;
                  const isEnd = day.date === pkg.display_end_date;
                  
                  // Should we show labels? Only on start day or beginning of week
                  const isWeekStart = idx % 7 === 0;
                  const showLabel = isStart || isWeekStart;
                  
                  const color = getPkgColor(pkg.member_id);

                  return (
                    <div
                      key={pkg.id}
                      title={`${memberName} (${pkg.package_name})`}
                      className={`h-5 flex items-center px-2 text-white text-[9px] font-bold truncate transition-all
                        ${isStart ? 'ml-1 rounded-l-md' : 'ml-0'}
                        ${isEnd ? 'mr-1 rounded-r-md' : 'mr-0'}
                      `}
                      style={{
                        backgroundColor: color,
                        opacity: isToday ? 1 : 0.85,
                      }}
                    >
                      {showLabel && (
                        <span className="flex items-center gap-1 truncate drop-shadow-sm">
                          <User size={8} className="shrink-0" />
                          <span className="truncate">{memberName}</span>
                        </span>
                      )}
                    </div>
                  );
                })}
                {packages.length > 5 && (
                  <p className="text-[9px] text-slate-400 font-medium pl-2">+{packages.length - 5} รายการ</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <div className="w-5 h-5 bg-slate-900 rounded-lg flex items-center justify-center text-white"><CalendarIcon size={12}/></div>
          วันนี้
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
          <div className="w-10 h-4 rounded-md" style={{ backgroundColor: PKG_COLORS[0] }} />
          ระยะเวลาแพ็กเกจลูกค้า
        </div>
        <p className="text-[11px] text-slate-400 md:ml-auto flex items-center gap-1 italic">
          * แถบสีแสดงช่วงเวลาที่คาดว่าจะมีการส่งอาหารตามจำนวนมื้อคงเหลือ
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const ProductionSummary: React.FC = () => {
  const { user } = useAuthStore();
  const { memberSchedules, loadMemberPlanner, loadGlobalPlanner, activePackages, menus } = useKdsStore();

  const [activeTab, setActiveTab] = useState<TabType>('production');
  const [selectedDate, setSelectedDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));

  const canViewDashboard = user?.role === 'ADMIN';

  // Load data
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'calendar') {
      const start = currentMonth.format('YYYY-MM-DD');
      const end = currentMonth.endOf('month').format('YYYY-MM-DD');
      loadMemberPlanner(start, end);
    } else {
      loadMemberPlanner(selectedDate, selectedDate);
      loadGlobalPlanner(selectedDate, selectedDate);
    }
  }, [selectedDate, activeTab, currentMonth, loadMemberPlanner, loadGlobalPlanner]);

  // Navigation
  const handlePrev = () => {
    if (activeTab === 'production') setSelectedDate(d => dayjs(d).subtract(1, 'day').format('YYYY-MM-DD'));
    else setCurrentMonth(m => m.subtract(1, 'month'));
  };
  const handleNext = () => {
    if (activeTab === 'production') setSelectedDate(d => dayjs(d).add(1, 'day').format('YYYY-MM-DD'));
    else setCurrentMonth(m => m.add(1, 'month'));
  };

  const handleToday = () => {
    setSelectedDate(dayjs().add(1, 'day').format('YYYY-MM-DD'));
    setCurrentMonth(dayjs().startOf('month'));
  };

  // Calendar data
  const calendarData = useMemo(() => {
    const start = currentMonth.startOf('month');
    const days: any[] = [];
    for (let i = 0; i < start.day(); i++) days.push({ date: null, isCurrentMonth: false });
    for (let i = 1; i <= currentMonth.daysInMonth(); i++)
      days.push({ date: currentMonth.date(i).format('YYYY-MM-DD'), isCurrentMonth: true });
    return days;
  }, [currentMonth]);

  // Production data processing
  const dailySummary = useMemo(() => {
    const summary: Record<string, any> = {};
    memberSchedules
      .filter(s => s.delivery_date === selectedDate)
      .forEach(s => {
        const id = s.menu_item_id;
        if (!summary[id]) {
          summary[id] = {
            name: s.menu_items?.name || 'Unknown',
            total: 0,
            rounds: {},
            notes: [],
          };
        }
        summary[id].total += s.quantity;
        const round = s.delivery_time || 'ไม่ระบุ';
        summary[id].rounds[round] = (summary[id].rounds[round] || 0) + s.quantity;
        if (s.notes) {
          const existing = summary[id].notes.find((n: any) => n.text === s.notes);
          if (existing) existing.count += s.quantity;
          else summary[id].notes.push({ text: s.notes, count: s.quantity });
        }
      });
    return Object.values(summary).sort((a, b) => b.total - a.total);
  }, [memberSchedules, selectedDate]);

  // Monthly stats for dashboard
  const monthlyStats = useMemo(() => {
    const filtered = memberSchedules.filter(s => dayjs(s.delivery_date).isSame(currentMonth, 'month'));
    const menuCounts: Record<string, number> = {};
    const menuNames: Record<string, string> = {};
    const roundCounts: Record<string, number> = { 'รอบเช้า': 0, 'รอบเย็น': 0, 'อื่นๆ': 0 };

    filtered.forEach(s => {
      const id = s.menu_item_id;
      menuCounts[id] = (menuCounts[id] || 0) + s.quantity;
      menuNames[id] = s.menu_items?.name || 'Unknown';
      const t = s.delivery_time || '';
      if (t.includes('เช้า')) roundCounts['รอบเช้า'] += s.quantity;
      else if (t.includes('เย็น')) roundCounts['รอบเย็น'] += s.quantity;
      else roundCounts['อื่นๆ'] += s.quantity;
    });

    return {
      totalMeals: filtered.reduce((a, s) => a + s.quantity, 0),
      activeMembers: new Set(filtered.map(s => s.member_id)).size,
      distinctMenus: Object.keys(menuCounts).length,
      popularityData: Object.entries(menuCounts)
        .map(([id, count]) => ({ name: menuNames[id], count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      roundData: Object.entries(roundCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value })),
    };
  }, [memberSchedules, currentMonth]);

  const navLabel = (activeTab === 'production') ? 'วันที่ดูข้อมูล' : 'ประจำเดือน';
  const navValue =
    (activeTab === 'production')
      ? dayjs(selectedDate).locale('th').format('D MMMM YYYY')
      : currentMonth.locale('th').format('MMMM YYYY');

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0">
            {activeTab === 'dashboard' ? <BarChart3 size={18} /> : activeTab === 'calendar' ? <CalendarIcon size={18} /> : <ChefHat size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-base font-semibold text-slate-800 leading-tight">
                {activeTab === 'dashboard' ? 'วิเคราะห์การผลิต' : activeTab === 'production' ? 'สรุปยอดผลิตรายวัน' : 'ปฏิทินแผนงาน'}
              </h2>
              {activeTab === 'dashboard' && <Sparkles size={14} className="text-emerald-500 shrink-0" />}
            </div>
            <TabNav active={activeTab} onChange={setActiveTab} canViewDashboard={canViewDashboard} />
          </div>
        </div>

        <DateNav
          label={navLabel}
          value={navValue}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onPrint={activeTab === 'production' ? () => window.print() : undefined}
        />
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <DashboardTab monthlyStats={monthlyStats} currentMonth={currentMonth} />
            </motion.div>
          )}

          {activeTab === 'production' && (
            <motion.div key="prod" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ProductionTab dailySummary={dailySummary} />
            </motion.div>
          )}



          {activeTab === 'calendar' && (
            <motion.div key="cal" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <CalendarTab calendarData={calendarData} activePackages={activePackages} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};