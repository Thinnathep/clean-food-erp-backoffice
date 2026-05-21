-- ============================================================
-- Clean Food Pinto — Database Expansion Phase 1
-- "ระบบปิ่นโต subscription ที่ดีที่สุดในไทย"
-- ============================================================
-- CRITICAL: tenant_id on EVERY table for Multi-tenancy (SaaS)
-- HR/Payroll SKIPPED — will add when 3+ paying customers exist
-- ============================================================

-- ============================================================
-- MODULE 0: MULTI-TENANCY FOUNDATION (ต้องสร้างก่อน)
-- ============================================================

-- 0.1 Tenants (ร้านค้า/องค์กร)
CREATE TABLE IF NOT EXISTS public.erp_tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_code text NOT NULL UNIQUE,
  tenant_name text NOT NULL,
  business_type text DEFAULT 'meal_prep', -- meal_prep / restaurant / cafe / catering
  owner_name text,
  owner_phone text,
  owner_email text,
  logo_url text,
  address text,
  province text,
  postal_code text,
  lat numeric,
  lng numeric,
  tax_id text,
  branch_name text DEFAULT 'สำนักงานใหญ่',
  status text DEFAULT 'trial', -- trial / active / suspended / cancelled
  trial_ends_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  subscription_tier text DEFAULT 'starter', -- starter / growth / pro / enterprise
  timezone text DEFAULT 'Asia/Bangkok',
  currency text DEFAULT 'THB',
  language text DEFAULT 'th',
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT erp_tenants_pkey PRIMARY KEY (id)
);

-- 0.2 Tenant Subscriptions (แพ็กเกจ SaaS)
CREATE TABLE IF NOT EXISTS public.erp_tenant_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan_name text NOT NULL, -- starter / growth / pro / enterprise
  billing_cycle text DEFAULT 'monthly',
  price_per_cycle numeric NOT NULL DEFAULT 990.00,
  max_users integer DEFAULT 3,
  max_menu_items integer DEFAULT 50,
  max_members integer DEFAULT 200,
  max_orders_per_month integer DEFAULT 1000,
  features_enabled jsonb DEFAULT '["kds","menu","members","pinto"]'::jsonb,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  next_billing_date date,
  status text DEFAULT 'active',
  cancelled_at timestamp with time zone,
  cancelled_reason text,
  last_payment_amount numeric DEFAULT 0.00,
  last_payment_date timestamp with time zone,
  total_paid numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_ts_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ts_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id) ON DELETE CASCADE
);

-- 0.3 Tenant Users (ผู้ใช้ในแต่ละ Tenant)
CREATE TABLE IF NOT EXISTS public.erp_tenant_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  auth_user_id uuid,
  staff_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'staff', -- owner / admin / manager / kitchen / rider / staff
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_tu_pkey PRIMARY KEY (id),
  CONSTRAINT erp_tu_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id) ON DELETE CASCADE,
  CONSTRAINT erp_tu_staff_fkey FOREIGN KEY (staff_id) REFERENCES public.erp_staff(id)
);

-- 0.4 Tenant Configs (การตั้งค่าเฉพาะร้าน)
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
  CONSTRAINT erp_tc_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id) ON DELETE CASCADE,
  CONSTRAINT erp_tc_unique UNIQUE (tenant_id, config_key)
);

-- Insert default tenant for Clean Food CR (existing data migration)
INSERT INTO public.erp_tenants (id, tenant_code, tenant_name, business_type, status, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'cleanfood_cr',
  'Clean Food CR',
  'meal_prep',
  'active',
  'pro'
) ON CONFLICT (tenant_code) DO NOTHING;


-- ============================================================
-- MODULE 1: KITCHEN DEPTH (ครัวเชิงลึก — ใช้จริงในครัว)
-- ============================================================

-- 1.1 Production Orders (ใบสั่งผลิตอาหาร + BOM Auto-deduction)
CREATE TABLE IF NOT EXISTS public.erp_production_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  production_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text DEFAULT 'morning',
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
  CONSTRAINT erp_po_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_po_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_po_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_po_status_chk CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled'))
);

