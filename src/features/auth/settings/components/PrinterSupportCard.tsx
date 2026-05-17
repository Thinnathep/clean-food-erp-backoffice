import React, { useState } from "react";
import { Printer, Bluetooth, Cable } from "lucide-react";
import { BluetoothPrinterSection } from "./BluetoothPrinterSection";
import { SerialPrinterSection } from "./SerialPrinterSection";

interface PrinterSupportCardProps {
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

export const PrinterSupportCard: React.FC<PrinterSupportCardProps> = ({
  printerEnabled,
  updateSystemConfig,
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
  const [connectionType, setConnectionType] = useState<"bluetooth" | "serial">(() => {
    if (serialPort) return "serial";
    return "bluetooth";
  });

  return (
    <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm flex flex-col justify-between space-y-4 w-full">
      {/* Header switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
              printerEnabled
                ? "bg-purple-50 text-purple-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <Printer size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              การใช้งานเครื่องพิมพ์
            </h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Printer Support
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            updateSystemConfig({ printerEnabled: !printerEnabled })
          }
          className={`w-14 h-7 rounded-full transition-all relative outline-none flex items-center p-0.5 cursor-pointer ${
            printerEnabled ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all shadow-sm transform ${
              printerEnabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {printerEnabled ? (
        <div className="pt-2 space-y-4 w-full">
          {/* Connection Type Tab Selector */}
          <div className="space-y-1">
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 ml-0.5">
              เลือกรูปแบบเชื่อมต่อ (Connection Type)
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button
                type="button"
                onClick={() => setConnectionType("bluetooth")}
                className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${
                  connectionType === "bluetooth"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                }`}
              >
                <Bluetooth size={12} />
                <span>Bluetoothไร้สาย</span>
              </button>

              <button
                type="button"
                onClick={() => setConnectionType("serial")}
                className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold transition-all ${
                  connectionType === "serial"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                }`}
              >
                <Cable size={12} />
                <span>ต่อสาย BT / USB / COM</span>
              </button>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full min-h-[110px] flex flex-col justify-center items-center">
            {connectionType === "bluetooth" ? (
              <BluetoothPrinterSection
                bluetoothDevice={bluetoothDevice}
                isConnectingBluetooth={isConnectingBluetooth}
                handleConnectBluetooth={handleConnectBluetooth}
                disconnectBluetooth={disconnectBluetooth}
                serialPort={serialPort}
                handleTestPrint={handleTestPrint}
              />
            ) : (
              <SerialPrinterSection
                serialPort={serialPort}
                isConnectingSerial={isConnectingSerial}
                handleConnectSerial={handleConnectSerial}
                disconnectSerial={disconnectSerial}
                bluetoothDevice={bluetoothDevice}
                handleTestPrint={handleTestPrint}
              />
            )}
          </div>

          {/* Quick Info */}
          <p className="text-[9px] text-slate-400 leading-normal ml-0.5">
            *กรุณาตรวจสอบว่าเปิดเครื่องพิมพ์เรียบร้อยก่อนทำการกดปุ่มเชื่อมต่อ
          </p>
        </div>
      ) : (
        <div className="py-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 w-full">
          <p className="text-xs font-bold text-slate-400">
            ปิดการสั่งพิมพ์สำหรับหน้านี้แล้ว
          </p>
          <p className="text-[10px] text-slate-300">
            เปิดระบบสั่งพิมพ์ด้านบนเพื่อตั้งค่าฮาร์ดแวร์
          </p>
        </div>
      )}
    </div>
  );
};
