
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function main() {
    if (!supabaseServiceKey) {
        console.error('Missing Service Key');
        return;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    console.log("--- INSPECT AUDIT LOGS ---");

    // We can't query information_schema easily via client, so we test the relationship query directly
    // Using Service Role to rule out RLS

    const { data, error } = await adminClient
        .from('audit_logs')
        .select(`
            id,
            changed_by,
            users:changed_by (email, role)
        `)
        .limit(5);

    if (error) {
        console.error('Relationship Query Error:', error);
        console.log('Use * query to check raw columns:');
        const { data: raw, error: rawError } = await adminClient.from('audit_logs').select('*').limit(1);
        console.log('Raw Data sample:', raw ? raw[0] : rawError);
    } else {
        console.log('Relationship Query Success:', data);
    }
}

main();
