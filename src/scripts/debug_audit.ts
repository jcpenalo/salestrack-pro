
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
    console.log('--- DEBUGGING AUDIT LOGS ---');

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

    // 2. Check with Anon Key (RLS Active) - Simulating generic access (likely needs auth)
    // To properly simulate RLS, we'd need to sign in, but let's see if public read is allowed (unlikely)
    // or if we can infer anything.
    // Ideally we simulate a user login but that requires credentials. 
    // We can skip this or try a simple select.

    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonData, error: anonError } = await anonClient
        .from('audit_logs')
        .select('*')
        .limit(1);

    if (anonError) {
        console.log('Anon Query Failed (Expected if RLS is on):', anonError.message);
    } else {
        console.log('Anon Query Result:', anonData?.length);
    }

    console.log('--- END DEBUG ---');
}

main();
