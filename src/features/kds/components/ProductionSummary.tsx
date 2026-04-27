import React, { useState, useMemo, useEffect } from 'react';
import { useKdsStore } from '../../../store/kdsStore';
import { UtensilsCrossed, Clock, ChevronLeft, ChevronRight, Package, FileText } from 'lucide-react';
import dayjs from 'dayjs';

export const ProductionSummary: React.FC = () => {
  const { memberSchedules, globalPlanSlots, loadMemberPlanner, loadGlobalPlanner } = useKdsStore();
  const [selectedDate, setSelectedDate] = useState(dayjs().add(1, 'day').format('YYYY-MM-DD'));

  useEffect(() => {
    // Load for the specific day (start and end are the same)
    loadMemberPlanner(selectedDate, selectedDate);
    loadGlobalPlanner(selectedDate, selectedDate);
  }, [selectedDate, loadMemberPlanner, loadGlobalPlanner]);

  const handlePrevDay = () => setSelectedDate(dayjs(selectedDate).subtract(1, 'day').format('YYYY-MM-DD'));
  const handleNextDay = () => setSelectedDate(dayjs(selectedDate).add(1, 'day').format('YYYY-MM-DD'));

  // Aggregate Data
  const summary = useMemo(() => {
    const dailySchedules = memberSchedules.filter(s => s.delivery_date === selectedDate);
    const dailyGlobals = globalPlanSlots.filter(s => s.delivery_date === selectedDate);

    const menuStats: Record<string, { 
      name: string; 
      total: number; 
      rounds: Record<string, number>;
      notes: string[];
    }> = {};

    dailySchedules.forEach(s => {
      const globalSlot = dailyGlobals.find(g => g.meal_type === s.meal_type);
      const menuName = globalSlot?.menu_items?.name || `มื้อที่ ${s.meal_type.split('_')[1]}`;
      const round = s.delivery_time || '11:00 - 13:00';

      if (!menuStats[menuName]) {
        menuStats[menuName] = { name: menuName, total: 0, rounds: {}, notes: [] };
      }

      menuStats[menuName].total += s.quantity;
      menuStats[menuName].rounds[round] = (menuStats[menuName].rounds[round] || 0) + s.quantity;
      if (s.notes) menuStats[menuName].notes.push(s.notes);
    });

    return Object.values(menuStats);
  }, [memberSchedules, globalPlanSlots, selectedDate]);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Package className="text-emerald-500" /> สรุปยอดการผลิตรายวัน
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">
            ยอดรวมเมนูทั้งหมดที่ต้องจัดเตรียม แยกตามรอบส่ง
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button onClick={handlePrevDay} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all">
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 py-1 text-center min-w-[140px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {dayjs(selectedDate).isSame(dayjs(), 'day') ? 'วันนี้' : dayjs(selectedDate).isSame(dayjs().add(1, 'day'), 'day') ? 'พรุ่งนี้' : ''}
            </p>
            <p className="text-sm font-black text-slate-700">
              {dayjs(selectedDate).format('DD MMMM YYYY')}
            </p>
          </div>
          <button onClick={handleNextDay} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 transition-all">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {summary.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={40} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-600">ยังไม่มีแผนงานในวันนี้</h3>
            <p className="text-sm font-bold text-slate-400">ไปที่หน้าจัดตารางเพื่อเริ่มวางแผนอาหาร</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {summary.map((item, idx) => (
              <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                      <UtensilsCrossed size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-800 leading-tight">{item.name}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">เมนูประจำวัน</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-emerald-600 leading-none">{item.total}</p>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">กล่องทั้งหมด</p>
                  </div>
                </div>

                <div className="p-5 flex-1 grid grid-cols-2 gap-4 bg-slate-50/50">
                  {Object.entries(item.rounds).map(([round, count]) => (
                    <div key={round} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                          <Clock size={12} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{round}</p>
                      </div>
                      <p className="text-xl font-black text-slate-800">{count} <span className="text-xs font-bold text-slate-400">กล่อง</span></p>
                    </div>
                  ))}
                </div>

                {item.notes.length > 0 && (
                  <div className="p-4 bg-amber-50 border-t border-amber-100">
                    <h5 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={12} /> หมายเหตุพิเศษ ({item.notes.length})
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(item.notes)).map((note, nIdx) => (
                        <span key={nIdx} className="px-2 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700">
                          {note}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {summary.length > 0 && (
        <div className="p-6 bg-white border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                <UtensilsCrossed size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">จำนวนเมนู</p>
                <p className="text-sm font-black text-slate-800">{summary.length} รายการ</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Package size={16} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">รวมทั้งหมด</p>
                <p className="text-sm font-black text-slate-800">{summary.reduce((acc, curr) => acc + curr.total, 0)} กล่อง</p>
              </div>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-slate-800 transition-all flex items-center gap-2">
             พิมพ์ใบสรุปยอด <FileText size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