-- 1.2 Production Order Items (รายละเอียดเมนูในใบสั่งผลิต)
CREATE TABLE IF NOT EXISTS public.erp_production_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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
  CONSTRAINT erp_poi_pkey PRIMARY KEY (id),
  CONSTRAINT erp_poi_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_poi_order_fkey FOREIGN KEY (production_order_id) REFERENCES public.erp_production_orders(id) ON DELETE CASCADE,
  CONSTRAINT erp_poi_menu_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);

-- 1.3 Stock Deductions (ตัดสต็อกอัตโนมัติตาม BOM)
CREATE TABLE IF NOT EXISTS public.erp_stock_deductions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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
  CONSTRAINT erp_sd_pkey PRIMARY KEY (id),
  CONSTRAINT erp_sd_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_sd_order_fkey FOREIGN KEY (production_order_id) REFERENCES public.erp_production_orders(id),
  CONSTRAINT erp_sd_poi_fkey FOREIGN KEY (production_order_item_id) REFERENCES public.erp_production_order_items(id),
  CONSTRAINT erp_sd_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_sd_recipe_fkey FOREIGN KEY (recipe_id) REFERENCES public.erp_recipes(id),
  CONSTRAINT erp_sd_deducted_by_fkey FOREIGN KEY (deducted_by) REFERENCES public.erp_staff(id)
);

-- 1.4 Food Safety Logs (HACCP/ความปลอดภัยอาหาร)
CREATE TABLE IF NOT EXISTS public.erp_food_safety_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  log_time time NOT NULL DEFAULT CURRENT_TIME,
  category text NOT NULL, -- temperature / cleanliness / pest_control / personal_hygiene / expiry_check / equipment
  location text,
  check_item text NOT NULL,
  reading_value numeric,
  reading_unit text DEFAULT '°C',
  min_acceptable numeric,
  max_acceptable numeric,
  is_pass boolean DEFAULT true,
  corrective_action text,
  photo_url text,
  checked_by uuid NOT NULL,
  verified_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_fsl_pkey PRIMARY KEY (id),
  CONSTRAINT erp_fsl_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_fsl_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_fsl_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.erp_staff(id)
);

-- 1.5 Demand Forecasts (พยากรณ์ความต้องการวัตถุดิบ)
CREATE TABLE IF NOT EXISTS public.erp_demand_forecasts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  forecast_date date NOT NULL,
  menu_item_id uuid,
  inventory_item_id uuid,
  forecast_qty numeric NOT NULL DEFAULT 0,
  confidence_score numeric DEFAULT 0.5,
  source text DEFAULT 'system', -- system / manual
  actual_qty numeric,
  variance numeric,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_df_pkey PRIMARY KEY (id),
  CONSTRAINT erp_df_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_df_menu_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id),
  CONSTRAINT erp_df_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_df_unique UNIQUE (tenant_id, forecast_date, inventory_item_id)
);


-- ============================================================
-- MODULE 2: PROCUREMENT (จัดซื้อ — สำคัญมากสำหรับร้านที่ทำจริง)
-- ============================================================

-- 2.1 Purchase Orders (ใบสั่งซื้อ)
CREATE TABLE IF NOT EXISTS public.erp_purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  po_number text NOT NULL,
  supplier_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft', -- draft / submitted / confirmed / partial_received / received / cancelled
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  actual_delivery_date date,
  subtotal numeric DEFAULT 0.00,
  discount_amount numeric DEFAULT 0.00,
  vat_amount numeric DEFAULT 0.00,
  total_amount numeric DEFAULT 0.00,
  payment_terms text DEFAULT 'COD',
  payment_status text DEFAULT 'unpaid',
  paid_amount numeric DEFAULT 0.00,
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
  CONSTRAINT erp_puro_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_puro_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.erp_suppliers(id),
  CONSTRAINT erp_puro_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_puro_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_puro_unique_po UNIQUE (tenant_id, po_number)
);

-- 2.2 Purchase Order Items
CREATE TABLE IF NOT EXISTS public.erp_purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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
  CONSTRAINT erp_puoi_pkey PRIMARY KEY (id),
  CONSTRAINT erp_puoi_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_puoi_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.erp_purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT erp_puoi_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id)
);

