import React from 'react';
import { Clock, Bell, BellOff } from 'lucide-react';

interface KdsBoardSettingsCardProps {
  autoRefreshInterval: number;
  notificationSoundEnabled: boolean;
  updateSystemConfig: (config: any) => Promise<void>;
}

export const KdsBoardSettingsCard: React.FC<KdsBoardSettingsCardProps> = ({
  autoRefreshInterval,
  notificationSoundEnabled,
  updateSystemConfig,
}) => {
  const options = [
    { value: 15, label: '15 วิ' },
    { value: 30, label: '30 วิ' },
    { value: 60, label: '1 นาที' },
    { value: 300, label: '5 นาที' },
  ];

  return (
    <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-6">
      {/* Card Header */}
      <div className="border-b border-slate-100 pb-4">
        <h4 className="text-sm font-bold text-slate-800">แผงควบคุมจอแสดงผล KDS</h4>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold pt-0.5">KDS Screen Settings</p>
      </div>

      {/* 1. Auto Refresh Segment */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
            <Clock size={16} />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-700">ดึงออเดอร์อัตโนมัติ</span>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Auto Refresh Rate</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-1 rounded-xl">
          {options.map((opt) => {
            const isActive = autoRefreshInterval === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateSystemConfig({ autoRefreshInterval: opt.value })}
                className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
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
      </div>

      {/* 2. Notification Sound Toggle */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm transition-all ${
              notificationSoundEnabled ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-400'
            }`}>
              {notificationSoundEnabled ? <Bell size={16} className="animate-wiggle" /> : <BellOff size={16} />}
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-700">เสียงสัญญาณเตือน</span>
              <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Alert Notification Sound</span>
            </div>
          </div>
          
          <button 
            onClick={() => updateSystemConfig({ notificationSoundEnabled: !notificationSoundEnabled })}
            className={`w-12 h-6 rounded-full transition-all relative outline-none flex items-center p-0.5 cursor-pointer ${
              notificationSoundEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm transform ${
              notificationSoundEnabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className={`px-3 py-2 rounded-xl border text-[10px] font-bold flex items-center justify-center transition-all ${
          notificationSoundEnabled 
            ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
            : 'bg-slate-50 border-slate-100 text-slate-400'
        }`}>
          <span>{notificationSoundEnabled ? '🔊 มีเสียงแจ้งเตือนทุกครั้งที่มีคิวใหม่' : '🔇 ปิดเสียงสัญญาณชั่วคราว'}</span>
        </div>
      </div>
    </div>
  );
};
