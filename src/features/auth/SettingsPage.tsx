import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  RefreshCw, 
  Clock, 
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';

import { useSystemStore } from '../../store/systemStore';
import { GeneralSettings } from './settings/GeneralSettings';
import { KitchenSettings } from './settings/KitchenSettings';
import { PwaInstallCard } from './settings/components/PwaInstallCard';
import { AdminSettings } from './settings/AdminSettings';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'kds' | 'app' | 'admin'>(() => {
    return (localStorage.getItem('kds_settings_active_tab') || 'general') as any;
  });

  const handleTabChange = (tab: 'general' | 'kds' | 'app' | 'admin') => {
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
    toast.success(newState ? 'เปิดระบบรับออเดอร์แล้ว ✨' : 'ปิดระบบรับออเดอร์แล้ว');
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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* ─── Top Header Bar ─── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-5 shadow-xs sticky top-0 z-30 backdrop-blur-md bg-white/95">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center shadow-md shadow-slate-900/20 shrink-0">
              <SettingsIcon size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                  ตั้งค่าระบบ & จัดการสิทธิ์
                </h1>
                <span className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Admin & Config
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">จัดการข้อมูลร้านค้า ฮาร์ดแวร์เครื่องพิมพ์ สิทธิ์การเข้าถึง และการติดตั้งแอปพลิเคชัน</p>
            </div>
          </div>

          {/* Tab Selector in Header */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner overflow-x-auto custom-scrollbar">
              {[
                { id: 'general', label: 'ทั่วไป & ร้านค้า', icon: Store },
                { id: 'app', label: 'ติดตั้งแอป (PWA)', icon: Smartphone },
                { id: 'kds', label: 'ระบบครัว & เครื่องพิมพ์', icon: Clock },
                { id: 'admin', label: 'สิทธิ์ผู้ใช้ & ความปลอดภัย', icon: ShieldCheck },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap select-none ${
                      isActive 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <tab.icon size={14} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button 
              type="button"
              onClick={() => loadSystemSettings()} 
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              title="รีเฟรชค่าการตั้งค่าล่าสุด"
            >
              <RefreshCw size={13} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6 flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'general' && (
            <GeneralSettings 
              isKitchenOpen={isKitchenOpen} 
              handleToggleKitchen={handleToggleKitchen} 
            />
          )}

          {activeTab === 'app' && (
            <motion.div
              key="app"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-4xl mx-auto"
            >
              <div className="border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">ติดตั้งแอป Clean Food CR (PWA Mobile)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🟢 ใช้งานได้ 100%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ติดตั้งเป็นแอปพลิเคชันบน Android, iPhone, iPad, Mac และ Windows เพื่อความรวดเร็วในการเปิดใช้งานและการแจ้งเตือน
                </p>
              </div>

              <PwaInstallCard />
            </motion.div>
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

          {activeTab === 'admin' && (
            <AdminSettings />
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