-- 2.3 Goods Receipts (ใบรับสินค้า)
CREATE TABLE IF NOT EXISTS public.erp_goods_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  gr_number text NOT NULL,
  purchase_order_id uuid,
  supplier_id uuid NOT NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft',
  total_amount numeric DEFAULT 0.00,
  invoice_number text,
  received_by uuid NOT NULL,
  confirmed_by uuid,
  confirmed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_gr_pkey PRIMARY KEY (id),
  CONSTRAINT erp_gr_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_gr_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.erp_purchase_orders(id),
  CONSTRAINT erp_gr_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.erp_suppliers(id),
  CONSTRAINT erp_gr_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_gr_unique_gr UNIQUE (tenant_id, gr_number)
);

-- 2.4 Goods Receipt Items
CREATE TABLE IF NOT EXISTS public.erp_goods_receipt_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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
  CONSTRAINT erp_gri_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_gri_gr_fkey FOREIGN KEY (goods_receipt_id) REFERENCES public.erp_goods_receipts(id) ON DELETE CASCADE,
  CONSTRAINT erp_gri_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_gri_po_item_fkey FOREIGN KEY (po_item_id) REFERENCES public.erp_purchase_order_items(id),
  CONSTRAINT erp_gri_location_fkey FOREIGN KEY (location_id) REFERENCES public.erp_inventory_locations(id)
);

-- 2.5 Supplier Price Lists (ราคากลาง)
CREATE TABLE IF NOT EXISTS public.erp_supplier_price_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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
  avg_price_3m numeric DEFAULT 0.00,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_spl_pkey PRIMARY KEY (id),
  CONSTRAINT erp_spl_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_spl_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.erp_suppliers(id),
  CONSTRAINT erp_spl_item_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.erp_inventory_items(id),
  CONSTRAINT erp_spl_unique UNIQUE (tenant_id, supplier_id, inventory_item_id, unit)
);


-- ============================================================
-- MODULE 3: ACCOUNTING DEPTH (บัญชี — P&L + Invoice + Cash)
-- ============================================================

-- 3.1 Bank Accounts (บัญชีธนาคาร)
CREATE TABLE IF NOT EXISTS public.erp_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  account_name text NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_type text DEFAULT 'savings',
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
  CONSTRAINT erp_ba_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ba_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id)
);

-- 3.2 Invoices (ใบแจ้งหนี้ / ใบเสร็จ)
CREATE TABLE IF NOT EXISTS public.erp_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  invoice_number text NOT NULL,
  invoice_type text NOT NULL DEFAULT 'receipt', -- receipt / tax_invoice / tax_invoice_full / quotation / billing_note / credit_note
  status text NOT NULL DEFAULT 'draft',
  member_id uuid,
  customer_name text NOT NULL,
  customer_address text,
  customer_tax_id text,
  customer_branch text DEFAULT 'สำนักงานใหญ่',
  customer_phone text,
  customer_email text,
  subtotal numeric NOT NULL DEFAULT 0.00,
  discount_amount numeric DEFAULT 0.00,
  amount_before_vat numeric DEFAULT 0.00,
  vat_rate numeric DEFAULT 7.0,
  vat_amount numeric DEFAULT 0.00,
  withholding_tax_rate numeric DEFAULT 0.0,
  withholding_tax_amount numeric DEFAULT 0.00,
  total_amount numeric NOT NULL DEFAULT 0.00,
  payment_method text,
  payment_ref text,
  paid_at timestamp with time zone,
  seller_name text DEFAULT 'Clean Food CR',
  seller_address text,
  seller_tax_id text,
  seller_branch text DEFAULT 'สำนักงานใหญ่',
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
  CONSTRAINT erp_inv_pkey PRIMARY KEY (id),
  CONSTRAINT erp_inv_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_inv_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_inv_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_inv_unique_num UNIQUE (tenant_id, invoice_number)
);

-- 3.3 Invoice Items
CREATE TABLE IF NOT EXISTS public.erp_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
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
  CONSTRAINT erp_invi_pkey PRIMARY KEY (id),
  CONSTRAINT erp_invi_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_invi_invoice_fkey FOREIGN KEY (invoice_id) REFERENCES public.erp_invoices(id) ON DELETE CASCADE,
  CONSTRAINT erp_invi_menu_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id)
);

