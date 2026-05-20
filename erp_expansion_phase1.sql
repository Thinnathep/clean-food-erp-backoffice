-- ============================================================
-- Clean Food ERP — Database Expansion Phase 1
-- ============================================================
-- WARNING: Review carefully before running in production.
-- All tables use uuid primary keys and follow existing naming conventions.
-- Compatible with existing erp_* schema on Supabase (PostgreSQL 15+).
-- ============================================================

-- ============================================================
-- MODULE 1: KITCHEN DEPTH (ครัวเชิงลึก)
-- ============================================================

-- 1.1 Production Orders (ใบสั่งผลิตอาหาร)
CREATE TABLE IF NOT EXISTS public.erp_production_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text DEFAULT 'morning', -- morning / evening
  status text NOT NULL DEFAULT 'draft', -- draft / in_progress / completed / cancelled
  total_items integer DEFAULT 0,
  total_produced integer DEFAULT 0,
  total_waste integer DEFAULT 0,
  stock_deducted boolean DEFAULT false,
  notes text,
  created_by uuid,
  approved_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_production_orders_pkey PRIMARY KEY (id),
  CONSTRAINT erp_production_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_production_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_production_orders_status_chk CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled'))
);

-- 1.2 Production Order Items (รายละเอียดเมนูในใบสั่งผลิต)
CREATE TABLE IF NOT EXISTS public.erp_production_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  planned_qty integer NOT NULL DEFAULT 0,
  actual_qty integer DEFAULT 0,
  waste_qty integer DEFAULT 0,
  yield_percentage numeric DEFAULT 100.0,
  notes text,
  status text DEFAULT 'pending', -- pending / cooking / done / cancelled
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_production_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT erp_poi_production_order_fkey FOREIGN KEY (production_order_id) REFERENCES public.erp_production_orders(id) ON DELETE CASCADE,
  CONSTRAINT erp_poi_menu_item_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);

-- 1.3 Stock Deductions (บันทึกการตัดสต็อกอัตโนมัติตาม BOM)
CREATE TABLE IF NOT EXISTS public.erp_stock_deductions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  production_order_id uuid NOT NULL,
  production_order_item_id uuid,
  inventory_item_id uuid NOT NULL,
  recipe_id uuid,
  qty_deducted numeric NOT NULL,
  unit text NOT NULL,
  unit_cost_at_deduction numeric DEFAULT 0.00,
  total_cost numeric DEFAULT 0.00,
  deducted_by uuid,
  deducted_at timestamp with time zone DEFAULT now(),
  reversed boolean DEFAULT false,
  reversed_at timestamp with time zone,
  reversed_by uuid,
  notes text,
  CONSTRAINT erp_stock_deductions_pkey PRIMARY KEY (id),
  CONSTRAINT erp_sd_production_order_fkey FOREIGN KEY (production_order_id) REFERENCES public.erp_production_orders(id),
  CONSTRAINT erp_sd_poi_fkey FOREIGN KEY (production_order_item_id) REFERENCES public.erp_production_order_items(id),
  CONSTRAINT erp_sd_inventory_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_sd_recipe_fkey FOREIGN KEY (recipe_id) REFERENCES public.erp_recipes(id),
  CONSTRAINT erp_sd_deducted_by_fkey FOREIGN KEY (deducted_by) REFERENCES public.erp_staff(id)
);

-- 1.4 Food Safety Logs (HACCP/บันทึกความปลอดภัยอาหาร)
CREATE TABLE IF NOT EXISTS public.erp_food_safety_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  log_time time NOT NULL DEFAULT CURRENT_TIME,
  category text NOT NULL, -- temperature / cleanliness / pest_control / personal_hygiene / expiry_check / equipment
  location text, -- walk_in_fridge / freezer / prep_area / cooking_area / storage
  check_item text NOT NULL,
  reading_value numeric, -- อุณหภูมิเป็นองศาเซลเซียส หรือค่าวัดอื่นๆ
  reading_unit text DEFAULT '°C',
  min_acceptable numeric,
  max_acceptable numeric,
  is_pass boolean DEFAULT true,
  corrective_action text, -- สิ่งที่แก้ไขหากไม่ผ่าน
  photo_url text,
  checked_by uuid NOT NULL,
  verified_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_food_safety_logs_pkey PRIMARY KEY (id),
  CONSTRAINT erp_fsl_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_fsl_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.erp_staff(id)
);

