import { createClient } from '@supabase/supabase-js';

// Use import.meta.env for Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing! Check your environment variables.');
}

// Fallback to empty string to avoid "required" error during build if possible
// but createClient will still fail at runtime if empty
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);
