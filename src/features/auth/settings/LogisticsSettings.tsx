import React from 'react';
import { Truck, DollarSign, Save } from 'lucide-react';
import { motion } from 'framer-motion';

interface LogisticsConfig {
  free_delivery_min_order: number;
  free_delivery_max_distance: number;
  base_fare: number;
  base_included_distance: number;
  fee_per_km_normal: number;
  fee_per_km_far: number;
  minimum_order_value: number;
  price_per_box: number;
}

interface LogisticsSettingsProps {
  logisticsConfig: LogisticsConfig | null;
  setLogisticsConfig: React.Dispatch<React.SetStateAction<LogisticsConfig | null>>;
  handleSaveLogistics: () => void;
}

export const LogisticsSettings: React.FC<LogisticsSettingsProps> = ({
  logisticsConfig,
  setLogisticsConfig,
  handleSaveLogistics,
}) => {
  return (
    <motion.div 
      key="logistics"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 animate-fadeIn"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">ตั้งค่าการคำนวณค่าส่ง</h3>
        <button onClick={handleSaveLogistics} className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all">
          <Save size={16} /> บันทึกการเปลี่ยนแปลง
        </button>
      </div>

      {logisticsConfig && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-3xl bg-slate-50 border border-transparent hover:border-emerald-500/20 transition-all group">
             <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-3">ค่าส่งเริ่มต้น (Base Fare)</label>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-500 shadow-sm"><DollarSign size={18}/></div>
               <input 
                type="number" 
                value={logisticsConfig.base_fare} 
                onChange={(e) => setLogisticsConfig({...logisticsConfig, base_fare: Number(e.target.value)})}
                className="flex-1 bg-transparent text-xl font-black text-slate-800 outline-none" 
               />
               <span className="text-xs text-slate-400">บาท</span>
             </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-50 border border-transparent hover:border-emerald-500/20 transition-all group">
             <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-3">ระยะทางเริ่มต้น (กม.)</label>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm"><Truck size={18}/></div>
               <input 
                type="number" 
                value={logisticsConfig.base_included_distance} 
                onChange={(e) => setLogisticsConfig({...logisticsConfig, base_included_distance: Number(e.target.value)})}
                className="flex-1 bg-transparent text-xl font-black text-slate-800 outline-none" 
               />
               <span className="text-xs text-slate-400">กม.</span>
             </div>
          </div>

          <div className="p-5 rounded-3xl bg-slate-50 border border-transparent hover:border-emerald-500/20 transition-all group">
             <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-3">ค่าส่งต่อ กม. (ปกติ)</label>
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm"><DollarSign size={18}/></div>
               <input 
                type="number" 
                value={logisticsConfig.fee_per_km_normal} 
                onChange={(e) => setLogisticsConfig({...logisticsConfig, fee_per_km_normal: Number(e.target.value)})}
                className="flex-1 bg-transparent text-xl font-black text-slate-800 outline-none" 
               />
               <span className="text-xs text-slate-400">บาท</span>
             </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
