
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndFixPermissions() {
    console.log('Checking permissions...');

    // 1. Check for tab:overview presence
    const { data: existing, error } = await supabase
        .from('app_permissions')
        .select('*')
        .eq('resource_key', 'tab:overview');

    if (error) {
        console.error('Error fetching permissions:', error);
        return;
    }

    console.log(`Found ${existing?.length} entries for tab:overview`);

    if (!existing || existing.length === 0) {
        console.log('Inserting default permissions for tab:overview...');
        const roles = ['admin', 'gerente', 'senior', 'supervisor', 'auditor', 'seguimiento', 'digitacion', 'representative'];
        const inserts = roles.map(role => ({
            role,
            resource_key: 'tab:overview',
            is_allowed: true // Default to true for everyone to prevent lockout
        }));

        const { error: insertError } = await supabase
            .from('app_permissions')
            .insert(inserts);

        if (insertError) console.error('Insert error:', insertError);
        else console.log('Inserted defaults for tab:overview');
    }

    // 2. Also check tab:reports
    const { data: existingReports } = await supabase
        .from('app_permissions')
        .select('*')
        .eq('resource_key', 'tab:reports');

    if (!existingReports || existingReports.length === 0) {
        console.log('Inserting default permissions for tab:reports...');
        const roles = ['admin', 'gerente', 'senior', 'supervisor', 'auditor', 'seguimiento', 'digitacion', 'representative'];
        const inserts = roles.map(role => ({
            role,
            resource_key: 'tab:reports',
            is_allowed: true
        }));
        await supabase.from('app_permissions').insert(inserts);
        console.log('Inserted defaults for tab:reports');
    }
}

checkAndFixPermissions();
