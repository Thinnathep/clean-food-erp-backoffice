import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { 
  encodeThaiCP874, 
  encodeThaiOverprint, 
  convertCanvasToEscPosBytes, 
  renderTextToCanvas 
} from '../features/auth/settings/printerEngine';

export { 
  encodeThaiCP874, 
  encodeThaiOverprint, 
  convertCanvasToEscPosBytes, 
  renderTextToCanvas 
};

let isAutoConnecting = false;

interface SystemState {
  isKitchenOpen: boolean;
  notificationSoundEnabled: boolean;
  autoRefreshInterval: number;
  printerEnabled: boolean;
  isLoading: boolean;
  loadSystemSettings: () => Promise<void>;
  setKitchenStatus: (isOpen: boolean) => Promise<void>;
  updateSystemConfig: (config: Partial<{ notificationSoundEnabled: boolean; autoRefreshInterval: number; printerEnabled: boolean }>) => Promise<void>;

  // Bluetooth State
  bluetoothDevice: any;
  bluetoothCharacteristic: any;
  isConnectingBluetooth: boolean;
  connectBluetooth: () => Promise<void>;
  disconnectBluetooth: () => void;
  printToBluetooth: (data: Uint8Array) => Promise<void>;
  printTestPage: () => Promise<void>;

  // Serial / USB State
  serialPort: any;
  isConnectingSerial: boolean;
  connectSerial: () => Promise<void>;
  disconnectSerial: () => Promise<void>;
  printToSerial: (data: Uint8Array) => Promise<void>;
  
  // Thai Code Page setting
  thaiCodePage: number;
  setThaiCodePage: (page: number) => void;
  printerMode: 'text' | 'graphic';
  setPrinterMode: (mode: 'text' | 'graphic') => void;
  thaiFont: string;
  setThaiFont: (font: string) => void;
  autoConnectDevices: () => Promise<void>;
}

