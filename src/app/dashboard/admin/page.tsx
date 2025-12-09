'use client';

import { AdminUsersView } from '@/components/admin/AdminUsersView';
import { ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePermissions } from '@/context/PermissionsContext';

// ... imports
import PermissionsView from './permissions/page';
import AuditView from './audit/page';
import MonitoringView from './monitoring/page';

export default function AdminPage() {
    const { hasPermission, loading } = usePermissions();
    const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit' | 'monitoring'>('users');

    // If loading, maybe show skeleton? Or just let it render.
    // Permissions are generally fast via context.

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">System administration and user control.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b overflow-x-auto">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab('permissions')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'permissions'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Permissions Matrix
                </button>

                {hasPermission('tab:audit_logs') && (
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audit'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Audit Logs
                    </button>
                )}

                {hasPermission('tab:system_monitor') && (
                    <button
                        onClick={() => setActiveTab('monitoring')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'monitoring'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        System Monitoring
                    </button>
                )}
            </div>

            {activeTab === 'users' ? (
                <AdminUsersView />
            ) : activeTab === 'permissions' ? (
                <PermissionsView />
            ) : activeTab === 'audit' && hasPermission('tab:audit_logs') ? (
                <AuditView />
            ) : activeTab === 'monitoring' && hasPermission('tab:system_monitor') ? (
                <MonitoringView />
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    Select a tab
                </div>
            )}
        </div>
    );
}
