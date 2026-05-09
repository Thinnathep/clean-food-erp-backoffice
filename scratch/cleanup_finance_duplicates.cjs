const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env'));
const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function cleanup() {
  console.log("--- Starting Financial Split Model Cleanup ---");
  
  // 1. Fetch all split configs
  const { data: configs, error: configError } = await supabase
    .from('erp_split_configs')
    .select('*')
    .order('config_name');
  
  if (configError) return console.error(configError);

  // Group by name
  const groups = {};
  configs.forEach(c => {
    if (!groups[c.config_name]) groups[c.config_name] = [];
    groups[c.config_name].push(c);
  });

  for (const name in groups) {
    const list = groups[name];
    if (list.length > 1) {
      console.log(`Found ${list.length} duplicates for: "${name}"`);
      
      const primary = list[0]; // Keep the first one
      const duplicates = list.slice(1);
      const duplicateIds = duplicates.map(d => d.id);

      // 2. Update all promotions to use the primary ID
      console.log(`  Updating promotions to use primary ID: ${primary.id}`);
      const { error: promoError } = await supabase
        .from('promotions')
        .update({ split_config_id: primary.id })
        .in('split_config_id', duplicateIds);
      
      if (promoError) {
        console.error(`  Error updating promotions:`, promoError);
        continue;
      }

      // 3. Update all revenue buckets to use the primary ID
      console.log(`  Updating revenue buckets to use primary ID: ${primary.id}`);
      const { error: bucketError } = await supabase
        .from('erp_revenue_buckets')
        .update({ split_config_id: primary.id })
        .in('split_config_id', duplicateIds);

      if (bucketError) {
        console.error(`  Error updating buckets:`, bucketError);
      }

      // 4. Delete the duplicates
      console.log(`  Deleting duplicates...`);
      const { error: deleteError } = await supabase
        .from('erp_split_configs')
        .delete()
        .in('id', duplicateIds);

      if (deleteError) {
        console.error(`  Error deleting duplicates:`, deleteError);
      } else {
        console.log(`  Successfully cleaned up duplicates for "${name}"`);
      }
    }
  }
  
  console.log("--- Cleanup Finished ---");
}

cleanup();
