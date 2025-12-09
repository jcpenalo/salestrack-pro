'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, User, Briefcase, Package, Users, TrendingUp, ArrowUpRight, TrendingDown, Minus, CalendarCheck, DollarSign, HelpCircle, Download } from 'lucide-react';
import { getTeamStatsAction } from '@/actions/teamActions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRequireAccess } from '@/hooks/useRequireAccess';

export default function TeamPage() {
    const { hasAccess, loading: accessLoading } = useRequireAccess('tab:team');
    const { profile } = useUserProfile();
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState<any>(null);
    const [view, setView] = useState<'agents' | 'supervisors' | 'campaigns' | 'products' | 'tiers'>('agents');

    // Date Filter
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    // Status Filter
    const [statusId, setStatusId] = useState<string>('');
    const [campaignId, setCampaignId] = useState<string>('');
    const [productId, setProductId] = useState<string>('');

    const [statusOptions, setStatusOptions] = useState<any[]>([]);
    const [campaignOptions, setCampaignOptions] = useState<any[]>([]);
    const [productOptions, setProductOptions] = useState<any[]>([]);

    // Permissions
    const [permissions, setPermissions] = useState<any[]>([]);

    const loadData = async () => {
        if (accessLoading) return;
        setLoading(true);
        try {
            // Robust Token Scanning
            let token = null;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
                        const val = localStorage.getItem(key);
                        if (val) {
                            const parsed = JSON.parse(val);
                            if (parsed.access_token) {
                                token = parsed.access_token;
                                break;
                            }
                        }
                    }
                }
            } catch (e) { /* ignore */ }

            if (!token) {
                try {
                    const sessionPromise = supabase.auth.getSession();
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth timeout')), 5000)
                    );
                    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
                    token = session?.access_token;
                } catch (e) {
                    console.warn('Network auth failed');
                }
            }

            if (token) {
                const res = await getTeamStatsAction(token, month, year, statusId, campaignId, productId);
                if (res.success && res.data) {
                    setStats(res.data);
                    setStatusOptions(res.data.statuses || []);
                    setCampaignOptions(res.data.campaigns || []);
                    setProductOptions(res.data.products || []);
                } else {
                    console.error(res.error);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hasAccess && !accessLoading) return;
        loadData();
    }, [month, year, statusId, campaignId, productId, hasAccess, accessLoading]);

    useEffect(() => {
        const fetchPerms = async () => {
            if (!profile?.role) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from('app_permissions')
                    .select('*')
                    .eq('role', profile.role);
                if (data) setPermissions(data);
            }
        };
        fetchPerms();
    }, [profile?.role]);

    const hasPermission = (key: string) => {
        if (profile?.role === 'creator') return true;
        const perm = permissions.find(p => p.resource_key === key);
        return perm ? perm.is_allowed : false;
    };

    const handleDownloadCSV = () => {
        if (!stats?.byAgent) return;

        const headers = ['Agent', 'Supervisor', 'Sales', 'Goal', 'Conversion', 'Revenue', 'Active Days', 'Run Rate', 'Trend'];
        const rows = stats.byAgent.map((agent: any) => [
            agent.agent_name,
            agent.supervisor_name,
            agent.total_sales,
            agent.total_goal,
            `${agent.conversion_rate}%`,
            agent.revenue,
            agent.active_days,
            agent.run_rate,
            agent.trend
        ]);

        const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `team_stats_${year}_${month}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const MetricCard = ({ title, value, sub, icon: Icon, color }: any) => (
        <div className="p-4 bg-card border border-border rounded-xl shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">{title}</p>
                <div className="text-2xl font-bold mt-1">{value}</div>
                {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
            </div>
            <div className={`p-3 rounded-full ${color}`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
        </div>
    );

    // Helper for Trend Icon
    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === 'up') return <TrendingUp size={16} className="text-green-500" />;
        if (trend === 'down') return <TrendingDown size={16} className="text-red-500" />;
        return <Minus size={16} className="text-muted-foreground" />;
    };

    // Helper for Currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    };

    // Tabs Definition
    const tabs = [
        { id: 'agents', label: 'By Agent', icon: User },
        { id: 'supervisors', label: 'By Supervisor', icon: Users },
        { id: 'campaigns', label: 'By Campaign', icon: Briefcase },
        { id: 'products', label: 'By Product', icon: Package },
    ];

    if (hasPermission('feature:team_tiers')) {
        tabs.push({ id: 'tiers', label: 'Performance Map', icon: TrendingUp } as any);
    }

    // Consolidated Rows for Tiers Table
    const tierRows = stats?.tiers ? [...stats.tiers.top, ...stats.tiers.medium, ...stats.tiers.low] : [];

    if (!hasAccess && !accessLoading) return null; // Redirect handled by hook

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Performance</h2>
                    <p className="text-muted-foreground">Detailed breakdown of sales, goals, and metrics.</p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {/* Status Filter */}
                    <div className="bg-card p-1 rounded-lg border border-border shadow-sm">
                        <select
                            value={statusId}
                            onChange={(e) => setStatusId(e.target.value)}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer max-w-[120px]"
                            title="Filter by Status"
                        >
                            <option value="">Status: All</option>
                            {statusOptions.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Campaign Filter */}
                    <div className="bg-card p-1 rounded-lg border border-border shadow-sm">
                        <select
                            value={campaignId}
                            onChange={(e) => setCampaignId(e.target.value)}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer max-w-[120px]"
                            title="Filter by Campaign"
                        >
                            <option value="">Campaign: All</option>
                            {campaignOptions.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Product Filter */}
                    <div className="bg-card p-1 rounded-lg border border-border shadow-sm">
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer max-w-[120px]"
                            title="Filter by Product"
                        >
                            <option value="">Product: All</option>
                            {productOptions.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Filters */}
                    <div className="flex gap-2 bg-card p-1 rounded-lg border border-border shadow-sm">
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer border-l border-border"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* CSV Download Button */}
                    {hasPermission('button:team.download_report') && (
                        <button
                            onClick={handleDownloadCSV}
                            className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                            title="Download Report as CSV"
                        >
                            <Download size={16} />
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* View Selector */}
            <div className="flex gap-2 border-b border-border pb-1 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${view === tab.id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : !stats ? (
                <div className="text-center py-20 text-muted-foreground">No data available</div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2">

                    {/* View: Performance Tiers (Redesigned + New Metrics) */}
                    {view === 'tiers' && stats.tiers && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-green-800">Top Performers</p>
                                            <div title="Cumplimiento >= 100%">
                                                <HelpCircle size={14} className="text-green-600/70 cursor-help" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-green-700">{stats.tiers.top.length}</p>
                                    </div>
                                    <div className="p-3 bg-green-200/50 rounded-full text-green-700">
                                        <TrendingUp size={20} />
                                    </div>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-yellow-800">On Track</p>
                                            <div title="Cumplimiento entre 70% y 99%">
                                                <HelpCircle size={14} className="text-yellow-600/70 cursor-help" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-yellow-700">{stats.tiers.medium.length}</p>
                                    </div>
                                    <div className="p-3 bg-yellow-200/50 rounded-full text-yellow-700">
                                        <Users size={20} />
                                    </div>
                                </div>

                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-medium text-red-800">Needs Attention</p>
                                            <div title="Cumplimiento < 70%">
                                                <HelpCircle size={14} className="text-red-600/70 cursor-help" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-red-700">{stats.tiers.low.length}</p>
                                    </div>
                                    <div className="p-3 bg-red-200/50 rounded-full text-red-700">
                                        <ArrowUpRight size={20} className="rotate-90" />
                                    </div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b bg-secondary/5 font-semibold text-sm text-foreground">
                                    Detailed Breakdown
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-secondary/10 text-muted-foreground font-medium border-b">
                                            <tr>
                                                <th className="px-2 py-2">Agent</th>
                                                <th className="px-2 py-2">
                                                    <div className="flex items-center gap-1">
                                                        Tier
                                                        <div title="Clasificación: Nivel de desempeño basado en el % de cumplimiento actual.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-2 py-2">
                                                    <div className="flex items-center gap-1">
                                                        Trend
                                                        <div title="Tendencia: Comparación de ventas vs. el mes anterior a la misma fecha.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-2 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        Sales
                                                        <div title="Ventas: Total de operaciones vs Meta del periodo.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-2 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        Revenue
                                                        <div title="Volumen ($): Ingresos estimados según el precio de lista (center_price) de los productos.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-2 py-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        Active Days
                                                        <div title="Días Activos: Cantidad de días únicos en el periodo con al menos una venta.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-2 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        Run Rate
                                                        <div title="Proyección: Estimación de cierre de mes basado en el ritmo diario actual.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                                <th className="px-2 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        Run Rate %
                                                        <div title="% Proyectado: Porcentaje de la meta que se alcanzaría si se mantiene el ritmo actual.">
                                                            <HelpCircle size={12} className="text-muted-foreground cursor-help" />
                                                        </div>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {tierRows.map((agent: any) => (
                                                <tr key={agent.user_id} className="hover:bg-secondary/5">
                                                    <td className="px-2 py-1.5">
                                                        <div className="font-medium">{agent.agent_name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{agent.supervisor_name}</div>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium 
                                                            ${agent.tier === 'Top' ? 'bg-green-100/50 text-green-800' :
                                                                agent.tier === 'Medium' ? 'bg-yellow-100/50 text-yellow-800' :
                                                                    'bg-red-100/50 text-red-800'}`}>
                                                            {agent.tier} ({agent.conversion_rate}%)
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <div className="flex items-center gap-1" title={`Prev: ${agent.prev_sales} sales`}>
                                                            <TrendIcon trend={agent.trend} />
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right font-bold">{agent.total_sales} <span className="text-muted-foreground font-normal">/ {agent.total_goal}</span></td>
                                                    <td className="px-2 py-1.5 text-right font-medium text-emerald-600">
                                                        {formatCurrency(agent.revenue)}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-center">
                                                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50/50 text-blue-700 font-mono text-[10px]">
                                                            <CalendarCheck size={10} /> {agent.active_days}
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                                                        {agent.run_rate}
                                                    </td>
                                                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                                                        {Math.round((agent.run_rate / (agent.total_goal || 1)) * 100)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            {tierRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground italic">
                                                        No data available for these filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Agents (Legacy View if selected) */}
                    {view === 'agents' && (
                        <div className="overflow-x-auto bg-card border border-border rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-secondary/50 uppercase text-xs font-semibold text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Agent</th>
                                        <th className="px-4 py-3">Supervisor</th>
                                        <th className="px-4 py-3 text-right">Sales</th>
                                        <th className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                Revenue
                                                <div title="Volumen ($): Ingresos estimados según el precio de lista (center_price) de los productos.">
                                                    <HelpCircle size={14} className="text-muted-foreground cursor-help" />
                                                </div>
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-right">Goal</th>
                                        <th className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                Conversion
                                                <div title="Cumplimiento: % alcanzado respecto a la meta asignada.">
                                                    <HelpCircle size={14} className="text-muted-foreground cursor-help" />
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {stats.byAgent.map((agent: any) => (
                                        <tr key={agent.user_id} className="hover:bg-secondary/20">
                                            <td className="px-4 py-3 font-medium">{agent.agent_name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{agent.supervisor_name}</td>
                                            <td className="px-4 py-3 text-right font-bold">{agent.total_sales}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatCurrency(agent.revenue)}</td>
                                            <td className="px-4 py-3 text-right">{agent.total_goal}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${parseFloat(agent.conversion_rate) >= 100
                                                    ? 'bg-green-100 text-green-700'
                                                    : parseFloat(agent.conversion_rate) >= 70
                                                        ? 'bg-yellow-100 text-yellow-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {agent.conversion_rate}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* View: Supervisors */}
                    {view === 'supervisors' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {stats.bySupervisor.map((sup: any) => (
                                <div key={sup.supervisor_id} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                                    <h3 className="text-lg font-bold mb-1">{sup.name}</h3>
                                    <p className="text-xs text-muted-foreground mb-4">{sup.agent_count} Agents</p>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span>Total Sales</span>
                                            <span className="font-bold">{sup.total_sales}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span>Team Goal</span>
                                            <span>{sup.total_goal}</span>
                                        </div>
                                        <div className="pt-3 border-t border-border mt-3">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-semibold uppercase text-muted-foreground">Team Conversion</span>
                                                <span className={`text-sm font-bold ${parseFloat(sup.conversion_rate) >= 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {sup.conversion_rate}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${parseFloat(sup.conversion_rate) >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(parseFloat(sup.conversion_rate), 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* View: Campaigns */}
                    {view === 'campaigns' && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {stats.byCampaign.map((camp: any) => (
                                <MetricCard
                                    key={camp.id}
                                    title={camp.name}
                                    value={camp.count}
                                    sub="Total Operations"
                                    icon={Briefcase}
                                    color="bg-purple-600"
                                />
                            ))}
                        </div>
                    )}

                    {/* View: Products */}
                    {view === 'products' && (
                        <div className="overflow-x-auto bg-card border border-border rounded-xl">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-secondary/50 uppercase text-xs font-semibold text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-right">Sales</th>
                                        <th className="px-4 py-3 text-right">Goal (Total)</th>
                                        <th className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                Conversion
                                                <div title="Cumplimiento: % alcanzado respecto a la meta asignada.">
                                                    <HelpCircle size={14} className="text-muted-foreground cursor-help" />
                                                </div>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {stats.byProduct.map((prod: any) => (
                                        <tr key={prod.id} className="hover:bg-secondary/20">
                                            <td className="px-4 py-3 font-medium">{prod.name}</td>
                                            <td className="px-4 py-3 text-right font-bold">{prod.sales}</td>
                                            <td className="px-4 py-3 text-right">{prod.goal}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full"
                                                            style={{ width: `${Math.min(parseFloat(prod.conversion_rate) || 0, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono min-w-[3ch]">{prod.conversion_rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
