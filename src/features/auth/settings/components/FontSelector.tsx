import React from 'react';

interface FontSelectorProps {
  thaiFont: string;
  setThaiFont: (font: string) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  thaiFont,
  setThaiFont,
}) => {
  return (
    <div className="space-y-4">
      {/* Dynamic Google Fonts Import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;700&family=Sarabun:wght@400;700&display=swap');
      `}</style>

      {/* Thai Font Selector */}
      <div className="space-y-1 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">
          ฟอนต์ภาษาไทยสำหรับพิมพ์ (Thai Font Family)
        </label>
        <select 
          value={thaiFont}
          onChange={(e) => setThaiFont(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-semibold outline-none focus:border-purple-500 focus:bg-white transition-all cursor-pointer shadow-inner"
          style={{ fontFamily: `${thaiFont}, sans-serif` }}
        >
          <option value="Tahoma" style={{ fontFamily: 'Tahoma, sans-serif' }}>Tahoma (แนะนำ! ลายเส้นคมชัด)</option>
          <option value="MS Sans Serif" style={{ fontFamily: 'MS Sans Serif, sans-serif' }}>MS Sans Serif (คลาสสิกสากล)</option>
          <option value="Sarabun" style={{ fontFamily: 'Sarabun, sans-serif' }}>Sarabun (สารบรรณทางการ)</option>
          <option value="Prompt" style={{ fontFamily: 'Prompt, sans-serif' }}>Prompt (โมเดิร์นทันสมัย)</option>
          <option value="Courier New" style={{ fontFamily: 'Courier New, monospace' }}>Courier New (ตัวพิมพ์ดีด)</option>
        </select>
        <p className="text-[9px] text-slate-400 leading-normal pt-1.5 ml-0.5">
          *ระบบจัดการพิมพ์ใช้โหมดกราฟิกภาพความแม่นยำสูงโดยอัตโนมัติ สระและวรรณยุกต์ไทยจะถูกจัดเรียงตำแหน่งและวาดลง Canvas อย่างถูกต้อง ไร้ปัญหาสระลอยหรือพิมพ์ห่าง
        </p>
      </div>

      {/* Physical Thermal Receipt Hanging Ticket Preview */}
      <div className="relative mx-auto max-w-[280px]">
        {/* Receipt Header Paper Hanger */}
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-t-lg z-10 flex items-center justify-center shadow-md">
          <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
        </div>

        {/* Paper Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl pt-5 pb-6 px-5 shadow-lg text-slate-800 space-y-3 relative overflow-hidden transition-all duration-300">
          {/* Top Paper Cutter Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-100 via-white to-slate-100" />
          
          <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center select-none">
            ตั๋วทดสอบหน้าจอครัวจำลอง (Receipt Ticket)
          </span>

          <div 
            className="text-center select-none transition-all duration-300 border border-slate-100 p-4 rounded-2xl bg-[#FCFDFE]"
            style={{ fontFamily: `${thaiFont === 'Courier New' ? 'Courier New, monospace' : `${thaiFont}, sans-serif`}` }}
          >
            <div className="text-sm font-black text-slate-900 mb-0.5">
              ใบสั่งเตรียมอาหาร KDS
            </div>
            <div className="text-[10px] font-bold text-slate-600 mb-1">
              ใบออเดอร์อาหาร Clean Food CR
            </div>
            <div className="text-[10px] text-slate-300 font-bold leading-none mb-2">
              --------------------------------
            </div>
            
            <div className="text-left space-y-1 text-[11px] leading-relaxed">
              <div className="flex justify-between text-slate-600 font-normal">
                <span>ลูกค้า:</span>
                <span>คุณสมชาย ดีใจ</span>
              </div>
              <div className="flex justify-between text-slate-600 font-normal">
                <span>เบอร์โทร:</span>
                <span>081-234-5678</span>
              </div>
              <div className="flex justify-between text-slate-600 font-normal">
                <span>รอบจัดส่ง:</span>
                <span>รอบเช้า (08:00)</span>
              </div>
              <div className="flex justify-between text-slate-600 font-normal">
                <span>ประเภท:</span>
                <span>อาหารเพื่อสุขภาพ</span>
              </div>
              <div className="flex justify-between text-slate-600 font-normal">
                <span>ที่อยู่:</span>
                <span className="truncate max-w-[120px]">99/9 ถ.สุขุมวิท...</span>
              </div>
              
              <div className="text-[10px] text-slate-300 leading-none py-1">
                --------------------------------
              </div>
              
              <div className="font-bold text-slate-900 text-xs text-left">
                <div className="flex justify-between">
                  <span>ข้าวมันไก่ผสมอกไก่ (มื้อที่ 1)</span>
                  <span>1 กล่อง</span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal italic pl-2">
                  (Cal:550 P:42.0 C:45.0 F:12.0)
                </div>
              </div>
              <div className="flex justify-between font-bold text-indigo-600 text-xs">
                <span>*สระวรรณยุกต์:</span>
                <span>ต่อสำเร็จ!</span>
              </div>

              <div className="text-[10px] text-slate-300 leading-none py-1">
                --------------------------------
              </div>

              <div className="flex justify-between text-slate-900 font-black text-xs">
                <span>พลังงานรวมทั้งหมด:</span>
                <span>550 KCAL</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[10px] font-normal">
                <span>สารอาหารรวม:</span>
                <span>P:42.0g  C:45.0g  F:12.0g</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-300 font-bold leading-none mt-2 mb-1.5">
              --------------------------------
            </div>
            <div className="text-[9px] font-black text-purple-600 bg-purple-50 rounded-xl py-1 mt-1 border border-purple-100/50 inline-block px-3">
              ฟอนต์ปัจจุบัน: {thaiFont}
            </div>
          </div>

          {/* Zigzag Cut Paper Bottom Effect */}
          <div className="absolute bottom-0 left-0 right-0 h-3 bg-white overflow-hidden flex z-10">
            {Array.from({ length: 20 }).map((_, idx) => (
              <div 
                key={idx} 
                className="w-4 h-4 bg-[#F8FAFC] border-t border-r border-slate-200 transform rotate-45 -translate-y-2 flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
