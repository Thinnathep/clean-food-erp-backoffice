import React, { useState, useEffect } from 'react';
import { Truck, Clock, Save, Sparkles, CheckCircle2, Package, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { 
  type DeliveryScheduleConfig, 
  CORE_PACKAGE_DELIVERY_MODELS, 
  DELIVERY_DAY_PRESETS,
  calculateDeliveryRounds, 
  getDeliveryPlanSummary, 
  formatActiveDaysLabel,
  generateDeliverySchedule,
  DAY_NAMES_SHORT_TH,
  getStoreDeliveryScheduleConfig,
  saveStoreDeliveryScheduleConfig
} from '../../../../features/logistics/services/deliveryScheduleService';

export type { DeliveryScheduleConfig };

export const DeliveryScheduleCard: React.FC = () => {
  const [config, setConfig] = useState<DeliveryScheduleConfig>({
    active_days: [1, 4], // Monday (1) & Thursday (4)
    delivery_time_slot: "11:00 - 13:00",
    mode: "mon_thu",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [simMeals, setSimMeals] = useState<number>(15);

  useEffect(() => {
    let isMounted = true;
    const fetchConfig = async () => {
      try {
        const loadedConfig = await getStoreDeliveryScheduleConfig();
        if (isMounted) {
          setConfig(loadedConfig);
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
      await saveStoreDeliveryScheduleConfig(updatedConfig);
      toast.success('บันทึกรอบวันจัดส่งหลักของร้านเรียบร้อย ✨ (จันทร์ & พฤหัสบดี เป็นค่าเริ่มต้น)');
    } catch (err: any) {
      toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const simRounds = calculateDeliveryRounds(simMeals);
  const simSchedule = generateDeliverySchedule(
    new Date().toISOString().split('T')[0],
    simRounds,
    config.active_days
  );

  return (
    <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
            <Truck size={20} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900">รอบวันจัดส่งหลักของร้าน (Store Delivery Schedule)</h4>
            <p className="text-[11px] text-slate-500 font-medium pt-0.5">
              ค่าเริ่มต้นคือ <strong className="text-emerald-700 font-semibold">วันจันทร์ กับ วันพฤหัสบดี</strong> (เชื่อมโยงกับ KDS จัดถุง และคำนวณจำนวนรอบ/เศษถุงอัตโนมัติ)
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
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
            รูปแบบรอบจัดส่งหลัก (Quick Presets)
          </label>
          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
            สัปดาห์ละ 2 ครั้ง (จันทร์ & พฤหัสฯ)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DELIVERY_DAY_PRESETS.map((preset) => {
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
                    active_days: [...preset.days],
                    mode: preset.id as any,
                  }))
                }
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{preset.name}</span>
                  {isSelected && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />}
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                  <span>{preset.desc}</span>
                  <span className={`font-semibold px-1.5 py-0.5 rounded text-[9px] ${
                    preset.id === 'mon_thu' ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-slate-200 text-slate-700'
                  }`}>
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
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1.5">
          <span>เลือกวันจัดส่งรายวัน (Custom Days Selector)</span>
          <span className="text-[9px] font-normal text-slate-400 lowercase">• สามารถติ๊กเลือกวันจัดส่งตามความต้องการได้</span>
        </label>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((dayId) => {
            const isChecked = config.active_days.includes(dayId);
            const isMonOrThu = dayId === 1 || dayId === 4;

            return (
              <button
                key={dayId}
                type="button"
                onClick={() => {
                  const newDays = isChecked
                    ? config.active_days.filter((d) => d !== dayId)
                    : [...config.active_days, dayId];
                  
                  // Keep sorted
                  newDays.sort((a, b) => a - b);

                  setConfig((prev) => ({
                    ...prev,
                    active_days: newDays.length > 0 ? newDays : [1], // keep at least 1 day
                    mode: 'custom',
                  }));
                }}
                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isChecked
                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/30'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold">{DAY_NAMES_SHORT_TH[dayId]}</span>
                  {isMonOrThu && isChecked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200" title="รอบหลัก" />
                  )}
                </div>
                <span className="text-[9px] opacity-80">{isChecked ? 'จัดส่ง' : 'พัก'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery Time Slot & Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 flex items-center gap-1">
            <Clock size={12} className="text-emerald-600" /> รอบเวลาจัดส่งหลัก
          </label>
          <select
            value={config.delivery_time_slot}
            onChange={(e) => setConfig((prev) => ({ ...prev, delivery_time_slot: e.target.value }))}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-medium"
          >
            <option value="11:00 - 13:00">11:00 - 13:00 น. (รอบกลางวัน - ปกติ)</option>
            <option value="15:00 - 17:00">15:00 - 17:00 น. (รอบเย็น)</option>
            <option value="11:00 - 13:00 / 15:00 - 17:00">11:00 - 13:00 & 15:00 - 17:00 น. (2 รอบ)</option>
          </select>
        </div>

        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2.5">
          <Sparkles size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-emerald-950">สถานะรอบจัดส่งที่เปิดใช้งาน</p>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
              สัปดาห์นี้มีวันส่ง {config.active_days.length} วัน: <strong className="font-bold underline">{formatActiveDaysLabel(config.active_days)}</strong> ({config.delivery_time_slot})
            </p>
          </div>
        </div>
      </div>

      {/* Core Package Models & Dynamic Remainder Rounds Section */}
      <div className="pt-2 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-emerald-600" />
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              มาตรฐานแพ็กเกจปิ่นโต & การกระจายรอบส่ง (Core Delivery Models)
            </h5>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            รอบปกติครั้งละ 6 ถุง + รอบเศษตามจริง
          </span>
        </div>

        {/* 3 Core Package Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CORE_PACKAGE_DELIVERY_MODELS.map((pkg) => (
            <div
              key={pkg.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {pkg.tag}
                </span>
                <span className="text-xs font-extrabold text-slate-900 font-mono">
                  ฿{pkg.price.toLocaleString()}
                </span>
              </div>
              <h6 className="text-xs font-bold text-slate-800">{pkg.name}</h6>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>จำนวนมื้อทั้งหมด:</span>
                  <span className="font-bold text-slate-900">{pkg.mealsTotal} มื้อ</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>จำนวนรอบจัดส่ง:</span>
                  <span className="font-bold text-emerald-700">{pkg.roundsCount} รอบ</span>
                </div>
              </div>
              {/* Bags per round breakdown */}
              <div className="pt-2 border-t border-slate-200/60">
                <p className="text-[10px] text-slate-500 font-semibold mb-1">การแบ่งถุงส่งแต่ละรอบ:</p>
                <div className="flex flex-wrap gap-1">
                  {pkg.roundQuantities.map((q, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                        idx === pkg.roundQuantities.length - 1 && q < 6
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-white border border-slate-200 text-slate-700 shadow-2xs'
                      }`}
                    >
                      รอบ {idx + 1}: {q} ถุง {idx === pkg.roundQuantities.length - 1 && q < 6 ? '(เศษ)' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Dynamic Round Simulator */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5 text-emerald-400">
              <Calculator size={14} /> จำลองการคำนวณรอบและเศษถุงอาหาร (Dynamic Round Simulator)
            </span>
            <span className="text-[10px] text-slate-400">
              รอบละ 6 ถุง + รอบเศษอัตโนมัติ
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-300 font-medium">ระบุจำนวนมื้อ:</label>
              <input
                type="number"
                min="1"
                max="200"
                value={simMeals}
                onChange={(e) => setSimMeals(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold font-mono text-center text-white outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-400">มื้อ</span>
            </div>

            <div className="flex items-center gap-1.5">
              {[15, 30, 63, 20, 45].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSimMeals(preset)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                    simMeals === preset
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset} มื้อ
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span>ผลลัพธ์คำนวณ:</span>
              <strong className="text-emerald-400 font-mono text-sm">
                {getDeliveryPlanSummary(simRounds)}
              </strong>
            </div>

            {simSchedule.length > 0 && (
              <div className="pt-2 border-t border-slate-700/60">
                <p className="text-[10px] text-slate-400 mb-1.5">ตัวอย่างตารางวันจัดส่ง (เริ่มจากวันส่งถัดไป):</p>
                <div className="flex flex-wrap gap-1.5">
                  {simSchedule.slice(0, 8).map((rnd) => (
                    <span
                      key={rnd.roundNumber}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 ${
                        rnd.isRemainder
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700/80 text-white'
                      }`}
                    >
                      <span className="font-bold">รอบ {rnd.roundNumber}:</span>
                      <span>{rnd.dayShortName}</span>
                      <span className="font-bold text-emerald-400">({rnd.quantity} ถุง)</span>
                      {rnd.isRemainder && <span className="text-[9px] text-amber-300">เศษ</span>}
                    </span>
                  ))}
                  {simSchedule.length > 8 && (
                    <span className="px-2 py-1 rounded-lg text-[10px] bg-slate-700/50 text-slate-400">
                      +{simSchedule.length - 8} รอบถัดไป
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

