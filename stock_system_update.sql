-- =============================================================================
-- SQL Update Script: Inventory & Stock System Enhancement
-- Date: 2026-05-03
-- Description: เพิ่มโครงสร้างสำหรับระบบแปลงหน่วย, คลังสินค้าหลายจุด และการปรับปรุงยอดสต็อก
-- =============================================================================

-- 1. ระบบแปลงหน่วย (Unit Conversions)
-- แก้ปัญหาการซื้อเป็น "ลัง" หรือ "แพ็ค" แต่ใช้ใน Recipe เป็น "กรัม" หรือ "มิลลิลิตร"
CREATE TABLE IF NOT EXISTS public.erp_unit_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  from_unit text NOT NULL, -- หน่วยต้นทาง เช่น 'ลัง'
  to_unit text NOT NULL,   -- หน่วยปลายทาง เช่น 'กิโลกรัม'
  conversion_factor numeric NOT NULL, -- ตัวคูณแปลงหน่วย เช่น 25.00
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_unit_conversions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_conversion_item FOREIGN KEY (item_id) REFERENCES public.erp_inventory_items(id)
);

-- 2. ระบบจัดการคลังสินค้าหลายจุด (Storage Locations)
-- รองรับการแยกที่เก็บของ เช่น 'ตู้เย็นเย็นจัด', 'ชั้นวางแห้ง', 'คลังสินค้าหลัก'
CREATE TABLE IF NOT EXISTS public.erp_inventory_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL, -- เช่น 'ตู้เย็น A', 'ชั้นแห้ง B'
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_inventory_locations_pkey PRIMARY KEY (id)
);

-- เพิ่มฟิลด์ location_id ในตารางธุรกรรมสต็อกเดิม (ถ้ายังไม่มี)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_inventory_transactions' AND column_name='location_id') THEN
        ALTER TABLE public.erp_inventory_transactions ADD COLUMN location_id uuid;
        ALTER TABLE public.erp_inventory_transactions ADD CONSTRAINT fk_inventory_tx_location FOREIGN KEY (location_id) REFERENCES public.erp_inventory_locations(id);
    END IF;
END $$;

-- 3. ระบบนับสต็อกและปรับปรุงยอด (Inventory Adjustments)
-- บันทึกประวัติการนับสต็อกจริง เพื่อดูผลต่าง (Discrepancy) โดยไม่บล็อกการทำงาน
CREATE TABLE IF NOT EXISTS public.erp_inventory_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  location_id uuid,
  expected_qty numeric NOT NULL, -- ยอดที่ระบบคำนวณได้
  actual_qty numeric NOT NULL,   -- ยอดที่นับได้จริงจากชั้นวาง
  discrepancy numeric GENERATED ALWAYS AS (actual_qty - expected_qty) STORED,
  reason text, -- เช่น 'ของเน่าเสีย', 'นับผิด', 'โดนขโมย'
  adjusted_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_inventory_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT fk_adj_item FOREIGN KEY (item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT fk_adj_location FOREIGN KEY (location_id) REFERENCES public.erp_inventory_locations(id),
  CONSTRAINT fk_adj_staff FOREIGN KEY (adjusted_by) REFERENCES public.erp_staff(id)
);

-- 4. การจัดการสต็อกติดลบ (Soft Enforcement)
-- หมายเหตุ: ระบบอนุญาตให้ current_stock ใน erp_inventory_items ติดลบได้โดยธรรมชาติ (numeric)
-- เพื่อให้ ऑपरेशन เดินหน้าต่อได้ และค่อยมา Adjust ยอดภายหลัง

COMMENT ON TABLE public.erp_unit_conversions IS 'ตารางเก็บค่าการแปลงหน่วยวัตถุดิบ (เช่น ลัง -> กก.)';
COMMENT ON TABLE public.erp_inventory_locations IS 'ตารางเก็บข้อมูลสถานที่เก็บสินค้า/วัตถุดิบ';
COMMENT ON TABLE public.erp_inventory_adjustments IS 'ตารางบันทึกการตรวจนับสต็อกและผลต่าง';
