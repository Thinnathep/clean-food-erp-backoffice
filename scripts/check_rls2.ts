import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMenuItems() {
  console.log('Fetching menu_items...');
  const { data, error, count } = await supabase
    .from('menu_items')
    .select('id, name, is_available', { count: 'exact' });
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total visible rows:', count);
    console.log('Sample data:', data.slice(0, 5));
    
    const available = data.filter(d => d.is_available).length;
    const hidden = data.filter(d => !d.is_available).length;
    console.log(`Available: ${available}, Hidden: ${hidden}`);
  }
}

checkMenuItems();
