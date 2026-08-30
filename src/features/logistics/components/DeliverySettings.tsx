import React, { useState, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { refreshFuelPrices, getFuelPrices } from '../services/fuelPriceService';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, 
  Droplet, 
  Package, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2,
  CheckCircle,
  Truck,
  Calendar
} from 'lucide-react';
import { DeliveryScheduleCard } from '../../auth/settings/components/DeliveryScheduleCard';

interface Vehicle {
  id: string;
  name: string;
  vehicle_type: string;
  license_plate: string;
  fuel_type: string;
  fuel_efficiency: number;
  purchase_price: number;
  expected_lifespan_km: number;
  depreciation_per_km: number;
  maintenance_per_km: number;
  insurance_annual: number;
  estimated_trips_per_year: number;
  is_active: boolean;
  is_default: boolean;
}

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

export const DeliverySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'vehicles' | 'fuel' | 'shipping'>('schedule');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelPrices, setFuelPrices] = useState<Record<string, number>>({});
  const [logisticsConfig, setLogisticsConfig] = useState<LogisticsConfig | null>(null);
  const [discounts, setDiscounts] = useState<ShippingDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states for Vehicle and Discount
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Partial<ShippingDiscount> | null>(null);
  const [discountToDelete, setDiscountToDelete] = useState<ShippingDiscount | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load Vehicles
      const { data: vData } = await supabase.from('erp_vehicles').select('*').order('created_at');
      if (vData) setVehicles(vData);

      // Load Fuel Prices
      const prices = await getFuelPrices();
      setFuelPrices(prices);

      // Load Logistics Config
      const { data: logData } = await supabase.from('erp_settings').select('value').eq('key', 'logistics_config').single();
      if (logData) setLogisticsConfig(logData.value);

      // Load Discounts
      const { data: discData } = await supabase.from('erp_shipping_discounts').select('*').order('min_order');
      if (discData) setDiscounts(discData);

    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateFuelPrices = async () => {
    setIsLoading(true);
    try {
      const fresh = await refreshFuelPrices();
      setFuelPrices(fresh);
      toast.success('อัปเดตราคาน้ำมันล่าสุดแล้ว');
    } catch (error) {
      toast.error('ไม่สามารถอัปเดตราคาน้ำมันได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!editingVehicle?.name) return toast.error('กรุณาระบุชื่อรถ');
    
    setIsLoading(true);
    try {
      const isNew = !editingVehicle.id;
      
      if (editingVehicle.is_default) {
        const { error } = await supabase.from('erp_vehicles').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) throw error;
      }

      // Remove generated and read-only columns from payload
      const { 
        id, 
        depreciation_per_km, 
        ...restOfVehicle 
      } = editingVehicle as any;

      const payload = {
        ...restOfVehicle,
        updated_at: new Date().toISOString()
      };

      let opError;
      if (isNew) {
        const { error } = await supabase.from('erp_vehicles').insert(payload);
        opError = error;
      } else {
        const { error } = await supabase.from('erp_vehicles').update(payload).eq('id', editingVehicle.id);
        opError = error;
      }
      
      if (opError) throw opError;

      toast.success('บันทึกข้อมูลรถสำเร็จ');
      setShowVehicleModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('บันทึกข้อมูลไม่สำเร็จ: ' + (err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      const { error } = await supabase.from('erp_vehicles').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบข้อมูลรถสำเร็จ');
      setVehicleToDelete(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('ลบข้อมูลไม่สำเร็จ: ' + (err?.message || ''));
    }
  };

  const handleSaveDiscount = async () => {
    if (!editingDiscount?.label || editingDiscount.min_order === undefined || editingDiscount.discount_amount === undefined) {
      return toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
    }
    
    setIsLoading(true);
    try {
      const isNew = !editingDiscount.id;
      const payload = {
        id: isNew ? crypto.randomUUID() : editingDiscount.id,
        label: editingDiscount.label,
        min_order: editingDiscount.min_order,
        discount_amount: editingDiscount.discount_amount,
        is_active: editingDiscount.is_active !== false,
      };

      let opError;
      if (isNew) {
        const { error } = await supabase.from('erp_shipping_discounts').insert(payload);
        opError = error;
      } else {
        const { error } = await supabase.from('erp_shipping_discounts').update(payload).eq('id', payload.id);
        opError = error;
      }
      
      if (opError) throw opError;

      toast.success('บันทึกโปรโมชั่นสำเร็จ');
      setShowDiscountModal(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('บันทึกข้อมูลไม่สำเร็จ: ' + (err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    try {
      const { error } = await supabase.from('erp_shipping_discounts').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบโปรโมชั่นสำเร็จ');
      setDiscountToDelete(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error('ลบไม่สำเร็จ: ' + (err?.message || ''));
    }
  };

  const handleSaveLogisticsConfig = async () => {
    if (!logisticsConfig) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from('erp_settings').upsert({
        key: 'logistics_config',
        value: logisticsConfig,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success('บันทึกการตั้งค่าจัดส่งสำเร็จ');
    } catch (err: any) {
      console.error(err);
      toast.error('บันทึกไม่สำเร็จ: ' + (err?.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] font-prompt overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-normal text-slate-800 uppercase tracking-tight">ตั้งค่าระบบจัดส่ง</h1>
            <p className="text-[10px] font-normal text-slate-400 uppercase tracking-widest">Delivery & Logistics Configuration</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 pt-6">
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/50 flex gap-1 w-fit shadow-sm">
          {[
            { id: 'schedule', label: 'รอบวันจัดส่งหลัก', icon: Calendar },
            { id: 'vehicles', label: 'รถจัดส่ง', icon: Car },
            { id: 'fuel', label: 'ราคาน้ำมัน', icon: Droplet },
            { id: 'shipping', label: 'ค่าจัดส่ง', icon: Package },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-6xl w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <DeliveryScheduleCard />
            </motion.div>
          )}

          {activeTab === 'vehicles' && (
            <motion.div
              key="vehicles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">ข้อมูลรถที่ใช้จัดส่ง</h2>
                <button 
                  onClick={() => {
                    setEditingVehicle({ vehicle_type: 'motorcycle', fuel_type: 'gasohol95', fuel_efficiency: 48, maintenance_per_km: 0.5 });
                    setShowVehicleModal(true);
                  }}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <Plus size={16} /> เพิ่มรถคันใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicles.map(v => (
                  <div key={v.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                    {v.is_default && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-widest uppercase flex items-center gap-1">
                        <CheckCircle size={10} /> รถเริ่มต้น
                      </div>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100">
                          <Car size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{v.name}</h3>
                          <p className="text-xs text-slate-500">ทะเบียน: {v.license_plate || '-'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setEditingVehicle(v); setShowVehicleModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          แก้ไข
                        </button>
                        <button 
                          onClick={() => setVehicleToDelete(v)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2 bg-slate-50 p-4 rounded-xl">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">อัตราสิ้นเปลือง</p>
                        <p className="text-sm font-bold text-slate-700">{v.fuel_efficiency} กม./ลิตร</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">ค่าบำรุงรักษา</p>
                        <p className="text-sm font-bold text-slate-700">{v.maintenance_per_km} ฿/กม.</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">น้ำมันที่ใช้</p>
                        <p className="text-sm font-bold text-slate-700 uppercase">{v.fuel_type}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">ค่าเสื่อมโดยประมาณ</p>
                        <p className="text-sm font-bold text-amber-600">{Number(v.depreciation_per_km).toFixed(2)} ฿/กม.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'fuel' && (
            <motion.div
              key="fuel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">ราคาน้ำมันอ้างอิง</h2>
                  <p className="text-xs text-slate-500">ดึงข้อมูลอัตโนมัติจาก API บางจาก (อัปเดตสัปดาห์ละ 1 ครั้ง)</p>
                </div>
                <button 
                  onClick={handleUpdateFuelPrices}
                  disabled={isLoading}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> อัปเดตราคาน้ำมันล่าสุด
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(fuelPrices).map(([type, price]) => (
                  <div key={type} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                    <Droplet size={24} className="text-rose-500 mb-2" />
                    <h4 className="text-sm font-bold text-slate-600 uppercase">{type}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-800">{price.toFixed(2)}</span>
                      <span className="text-xs text-slate-400 font-bold">฿/L</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              {/* Core Logistics Settings */}
              {logisticsConfig && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">ตั้งค่าพื้นฐานการจัดส่ง</h2>
                    <button 
                      onClick={handleSaveLogisticsConfig}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                    >
                      <Save size={16} /> บันทึกค่าพื้นฐาน
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-4 rounded-2xl bg-slate-50">
                       <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2">ค่าส่งเริ่มต้น (Base Fare)</label>
                       <div className="flex items-center gap-2">
                         <span className="text-slate-400 font-bold text-lg">฿</span>
                         <input type="number" value={logisticsConfig.base_fare} onChange={e => setLogisticsConfig({...logisticsConfig, base_fare: Number(e.target.value)})} className="bg-transparent text-lg font-bold text-slate-800 outline-none w-full" />
                       </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50">
                       <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2">ระยะทางเริ่มต้น (กม.)</label>
                       <div className="flex items-center gap-2">
                         <Truck size={16} className="text-slate-400"/>
                         <input type="number" value={logisticsConfig.base_included_distance} onChange={e => setLogisticsConfig({...logisticsConfig, base_included_distance: Number(e.target.value)})} className="bg-transparent text-lg font-bold text-slate-800 outline-none w-full" />
                       </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50">
                       <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2">ค่าส่งต่อ กม. (ปกติ)</label>
                       <div className="flex items-center gap-2">
                         <span className="text-slate-400 font-bold text-lg">฿</span>
                         <input type="number" value={logisticsConfig.fee_per_km_normal} onChange={e => setLogisticsConfig({...logisticsConfig, fee_per_km_normal: Number(e.target.value)})} className="bg-transparent text-lg font-bold text-slate-800 outline-none w-full" />
                       </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50">
                       <label className="block text-[10px] text-slate-400 uppercase tracking-widest mb-2">ส่งฟรี ยอดสั่งขั้นต่ำ</label>
                       <div className="flex items-center gap-2">
                         <span className="text-slate-400 font-bold text-lg">฿</span>
                         <input type="number" value={logisticsConfig.free_delivery_min_order} onChange={e => setLogisticsConfig({...logisticsConfig, free_delivery_min_order: Number(e.target.value)})} className="bg-transparent text-lg font-bold text-slate-800 outline-none w-full" />
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Discount Settings */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-slate-800">โปรโมชั่นส่วนลดค่าส่ง (Tiered)</h2>
                  <button 
                    onClick={() => { setEditingDiscount({ is_active: true }); setShowDiscountModal(true); }}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    <Plus size={16} /> เพิ่มโปรโมชั่น
                  </button>
                </div>
                
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest">ชื่อโปรโมชั่น</th>
                      <th className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest">ยอดขั้นต่ำ (฿)</th>
                      <th className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest">ส่วนลดค่าส่ง (฿)</th>
                      <th className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest">สถานะ</th>
                      <th className="px-4 py-3 text-[10px] text-slate-500 uppercase tracking-widest">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {discounts.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 text-sm font-bold text-slate-800">{d.label}</td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-600">{d.min_order}</td>
                        <td className="px-4 py-4 text-sm font-bold text-emerald-600">{d.discount_amount}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {d.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                          </span>
                        </td>
                        <td className="px-4 py-4 flex gap-2">
                          <button onClick={() => { setEditingDiscount(d); setShowDiscountModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">แก้ไข</button>
                          <button onClick={() => setDiscountToDelete(d)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showVehicleModal && editingVehicle && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowVehicleModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <Trash2 size={16} className="opacity-0 hidden" /> 
                <span className="font-bold text-lg leading-none block w-4 h-4 text-center">&times;</span>
              </button>
              
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Car size={24} className="text-slate-400" />
                {editingVehicle.id ? 'แก้ไขข้อมูลรถ' : 'เพิ่มรถคันใหม่'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อรถ (รุ่น)</label>
                  <input type="text" value={editingVehicle.name || ''} onChange={e => setEditingVehicle({...editingVehicle, name: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-slate-400" placeholder="เช่น Grand Filano Hybrid" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ทะเบียนรถ</label>
                    <input type="text" value={editingVehicle.license_plate || ''} onChange={e => setEditingVehicle({...editingVehicle, license_plate: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">น้ำมันที่ใช้</label>
                    <select value={editingVehicle.fuel_type || 'gasohol95'} onChange={e => setEditingVehicle({...editingVehicle, fuel_type: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none bg-white">
                      <option value="gasohol91">Gasohol 91</option>
                      <option value="gasohol95">Gasohol 95</option>
                      <option value="diesel">Diesel</option>
                      <option value="e20">E20</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">อัตราสิ้นเปลือง (กม./ลิตร)</label>
                    <input type="number" value={editingVehicle.fuel_efficiency || 0} onChange={e => setEditingVehicle({...editingVehicle, fuel_efficiency: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ราคาซื้อ (฿)</label>
                    <input type="number" value={editingVehicle.purchase_price || 0} onChange={e => setEditingVehicle({...editingVehicle, purchase_price: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ค่าบำรุงรักษาเฉลี่ย (฿/กม.)</label>
                    <input type="number" step="0.1" value={editingVehicle.maintenance_per_km || 0} onChange={e => setEditingVehicle({...editingVehicle, maintenance_per_km: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ค่าประกันรายปี (฿)</label>
                    <input type="number" value={editingVehicle.insurance_annual || 0} onChange={e => setEditingVehicle({...editingVehicle, insurance_annual: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <input type="checkbox" id="is_default" checked={editingVehicle.is_default || false} onChange={e => setEditingVehicle({...editingVehicle, is_default: e.target.checked})} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" />
                  <label htmlFor="is_default" className="text-sm font-bold text-slate-700 cursor-pointer select-none">ตั้งเป็นรถหลัก (Default Vehicle)</label>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowVehicleModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button onClick={handleSaveVehicle} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                  <Save size={18} /> บันทึก
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showDiscountModal && editingDiscount && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowDiscountModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <span className="font-bold text-lg leading-none block w-4 h-4 text-center">&times;</span>
              </button>

              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Package size={24} className="text-slate-400" />
                {editingDiscount.id ? 'แก้ไขโปรโมชั่น' : 'เพิ่มโปรโมชั่นส่วนลด'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อโปรโมชั่น</label>
                  <input type="text" value={editingDiscount.label || ''} onChange={e => setEditingDiscount({...editingDiscount, label: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:border-slate-400" placeholder="เช่น โปรพิเศษสั่งเยอะส่งฟรี" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ยอดสั่งซื้อขั้นต่ำ (฿)</label>
                  <input type="number" value={editingDiscount.min_order || 0} onChange={e => setEditingDiscount({...editingDiscount, min_order: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ส่วนลดค่าส่ง (฿)</label>
                  <input type="number" value={editingDiscount.discount_amount || 0} onChange={e => setEditingDiscount({...editingDiscount, discount_amount: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <input type="checkbox" id="is_active" checked={editingDiscount.is_active !== false} onChange={e => setEditingDiscount({...editingDiscount, is_active: e.target.checked})} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" />
                  <label htmlFor="is_active" className="text-sm font-bold text-slate-700 cursor-pointer select-none">เปิดใช้งานทันที</label>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setShowDiscountModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button onClick={handleSaveDiscount} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 transition-colors">
                  <Save size={18} /> บันทึก
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modals */}
        {vehicleToDelete && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">ลบรถคันนี้?</h3>
              <p className="text-sm text-slate-500 mb-8">
                คุณแน่ใจหรือไม่ว่าต้องการลบรถ <strong>{vehicleToDelete.name}</strong> ({vehicleToDelete.license_plate})? <br/>การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
              <div className="flex gap-4">
                <button onClick={() => setVehicleToDelete(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button onClick={() => handleDeleteVehicle(vehicleToDelete.id)} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-500/20">ลบทันที</button>
              </div>
            </motion.div>
          </div>
        )}

        {discountToDelete && (
          <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">ลบโปรโมชั่นนี้?</h3>
              <p className="text-sm text-slate-500 mb-8">
                คุณแน่ใจหรือไม่ว่าต้องการลบโปรโมชั่น <strong>{discountToDelete.label}</strong>? <br/>การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
              <div className="flex gap-4">
                <button onClick={() => setDiscountToDelete(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">ยกเลิก</button>
                <button onClick={() => handleDeleteDiscount(discountToDelete.id)} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-rose-500/20">ลบทันที</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
