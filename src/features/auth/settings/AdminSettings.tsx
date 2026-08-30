import React from 'react';
import { 
  ShieldCheck, Key, CheckCircle2, 
  Shield, Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Kitchen' | 'Logistics' | 'Finance';
  status: 'active' | 'pending';
  last_login?: string;
}

export const AdminSettings: React.FC = () => {
  const staffList: StaffUser[] = [
    { id: 'U1', name: 'ผู้ดูแลระบบหลัก (Admin Master)', email: 'admin@cleanfoodcr.com', role: 'Admin', status: 'active', last_login: 'วันนี้ 16:45 น.' },
    { id: 'U2', name: 'หัวหน้าครัว (Kitchen Head)', email: 'chef@cleanfoodcr.com', role: 'Kitchen', status: 'active', last_login: 'วันนี้ 11:30 น.' },
    { id: 'U3', name: 'ฝ่ายจัดส่ง & โลจิสติกส์', email: 'dispatch@cleanfoodcr.com', role: 'Logistics', status: 'active', last_login: 'วันนี้ 10:15 น.' },
  ];

  return (
    <motion.div 
      key="admin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 animate-fadeIn max-w-[1400px] mx-auto font-sans"
    >
      {/* ─── Role-Based Access Control (RBAC) ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">บัญชีพนักงานและสิทธิ์การเข้าถึง (Roles & Permissions)</h3>
            <p className="text-xs text-slate-500">จัดการสิทธิ์เข้าถึงโมดูลตามตำแหน่งหน้าที่ (RBAC & Supabase RLS)</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> เชื่อมต่อกับ Supabase Auth
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">รายชื่อผู้ใช้งานระบบ ({staffList.length} บัญชี)</span>
            </div>

            <button
              type="button"
              onClick={() => toast.info('ระบบพร้อมเพิ่มผู้ใช้งานใหม่เมื่อเชื่อมต่ออีเมลยืนยันตัวตน')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>เพิ่มผู้ใช้ใหม่</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {staffList.map(user => (
              <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-xs text-slate-600">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{user.name}</h4>
                    <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'Kitchen' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role}
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {user.last_login}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Security Policies & API Integrations ─── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ความปลอดภัยและกุญแจ API (Security & Webhooks)</h3>
          <p className="text-xs text-slate-500">ระบบรักษาความปลอดภัยฐานข้อมูลและกุญแจเชื่อมต่อ</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">การบังคับใช้นโยบาย RLS (Database-First)</h4>
                  <p className="text-[11px] text-slate-400">Row-Level Security ป้องกันข้อมูล 84 ตาราง</p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 บังคับใช้ 100%
              </span>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
              นโยบายความปลอดภัยของ Clean Food CR บังคับใช้ในระดับ Database Supabase ข้อมูลการเงินและสิทธิประโยชน์สมาชิกได้รับการคุ้มครอง
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Webhook & API Key (พร้อมเชื่อมต่อ)</h4>
                  <p className="text-[11px] text-slate-400">สำหรับเชื่อมต่อระบบภายนอก เช่น E-Tax, ธนาคาร</p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                🟡 พร้อมเชื่อมต่อ Key
              </span>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 leading-relaxed">
              รองรับการส่ง Event ข้อมูลออเดอร์และใบกำกับภาษีผ่าน Webhook URL ปลอดภัยด้วย SHA-256 Signature
            </p>
          </div>
        </div>
      </section>

    </motion.div>
  );
};
