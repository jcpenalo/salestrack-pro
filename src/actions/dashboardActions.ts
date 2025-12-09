'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function getDashboardStatsAction(token: string, statusId: string = '') {
    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // Current Month Range
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // Previous Month Range (for trend)
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const startOfPrevMonth = new Date(prevYear, prevMonth - 1, 1);

    // For fair comparison, compare up to the same day-of-month
    const daysElapsed = now.getDate();
    const endOfPrevMonth = new Date(prevYear, prevMonth - 1, Math.min(daysElapsed, new Date(prevYear, prevMonth, 0).getDate()), 23, 59, 59);

    try {
        // 1. Get User & Role
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = userData?.role || 'agent';
        // 'agent' (legacy) and 'representative' are restricted
        const isRestricted = role === 'representative' || role === 'agent';

        // Prepare queries
        let currentSalesQuery = supabase.from('sales')
            .select('*')
            .gte('sale_date', startOfMonth.toISOString())
            .lte('sale_date', endOfMonth.toISOString());

        let prevSalesQuery = supabase.from('sales')
            .select('id')
            .gte('sale_date', startOfPrevMonth.toISOString())
            .lte('sale_date', endOfPrevMonth.toISOString());

        // Apply Role Restriction
        if (isRestricted) {
            currentSalesQuery = currentSalesQuery.eq('user_id', user.id);
            prevSalesQuery = prevSalesQuery.eq('user_id', user.id);
        }

        // Apply Status Filter if provided
        if (statusId) {
            currentSalesQuery = currentSalesQuery.eq('status_id', statusId);
            prevSalesQuery = prevSalesQuery.eq('status_id', statusId);
        }

        // Parallel Fetching
        const [
            { data: currentSales, error: currentError },
            { data: prevSales, error: prevError },
            { data: products },
            { data: campaigns },
            { data: users },
            { data: goals },
            { data: statuses }
        ] = await Promise.all([
            currentSalesQuery,
            prevSalesQuery,
            supabase.from('products').select('id, name, center_price'),
            supabase.from('campaigns').select('id, name'),
            supabase.from('users').select('id, full_name, email'),
            supabase.from('goals').select('goal_amount').eq('month', month).eq('year', year),
            supabase.from('statuses').select('id, name').order('name')
        ]);

        if (currentError) throw currentError;

        const sales = currentSales || [];
        const prevSalesCount = prevSales?.length || 0;

        // Map Helpers
        const productMap = new Map(products?.map(p => [p.id, p]));
        const campaignMap = new Map(campaigns?.map(c => [c.id, c.name]));
        const userMap = new Map(users?.map(u => [u.id, u]));

        // --- KPI CALCULATIONS ---

        // 1. Revenue
        let totalRevenue = 0;
        sales.forEach(s => {
            const p = productMap.get(s.product_id);
            if (p?.center_price) totalRevenue += Number(p.center_price);
        });

        // 2. Sales Count
        const totalSales = sales.length;

        // 3. Active Agents
        const activeAgents = new Set(sales.map(s => s.user_id)).size;

        // 4. Conversion (Simplified: Total Sales vs Total Goals of month)
        // Note: Conversion against TOTAL goals regardless of status filter is usually safe, 
        // unless goals are also status-specific (usually they are generic "sell X units").
        const totalGoal = goals?.reduce((acc, g) => acc + (g.goal_amount || 0), 0) || 1;
        const conversionRate = totalGoal > 0 ? ((totalSales / totalGoal) * 100).toFixed(1) : 0;


        // --- TRENDS ---
        const salesDiff = totalSales - prevSalesCount;
        const salesTrendPct = prevSalesCount > 0
            ? ((salesDiff / prevSalesCount) * 100).toFixed(1)
            : totalSales > 0 ? '100.0' : '0.0';


        // --- CHARTS DATA ---

        // 1. Daily Sales Trend
        const salesByDate = new Map<string, number>();
        for (let d = 1; d <= daysElapsed; d++) {
            const dayStr = new Date(year, month - 1, d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            salesByDate.set(dayStr, 0);
        }

        sales.forEach(s => {
            if (!s.sale_date) return;
            const d = new Date(s.sale_date);
            const dayStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
            if (salesByDate.has(dayStr)) {
                salesByDate.set(dayStr, salesByDate.get(dayStr)! + 1);
            }
        });

        const dailyTrend = Array.from(salesByDate.entries()).map(([date, count]) => ({ date, count }));

        // 2. Campaign Distribution
        const salesByCampaign = new Map<string, number>();
        sales.forEach(s => {
            const cName = campaignMap.get(s.campaign_id) || 'Unknown';
            salesByCampaign.set(cName, (salesByCampaign.get(cName) || 0) + 1);
        });
        const campaignDist = Array.from(salesByCampaign.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);


        // --- RECENT ACTIVITY ---
        let recentQuery = supabase.from('sales')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        // We can't reuse the filtered 'sales' array for recent activity because 'sales' is only for Current Month.
        // Recent activity might span back if volume is low.
        // But for consistency with the filter, we should apply the filter to the recent query too.
        if (statusId) {
            recentQuery = recentQuery.eq('status_id', statusId);
        }
        if (isRestricted) {
            recentQuery = recentQuery.eq('user_id', user.id);
        }

        const { data: recentData } = await recentQuery;

        const recentSales = (recentData || []).map(s => {
            const u = userMap.get(s.user_id);
            // If user not in current month map, we miss them. Ideally we should select user/product in join.
            // For simplicity, let's rely on the bulk fetch we did or just show 'Unknown' if outside current scope.
            // Improvement: Fetch specific relations for recent sales if needed.
            // Let's assume the maps cover active users/products.
            const p = productMap.get(s.product_id);
            return {
                id: s.id,
                agent_name: u?.full_name || 'Unknown',
                agent_email: u?.email || '',
                product_name: p?.name || 'Unknown',
                amount: p?.center_price ? Number(p.center_price) : 0,
                created_at: s.created_at
            };
        });

        return {
            success: true,
            data: {
                kpi: {
                    revenue: totalRevenue,
                    sales: totalSales,
                    sales_trend: salesTrendPct,
                    active_agents: activeAgents,
                    conversion: conversionRate
                },
                charts: {
                    daily: dailyTrend,
                    campaigns: campaignDist
                },
                recent: recentSales,
                statuses: statuses || []
            }
        };

    } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        return { success: false, error: error.message };
    }
}
