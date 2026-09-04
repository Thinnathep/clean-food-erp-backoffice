-- ==============================================================================
-- Clean Food CR ERP — 7-Fund Accounting & Standard Packages Upgrade (04/08/2569)
-- ==============================================================================
-- Rule 1: Database-First Enforcement & Zero Breaking Changes
-- Additive columns only (DEFAULT 0) to guarantee existing records remain valid.
-- All authorization logic enforced at PostgreSQL RLS level.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Additive columns on erp_split_configs
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.erp_split_configs
  ADD COLUMN IF NOT EXISTS packaging_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_sub_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_pct numeric DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 2. Additive columns on erp_revenue_buckets
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.erp_revenue_buckets
  ADD COLUMN IF NOT EXISTS packaging_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_sub_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_sub_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS marketing_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance_amount numeric DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 3. Add delivery_rounds to promotions and pinto_packages
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.promotions
  ADD COLUMN IF NOT EXISTS delivery_rounds integer DEFAULT NULL;

ALTER TABLE IF EXISTS public.pinto_packages
  ADD COLUMN IF NOT EXISTS delivery_rounds integer DEFAULT NULL;

-- ------------------------------------------------------------------------------
-- 4. Seed / Update erp_fund_pools for 7-Fund Architecture
-- ------------------------------------------------------------------------------
INSERT INTO public.erp_fund_pools (
  pool_type, display_name, display_name_public, current_balance, total_in, total_out, target_amount, color_code, icon, visibility, sort_order
) VALUES
  ('MATERIAL', 'กองทุนวัตถุดิบ', 'ต้นทุนวัตถุดิบ', 0, 0, 0, 50000, '#10b981', '🟢', 'ALL', 1),
  ('PACKAGING_BILLS', 'ค่าบิล & ถุงซีล', 'ค่าถุงซีล & บิล', 0, 0, 0, 20000, '#eab308', '🟡', 'ALL', 2),
  ('LABOR', 'ค่าแรงคนทำ', 'ค่าตอบแทนทีมงาน', 0, 0, 0, 30000, '#3b82f6', '🔵', 'ALL', 3),
  ('DELIVERY', 'กองทุนจัดส่ง & ช่วยค่าส่ง Grab', 'งบจัดส่งและไรเดอร์', 0, 0, 0, 25000, '#f97316', '🛵', 'ALL', 4),
  ('MARKETING', 'งบการตลาด (Ads/Content)', 'การตลาดและโฆษณา', 0, 0, 0, 15000, '#8b5cf6', '📢', 'ALL', 5),
  ('MAINTENANCE', 'ทุนสำรอง/ซ่อมบำรุง', 'ซ่อมบำรุงและสำรองฉุกเฉิน', 0, 0, 0, 15000, '#64748b', '🛠️', 'ALL', 6),
  ('PROFIT', 'กำไรสุทธิเข้ากระเป๋า (18% + เศษ 1%)', 'สำรองธุรกิจ & กำไร', 0, 0, 0, 100000, '#ec4899', '🔴', 'CEO_ONLY', 7)
ON CONFLICT (pool_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  display_name_public = EXCLUDED.display_name_public,
  color_code = EXCLUDED.color_code,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------------------------
-- 5. Insert New Default 7-Fund Split Configuration (04/08/2569)
-- ------------------------------------------------------------------------------
-- Set existing default configs to non-default first and deactivate obsolete 4-fund configs
UPDATE public.erp_split_configs 
SET is_default = false 
WHERE promotion_type = 'PINTO' AND is_default = true;

UPDATE public.erp_split_configs
SET is_active = false
WHERE ops_pct > 0 OR config_name LIKE '%35/15%' OR config_name LIKE '%1799%' OR config_name LIKE '%40/10/20/30%';

INSERT INTO public.erp_split_configs (
  config_name,
  promotion_type,
  material_pct,
  packaging_pct,
  labor_pct,
  delivery_sub_pct,
  marketing_pct,
  maintenance_pct,
  profit_pct,
  ops_pct,
  is_default,
  is_active,
  notes
) VALUES (
  'สูตรมาตรฐาน 04/08/2569 (7 กองทุน)',
  'PINTO',
  40,
  10,
  14,
  9,
  4,
  4,
  19,
  0,
  true,
  true,
  'มาตรฐาน 04/08/2569: วัตถุดิบ 40%, บิล/ถุงซีล 10%, ค่าแรง 14%, ช่วยส่ง Grab 9%, การตลาด 4%, ซ่อมบำรุง 4%, กำไรสุทธิ 19% (18% ปันผล + 1% เศษสำรอง)'
);

-- ------------------------------------------------------------------------------
-- 6. RLS Verification
-- ------------------------------------------------------------------------------
-- Verify RLS is enabled
ALTER TABLE IF EXISTS public.erp_fund_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_revenue_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_split_configs ENABLE ROW LEVEL SECURITY;
