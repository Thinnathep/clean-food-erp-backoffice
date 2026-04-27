import { createClient } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

// Try both Vite's import.meta.env and fallback to process.env (injected during build)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing! Check your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);
