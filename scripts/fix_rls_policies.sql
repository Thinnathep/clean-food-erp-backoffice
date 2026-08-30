-- ==============================================================================
-- Clean Food CR ERP — RLS Security Hardening Migration
-- Fixes missing policies on 5 tables with RLS enabled:
-- 1. erp_recipe_steps
-- 2. erp_tenants
-- 3. erp_tenant_users
-- 4. erp_tenant_configs
-- 5. erp_tenant_subscriptions
-- ==============================================================================

-- 1. erp_recipe_steps: Allow authenticated staff to view and edit recipe steps
ALTER TABLE public.erp_recipe_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated staff to read recipe steps" ON public.erp_recipe_steps;
CREATE POLICY "Allow authenticated staff to read recipe steps"
ON public.erp_recipe_steps
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow kitchen and managers to manage recipe steps" ON public.erp_recipe_steps;
CREATE POLICY "Allow kitchen and managers to manage recipe steps"
ON public.erp_recipe_steps
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
  )
);

-- 2. erp_tenants: Allow authenticated staff to read and manage tenant configs
ALTER TABLE public.erp_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated staff to read tenants" ON public.erp_tenants;
CREATE POLICY "Allow authenticated staff to read tenants"
ON public.erp_tenants
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage tenants" ON public.erp_tenants;
CREATE POLICY "Allow admin to manage tenants"
ON public.erp_tenants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role IN ('ADMIN', 'MANAGER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role IN ('ADMIN', 'MANAGER')
  )
);

-- 3. erp_tenant_users: Allow authenticated staff to access tenant user records
ALTER TABLE public.erp_tenant_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated staff to read tenant users" ON public.erp_tenant_users;
CREATE POLICY "Allow authenticated staff to read tenant users"
ON public.erp_tenant_users
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage tenant users" ON public.erp_tenant_users;
CREATE POLICY "Allow admin to manage tenant users"
ON public.erp_tenant_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role = 'ADMIN'
  )
);

-- 4. erp_tenant_configs: Allow authenticated staff to read/write configs
ALTER TABLE public.erp_tenant_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated staff to read tenant configs" ON public.erp_tenant_configs;
CREATE POLICY "Allow authenticated staff to read tenant configs"
ON public.erp_tenant_configs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage tenant configs" ON public.erp_tenant_configs;
CREATE POLICY "Allow admin to manage tenant configs"
ON public.erp_tenant_configs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role IN ('ADMIN', 'MANAGER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role IN ('ADMIN', 'MANAGER')
  )
);

-- 5. erp_tenant_subscriptions: Allow authenticated staff to view subscription status
ALTER TABLE public.erp_tenant_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated staff to read tenant subscriptions" ON public.erp_tenant_subscriptions;
CREATE POLICY "Allow authenticated staff to read tenant subscriptions"
ON public.erp_tenant_subscriptions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow admin to manage tenant subscriptions" ON public.erp_tenant_subscriptions;
CREATE POLICY "Allow admin to manage tenant subscriptions"
ON public.erp_tenant_subscriptions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.erp_staff
    WHERE erp_staff.id = auth.uid()
    AND erp_staff.is_active = true
    AND erp_staff.role = 'ADMIN'
  )
);
