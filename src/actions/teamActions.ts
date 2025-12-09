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

export async function getTeamStatsAction(
    token: string,
    month: number,
    year: number,
    statusId: string = '',
    campaignId: string = '',
    productId: string = ''
) {
    const supabase = createServerClient(token);

    try {
        // Date Logic
        const now = new Date();
        const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
        const daysInMonth = new Date(year, month, 0).getDate();
        const daysElapsed = isCurrentMonth ? now.getDate() : daysInMonth;

        // Current Month Range
        const startDate = new Date(year, month - 1, 1).toISOString();
        const nextMonth = month === 12 ? 0 : month;
        const nextYear = month === 12 ? year + 1 : year;
        const endDate = new Date(nextYear, nextMonth, 1).toISOString();

        // Previous Month Range (for Trend)
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevStartDate = new Date(prevYear, prevMonth - 1, 1).toISOString();
        // Limit previous month end date to the same day number as current execution (to compare apples to apples)
        // e.g. If today is Dec 10, compare vs Nov 10.
        const prevLimitDay = Math.min(daysElapsed, new Date(prevYear, prevMonth, 0).getDate());
        // We set the time to end of that day roughly, or just use the next day 00:00 boundary
        const prevEndDate = new Date(prevYear, prevMonth - 1, prevLimitDay + 1).toISOString();


        // 1. Parallel Fetch
        const [
            { data: sales, error: salesError },
            { data: prevSales, error: prevSalesError },
            { data: goals, error: goalsError },
            { data: users, error: usersError },
            { data: products },
            { data: campaigns },
            { data: statuses }
        ] = await Promise.all([
            // Sales in range
            supabase.from('sales').select('*').gte('sale_date', startDate).lt('sale_date', endDate),
            // Previous Sales (for Trend)
            supabase.from('sales').select('user_id, status_id, campaign_id, product_id').gte('sale_date', prevStartDate).lt('sale_date', prevEndDate),
            // Goals for period
            supabase.from('goals').select('*').eq('month', month).eq('year', year),
            // All Users (with Supervisor)
            supabase.from('users').select('id, full_name, supervisor_id, role'),
            // Master Data (include center_price)
            supabase.from('products').select('id, name, center_price'),
            supabase.from('campaigns').select('id, name'),
            supabase.from('statuses').select('id, name').order('name')
        ]);

        if (salesError) throw salesError;
        if (goalsError) throw goalsError;
        if (usersError) throw usersError;

        // 2. Maps for O(1) Access
        const userMap = new Map(users?.map(u => [u.id, u]));
        const productMap = new Map(products?.map(p => [p.id, p]));
        const campaignMap = new Map(campaigns?.map(c => [c.id, c]));

        // 3. Aggregation Logic

        // Filter Sales
        let relevantSales = sales || [];
        if (statusId) relevantSales = relevantSales.filter(s => s.status_id === statusId);
        if (campaignId) relevantSales = relevantSales.filter(s => s.campaign_id === campaignId);
        if (productId) relevantSales = relevantSales.filter(s => s.product_id === productId);

        // Filter Previous Sales (apply same filters for fair trend comparison)
        let relevantPrevSales = prevSales || [];
        if (statusId) relevantPrevSales = relevantPrevSales.filter(s => s.status_id === statusId);
        if (campaignId) relevantPrevSales = relevantPrevSales.filter(s => s.campaign_id === campaignId);
        if (productId) relevantPrevSales = relevantPrevSales.filter(s => s.product_id === productId);

        // Filter Goals
        let relevantGoals = goals || [];
        if (productId) relevantGoals = relevantGoals.filter(g => g.product_id === productId);


        // --- BY AGENT ---
        const agentStats = new Map();

        // Initialize with Goals
        relevantGoals.forEach(goal => {
            const uid = goal.user_id;
            if (!agentStats.has(uid)) {
                agentStats.set(uid, {
                    user_id: uid,
                    total_sales: 0,
                    prev_sales: 0,
                    total_revenue: 0,
                    active_days: new Set(),
                    by_status: {},
                    total_goal: 0
                });
            }
            const stats = agentStats.get(uid);
            stats.total_goal += goal.monthly_target;
        });

        // Process Current Sales
        relevantSales.forEach(sale => {
            const uid = sale.user_id;
            if (!agentStats.has(uid)) {
                agentStats.set(uid, {
                    user_id: uid,
                    total_sales: 0,
                    prev_sales: 0,
                    total_revenue: 0,
                    active_days: new Set(),
                    by_status: {},
                    total_goal: 0
                });
            }
            const stats = agentStats.get(uid);
            stats.total_sales++;

            // Revenue
            const prod = productMap.get(sale.product_id);
            if (prod && prod.center_price) {
                stats.total_revenue += Number(prod.center_price);
            }

            // Active Days
            if (sale.sale_date) {
                stats.active_days.add(sale.sale_date.split('T')[0]);
            }

            const sid = sale.status_id;
            stats.by_status[sid] = (stats.by_status[sid] || 0) + 1;
        });

        // Process Previous Sales (for Trend)
        relevantPrevSales.forEach(sale => {
            const uid = sale.user_id;
            // Only count if agent exists in stats (don't create new entry just for prev sales history)
            if (agentStats.has(uid)) {
                agentStats.get(uid).prev_sales++;
            }
        });

        // Generate Final Array
        const byAgent = Array.from(agentStats.values()).map((stat: any) => {
            const user = userMap.get(stat.user_id);
            const supervisor = user?.supervisor_id ? userMap.get(user.supervisor_id) : null;
            const completion = stat.total_goal > 0 ? (stat.total_sales / stat.total_goal) * 100 : 0;

            // Tier
            let tier = 'Low';
            if (completion >= 100) tier = 'Top';
            else if (completion >= 70) tier = 'Medium';

            // Metrics
            const active_days_count = stat.active_days.size;
            // Run Rate: (Sales / DaysElapsed) * DaysInMonth
            const run_rate = daysElapsed > 0
                ? Math.round((stat.total_sales / daysElapsed) * daysInMonth)
                : 0;

            // Trend
            const sales_diff = stat.total_sales - stat.prev_sales;
            let trend = 'flat';
            if (sales_diff > 0) trend = 'up';
            else if (sales_diff < 0) trend = 'down';

            return {
                ...stat,
                agent_name: user?.full_name || 'Unknown',
                supervisor_name: supervisor?.full_name || '-',
                conversion_rate: completion.toFixed(1),
                tier,
                revenue: stat.total_revenue,
                active_days: active_days_count,
                run_rate,
                trend,
                prev_sales: stat.prev_sales // exposed for debugging or UI
            };
        });

        // Group by Tier
        const tiers = {
            top: byAgent.filter(a => a.tier === 'Top').sort((a, b) => b.total_sales - a.total_sales),
            medium: byAgent.filter(a => a.tier === 'Medium').sort((a, b) => b.total_sales - a.total_sales),
            low: byAgent.filter(a => a.tier === 'Low').sort((a, b) => b.total_sales - a.total_sales)
        };

        // --- BY SUPERVISOR ---
        const supervisorStats = new Map();

        users?.forEach(u => {
            if (u.supervisor_id) {
                const sid = u.supervisor_id;
                if (!supervisorStats.has(sid)) {
                    supervisorStats.set(sid, { supervisor_id: sid, total_sales: 0, total_goal: 0, agent_count: 0 });
                }
                const supStat = supervisorStats.get(sid);
                const agentStat = agentStats.get(u.id);

                supStat.agent_count++;
                if (agentStat) {
                    supStat.total_sales += agentStat.total_sales || 0;
                    supStat.total_goal += agentStat.total_goal || 0;
                }
            }
        });

        const bySupervisor = Array.from(supervisorStats.values()).map((stat: any) => {
            const user = userMap.get(stat.supervisor_id);
            return {
                ...stat,
                name: user?.full_name || 'Unknown',
                conversion_rate: stat.total_goal > 0 ? ((stat.total_sales / stat.total_goal) * 100).toFixed(1) : 'N/A'
            };
        });

        // --- BY CAMPAIGN ---
        const campaignStats = new Map();
        relevantSales.forEach(sale => {
            const cid = sale.campaign_id;
            if (!cid) return;
            if (!campaignStats.has(cid)) campaignStats.set(cid, { id: cid, count: 0 });
            campaignStats.get(cid).count++;
        });

        const byCampaign = Array.from(campaignStats.values()).map((stat: any) => ({
            ...stat,
            name: campaignMap.get(stat.id)?.name || 'Unknown'
        }));

        // --- BY PRODUCT ---
        const productStats = new Map();
        relevantGoals.forEach(goal => {
            const pid = goal.product_id;
            if (!productStats.has(pid)) productStats.set(pid, { id: pid, sales: 0, goal: 0 });
            productStats.get(pid).goal += goal.monthly_target;
        });

        relevantSales.forEach(sale => {
            const pid = sale.product_id;
            if (!productStats.has(pid)) productStats.set(pid, { id: pid, sales: 0, goal: 0 });
            productStats.get(pid).sales++;
        });

        const byProduct = Array.from(productStats.values()).map((stat: any) => ({
            ...stat,
            name: productMap.get(stat.id)?.name || 'Unknown',
            conversion_rate: stat.goal > 0 ? ((stat.sales / stat.goal) * 100).toFixed(1) : 'N/A'
        }));


        return {
            success: true,
            data: {
                byAgent,
                bySupervisor,
                byCampaign,
                byProduct,
                tiers,
                statuses: statuses || [],
                products: products || [],
                campaigns: campaigns || []
            }
        };

    } catch (error: any) {
        console.error('Team Stats Error:', error);
        return { success: false, error: error.message };
    }
}
