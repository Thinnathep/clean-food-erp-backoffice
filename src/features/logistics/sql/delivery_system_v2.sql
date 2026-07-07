-- Delivery System V2 Migration

-- 1. Create erp_vehicles table
CREATE TABLE IF NOT EXISTS public.erp_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'motorcycle',
  license_plate text,
  fuel_type text NOT NULL DEFAULT 'gasohol95',
  fuel_efficiency numeric NOT NULL DEFAULT 48,
  purchase_price numeric DEFAULT 55000,
  expected_lifespan_km numeric DEFAULT 100000,
  depreciation_per_km numeric GENERATED ALWAYS AS (
    CASE WHEN expected_lifespan_km > 0
         THEN purchase_price / expected_lifespan_km ELSE 0 END
  ) STORED,
  maintenance_per_km numeric DEFAULT 0.5,
  insurance_annual numeric DEFAULT 3000,
  estimated_trips_per_year numeric DEFAULT 1000,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create erp_fuel_prices table
CREATE TABLE IF NOT EXISTS public.erp_fuel_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type text NOT NULL UNIQUE,
  price_per_liter numeric NOT NULL,
  source text DEFAULT 'bangchak_api',
  updated_at timestamptz DEFAULT now()
);

-- 3. Create erp_pickup_orders table
CREATE TABLE IF NOT EXISTS public.erp_pickup_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  schedule_id uuid,
  member_id uuid,
  customer_name text,
  customer_phone text,
  pickup_date date NOT NULL DEFAULT CURRENT_DATE,
  pickup_time_confirmed time,
  actual_pickup_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  cancel_reason text,
  auto_expire_days integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Add delivery_method to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'self_delivery';

-- 5. Enable RLS
ALTER TABLE public.erp_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_pickup_orders ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DO $$
BEGIN
    -- erp_vehicles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_vehicles' AND policyname = 'auth_crud') THEN
        CREATE POLICY "auth_crud" ON public.erp_vehicles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- erp_fuel_prices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_fuel_prices' AND policyname = 'auth_crud') THEN
        CREATE POLICY "auth_crud" ON public.erp_fuel_prices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- erp_pickup_orders
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'erp_pickup_orders' AND policyname = 'auth_crud') THEN
        CREATE POLICY "auth_crud" ON public.erp_pickup_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- 7. Seed Data
-- Note: using ON CONFLICT to avoid duplicate key errors if run multiple times.
-- Seed erp_fuel_prices
INSERT INTO public.erp_fuel_prices (fuel_type, price_per_liter) VALUES
('gasohol91', 36.08), 
('gasohol95', 36.65),
('diesel', 29.94), 
('e20', 34.24)
ON CONFLICT (fuel_type) DO UPDATE SET price_per_liter = EXCLUDED.price_per_liter;

-- We don't use ON CONFLICT for vehicles since they don't have a unique constraint other than ID,
-- but we only insert if the table is empty to prevent duplicates on rerun.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.erp_vehicles) THEN
        INSERT INTO public.erp_vehicles (name, vehicle_type, fuel_type, fuel_efficiency,
          purchase_price, expected_lifespan_km, maintenance_per_km, insurance_annual, is_default)
        VALUES
        ('Grand Filano Hybrid', 'motorcycle', 'gasohol95', 48, 55000, 100000, 0.5, 3000, true),
        ('R15 V4', 'motorcycle', 'gasohol95', 38, 85000, 100000, 0.8, 3500, false);
    END IF;
END
$$;
