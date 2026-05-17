import React from 'react';
import { Power } from 'lucide-react';
import { motion } from 'framer-motion';

interface GeneralSettingsProps {
  isKitchenOpen: boolean;
  handleToggleKitchen: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  isKitchenOpen,
  handleToggleKitchen,
}) => {
  return (
    <motion.div 
      key="general"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 animate-fadeIn"
    >
      <section>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">สถานะการดำเนินงาน</h3>
        <div className={`p-6 rounded-[2rem] border transition-all duration-500 flex items-center justify-between
          ${isKitchenOpen ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}
        `}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm
              ${isKitchenOpen ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}
            `}>
              <Power size={24} />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-800">{isKitchenOpen ? 'ห้องครัวกำลังเปิดทำการ' : 'ห้องครัวปิดทำการ'}</h4>
              <p className="text-xs text-slate-500">{isKitchenOpen ? 'ระบบกำลังรับออเดอร์ตามปกติ' : 'ออเดอร์ใหม่จะไม่ถูกส่งเข้าสู่ระบบชั่วคราว'}</p>
            </div>
          </div>
          <button 
            onClick={handleToggleKitchen}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md active:scale-95
              ${isKitchenOpen ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'}
            `}
          >
            {isKitchenOpen ? 'ปิดห้องครัว' : 'เปิดห้องครัว'}
          </button>
        </div>
      </section>

      <section className="pt-8 border-t border-slate-50">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">ข้อมูลร้านค้า</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">ชื่อร้าน (แสดงในใบเสร็จ)</label>
            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all" defaultValue="Clean Food Kitchen" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:bg-white focus:border-emerald-500 transition-all" defaultValue="098-XXX-XXXX" />
          </div>
        </div>
      </section>
    </motion.div>
  );
};
