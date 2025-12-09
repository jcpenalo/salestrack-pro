
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking users table for supervisor_id...');
    const { data, error } = await supabase
        .from('users')
        .select('id, supervisor_id')
        .limit(1);

    if (error) {
        console.error('Error selecting supervisor_id:', error.message);
        console.log('Column likely missing.');
    } else {
        console.log('Success! supervisor_id exists.');
    }
}

check();