-- 3.4 P&L Snapshots (งบกำไรขาดทุน)
CREATE TABLE IF NOT EXISTS public.erp_pl_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  period_type text DEFAULT 'monthly',
  -- Revenue
  revenue_subscription numeric DEFAULT 0.00,
  revenue_retail numeric DEFAULT 0.00,
  revenue_addon numeric DEFAULT 0.00,
  revenue_delivery_fee numeric DEFAULT 0.00,
  revenue_other numeric DEFAULT 0.00,
  total_revenue numeric DEFAULT 0.00,
  -- COGS
  cogs_material numeric DEFAULT 0.00,
  cogs_packaging numeric DEFAULT 0.00,
  cogs_other numeric DEFAULT 0.00,
  total_cogs numeric DEFAULT 0.00,
  -- Gross Profit
  gross_profit numeric DEFAULT 0.00,
  gross_margin_pct numeric DEFAULT 0.00,
  -- OpEx
  opex_labor numeric DEFAULT 0.00,
  opex_delivery numeric DEFAULT 0.00,
  opex_rent numeric DEFAULT 0.00,
  opex_utilities numeric DEFAULT 0.00,
  opex_marketing numeric DEFAULT 0.00,
  opex_other numeric DEFAULT 0.00,
  total_opex numeric DEFAULT 0.00,
  -- Net
  net_income numeric DEFAULT 0.00,
  net_margin_pct numeric DEFAULT 0.00,
  -- Metadata
  is_finalized boolean DEFAULT false,
  finalized_by uuid,
  finalized_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_pl_pkey PRIMARY KEY (id),
  CONSTRAINT erp_pl_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_pl_unique UNIQUE (tenant_id, period_year, period_month, period_type),
  CONSTRAINT erp_pl_finalized_by_fkey FOREIGN KEY (finalized_by) REFERENCES public.erp_staff(id)
);

-- 3.5 Cash Reconciliation (สรุปงบดุลเงินสดย่อย)
CREATE TABLE IF NOT EXISTS public.erp_cash_reconciliations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  reconciliation_date date NOT NULL DEFAULT CURRENT_DATE,
  pool_type text NOT NULL,
  opening_balance numeric NOT NULL DEFAULT 0.00,
  total_income numeric DEFAULT 0.00,
  total_expense numeric DEFAULT 0.00,
  expected_balance numeric DEFAULT 0.00,
  actual_balance numeric NOT NULL DEFAULT 0.00,
  variance numeric DEFAULT 0.00,
  variance_reason text,
  status text DEFAULT 'pending',
  counted_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_cr_pkey PRIMARY KEY (id),
  CONSTRAINT erp_cr_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_cr_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_cr_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id)
);


-- ============================================================
-- MODULE 4: CRM (ลูกค้าสัมพันธ์ — Churn + Preferences)
-- ============================================================

-- 4.1 CRM Interactions (บันทึกการติดต่อ)
CREATE TABLE IF NOT EXISTS public.erp_crm_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  member_id uuid NOT NULL,
  interaction_type text NOT NULL, -- call / line / email / visit / complaint / feedback
  direction text DEFAULT 'outbound',
  subject text,
  content text,
  sentiment text, -- positive / neutral / negative
  follow_up_required boolean DEFAULT false,
  follow_up_date date,
  follow_up_done boolean DEFAULT false,
  handled_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_ci_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ci_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_ci_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_ci_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES public.erp_staff(id)
);

-- 4.2 CRM Campaigns (แคมเปญ)
CREATE TABLE IF NOT EXISTS public.erp_crm_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_name text NOT NULL,
  campaign_type text NOT NULL, -- line_push / sms / email / in_app / promotion
  status text DEFAULT 'draft',
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
  CONSTRAINT erp_cc_pkey PRIMARY KEY (id),
  CONSTRAINT erp_cc_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_cc_promotion_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT erp_cc_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id)
);

-- 4.3 Campaign Members
CREATE TABLE IF NOT EXISTS public.erp_crm_campaign_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_id uuid NOT NULL,
  member_id uuid NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamp with time zone,
  opened_at timestamp with time zone,
  converted_at timestamp with time zone,
  conversion_value numeric DEFAULT 0.00,
  CONSTRAINT erp_ccm_pkey PRIMARY KEY (id),
  CONSTRAINT erp_ccm_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_ccm_campaign_fkey FOREIGN KEY (campaign_id) REFERENCES public.erp_crm_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT erp_ccm_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_ccm_unique UNIQUE (tenant_id, campaign_id, member_id)
);

