'use server';

import { createClient } from '@supabase/supabase-js';

export async function getMasterDataAction(token: string) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: `Bearer ${token}` } }
            }
        );

        // Parallel fetch for speed
        const [
            { data: campaigns },
            { data: products },
            { data: concepts },
            { data: statuses },
            { data: users }
        ] = await Promise.all([
            supabase.from('campaigns').select('id, name').eq('active', true).order('name'),
            supabase.from('products').select('id, name, family, pp, center_price, plans, concept').eq('active', true).order('name'),
            supabase.from('concepts').select('id, name').eq('active', true).order('name'),
            supabase.from('statuses').select('id, name, color').order('order_index'),
            supabase.from('users').select('id, full_name, role').order('full_name')
        ]);

        return {
            success: true,
            data: {
                campaigns: campaigns || [],
                products: products || [],
                concepts: concepts || [],
                statuses: statuses || [],
                users: users || []
            }
        };

    } catch (error: any) {
        console.error('Get Master Data Error:', error);
        return { success: false, error: error.message };
    }
}
