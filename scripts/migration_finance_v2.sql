-- ============================================================
-- Clean Food ERP — Finance Split System v2
-- Migration Script — Run in Supabase SQL Editor
-- วันที่: 2026-05-07
-- ============================================================

-- 1. ตาราง Split Config — กำหนดสัดส่วนแยกเงินต่อประเภทโปรโมชั่น
CREATE TABLE IF NOT EXISTS public.erp_split_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_name text NOT NULL,                -- เช่น 'ผูกปิ่นโต 7 วัน', 'เพิ่มกล้าม Custom'
  promotion_type text NOT NULL DEFAULT 'PINTO', -- PINTO | MUSCLE | RETAIL | ADDON
  material_pct numeric NOT NULL DEFAULT 35,  -- 🟢 % ทุนวัตถุดิบ
  labor_pct numeric NOT NULL DEFAULT 15,     -- 🔵 % ค่าแรง
  ops_pct numeric NOT NULL DEFAULT 20,       -- 🟡 % ค่าดำเนินการ
  profit_pct numeric NOT NULL DEFAULT 30,    -- 🔴 % กำไรสุทธิ
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default configs
INSERT INTO public.erp_split_configs (config_name, promotion_type, material_pct, labor_pct, ops_pct, profit_pct, is_default, notes)
VALUES
  ('ผูกปิ่นโต (มาตรฐาน)', 'PINTO', 35, 15, 20, 30, true, 'สัดส่วนหลักสำหรับแพ็กเกจ 7/14/30 วัน'),
  ('เพิ่มกล้าม (Custom)', 'MUSCLE', 40, 10, 20, 30, true, 'วัตถุดิบสูงกว่าเพราะโปรตีนแพง'),
  ('ขายปลีกรายกล่อง', 'RETAIL', 35, 15, 20, 30, true, 'ราคาตามเมนู Tier 49-99 บาท');


-- 2. ตาราง Fund Pools — กองทุนหลัก 4 กอง
CREATE TABLE IF NOT EXISTS public.erp_fund_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type text NOT NULL UNIQUE,     -- MATERIAL | LABOR | OPS | PROFIT
  display_name text NOT NULL,
  display_name_public text NOT NULL,  -- ชื่อที่คนอื่นเห็น (ซ่อนความหมายจริง)
  current_balance numeric DEFAULT 0,
  total_in numeric DEFAULT 0,
  total_out numeric DEFAULT 0,
  target_amount numeric DEFAULT 0,    -- เป้าหมาย (เช่น OPS ต้องสะสม 10,000+)
  color_code text DEFAULT '#10b981',
  icon text DEFAULT '💰',
  visibility text DEFAULT 'ALL',      -- CEO_ONLY | MANAGER | ALL
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Seed 4 fund pools
INSERT INTO public.erp_fund_pools (pool_type, display_name, display_name_public, color_code, icon, visibility, target_amount, sort_order)
VALUES
  ('MATERIAL', 'ทุนวัตถุดิบ',  'ต้นทุนการผลิต',  '#22c55e', '🟢', 'ALL', 0, 1),
  ('LABOR',    'ค่าแรง/สวัสดิการ', 'สวัสดิการทีม',  '#3b82f6', '🔵', 'CEO_ONLY', 0, 2),
  ('OPS',      'ค่าดำเนินการ', 'ค่าดำเนินการ',    '#eab308', '🟡', 'MANAGER', 10000, 3),
  ('PROFIT',   'กำไรสุทธิ',   'สำรองธุรกิจ',      '#ef4444', '🔴', 'CEO_ONLY', 0, 4);


-- 3. ตาราง Revenue Buckets — แยกเงินเมื่อลูกค้าจ่าย
CREATE TABLE IF NOT EXISTS public.erp_revenue_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,          -- PACKAGE | ORDER | MUSCLE_CUSTOM
  source_id text,                     -- package_id หรือ order_id
  member_id uuid REFERENCES public.members(id),
  payment_id uuid REFERENCES public.payments(id),

  gross_amount numeric NOT NULL,      -- ยอดรวมที่ลูกค้าจ่าย
  delivery_fee numeric DEFAULT 0,     -- ค่าจัดส่ง (หักออกก่อน split)
  net_amount numeric NOT NULL,        -- ยอดหลังหักค่าส่ง = gross - delivery

  -- The Split (คำนวณจาก net_amount)
  split_config_id uuid REFERENCES public.erp_split_configs(id),
  material_pct numeric DEFAULT 35,
  labor_pct numeric DEFAULT 15,
  ops_pct numeric DEFAULT 20,
  profit_pct numeric DEFAULT 30,

  material_amount numeric NOT NULL,   -- 🟢
  labor_amount numeric NOT NULL,      -- 🔵
  ops_amount numeric NOT NULL,        -- 🟡
  profit_amount numeric NOT NULL,     -- 🔴

  description text,                   -- เช่น "แพ็กเกจ 14 วัน — คุณแพร"
  status text DEFAULT 'active',       -- active | completed | refunded
  period_start date,
  period_end date,
  notes text,
  private_note text,                  -- CEO only
  created_by uuid REFERENCES public.erp_staff(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);