-- 4.4 Churn Scores (คะแนนเสี่ยง — หัวใจของ Pinto CRM)
CREATE TABLE IF NOT EXISTS public.erp_churn_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  member_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0.0, -- 0.0 = safe, 1.0 = about to leave
  risk_level text DEFAULT 'low', -- low / medium / high / critical
  days_since_last_order integer DEFAULT 0,
  order_frequency_30d integer DEFAULT 0,
  order_frequency_90d integer DEFAULT 0,
  avg_order_value numeric DEFAULT 0.00,
  streak_current integer DEFAULT 0,
  streak_longest integer DEFAULT 0,
  total_lifetime_value numeric DEFAULT 0.00,
  package_status text,
  last_interaction_date date,
  satisfaction_avg numeric DEFAULT 0.0,
  calculated_at timestamp with time zone DEFAULT now(),
  model_version text DEFAULT 'v1',
  CONSTRAINT erp_cs_pkey PRIMARY KEY (id),
  CONSTRAINT erp_cs_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_cs_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_cs_unique UNIQUE (tenant_id, member_id)
);

-- 4.5 Menu Preferences (ความชอบอาหาร — Auto-matching)
CREATE TABLE IF NOT EXISTS public.erp_menu_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  member_id uuid NOT NULL,
  preference_type text NOT NULL, -- protein / category / cuisine / cooking_method / ingredient
  preference_value text NOT NULL,
  preference_level text DEFAULT 'like', -- love / like / neutral / dislike / allergic
  source text DEFAULT 'auto', -- auto / manual / system
  confidence numeric DEFAULT 0.5,
  order_count integer DEFAULT 0,
  last_ordered_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_mp_pkey PRIMARY KEY (id),
  CONSTRAINT erp_mp_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_mp_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id),
  CONSTRAINT erp_mp_unique UNIQUE (tenant_id, member_id, preference_type, preference_value)
);


-- ============================================================
-- MODULE 5: LOGISTICS & ROUTE (ขนส่ง — Route Optimizer)
-- ============================================================

-- 5.1 Delivery Routes (เส้นทาง)
CREATE TABLE IF NOT EXISTS public.erp_delivery_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  route_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text DEFAULT 'morning',
  rider_id uuid NOT NULL,
  status text DEFAULT 'planned',
  total_stops integer DEFAULT 0,
  total_distance_km numeric DEFAULT 0.00,
  estimated_duration_minutes integer DEFAULT 0,
  actual_duration_minutes integer,
  optimization_method text DEFAULT 'nearest_neighbor',
  optimization_score numeric DEFAULT 0.0,
  departed_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_dr_pkey PRIMARY KEY (id),
  CONSTRAINT erp_dr_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_dr_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_dr_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.erp_staff(id)
);

-- 5.2 Route Stops (จุดจอด)
CREATE TABLE IF NOT EXISTS public.erp_delivery_route_stops (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  route_id uuid NOT NULL,
  stop_order integer NOT NULL,
  delivery_id uuid,
  member_id uuid,
  address text,
  lat numeric,
  lng numeric,
  distance_from_prev_km numeric DEFAULT 0.00,
  estimated_arrival timestamp with time zone,
  actual_arrival timestamp with time zone,
  status text DEFAULT 'pending',
  delivery_proof_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_drs_pkey PRIMARY KEY (id),
  CONSTRAINT erp_drs_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_drs_route_fkey FOREIGN KEY (route_id) REFERENCES public.erp_delivery_routes(id) ON DELETE CASCADE,
  CONSTRAINT erp_drs_delivery_fkey FOREIGN KEY (delivery_id) REFERENCES public.erp_deliveries(id),
  CONSTRAINT erp_drs_member_fkey FOREIGN KEY (member_id) REFERENCES public.members(id)
);

