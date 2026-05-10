-- ── LOGISTICS CONFIGURATION SETUP ──
-- Run this script in your Supabase SQL Editor to initialize the shipping settings.

-- 1. Create erp_settings table for general logistics config
CREATE TABLE IF NOT EXISTS public.erp_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create erp_shipping_discounts table for tiered discounts
CREATE TABLE IF NOT EXISTS public.erp_shipping_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_order numeric NOT NULL,
  discount_amount numeric NOT NULL,
  label text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Insert Initial Logistics Configuration
INSERT INTO public.erp_settings (key, value, description)
VALUES ('logistics_config', '{
  "free_delivery_min_order": 150.0,
  "free_delivery_max_distance": 2.0,
  "base_fare": 25.0,
  "base_included_distance": 3.0,
  "fee_per_km_normal": 4.0,
  "fee_per_km_far": 8.0,
  "minimum_order_value": 59.0,
  "vehicle_cost_per_km": 5.0,
  "price_per_box": 59.0
}'::jsonb, 'การตั้งค่าพื้นฐานสำหรับคำนวณค่าจัดส่ง')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 4. Insert Initial Shipping Discounts
-- Clear existing active discounts to avoid duplicates if re-run
UPDATE public.erp_shipping_discounts SET is_active = false;

INSERT INTO public.erp_shipping_discounts (min_order, discount_amount, label)
VALUES 
(1500, 999, 'ส่งฟรี (ไม่เกิน 8 กม.)'),
(900, 80, 'ส่วนลดค่าส่ง ฿80'),
(600, 50, 'ส่วนลดค่าส่ง ฿50'),
(400, 30, 'ส่วนลดค่าส่ง ฿30'),
(280, 20, 'ส่วนลดค่าส่ง ฿20'),
(180, 15, 'ส่วนลดค่าส่ง ฿15');