-- 1.5 Demand Forecasts (พยากรณ์ความต้องการวัตถุดิบ)
CREATE TABLE IF NOT EXISTS public.erp_demand_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  forecast_date date NOT NULL,
  menu_item_id uuid,
  inventory_item_id uuid,
  forecast_qty numeric NOT NULL DEFAULT 0,
  confidence_score numeric DEFAULT 0.5, -- 0.0 - 1.0
  source text DEFAULT 'system', -- system / manual / ai
  actual_qty numeric, -- เติมภายหลังเมื่อมีข้อมูลจริง
  variance numeric, -- forecast_qty - actual_qty
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_demand_forecasts_pkey PRIMARY KEY (id),
  CONSTRAINT erp_df_menu_item_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT erp_df_inventory_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_df_unique_date_item UNIQUE (forecast_date, inventory_item_id)
);


-- ============================================================
-- MODULE 2: ACCOUNTING DEPTH (บัญชีเชิงลึก)
-- ============================================================

-- 2.1 Bank Accounts (บัญชีธนาคาร)
CREATE TABLE IF NOT EXISTS public.erp_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_type text DEFAULT 'savings', -- savings / current / promptpay
  current_balance numeric DEFAULT 0.00,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  holder_name text,
  branch text,
  promptpay_id text,
  qr_code_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_bank_accounts_pkey PRIMARY KEY (id)
);

-- 2.2 Invoices (ใบแจ้งหนี้ / ใบวางบิล / ใบเสร็จ)
CREATE TABLE IF NOT EXISTS public.erp_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  invoice_type text NOT NULL DEFAULT 'receipt', -- receipt / tax_invoice / tax_invoice_full / quotation / billing_note / credit_note
  status text NOT NULL DEFAULT 'draft', -- draft / issued / paid / cancelled / voided
  -- ข้อมูลลูกค้า
  member_id uuid,
  customer_name text NOT NULL,
  customer_address text,
  customer_tax_id text,
  customer_branch text DEFAULT 'สำนักงานใหญ่',
  customer_phone text,
  customer_email text,
  -- ข้อมูลยอดเงิน
  subtotal numeric NOT NULL DEFAULT 0.00,
  discount_amount numeric DEFAULT 0.00,
  amount_before_vat numeric DEFAULT 0.00,
  vat_rate numeric DEFAULT 7.0,
  vat_amount numeric DEFAULT 0.00,
  withholding_tax_rate numeric DEFAULT 0.0, -- ภาษีหัก ณ ที่จ่าย (3%)
  withholding_tax_amount numeric DEFAULT 0.00,
  total_amount numeric NOT NULL DEFAULT 0.00,
  -- การชำระ
  payment_method text,
  payment_ref text,
  paid_at timestamp with time zone,
  -- ข้อมูลร้านค้า (Seller)
  seller_name text DEFAULT 'Clean Food CR',
  seller_address text,
  seller_tax_id text,
  seller_branch text DEFAULT 'สำนักงานใหญ่',
  -- Metadata
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  notes text,
  internal_notes text,
  pdf_url text,
  created_by uuid,
  voided_by uuid,
  voided_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT erp_invoices_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_invoices_type_chk CHECK (invoice_type IN ('receipt', 'tax_invoice', 'tax_invoice_full', 'quotation', 'billing_note', 'credit_note'))
);

-- 2.3 Invoice Items (รายการในใบแจ้งหนี้)
CREATE TABLE IF NOT EXISTS public.erp_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'ชิ้น',
  unit_price numeric NOT NULL DEFAULT 0.00,
  discount numeric DEFAULT 0.00,
  amount numeric NOT NULL DEFAULT 0.00,
  order_id text,
  package_id uuid,
  menu_item_id uuid,
  sort_order integer DEFAULT 0,
  CONSTRAINT erp_invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT erp_invoice_items_invoice_fkey FOREIGN KEY (invoice_id) REFERENCES public.erp_invoices(id) ON DELETE CASCADE,
  CONSTRAINT erp_invoice_items_menu_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);

-- 2.4 P&L Snapshots (งบกำไรขาดทุนรายเดือน)
CREATE TABLE IF NOT EXISTS public.erp_pl_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_type text DEFAULT 'monthly', -- monthly / quarterly / yearly
  -- Revenue
  revenue_subscription numeric DEFAULT 0.00,
  revenue_retail numeric DEFAULT 0.00,
  revenue_addon numeric DEFAULT 0.00,
  revenue_delivery_fee numeric DEFAULT 0.00,
  revenue_other numeric DEFAULT 0.00,
  total_revenue numeric DEFAULT 0.00,
  -- COGS (Cost of Goods Sold)
  cogs_material numeric DEFAULT 0.00,
  cogs_packaging numeric DEFAULT 0.00,
  cogs_other numeric DEFAULT 0.00,
  total_cogs numeric DEFAULT 0.00,
  -- Gross Profit
  gross_profit numeric DEFAULT 0.00,
  gross_margin_pct numeric DEFAULT 0.00,
  -- Operating Expenses
  opex_labor numeric DEFAULT 0.00,
  opex_delivery numeric DEFAULT 0.00,
  opex_rent numeric DEFAULT 0.00,
  opex_utilities numeric DEFAULT 0.00,
  opex_marketing numeric DEFAULT 0.00,
  opex_other numeric DEFAULT 0.00,
  total_opex numeric DEFAULT 0.00,
  -- Net Income
  net_income numeric DEFAULT 0.00,
  net_margin_pct numeric DEFAULT 0.00,
  -- Metadata
  is_finalized boolean DEFAULT false,
  finalized_by uuid,
  finalized_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_pl_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT erp_pl_unique_period UNIQUE (period_year, period_month, period_type),
  CONSTRAINT erp_pl_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.erp_staff(id)
);

