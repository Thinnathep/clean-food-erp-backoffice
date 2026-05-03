-- Update for Member Meal Schedules to support Extra Orders (Add-ons)
ALTER TABLE public.erp_member_meal_schedules 
ADD COLUMN is_extra_order boolean DEFAULT false,
ADD COLUMN meal_order_type text DEFAULT 'subscription'::text;

-- Comment for clarity
COMMENT ON COLUMN public.erp_member_meal_schedules.is_extra_order IS 'True if this is an extra order outside the standard subscription package';
COMMENT ON COLUMN public.erp_member_meal_schedules.meal_order_type IS 'Type of order: subscription or a-la-carte';
