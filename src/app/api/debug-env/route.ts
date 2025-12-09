import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allKeys = Object.keys(process.env);
        const relevantKeys = allKeys.filter(k =>
            k.includes('SUPABASE') ||
            k.includes('ADMIN') ||
            k.includes('KEY') ||
            k.includes('VERCEL')
        );

        const envDetails = {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasAdminKey: !!process.env.ADMIN_SERVICE_KEY,
            visibleKeys: relevantKeys,
            // Diagnostic: Explicitly print undefined if missing
            checkSupabase: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'UNDEFINED',
            checkAdmin: process.env.ADMIN_SERVICE_KEY ? 'PRESENT' : 'UNDEFINED',
        };

        return NextResponse.json(envDetails);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