-- 5.3 Rider GPS Logs
CREATE TABLE IF NOT EXISTS public.erp_rider_gps_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  rider_id uuid NOT NULL,
  route_id uuid,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  speed_kmh numeric DEFAULT 0.0,
  heading numeric DEFAULT 0.0,
  accuracy_meters numeric DEFAULT 0.0,
  battery_level integer,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT erp_gps_pkey PRIMARY KEY (id),
  CONSTRAINT erp_gps_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_gps_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_gps_route_fkey FOREIGN KEY (route_id) REFERENCES public.erp_delivery_routes(id)
);

-- 5.4 Rider Performance (ผลงานรายวัน)
CREATE TABLE IF NOT EXISTS public.erp_rider_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  rider_id uuid NOT NULL,
  period_date date NOT NULL,
  total_deliveries integer DEFAULT 0,
  on_time_deliveries integer DEFAULT 0,
  late_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0,
  on_time_pct numeric DEFAULT 0.0,
  total_distance_km numeric DEFAULT 0.00,
  total_ratings integer DEFAULT 0,
  avg_rating numeric DEFAULT 0.0,
  complaints integer DEFAULT 0,
  total_earnings numeric DEFAULT 0.00,
  fuel_claimed numeric DEFAULT 0.00,
  performance_score numeric DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_rp_pkey PRIMARY KEY (id),
  CONSTRAINT erp_rp_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_rp_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_rp_unique UNIQUE (tenant_id, rider_id, period_date)
);

-- 5.5 Fuel Claims (เบิกค่าน้ำมัน)
CREATE TABLE IF NOT EXISTS public.erp_fuel_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  rider_id uuid NOT NULL,
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  route_id uuid,
  distance_km numeric NOT NULL,
  distance_source text DEFAULT 'gps',
  rate_per_km numeric NOT NULL DEFAULT 3.00,
  vehicle_type text DEFAULT 'motorcycle',
  fuel_amount numeric NOT NULL DEFAULT 0.00,
  surcharge numeric DEFAULT 0.00,
  total_claim numeric NOT NULL DEFAULT 0.00,
  status text DEFAULT 'pending', -- pending / approved / rejected / paid
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  paid_at timestamp with time zone,
  receipt_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT erp_fc_pkey PRIMARY KEY (id),
  CONSTRAINT erp_fc_tenant_fkey FOREIGN KEY (tenant_id) REFERENCES public.erp_tenants(id),
  CONSTRAINT erp_fc_rider_fkey FOREIGN KEY (rider_id) REFERENCES public.erp_staff(id),
  CONSTRAINT erp_fc_route_fkey FOREIGN KEY (route_id) REFERENCES public.erp_delivery_routes(id),
  CONSTRAINT erp_fc_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.erp_staff(id)
);


-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================

