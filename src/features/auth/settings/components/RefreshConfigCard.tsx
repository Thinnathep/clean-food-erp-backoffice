import React from 'react';
import { Clock } from 'lucide-react';

interface RefreshConfigCardProps {
  autoRefreshInterval: number;
  updateSystemConfig: (config: any) => Promise<void>;
}

export const RefreshConfigCard: React.FC<RefreshConfigCardProps> = ({
  autoRefreshInterval,
  updateSystemConfig,
}) => {
  const options = [
    { value: 15, label: '15 วิ' },
    { value: 30, label: '30 วิ' },
    { value: 60, label: '1 นาที' },
    { value: 300, label: '5 นาที' },
  ];

  return (
    <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
          <Clock size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800">ช่วงเวลาอัปเดตข้อมูล</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Auto-Refresh Interval</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-1.5 rounded-2xl">
        {options.map((opt) => {
          const isActive = autoRefreshInterval === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => updateSystemConfig({ autoRefreshInterval: opt.value })}
              className={`py-2 text-[11px] font-bold rounded-xl transition-all ${
                isActive 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 leading-normal ml-1">
        *ช่วยควบคุมความถี่ในการดึงออเดอร์ใหม่จากหลังบ้านมาแสดงผลบนบอร์ด KDS อัตโนมัติ
      </p>
    </div>
  );
};
