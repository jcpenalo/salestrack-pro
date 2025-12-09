'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, TrendingUp, CalendarClock, Info, Filter } from 'lucide-react';
import { getReportsStatsAction } from '@/actions/reportsActions';

import { useRequireAccess } from '@/hooks/useRequireAccess';

export default function ReportsPage() {
    const { hasAccess, loading: accessLoading } = useRequireAccess('tab:reports');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    // Filter State
    const [campaignId, setCampaignId] = useState<string>('');
    const [statusId, setStatusId] = useState<string>('');
    const [options, setOptions] = useState<{ campaigns: any[], statuses: any[] }>({ campaigns: [], statuses: [] });

    useEffect(() => {
        if (!hasAccess && !accessLoading) return; // Hook handles redirect, just wait

        const load = async () => {
            // Do not block initial load on filter change if it's just a refresh, but here we want to reload when filters change
            // accessLoading check is crucial to avoid double fetch
            if (accessLoading) return;

            setLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    const res = await getReportsStatsAction(session.access_token, campaignId, statusId);
                    if (res.success) {
                        setData(res.data);
                        if (res.data?.options) {
                            setOptions(res.data.options);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [hasAccess, accessLoading, campaignId, statusId]);

    if (!hasAccess && !accessLoading) return null;

    // Show loading only on initial load or full reload, but maybe better to show a subtle loader for filters
    // For now, full loader is fine or we can do a localized loader.
    // Let's keep the full loader for simplicity as the page rebuilds graphics.
    if (loading && !data) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    // If data is loaded but we are refetching (swapping filters), we can show existing data with a spinner overlay or just existing data
    // Ideally we want to show loading state. 
    // Let's fallback to the loader if loading is true.
    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    if (!data) return <div className="p-8 text-center text-muted-foreground">No data available</div>;

    const { forecast, heatmap } = data;

    // --- Chart Logic ---
    const allPoints = [...forecast.history, {
        key: 'pred',
        label: forecast.prediction.label,
        count: forecast.prediction.count,
        isPrediction: true
    }];

    const maxVal = Math.max(...allPoints.map(p => p.count), 10);
    const points = allPoints.map((p, i) => {
        const x = (i / (allPoints.length - 1)) * 100;
        const y = 100 - ((p.count / maxVal) * 100);
        return { ...p, x, y };
    });

    // Create SVG Path
    // Handle empty data gracefullly
    const pathD = points.length > 0
        ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        : '';

    // --- Heatmap Logic ---
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getHeatColor = (val: number) => {
        if (!heatmap.max) return 'bg-secondary/20';
        const intensity = val / heatmap.max;
        // Tailwind Opacity classes usually hardcoded, so use inline style for specific opacity
        return `rgba(59, 130, 246, ${Math.max(0.1, intensity)})`; // Blue
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <TrendingUp className="text-primary" />
                        AI Reports & Forecasts
                    </h2>
                    <p className="text-muted-foreground mt-2">Predictive analytics and operational insights.</p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <div className="bg-card p-1 rounded-lg border border-border shadow-sm flex items-center gap-2">
                        <Filter size={16} className="text-muted-foreground ml-2" />

                        <select
                            value={campaignId}
                            onChange={(e) => setCampaignId(e.target.value)}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer max-w-[150px]"
                        >
                            <option value="">All Campaigns</option>
                            {options.campaigns.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <div className="w-px h-4 bg-border"></div>

                        <select
                            value={statusId}
                            onChange={(e) => setStatusId(e.target.value)}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer max-w-[150px]"
                        >
                            <option value="">All Statuses</option>
                            {options.statuses.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* FORECAST CARD */}
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-semibold text-lg">Sales Forecast</h3>
                            <p className="text-sm text-muted-foreground">Historical performance & next month prediction.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{forecast.history[forecast.history.length - 1]?.count || 0} Sales</div>
                            <div className="text-xs font-medium text-muted-foreground">
                                Current Month
                            </div>
                            <div className={`text-xs mt-1 font-medium ${forecast.prediction.trend === 'up' ? 'text-green-600' : 'text-amber-600'}`}>
                                Forecast Next Month: {forecast.prediction.count}
                            </div>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-[250px] w-full relative">
                        {points.length > 1 ? (
                            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {/* Grid Lines */}
                                <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
                                <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />

                                {/* Path - Split into History and Prediction segments */}
                                {/* History Line (Solid) */}
                                <polyline
                                    points={points.slice(0, points.length - 1).map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-primary"
                                />
                                {/* Prediction Line (Dashed) */}
                                <line
                                    x1={points[points.length - 2].x}
                                    y1={points[points.length - 2].y}
                                    x2={points[points.length - 1].x}
                                    y2={points[points.length - 1].y}
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeDasharray="4"
                                    className="text-primary/50"
                                />

                                {/* Dots */}
                                {points.map((p, i) => (
                                    <g key={i}>
                                        <circle cx={p.x} cy={p.y} r="2" className={`${p.isPrediction ? 'text-primary/50' : 'text-primary'} fill-background stroke-current`} />
                                        {/* Tooltip-ish text */}
                                        <text x={p.x} y={105} fontSize="4" textAnchor="middle" className="fill-muted-foreground">
                                            {p.label}
                                        </text>
                                        <text x={p.x} y={p.y - 5} fontSize="3" textAnchor="middle" fontWeight="bold" className="fill-foreground">
                                            {p.count}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                Not enough data for forecast.
                            </div>
                        )}
                    </div>
                </div>

                {/* HEATMAP CARD */}
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <CalendarClock size={20} />
                                Activity Heatmap
                            </h3>
                            <p className="text-sm text-muted-foreground">7x24 grid visualizing sales intensity by day and hour.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-[500px]">
                            {/* Header (Hours) */}
                            <div className="flex mb-2">
                                <div className="w-10"></div>
                                {hours.map(h => (
                                    <div key={h} className="flex-1 text-[9px] text-center text-muted-foreground">
                                        {h}
                                    </div>
                                ))}
                            </div>

                            {/* Rows (Days) */}
                            {days.map((day, dIndex) => (
                                <div key={day} className="flex mb-1 items-center">
                                    <div className="w-10 text-xs text-muted-foreground font-medium">{day}</div>
                                    {hours.map(h => {
                                        const cell = heatmap.data.find((x: any) => x.day === dIndex && x.hour === h);
                                        const val = cell ? cell.value : 0;
                                        return (
                                            <div
                                                key={h}
                                                className="flex-1 h-6 mx-[1px] rounded-sm transition-all hover:ring-2 ring-primary/50 relative group"
                                                style={{ backgroundColor: getHeatColor(val) }}
                                                title={`${day} @ ${h}:00 - ${val} Sales`}
                                            >
                                                {val > 0 && (
                                                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10 left-1/2 -translate-x-1/2">
                                                        {val} Sales
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                        <Info size={14} />
                        <span>Visualizes activity based on 'Last 30 Days' data. Darker color = higher volume.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
