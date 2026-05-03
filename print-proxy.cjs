const http = require('http');
const net = require('net');
const iconv = require('iconv-lite');

// ============================================================================
// ERP KDS - DIRECT IP PRINT PROXY SERVER
// ============================================================================

class PrinterConfig {
    static IP = '192.168.1.94';
    static PORT = 9100;
    static ENCODING = 'win874'; // การเข้ารหัสภาษาไทยมาตรฐาน
}

const ESC = '\x1B';
const GS = '\x1D';

class ESCPOS {
    static INIT = ESC + '@';
    
    static ALIGN_LEFT = ESC + 'a' + '\x00';
    static ALIGN_CENTER = ESC + 'a' + '\x01';
    static ALIGN_RIGHT = ESC + 'a' + '\x02';
    
    static TEXT_NORMAL = GS + '!' + '\x00';
    static TEXT_LARGE = GS + '!' + '\x11'; // ขยายความกว้างและความสูง x2
    
    static CUT_PAPER = GS + 'V' + '\x41' + '\x00';
    
    // โหมดบังคับภาษาไทย (ค้นหาโหมดที่มีระบบรวมสระในตัว)
    static DISABLE_KANJI = '\x1C\x2E'; // ปิดโหมดอักษรจีนกว้าง
    static THAI_MODE_26 = ESC + 't' + '\x1A'; // Code Page 26 (Thai 2) - มักมีชิปรวมสระ
    static THAI_CHARSET = ESC + 'R' + '\x0E'; // Charset 14 (Thai)
}

function adjustThaiVowels(text) {
    // เตรียมไว้เผื่อต้องแก้ด้วยซอฟต์แวร์ 100%
    return text;
}

class PrintJobBuilder {
    constructor() {
        this.buffer = '';
        this.buffer += ESCPOS.INIT;
        this.buffer += ESCPOS.DISABLE_KANJI;
        this.buffer += ESCPOS.THAI_MODE_26; // สะกิดโหมด Thai 2
        this.buffer += ESCPOS.THAI_CHARSET; // บังคับอักษรไทย
    }

    align(mode) { this.buffer += mode; return this; }
    size(mode) { this.buffer += mode; return this; }
    text(str) { this.buffer += adjustThaiVowels(str); return this; }
    feed(lines = 1) { this.buffer += '\n'.repeat(lines); return this; }
    cut() { this.buffer += ESCPOS.CUT_PAPER; return this; }
    
    build() {
        // แปลงข้อความทั้งหมดเป็นเข้ารหัสตามที่ตั้งไว้
        return iconv.encode(this.buffer, PrinterConfig.ENCODING);
    }
}

const Jimp = require('jimp');

// ... (เก็บส่วนเดิมไว้ แต่ให้แทรกส่วนของการยิงภาพลงไปใน server)
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.writeHead(200), res.end();

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                if (req.url === '/print-image') {
                    // โหมดพิมพ์ด้วยรูปภาพ (แก้ปัญหาสระลอย)
                    const data = JSON.parse(body);
                    const base64Data = data.image.replace(/^data:image\/png;base64,/, "");
                    const imageBuffer = Buffer.from(base64Data, 'base64');
                    await handleImagePrintJob(imageBuffer, res);
                } else if (req.url === '/print') {
                    // โหมดพิมพ์ข้อความดั้งเดิม
                    const data = JSON.parse(body);
                    handlePrintJob(data, res);
                }
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' }));
            }
        });
    } else {
        res.writeHead(404), res.end();
    }
});

