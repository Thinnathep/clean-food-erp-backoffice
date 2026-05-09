const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function listTables() {
  const { data, error } = await supabase.from('erp_split_configs').select('*');
  if (error) {
    console.error("Error fetching split_configs:", error);
  } else {
    console.log("Split Configs Data:", JSON.stringify(data, null, 2));
  }
}

listTables();