-- 2.5 Cash Reconciliation (สรุปงบดุลเงินสดย่อย)
CREATE TABLE IF NOT EXISTS public.erp_cash_reconciliations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reconciliation_date date NOT NULL DEFAULT CURRENT_DATE,
  pool_type text NOT NULL, -- PETTY_CASH / MATERIAL / etc.
  opening_balance numeric NOT NULL DEFAULT 0.00,
  total_income numeric DEFAULT 0.00,
  total_expense numeric DEFAULT 0.00,
  expected_balance numeric DEFAULT 0.00, -- opening + income - expense
  actual_balance numeric NOT NULL DEFAULT 0.00, -- นับจริง
  variance numeric DEFAULT 0.00, -- actual - expected
  variance_reason text,
  status text DEFAULT 'pending', -- pending / approved / disputed
  counted_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_cash_reconciliations_pkey PRIMARY KEY (id),
  CONSTRAINT erp_cr_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_cr_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id)
);

-- 2.6 Tax Reports (รายงานภาษี)
CREATE TABLE IF NOT EXISTS public.erp_tax_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_type text NOT NULL, -- vat_output / vat_input / withholding_tax / pnd1 / pnd3 / pnd53
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  total_base_amount numeric DEFAULT 0.00,
  total_tax_amount numeric DEFAULT 0.00,
  status text DEFAULT 'draft', -- draft / filed / paid
  filed_at timestamp with time zone,
  paid_at timestamp with time zone,
  reference_no text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_tax_reports_pkey PRIMARY KEY (id),
  CONSTRAINT erp_tax_reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id)
);


-- ============================================================
-- MODULE 3: HR & PAYROLL (ทรัพยากรบุคคลและเงินเดือน)
-- ============================================================

-- 3.1 Attendance (บันทึกเวลาเข้า-ออกงาน)
CREATE TABLE IF NOT EXISTS public.erp_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  clock_in timestamp with time zone,
  clock_out timestamp with time zone,
  break_minutes integer DEFAULT 0,
  total_hours numeric DEFAULT 0.00,
  overtime_hours numeric DEFAULT 0.00,
  clock_in_method text DEFAULT 'pin', -- pin / qr / manual / gps
  clock_in_location text,
  status text DEFAULT 'present', -- present / absent / late / leave / holiday
  late_minutes integer DEFAULT 0,
  notes text,
  approved_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT erp_attendance_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_attendance_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_attendance_unique_date UNIQUE (staff_id, work_date)
);

-- 3.2 Payroll Periods (รอบจ่ายเงินเดือน)
CREATE TABLE IF NOT EXISTS public.erp_payroll_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  period_name text NOT NULL, -- e.g. "พ.ค. 2026 (1-15)" 
  period_type text DEFAULT 'bi_monthly', -- bi_monthly / monthly
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft', -- draft / calculated / approved / paid
  total_gross numeric DEFAULT 0.00,
  total_deductions numeric DEFAULT 0.00,
  total_net numeric DEFAULT 0.00,
  total_employees integer DEFAULT 0,
  calculated_at timestamp with time zone,
  approved_by uuid,
  approved_at timestamp with time zone,
  paid_at timestamp with time zone,
  payment_method text DEFAULT 'transfer', -- transfer / cash
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_payroll_periods_pkey PRIMARY KEY (id),
  CONSTRAINT erp_payroll_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id)
);

