
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load env local
try {
    const envPath = path.resolve(__dirname, '../../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.trim();
        }
    });
} catch (e) {
    console.error("Error loading .env.local:", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
    console.log('--- DEBUGGING AUDIT LOGS (JS) ---');

    if (!supabaseServiceKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
        return;
    }

    // 1. Check with Service Role (Bypass RLS)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminData, error: adminError, count: adminCount } = await adminClient
        .from('audit_logs')
        .select('*', { count: 'exact' });

    if (adminError) {
        console.error('Service Role Query Failed:', adminError);
    } else {
        console.log(`Service Role found ${adminCount} logs.`);
        if (adminData && adminData.length > 0) {
            console.log('Sample Log:', adminData[0]);
        }
    }

    console.log('--- END DEBUG ---');
}

main();
