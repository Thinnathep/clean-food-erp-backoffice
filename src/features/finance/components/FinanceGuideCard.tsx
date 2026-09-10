import React, { useState } from 'react';
import { 
  Lightbulb, ChevronDown, CheckCircle2, 
  Percent, BookOpen, ChefHat, Rocket, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FinanceGuideCard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPkgTab, setSelectedPkgTab] = useState<0 | 1 | 2>(0);

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 text-white shadow-md relative overflow-hidden font-sans">
      
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Lightbulb size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                คู่มือระบบบัญชี & กฎการเงิน 7 กองทุน
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                มาตรฐาน 04/08/2569
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              โครงสร้างการแยกเงิน 7 กองทุน (40/10/14/9/4/4/19) บันทึกรายรับ-รายจ่าย และกระทบยอดเงินสด
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <BookOpen size={14} className="text-emerald-400" />
          <span>{isOpen ? 'ซ่อนคู่มือ' : 'ดูคู่มือ 7 กองทุน'}</span>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Expandable Guide Body */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden pt-5 space-y-5 border-t border-slate-800 mt-4 relative z-10"
          >
            {/* ─── 1. โครงสร้าง 7 กองทุนใน 3 Financial Zones ─── */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={14} />
                <span>1. สัดส่วนแยกเงิน 7 กองทุน แบ่งตาม 3 โซนการเงิน</span>
              </h4>

              {/* Zone 1: Direct Production (64%) */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <ChefHat size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">โซน 1: ต้นทุนตรงการผลิตอาหาร (64%)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400">🟢 กองทุนวัตถุดิบ</span>
                      <span className="text-xs font-mono font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded-md">40%</span>
                    </div>
                    <p className="text-[11px] text-slate-300">เนื้อสัตว์ ผักสด เครื่องปรุง และวัตถุดิบประกอบอาหารทั้งหมด</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">🟡 ค่าบิล & ถุงซีล</span>
                      <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-md">10%</span>
                    </div>
                    <p className="text-[11px] text-slate-300">ค่าถุงซีล 2 ชั้น ค่าน้ำ ค่าไฟ ค่าแก๊ส และน้ำยาทำความสะอาด</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-blue-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400">🔵 ค่าแรงคนทำ</span>
                      <span className="text-xs font-mono font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded-md">14%</span>
                    </div>
                    <p className="text-[11px] text-slate-300">จ่ายค่าตอบแทนคนทำอาหารในครัวตามจำนวนแพ็คที่ผลิต</p>
                  </div>
                </div>
              </div>

              {/* Zone 2: Operations & Growth (17%) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <Rocket size={14} className="text-sky-400" />
                  <span className="text-xs font-bold text-sky-300">โซน 2: การดำเนินงานและการเติบโต (17%)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-orange-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-400">🛵 ช่วยค่าส่ง Grab</span>
                      <span className="text-xs font-mono font-bold text-white bg-orange-500/20 px-2 py-0.5 rounded-md">9%</span>
                    </div>
                    <p className="text-[11px] text-slate-300">งบช่วยส่ง 9% + ค่าส่งที่ลูกค้าจ่าย ใช้เบิกจ่ายไรเดอร์ตามรอบจริง</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-purple-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400">📢 งบการตลาด (Ads)</span>
                      <span className="text-xs font-mono font-bold text-white bg-purple-500/20 px-2 py-0.5 rounded-md">4%</span>
                    </div>
                    <p className="text-[11px] text-slate-300">สะสมไว้สำหรับยิงโฆษณา Facebook, TikTok และทำคอนเทนต์</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-500/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">🛠️ ทุนสำรอง/ซ่อมบำรุง</span>
                      <span className="text-xs font-mono font-bold text-white bg-slate-500/30 px-2 py-0.5 rounded-md">4%</span>
                    </div>
                    <p className="text-[11px] text-slate-200">เงินสำรองซ่อมเครื่องซีล ตู้เย็น เตาอบ หรือค่าใช้จ่ายฉุกเฉิน</p>
                  </div>
                </div>
              </div>

              {/* Zone 3: Bottom Line & Reserves (19% 🔒) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-pink-400" />
                  <span className="text-xs font-bold text-pink-300">โซน 3: ผลตอบแทนสุทธิและการเงิน (19% 🔒)</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 border border-pink-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-pink-400">🔴 กำไรสุทธิเข้ากระเป๋า (19%)</span>
                    <span className="text-xs font-mono font-bold text-white bg-pink-500/20 px-2 py-0.5 rounded-md">19%</span>
                  </div>
                  <p className="text-[11px] text-slate-200">
                    กำไรสุทธิ 19% เป็นผลตอบแทนเข้ากระเป๋าเจ้าของกิจการ (ปันผลและสะสมความมั่งคั่ง)
                  </p>
                </div>
              </div>
            </div>

            {/* ─── 2. ตัวอย่างการคำนวณจริง ทั้ง 3 แพ็กเกจมาตรฐาน ─── */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-800">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>ตัวอย่างคำนวณแยกเงินจริง: 3 แพ็กเกจมาตรฐาน (กำไร 19% เต็ม)</span>
                </h4>
                <div className="flex gap-1.5">
                  {(['7 วัน (999฿)', '14 วัน (1,899฿)', '1 เดือน (3,999฿)'] as const).map((tabName, idx) => (
                    <button
                      key={tabName}
                      type="button"
                      onClick={() => setSelectedPkgTab(idx as 0 | 1 | 2)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        selectedPkgTab === idx 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {tabName}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const pkg = [
                  {
                    name: '1. แพ็กเกจ 7 วัน (999 บาท) | 15 มื้อ',
                    subtitle: 'ราคาเฉลี่ย 66.60 ฿/มื้อ | จัดส่ง 3 รอบ (35฿ × 3 รอบ = 105฿)',
                    zone1Total: '฿640.00',
                    zone23Total: '฿359.00',
                    material: '฿400.00 (40%)',
                    materialDesc: 'เฉลี่ย 26.67 ฿/มื้อ — งบวัตถุดิบคุณภาพเต็มที่',
                    packaging: '฿100.00 (10%)',
                    packagingDesc: 'เฉลี่ย 6.67 ฿/มื้อ — คลุมค่าถุงซีล 2 ชั้น + ค่าไฟแก๊ส',
                    labor: '฿140.00 (14%)',
                    laborDesc: 'เฉลี่ย 9.33 ฿/มื้อ — จ่ายค่าแรงคนทำ 140 บาท',
                    delivery: '฿105.00 (11%)',
                    deliveryDesc: 'ได้งบส่ง 35.00 ฿ × 3 รอบ = 105 บาทพอดี',
                    marketing: '฿40.00 (4%)',
                    marketingDesc: 'สะสมไว้ค่ายิงแอดและการตลาด',
                    maintenance: '฿40.00 (4%)',
                    maintenanceDesc: 'สะสมซ่อมบำรุงเครื่องซีล/ตู้เย็น',
                    profit: '฿174.00 (17%)',
                    profitDesc: 'กำไรสุทธิ 17% เต็มจำนวน (เฉลี่ย 11.60 ฿/มื้อ 🔒)'
                  },
                  {
                    name: '2. แพ็กเกจ 14 วัน (1,899 บาท) | 30 มื้อ',
                    subtitle: 'ราคาเฉลี่ย 63.30 ฿/มื้อ | จัดส่ง 5 รอบ (35฿ × 5 รอบ = 175฿)',
                    zone1Total: '฿1,216.00',
                    zone23Total: '฿683.00',
                    material: '฿760.00 (40%)',
                    materialDesc: 'เฉลี่ย 25.33 ฿/มื้อ — ชนต้นทุนจริง 25.28 ฿ พอดี',
                    packaging: '฿190.00 (10%)',
                    packagingDesc: 'เฉลี่ย 6.33 ฿/มื้อ — คลุมค่าถุงซีล + ไฟแก๊ส',
                    labor: '฿266.00 (14%)',
                    laborDesc: 'เฉลี่ย 8.87 ฿/มื้อ — จ่ายคนทำ 266 บาท',
                    delivery: '฿175.00 (9%)',
                    deliveryDesc: 'ได้งบส่ง 35.00 ฿ × 5 รอบ = 175 บาทพอดี',
                    marketing: '฿76.00 (4%)',
                    marketingDesc: 'สะสมไว้ค่ายิงแอดและการตลาด',
                    maintenance: '฿76.00 (4%)',
                    maintenanceDesc: 'สะสมซ่อมบำรุงเครื่องซีล/ตู้เย็น',
                    profit: '฿356.00 (19%)',
                    profitDesc: 'กำไรสุทธิ 19% เต็มจำนวน (เฉลี่ย 11.87 ฿/มื้อ 🔒)'
                  },
                  {
                    name: '3. แพ็กเกจ 1 เดือน (3,999 บาท) | 63 มื้อ',
                    subtitle: 'ราคาเฉลี่ย 63.48 ฿/มื้อ | จัดส่ง 11 รอบ (35฿ × 11 รอบ = 385฿)',
                    zone1Total: '฿2,560.00',
                    zone23Total: '฿1,439.00',
                    material: '฿1,600.00 (40%)',
                    materialDesc: 'เฉลี่ย 25.40 ฿/มื้อ — สั่งของยกกระสอบ/ลัง ประหยัดขึ้น',
                    packaging: '฿400.00 (10%)',
                    packagingDesc: 'เฉลี่ย 6.35 ฿/มื้อ — คลุมถุงซีล 2 ชั้น + ค่าไฟแก๊ส',
                    labor: '฿560.00 (14%)',
                    laborDesc: 'เฉลี่ย 8.89 ฿/มื้อ — จ่ายคนทำ 560 บาท',
                    delivery: '฿385.00 (10%)',
                    deliveryDesc: 'ได้งบส่ง 35.00 ฿ × 11 รอบ = 385 บาทพอดี',
                    marketing: '฿160.00 (4%)',
                    marketingDesc: 'สะสมไว้ค่ายิงแอดและการตลาด',
                    maintenance: '฿160.00 (4%)',
                    maintenanceDesc: 'สะสมซ่อมบำรุงเครื่องซีล/ตู้เย็น',
                    profit: '฿734.00 (18%)',
                    profitDesc: 'กำไรสุทธิ 18% เต็มจำนวน (เฉลี่ย 11.65 ฿/มื้อ 🔒)'
                  }
                ][selectedPkgTab];

                return (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400">{pkg.name}</span>
                      <span className="text-slate-300 font-mono text-[11px]">{pkg.subtitle}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-200 font-mono pt-1">
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                        <p className="text-emerald-300 font-sans font-bold">โซน 1: ต้นทุนตรงการผลิต ({pkg.zone1Total})</p>
                        <p>• วัตถุดิบ (40%): <strong className="text-emerald-400">{pkg.material}</strong> <span className="text-[11px] text-slate-300 font-sans font-normal">({pkg.materialDesc})</span></p>
                        <p>• ค่าบิล & ถุงซีล (10%): <strong className="text-amber-400">{pkg.packaging}</strong> <span className="text-[11px] text-slate-300 font-sans font-normal">({pkg.packagingDesc})</span></p>
                        <p>• ค่าแรงคนทำ (14%): <strong className="text-blue-400">{pkg.labor}</strong> <span className="text-[11px] text-slate-300 font-sans font-normal">({pkg.laborDesc})</span></p>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                        <p className="text-sky-300 font-sans font-bold">โซน 2 & 3: ดำเนินงาน + กำไร ({pkg.zone23Total})</p>
                        <p>• ช่วยส่ง Grab (9%): <strong className="text-orange-400">{pkg.delivery}</strong> <span className="text-[11px] text-slate-300 font-sans font-normal">({pkg.deliveryDesc})</span></p>
                        <p>• งบการตลาด (4%): <strong className="text-purple-400">{pkg.marketing}</strong> <span className="text-[11px] text-slate-300 font-sans font-normal">({pkg.marketingDesc})</span></p>
                        <p>• ทุนสำรองซ่อมบำรุง (4%): <strong className="text-slate-200">{pkg.maintenance}</strong> <span className="text-[11px] text-slate-300 font-sans font-normal">({pkg.maintenanceDesc})</span></p>
                        <p className="pt-0.5 border-t border-slate-800">
                          • กำไรสุทธิเข้ากระเป๋า (19%): <strong className="text-pink-400 text-sm">{pkg.profit}</strong> 🔒 <span className="text-[10px] text-slate-300 font-sans block">{pkg.profitDesc}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ─── 3. ทำความเข้าใจความต่างระหว่าง "ค่าบิล" กับ "ค่าดำเนินการเดิม" ─── */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
              <p className="font-bold text-emerald-400">💡 ทำไมจึงไม่มีคำว่า "ค่าดำเนินการ" อีกต่อไป?</p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ในระบบเดิม 4 กองทุน "ค่าดำเนินการ" ถูกรวมไว้กว้างๆ 20% ทำให้ไม่ชัดเจนว่ารวมอะไรบ้าง<br />
                ในมาตรฐานใหม่ 7 กองทุน จึงแตกเป็น 4 บัญชีเจาะจง: <strong>ค่าบิล & ถุงซีล (10%)</strong> สำหรับค่าน้ำ/ไฟ/แก๊ส/ถุงซีล, <strong>ช่วยค่าส่ง Grab (9%)</strong> สำหรับไรเดอร์, <strong>การตลาด (4%)</strong> สำหรับยิงแอด, และ <strong>ซ่อมบำรุง (4%)</strong> สำหรับซ่อมอุปกรณ์ครัว ทุกบาทมีชื่อและหน้าที่ชัดเจน 100%
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