-- 3.3 Payroll Items (รายละเอียดเงินเดือนแต่ละคน)
CREATE TABLE IF NOT EXISTS public.erp_payroll_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  payroll_period_id uuid NOT NULL,
  staff_id uuid NOT NULL,
  -- Earnings (รายได้)
  base_salary numeric DEFAULT 0.00, -- ค่าแรงรายวัน × จำนวนวัน
  daily_rate numeric DEFAULT 0.00,
  days_worked integer DEFAULT 0,
  overtime_pay numeric DEFAULT 0.00,
  overtime_hours numeric DEFAULT 0.00,
  delivery_bonus numeric DEFAULT 0.00, -- โบนัสค่ารอบจัดส่ง
  delivery_rounds integer DEFAULT 0,
  fuel_allowance numeric DEFAULT 0.00,
  other_allowance numeric DEFAULT 0.00,
  bonus numeric DEFAULT 0.00,
  total_earnings numeric DEFAULT 0.00,
  -- Deductions (หักเงิน)
  social_security numeric DEFAULT 0.00, -- ประกันสังคม 5%
  withholding_tax numeric DEFAULT 0.00, -- ภาษีหัก ณ ที่จ่าย
  advance_deduction numeric DEFAULT 0.00, -- หักเงินทดรองจ่าย
  late_deduction numeric DEFAULT 0.00, -- หักเงินมาสาย
  other_deduction numeric DEFAULT 0.00,
  total_deductions numeric DEFAULT 0.00,
  -- Net Pay
  net_pay numeric DEFAULT 0.00,
  -- Payment
  payment_status text DEFAULT 'pending', -- pending / paid / hold
  paid_at timestamp with time zone,
  bank_name text,
  bank_account text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_payroll_items_pkey PRIMARY KEY (id),
  CONSTRAINT erp_pi_period_fkey FOREIGN KEY (payroll_period_id) REFERENCES public.erp_payroll_periods(id) ON DELETE CASCADE,
  CONSTRAINT erp_pi_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.erp_staff(id)
);

-- 3.4 Leave Requests (การลาหยุด)
CREATE TABLE IF NOT EXISTS public.erp_leave_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  leave_type text NOT NULL, -- annual / sick / personal / maternity / unpaid
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric NOT NULL DEFAULT 1,
  reason text,
  status text DEFAULT 'pending', -- pending / approved / rejected / cancelled
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  attachment_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_leave_requests_pkey PRIMARY KEY (id),
  CONSTRAINT erp_lr_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_lr_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_lr_type_chk CHECK (leave_type IN ('annual', 'sick', 'personal', 'maternity', 'unpaid'))
);

-- 3.5 Staff Performance (บันทึกผลงาน KPI)
CREATE TABLE IF NOT EXISTS public.erp_staff_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  -- KPI Scores (1-5)
  punctuality_score numeric DEFAULT 0, -- ตรงเวลา
  quality_score numeric DEFAULT 0, -- คุณภาพงาน
  teamwork_score numeric DEFAULT 0, -- การทำงานร่วมกัน
  productivity_score numeric DEFAULT 0, -- ผลงาน
  overall_score numeric DEFAULT 0,
  -- Statistics
  total_days_present integer DEFAULT 0,
  total_days_late integer DEFAULT 0,
  total_days_absent integer DEFAULT 0,
  total_deliveries integer DEFAULT 0, -- สำหรับไรเดอร์
  total_on_time_deliveries integer DEFAULT 0,
  avg_customer_rating numeric DEFAULT 0.0,
  -- Review
  reviewer_id uuid,
  review_notes text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_staff_performance_pkey PRIMARY KEY (id),
  CONSTRAINT erp_sp_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_sp_reviewer_fkey FOREIGN KEY (reviewer_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_sp_unique_period UNIQUE (staff_id, period_year, period_month)
);


-- ============================================================
-- MODULE 4: CRM (ลูกค้าสัมพันธ์)
-- ============================================================

-- 4.1 CRM Interactions (บันทึกการติดต่อลูกค้า)
CREATE TABLE IF NOT EXISTS public.erp_crm_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  interaction_type text NOT NULL, -- call / line / email / visit / complaint / feedback
  direction text DEFAULT 'outbound', -- inbound / outbound
  subject text,
  content text,
  sentiment text, -- positive / neutral / negative
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  follow_up_done boolean DEFAULT false,
  handled_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_crm_interactions_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ci_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_ci_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.erp_staff(id)
);

-- 4.2 CRM Campaigns (แคมเปญการตลาด)
CREATE TABLE IF NOT EXISTS public.erp_crm_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  campaign_type text NOT NULL, -- line_push / sms / email / in_app / promotion
  status text DEFAULT 'draft', -- draft / scheduled / running / completed / cancelled
  target_segment text, -- all / at_risk / new / vip / inactive / custom
  message_template text,
  promotion_id uuid,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  total_targets integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_opened integer DEFAULT 0,
  total_converted integer DEFAULT 0,
  budget numeric DEFAULT 0.00,
  actual_cost numeric DEFAULT 0.00,
  roi numeric DEFAULT 0.00,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_crm_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT erp_cc_promotion_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT erp_cc_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id)
);

