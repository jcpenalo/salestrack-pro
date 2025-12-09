
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Manually parse .env.local
let env = {};
try {
    const envPath = path.resolve(__dirname, '../../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...rest] = line.split('=');
        if (key && rest) {
            env[key.trim()] = rest.join('=').trim().replace(/"/g, ''); // Simple parser
        }
    });
} catch (e) {
    console.error('Could not read .env.local:', e.message);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars. Ensure .env.local exists.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFixPermissions() {
    console.log('Checking permissions...');

    const roles = ['admin', 'gerente', 'senior', 'supervisor', 'auditor', 'seguimiento', 'digitacion', 'representative'];

    // 1. Overview
    const { data: existing, error } = await supabase
        .from('app_permissions')
        .select('*')
        .eq('resource_key', 'tab:overview');

    if (error) {
        console.error('Error fetching permissions:', error);
        return;
    }

    if (!existing || existing.length === 0) {
        console.log('Inserting default permissions for tab:overview...');
        const inserts = roles.map(role => ({
            role,
            resource_key: 'tab:overview',
            is_allowed: true
        }));
        const { error: insertError } = await supabase.from('app_permissions').insert(inserts);
        if (insertError) console.error('Insert error:', insertError);
        else console.log('Inserted defaults for tab:overview');
    } else {
        console.log('Permissions for tab:overview already exist.');
    }

    // 2. Reports
    const { data: existingReports } = await supabase
        .from('app_permissions')
        .select('*')
        .eq('resource_key', 'tab:reports');

    if (!existingReports || existingReports.length === 0) {
        console.log('Inserting default permissions for tab:reports...');
        const inserts = roles.map(role => ({
            role,
            resource_key: 'tab:reports',
            is_allowed: true
        }));
        await supabase.from('app_permissions').insert(inserts);
        console.log('Inserted defaults for tab:reports');
    } else {
        console.log('Permissions for tab:reports already exist.');
    }
}

checkAndFixPermissions();
