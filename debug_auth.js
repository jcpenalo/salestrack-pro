
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkUser(email) {
    console.log(`Checking user: ${email}`);

    // 1. Get from Auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Auth Error:', authError);
        return;
    }
    const authUser = users.find(u => u.email === email);
    console.log('--- Auth User ---');
    if (authUser) {
        console.log(`ID: ${authUser.id}`);
        console.log(`Email Confirmed At: ${authUser.email_confirmed_at}`);
        console.log(`Last Sign In: ${authUser.last_sign_in_at}`);
    } else {
        console.log('NOT FOUND in Auth');
    }

    // 2. Get from Public
    const { data: publicUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    console.log('--- Public User ---');
    if (dbError) {
        console.error('DB Error:', dbError);
    } else {
        console.log(`ID: ${publicUser.id}`);
        console.log(`Role: ${publicUser.role}`);
    }

    // 3. Compare
    if (authUser && publicUser) {
        if (authUser.id === publicUser.id) {
            console.log('IDs MATCH ✅');
        } else {
            console.log('IDs MISMATCH ❌');
        }
    }
}

checkUser('jcpenalo@gmail.com');
