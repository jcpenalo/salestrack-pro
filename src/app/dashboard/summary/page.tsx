'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Filter, ChevronRight, ChevronDown, DollarSign, Target, BarChart } from 'lucide-react';
import { getSummaryStatsAction } from '@/actions/summaryActions';
import { useRequireAccess } from '@/hooks/useRequireAccess';

export default function SummaryPage() {
    const { hasAccess, loading: accessLoading } = useRequireAccess('tab:summary');
    const [dataLoading, setDataLoading] = useState(false);
    const loading = accessLoading || dataLoading;
    const [data, setData] = useState<any[]>([]);

    // Filters
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());

    // Grouping
    const [groupBy1, setGroupBy1] = useState('campaign');
    const [groupBy2, setGroupBy2] = useState('agent');

    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Options for grouping
    const groupOptions = [
        { id: 'campaign', label: 'Campaign' },
        { id: 'agent', label: 'Agent' },
        { id: 'product', label: 'Product' },
        { id: 'supervisor', label: 'Supervisor' },
        { id: 'date', label: 'Date' }
    ];

    useEffect(() => {
        if (!hasAccess && !accessLoading) return;
        loadData();
    }, [month, year, groupBy1, groupBy2, hasAccess, accessLoading]);

    const loadData = async () => {
        if (accessLoading) return;
        setDataLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const res = await getSummaryStatsAction(session.access_token, month, year, groupBy1, groupBy2);
                if (res.success) {
                    setData(res.data);
                } else {
                    console.error(res.error);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDataLoading(false);
        }
    };

    const toggleExpand = (key: string) => {
        const next = new Set(expanded);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        setExpanded(next);
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    // Dynamic headers based on selection
    const label1 = groupOptions.find(g => g.id === groupBy1)?.label || 'Group 1';
    const label2 = groupOptions.find(g => g.id === groupBy2)?.label || 'Group 2';

    if (!hasAccess && !accessLoading) return null; // Redirect handled by hook

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Summary Pivot</h2>
                <p className="text-muted-foreground">Dynamic analysis of sales performance.</p>
            </div>

            {/* Controls Bar */}
            <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">

                <div className="flex gap-4 items-center w-full md:w-auto">
                    {/* Date */}
                    <div className="flex bg-secondary/30 p-1 rounded-lg border border-border">
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer border-l border-border/50"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="h-6 w-px bg-border hidden md:block"></div>

                    {/* Group By 1 */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Group By</span>
                        <div className="bg-secondary/30 p-1 rounded-lg border border-border">
                            <select
                                value={groupBy1}
                                onChange={(e) => setGroupBy1(e.target.value)}
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer min-w-[100px]"
                            >
                                {groupOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Group By 2 */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Then By</span>
                        <div className="bg-secondary/30 p-1 rounded-lg border border-border">
                            <select
                                value={groupBy2}
                                onChange={(e) => setGroupBy2(e.target.value)}
                                className="bg-transparent text-sm font-medium px-2 py-1 outline-none cursor-pointer min-w-[100px]"
                            >
                                <option value="none">None</option>
                                {groupOptions.filter(o => o.id !== groupBy1).map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {loading && <Loader2 className="animate-spin w-4 h-4" />}
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/10 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-6 py-3 w-[40%]">{label1} / {label2}</th>
                                <th className="px-4 py-3 text-right">Sales</th>
                                <th className="px-4 py-3 text-right">Revenue</th>
                                <th className="px-4 py-3 text-right">Goal</th>
                                <th className="px-4 py-3 text-right">Conv. %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {data.length === 0 && !loading && (
                                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No data found for this period.</td></tr>
                            )}

                            {data.map((group) => {
                                const isOpen = expanded.has(group.key);
                                const hasChildren = group.children && group.children.length > 0;
                                const isClickable = hasChildren && groupBy2 !== 'none';

                                return (
                                    <React.Fragment key={group.key}>
                                        {/* Parent Row */}
                                        <tr
                                            key={group.key}
                                            className={`
                                                ${isClickable ? 'cursor-pointer hover:bg-secondary/10' : ''} 
                                                bg-card/50 transition-colors
                                            `}
                                            onClick={() => isClickable && toggleExpand(group.key)}
                                        >
                                            <td className="px-6 py-3 font-medium flex items-center gap-2">
                                                {isClickable && (
                                                    <span className="text-muted-foreground">
                                                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </span>
                                                )}
                                                <span className={isClickable ? 'text-primary' : 'text-foreground'}>{group.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">{group.sales}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600 font-mono tracking-tight text-xs">
                                                {formatCurrency(group.revenue)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-muted-foreground text-xs">{group.goal || '-'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`
                                                    inline-block px-2 py-0.5 rounded text-[10px] font-bold min-w-[3rem] text-center
                                                    ${parseFloat(group.conversion) >= 100 ? 'bg-green-100 text-green-700' :
                                                        parseFloat(group.conversion) >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-secondary text-muted-foreground'}
                                                `}>
                                                    {group.conversion}%
                                                </span>
                                            </td>
                                        </tr>

                                        {/* Child Rows (Accordion) */}
                                        {isOpen && hasChildren && group.children.map((child: any) => (
                                            <tr key={`${group.key}-${child.key}`} className="bg-secondary/5 text-xs">
                                                <td className="px-6 py-2 pl-12 flex items-center gap-2 text-muted-foreground">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                                    {child.label}
                                                </td>
                                                <td className="px-4 py-2 text-right">{child.sales}</td>
                                                <td className="px-4 py-2 text-right text-muted-foreground font-mono">
                                                    {formatCurrency(child.revenue)}
                                                </td>
                                                <td className="px-4 py-2 text-right text-muted-foreground/50">{child.goal || '-'}</td>
                                                <td className="px-4 py-2 text-right text-muted-foreground">
                                                    {child.conversion}%
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
