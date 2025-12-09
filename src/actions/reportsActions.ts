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

export async function getReportsStatsAction(token: string, campaignId?: string, statusId?: string) {
    const supabase = createServerClient(token);

    try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // --- 0. FETCH OPTIONS (Campaigns & Statuses) ---
        // We fetch these to populate the filter dropdowns in the UI
        const { data: campaigns } = await supabase.from('campaigns').select('id, name').order('name');
        const { data: statuses } = await supabase.from('statuses').select('id, name').order('name');


        // --- 1. FORECAST DATA (Last 6 Months) ---
        // Range: 6 months ago (start) to Today (end)
        const startOfHistory = new Date(currentYear, currentMonth - 7, 1);
        const endOfHistory = new Date(currentYear, currentMonth, 0); // End of this month (roughly)

        let historyQuery = supabase
            .from('sales')
            .select('sale_date, product_id, products(center_price)')
            .gte('sale_date', startOfHistory.toISOString())
            .lte('sale_date', endOfHistory.toISOString());

        // Apply Filters
        if (campaignId) historyQuery = historyQuery.eq('campaign_id', campaignId);
        if (statusId) historyQuery = historyQuery.eq('status_id', statusId);

        const { data: historySales, error: histError } = await historyQuery;

        if (histError) throw histError;

        // Group by Month (YYYY-MM)
        const historyMap = new Map();
        // Init last 6 months with 0
        for (let i = 6; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - 1 - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'short' });
            historyMap.set(key, { key, label, x: 6 - i, count: 0, revenue: 0 });
        }

        historySales?.forEach(s => {
            if (!s.sale_date) return;
            const d = new Date(s.sale_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (historyMap.has(key)) {
                const entry = historyMap.get(key);
                entry.count++;
                // Revenue (handle potentially missing join data)
                const price = (s.products as any)?.center_price;
                if (price) entry.revenue += Number(price);
            }
        });

        const history = Array.from(historyMap.values()).sort((a, b) => a.x - b.x);

        // Linear Regression (Least Squares) for Sales Count
        // y = mx + b
        // x = time index (0 to 6), y = count
        const n = history.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        history.forEach(pt => {
            sumX += pt.x;
            sumY += pt.count;
            sumXY += (pt.x * pt.count);
            sumXX += (pt.x * pt.x);
        });

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Predict Next Month (x = 7)
        const nextX = 7;
        const predictedCount = Math.max(0, Math.round(slope * nextX + intercept));

        // Next Month Label
        const nextDate = new Date(currentYear, currentMonth, 1);
        const nextLabel = nextDate.toLocaleString('default', { month: 'short' });


        // --- 2. HEATMAP DATA (Last 30 Days) ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let recentQuery = supabase
            .from('sales')
            .select('created_at') // created_at is better for "Activity" timing
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Apply Filters
        if (campaignId) recentQuery = recentQuery.eq('campaign_id', campaignId);
        if (statusId) recentQuery = recentQuery.eq('status_id', statusId);

        const { data: recentSales, error: recentError } = await recentQuery;

        if (recentError) throw recentError;

        // Grid: 7 days (0-6 Sun-Sat) x 24 hours (0-23)
        const heatmap: { day: number; hour: number; value: number }[] = [];
        const grid = Array(7).fill(0).map(() => Array(24).fill(0));

        recentSales?.forEach(s => {
            const d = new Date(s.created_at);
            // Adjust for user timezone (-4)
            const localTime = new Date(d.getTime() - (4 * 60 * 60 * 1000));

            const day = localTime.getDay(); // 0 is Sun
            const hour = localTime.getHours();
            grid[day][hour]++;
        });

        let maxDensity = 0;
        grid.forEach((hours, dayIndex) => {
            hours.forEach((count, hourIndex) => {
                if (count > maxDensity) maxDensity = count;
                heatmap.push({ day: dayIndex, hour: hourIndex, value: count });
            });
        });

        return {
            success: true,
            data: {
                forecast: {
                    history,
                    prediction: {
                        label: nextLabel,
                        count: predictedCount,
                        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
                        growth: history[history.length - 1].count > 0
                            ? (((predictedCount - history[history.length - 1].count) / history[history.length - 1].count) * 100).toFixed(1)
                            : '0'
                    }
                },
                heatmap: {
                    data: heatmap.flat(),
                    max: maxDensity
                },
                options: {
                    campaigns: campaigns || [],
                    statuses: statuses || []
                }
            }
        };

    } catch (error: any) {
        console.error('Reports Error:', error);
        return { success: false, error: error.message };
    }
}

