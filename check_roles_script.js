const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zwfghhvwenpneerjzgal.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data, error } = await supabase.from('users').select('role, email, full_name');
    if (error) console.error(error);
    else console.log('Users:', JSON.stringify(data, null, 2));
}

checkRoles();