-- 4. ตาราง Fund Transactions — ประวัติเงินเข้า/ออกแต่ละกอง
CREATE TABLE IF NOT EXISTS public.erp_fund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type text NOT NULL,            -- MATERIAL | LABOR | OPS | PROFIT
  direction text NOT NULL,            -- IN | OUT
  amount numeric NOT NULL,

  category text,                      -- หมวดย่อย
  description text,                   -- ทุกคนเห็น
  private_note text,                  -- CEO only

  source_type text DEFAULT 'MANUAL',  -- SPLIT | MANUAL | EXPENSE | TRANSFER
  source_id text,                     -- FK ไป revenue_buckets.id ถ้ามา auto

  receipt_url text,                   -- รูปใบเสร็จ (ถ้ามี)
  is_personal boolean DEFAULT false,  -- เป็นค่าใช้จ่ายส่วนตัว

  created_by uuid REFERENCES public.erp_staff(id),
  created_at timestamptz DEFAULT now()
);


-- 5. ตาราง Expense Categories — หมวดหมู่ค่าใช้จ่าย
CREATE TABLE IF NOT EXISTS public.erp_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pool_type text NOT NULL,            -- หักจากกองไหน
  icon text DEFAULT '📦',
  color text DEFAULT '#64748b',
  visibility text DEFAULT 'ALL',      -- CEO_ONLY | MANAGER | ALL
  is_personal boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed expense categories
INSERT INTO public.erp_expense_categories (name, pool_type, icon, color, visibility, is_personal, sort_order)
VALUES
  -- 🟢 MATERIAL pool
  ('ค่าวัตถุดิบ (เนื้อสัตว์)',   'MATERIAL', '🥩', '#22c55e', 'ALL', false, 1),
  ('ค่าวัตถุดิบ (ผัก/ผลไม้)',   'MATERIAL', '🥬', '#22c55e', 'ALL', false, 2),
  ('ค่าเครื่องปรุง',           'MATERIAL', '🧂', '#22c55e', 'ALL', false, 3),
  -- 🔵 LABOR pool
  ('ค่าอาหาร/ขนม (ส่วนตัว)',   'LABOR', '🍜', '#3b82f6', 'CEO_ONLY', true, 10),
  ('ค่าอาหารแมว',             'LABOR', '🐱', '#3b82f6', 'CEO_ONLY', true, 11),
  ('ค่าของใช้ส่วนตัว',         'LABOR', '🧴', '#3b82f6', 'CEO_ONLY', true, 12),
  -- 🟡 OPS pool
  ('ค่ากล่อง/ถุง/ช้อน',        'OPS', '📦', '#eab308', 'ALL', false, 20),
  ('ค่าแก๊ส',                 'OPS', '🔥', '#eab308', 'ALL', false, 21),
  ('ค่าไฟฟ้า',                'OPS', '⚡', '#eab308', 'ALL', false, 22),
  ('ค่าน้ำประปา',              'OPS', '💧', '#eab308', 'ALL', false, 23),
  ('ค่าน้ำมันรถ/บำรุงรถ',      'OPS', '⛽', '#eab308', 'ALL', false, 24),
  ('ค่าบิลอื่นๆ',             'OPS', '📄', '#eab308', 'MANAGER', false, 25),
  -- 🔴 PROFIT (ปกติไม่ควรมีรายจ่าย แต่กรณีฉุกเฉิน)
  ('เบิกฉุกเฉิน',             'PROFIT', '🚨', '#ef4444', 'CEO_ONLY', false, 30);


-- 6. Indexes สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_fund_tx_pool ON public.erp_fund_transactions(pool_type);
CREATE INDEX IF NOT EXISTS idx_fund_tx_created ON public.erp_fund_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_bucket_member ON public.erp_revenue_buckets(member_id);
CREATE INDEX IF NOT EXISTS idx_revenue_bucket_created ON public.erp_revenue_buckets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_bucket_source ON public.erp_revenue_buckets(source_type, source_id);


-- 7. RLS Policies (Row Level Security)
ALTER TABLE public.erp_fund_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_revenue_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_split_configs ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (fine-grained control in app layer)
CREATE POLICY "Allow all for authenticated" ON public.erp_fund_pools FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON public.erp_revenue_buckets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON public.erp_fund_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON public.erp_expense_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON public.erp_split_configs FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- ✅ DONE — Run this in Supabase SQL Editor
-- ============================================================
