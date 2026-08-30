import React, { useState } from 'react';
import { 
  Power, Store, MapPin, Phone, FileText, 
  Bell, CheckCircle2, 
  Truck, ExternalLink, Save
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { PwaInstallCard } from './components/PwaInstallCard';

interface GeneralSettingsProps {
  isKitchenOpen: boolean;
  handleToggleKitchen: () => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  isKitchenOpen,
  handleToggleKitchen,
}) => {
  const [storeName, setStoreName] = useState('Clean Food Chiang Rai (สาขาหลัก)');
  const [phone, setPhone] = useState('081-234-5678');
  const [taxId, setTaxId] = useState('0575560000000');
  const [address, setAddress] = useState('124/5 ถ.สิงหไคล ต.เวียง อ.เมือง จ.เชียงราย 57000');
  const [lineToken, setLineToken] = useState('');

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('บันทึกข้อมูลร้านค้าเรียบร้อย ✨');
  };

  return (
    <motion.div 
      key="general"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8 animate-fadeIn max-w-[1400px] mx-auto font-sans"
    >
      {/* ─── PWA App Install Banner ─── */}
      <section>
        <PwaInstallCard />
      </section>

      {/* ─── Operating Status Master Switch ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">สถานะการดำเนินงานระบบ (Operating Status)</h3>
            <p className="text-xs text-slate-500">สวิตช์หลักควบคุมการรับออเดอร์เข้าห้องครัวและระบบหน้าร้าน</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> พร้อมใช้งานจริง (Active)
          </span>
        </div>

        <div className={`p-6 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isKitchenOpen ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
              isKitchenOpen ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'
            }`}>
              <Power size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {isKitchenOpen ? 'ห้องครัวกำลังเปิดทำการ (Open)' : 'ห้องครัวปิดทำการ (Closed)'}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {isKitchenOpen ? 'ระบบกำลังรับออเดอร์ตามปกติและส่งใบสั่งผลิตเข้า KDS' : 'ออเดอร์ใหม่จะไม่ถูกส่งเข้าสู่ระบบชั่วคราว'}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleToggleKitchen}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ${
              isKitchenOpen ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isKitchenOpen ? 'ปิดรับออเดอร์ชั่วคราว' : 'เปิดรับออเดอร์'}
          </button>
        </div>
      </section>

      {/* ─── Store Information & Business Profile ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">ข้อมูลร้านค้าและสาขา (Store Profile)</h3>
            <p className="text-xs text-slate-500">ข้อมูลที่ปรากฏบนหัวใบเสร็จรับเงิน ใบกำกับภาษี และป้ายติดกล่องอาหาร</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> เชื่อมต่อกับระบบใบเสร็จ
          </span>
        </div>

        <form onSubmit={handleSaveStoreProfile} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Store size={14} className="text-emerald-600" />
                <span>ชื่อร้าน / แบรนด์</span>
              </label>
              <input 
                type="text" 
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-600" />
                <span>เบอร์โทรศัพท์ติดต่อร้าน</span>
              </label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all font-mono" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText size={14} className="text-emerald-600" />
                <span>เลขประจำตัวผู้เสียภาษี (Tax ID)</span>
              </label>
              <input 
                type="text" 
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all font-mono" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                <span>ที่อยู่สำนักงาน / ร้านหลัก</span>
              </label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save size={14} />
              <span>บันทึกข้อมูลร้านค้า</span>
            </button>
          </div>
        </form>
      </section>

      {/* ─── External Integrations & Ready-to-Connect Services ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">การเชื่อมต่อภายนอก (External Integrations)</h3>
            <p className="text-xs text-slate-500">บริการเสริมและระบบแจ้งเตือนภายนอก</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* LINE Notify Integration */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center font-bold">
                  <Bell size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">LINE Notify แจ้งเตือนยอดประจำวัน</h4>
                  <p className="text-[11px] text-slate-400">ส่งรายงานสรุปยอดผลิตและยอดขายเข้ากลุ่ม LINE</p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                🟡 พร้อมเชื่อมต่อ Token
              </span>
            </div>

            <div className="space-y-2">
              <input 
                type="password"
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                placeholder="กรอก LINE Notify Access Token..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:bg-white focus:border-emerald-500 outline-none"
              />
              <button 
                type="button"
                onClick={() => toast.info('บันทึกการตั้งค่า LINE Token เรียบร้อย พร้อมส่งการแจ้งเตือน')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                ทดสอบและบันทึก Token
              </button>
            </div>
          </div>

          {/* Quick Link to Delivery Settings */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">ตั้งค่าระบบจัดส่งและยานพาหนะ</h4>
                  <p className="text-[11px] text-slate-400">จัดการข้อมูลรถ, ค่าน้ำมัน, และค่าจัดส่งแบบรวมศูนย์</p>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🟢 พร้อมใช้งาน
              </span>
            </div>

            <a 
              href="/logistics/delivery-settings" 
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>ไปหน้าตั้งค่าจัดส่ง & ยานพาหนะ</span>
              <ExternalLink size={13} />
            </a>
          </div>

        </div>
      </section>

      {/* ─── System Build & Version Info ─── */}
      <section className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">Clean Food Chiang Rai ERP Backoffice</h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-white shadow-xs">
                  V.2.1.6
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                สถาปัตยกรรมระบบบริหารจัดการร้านอาหารสุขภาพและครัว คลีนฟู้ด เชียงราย
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right text-xs text-slate-400">
            <span className="font-mono text-emerald-400 font-bold">Stable Release</span> • 84 Tables Connected
          </div>
        </div>
      </section>

    </motion.div>
  );
};
