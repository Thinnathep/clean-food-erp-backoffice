import React from "react";
import { Bluetooth } from "lucide-react";

interface BluetoothPrinterSectionProps {
  bluetoothDevice: any;
  isConnectingBluetooth: boolean;
  handleConnectBluetooth: () => Promise<void>;
  disconnectBluetooth: () => void;
  serialPort: any;
  handleTestPrint: () => Promise<void>;
}

export const BluetoothPrinterSection: React.FC<BluetoothPrinterSectionProps> = ({
  bluetoothDevice,
  isConnectingBluetooth,
  handleConnectBluetooth,
  disconnectBluetooth,
  serialPort,
  handleTestPrint,
}) => {
  const isBluetoothSupported =
    typeof navigator !== "undefined" && !!(navigator as any).bluetooth;

  if (!isBluetoothSupported) {
    return (
      <div className="space-y-4 w-full text-left bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <span className="text-sm font-black">📱</span>
          </div>
          <div>
            <h5 className="text-xs font-black text-amber-800 leading-tight">
              คำแนะนำสำหรับผู้ใช้ iPhone / iPad (iOS)
            </h5>
            <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-1">
              เบราว์เซอร์มาตรฐานของ Apple (Safari/Chrome บน iOS) จะถูกปิดกั้นสิทธิ์บลูทูธชั่วคราว คุณสามารถปลดล็อกและพิมพ์แบบไร้สายผ่านมือถือได้ง่าย ๆ ดังนี้ค่ะ:
            </p>
          </div>
        </div>

        <ol className="text-[10px] text-slate-600 font-bold space-y-1.5 list-decimal pl-4 leading-relaxed pt-1.5 border-t border-amber-200/50">
          <li>
            เปิด App Store แล้วดาวน์โหลดเบราว์เซอร์ฟรีชื่อ{" "}
            <span className="text-purple-600 underline font-black">
              Bluefy - Web Bluetooth Browser
            </span>
          </li>
          <li>
            เปิดแอป Bluefy และพิมพ์ URL ระบบนี้เข้าไปเพื่อเข้าใช้งานหลังบ้าน
          </li>
          <li>
            เข้ามาที่หน้านี้อีกครั้งเพื่อกดเชื่อมต่อบลูทูธและสั่งพิมพ์ได้ทันที!
            ⚡
          </li>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full text-center">
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl border border-slate-100">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          โหมดบลูทูธ (BLE):
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
            bluetoothDevice
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Bluetooth
            size={10}
            className={isConnectingBluetooth ? "animate-bounce" : ""}
          />
          {bluetoothDevice ? `เชื่อมต่อแล้ว` : "ไม่ได้ต่อ"}
        </span>
      </div>

      {bluetoothDevice && (
        <div className="text-[10px] font-bold text-slate-700 bg-white border border-slate-100 p-2 rounded-xl">
          ชื่ออุปกรณ์: {bluetoothDevice.name || "เครื่องพิมพ์ไร้สาย"}
        </div>
      )}

      <div className="flex justify-center w-full">
        {!bluetoothDevice ? (
          <button
            onClick={handleConnectBluetooth}
            disabled={isConnectingBluetooth || !!serialPort}
            className="w-full max-w-[240px] py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isConnectingBluetooth
              ? "กำลังค้นหาเครื่องพิมพ์..."
              : "ค้นหาและเชื่อมบลูทูธ"}
          </button>
        ) : (
          <div className="flex gap-2 w-full max-w-[240px] justify-center">
            <button
              onClick={handleTestPrint}
              className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 active:scale-[0.98] flex items-center justify-center gap-1 cursor-pointer"
            >
              พิมพ์ทดสอบ
            </button>
            <button
              onClick={disconnectBluetooth}
              className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all border border-red-100 active:scale-[0.98] cursor-pointer"
            >
              ตัดการเชื่อมต่อ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
