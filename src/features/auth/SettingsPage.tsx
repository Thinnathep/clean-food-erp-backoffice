import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Truck, 
  Store, 
  Save, 
  Plus, 
  Trash2, 
  RefreshCw,
  Power,
  ChevronRight,
  DollarSign,
  Clock,
  Bell
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useSystemStore } from '../../store/systemStore';

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

interface ShippingDiscount {
  id: string;
  min_order: number;
  discount_amount: number;
  label: string;
  is_active: boolean;
}

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'logistics' | 'discounts' | 'kds'>('general');
  const { isKitchenOpen, setKitchenStatus, loadSystemSettings } = useSystemStore();
  const [logisticsConfig, setLogisticsConfig] = useState<LogisticsConfig | null>(null);
  const [discounts, setDiscounts] = useState<ShippingDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSystemSettings();
  }, [loadSystemSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // 1. Load Logistics Config
      const { data: logData } = await supabase
        .from('erp_settings')
        .select('value')
        .eq('key', 'logistics_config')
        .single();
      if (logData) setLogisticsConfig(logData.value);

      // 2. Load Discounts
      const { data: discData } = await supabase
        .from('erp_shipping_discounts')
        .select('*')
        .order('min_order', { ascending: true });
      if (discData) setDiscounts(discData);

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLogistics = async () => {
    if (!logisticsConfig) return;
    try {
      const { error } = await supabase
        .from('erp_settings')
        .upsert({ key: 'logistics_config', value: logisticsConfig, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('บันทึกการตั้งค่าจัดส่งเรียบร้อย');
    } catch (error) {
      toast.error('บันทึกไม่สำเร็จ');
    }
  };

  const handleToggleKitchen = async () => {
    const newState = !isKitchenOpen;
    await setKitchenStatus(newState);
    toast.success(newState ? 'เปิดระบบรับออเดอร์แล้ว' : 'ปิดระบบรับออเดอร์แล้ว');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] font-prompt">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-normal text-slate-800 uppercase tracking-tight">ตั้งค่าระบบ</h1>
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">System Configuration & Preferences</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-4 md:p-8 gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 space-y-2 shrink-0">
          {[
            { id: 'general', label: 'ทั่วไป & ร้านค้า', icon: Store },
            { id: 'logistics', label: 'การจัดส่ง', icon: Truck },
            { id: 'discounts', label: 'ส่วนลดค่าส่ง', icon: DollarSign },
            { id: 'kds', label: 'ระบบครัว (KDS)', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-normal text-sm
                ${activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'}
              `}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
              {activeTab === tab.id && <ChevronRight size={14} className="ml-auto opacity-50" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <motion.div 
                  key="general"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
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
              )}

              {activeTab === 'logistics' && (
                <motion.div 
                  key="logistics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
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
              )}

              {activeTab === 'discounts' && (
                <motion.div 
                  key="discounts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">โปรโมชั่นส่วนลดค่าส่ง (Tiered)</h3>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[11px] font-bold hover:bg-slate-800 transition-all">
                      <Plus size={14} /> เพิ่มโปรโมชั่น
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-[2rem] border border-slate-100">
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
              )}

              {activeTab === 'kds' && (
                <motion.div 
                  key="kds"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">การตั้งค่าระบบครัว (KDS)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm">
                            <Clock size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">ช่วงเวลาอัปเดตข้อมูล</h4>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Auto-Refresh Interval</p>
                          </div>
                        </div>
                        <select 
                          value={useSystemStore.getState().autoRefreshInterval}
                          onChange={(e) => useSystemStore.getState().updateSystemConfig({ autoRefreshInterval: Number(e.target.value) })}
                          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500"
                        >
                          <option value={15}>15 วินาที</option>
                          <option value={30}>30 วินาที</option>
                          <option value={60}>1 นาที</option>
                          <option value={300}>5 นาที</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 shadow-sm">
                            <Bell size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">เสียงแจ้งเตือนออเดอร์</h4>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Order Notifications</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => useSystemStore.getState().updateSystemConfig({ notificationSoundEnabled: !useSystemStore.getState().notificationSoundEnabled })}
                          className={`w-12 h-6 rounded-full transition-all relative ${useSystemStore.getState().notificationSoundEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useSystemStore.getState().notificationSoundEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">การเปลี่ยนแปลงบางอย่างจะมีผลทันทีต่อระบบหน้าบ้าน</p>
            <button onClick={loadSettings} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-all uppercase tracking-widest">
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} /> รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
