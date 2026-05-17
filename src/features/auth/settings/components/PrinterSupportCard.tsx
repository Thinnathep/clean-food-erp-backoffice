import React from "react";
import { Printer, Cable } from "lucide-react";
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
  serialPort,
  isConnectingSerial,
  handleConnectSerial,
  disconnectSerial,
  handleTestPrint,
}) => {
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
          {/* Connection Type Indicator (Static, premium) */}
          <div className="space-y-1">
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 ml-0.5">
              รูปแบบการเชื่อมต่อ (Connection Type)
            </span>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
              <Cable size={14} className="text-purple-600 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                ต่อสาย BT / USB / COM{" "}
              </span>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 w-full min-h-[110px] flex flex-col justify-center items-center">
            <SerialPrinterSection
              serialPort={serialPort}
              isConnectingSerial={isConnectingSerial}
              handleConnectSerial={handleConnectSerial}
              disconnectSerial={disconnectSerial}
              bluetoothDevice={bluetoothDevice}
              handleTestPrint={handleTestPrint}
            />
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
