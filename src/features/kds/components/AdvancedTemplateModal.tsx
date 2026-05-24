import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Settings2, Sparkles, AlertCircle, LayoutTemplate, RotateCw, CheckCircle2 } from "lucide-react";
import dayjs from "dayjs";

interface AdvancedTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (config: {
    category: string;
    startDate: string;
    templateWeek: number | "all";
    overwriteRule: "skip" | "overwrite";
    fillUntilDepleted: boolean;
  }) => void;
  templateCategories: { id: string; name: string }[];
  currentWeekStart: Date;
}

export const AdvancedTemplateModal: React.FC<AdvancedTemplateModalProps> = ({
  isOpen,
  onClose,
  onApply,
  templateCategories,
  currentWeekStart,
}) => {
  const [category, setCategory] = useState(templateCategories[0]?.id || "");
  const [startDate, setStartDate] = useState(dayjs(currentWeekStart).format("YYYY-MM-DD"));
  const [templateWeek, setTemplateWeek] = useState<number | "all">("all");
  const [overwriteRule, setOverwriteRule] = useState<"skip" | "overwrite">("skip");
  const [fillUntilDepleted, setFillUntilDepleted] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          // On mobile it's vertical (max-w-lg), on md+ it's horizontal (max-w-4xl)
          className="relative bg-white rounded-2xl shadow-2xl w-full md:max-w-4xl lg:max-w-5xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">ดึงเมนูอัจฉริยะ (Advanced Auto-Fill)</h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">กำหนดรูปแบบการวางแผนอาหารให้ลูกค้าได้อย่างอิสระและยืดหยุ่น</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <X size={24} />
            </button>
          </div>

          {/* Body: Responsive Grid (1 col mobile, 2 cols tablet/desktop) */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
              
              {/* Left Column: Core Selection */}
              <div className="space-y-6 md:border-r border-slate-200 md:pr-8 lg:pr-12">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest mb-4">
                  <LayoutTemplate size={18} /> ข้อมูลตั้งต้น (Source)
                </div>

                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-800 mb-2">
                    รูปแบบเมนู (Template)
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer hover:border-slate-300"
                    >
                      {templateCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Start Date & Template Week */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      เริ่มลงเมนูตั้งแต่วันที่
                    </label>
                    <div className="relative group">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-slate-300"
                      />
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors" size={18} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-800 mb-2">
                      สัปดาห์ของแม่แบบ
                    </label>
                    <div className="relative">
                      <select
                        value={templateWeek}
                        onChange={(e) => setTemplateWeek(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none cursor-pointer hover:border-slate-300"
                      >
                        <option value="all">ดึงทั้ง 4 สัปดาห์ (วนลูป)</option>
                        <option value={1}>สัปดาห์ที่ 1</option>
                        <option value={2}>สัปดาห์ที่ 2</option>
                        <option value={3}>สัปดาห์ที่ 3</option>
                        <option value={4}>สัปดาห์ที่ 4</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Rules & Logic */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-widest mb-4">
                  <Settings2 size={18} /> เงื่อนไขการลงทับ (Rules)
                </div>

                {/* Overwrite Rules */}
                <div className="space-y-3">
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${overwriteRule === 'skip' ? 'bg-indigo-50/50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="overwriteRule" 
                      value="skip" 
                      checked={overwriteRule === 'skip'} 
                      onChange={() => setOverwriteRule('skip')} 
                    />
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${overwriteRule === 'skip' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                      {overwriteRule === 'skip' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <span className={`block text-base font-bold ${overwriteRule === 'skip' ? 'text-indigo-900' : 'text-slate-800'}`}>
                        ข้ามมื้อที่มีเมนูอยู่แล้ว (แนะนำ)
                      </span>
                      <span className="block text-sm text-slate-500 mt-1">ระบบจะเติมเมนูเฉพาะช่องว่าง ไม่ทับเมนูที่คุณจัดไว้แล้วครึ่งแรก เหมาะสำหรับลบครึ่งหลังแล้วหยอดใหม่</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${overwriteRule === 'overwrite' ? 'bg-rose-50/50 border-rose-500 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                    <input 
                      type="radio" 
                      className="sr-only" 
                      name="overwriteRule" 
                      value="overwrite" 
                      checked={overwriteRule === 'overwrite'} 
                      onChange={() => setOverwriteRule('overwrite')} 
                    />
                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${overwriteRule === 'overwrite' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'}`}>
                      {overwriteRule === 'overwrite' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <span className={`block text-base font-bold ${overwriteRule === 'overwrite' ? 'text-rose-900' : 'text-slate-800'}`}>
                        เขียนทับเมนูเดิมทั้งหมด
                      </span>
                      <span className="block text-sm text-slate-500 mt-1">ล้างไพ่ใหม่ ข้อมูลเมนูเดิมในวันที่เลือกลงจะถูกแทนที่ด้วยแม่แบบใหม่ทันที</span>
                    </div>
                  </label>
                </div>

                {/* Auto Fill Toggle */}
                <div className="pt-2">
                  <label className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${fillUntilDepleted ? 'bg-emerald-50/80 border-emerald-500 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={fillUntilDepleted} 
                      onChange={(e) => setFillUntilDepleted(e.target.checked)} 
                    />
                    <div className={`mt-1 flex items-center justify-center w-6 h-6 rounded-md border-2 shrink-0 transition-colors ${fillUntilDepleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'}`}>
                      {fillUntilDepleted && <CheckCircle2 size={16} strokeWidth={3} />}
                    </div>
                    <div className="flex-1">
                      <span className={`block text-base font-bold flex items-center gap-2 ${fillUntilDepleted ? 'text-emerald-900' : 'text-slate-800'}`}>
                        <RotateCw size={18} className={fillUntilDepleted ? 'animate-spin-slow' : ''} />
                        ลงต่อเนื่องจนกว่าโควต้าจะหมด
                      </span>
                      <span className={`block text-sm mt-1.5 ${fillUntilDepleted ? 'text-emerald-700/80' : 'text-slate-500'}`}>
                        ระบบจะลากยาวนำแม่แบบไปลงในตารางให้ลูกค้าล่วงหน้าข้ามสัปดาห์ไปเรื่อยๆ จนกว่าจำนวนมื้อคงเหลือจะเหลือ 0 (ต่อมื้อให้ครบอัตโนมัติ)
                      </span>
                      
                      <AnimatePresence>
                        {fillUntilDepleted && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-2 p-3 bg-amber-100/50 rounded-lg border border-amber-200">
                              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                              <p className="text-xs font-medium text-amber-800 leading-relaxed">
                                คำแนะนำ: หากลูกค้ามีโควต้าเหลือเยอะมาก (เช่น 120 มื้อ) การลงล่วงหน้าทั้งหมดอาจทำให้ตรวจสอบหรือเปลี่ยนแปลงแผนในอนาคตได้ยาก แนะนำให้ลงล่วงหน้า 1-2 สัปดาห์เป็นหลักค่ะ
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </label>
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => {
                if (category) {
                  onApply({
                    category,
                    startDate,
                    templateWeek,
                    overwriteRule,
                    fillUntilDepleted,
                  });
                  onClose();
                }
              }}
              disabled={!category}
              className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Sparkles size={18} /> เริ่มลงเมนูอัตโนมัติ
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
