# 17 — Design Tokens
## Clean Food CR

*ไฟล์นี้คือ "แหล่งข้อมูลจริงเดียว" (Single Source of Truth) ของค่าตัวเลขดีไซน์ทั้งหมด — ใช้ค่าจากไฟล์นี้เท่านั้นไม่ว่าจะทำงานบน Canva, Figma, หรือ Web/Code เพื่อให้หน้าตาออกมาเหมือนกันทุกแพลตฟอร์ม*

---

## 1. Spacing Tokens

| Token | Value (px) |
|---|---|
| XS | 8 |
| S | 16 |
| M | 24 |
| L | 40 |
| XL | 64 |
| XXL | 96 |

---

## 2. Radius Tokens

| Token | Value (px) | ใช้กับ |
|---|---|---|
| Radius-S | 12 | Badge, tag เล็ก |
| Radius-M | 24 | Card โปรโมชั่น/เมนู |
| Radius-L | 40 | Container ใหญ่, section, banner block |
| Radius-Pill | 999 | ปุ่ม CTA |

---

## 3. Component Tokens

| Component | Property | Value |
|---|---|---|
| Button | Height | 56px |
| Button | Padding แนวนอน | 32px |
| Card | Padding | 32px |
| Icon | Size (มาตรฐาน) | 24px |
| Icon | Size (เด่น/hero) | 40px |

---

## 4. Shadow Tokens

| Token | Value |
|---|---|
| Shadow-Card (soft) | `0 8 24 rgba(0,0,0,.08)` |
| Shadow-CTA (elevated) | `0 6 20 rgba(246,166,35,.25)` |

---

## 5. Color Tokens (อ้างอิงจากไฟล์ 02_Color_System.md)

| Token | Hex |
|---|---|
| color-primary | #6DBE45 |
| color-secondary | #4A8F2B |
| color-accent | #F6A623 |
| color-background | #F7F9F5 |
| color-text | #222222 |
| color-text-secondary | #666666 |
| color-success | #39B54A |
| color-error | #E53935 |

---

## 6. Typography Tokens (อ้างอิงจากไฟล์ 03_Typography.md)

| Token | Font | Weight | Size |
|---|---|---|---|
| font-display | Prompt | Bold/700 | 72–96px |
| font-h1 | Prompt | SemiBold/600 | 48–56px |
| font-h2 | Prompt | Medium/500 | 32–36px |
| font-price | Poppins | Bold/700 | 56–64px |
| font-body | Sarabun | Regular/400 | 20–24px |
| font-caption | Sarabun | Regular/400 | 14–16px |
| font-button | Prompt | SemiBold/600 | 20–22px |

---

## 7. ใช้งานจริงในแต่ละแพลตฟอร์ม

**Canva:** ตั้งค่า Brand Kit → ใส่ค่าสีตาม token, ฟอนต์ตาม token, ระยะ padding/margin ใช้ grid guide คูณด้วยค่า spacing (เช่น margin ขอบนอก = XL = 64px)

**Figma:** สร้าง Variables/Styles ชื่อ token ตรงกับตารางนี้เป๊ะ (เช่น `spacing/M`, `radius/pill`, `color/accent`) เพื่อให้เปลี่ยนค่าที่เดียวแล้วอัปเดตทุกไฟล์

**Web/Code:** แปลงเป็น CSS Variables ตรงตัว —

```css
:root {
  --spacing-xs: 8px;
  --spacing-s: 16px;
  --spacing-m: 24px;
  --spacing-l: 40px;
  --spacing-xl: 64px;
  --spacing-xxl: 96px;

  --radius-s: 12px;
  --radius-m: 24px;
  --radius-l: 40px;
  --radius-pill: 999px;

  --button-height: 56px;
  --card-padding: 32px;
  --icon-size: 24px;

  --shadow-card: 0 8px 24px rgba(0,0,0,.08);
  --shadow-cta: 0 6px 20px rgba(246,166,35,.25);

  --color-primary: #6DBE45;
  --color-secondary: #4A8F2B;
  --color-accent: #F6A623;
  --color-background: #F7F9F5;
  --color-text: #222222;
  --color-text-secondary: #666666;
  --color-success: #39B54A;
  --color-error: #E53935;
}
```

---

## 8. กฎการใช้ Token (ห้ามฝ่าฝืน)

- ห้ามใส่ค่าตัวเลข spacing/radius/shadow แบบ "เดาเอง" นอกตารางนี้ในทุกชิ้นงาน
- หากต้องการค่าตัวใหม่ (เช่น radius 20px สำหรับ container พิเศษ) ต้องเพิ่มเป็น token ใหม่ในไฟล์นี้ก่อน แล้วค่อยใช้งาน — ไม่ผสมค่าที่ไม่มีอยู่ใน token list ลงในงานจริง
- ไฟล์ 04, 05–13, 16 ทั้งหมดต้องอ้างอิงค่าเดียวกับตารางนี้เสมอ (ถ้าไฟล์ไหนมีค่าเลขไม่ตรงกับที่นี่ ให้แก้ไฟล์นั้นให้ตรง ไม่ใช่แก้ตารางนี้)
