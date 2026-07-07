import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Truck, 
  Store, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

import { useSystemStore } from '../../store/systemStore';
import { GeneralSettings } from './settings/GeneralSettings';
import { KitchenSettings } from './settings/KitchenSettings';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'kds'>(() => {
    return (localStorage.getItem('kds_settings_active_tab') || 'general') as any;
  });

  const handleTabChange = (tab: 'general' | 'kds') => {
    setActiveTab(tab);
    localStorage.setItem('kds_settings_active_tab', tab);
  };
  const { 
    isKitchenOpen, 
    setKitchenStatus, 
    loadSystemSettings,
    notificationSoundEnabled,
    autoRefreshInterval,
    printerEnabled,
    updateSystemConfig,
    bluetoothDevice,
    isConnectingBluetooth,
    connectBluetooth,
    disconnectBluetooth,
    printTestPage,
    serialPort,
    isConnectingSerial,
    connectSerial,
    disconnectSerial,
    thaiFont,
    setThaiFont
  } = useSystemStore();

  useEffect(() => {
    loadSystemSettings();
  }, [loadSystemSettings]);

  const handleToggleKitchen = async () => {
    const newState = !isKitchenOpen;
    await setKitchenStatus(newState);
    toast.success(newState ? 'เปิดระบบรับออเดอร์แล้ว' : 'ปิดระบบรับออเดอร์แล้ว');
  };

  const handleConnectBluetooth = async () => {
    try {
      await connectBluetooth();
      toast.success('เชื่อมต่อเครื่องพิมพ์บลูทูธสำเร็จ 🖨️');
    } catch (err: any) {
      toast.error(err.message || 'เชื่อมต่อบลูทูธไม่สำเร็จ');
    }
  };

  const handleConnectSerial = async () => {
    try {
      await connectSerial();
      toast.success('เชื่อมต่อเครื่องพิมพ์ผ่านสาย USB/Serial สำเร็จ 🖨️');
    } catch (err: any) {
      toast.error(err.message || 'เชื่อมต่อผ่านสาย USB/Serial ไม่สำเร็จ');
    }
  };

  const handleTestPrint = async () => {
    try {
      await printTestPage();
      toast.success('ส่งข้อมูลพิมพ์ทดสอบเรียบร้อย 📃');
    } catch (err: any) {
      toast.error(err.message || 'พิมพ์ทดสอบไม่สำเร็จ');
    }
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

      {/* Tab Selector */}
      <div className="px-4 md:px-8 pt-6 shrink-0">
        <div className="bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/50 flex flex-wrap gap-1 relative w-full overflow-hidden max-w-fit">
          {[
            { id: 'general', label: 'ทั่วไป & ร้านค้า', icon: Store },
            { id: 'kds', label: 'ระบบครัว (KDS)', icon: Clock },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`relative px-5 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer select-none outline-none ${
                  isActive ? 'text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {/* Active Backdrop Capsule */}
                {isActive && (
                  <motion.div
                    layoutId="settingsActiveTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/40 z-0"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon size={14} className={isActive ? 'text-slate-900' : 'text-slate-400'} />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col">
        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
            <AnimatePresence mode="wait">
              {activeTab === 'general' && (
                <div className="space-y-8">
                  <GeneralSettings 
                    isKitchenOpen={isKitchenOpen} 
                    handleToggleKitchen={handleToggleKitchen} 
                  />
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">ตั้งค่าระบบจัดส่ง (ใหม่)</h3>
                      <p className="text-xs text-slate-500">จัดการข้อมูลรถ, ค่าน้ำมัน, และค่าจัดส่งแบบรวมศูนย์</p>
                    </div>
                    <a href="/logistics/delivery-settings" className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2">
                      <Truck size={14} /> ไปหน้าตั้งค่าจัดส่ง
                    </a>
                  </div>
                </div>
              )}

              {activeTab === 'kds' && (
                <KitchenSettings 
                  autoRefreshInterval={autoRefreshInterval}
                  notificationSoundEnabled={notificationSoundEnabled}
                  printerEnabled={printerEnabled}
                  updateSystemConfig={updateSystemConfig}
                  thaiFont={thaiFont}
                  setThaiFont={setThaiFont}
                  bluetoothDevice={bluetoothDevice}
                  isConnectingBluetooth={isConnectingBluetooth}
                  handleConnectBluetooth={handleConnectBluetooth}
                  disconnectBluetooth={disconnectBluetooth}
                  serialPort={serialPort}
                  isConnectingSerial={isConnectingSerial}
                  handleConnectSerial={handleConnectSerial}
                  disconnectSerial={disconnectSerial}
                  handleTestPrint={handleTestPrint}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">การเปลี่ยนแปลงบางอย่างจะมีผลทันทีต่อระบบหน้าบ้าน</p>
            <button onClick={() => loadSystemSettings()} className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-slate-800 transition-all uppercase tracking-widest">
              <RefreshCw size={12} /> รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
