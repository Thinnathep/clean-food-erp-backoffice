import React, { useState } from 'react';
import { 
  Lightbulb, ChevronDown, CheckCircle2, 
  Percent, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FinanceGuideCard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

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
                คู่มือการใช้งานระบบบัญชี & กฎการเงิน 4 กองทุน
              </h3>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                Clean Food CR Standard
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              โครงสร้างการแยกรายได้สุทธิ 35/15/20/30 และแยกค่าจัดส่ง 100% เพื่อความมั่นคงทางการเงิน
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <BookOpen size={14} className="text-emerald-400" />
          <span>{isOpen ? 'ซ่อนคู่มือ' : 'ดูคู่มือ & วิธีคำนวณ'}</span>
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
            {/* ─── 1. โครงสร้าง 4 กองทุนหลัก + กองทุนจัดส่ง ─── */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Percent size={14} />
                <span>1. สัดส่วนการแบ่งเงิน 4 กองทุน (จากรายได้สุทธิหลังหักค่าส่ง)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                
                {/* Fund 1: วัตถุดิบ 35% */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">🥦 วัตถุดิบ (Material)</span>
                    <span className="text-xs font-mono font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded-md">35%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ใช้จ่ายค่าเนื้อสัตว์ ผักสด เครื่องปรุง ซอส และกล่องบรรจุภัณฑ์
                  </p>
                </div>

                {/* Fund 2: พัฒนา & แรงงาน 15% */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-blue-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400">👥 แรงงาน (Labor/R&D)</span>
                    <span className="text-xs font-mono font-bold text-white bg-blue-500/20 px-2 py-0.5 rounded-md">15%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ใช้จ่ายค่าแรงทีมครัว เชฟ R&D พัฒนาสูตรอาหารและโภชนาการ
                  </p>
                </div>

                {/* Fund 3: ดำเนินงาน & บิล 20% */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">⚡ ดำเนินงาน (Ops/Bills)</span>
                    <span className="text-xs font-mono font-bold text-white bg-amber-500/20 px-2 py-0.5 rounded-md">20%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    ใช้จ่ายค่าน้ำ ค่าไฟ ค่าแก๊ส ค่าเช่าสถานที่ และค่าการตลาด
                  </p>
                </div>

                {/* Fund 4: กำไร & สำรอง 30% */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-purple-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400">💰 กำไร (Profit/Reserve)</span>
                    <span className="text-xs font-mono font-bold text-white bg-purple-500/20 px-2 py-0.5 rounded-md">30%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    กำไรสุทธิของกิจการ และเงินทุนสำรองฉุกเฉินสำหรับขยายสาขา
                  </p>
                </div>

                {/* Fund 5: ค่าจัดส่ง 100% */}
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-teal-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-400">🛵 กองทุนส่ง (Delivery)</span>
                    <span className="text-xs font-mono font-bold text-white bg-teal-500/20 px-2 py-0.5 rounded-md">100%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    แยกค่าจัดส่งออก 100% ไม่นำมาปน เพื่อจ่ายค่ารอบไรเดอร์ ฿45/จุด
                  </p>
                </div>

              </div>
            </div>

            {/* ─── 2. ตัวอย่างการคำนวณจริง ─── */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>ตัวอย่างการคำนวณ: ออเดอร์ปิ่นโต ฿299 + ค่าจัดส่ง ฿40 (ยอดรวม ฿339)</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono pt-1">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-sans font-bold">ขั้นที่ 1: แยกค่าส่งออก 100%</p>
                  <p>• ยอดรวมที่ลูกค้าชำระ: <strong className="text-white">฿339.00</strong></p>
                  <p>• หักค่าส่งเข้ากองทุนส่ง: <strong className="text-teal-400">- ฿40.00</strong></p>
                  <p>• ยอดสุทธิเข้าคำนวณ (Net): <strong className="text-emerald-400">฿299.00</strong></p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-slate-400 font-sans font-bold">ขั้นที่ 2: แบ่งยอดสุทธิ ฿299 เข้า 4 กองทุน</p>
                  <p>• วัตถุดิบ (35%): <strong className="text-emerald-400">฿104.65</strong></p>
                  <p>• พัฒนา & แรงงาน (15%): <strong className="text-blue-400">฿44.85</strong></p>
                  <p>• ดำเนินงาน & บิล (20%): <strong className="text-amber-400">฿59.80</strong></p>
                  <p>• กำไร & สำรอง (30%): <strong className="text-purple-400">฿89.70</strong></p>
                </div>
              </div>
            </div>

            {/* ─── 3. ขั้นตอนการลงบัญชีประจำวัน ─── */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                3. ขั้นตอนการปฏิบัติงานประจำวันของฝ่ายบัญชี (Daily Workflow)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
                  <p className="font-bold text-emerald-400">1. บันทึกรายรับ (Income)</p>
                  <p className="text-slate-300 text-[11px]">ลงยอดจากลูกค้าปิ่นโตหรือขายหน้าร้าน ระบบจะหักค่าส่งและตัดเข้า 4 กองทุนให้อัตโนมัติ</p>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
                  <p className="font-bold text-rose-400">2. บันทึกรายจ่าย (Expense)</p>
                  <p className="text-slate-300 text-[11px]">เมื่อซื้อของ ให้เลือกว่าหักจากกองทุนใด เช่น ซื้ออกไก่ → หักกองทุนวัตถุดิบ 35%</p>
                </div>
                <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-1">
                  <p className="font-bold text-amber-400">3. กระทบยอดเงินสด (Cash Recon)</p>
                  <p className="text-slate-300 text-[11px]">สิ้นวันนับเงินสดจริงในลิ้นชัก เทียบกับยอดในระบบ หากมีผลต่าง (Variance) ให้ลงบันทึกปิดกะ</p>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
