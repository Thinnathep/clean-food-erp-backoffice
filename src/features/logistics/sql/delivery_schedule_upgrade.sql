-- ==============================================================================
-- Clean Food Chiang Rai - Delivery System Upgrade (Monday & Thursday + Dynamic Rounds)
-- ==============================================================================

-- 1. Add delivery_days, delivery_rounds, and delivery_rounds_plan to pinto_packages
ALTER TABLE IF EXISTS public.pinto_packages
  ADD COLUMN IF NOT EXISTS delivery_days integer[] DEFAULT ARRAY[1, 4],
  ADD COLUMN IF NOT EXISTS delivery_rounds integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delivery_rounds_plan jsonb DEFAULT NULL;

-- 2. Add preferred_delivery_days to members
ALTER TABLE IF EXISTS public.members
  ADD COLUMN IF NOT EXISTS preferred_delivery_days integer[] DEFAULT ARRAY[1, 4];

-- 3. Create erp_system_configs table if not exists (with RLS enabled)
CREATE TABLE IF NOT EXISTS public.erp_system_configs (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.erp_system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pinto_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;

-- 4. Upsert default store delivery schedule in erp_system_configs (Monday & Thursday)
INSERT INTO public.erp_system_configs (key, value, description, updated_at)
VALUES (
  'DELIVERY_SCHEDULE',
  '{
    "active_days": [1, 4],
    "delivery_time_slot": "11:00 - 13:00",
    "mode": "mon_thu"
  }'::jsonb,
  'รอบวันจัดส่งหลักของร้าน Clean Food Chiang Rai (ค่าเริ่มต้น: จันทร์ และ พฤหัสบดี)',
  now()
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- 5. Also upsert to erp_settings if it exists (for dual compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'erp_settings') THEN
    INSERT INTO public.erp_settings (key, value, description, updated_at)
    VALUES (
      'DELIVERY_SCHEDULE',
      '{
        "active_days": [1, 4],
        "delivery_time_slot": "11:00 - 13:00",
        "mode": "mon_thu"
      }'::jsonb,
      'รอบวันจัดส่งหลักของร้าน Clean Food Chiang Rai (ค่าเริ่มต้น: จันทร์ และ พฤหัสบดี)',
      now()
    )
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
END
$$;

-- 6. Verify and Hardening RLS Policies (Database-First Enforcement - Rule 1)
DO $$
BEGIN
    -- Authenticated staff full access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pinto_packages' AND policyname = 'auth_staff_all') THEN
        CREATE POLICY "auth_staff_all" ON public.pinto_packages
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_system_configs' AND policyname = 'auth_staff_all') THEN
        CREATE POLICY "auth_staff_all" ON public.erp_system_configs
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Public / anon read for system configs (e.g. customer-facing schedule queries)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_system_configs' AND policyname = 'anon_read_configs') THEN
        CREATE POLICY "anon_read_configs" ON public.erp_system_configs
        FOR SELECT TO anon USING (true);
    END IF;
END
$$;
