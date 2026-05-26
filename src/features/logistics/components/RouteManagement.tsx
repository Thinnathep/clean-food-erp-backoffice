import React from 'react';
import { Map } from 'lucide-react';

export const RouteManagement: React.FC = () => {
  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50/50 min-h-screen font-prompt">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-normal text-slate-800 tracking-tight flex items-center gap-3">
            <Map className="text-blue-500" size={32} />
            จัดการเส้นทาง
          </h1>
          <p className="text-slate-500 mt-2 font-normal">ระบบจัดการและจัดแผนการเดินทางสำหรับไรเดอร์ (กำลังพัฒนา)</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-6">
          <Map size={48} />
        </div>
        <h2 className="text-2xl font-normal text-slate-800 mb-2">หน้านี้อยู่ในระหว่างการพัฒนา</h2>
        <p className="text-slate-500 max-w-md font-normal">
          ระบบจัดการเส้นทางจะพร้อมใช้งานในเร็วๆ นี้ คุณจะสามารถดูแผนที่การจัดส่ง จัดกลุ่มออเดอร์ตามพื้นที่ และคำนวณเส้นทางที่สั้นที่สุดได้ที่นี่
        </p>
      </div>
    </div>
  );
};
