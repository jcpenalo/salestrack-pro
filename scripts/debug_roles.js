
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

    console.log("--- DEBUGGING ROLES ---");

    // Fetch unique roles to check casing
    const { data: users, error } = await adminClient
        .from('users')
        .select('email, role')
        .limit(10);

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Users found:', users);
        users.forEach(u => {
            console.log(`User: ${u.email} | Role: '${u.role}'`);
        });
    }
}

main();
