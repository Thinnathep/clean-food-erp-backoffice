# Domain Logic & Mathematical Calculations — Clean Food CR ERP

> รวมสูตรคำนวณและ Business Logic ที่เป็นแกนหลักของ Clean Food Chiang Rai ERP

---

## 1. Recipe Engineering & Bill of Materials (BOM)

### 1.1 การคำนวณต้นทุนต่อจาน (Dish Costing)

$$\text{Dish Food Cost} = \sum_{i=1}^{n} \left( \frac{\text{Quantity Required}_i \times \text{Avg Unit Cost}_i}{\text{Yield Percentage}_i / 100} \right)$$

$$\text{Total Dish Cost} = \text{Dish Food Cost} + \text{Packaging Cost} + \text{Labor Cost} + \text{Overhead Cost}$$

$$\text{Cost Percentage (GP Baseline)} = \left( \frac{\text{Dish Food Cost}}{\text{Base Price}} \right) \times 100$$

- **เป้าหมายของ Clean Food CR**:
  - `Dish Food Cost` ควรอยู่ที่ **20 – 25 บาท/กล่อง**
  - `Cost Percentage` ไม่ควรเกิน **35%** (Gross Profit $\ge 65\%$)

### 1.2 การตัดสต็อกวัตถุดิบอัตโนมัติ (Automated BOM Deduction)

เมื่อปิดกะผลิตหรือยืนยันใบสั่งผลิต (`erp_production_orders` status = `completed`):

$$\text{Deducted Quantity}_i = \text{Actual Produced Quantity} \times \frac{\text{Quantity Required}_i}{\text{Yield Percentage}_i / 100}$$

บันทึกลงตาราง:
- `erp_stock_deductions` (บันทึกรายละเอียดยอดหัก)
- `erp_inventory_transactions` (type = 'PRODUCTION_DEDUCTION')
- `erp_inventory_items` (ลด `current_stock` ตามจำนวนที่หัก)

---

## 2. 4-Fund Revenue Split Calculation (การแยกเงิน 4 กอง)

เมื่อมีรายรับจากการขายแพ็กเกจหรือออเดอร์ (`payments` status = `VERIFIED`):

1. หักค่าจัดส่งออกก่อนเพื่อแยกเข้า `DELIVERY_POOL`:
   $$\text{Net Sales} = \text{Gross Amount} - \text{Delivery Fee}$$

2. กระจายเงินเข้า 4 กองทุนหลักตามสัดส่วน `erp_split_configs`:
   - **Material Pool (35%)**: $\text{Material Amount} = \text{Net Sales} \times 0.35$
   - **Labor Pool (15%)**: $\text{Labor Amount} = \text{Net Sales} \times 0.15$
   - **Operations Pool (20%)**: $\text{Ops Amount} = \text{Net Sales} \times 0.20$
   - **Profit Pool (30%)**: $\text{Profit Amount} = \text{Net Sales} \times 0.30$

3. อัปเดต `erp_fund_pools` และบันทึกลง `erp_revenue_buckets` & `erp_fund_transactions`

---

## 3. Delivery Fee & Distance Matrix (การคำนวณค่าจัดส่ง)

- **จุดศูนย์กลาง (Origin)**: ค่ายเม็งรายมหาราช จ.เชียงราย (Lat: 19.9105, Lng: 99.8267)
- **กฎระยะทาง**:
  - ระยะทาง $\le 5.0\text{ km}$: **ฟรี (0 บาท)**
  - ระยะทาง $> 5.0\text{ km}$: คิด $10\text{ บาท/กม.}$ ในระยะที่เกิน 5 กม. หรือส่งรวมที่ Drop Point
  - **โปรโมชั่นส่งฟรี**: หากยอดสั่งซื้อ $\ge 500\text{ บาท}$ ฟรีค่าจัดส่งในระยะ 10 กม.

$$\text{Delivery Fee} = \begin{cases} 0 & \text{if } \text{Distance} \le 5.0 \\ (\text{Distance} - 5.0) \times 10 & \text{if } \text{Distance} > 5.0 \end{cases}$$

---

## 4. Rider Compensation & Fuel Claim (ค่าตอบแทนไรเดอร์)

$$\text{Rider Pay per Delivery} = 25\text{ บาท/จุดส่ง}$$

$$\text{Fuel Compensation} = \text{Total Distance (km)} \times 3.00\text{ บาท/กม.}$$

$$\text{Total Rider Payout} = \sum \text{Rider Pay} + \text{Fuel Compensation} + \text{Surcharges}$$

---

## 5. Churn Prediction & Risk Score Model (การประเมินความเสี่ยงลูกค้า)

$$\text{Churn Score} = (w_1 \times S_{\text{recency}}) + (w_2 \times S_{\text{frequency}}) + (w_3 \times S_{\text{streak}}) + (w_4 \times S_{\text{satisfaction}})$$

- $S_{\text{recency}}$: วันนับจากออเดอร์ล่าสุด (> 14 วัน = ความเสี่ยงสูง)
- $S_{\text{frequency}}$: ความถี่การสั่งซื้อใน 30 วันที่ผ่านมา
- $S_{\text{streak}}$: การสั่งต่อเนื่อง (ถ้า Streak ขาด คะแนนความเสี่ยงจะเพิ่มขึ้น)
- $S_{\text{satisfaction}}$: คะแนนรีวิวเฉลี่ย (1-5 ดาว)

**ระดับความเสี่ยง (Risk Levels)**:
- `0.0 - 0.3`: Low Risk (ปกติ)
- `0.31 - 0.6`: Medium Risk (ต้องติดตาม)
- `0.61 - 0.8`: High Risk (ส่งโปรโมชั่นกระตุ้น)
- `0.81 - 1.0`: Critical Risk (โทรสอบถาม/ดูแลเป็นพิเศษ)