-- 4.3 Campaign Members (สมาชิกในแคมเปญ)
CREATE TABLE IF NOT EXISTS public.erp_crm_campaign_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  member_id uuid NOT NULL,
  status text DEFAULT 'pending', -- pending / sent / opened / converted / unsubscribed
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  converted_at timestamp with time zone,
  conversion_value numeric DEFAULT 0.00,
  CONSTRAINT erp_ccm_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ccm_campaign_fkey FOREIGN KEY (campaign_id) REFERENCES public.erp_crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT erp_ccm_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_ccm_unique UNIQUE (campaign_id, member_id)
);

-- 4.4 Churn Scores (คะแนนเสี่ยง Churn)
CREATE TABLE IF NOT EXISTS public.erp_churn_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0.0, -- 0.0 (ไม่เสี่ยง) ถึง 1.0 (เสี่ยงสูง)
  risk_level text DEFAULT 'low', -- low / medium / high / critical
  -- Factors
  days_since_last_order integer DEFAULT 0,
  order_frequency_30d integer DEFAULT 0,
  order_frequency_90d integer DEFAULT 0,
  avg_order_value numeric DEFAULT 0.00,
  streak_current integer DEFAULT 0,
  streak_longest integer DEFAULT 0,
  total_lifetime_value numeric DEFAULT 0.00,
  package_status text, -- active / paused / cancelled / none
  last_interaction_date date,
  satisfaction_avg numeric DEFAULT 0.0,
  -- Metadata
  calculated_at timestamp with time zone DEFAULT now(),
  model_version text DEFAULT 'v1',
  CONSTRAINT erp_churn_scores_pkey PRIMARY KEY (id),
  CONSTRAINT erp_cs_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_cs_unique_member UNIQUE (member_id)
);

-- 4.5 Menu Preferences (ความชอบด้านอาหาร)
CREATE TABLE IF NOT EXISTS public.erp_menu_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  preference_type text NOT NULL, -- protein / category / cuisine / cooking_method / ingredient
  preference_value text NOT NULL, -- e.g. "ไก่", "ผัด", "สลัด"
  preference_level text DEFAULT 'like', -- love / like / neutral / dislike / allergic
  source text DEFAULT 'auto', -- auto (จากประวัติ) / manual (ลูกค้าบอก) / system
  confidence numeric DEFAULT 0.5, -- 0.0 - 1.0
  order_count integer DEFAULT 0, -- จำนวนครั้งที่สั่งประเภทนี้
  last_ordered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_mp_pkey PRIMARY KEY (id),
  CONSTRAINT erp_mp_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_mp_unique UNIQUE (member_id, preference_type, preference_value)
);


-- ============================================================
-- MODULE 5: PROCUREMENT (จัดซื้อ)
-- ============================================================

-- 5.1 Purchase Orders (ใบสั่งซื้อ)
CREATE TABLE IF NOT EXISTS public.erp_purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft / submitted / confirmed / partial_received / received / cancelled
  -- ข้อมูลการสั่งซื้อ
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  -- ยอดเงิน
  subtotal numeric DEFAULT 0.00,
  discount_amount numeric DEFAULT 0.00,
  vat_amount numeric DEFAULT 0.00,
  total_amount numeric DEFAULT 0.00,
  -- การชำระ
  payment_terms text DEFAULT 'COD', -- COD / NET15 / NET30 / NET60
  payment_status text DEFAULT 'unpaid', -- unpaid / partial / paid
  paid_amount numeric DEFAULT 0.00,
  -- Metadata
  delivery_address text,
  notes text,
  internal_notes text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  cancelled_by uuid,
  cancelled_at timestamp with time zone,
  cancelled_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT erp_po_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.erp_suppliers(id),
  CONSTRAINT erp_po_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_po_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id)
);

-- 5.2 Purchase Order Items (รายละเอียดรายการใน PO)
CREATE TABLE IF NOT EXISTS public.erp_purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  description text,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0.00,
  discount_pct numeric DEFAULT 0.00,
  amount numeric NOT NULL DEFAULT 0.00,
  received_qty numeric DEFAULT 0,
  remaining_qty numeric DEFAULT 0,
  notes text,
  CONSTRAINT erp_po_items_pkey PRIMARY KEY (id),
  CONSTRAINT erp_poi_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.erp_purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT erp_poi_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id)
);

-- 5.3 Goods Receipts (ใบรับสินค้า)
CREATE TABLE IF NOT EXISTS public.erp_goods_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  gr_number text NOT NULL UNIQUE,
  purchase_order_id uuid,
  supplier_id uuid NOT NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft', -- draft / confirmed / cancelled
  total_amount numeric DEFAULT 0.00,
  invoice_number text, -- เลขที่ใบแจ้งหนี้จากผู้ขาย
  received_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_goods_receipts_pkey PRIMARY KEY (id),
  CONSTRAINT erp_gr_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.erp_purchase_orders(id),
  CONSTRAINT erp_gr_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.erp_suppliers(id),
  CONSTRAINT erp_gr_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_gr_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.erp_staff(id)
);

