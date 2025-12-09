'use server';

export async function debugEnvVars() {
    try {
        const allKeys = Object.keys(process.env);
        const supabaseKeys = allKeys.filter(k => k.toUpperCase().includes('SUPABASE'));

        return {
            success: true,
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
            visibleSupabaseKeys: supabaseKeys,
            // Check if we are in Edge
            isEdge: process.env.NEXT_RUNTIME === 'edge'
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
