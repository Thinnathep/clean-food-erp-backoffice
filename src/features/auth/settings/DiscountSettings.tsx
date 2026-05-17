import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ShippingDiscount {
  id: string;
  min_order: number;
  discount_amount: number;
  label: string;
  is_active: boolean;
}

interface DiscountSettingsProps {
  discounts: ShippingDiscount[];
}

export const DiscountSettings: React.FC<DiscountSettingsProps> = ({
  discounts,
}) => {
  return (
    <motion.div 
      key="discounts"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 animate-fadeIn"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">โปรโมชั่นส่วนลดค่าส่ง (Tiered)</h3>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800 transition-all">
          <Plus size={14} /> เพิ่มโปรโมชั่น
        </button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">ชื่อโปรโมชั่น</th>
              <th className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">ยอดสั่งซื้อขั้นต่ำ</th>
              <th className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">ส่วนลดค่าส่ง</th>
              <th className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">สถานะ</th>
              <th className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest font-bold">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {discounts.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-700">{d.label}</td>
                <td className="px-6 py-4 text-sm font-black text-slate-900">฿{d.min_order}</td>
                <td className="px-6 py-4 text-sm font-black text-emerald-600">฿{d.discount_amount}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${d.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {d.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