-- 5.4 Goods Receipt Items (รายละเอียดรายการรับสินค้า)
CREATE TABLE IF NOT EXISTS public.erp_goods_receipt_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goods_receipt_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  po_item_id uuid,
  received_qty numeric NOT NULL,
  unit text NOT NULL,
  unit_cost numeric NOT NULL DEFAULT 0.00,
  total_cost numeric NOT NULL DEFAULT 0.00,
  expiry_date date,
  batch_number text,
  location_id uuid,
  quality_status text DEFAULT 'accepted', -- accepted / rejected / quarantine
  rejection_reason text,
  notes text,
  CONSTRAINT erp_gri_pkey PRIMARY KEY (id),
  CONSTRAINT erp_gri_gr_fkey FOREIGN KEY (goods_receipt_id) REFERENCES public.erp_goods_receipts(id) ON DELETE CASCADE,
  CONSTRAINT erp_gri_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_gri_po_item_fkey FOREIGN KEY (po_item_id) REFERENCES public.erp_purchase_order_items(id),
  CONSTRAINT erp_gri_location_fkey FOREIGN KEY (location_id) REFERENCES public.erp_inventory_locations(id)
);

-- 5.5 Supplier Price Lists (ราคากลางเฉลี่ยจากผู้จัดจำหน่าย)
CREATE TABLE IF NOT EXISTS public.erp_supplier_price_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL,
  inventory_item_id uuid NOT NULL,
  unit text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0.00,
  min_order_qty numeric DEFAULT 0,
  lead_time_days integer DEFAULT 1,
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  is_preferred boolean DEFAULT false,
  last_purchase_price numeric DEFAULT 0.00,
  last_purchase_date date,
  avg_price_3m numeric DEFAULT 0.00, -- ค่าเฉลี่ย 3 เดือน
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_spl_pkey PRIMARY KEY (id),
  CONSTRAINT erp_spl_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.erp_suppliers(id),
  CONSTRAINT erp_spl_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_spl_unique UNIQUE (supplier_id, inventory_item_id, unit)
);


-- ============================================================
-- MODULE 6: LOGISTICS & ROUTE OPTIMIZATION (ขนส่งเชิงลึก)
-- ============================================================

-- 6.1 Delivery Routes (เส้นทางจัดส่ง)
CREATE TABLE IF NOT EXISTS public.erp_delivery_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text DEFAULT 'morning', -- morning / evening
  rider_id uuid NOT NULL,
  status text DEFAULT 'planned', -- planned / in_progress / completed / cancelled
  -- Route Statistics
  total_stops integer DEFAULT 0,
  total_distance_km numeric DEFAULT 0.00,
  estimated_duration_minutes integer DEFAULT 0,
  actual_duration_minutes integer,
  -- Optimization
  optimization_method text DEFAULT 'nearest_neighbor', -- nearest_neighbor / 2opt / manual
  optimization_score numeric DEFAULT 0.0,
  -- Timing
  departed_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_delivery_routes_pkey PRIMARY KEY (id),
  CONSTRAINT erp_dr_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_dr_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id)
);

-- 6.2 Delivery Route Stops (จุดจอดในเส้นทาง)
CREATE TABLE IF NOT EXISTS public.erp_delivery_route_stops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL,
  stop_order integer NOT NULL, -- ลำดับจุดจอด (1, 2, 3, ...)
  delivery_id uuid, -- เชื่อมกับ erp_deliveries
  member_id uuid,
  address text,
  lat numeric,
  lng numeric,
  distance_from_prev_km numeric DEFAULT 0.00,
  estimated_arrival timestamp with time zone,
  actual_arrival timestamp with time zone,
  status text DEFAULT 'pending', -- pending / arrived / delivered / failed / skipped
  delivery_proof_url text,
  customer_signature_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_drs_pkey PRIMARY KEY (id),
  CONSTRAINT erp_drs_route_fkey FOREIGN KEY (route_id) REFERENCES public.erp_delivery_routes(id) ON DELETE CASCADE,
  CONSTRAINT erp_drs_delivery_fkey FOREIGN KEY (delivery_id) REFERENCES public.erp_deliveries(id),
  CONSTRAINT erp_drs_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);

