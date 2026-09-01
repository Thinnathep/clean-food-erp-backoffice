-- ==============================================================================
-- Clean Food CR ERP — Accounting & Finance Security & Schema Hardening Migration
-- ==============================================================================
-- Rule 1: Database-First Enforcement
-- All authorization logic is enforced at the PostgreSQL RLS level.
-- ADMIN (CEO/CFO) has supreme authority on all financial tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable Row Level Security (RLS) on all 10 Finance Tables
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.erp_fund_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_revenue_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_split_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_cash_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_pl_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.erp_bank_accounts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Helper Security Functions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_finance_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. RLS Policies: erp_fund_pools
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_fund_pools" ON public.erp_fund_pools;
CREATE POLICY "Admin full access on erp_fund_pools" ON public.erp_fund_pools
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read public fund pools" ON public.erp_fund_pools;
CREATE POLICY "Staff read public fund pools" ON public.erp_fund_pools
FOR SELECT TO authenticated
USING (public.is_active_staff() AND (visibility = 'ALL' OR public.is_finance_admin()));

-- ------------------------------------------------------------------------------
-- 4. RLS Policies: erp_fund_transactions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_fund_transactions" ON public.erp_fund_transactions;
CREATE POLICY "Admin full access on erp_fund_transactions" ON public.erp_fund_transactions
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read fund transactions" ON public.erp_fund_transactions;
CREATE POLICY "Staff read fund transactions" ON public.erp_fund_transactions
FOR SELECT TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff insert fund transactions" ON public.erp_fund_transactions;
CREATE POLICY "Staff insert fund transactions" ON public.erp_fund_transactions
FOR INSERT TO authenticated
WITH CHECK (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- 5. RLS Policies: erp_revenue_buckets
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_revenue_buckets" ON public.erp_revenue_buckets;
CREATE POLICY "Admin full access on erp_revenue_buckets" ON public.erp_revenue_buckets
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read revenue buckets" ON public.erp_revenue_buckets;
CREATE POLICY "Staff read revenue buckets" ON public.erp_revenue_buckets
FOR SELECT TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff insert revenue buckets" ON public.erp_revenue_buckets;
CREATE POLICY "Staff insert revenue buckets" ON public.erp_revenue_buckets
FOR INSERT TO authenticated
WITH CHECK (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- 6. RLS Policies: erp_cash_reconciliations
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_cash_reconciliations" ON public.erp_cash_reconciliations;
CREATE POLICY "Admin full access on erp_cash_reconciliations" ON public.erp_cash_reconciliations
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read cash reconciliations" ON public.erp_cash_reconciliations;
CREATE POLICY "Staff read cash reconciliations" ON public.erp_cash_reconciliations
FOR SELECT TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff insert cash reconciliations" ON public.erp_cash_reconciliations;
CREATE POLICY "Staff insert cash reconciliations" ON public.erp_cash_reconciliations
FOR INSERT TO authenticated
WITH CHECK (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- 7. RLS Policies: erp_invoices & erp_invoice_items
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_invoices" ON public.erp_invoices;
CREATE POLICY "Admin full access on erp_invoices" ON public.erp_invoices
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read and create invoices" ON public.erp_invoices;
CREATE POLICY "Staff read and create invoices" ON public.erp_invoices
FOR SELECT TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff insert invoices" ON public.erp_invoices;
CREATE POLICY "Staff insert invoices" ON public.erp_invoices
FOR INSERT TO authenticated
WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Admin full access on erp_invoice_items" ON public.erp_invoice_items;
CREATE POLICY "Admin full access on erp_invoice_items" ON public.erp_invoice_items
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read and create invoice items" ON public.erp_invoice_items;
CREATE POLICY "Staff read and create invoice items" ON public.erp_invoice_items
FOR SELECT TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "Staff insert invoice items" ON public.erp_invoice_items;
CREATE POLICY "Staff insert invoice items" ON public.erp_invoice_items
FOR INSERT TO authenticated
WITH CHECK (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- 8. RLS Policies: erp_pl_snapshots
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_pl_snapshots" ON public.erp_pl_snapshots;
CREATE POLICY "Admin full access on erp_pl_snapshots" ON public.erp_pl_snapshots
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read pl snapshots" ON public.erp_pl_snapshots;
CREATE POLICY "Staff read pl snapshots" ON public.erp_pl_snapshots
FOR SELECT TO authenticated
USING (public.is_active_staff());

-- ------------------------------------------------------------------------------
-- 9. RLS Policies: erp_bank_accounts
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_bank_accounts" ON public.erp_bank_accounts;
CREATE POLICY "Admin full access on erp_bank_accounts" ON public.erp_bank_accounts
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read active bank accounts" ON public.erp_bank_accounts;
CREATE POLICY "Staff read active bank accounts" ON public.erp_bank_accounts
FOR SELECT TO authenticated
USING (public.is_active_staff() AND is_active = true);

-- ------------------------------------------------------------------------------
-- 10. RLS Policies: erp_split_configs & erp_expense_categories
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access on erp_split_configs" ON public.erp_split_configs;
CREATE POLICY "Admin full access on erp_split_configs" ON public.erp_split_configs
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read split configs" ON public.erp_split_configs;
CREATE POLICY "Staff read split configs" ON public.erp_split_configs
FOR SELECT TO authenticated
USING (public.is_active_staff());

DROP POLICY IF EXISTS "Admin full access on erp_expense_categories" ON public.erp_expense_categories;
CREATE POLICY "Admin full access on erp_expense_categories" ON public.erp_expense_categories
FOR ALL TO authenticated
USING (public.is_finance_admin())
WITH CHECK (public.is_finance_admin());

DROP POLICY IF EXISTS "Staff read expense categories" ON public.erp_expense_categories;
CREATE POLICY "Staff read expense categories" ON public.erp_expense_categories
FOR SELECT TO authenticated
USING (public.is_active_staff() AND is_active = true);
