import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sjozsnnnhlqpfljphcdi.supabase.co";
const SUPABASE_KEY = "sb_publishable_02pGA-xf6ls7iXFcjpxu-A_ujXIEJyu";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function addColumn() {
  console.log('🚀 Adding opening_cash column to daily_closings...');
  console.log('🔄 Attempting to run via RPC (exec_sql)...');

  const sql = `
    ALTER TABLE daily_closings ADD COLUMN IF NOT EXISTS opening_cash NUMERIC;
    ALTER TABLE daily_closings ADD COLUMN IF NOT EXISTS next_day_opening_cash NUMERIC;
  `;

  try {
    // Try common RPC names for SQL execution
    let error;

    // Attempt 1: exec_sql
    ({ error } = await supabase.rpc('exec_sql', { sql_query: sql }));

    if (error) {
      console.log('❌ RPC exec_sql failed:', error.message);

      // Attempt 2: execute_sql
      ({ error } = await supabase.rpc('execute_sql', { sql }));

      if (error) {
        console.log('❌ RPC execute_sql failed:', error.message);
        throw new Error("Could not execute SQL via RPC. Admin access required.");
      }
    }
    console.log('✅ SQL executed successfully via RPC!');
  } catch (err) {
    console.log('\n⚠️ AUTOMATED MIGRATION FAILED.');
    console.log('Reason: ' + err.message);
    console.log('\nPLEASE RUN THIS SQL MANUALLY IN SUPABASE DASHBOARD:');
    console.log('===================================================');
    console.log(sql);
    console.log('===================================================');
  }
}

addColumn();
