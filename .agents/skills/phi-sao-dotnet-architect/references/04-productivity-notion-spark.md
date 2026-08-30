# 🧠 04: การจัดระเบียบความคิด & เครื่องมือเสริม (Notion, Gemini Spark & Token Economy)

คู่มือการจัดการสมองเมื่อความคิดตีกันในหัว การใช้ Notion, Gemini Spark และเทคนิคประหยัด Token

---

## 1. การแก้ปัญหา Cognitive Overload ด้วย 3-Step Brain Dump

เมื่อไหร่ที่สมองเริ่มล้า ลังเล หรือคิดวน ให้ใช้กระบวนการ **Dump ➔ Filter ➔ Execute**:

1. **Dump:** เททุกอย่างในหัวลง Notion หรือกระดาษ โดยห้ามเรียบเรียง ห้ามตัดสินไอเดีย (เขียนเป็น Bullet สั้นๆ)
2. **Filter (จัดลง 3 ถัง):**
   * 🟢 **Now (MVP):** ต้องทำเดี๋ยวนี้เพื่อส่งงาน/เปิดตัว (เอาเฉพาะสิ่งที่ขาดไม่ได้)
   * 🟡 **Next:** เก็บไว้ทำเวอร์ชันถัดไป (ของดีแต่ยังไม่ด่วน)
   * 🔴 **Trash / Later:** ไอเดียเพ้อฝัน ตัดทิ้งชั่วคราวเพื่อลดภาระสมอง
3. **Execute:** โฟกัสเฉพาะถัง **Now** ทีละ 1 บรรทัดเท่านั้น

---

## 2. โครงสร้าง Notion Template สำหรับงานเทคโนโลยี (Notion Tech Schema)

| Database ใน Notion | คอลัมน์ที่ต้องมี (Properties) | ประโยชน์ |
|---|---|---|
| **📄 Feature Specs** | Name, Module, Priority (P0/P1/P2), Status (To Do/In Progress/Done), Assignee | รวม Requirement ทั้งหมดไว้ที่เดียว |
| **🔌 API Endpoints** | Method (GET/POST), Route, Request Schema, Response Schema, Auth Level | ใช้เป็นสัญญาตกลงระหว่าง Frontend & Backend |
| **🐞 Mistake & Learnings** | Date, Bug Description, Root Cause, Solution, Prevention Rule | สมุดบันทึกข้อผิดพลาดเพื่อไม่ให้ทำซ้ำ |

---

## 3. กลยุทธ์การประหยัด Token สูงสุด (Token Optimization Tactics)

* **กฎ 80/20 ในการ Prompt:** บอกเฉพาะ **[สถานะปัจจุบัน] + [สิ่งที่ต้องการ] + [ข้อจำกัด]** เลี่ยงการพิมพ์คำเชื่อมเยิ่นเย้อ
* **Modular Context:** ถามและทำทีละฟังก์ชัน/ทีละไฟล์ แทนที่จะสั่งให้ทำทั้งโปรเจกต์ในคำสั่งเดียว
* **Static Memory (Skills):** เก็บความรู้ถาวรและกฎประจำตัวไว้ใน `SKILL.md` เพื่อให้ AI ดึงอัตโนมัติ ไม่ต้องสั่งซ้ำในแชท
