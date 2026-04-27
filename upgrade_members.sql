-- Upgrade members table with marketing and detailed address fields
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS age_range text,
ADD COLUMN IF NOT EXISTS zone text,
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS food_preferences jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS sub_district text,
ADD COLUMN IF NOT EXISTS district text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- Add comment for documentation
COMMENT ON COLUMN public.members.food_preferences IS 'List of food preferences or restrictions as a JSON array';
COMMENT ON COLUMN public.members.zone IS 'Delivery zone or marketing segment';