export const useSystemStore = create<SystemState>((set) => ({
  isKitchenOpen: true,
  notificationSoundEnabled: true,
  autoRefreshInterval: 30,
  printerEnabled: true,
  isLoading: false,

  // Bluetooth State Initial values
  bluetoothDevice: null,
  bluetoothCharacteristic: null,
  isConnectingBluetooth: false,

  // Serial / USB State Initial values
  serialPort: null,
  isConnectingSerial: false,

  thaiCodePage: Number(localStorage.getItem('kds_thai_code_page') || '109'),
  setThaiCodePage: (page: number) => {
    localStorage.setItem('kds_thai_code_page', page.toString());
    set({ thaiCodePage: page });
  },

  printerMode: (localStorage.getItem('kds_printer_mode') || 'graphic') as 'text' | 'graphic',
  setPrinterMode: (mode: 'text' | 'graphic') => {
    localStorage.setItem('kds_printer_mode', mode);
    set({ printerMode: mode });
  },

  thaiFont: localStorage.getItem('kds_thai_font') || 'Tahoma',
  setThaiFont: (font: string) => {
    localStorage.setItem('kds_thai_font', font);
    set({ thaiFont: font });
  },

  loadSystemSettings: async () => {
    set({ isLoading: true });
    try {
      const { data } = await supabase
        .from('erp_settings')
        .select('key, value')
        .in('key', ['kitchen_status', 'system_config']);
      
      const kitchenStatus = data?.find(d => d.key === 'kitchen_status')?.value;
      const systemConfig = data?.find(d => d.key === 'system_config')?.value;

      set({ 
        isKitchenOpen: kitchenStatus?.is_open ?? true,
        notificationSoundEnabled: systemConfig?.notificationSoundEnabled ?? true,
        autoRefreshInterval: systemConfig?.autoRefreshInterval ?? 30,
        printerEnabled: systemConfig?.printerEnabled ?? true,
        isLoading: false 
      });

      // Silently auto-connect authorized printer in background if not already connected
      const { bluetoothDevice, serialPort } = useSystemStore.getState();
      if (!bluetoothDevice && !serialPort) {
        useSystemStore.getState().autoConnectDevices().catch(() => {});
      }
    } catch (err: any) {
      console.error('Error loading system settings:', err);
      set({ isLoading: false });
    }
  },
  setKitchenStatus: async (isOpen: boolean) => {
    try {
      const { error } = await supabase
        .from('erp_settings')
        .upsert({ 
          key: 'kitchen_status', 
          value: { is_open: isOpen }, 
          updated_at: new Date().toISOString() 
        });
      
      if (!error) {
        set({ isKitchenOpen: isOpen });
      }
    } catch (err: any) {
      console.error('Error setting kitchen status:', err);
    }
  },
  updateSystemConfig: async (config) => {
    try {
      const { data: current } = await supabase
        .from('erp_settings')
        .select('value')
        .eq('key', 'system_config')
        .single();
      
      const newValue = { ...(current?.value || {}), ...config };
      const { error } = await supabase
        .from('erp_settings')
        .upsert({ key: 'system_config', value: newValue, updated_at: new Date().toISOString() });
      
      if (!error) set(config);
    } catch (err: any) {
      console.error('Error updating config:', err);
    }
  },

  connectBluetooth: async () => {
    const { isConnectingBluetooth } = useSystemStore.getState();
    if (isConnectingBluetooth) {
      console.log("📶 [Bluetooth] กำลังเชื่อมต่ออยู่แล้ว ข้ามการทำงานซ้อน");
      return;
    }

    const nav = navigator as any;
    if (!nav.bluetooth) {
      console.log("❌ Web Bluetooth not supported in this browser");
      throw new Error("เว็บบราวเซอร์ของคุณไม่รองรับ Web Bluetooth API กรุณาใช้ Chrome หรือ Edge ค่ะ");
    }

    set({ isConnectingBluetooth: true });
    console.log("🚀 [1/6] เริ่มต้นค้นหาบลูทูธ: กำลังเรียกใช้ requestDevice...");
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000e781-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-295b-7f04-bf7e130d0000',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '0000ff00-0000-1000-8000-00805f9b34fb', // Gprinter / GLPrinter
          '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat Printer
          '0000ae30-0000-1000-8000-00805f9b34fb', // Generic
          '0000af30-0000-1000-8000-00805f9b34fb'  // Generic
        ]
      });

      console.log("✅ [2/6] เลือกอุปกรณ์สำเร็จ:", {
        name: device.name,
        id: device.id,
        paired: device.gatt ? "มี gatt" : "ไม่มี gatt"
      });

      console.log("🚀 [3/6] กำลังเชื่อมต่อเข้าสู่ GATT Server ของเครื่องพิมพ์...");
      const server = await device.gatt.connect();
      console.log("✅ [4/6] เชื่อมต่อ GATT Server สำเร็จ! สถานะการต่อ:", server.connected);

      console.log("🚀 [5/6] กำลังค้นหาบริการส่งข้อมูล (Services & Characteristics)...");
      let targetCharacteristic = null;
      const serviceUUIDs = [
        '0000ff00-0000-1000-8000-00805f9b34fb', // GLPrinter (FF00) - ให้ความสำคัญตัวแรก!
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-295b-7f04-bf7e130d0000',
        '0000e781-0000-1000-8000-00805f9b34fb',
        '0000fee7-0000-1000-8000-00805f9b34fb',
        '0000ae30-0000-1000-8000-00805f9b34fb',
        '0000af30-0000-1000-8000-00805f9b34fb'
      ];

      for (const uuid of serviceUUIDs) {
        try {
          console.log(`- กำลังลองค้นหา Service UUID: ${uuid}`);
          
          const servicePromise = server.getPrimaryService(uuid);
          const timeoutPromise = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("ค้นหาล่าช้าเกินไป (Timeout)")), 3500)
          );
          
          const service = await Promise.race([servicePromise, timeoutPromise]);
          console.log(`  └─ เจอบริการ ${uuid} แล้ว! กำลังดึงคุณลักษณะ (Characteristics)...`);
          const characteristics = await service.getCharacteristics();
          
          const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          if (writeChar) {
            targetCharacteristic = writeChar;
            console.log(`  └─ เจอช่องเขียนข้อมูลสำเร็จ (Write Characteristic): ${writeChar.uuid}`);
            break;
          }
        } catch (e: any) {
          console.log(`  └─ ค้นหา Service ${uuid} ไม่สำเร็จ:`, e.message || e);
        }
      }

      if (!targetCharacteristic) {
        console.log("🔍 ไม่พบในลิสต์ UUID เริ่มต้น, กำลังค้นหา Services ทั้งหมดในเครื่องแบบไดนามิก...");
        try {
          const servicesPromise = server.getPrimaryServices();
          const timeoutPromise = new Promise<any>((_, reject) => 
            setTimeout(() => reject(new Error("ค้นหา Services ทั้งหมดล่าช้าเกินไป (Timeout)")), 5000)
          );
          const services = await Promise.race([servicesPromise, timeoutPromise]);
          
          console.log(`✅ เจอบริการทั้งหมด ${services.length} ตัวในเครื่องพิมพ์นี้:`);
          for (const service of services) {
            console.log(`🔹 บริการที่พบ UUID: ${service.uuid}`);
            try {
              const characteristics = await service.getCharacteristics();
              console.log(`   └─ เจอลักษณะการส่งข้อมูล (Characteristics) ในบริการนี้:`, characteristics.map((c: any) => c.uuid));
              
              const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
              if (writeChar) {
                targetCharacteristic = writeChar;
                console.log(`   └─ ⭐ เจอช่องเขียนข้อมูลแบบไดนามิกสำเร็จ! UUID: ${writeChar.uuid}`);
                break;
              }
            } catch (charError: any) {
              console.log(`   └─ ดึงลักษณะการส่งข้อมูลของบริการนี้ไม่สำเร็จ:`, charError.message || charError);
            }
          }
        } catch (e: any) {
          console.log("❌ ค้นหา Services ทั้งหมดล้มเหลว:", e.message || e);
        }
      }

      if (!targetCharacteristic) {
        console.log("❌ ไม่เจอ Write Characteristic เลยในระบบ");
        throw new Error("ไม่พบ Write Characteristic ในเครื่องพิมพ์นี้ กรุณาลองใหม่อีกครั้ง");
      }

      console.log("🎉 [6/6] การตั้งค่าเสร็จสมบูรณ์! บันทึกเครื่องพิมพ์ลงในระบบ");
      set({
        bluetoothDevice: device,
        bluetoothCharacteristic: targetCharacteristic,
        isConnectingBluetooth: false
      });

      device.addEventListener('gattserverdisconnected', () => {
        console.log("⚠️ เครื่องพิมพ์บลูทูธถูกตัดการเชื่อมต่อ (Disconnected)");
        set({
          bluetoothDevice: null,
          bluetoothCharacteristic: null
        });
      });

    } catch (err: any) {
      console.error("❌ การเชื่อมต่อบลูทูธล้มเหลว:", err);
      set({ isConnectingBluetooth: false });
      if (err.name === 'NotFoundError' || (err.message && err.message.includes('User cancelled'))) {
        throw new Error("ยกเลิกการเชื่อมต่อ: คุณไม่ได้เลือกเครื่องพิมพ์บลูทูธค่ะ", { cause: err });
      }
      throw err;
    }
  },

  disconnectBluetooth: () => {
    const { bluetoothDevice } = useSystemStore.getState();
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
      bluetoothDevice.gatt.disconnect();
    }
    set({
      bluetoothDevice: null,
      bluetoothCharacteristic: null
    });
  },

  printToBluetooth: async (data: Uint8Array) => {
    const { bluetoothCharacteristic } = useSystemStore.getState();
    if (!bluetoothCharacteristic) {
      throw new Error("กรุณาเชื่อมต่อเครื่องพิมพ์บลูทูธก่อนสั่งพิมพ์ค่ะ");
    }

    // Modern BLE devices easily support 120-byte chunk sizes
    const chunkSize = 120;
    const canWriteWithoutResponse =
      bluetoothCharacteristic.properties.writeWithoutResponse;

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (canWriteWithoutResponse) {
        await bluetoothCharacteristic.writeValueWithoutResponse(chunk);
        // Minimal delay for streaming without response to prevent printer buffer overrun
        await new Promise((resolve) => setTimeout(resolve, 5));
      } else {
        await bluetoothCharacteristic.writeValue(chunk);
        // Standard delay for write with response
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  },

  printTestPage: async () => {
    const { bluetoothCharacteristic, serialPort, thaiCodePage, printerMode, thaiFont } = useSystemStore.getState();
    const modeText = serialPort ? "USB/Serial COM Port" : "Bluetooth";

    let finalBytes: Uint8Array;

    if (printerMode === 'graphic') {
      const fullText = 
        "[B] ใบสั่งเตรียมอาหาร KDS\n" +
        "[B] ออเดอร์อาหาร Clean Food CR\n" +
        "--------------------------------\n" +
        "ลูกค้า | คุณสมชาย ดีใจ\n" +
        "เบอร์โทร | 081-234-5678\n" +
        "รอบจัดส่ง | รอบเช้า (08:00)\n" +
        "ประเภท | อาหารเพื่อสุขภาพ\n" +
        "ที่อยู่ | 99/9 ถ.สุขุมวิท กรุงเทพฯ\n" +
        "--------------------------------\n" +
        "[B] ข้าวมันไก่ผสมอกไก่ (มื้อที่ 1) | [B] 1 กล่อง\n" +
        "[B] *สระวรรณยุกต์ | [B] ต่อสำเร็จ!\n" +
        "--------------------------------\n" +
        "แคลลอรี่รวม | 550 KCAL\n" +
        "โปรตีน (Protein) | 42.0 g\n" +
        "คาร์โบไฮเดรต (Carbs) | 45.0 g\n" +
        "ไขมัน (Fat) | 12.0 g\n" +
        "--------------------------------\n";

      const canvas = renderTextToCanvas(fullText, 576, thaiFont);
      const imgBytes = convertCanvasToEscPosBytes(canvas);

      finalBytes = new Uint8Array([
        0x1B, 0x40, // Initialize
        0x1B, 0x6A, 0x38, // ESC j 56 (Feed paper backward by 56 units)
        ...Array.from(imgBytes),
        0x0A, 0x0A, 0x0A, 0x0A, // Feed lines
        0x1D, 0x56, 66, 0x00    // ESC/POS Cut paper command (GS V 66 0)
      ]);
    } else {
      let codePageName = `เบอร์ ${thaiCodePage}`;
      if (thaiCodePage === 109) codePageName = "เบอร์ 109 (ANSI874 Thai)";
      else if (thaiCodePage === 131) codePageName = "เบอร์ 131 (IBM20838 Thai)";
      else if (thaiCodePage === 161) codePageName = "เบอร์ 161 (MAC10021 Thai)";
      else if (thaiCodePage === 26) codePageName = "เบอร์ 26 (CP874 Standard)";
      else if (thaiCodePage === 18) codePageName = "เบอร์ 18 (TIS-18 Xprinter)";
      else if (thaiCodePage === 17) codePageName = "เบอร์ 17 (TIS-18 Zjiang)";

      const esc = [
        0x1B, 0x40, // Initialize
        0x1B, 0x6A, 0x38, // ESC j 56 (Feed paper backward by 56 units)
        0x1B, 0x74, thaiCodePage, // Select dynamic Thai code page
        0x1B, 0x61, 0x01, // Center align
        0x1B, 0x21, 0x30, // Double height & width
      ];

      const titleBytes = encodeThaiCP874("CLEAN FOOD CR\n");

      const bodyText = 
        "--------------------------------\n" +
        `สถานะ: เชื่อมต่อสำเร็จ! (${modeText})\n` +
        `ตารางภาษา: ${codePageName}\n` +
        "ทดสอบการพิมพ์ภาษาไทย: กขค ๑๒๓\n" +
        `เวลาทดสอบ: ${new Date().toLocaleTimeString('th-TH')}\n` +
        "ระบบครัวและเตรียมอาหาร KDS\n" +
        "--------------------------------\n";

      const bodyBytes = encodeThaiOverprint(bodyText);

      finalBytes = new Uint8Array([
        ...esc,
        ...Array.from(titleBytes),
        0x1B, 0x21, 0x00, // Reset character size
        0x1B, 0x61, 0x00, // Left align
        ...Array.from(bodyBytes),
        0x0A, 0x0A, 0x0A, 0x0A, // Feed lines
        0x1D, 0x56, 66, 0x00    // ESC/POS Cut paper command (GS V 66 0)
      ]);
    }
    
    if (serialPort) {
      const { printToSerial } = useSystemStore.getState();
      await printToSerial(finalBytes);
    } else if (bluetoothCharacteristic) {
      const { printToBluetooth } = useSystemStore.getState();
      await printToBluetooth(finalBytes);
    } else {
      throw new Error("กรุณาเชื่อมต่อเครื่องพิมพ์บลูทูธ หรือ USB/Serial ก่อนสั่งพิมพ์ทดสอบค่ะ");
    }
  },

  connectSerial: async () => {
    const { isConnectingSerial } = useSystemStore.getState();
    if (isConnectingSerial) {
      console.log("🔌 [Serial] กำลังเชื่อมต่ออยู่แล้ว ข้ามการทำงานซ้อน");
      return;
    }

    const nav = navigator as any;
    if (!nav.serial) {
      throw new Error("เว็บบราวเซอร์ของคุณไม่รองรับ Web Serial API (กรุณาใช้ Chrome หรือ Edge บนคอมพิวเตอร์ค่ะ)");
    }

    set({ isConnectingSerial: true });
    try {
      console.log("🔌 [1/3] เริ่มการเชื่อมต่อสาย Serial/USB/COM Port...");
      const port = await nav.serial.requestPort();
      console.log("🔌 [2/3] เปิด Port ที่ความเร็ว 9600 bps...");
      try {
        await port.open({ baudRate: 9600 });
      } catch (openErr: any) {
        const msg = openErr.message || '';
        if (msg.includes("already open") || msg.includes("already in progress")) {
          console.log("🔌 [2/3] พอร์ตนี้กำลังเปิดหรือเปิดใช้งานอยู่แล้ว ข้ามขั้นตอนการเปิดพอร์ตใหม่");
        } else {
          throw openErr;
        }
      }
      console.log("🔌 [3/3] เปิด Port สำเร็จ!");

      set({
        serialPort: port,
        isConnectingSerial: false
      });
    } catch (err: any) {
      console.error("❌ การเชื่อมต่อ Serial ล้มเหลว:", err);
      set({ isConnectingSerial: false });
      if (err.name === 'NotFoundError' || (err.message && err.message.includes('No port selected'))) {
        throw new Error("ยกเลิกการเชื่อมต่อ: คุณไม่ได้เลือกพอร์ตเชื่อมต่อเครื่องพิมพ์ค่ะ", { cause: err });
      }
      throw err;
    }
  },

  disconnectSerial: async () => {
    const { serialPort } = useSystemStore.getState();
    if (serialPort) {
      try {
        await serialPort.close();
      } catch (e) {
        console.error("Error closing serial port:", e);
      }
    }
    set({
      serialPort: null
    });
  },

  printToSerial: async (data: Uint8Array) => {
    const { serialPort } = useSystemStore.getState();
    if (!serialPort) {
      throw new Error("กรุณาเชื่อมต่อผ่าน USB/Serial ก่อนสั่งพิมพ์ค่ะ");
    }

    // Safely try to open the port if it's closed or writable is null
    if (!serialPort.writable) {
      console.log("🔌 [printToSerial] พอร์ตปิดอยู่หรือ writable เป็น null, กำลังลองเปิดพอร์ตใหม่...");
      try {
        await serialPort.open({ baudRate: 9600 });
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes("already open") || msg.includes("already in progress")) {
          console.log("🔌 [printToSerial] พอร์ตกำลังทำงานอยู่");
        } else {
          console.error("❌ ไม่สามารถเปิดพอร์ตใหม่ได้:", err);
          throw new Error("เครื่องพิมพ์ Serial ขัดข้อง: กรุณาถอดสายแล้วเชื่อมต่อใหม่อีกครั้งค่ะ", { cause: err });
        }
      }
    }

    // Wait a brief moment if still initializing
    if (!serialPort.writable) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!serialPort.writable) {
      throw new Error("ไม่สามารถเขียนข้อมูลลงพอร์ตเครื่องพิมพ์ได้ (ช่องส่งข้อมูลยังไม่พร้อม) กรุณาเชื่อมต่อสายใหม่อีกครั้งค่ะ");
    }

    const writer = serialPort.writable.getWriter();
    try {
      await writer.write(data);
      console.log("✅ ส่งข้อมูลพิมพ์ผ่าน Serial สำเร็จ!");
    } finally {
      writer.releaseLock();
    }
  },

  autoConnectDevices: async () => {
    if (isAutoConnecting) return;
    isAutoConnecting = true;

    try {
      const nav = navigator as any;
      
      // 1. Try Serial Ports auto-connect
      const { isConnectingSerial, serialPort } = useSystemStore.getState();
      if (serialPort) return;

      if (nav.serial && !isConnectingSerial) {
        try {
          const ports = await nav.serial.getPorts();
          if (ports.length > 0) {
            console.log("🔌 [Auto-Connect] พบ Serial Port ที่เคยได้รับอนุญาตแล้ว! กำลังเชื่อมต่ออัตโนมัติ...");
            const port = ports[0];
            set({ isConnectingSerial: true });
            try {
              const openPromise = port.open({ baudRate: 9600 });
              const timeoutPromise = new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error("เปิดพอร์ตหมดเวลา (Timeout)")), 12000)
              );
              await Promise.race([openPromise, timeoutPromise]);
              
              set({
                serialPort: port,
                isConnectingSerial: false
              });
              console.log("🔌 [Auto-Connect] เชื่อมต่อสาย Serial/COM อัตโนมัติสำเร็จ!");
              return;
            } catch (openErr: any) {
              set({ isConnectingSerial: false });
              const msg = openErr.message || '';
              if (msg.includes("already open") || msg.includes("already in progress")) {
                set({ serialPort: port });
                return;
              }
            }
          }
        } catch (err) {
          console.error("🔌 [Auto-Connect] เชื่อมต่อสาย Serial อัตโนมัติล้มเหลว:", err);
          set({ isConnectingSerial: false });
        }
      }

      // 2. Try Bluetooth Devices auto-connect
      if (nav.bluetooth && typeof nav.bluetooth.getDevices === 'function') {
        try {
          const devices = await nav.bluetooth.getDevices();
          if (devices.length > 0) {
            console.log("📶 [Auto-Connect] พบอุปกรณ์ Bluetooth ที่เคยจับคู่แล้ว! กำลังเชื่อมต่ออัตโนมัติ...");
            const device = devices[0];
            set({ isConnectingBluetooth: true });
            
            const server = await device.gatt.connect();
            
            const uuids = [
              '000018f0-0000-1000-8000-00805f9b34fb',
              '0000e781-0000-1000-8000-00805f9b34fb',
              '49535343-fe7d-295b-7f04-bf7e130d0000',
              '00004953-0000-1000-8000-00805f9b34fb',
              '00001101-0000-1000-8000-00805f9b34fb'
            ];
            
            let targetCharacteristic: any = null;
            for (const uuid of uuids) {
              try {
                const service = await server.getPrimaryService(uuid);
                const characteristics = await service.getCharacteristics();
                const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
                if (writeChar) {
                  targetCharacteristic = writeChar;
                  break;
                }
              } catch (_e) {
                // Continue searching other service UUIDs
              }
            }
            
            if (!targetCharacteristic) {
              try {
                const services = await server.getPrimaryServices();
                for (const service of services) {
                  const characteristics = await service.getCharacteristics();
                  const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
                  if (writeChar) {
                    targetCharacteristic = writeChar;
                    break;
                  }
                }
              } catch (_e) {
                // Continue searching primary services
              }
            }
            
            if (targetCharacteristic) {
              set({
                bluetoothDevice: device,
                bluetoothCharacteristic: targetCharacteristic,
                isConnectingBluetooth: false
              });
              console.log("📶 [Auto-Connect] เชื่อมต่อ Bluetooth อัตโนมัติสำเร็จ!");
              
              device.addEventListener('gattserverdisconnected', () => {
                set({ bluetoothDevice: null, bluetoothCharacteristic: null });
              });
            } else {
              set({ isConnectingBluetooth: false });
            }
          }
        } catch (err) {
          console.error("📶 [Auto-Connect] เชื่อมต่อบลูทูธอัตโนมัติล้มเหลว:", err);
          set({ isConnectingBluetooth: false });
        }
      }
    } finally {
      isAutoConnecting = false;
    }
  }
}));
