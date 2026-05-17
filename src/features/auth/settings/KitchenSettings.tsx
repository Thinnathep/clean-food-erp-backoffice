import React from 'react';
import { motion } from 'framer-motion';
import { KdsBoardSettingsCard } from './components/KdsBoardSettingsCard';
import { PrinterSupportCard } from './components/PrinterSupportCard';
import { FontSelector } from './components/FontSelector';

interface KitchenSettingsProps {
  autoRefreshInterval: number;
  notificationSoundEnabled: boolean;
  printerEnabled: boolean;
  updateSystemConfig: (config: any) => Promise<void>;
  thaiFont: string;
  setThaiFont: (font: string) => void;
  bluetoothDevice: any;
  isConnectingBluetooth: boolean;
  handleConnectBluetooth: () => Promise<void>;
  disconnectBluetooth: () => void;
  serialPort: any;
  isConnectingSerial: boolean;
  handleConnectSerial: () => Promise<void>;
  disconnectSerial: () => void;
  handleTestPrint: () => Promise<void>;
}

export const KitchenSettings: React.FC<KitchenSettingsProps> = ({
  autoRefreshInterval,
  notificationSoundEnabled,
  printerEnabled,
  updateSystemConfig,
  thaiFont,
  setThaiFont,
  bluetoothDevice,
  isConnectingBluetooth,
  handleConnectBluetooth,
  disconnectBluetooth,
  serialPort,
  isConnectingSerial,
  handleConnectSerial,
  disconnectSerial,
  handleTestPrint,
}) => {
  return (
    <motion.div 
      key="kds"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 animate-fadeIn w-full max-w-[1400px] mx-auto"
    >
      {/* Title Header */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-base font-bold text-slate-800 uppercase tracking-tight">ตั้งค่าระบบครัว KDS & เครื่องพิมพ์ฮาร์ดแวร์</h3>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest pt-0.5">Kitchen Display System & Printer Configuration</p>
      </div>
      
      {/* 3-Column Responsive Grid System (PC: 3 columns, iPad: 2 columns, Mobile: 1 column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        
        {/* Column 1: KDS screen & sound controls */}
        <div className="space-y-2">
          <div className="border-l-4 border-blue-500 pl-2.5 py-0.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">การแสดงผล KDS</h4>
          </div>
          <KdsBoardSettingsCard 
            autoRefreshInterval={autoRefreshInterval}
            notificationSoundEnabled={notificationSoundEnabled}
            updateSystemConfig={updateSystemConfig}
          />
        </div>

        {/* Column 2: Printer Setup & Connection Hub */}
        <div className="space-y-2">
          <div className="border-l-4 border-purple-500 pl-2.5 py-0.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เครื่องพิมพ์สลิป</h4>
          </div>
          <PrinterSupportCard 
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
        </div>

        {/* Column 3: Font Selection & Hanging Physical Ticket Preview */}
        {printerEnabled && (
          <div className="space-y-2 md:col-span-2 xl:col-span-1">
            <div className="border-l-4 border-indigo-500 pl-2.5 py-0.5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">จำลองใบสั่งสลิปสด</h4>
            </div>
            <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm">
              <FontSelector 
                thaiFont={thaiFont} 
                setThaiFont={setThaiFont} 
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
