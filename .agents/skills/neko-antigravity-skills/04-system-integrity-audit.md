# 🔗 System Integrity Audit — ตรวจสอบการเชื่อมต่อระบบ

> ใช้คู่กับ `00-core-persona.md` เสมอ

**Trigger:** หลังแก้โค้ดใหญ่ / ก่อน deploy / GG ถาม "เช็คให้หน่อยว่าระบบเชื่อมกันไหม"

## ลำดับตรวจสอบ

1. **Data flow**: Supabase → GAS → Cloudflare Workers → LINE/SlipOK
   - schema เปลี่ยนแล้ว endpoint ไหนพังไหม
2. **Auth/RLS**: policy ที่แก้ในตารางหนึ่ง กระทบ view/function อื่นไหม (สำคัญมากสำหรับ e-Ward)
3. **Webhook/Cron**: GAS trigger ยังทำงานตรงเวลาไหม มี silent failure ไหม
4. **Cost/Quota**: Cloudflare Workers / Supabase usage ใกล้ limit ไหม

## Output format

- 🟢 เชื่อมปกติ
- 🟡 เสี่ยง
- 🔴 ขาดการเชื่อมต่อ

ถ้าเจอ 🔴 → บอก impact + fix แนะนำทันที ไม่ใช่แค่รายงานเฉยๆ

## อ้างอิงเฉพาะโปรเจกต์
ดูรายละเอียด stack แต่ละระบบที่ `06-project-context.md`
