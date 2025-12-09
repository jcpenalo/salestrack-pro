'use client';

import { useState, useEffect, isValidElement } from 'react';
import { ShieldCheck, Server, Key, AlertTriangle, RefreshCw, Activity, CheckCircle2, XCircle, Users, Gauge } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { checkSystemHealthAction, SystemHealth } from '@/actions/monitoringActions';
import clsx from 'clsx';

function StatusCard({ title, status, details, icon: Icon, color }: any) {
    const isGood = status === 'ok' || status === true || status === 'healthy';
    const isWarn = status === 'degraded';

    return (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
                <div className={clsx("p-2 rounded-lg",
                    isGood ? "bg-green-100 text-green-600" : (isWarn ? "bg-yellow-100 text-yellow-600" : "bg-red-100 text-red-600")
                )}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={clsx("px-2 py-1 rounded-full text-xs font-medium",
                    isGood ? "bg-green-100 text-green-700" : (isWarn ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")
                )}>
                    {isGood ? 'Healthy' : (isWarn ? 'Degraded' : 'Critical')}
                </div>
            </div>
            <h3 className="text-gray-500 font-medium text-sm">{title}</h3>
            <div className="mt-1 text-2xl font-bold text-foreground">
                {isGood ? 'Operational' : (typeof details === 'string' ? 'Error' : 'Issues Detected')}
            </div>
            {details && (
                <div className="mt-3 text-xs text-muted-foreground border-t pt-3 border-border">
                    {isValidElement(details) ? details : (typeof details === 'object' ? JSON.stringify(details) : details)}
                </div>
            )}
        </div>
    );
}

export default function MonitoringPage() {
    const [loading, setLoading] = useState(false);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [clientPerf, setClientPerf] = useState<number>(0);

    const runDiagnostics = async () => {
        setLoading(true);
        try {
            // Client Perf Measure
            const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
            if (navEntry) {
                setClientPerf(Math.round(navEntry.loadEventEnd - navEntry.startTime));
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const result = await checkSystemHealthAction(session.access_token);
                setHealth(result);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { runDiagnostics(); }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">System Health Monitor</h2>
                    <p className="text-sm text-muted-foreground">Real-time diagnostics of infrastructure, traffic, and performance.</p>
                </div>
                <button
                    onClick={runDiagnostics}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                    {loading ? 'Running Diagnostics...' : 'Run Diagnostics'}
                </button>
            </div>

            {health && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <StatusCard
                        title="Database Connection"
                        status={health.database.connected}
                        icon={Server}
                        details={`Latency: ${health.database.latencyMs}ms`}
                    />
                    <StatusCard
                        title="Audit System"
                        status={health.auditSystem.writable}
                        icon={ShieldCheck}
                        details={health.auditSystem.error || "Write Access Confirmed"}
                    />
                    <StatusCard
                        title="Environment Config"
                        status={health.environment.configured}
                        icon={Key}
                        details={health.environment.configured ? "Keys Loaded" : "Missing Env Vars"}
                    />
                    <StatusCard
                        title="System Traffic"
                        status={true}
                        icon={Users}
                        color="blue"
                        details={
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-green-600 dark:text-green-400">● {health.systemLoad.liveUsers15m} Live Users (15m)</span>
                                <span>{health.systemLoad.activeUsers24h} Active (24h) / {health.systemLoad.recentEvents24h} Logs</span>
                            </div>
                        }
                    />
                    <StatusCard
                        title="Client Performance"
                        status={clientPerf > 0}
                        icon={Gauge}
                        details={clientPerf > 0 ? `Page Load: ${clientPerf}ms` : "Calculating..."}
                    />
                    <StatusCard
                        title="Overall Status"
                        status={health.status === 'healthy'}
                        icon={Activity}
                        details={`Last Check: ${new Date(health.timestamp).toLocaleTimeString()}`}
                    />
                </div>
            )}

            {!health && !loading && (
                <div className="text-center py-10 text-muted-foreground">
                    Click Run Diagnostics to check system status.
                </div>
            )}
        </div>
    );
}
