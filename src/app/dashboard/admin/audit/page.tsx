'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getAuditLogsAction } from '@/actions/auditActions';
import { Loader2, Shield, AlertTriangle, FileText, Activity, Database, ServerCrash, Eye, X } from 'lucide-react';

export default function AuditPage() {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'activity' | 'system'>('activity');
    const [page, setPage] = useState(0);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    useEffect(() => {
        loadLogs();
    }, [activeTab, page]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const res = await getAuditLogsAction(session.access_token, {
                    page,
                    limit: 100
                });

                if (res.success && res.data) {
                    const filtered = res.data.filter((l: any) => {
                        if (activeTab === 'system') return l.category === 'SYSTEM';
                        return l.category !== 'SYSTEM';
                    });
                    setLogs(filtered);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (sev: string) => {
        switch (sev) {
            case 'ERROR': return 'bg-red-100 text-red-700 border-red-200';
            case 'WARNING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'CRITICAL': return 'bg-rose-100 text-rose-800 border-rose-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-100'; // INFO
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'ACCESS': return <Shield size={14} />;
            case 'DATA': return <Database size={14} />;
            case 'CONFIG': return <FileText size={14} />;
            case 'SYSTEM': return <ServerCrash size={14} />;
            default: return <Activity size={14} />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
                    <p className="text-muted-foreground">Track system activity and data changes.</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => { setActiveTab('activity'); setPage(0); }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    Activity Log
                </button>
                <button
                    onClick={() => { setActiveTab('system'); setPage(0); }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'system' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                    System Log
                </button>
            </div>

            {/* Content */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/10 text-muted-foreground font-medium border-b">
                            <tr>
                                <th className="px-4 py-3 w-[180px]">Timestamp</th>
                                <th className="px-4 py-3 w-[100px]">Category</th>
                                <th className="px-4 py-3 w-[150px]">User</th>
                                <th className="px-4 py-3 w-[150px]">Action</th>
                                <th className="px-4 py-3">Details</th>
                                <th className="px-4 py-3 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {loading && logs.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></td></tr>
                            )}
                            {!loading && logs.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No logs found.</td></tr>
                            )}

                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-secondary/5 transition-colors">
                                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityColor(log.severity)} uppercase`}>
                                            {getCategoryIcon(log.category)}
                                            {log.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium">
                                        {log.users?.full_name || 'System / Unknown'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs uppercase text-primary/80">
                                        {log.action}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[300px]">
                                        {log.table_name && <span className="font-mono text-foreground">{log.table_name} </span>}
                                        {log.record_id && <span className="opacity-50">#{log.record_id.substring(0, 8)}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Details */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-border">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold">Log Details</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-secondary rounded"><X size={18} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground text-xs uppercase mb-1">Event ID</div>
                                    <div className="font-mono">{selectedLog.id}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs uppercase mb-1">Changed By</div>
                                    <div>{selectedLog.users?.full_name || selectedLog.changed_by || 'System'}</div>
                                </div>
                            </div>

                            {/* Diff View */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Data Changes</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                                        <div className="text-xs uppercase font-bold text-red-700 mb-2">Previous Data</div>
                                        <pre className="text-[10px] break-all whitespace-pre-wrap font-mono text-red-900/80">
                                            {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : 'N/A'}
                                        </pre>
                                    </div>
                                    <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                                        <div className="text-xs uppercase font-bold text-green-700 mb-2">New Data</div>
                                        <pre className="text-[10px] break-all whitespace-pre-wrap font-mono text-green-900/80">
                                            {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : 'N/A'}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata */}
                            {selectedLog.metadata && (
                                <div className="bg-secondary/10 p-3 rounded-lg border">
                                    <div className="text-xs uppercase font-bold text-muted-foreground mb-2">Metadata</div>
                                    <pre className="text-[10px] font-mono whitespace-pre-wrap text-muted-foreground">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
