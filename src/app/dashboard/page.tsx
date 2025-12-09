'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DollarSign, Users, ShoppingBag, TrendingUp, Loader2, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { getDashboardStatsAction } from '@/actions/dashboardActions';
import { useRequireAccess } from '@/hooks/useRequireAccess';

export default function OverviewPage() {
    const { hasAccess, loading: accessLoading } = useRequireAccess('tab:overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [statusId, setStatusId] = useState('');
    const [statusOptions, setStatusOptions] = useState<any[]>([]);

    useEffect(() => {
        if (!hasAccess && !accessLoading) return;
        loadStats();
    }, [statusId, hasAccess, accessLoading]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const res = await getDashboardStatsAction(session.access_token, statusId);
                if (res.success && res.data) {
                    setStats(res.data);
                    if (res.data.statuses) setStatusOptions(res.data.statuses);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    if (!hasAccess && !accessLoading) return null;
    if (loading || accessLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
                    <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening this month.</p>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
                    <span className="text-xs font-semibold text-muted-foreground px-2 uppercase">Status</span>
                    <select
                        value={statusId}
                        onChange={(e) => setStatusId(e.target.value)}
                        className="bg-secondary/20 text-sm font-medium p-1.5 rounded-md outline-none border-l border-border hover:bg-secondary/40 transition-colors"
                    >
                        <option value="">All Statuses</option>
                        {statusOptions.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        title: "Total Revenue",
                        value: formatCurrency(stats.kpi.revenue),
                        icon: DollarSign,
                        trend: "vs last month",
                        trendVal: stats.kpi.sales_trend,
                        color: "text-emerald-600",
                        bg: "bg-emerald-100/50"
                    },
                    {
                        title: "Active Sales",
                        value: stats.kpi.sales,
                        icon: ShoppingBag,
                        trend: "vs last month",
                        trendVal: stats.kpi.sales_trend,
                        color: "text-blue-600",
                        bg: "bg-blue-100/50"
                    },
                    {
                        title: "Active Agents",
                        value: stats.kpi.active_agents,
                        icon: Users,
                        trend: "working this month",
                        color: "text-purple-600",
                        bg: "bg-purple-100/50"
                    },
                    {
                        title: "Global Conversion",
                        value: `${stats.kpi.conversion}%`,
                        icon: Activity,
                        trend: "of total goals",
                        color: "text-orange-600",
                        bg: "bg-orange-100/50"
                    }
                ].map((stat, i) => {
                    const isPositive = parseFloat(stat.trendVal || '0') >= 0;

                    return (
                        <div key={i} className="p-6 rounded-xl border border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{stat.title}</h3>
                                <div className={`p-2 rounded-full ${stat.bg}`}>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <div className="flex items-center gap-1 mt-1">
                                    {stat.trendVal && (
                                        <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {Math.abs(parseFloat(stat.trendVal))}%
                                        </span>
                                    )}
                                    <p className="text-xs text-muted-foreground">{stat.trend}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Daily Trend Chart */}
                <div className="col-span-4 p-6 rounded-xl border border-border bg-card shadow-sm flex flex-col">
                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                        <TrendingUp size={16} className="text-primary" />
                        Daily Sales Trend
                    </h3>

                    <div className="flex-1 flex items-end gap-2 h-[250px] w-full pb-2">
                        {stats.charts.daily.map((day: any, i: number) => {
                            const max = Math.max(...stats.charts.daily.map((d: any) => d.count), 5);
                            const heightPct = (day.count / max) * 100;

                            return (
                                <div key={i} className="group relative flex-1 flex flex-col justify-end items-center gap-1 h-full">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border -translate-x-1/2 left-1/2 whitespace-nowrap z-10 transition-opacity">
                                        <span className="font-bold">{day.count} Sales</span>
                                        <span className="text-[10px] opacity-75">{day.date}</span>
                                    </div>

                                    {/* Bar */}
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary/80 transition-all duration-300 rounded-t-sm min-h-[4px]"
                                        style={{ height: `${heightPct}%` }}
                                    ></div>

                                    {/* X-Axis Label */}
                                    {i % 4 === 0 && (
                                        <span className="text-[10px] text-muted-foreground absolute bottom-[-20px] whitespace-nowrap">
                                            {day.date.split(' ')[1]}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* X-axis Line */}
                    <div className="h-px bg-border w-full mt-1 mb-6"></div>
                </div>

                {/* Recent Sales List */}
                <div className="col-span-3 p-6 rounded-xl border border-border bg-card shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-primary" />
                        Recent Activity
                    </h3>
                    <div className="space-y-4">
                        {stats.recent.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No recent activity.</p>
                        ) : (
                            stats.recent.map((sale: any, i: number) => (
                                <div key={i} className="flex items-center group hover:bg-secondary/20 p-2 rounded-lg transition-colors -mx-2">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                        {sale.agent_name.substring(0, 2)}
                                    </div>
                                    <div className="ml-4 space-y-1 overflow-hidden">
                                        <p className="text-sm font-medium leading-none truncate">{sale.agent_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{sale.product_name}</p>
                                    </div>
                                    <div className="ml-auto font-medium text-sm">
                                        {sale.amount > 0 ? `+${formatCurrency(sale.amount)}` : '-'}
                                    </div>
                                </div>
                            ))
                        )}
                        <div className="pt-2">
                            <button className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center">
                                View all transactions &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Distribution (Mini) */}
            <div className="grid gap-4 md:grid-cols-3">
                {stats.charts.campaigns.slice(0, 3).map((camp: any, i: number) => (
                    <div key={i} className="bg-card border border-border p-4 rounded-lg flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-bold">Campaign</p>
                            <p className="font-semibold truncate max-w-[150px]">{camp.name}</p>
                        </div>
                        <div className="text-2xl font-bold text-muted-foreground/30">
                            {camp.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
