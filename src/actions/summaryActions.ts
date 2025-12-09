'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

export async function getSummaryStatsAction(
    token: string,
    month: number,
    year: number,
    groupBy1: string = 'campaign', // campaign, agent, product, supervisor, date
    groupBy2: string = 'agent'     // none, campaign, agent, product, supervisor, date
) {
    const supabase = createServerClient(token);

    try {
        // Date Logic
        const startDate = new Date(year, month - 1, 1).toISOString();
        const nextMonth = month === 12 ? 0 : month;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = new Date(nextYear, nextMonth, 1).toISOString();

        // Parallel Fetch
        const [
            { data: sales, error: salesError },
            { data: goals, error: goalsError },
            { data: users },
            { data: products },
            { data: campaigns },
        ] = await Promise.all([
            supabase.from('sales').select('*').gte('sale_date', startDate).lt('sale_date', endDate),
            supabase.from('goals').select('*').eq('month', month).eq('year', year),
            supabase.from('users').select('id, full_name, supervisor_id'),
            supabase.from('products').select('id, name, center_price'),
            supabase.from('campaigns').select('id, name')
        ]);

        if (salesError) throw salesError;
        if (goalsError) throw goalsError;

        // Maps
        const userMap = new Map(users?.map(u => [u.id, u]));
        const productMap = new Map(products?.map(p => [p.id, p]));
        const campaignMap = new Map(campaigns?.map(c => [c.id, c.name]));

        // Helper to get key/label for a dimension
        const getDimInfo = (item: any, dim: string, type: 'sale' | 'goal') => {
            if (dim === 'none') return { key: 'all', label: 'All' };

            if (dim === 'campaign') {
                const id = item.campaign_id || (type === 'goal' ? 'N/A' : null); // Goals don't have campaign usually, tough luck unless mapped
                if (!id && type === 'goal') return { key: 'unknown', label: 'Unknown' }; // Goals usually by User/Product
                // If goal, maybe we find user -> campaign? No direct link often.
                // Simplified: Goals only attach if dimension is Agebt or Product.
                return { key: id || 'unknown', label: campaignMap.get(id) || 'Unknown' };
            }
            if (dim === 'agent') {
                const id = item.user_id;
                return { key: id || 'unknown', label: userMap.get(id)?.full_name || 'Unknown' };
            }
            if (dim === 'supervisor') {
                const uid = item.user_id;
                const user = userMap.get(uid);
                const sid = user?.supervisor_id;
                return { key: sid || 'unknown', label: sid ? userMap.get(sid)?.full_name || 'Unknown' : 'No Supervisor' };
            }
            if (dim === 'product') {
                const id = item.product_id;
                return { key: id || 'unknown', label: productMap.get(id)?.name || 'Unknown' };
            }
            if (dim === 'date') {
                if (type === 'goal') return { key: 'monthly', label: 'Monthly Goal' };
                const date = item.sale_date ? item.sale_date.split('T')[0] : 'Unknown';
                return { key: date, label: date };
            }
            return { key: 'unknown', label: 'Unknown' };
        };

        // Aggregation Structure
        // Map<Key1, { label, metrics, children: Map<Key2, { label, metrics }> }>
        const groups = new Map();

        const ensureGroup = (map: Map<any, any>, key: string, label: string) => {
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    label,
                    sales: 0,
                    revenue: 0,
                    goal: 0,
                    children: new Map() // For breakdown
                });
            }
            return map.get(key);
        };

        // 1. Process Sales
        sales?.forEach(s => {
            const d1 = getDimInfo(s, groupBy1, 'sale');
            const g1 = ensureGroup(groups, d1.key, d1.label);

            const d2 = groupBy2 !== 'none' ? getDimInfo(s, groupBy2, 'sale') : null;

            // Metrics Logic
            const revenue = productMap.get(s.product_id)?.center_price || 0;

            // Add to Parent
            g1.sales++;
            g1.revenue += Number(revenue);

            // Add to Child (if exists)
            if (d2) {
                const g2 = ensureGroup(g1.children, d2.key, d2.label);
                g2.sales++;
                g2.revenue += Number(revenue);
            }
        });

        // 2. Process Goals (Careful matching dimensions)
        goals?.forEach(g => {
            // Goals are typically per Agent/Product. 
            // If Group1 is Campaign, we might struggle to attribute Goal unless we know Agent's Campaign.
            // For now, we only map goals if the dimension is Agent or Product directly.

            // Attempt to map dim 1
            const d1 = getDimInfo(g, groupBy1, 'goal');

            // Only add goal if we can resolve the key (e.g. if grouping by Campaign, and goal is by user, we can't easily guess campaign without user lookups)
            // But getDimInfo handles simple IDs. 
            // Improve: User -> Supervisor mapping works. User -> Campaign mapping doesn't (user can be in multiple).
            // Optimization: If dim is Agent or Product, we are safe.

            if (d1.key !== 'unknown' && d1.key !== 'monthly') {
                const g1 = ensureGroup(groups, d1.key, d1.label);
                g1.goal += g.monthly_target;

                const d2 = groupBy2 !== 'none' ? getDimInfo(g, groupBy2, 'goal') : null;
                if (d2 && d2.key !== 'unknown' && d2.key !== 'monthly') {
                    const g2 = ensureGroup(g1.children, d2.key, d2.label);
                    g2.goal += g.monthly_target;
                }
            }
        });

        // Convert Maps to Arrays and Calculate Conversion
        const result = Array.from(groups.values()).map((g: any) => {
            const children = Array.from(g.children.values()).map((c: any) => ({
                ...c,
                conversion: c.goal > 0 ? ((c.sales / c.goal) * 100).toFixed(1) : 0
            })).sort((a: any, b: any) => b.sales - a.sales);

            return {
                ...g,
                conversion: g.goal > 0 ? ((g.sales / g.goal) * 100).toFixed(1) : 0,
                children
            };
        }).sort((a: any, b: any) => b.sales - a.sales);

        return {
            success: true,
            data: result
        };

    } catch (error: any) {
        console.error('Summary Stats Error:', error);
        return { success: false, error: error.message };
    }
}
