# 🏛️ 01: สถาปัตยกรรม .NET 10, Cloud Azure & Low-Code Strategy

เอกสารอ้างอิงเชิงลึกสำหรับออกแบบระบบ .NET Core และคลาวด์ Azure อย่างคุ้มค่า ปลอดภัย และประหยัด Token

---

## 1. เกณฑ์การเลือก Architecture (Decision Matrix)

| สถาปัตยกรรม | ขนาดทีม / บริบท | ข้อดีเด่น | กับดักที่พบบ่อย (Pitfalls) |
|---|---|---|---|
| **Modular Monolith** ⭐ | 1-5 คน / เริ่มต้น MVP | แยกโมดูลอิสระแต่รันโปรเซสเดียว, Debug ง่าย, Deploy เร็ว | โมดูลอ้างอิงข้ามกันตรงๆ โดยไม่ผ่าน Interface/Event |
| **Clean Architecture** | 3-10 คน / องค์กรที่เน้น Unit Test | Business Logic แยกจาก Framework และ DB 100% | Over-engineering, DTO/Mapping ซ้ำซ้อนหลายชั้น |
| **Vertical Slice** | ทีมที่เน้นฟีเจอร์อิสระ | รวม Command/Query/DTO ของฟีเจอร์ไว้ในโฟลเดอร์เดียว | ต้องคุมระเบียบโค้ดให้ดี ไม่ให้แต่ละ Slice เขียนมั่ว |
| **Microservices** | ทีม > 20 คน / สเกลมหาศาล | แยก Scale และแยก Deploy แต่ละ Service ได้อิสระ | Network Latency, Distributed Transactions, ค่าดูแลรักษาสูงมาก |

---

## 2. EF Core Performance Tuning (เทคนิคระดับ Senior)

1. **ดักจับ N+1 Query Problem:**
   * ❌ *แย่:* วนลูป Query ใน Database ทีละแถว (ยิง 100 รอบ = ช้ามาก)
   * ✅ *ดี:* ใช้ `.Include(...)` หรือ `.Select(...)` ดึงรอบเดียวจบ (SQL JOIN)
2. **อ่านอย่างเดียวให้ใช้ `.AsNoTracking()`:**
   ```csharp
   // เพิ่มความเร็ว 30-40% และลด Memory ในการอ่านข้อมูล (GET APIs)
   var items = await _db.Products.AsNoTracking().ToListAsync();
   ```
3. **Pagination (การตัดแบ่งหน้าเพื่อประหยัด RAM):**
   ```csharp
   // ใช้ Skip/Take ร่วมกับ OrderBy เสมอ
   var paged = await query.OrderBy(x => x.Id).Skip((page - 1) * size).Take(size).ToListAsync();
   ```

---

## 3. กลยุทธ์ Azure Cost Optimization (CFO & Cloud Architect)

* **Compute:**
  * **Azure Container Apps (Consumption Tier):** จ่ายตามการใช้งานจริง (Scale to 0 เมื่อไม่มี Request) เหมาะกับ API ทั่วไปและระบบภายใน ประหยัดได้ถึง 60-80% เทียบกับเปิด VM ค้างไว้
  * **Azure App Service (Linux B1/P1v3):** เหมาะกับงานที่มี Traffic สม่ำเสมอตลอด 24 ชม.
* **Database:**
  * **Azure SQL (Serverless Tier):** หยุดทำงานอัตโนมัติเมื่อไม่มีคนใช้ (Auto-pause) ลดค่าใช้จ่ายในเวลากลางคืน
* **Network & Storage:**
  * เก็บรูปภาพ/ไฟล์ใน **Azure Blob Storage (Cool Tier)** แทนการเก็บใน Database โดยตรง
