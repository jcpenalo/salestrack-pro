'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper for server-side client
const createServerClient = (token?: string) => {
    const options: any = {
        auth: { persistSession: false }
    };
    if (token) {
        options.global = {
            headers: { Authorization: `Bearer ${token}` }
        };
    }
    return createClient(supabaseUrl, supabaseKey, options);
};

// --- READ LOGS ---
export async function getAuditLogsAction(
    token: string,
    filter: {
        category?: string,
        severity?: string,
        tableName?: string,
        limit?: number,
        page?: number
    }
) {
    const supabase = createServerClient(token);
    const limit = filter.limit || 50;
    const from = (filter.page || 0) * limit;
    const to = from + limit - 1;

    try {
        let query = supabase
            .from('audit_logs')
            .select(`
                *,
                users:changed_by (full_name, email, role)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (filter.category) query = query.eq('category', filter.category);
        if (filter.severity) query = query.eq('severity', filter.severity);
        if (filter.tableName) query = query.eq('table_name', filter.tableName);

        const { data, error, count } = await query;
        if (error) throw error;

        return { success: true, data, count };

    } catch (error: any) {
        console.error('Audit Fetch Error:', error);
        return { success: false, error: error.message };
    }
}


// --- WRITE LOGS (Manual) ---
// Note: This action is often called by Client Components (e.g. Login Page) or other Server Actions (e.g. Errors)
// It might receive a token (if user logged in) or use Service Role (if system event).
// For simplicity, we'll try to use the provided token. If no token (failed login), we might need a Service Role client if RLS blocks insert.
// However, our audit_logs policy allows authenticated insert. 
// Failed Login is tricky -> User is NOT authenticated yet.
// So Failed Login logging requires Service Role key if RLS blocks anon.
// Let's assume passed token is valid for Success Login.
// For Failed Login, we might need a special logic or just skip purely anon logs for now to avoid spam, OR user Service Role carefully.

// We'll stick to Authenticated Logs for now for safety, or use Anon key if RLS allows anon insert (usually risky).
// Safe approach: Only log successful actions or server-side protected actions.
// If we REALLY need failed login logs, we need a backend endpoint using Service Role.
// I'll implement this using the ANON key for now, assuming RLS allows INSERT for Authenticated users. 
// *If we want to log Failed Login, we need to bypass RLS or allow Anon insert.*
// Given the user Requirements, let's implement `logSystemEvent` that takes a token.

export async function logSystemEventAction(
    token: string | null, // Null if anon (might fail if RLS strict)
    event: {
        category: 'ACCESS' | 'SYSTEM' | 'CONFIG',
        action: string,
        severity: 'INFO' | 'WARNING' | 'ERROR',
        details: any
    }
) {
    // If we want to log Failed Logins (where token is null), we likely need SERVICE ROLE override.
    // CAUTION: Using Service Role here means we trust the caller. 
    // Ideally this code runs ONLY on server. If valid 'event', we write it.

    // Check if we need to escalate to Admin/Service client
    // For now, let's try standard client.

    let supabase;
    if (token) {
        supabase = createServerClient(token);
    } else {
        // If no token (e.g. Failed Login), use Service Role? 
        // Or just Anon Key. If RLS blocks Anon INSERT, this will fail.
        // Let's rely on standard Anon Key. If policy is strict, it fails silent.
        supabase = createClient(supabaseUrl, supabaseKey);
    }

    try {
        const { error } = await supabase.from('audit_logs').insert({
            category: event.category,
            action: event.action,
            severity: event.severity,
            new_data: event.details, // Dump details into new_data or metadata
            metadata: event.details,
            // changed_by: via Auth context if available, or null
        });

        if (error) throw error;
        return { success: true };

    } catch (e: any) {
        // Don't crash app if log fails
        console.error("Audit Write Error:", e);
        return { success: false, error: e.message };
    }
}
// --- DIAGNOSTIC ---
export async function testAuditConnectionAction(token: string) {
    const supabase = createServerClient(token);
    try {
        console.log("Testing Audit Connection...");
        // Use a known safe insert
        const { data, error } = await supabase.from('audit_logs').insert({
            category: 'SYSTEM',
            action: 'TEST_CONNECTION',
            severity: 'INFO',
            metadata: { message: 'Verification probe' },
            changed_by: (await supabase.auth.getUser()).data.user?.id
        }).select().single();

        if (error) {
            console.error("Audit Test Failed:", error);
            return { success: false, error: error.message, code: error.code, details: error.details };
        }

        console.log("Audit Test Success:", data);
        return { success: true, log: data };
    } catch (e: any) {
        console.error("Audit Test Crash:", e);
        return { success: false, error: e.message };
    }
}
