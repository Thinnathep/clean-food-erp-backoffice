import React from 'react';
import { Bell, BellOff } from 'lucide-react';

interface SoundNotificationCardProps {
  notificationSoundEnabled: boolean;
  updateSystemConfig: (config: any) => Promise<void>;
}

export const SoundNotificationCard: React.FC<SoundNotificationCardProps> = ({
  notificationSoundEnabled,
  updateSystemConfig,
}) => {
  return (
    <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
            notificationSoundEnabled ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-400'
          }`}>
            {notificationSoundEnabled ? <Bell size={20} className="animate-wiggle" /> : <BellOff size={20} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">เสียงแจ้งเตือนออเดอร์</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Order Notifications</p>
          </div>
        </div>
        
        <button 
          onClick={() => updateSystemConfig({ notificationSoundEnabled: !notificationSoundEnabled })}
          className={`w-14 h-7 rounded-full transition-all relative outline-none flex items-center p-1 cursor-pointer ${
            notificationSoundEnabled ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm transform ${
            notificationSoundEnabled ? 'translate-x-7' : 'translate-x-0'
          }`} />
        </button>
      </div>

      <div className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all ${
        notificationSoundEnabled 
          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
          : 'bg-slate-50 border-slate-100 text-slate-400'
      }`}>
        <span>สถานะ: {notificationSoundEnabled ? '📢 เปิดเสียงเมื่อมีสั่งอาหารเข้า' : '🔇 ปิดเสียงแจ้งเตือนชั่วคราว'}</span>
      </div>
      <p className="text-[10px] text-slate-400 leading-normal ml-1">
        *เมื่อเปิดไว้ ระบบจะเล่นเสียงสัญญาณเตือนทุกครั้งที่มีออเดอร์ใหม่ส่งเข้าบอร์ดเตรียมอาหารในครัว
      </p>
    </div>
  );
};
