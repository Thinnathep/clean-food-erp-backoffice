# Page-by-Page Design & UI/UX Standards — Clean Food CR ERP

> ออกแบบตามแนวทาง `frontend-design` ให้มีเอกลักษณ์ เป็นมืออาชีพ (Clean, High-Density, Data-Rich Enterprise) หลีกเลี่ยงดีไซน์แบบ AI Template สำเร็จรูป

---

## 1. Design System & Aesthetics (อัตลักษณ์การออกแบบ)

- **Design Persona**: Modern Culinary Engineering & High-Precision Operations
- **Color Palette**:
  - Primary Background: Slate-950 / Slate-900 (Dark Slate Enterprise) หรือ Slate-50 (Crisp Light Mode)
  - Accent / Primary Action: Emerald-500 / Emerald-600 (Healthy Organic Food & Energy)
  - Information / Analytics: Indigo-500 / Cyan-500
  - Warnings / Food Safety HACCP: Amber-500 / Orange-500
  - Danger / Churn / Deficit: Rose-500 / Red-500
- **Typography**:
  - Thai Font: Prompt / Sarabun / Kanit (ความอ่านง่ายสูง ชัดเจนในจอครัวและตารางข้อมูล)
  - Data / Monospace: JetBrains Mono / Fira Code (สำหรับตัวเลขการเงิน, Order ID, Barcode, พิกัด GPS)
- **Component Density**:
  - High-Density Data Tables (TanStack Table พร้อม Virtual Scrolling สำหรับข้อมูลนับพันแถว)
  - Compact Status Pills with Pulsing Dots สำหรับสถานะ Realtime

---

## 2. Page-by-Page Architecture & Direction (ทิศทางแต่ละหน้าจอ)

### 2.1 หน้า Dashboard & KDS (Kitchen Display System) — `/kds`
- **เป้าหมาย**: จอสั่งการครัว ควบคุมการผลิตประจำวันแบบ Realtime
- **ส่วนประกอบสำคัญ**:
  1. **Daily Meal Planner & Schedule Matrix**: ตารางปฏิทินแสดงเมนูที่ต้องส่งวันนี้ แยกตามมื้อ (Meal 1 - 6) และรอบเวลา
  2. **Smart Production Sheet**: สรุปยอดรวมจำนวนกล่องที่ต้องทำวันนี้ (Aggregated by Menu Item) เพื่อให้เชฟปรุงทีละกระทะใหญ่ได้
  3. **Realtime Order Queue**: การ์ดออเดอร์พร้อมตัวนับเวลา (Timer) แจ้งเตือนเมื่อใกล้เวลาจัดส่ง
  4. **Sound & Printer Station**: เชื่อมต่อเครื่องพิมพ์สลิปและระบบเสียงแจ้งเตือนออเดอร์ใหม่

### 2.2 หน้าใบสั่งผลิต & HACCP — `/kds/production` & `/kds/haccp`
- **เป้าหมาย**: ควบคุมคุณภาพและความปลอดภัยอาหารระดับมาตรฐานสากล
- **ส่วนประกอบสำคัญ**:
  1. **Production Order Batching**: ออกใบสั่งผลิตแยกกะเช้า/เย็น, ยืนยันยอดผลิตจริงและของเสีย (Yield & Waste Tracking)
  2. **HACCP Food Safety Logger**: บันทึกอุณหภูมิตู้เย็น/ช่องฟรีซ อุณหภูมิอาหารหลังปรุงสุก การฆ่าเชื้อ พร้อมอัปโหลดรูปภาพหลักฐาน
  3. **Auto BOM Stock Deduction**: ปุ่มเดียวตัดสต็อกวัตถุดิบและบรรจุภัณฑ์ตามสูตรอาหารอัตโนมัติ

### 2.3 หน้าสมาชิก & โปรโมชั่น CRM — `/members` & `/promotions`
- **เป้าหมาย**: บริหารความสัมพันธ์ลูกค้าและการผูกปิ่นโตระยะยาว
- **ส่วนประกอบสำคัญ**:
  1. **Member 360 View**: ข้อมูลส่วนตัว ประวัติการสั่ง ยอด LTV สถิติ Streak และประวัติการแพ้อาหาร
  2. **Pinto Package Manager**: จัดการรอบวันคงเหลือ จำนวนมื้อคงเหลือ (รองรับการพักแพ็กเกจ/ต่ออายุอัตโนมัติ)
  3. **AI Churn Radar**: กราฟแสดงความเสี่ยงลูกค้าที่อาจหยุดสั่ง พร้อมปุ่มส่งโปรโมชั่นทาง LINE OA ทันที
  4. **Buddy & Group Order Hub**: บริหารกลุ่มเพื่อนสั่งด้วยกันและออเดอร์องค์กร

