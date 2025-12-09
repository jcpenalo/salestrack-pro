'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const createServerClient = (token?: string) => {
    const options: any = { auth: { persistSession: false } };
    if (token) options.global = { headers: { Authorization: `Bearer ${token}` } };
    return createClient(supabaseUrl, supabaseKey, options);
};

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'critical';
    database: { connected: boolean; latencyMs: number };
    auditSystem: { writable: boolean; error?: string };
    environment: { configured: boolean };
    systemLoad: { activeUsers24h: number; recentEvents24h: number; liveUsers15m: number };
    timestamp: string;
}

export async function checkSystemHealthAction(token: string): Promise<SystemHealth> {
    const start = performance.now();
    const supabase = createServerClient(token);

    // ... (Previous logic kept implicitly, only showing modified parts if possible, but for replace_file I need context)
    // To be safe I will just insert the new logic in the Load Check block.

    // 1. Environment Check
    const envOk = !!supabaseUrl && !!supabaseKey;

    // 2. Database Read Check (Ping)
    let dbConnected = false;
    let latency = 0;
    try {
        const { error } = await supabase.from('statuses').select('count', { count: 'exact', head: true });
        if (!error) dbConnected = true;
    } catch (e) {
        console.error("DB Check Failed", e);
    }
    latency = Math.round(performance.now() - start);

    // 3. Audit Write Check
    let auditWritable = false;
    let auditError: string | undefined;

    try {
        const { error } = await supabase.from('audit_logs').insert({
            category: 'SYSTEM',
            action: 'DIAGNOSTIC_PROBE',
            severity: 'INFO',
            metadata: { latency },
            changed_by: (await supabase.auth.getUser()).data.user?.id
        });

        if (!error) {
            auditWritable = true;
        } else {
            auditError = error.message;
        }
    } catch (e: any) {
        auditError = e.message;
    }

    // 4. System Load Check
    let activeUsers24h = 0;
    let recentEvents24h = 0;
    let liveUsers15m = 0;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    try {
        const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);
        activeUsers24h = userCount || 0;

        const { count: eventCount } = await supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .gt('created_at', oneDayAgo);
        recentEvents24h = eventCount || 0;

        // Estimate Live Users (Unique actors in last 15m)
        const { data: liveLogs } = await supabase
            .from('audit_logs')
            .select('changed_by')
            .gt('created_at', fifteenMinsAgo)
            .not('changed_by', 'is', null);

        if (liveLogs) {
            const uniqueUsers = new Set(liveLogs.map(l => l.changed_by));
            liveUsers15m = uniqueUsers.size;
        }

    } catch (e) {
        console.error("Load Check Failed", e);
    }

    // Determine Overall Status
    let status: SystemHealth['status'] = 'healthy';
    if (!dbConnected) status = 'critical';
    else if (!auditWritable) status = 'degraded';

    return {
        status,
        database: { connected: dbConnected, latencyMs: latency },
        auditSystem: { writable: auditWritable, error: auditError },
        environment: { configured: envOk },
        systemLoad: { activeUsers24h, recentEvents24h, liveUsers15m },
        timestamp: new Date().toISOString()
    };
}
