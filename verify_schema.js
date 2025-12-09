const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking users table schema...');
    const { data, error } = await supabase
        .from('users')
        .select('id, is_active')
        .limit(1);

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Success! Data sample:', data);
    }
}

check();
