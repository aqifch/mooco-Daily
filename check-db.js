import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sjozsnnnhlqpfljphcdi.supabase.co";
const SUPABASE_KEY = "sb_publishable_02pGA-xf6ls7iXFcjpxu-A_ujXIEJyu";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabase() {
  console.log('\n🔍 Checking Supabase Database...\n');
  
  const tables = ['products', 'categories', 'transactions', 'daily_closings', 'users', 'cash_withdrawals'];
  
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false });
      
      console.log(`\n=== ${table.toUpperCase()} ===`);
      
      if (error) {
        console.log(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ Total records: ${count || data?.length || 0}`);
        
        if (data && data.length > 0) {
          console.log(`📄 Sample (first 2 records):`);
          console.log(JSON.stringify(data.slice(0, 2), null, 2));
        }
      }
    } catch (err) {
      console.log(`❌ Error reading ${table}:`, err.message);
    }
  }
  
  console.log('\n✨ Database check complete!\n');
}

checkDatabase().catch(console.error);