-- 6.3 Rider GPS Logs (บันทึก GPS ตำแหน่งไรเดอร์)
CREATE TABLE IF NOT EXISTS public.erp_rider_gps_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  route_id uuid,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  speed_kmh numeric DEFAULT 0.0,
  heading numeric DEFAULT 0.0, -- 0-360 degrees
  accuracy_meters numeric DEFAULT 0.0,
  battery_level integer, -- 0-100
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT erp_gps_logs_pkey PRIMARY KEY (id),
  CONSTRAINT erp_gps_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_gps_route_fkey FOREIGN KEY (route_id) REFERENCES public.erp_delivery_routes(id)
);

-- Index for efficient GPS queries
CREATE INDEX IF NOT EXISTS idx_gps_logs_rider_time ON public.erp_rider_gps_logs (rider_id, recorded_at DESC);

-- 6.4 Rider Performance (คะแนนผลงานไรเดอร์)
CREATE TABLE IF NOT EXISTS public.erp_rider_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  period_date date NOT NULL, -- วันที่ประเมิน (รายวัน)
  -- Delivery Metrics
  total_deliveries integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  late_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0,
  on_time_pct numeric DEFAULT 0.0,
  -- Distance
  total_distance_km numeric DEFAULT 0.00,
  -- Customer Feedback
  total_ratings integer DEFAULT 0,
  avg_rating numeric DEFAULT 0.0,
  complaints integer DEFAULT 0,
  -- Financial
  total_earnings numeric DEFAULT 0.00,
  fuel_claimed numeric DEFAULT 0.00,
  -- Performance Score (0-100)
  performance_score numeric DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_rider_perf_pkey PRIMARY KEY (id),
  CONSTRAINT erp_rp_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_rp_unique UNIQUE (rider_id, period_date)
);

-- 6.5 Fuel Claims (การเบิกค่าน้ำมัน)
CREATE TABLE IF NOT EXISTS public.erp_fuel_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  route_id uuid,
  -- Distance
  distance_km numeric NOT NULL,
  distance_source text DEFAULT 'gps', -- gps / manual / route_calculated
  -- Calculation
  rate_per_km numeric NOT NULL DEFAULT 3.00, -- ฿3/กม. (ค่าเริ่มต้น)
  vehicle_type text DEFAULT 'motorcycle', -- motorcycle / car / bicycle
  fuel_amount numeric NOT NULL DEFAULT 0.00,
  surcharge numeric DEFAULT 0.00, -- ค่าเพิ่มพิเศษ (ฝนตก, ระยะไกล)
  total_claim numeric NOT NULL DEFAULT 0.00,
  -- Approval
  status text DEFAULT 'pending', -- pending / approved / rejected / paid
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  paid_at timestamp with time zone,
  -- Evidence
  receipt_url text,
  gps_snapshot_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_fuel_claims_pkey PRIMARY KEY (id),
  CONSTRAINT erp_fc_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_fc_route_fkey FOREIGN KEY (route_id) REFERENCES public.erp_delivery_routes(id),
  CONSTRAINT erp_fc_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id)
);


-- ============================================================
-- MODULE 7: MULTI-TENANCY FOUNDATION (รองรับ SaaS)
-- ============================================================

-- 7.1 Tenants (ร้านค้า/องค์กร)
CREATE TABLE IF NOT EXISTS public.erp_tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_code text NOT NULL UNIQUE, -- e.g. "cleanfood_cr"
  tenant_name text NOT NULL,
  business_type text DEFAULT 'restaurant', -- restaurant / cafe / bakery / catering / meal_prep
  owner_name text,
  owner_phone text,
  owner_email text,
  logo_url text,
  -- Address
  address text,
  province text,
  postal_code text,
  lat numeric,
  lng numeric,
  -- Business Info
  tax_id text,
  branch_name text DEFAULT 'สำนักงานใหญ่',
  -- Status
  status text DEFAULT 'trial', -- trial / active / suspended / cancelled
  trial_ends_at timestamp with time zone,
  subscription_tier text DEFAULT 'starter', -- starter / growth / pro / enterprise
  -- Metadata
  timezone text DEFAULT 'Asia/Bangkok',
  currency text DEFAULT 'THB',
  language text DEFAULT 'th',
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT erp_tenants_pkey PRIMARY KEY (id)
);

-- 7.2 Tenant Subscriptions (แพ็กเกจ SaaS)
CREATE TABLE IF NOT EXISTS public.erp_tenant_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_name text NOT NULL, -- starter / growth / pro / enterprise
  billing_cycle text DEFAULT 'monthly', -- monthly / yearly
  price_per_cycle numeric NOT NULL DEFAULT 990.00,
  -- Limits
  max_users integer DEFAULT 3,
  max_menu_items integer DEFAULT 50,
  max_members integer DEFAULT 100,
  max_orders_per_month integer DEFAULT 500,
  -- Features enabled
  features_enabled jsonb DEFAULT '["kds", "menu", "members"]'::jsonb,
  -- Dates
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  next_billing_date date,
  -- Status
  status text DEFAULT 'active', -- active / past_due / cancelled / expired
  cancelled_at timestamp with time zone,
  cancelled_reason text,
  -- Payment
  last_payment_amount numeric DEFAULT 0.00,
  last_payment_date timestamp with time zone,
  total_paid numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_ts_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ts_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id)
);