-- Tenant isolation (critical for SaaS)
CREATE INDEX IF NOT EXISTS idx_prod_orders_tenant ON public.erp_production_orders (tenant_id, production_date);
CREATE INDEX IF NOT EXISTS idx_food_safety_tenant ON public.erp_food_safety_logs (tenant_id, log_date);
CREATE INDEX IF NOT EXISTS idx_stock_deductions_tenant ON public.erp_stock_deductions (tenant_id, production_order_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_tenant ON public.erp_demand_forecasts (tenant_id, forecast_date);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.erp_purchase_orders (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_tenant ON public.erp_goods_receipts (tenant_id, receipt_date);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_tenant ON public.erp_supplier_price_lists (tenant_id, supplier_id);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.erp_invoices (tenant_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_member ON public.erp_invoices (tenant_id, member_id);
CREATE INDEX IF NOT EXISTS idx_pl_tenant ON public.erp_pl_snapshots (tenant_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_tenant ON public.erp_crm_interactions (tenant_id, member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_tenant ON public.erp_churn_scores (tenant_id, risk_level, score DESC);
CREATE INDEX IF NOT EXISTS idx_menu_prefs_tenant ON public.erp_menu_preferences (tenant_id, member_id);

CREATE INDEX IF NOT EXISTS idx_routes_tenant ON public.erp_delivery_routes (tenant_id, route_date, rider_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_tenant ON public.erp_delivery_route_stops (tenant_id, route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_gps_logs_tenant ON public.erp_rider_gps_logs (tenant_id, rider_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_claims_tenant ON public.erp_fuel_claims (tenant_id, rider_id, claim_date);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON public.erp_tenant_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subs_tenant ON public.erp_tenant_subscriptions (tenant_id, status);


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Tenant Isolation
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE public.erp_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_production_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_stock_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_food_safety_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_supplier_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_pl_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_cash_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_crm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_crm_campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_churn_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_menu_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_delivery_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_rider_gps_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_rider_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fuel_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_tenant_configs ENABLE ROW LEVEL SECURITY;

-- Default tenant policy: authenticated users of Clean Food CR can access their own tenant data
-- NOTE: In production, replace with JWT claim-based tenant_id extraction
-- e.g. (auth.jwt() ->> 'tenant_id')::uuid = tenant_id

CREATE POLICY "tenant_isolation_default" ON public.erp_production_orders FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_production_order_items FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_stock_deductions FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_food_safety_logs FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_demand_forecasts FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_purchase_orders FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_purchase_order_items FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_goods_receipts FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_goods_receipt_items FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_supplier_price_lists FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_bank_accounts FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_invoices FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_invoice_items FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_pl_snapshots FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_cash_reconciliations FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_crm_interactions FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_crm_campaigns FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_crm_campaign_members FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_churn_scores FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_menu_preferences FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_delivery_routes FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_delivery_route_stops FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_rider_gps_logs FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_rider_performance FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "tenant_isolation_default" ON public.erp_fuel_claims FOR ALL USING (tenant_id = '00000000-0000-0000-0000-000000000001');


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-generate PO Number: PO-YYYYMM-XXXX (tenant-scoped)
CREATE OR REPLACE FUNCTION public.generate_po_number(p_tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS text AS $$
DECLARE
  prefix text;
  seq integer;
BEGIN
  prefix := 'PO-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM length(prefix) + 1) AS integer)), 0) + 1
  INTO seq
  FROM public.erp_purchase_orders
  WHERE tenant_id = p_tenant_id AND po_number LIKE prefix || '%';
  RETURN prefix || LPAD(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate GR Number: GR-YYYYMM-XXXX (tenant-scoped)
CREATE OR REPLACE FUNCTION public.generate_gr_number(p_tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS text AS $$
DECLARE
  prefix text;
  seq integer;
BEGIN
  prefix := 'GR-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(gr_number FROM length(prefix) + 1) AS integer)), 0) + 1
  INTO seq
  FROM public.erp_goods_receipts
  WHERE tenant_id = p_tenant_id AND gr_number LIKE prefix || '%';
  RETURN prefix || LPAD(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-generate Invoice Number: INV-YYYYMM-XXXX (tenant-scoped)
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001')
RETURNS text AS $$
DECLARE
  prefix text;
  seq integer;
BEGIN
  prefix := 'INV-' || to_char(CURRENT_DATE, 'YYYYMM') || '-';
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM length(prefix) + 1) AS integer)), 0) + 1
  INTO seq
  FROM public.erp_invoices
  WHERE tenant_id = p_tenant_id AND invoice_number LIKE prefix || '%';
  RETURN prefix || LPAD(seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- SUMMARY (Post-Feedback Revision)
-- ============================================================
-- Total NEW tables: 29 (was 36, removed 5 HR/Payroll + 2 tax)
-- ✅ tenant_id on EVERY table — no exceptions
-- ✅ RLS enabled + default policies for Clean Food CR
-- ✅ HR/Payroll REMOVED — wait for 3+ paying customers
-- ✅ Re-anchored as "ระบบปิ่นโต subscription"
--
-- Module 0 - Multi-Tenancy:     4 tables (tenant, subscription, users, configs)
-- Module 1 - Kitchen Depth:     5 tables (production, items, deductions, food safety, forecast)
-- Module 2 - Procurement:       5 tables (PO, PO items, GR, GR items, price lists)
-- Module 3 - Accounting:        5 tables (bank, invoices, invoice items, P&L, cash recon)
-- Module 4 - CRM:               5 tables (interactions, campaigns, members, churn, preferences)
-- Module 5 - Logistics & Route: 5 tables (routes, stops, GPS, performance, fuel claims)
-- Plus: 20 performance indexes, RLS on 29 tables, 3 helper functions
-- ============================================================