async function handleImagePrintJob(imageBuffer, res) {
    console.log(`\n[${new Date().toLocaleTimeString()}] Processing Image Print Job (Graphic Mode)...`);
    
    try {
        const image = await Jimp.read(imageBuffer);
        
        // ปรับขนาดภาพให้กว้าง 576 พิกเซล (ความกว้างมาตรฐานเครื่องปริ้น 80mm)
        // เพื่อให้สัดส่วนภาพเต็มหน้ากระดาษพอดี
        image.resize(576, Jimp.AUTO);
        
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const bytesWidth = Math.ceil(width / 8); // จำนวน Byte ต่อบรรทัด
        
        const xL = bytesWidth & 0xFF;
        const xH = (bytesWidth >> 8) & 0xFF;
        const yL = height & 0xFF;
        const yH = (height >> 8) & 0xFF;

        const bufferSize = 8 + (bytesWidth * height);
        const printData = Buffer.alloc(bufferSize);
        
        // คำสั่งปริ้นรูปภาพ: GS v 0 m xL xH yL yH [data]
        printData.writeUInt8(0x1D, 0); // GS
        printData.writeUInt8(0x76, 1); // v
        printData.writeUInt8(0x30, 2); // 0
        printData.writeUInt8(0x00, 3); // m (0 = normal mode)
        printData.writeUInt8(xL, 4);
        printData.writeUInt8(xH, 5);
        printData.writeUInt8(yL, 6);
        printData.writeUInt8(yH, 7);
        
        let offset = 8;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < bytesWidth; x++) {
                let byte = 0;
                for (let bit = 0; bit < 8; bit++) {
                    let pixelX = x * 8 + bit;
                    if (pixelX < width) {
                        const color = image.getPixelColor(pixelX, y);
                        const rgba = Jimp.intToRGBA(color);
                        // วิเคราะห์ความเข้มของสี ถ้าเข้มให้แปลงเป็นจุดสีดำบนกระดาษ
                        const luminance = 0.2126 * rgba.r + 0.7152 * rgba.g + 0.0722 * rgba.b;
                        if (luminance < 128 && rgba.a > 128) {
                            byte |= (1 << (7 - bit));
                        }
                    }
                }
                printData.writeUInt8(byte, offset++);
            }
        }
        
        const client = new net.Socket();
        client.setTimeout(10000); // 10 วินาทีสำหรับส่งรูปภาพ
        client.connect(PrinterConfig.PORT, PrinterConfig.IP, () => {
            console.log(`[+] Connected to Printer at ${PrinterConfig.IP}:${PrinterConfig.PORT}`);
            client.write(ESCPOS.INIT);
            client.write(ESCPOS.ALIGN_CENTER);
            client.write(printData); // ยิงข้อมูลภาพพิกเซล
            client.write(Buffer.from('\n\n\n\x1D\x56\x41\x00', 'binary')); // คำสั่งตัดกระดาษ
            
            console.log(`[+] Image data successfully sent to printer.`);
            client.end();
        });
        
        client.on('error', (err) => {
            console.error(`[-] Printer Error: ${err.message}`);
            if (!res.headersSent) res.writeHead(500), res.end();
        });
        client.on('close', () => {
            if (!res.headersSent) res.writeHead(200), res.end(JSON.stringify({ success: true }));
        });
        
    } catch (err) {
        console.error("[-] Image processing failed:", err);
        if (!res.headersSent) res.writeHead(500), res.end();
    }
}

function handlePrintJob(data, res) {
    console.log(`\n[${new Date().toLocaleTimeString()}] Processing: ${data.menuName} (QTY: ${data.totalQty})`);
    
    const client = new net.Socket();
    client.setTimeout(5000); // ตั้งเวลา Time out 5 วินาที
    
    client.connect(PrinterConfig.PORT, PrinterConfig.IP, () => {
        console.log(`[+] Connected to Printer at ${PrinterConfig.IP}:${PrinterConfig.PORT}`);
        
        const builder = new PrintJobBuilder();
        
        // --- 1. หัวบิล ---
        builder.align(ESCPOS.ALIGN_CENTER)
               .text("KITCHEN TICKET").feed()
               .text(data.date).feed()
               .text("------------------------------------------").feed()
               .text(`Round: ${data.timeLabel}`).feed()
               .text("------------------------------------------").feed(2);
               
        // --- 2. ชื่อเมนู และ จำนวน (ตัวใหญ่) ---
        builder.size(ESCPOS.TEXT_LARGE)
               .text(data.menuName).feed()
               .text(`[ QTY: ${data.totalQty} ]`).feed(2)
               .size(ESCPOS.TEXT_NORMAL);
               
        // --- 3. รายละเอียดออเดอร์ ---
        builder.text("------------------------------------------").feed()
               .align(ESCPOS.ALIGN_LEFT);
               
        if (data.orders && data.orders.length > 0) {
            data.orders.forEach(o => {
                builder.text(`${o.memberName}    x${o.qty}`).feed();
                if (o.note) builder.text(`  * ${o.note}`).feed();
            });
        }
        
        // --- 4. ท้ายบิลและคำสั่งตัดกระดาษ ---
        builder.feed(1)
               .text("------------------------------------------").feed()
               .align(ESCPOS.ALIGN_CENTER)
               .text("ERP KDS SYSTEM").feed(4)
               .cut();

        // ส่งข้อมูลที่ถูกแปลงแล้วไปยังเครื่องพิมพ์
        client.write(builder.build(), () => {
            console.log(`[+] ข้อมูลถูกส่งไปเครื่องปริ้นสำเร็จ.`);
            client.end();
        });
    });

    client.on('error', (err) => {
        console.error(`[-] เกิดข้อผิดพลาดการเชื่อมต่อ: ${err.message}`);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
    });

    client.on('timeout', () => {
        console.error('[-] เชื่อมต่อเครื่องปริ้นเกินเวลา (Timeout)');
        client.destroy();
        res.writeHead(504);
        res.end(JSON.stringify({ error: 'Timeout' }));
    });

    client.on('close', () => {
        if (!res.headersSent) {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
        }
    });
}

server.listen(3001, () => {
    console.log('\n=============================================');
    console.log('         ERP KDS PRINT PROXY ACTIVE          ');
    console.log('=============================================');
    console.log(`> Listening on  : http://localhost:3001`);
    console.log(`> Target Printer: ${PrinterConfig.IP}:${PrinterConfig.PORT}`);
    console.log(`> Encoding      : ${PrinterConfig.ENCODING}`);
    console.log('=============================================');
    console.log('Ready and waiting for print jobs...\n');
});
