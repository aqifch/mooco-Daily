import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sjozsnnnhlqpfljphcdi.supabase.co";
const SUPABASE_KEY = "sb_publishable_02pGA-xf6ls7iXFcjpxu-A_ujXIEJyu";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
    console.log('🔍 Checking daily_closings columns...');

    // Try to select all columns from a single record
    const { data, error } = await supabase
        .from('daily_closings')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found in returned data:', Object.keys(data[0]));
    } else {
        console.log('No data found, cannot infer columns easily via select *. trying to insert dummy to see error or success');
        // We can't easily list columns via API without admin rights or inspection, but we can infer from the user's screenshot that next_day_opening_cash exists.
        // Let's try to select specific columns to see if they error.
        const { error: colError } = await supabase
            .from('daily_closings')
            .select('opening_cash')
            .limit(1);

        if (colError) {
            console.log('opening_cash column likely does NOT exist:', colError.message);
        } else {
            console.log('opening_cash column likely EXISTS');
        }
    }
}

checkColumns();
