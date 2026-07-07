import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenuItems() {
  console.log('Checking menu_items count without auth...');
  const { count: anonCount, error: anonError } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });
    
  if (anonError) {
    console.error('Anon Error:', anonError);
  } else {
    console.log('Total menu_items visible to anon:', anonCount);
  }
}

checkMenuItems();