-- 7.3 Tenant Users (ผู้ใช้ในแต่ละ Tenant)
CREATE TABLE IF NOT EXISTS public.erp_tenant_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  auth_user_id uuid, -- Supabase Auth UID
  staff_id uuid, -- เชื่อมกับ erp_staff (ถ้ามี)
  full_name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'staff', -- owner / admin / manager / kitchen / rider / staff
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_tu_pkey PRIMARY KEY (id),
  CONSTRAINT erp_tu_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_tu_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.erp_staff(id)
);

-- 7.4 Tenant Configs (การตั้งค่าเฉพาะร้าน)
CREATE TABLE IF NOT EXISTS public.erp_tenant_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  config_key text NOT NULL,
  config_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  is_sensitive boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_tc_pkey PRIMARY KEY (id),
  CONSTRAINT erp_tc_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_tc_unique UNIQUE (tenant_id, config_key)
);


-- ============================================================
-- USEFUL INDEXES FOR PERFORMANCE
-- ============================================================

-- Kitchen
CREATE INDEX IF NOT EXISTS idx_production_orders_date ON public.erp_production_orders (production_date);
CREATE INDEX IF NOT EXISTS idx_food_safety_date ON public.erp_food_safety_logs (log_date);
CREATE INDEX IF NOT EXISTS idx_stock_deductions_po ON public.erp_stock_deductions (production_order_id);

-- Accounting
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.erp_invoices (issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_member ON public.erp_invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_pl_period ON public.erp_pl_snapshots (period_year, period_month);

-- HR
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON public.erp_attendance (staff_id, work_date);
CREATE INDEX IF NOT EXISTS idx_payroll_items_period ON public.erp_payroll_items (payroll_period_id);

-- CRM
CREATE INDEX IF NOT EXISTS idx_crm_interactions_member ON public.erp_crm_interactions (member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_scores_risk ON public.erp_churn_scores (risk_level, score DESC);
CREATE INDEX IF NOT EXISTS idx_menu_prefs_member ON public.erp_menu_preferences (member_id);

-- Procurement
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.erp_purchase_orders (supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.erp_purchase_orders (status);
CREATE INDEX IF NOT EXISTS idx_gr_po ON public.erp_goods_receipts (purchase_order_id);

-- Logistics
CREATE INDEX IF NOT EXISTS idx_routes_date_rider ON public.erp_delivery_routes (route_date, rider_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.erp_delivery_route_stops (route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_fuel_claims_rider ON public.erp_fuel_claims (rider_id, claim_date);

-- Multi-tenancy
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.erp_tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subs_tenant ON public.erp_tenant_subscriptions (tenant_id, status);


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-generate PO Number (PO-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS text AS $$
DECLARE
  prefix text;
  seq integer;
  result text;
BEGIN
  prefix := 'PO-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM length(prefix) + 1) AS integer)), 0) + 1
  INTO seq
  FROM public.erp_purchase_orders
  WHERE po_number LIKE prefix || '%';
  result := prefix || LPAD(seq::text, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate GR Number (GR-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION public.generate_gr_number()
RETURNS text AS $$
DECLARE
  prefix text;
  seq integer;
  result text;
BEGIN
  prefix := 'GR-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(gr_number FROM length(prefix) + 1) AS integer)), 0) + 1
  INTO seq
  FROM public.erp_goods_receipts
  WHERE gr_number LIKE prefix || '%';
  result := prefix || LPAD(seq::text, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate Invoice Number (INV-YYYYMM-XXXX)
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text AS $$
DECLARE
  prefix text;
  seq integer;
  result text;
BEGIN
  prefix := 'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM length(prefix) + 1) AS integer)), 0) + 1
  INTO seq
  FROM public.erp_invoices
  WHERE invoice_number LIKE prefix || '%';
  result := prefix || LPAD(seq::text, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SUMMARY
-- ============================================================
-- Total new tables: 36
-- Module 1 - Kitchen Depth: 5 tables
-- Module 2 - Accounting: 6 tables
-- Module 3 - HR & Payroll: 5 tables
-- Module 4 - CRM: 5 tables
-- Module 5 - Procurement: 5 tables
-- Module 6 - Logistics & Route: 5 tables
-- Module 7 - Multi-Tenancy: 4 tables
-- Plus: 1 GPS index, 12 performance indexes, 3 helper functions
-- ============================================================
