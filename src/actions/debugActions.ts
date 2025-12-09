'use server';

export async function debugEnvVars() {
    try {
        const allKeys = Object.keys(process.env);
        // Safety: Only reveal key NAMES, not values, unless it's safe metadata
        const supabaseKeys = allKeys.filter(k => k.toUpperCase().includes('SUPABASE') || k.toUpperCase().includes('ADMIN_'));

        const key1 = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const key2 = process.env.ADMIN_SERVICE_KEY;

        const serviceKey = key1 || key2;

        return {
            success: true,
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
            hasServiceKey: !!serviceKey,
            serviceKeySource: key1 ? 'SUPABASE_SERVICE_ROLE_KEY' : (key2 ? 'ADMIN_SERVICE_KEY' : 'NONE'),
            serviceKeyLength: serviceKey?.length || 0,
            visibleSupabaseKeys: supabaseKeys,
            // Check if we are in Edge
            isEdge: process.env.NEXT_RUNTIME === 'edge'
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
