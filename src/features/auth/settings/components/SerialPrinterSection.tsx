import React from "react";
import { Power } from "lucide-react";

interface SerialPrinterSectionProps {
  serialPort: any;
  isConnectingSerial: boolean;
  handleConnectSerial: () => Promise<void>;
  disconnectSerial: () => void;
  bluetoothDevice: any;
  handleTestPrint: () => Promise<void>;
}

export const SerialPrinterSection: React.FC<SerialPrinterSectionProps> = ({
  serialPort,
  isConnectingSerial,
  handleConnectSerial,
  disconnectSerial,
  bluetoothDevice,
  handleTestPrint,
}) => {
  const isSerialSupported =
    typeof navigator !== "undefined" && !!(navigator as any).serial;

  if (!isSerialSupported) {
    return (
      <div className="space-y-4 w-full text-left bg-slate-100 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700 shrink-0">
            <span className="text-sm font-black">💻</span>
          </div>
          <div>
            <h5 className="text-xs font-black text-slate-800 leading-tight">
              ไม่รองรับการเชื่อมต่อสายบนอุปกรณ์นี้
            </h5>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">
              เบราว์เซอร์บนระบบปฏิบัติการ iOS (iPhone / iPad) หรือเบราว์เซอร์มือถือทั่วไป จะไม่รองรับการเชื่อมต่อสายตรง USB/COM ค่ะ
            </p>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-600 font-bold leading-relaxed">
          💡 <span className="text-indigo-600">ข้อแนะนำ:</span> กรุณาเข้าใช้งานผ่านคอมพิวเตอร์ (Windows / Mac / Chromebook) ด้วยเบราว์เซอร์ <span className="text-slate-800 font-black">Google Chrome</span> หรือ <span className="text-slate-800 font-black">Microsoft Edge</span> เพื่อใช้ตัวเลือกต่อสายตรงนี้ค่ะ!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full text-center">
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-2xl border border-slate-100">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          โหมดสาย USB / COM:
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
            serialPort
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <Power size={10} />
          {serialPort ? "ต่อสายแล้ว" : "ไม่ได้ต่อ"}
        </span>
      </div>

      <div className="flex justify-center w-full">
        {!serialPort ? (
          <button
            onClick={handleConnectSerial}
            disabled={isConnectingSerial || !!bluetoothDevice}
            className="w-full max-w-[240px] py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isConnectingSerial
              ? "กำลังตรวจสอบพอร์ต..."
              : "เชื่อมต่อผ่านสาย USB"}
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
              onClick={disconnectSerial}
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
