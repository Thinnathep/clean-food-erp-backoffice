import React, { useState, useEffect } from 'react';
import { Truck, Clock, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../../config/supabase';

export interface DeliveryScheduleConfig {
  active_days: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
  delivery_time_slot: string;
  mode: "mon_thu" | "mon_wed_fri" | "everyday" | "custom";
}

export const DeliveryScheduleCard: React.FC = () => {
  const [config, setConfig] = useState<DeliveryScheduleConfig>({
    active_days: [1, 4], // Monday (1) & Thursday (4)
    delivery_time_slot: "11:00 - 13:00",
    mode: "mon_thu",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const { data } = await supabase
          .from('erp_system_configs')
          .select('value')
          .eq('key', 'DELIVERY_SCHEDULE')
          .maybeSingle();

        if (data && data.value && isMounted) {
          setConfig(data.value as DeliveryScheduleConfig);
        }
      } catch (err) {
        console.warn("Using default delivery schedule");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchConfig();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (updatedConfig: DeliveryScheduleConfig) => {
    setIsSaving(true);
    try {
      setConfig(updatedConfig);
      const { error } = await supabase
        .from('erp_system_configs')
        .upsert({
          key: 'DELIVERY_SCHEDULE',
          value: updatedConfig,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('บันทึกรอบวันจัดส่งหลักของร้านเรียบร้อย ✨');
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getSummaryLabel = (days: number[]) => {
    if (!days || days.length === 0) return 'ยังไม่ได้กำหนดวัน';
    if (days.length === 7) return 'จัดส่งทุกวัน (จันทร์ - อาทิตย์)';
    if (days.length === 2 && days.includes(1) && days.includes(4)) return 'จันทร์ & พฤหัสบดี (2 วัน/สัปดาห์)';
    if (days.length === 3 && days.includes(1) && days.includes(3) && days.includes(5)) return 'จันทร์, พุธ, ศุกร์ (3 วัน/สัปดาห์)';
    if (days.length === 5 && !days.includes(6) && !days.includes(7)) return 'จันทร์ - ศุกร์ (5 วัน/สัปดาห์)';
    const dayNames: Record<number, string> = { 1: 'จันทร์', 2: 'อังคาร', 3: 'พุธ', 4: 'พฤหัสฯ', 5: 'ศุกร์', 6: 'เสาร์', 7: 'อาทิตย์' };
    return days.sort().map(d => dayNames[d]).join(', ');
  };

  return (
    <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <Truck size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">รอบวันจัดส่งหลักของร้าน (Store Delivery Schedule)</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold pt-0.5">
              เชื่อมโยงกับตารางครัว KDS และการวางแผนมื้ออาหารอัตโนมัติ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSave(config)}
          disabled={isSaving || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
          รูปแบบรอบจัดส่ง (Quick Presets)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            {
              id: 'mon_thu',
              name: 'จันทร์ & พฤหัสฯ (2 วัน)',
              tag: 'รอบปัจจุบัน',
              days: [1, 4],
              desc: 'สัปดาห์ละ 2 ครั้ง',
            },
            {
              id: 'mon_wed_fri',
              name: 'จันทร์, พุธ, ศุกร์ (3 วัน)',
              tag: 'วันเว้นวัน',
              days: [1, 3, 5],
              desc: 'สัปดาห์ละ 3 ครั้ง',
            },
            {
              id: 'mon_fri',
              name: 'จันทร์ - ศุกร์ (5 วัน)',
              tag: 'วันธรรมดา',
              days: [1, 2, 3, 4, 5],
              desc: 'เฉพาะวันทำงาน',
            },
            {
              id: 'everyday',
              name: 'จัดส่งทุกวัน (7 วัน)',
              tag: 'ไม่มีวันหยุด',
              days: [1, 2, 3, 4, 5, 6, 7],
              desc: 'ส่งครบทุกวัน',
            },
          ].map((preset) => {
            const isSelected =
              config.active_days.length === preset.days.length &&
              preset.days.every((d) => config.active_days.includes(d));

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    active_days: preset.days,
                    mode: preset.id as any,
                  }))
                }
                className={`p-3 rounded-2xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{preset.name}</span>
                  {isSelected && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>{preset.desc}</span>
                  <span className="font-semibold px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px]">
                    {preset.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual Day Checkboxes */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
          เลือกวันจัดส่งรายวัน (Custom Days Selector)
        </label>
        <div className="grid grid-cols-7 gap-1.5">
          {[
            { id: 1, name: 'จ.', full: 'จันทร์' },
            { id: 2, name: 'อ.', full: 'อังคาร' },
            { id: 3, name: 'พ.', full: 'พุธ' },
            { id: 4, name: 'พฤ.', full: 'พฤหัสฯ' },
            { id: 5, name: 'ศ.', full: 'ศุกร์' },
            { id: 6, name: 'ส.', full: 'เสาร์' },
            { id: 7, name: 'อา.', full: 'อาทิตย์' },
          ].map((day) => {
            const isChecked = config.active_days.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => {
                  const newDays = isChecked
                    ? config.active_days.filter((d) => d !== day.id)
                    : [...config.active_days, day.id];
                  setConfig((prev) => ({
                    ...prev,
                    active_days: newDays,
                    mode: 'custom',
                  }));
                }}
                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isChecked
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold">{day.name}</span>
                <span className="text-[9px] opacity-80">{isChecked ? 'ส่ง' : 'พัก'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery Time Slot & Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1">
            <Clock size={12} className="text-emerald-600" /> รอบเวลาจัดส่งหลัก
          </label>
          <select
            value={config.delivery_time_slot}
            onChange={(e) => setConfig((prev) => ({ ...prev, delivery_time_slot: e.target.value }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium"
          >
            <option value="11:00 - 13:00">11:00 - 13:00 น. (รอบกลางวัน)</option>
            <option value="15:00 - 17:00">15:00 - 17:00 น. (รอบเย็น)</option>
            <option value="11:00 - 13:00 / 15:00 - 17:00">11:00 - 13:00 & 15:00 - 17:00 น. (2 รอบ)</option>
          </select>
        </div>

        <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2.5">
          <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-950">สถานะที่ใช้งานอยู่ปัจจุบัน</p>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              สัปดาห์นี้มีวันส่ง {config.active_days.length} วัน: <strong className="font-bold">{getSummaryLabel(config.active_days)}</strong> ({config.delivery_time_slot})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