### 2.4 หน้าคลังสินค้า & สต็อกวัตถุดิบ (WMS) — `/inventory/items` & `/inventory/stock`
- **เป้าหมาย**: ควบคุมต้นทุนวัตถุดิบ ป้องกันของขาด/ของหมดอายุ
- **ส่วนประกอบสำคัญ**:
  1. **Ingredient Master**: แคตตาล็อกวัตถุดิบพร้อมราคาทุนเฉลี่ย (Moving Average Cost) และจุดสั่งซื้อซ้ำ (Reorder Point)
  2. **Batch & Expiry Tracker (FIFO)**: ล็อตสินค้าพร้อมแจ้งเตือนวัตถุดิบใกล้หมดอายุ 3-5 วันล่วงหน้า
  3. **Multi-Location Matrix**: แยกคลังเก็บ (Dry Storage, Chiller 0-4°C, Freezer -18°C)
  4. **Stock Take & Variance Adjustments**: ระบบตรวจนับสต็อกประจำสัปดาห์ คำนวณ Discrepancy % ทันที

### 2.5 หน้าจัดซื้อ & ซัพพลายเออร์ (Procurement) — `/procurement` & `/procurement/receiving`
- **เป้าหมาย**: กระบวนการจัดซื้อที่มีประสิทธิภาพและตรวจสอบได้
- **ส่วนประกอบสำคัญ**:
  1. **Supplier Comparison & Price Lists**: เปรียบเทียบราคาวัตถุดิบจากคู่ค้าแต่ละราย
  2. **PO Generator**: ออกใบสั่งซื้ออัตโนมัติจากยอดวัตถุดิบที่ต้องใช้ในแผนการผลิตสัปดาห์หน้า
  3. **Goods Receiving (GR) with QC**: หน้าตรวจรับสินค้า ตรวจสอบปริมาณ วันหมดอายุ สภาพสินค้า และบันทึกเข้าคลังพร้อมต้นทุนจริง

### 2.6 หน้าจัดการเมนู & สูตรอาหาร (BOM) — `/menu/member`, `/menu/retail`, `/menu/settings`
- **เป้าหมาย**: วิศวกรรมเมนูอาหารเพื่อสุขภาพ ควบคุมคุณค่าทางโภชนาการและต้นทุน
- **ส่วนประกอบสำคัญ**:
  1. **32 Master Healthy Dishes**: รูปภาพ โภชนาการ (Calories, Protein, Carbs, Fat, Sodium)
  2. **Recipe BOM Editor**: ใส่ส่วนผสม คำนวณต้นทุน Food Cost % แบบ Dynamic Realtime
  3. **Step-by-Step Culinary SOP**: ขั้นตอนการเตรียมและปรุงอาหารสำหรับผู้ช่วยเชฟ

### 2.7 หน้าบัญชีและการเงิน 4 กองทุน — `/finance`
- **เป้าหมาย**: มองเห็นสุขภาพทางการเงินแบบ Realtime แยกเงินชัดเจน ไม่ปะปน
- **ส่วนประกอบสำคัญ**:
  1. **4-Fund Visual Pool Cards**: บัตรแสดงสถานะเงิน 4 กอง (Material, Labor, Ops, Profit) + Delivery Pool
  2. **Automatic Revenue Split Engine**: แสดงประวัติการแยกเงินจากทุกบิลขาย
  3. **Daily Cash Reconciliation**: หน้ากระทบยอดเงินสดปลายวัน เปรียบเทียบยอดขายกับเงินในลิ้นชัก
  4. **E-Tax Invoice & Receipt Manager**: ออกใบกำกับภาษีเต็มรูป/ใบเสร็จรับเงินตามมาตรฐานกรมสรรพากร
  5. **Monthly P&L Statement**: งบกำไรขาดทุนแสดงรายได้ หัก COGS และ OPEX แสดง Net Margin %

### 2.8 หน้าจัดการจัดส่ง & โลจิสติกส์ — `/logistics` & `/logistics/routes`
- **เป้าหมาย**: ส่งมอบอาหารตรงเวลา ควบคุมค่าน้ำมัน และความสดใหม่ของอาหาร
- **ส่วนประกอบสำคัญ**:
  1. **Packing Station**: จอจัดถุงตามรอบส่ง แสดงสรุปรายการอาหารต่อสมาชิกและจุดส่ง
  2. **Route Optimization & Stop Sequence**: จัดลำดับจุดส่งที่ประหยัดเวลาและน้ำมันที่สุดบนแผนที่ Leaflet/MapLibre
  3. **Rider Live Dispatch & Fuel Claim**: ติดตามพิกัดไรเดอร์ ตรวจสอบ KPI และระบบคำนวณเบิกค่าน้ำมันตามระยะทาง GPS จริง
