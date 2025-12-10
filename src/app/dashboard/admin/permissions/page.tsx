'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getPermissionsAction, upsertPermissionAction } from '@/actions/permissionActions';
import { Loader2, Shield, Lock, Check } from 'lucide-react';

import { useRequireAccess } from '@/hooks/useRequireAccess';

export default function PermissionsPage() {
    const { hasAccess, profile } = useRequireAccess('tab:admin_dashboard');
    const [permissions, setPermissions] = useState<any[]>([]);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState("Navigation & Filters");

    // Definitions
    const rolesOrder = ['creator', 'admin', 'gerente', 'senior', 'supervisor', 'auditor', 'seguimiento', 'digitacion', 'representative'];

    const roleHierarchy: { [key: string]: number } = {
        'creator': 0,
        'admin': 1,
        'gerente': 2,
        'senior': 3,
        'supervisor': 4,
        'auditor': 5,
        'seguimiento': 6,
        'digitacion': 7,
        'representative': 8
    };

    const canEditRole = (targetRole: string) => {
        if (!profile?.role) return false;
        if (targetRole === 'creator') return false; // Hard lock

        const myLevel = roleHierarchy[profile.role.toLowerCase()] ?? 99;
        const targetLevel = roleHierarchy[targetRole.toLowerCase()] ?? 99;

        // Rule: strictly lower ranking (higher index) can be edited.
        // My Level (Example Admin=1) < Target Level (Example Senior=3) -> OK
        // My Level (Example Admin=1) < Target Level (Example Admin=1) -> FALSE
        return myLevel < targetLevel;
    };

    // Grouped Resources
    const groups = [
        {
            title: "Navigation & Filters",
            resources: [
                'tab:sales',
                'tab:overview',
                'tab:admin_dashboard',
                'tab:config',
                'tab:reports',
                'tab:summary',
                'tab:audit_logs',
                'tab:system_monitor',
                'filter:sales.date_range',
                'filter:sales.os_madre',
                'filter:sales.os_hija',
                'filter:sales.contact',
                'filter:sales.concept',
                'filter:sales.status'
            ]
        },
        {
            title: "Sales Operations (Field Editing)",
            resources: [
                'field:sales.assigned_to',
                'field:sales.status_id',
                'field:sales.campaign_id',
                'field:sales.contact_number',
                'field:sales.os_madre',
                'field:sales.os_hija',
                'field:sales.comment_claro',
                'field:sales.comment_orion',
                'field:sales.comment_dofu',
                'field:sales.installed_number',
                'feature:user_status_toggle',
                'feature:team_tiers',
                'button:team.download_report'
            ]
        },
        {
            title: "Sales Actions (Buttons)",
            resources: [
                'button:sales.download',
                'button:sales.backup_bd',
                'button:sales.restore_bd',
                'button:sales.delete_bd',
                'button:sales.clear_bd',
                'config:manage_skills'
            ]
        }
    ];

    const labelMap: any = {
        'button:sales.download': 'Download (CSV)',
        'button:sales.backup_bd': 'Backup BD (Dump)',
        'button:sales.restore_bd': 'Restore BD (JSON)',
        'button:sales.delete_bd': 'Delete BD (All)',
        'button:sales.clear_bd': 'Clear BD (Range)',
        'field:sales.assigned_to': 'Assigned To',
        'field:sales.status_id': 'Status',
        'field:sales.campaign_id': 'Campaign',
        'field:sales.contact_number': 'Contact',
        'field:sales.os_madre': 'OS Madre',
        'field:sales.os_hija': 'OS Hija',
        'field:sales.comment_claro': 'Comms Claro',
        'field:sales.comment_orion': 'Comms Orion',
        'field:sales.comment_dofu': 'Comms Dofu',
        'field:sales.installed_number': 'Inst. Num',
        'feature:user_status_toggle': 'Toggle Online Status',
        'feature:team_tiers': 'View Team Performance Tiers',
        'button:team.download_report': 'Download Team Report (CSV)',
        'config:manage_skills': 'Manage User Skills',
        'tab:sales': 'Sales Tab',
        'tab:overview': 'Overview Dashboard',
        'tab:admin_dashboard': 'Admin Dashboard',
        'tab:config': 'Config Tab',
        'tab:reports': 'Reports Tab',
        'tab:summary': 'Summary Tab',
        'tab:audit_logs': 'Admin: Audit Logs',
        'tab:system_monitor': 'Admin: System Monitor',
        'filter:sales.date_range': 'Filter: Dates',
        'filter:sales.os_madre': 'Filter: OS Madre',
        'filter:sales.os_hija': 'Filter: OS Hija',
        'filter:sales.contact': 'Filter: Contact',
        'filter:sales.concept': 'Filter: Concept',
        'filter:sales.status': 'Filter: Status',
        'tab:config.campaigns': 'Config: Campaigns',
        'tab:config.products': 'Config: Products',
        'tab:config.statuses': 'Config: Statuses',
        'tab:config.concepts': 'Config: Concepts',
        'tab:config.goals': 'Config: Goals',
        'tab:config.users': 'Config: Users'
    };

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setAccessToken(session.access_token);
                const res = await getPermissionsAction(session.access_token);
                if (res.success) setPermissions(res.data || []);
            }
        } catch (error) {
            console.error('Error loading permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (role: string, resourceKey: string, currentStatus: boolean) => {
        if (role === 'creator') return;

        // Create a temporary ID string for loading state
        const tempKey = `${role}-${resourceKey}`;
        setSaving(tempKey);

        try {
            // Use cached token to avoid async getSession stalls
            if (!accessToken) {
                // Try one last ditch effort if token is missing (page refresh edge case)
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setSaving(null);
                    return;
                }
                // Update cache if found
                setAccessToken(session.access_token);
            }

            const tokenToUse = accessToken || (await supabase.auth.getSession()).data.session?.access_token;
            if (!tokenToUse) return;

            const newStatus = !currentStatus;

            // Action timeout
            const timeoutPromise = new Promise<{ success: boolean; error?: string }>((_, reject) =>
                setTimeout(() => reject(new Error('Update request timed out')), 10000)
            );

            const actionPromise = upsertPermissionAction(tokenToUse, role, resourceKey, newStatus);

            const res = await Promise.race([actionPromise, timeoutPromise]) as { success: boolean, error?: string };


            if (res.success) {
                // Optimistically update or re-fetch?
                // Re-fetching is safer but slower. Let's update local state.
                // Check if row exists
                const exists = permissions.find(p => p.role === role && p.resource_key === resourceKey);
                if (exists) {
                    setPermissions(prev => prev.map(p =>
                        (p.role === role && p.resource_key === resourceKey)
                            ? { ...p, is_allowed: newStatus }
                            : p
                    ));
                } else {
                    // Add new local mock
                    setPermissions(prev => [...prev, { role, resource_key: resourceKey, is_allowed: newStatus }]);
                }
            } else {
                alert('Failed to update: ' + res.error);
            }
        } catch (error: any) {
            console.error('Toggle error:', error);
            alert('An error occurred: ' + (error.message || 'Unknown error'));
        } finally {
            setSaving(null);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    const activeGroup = groups.find(g => g.title === activeCategory) || groups[0];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="text-indigo-600" size={24} />
                        Permission Matrix
                    </h2>
                    <p className="text-sm text-muted-foreground">Manage role-based access to app features.</p>
                </div>

                {/* Category Tabs */}
                <div className="flex bg-secondary/30 p-1 rounded-lg self-start">
                    {groups.map(group => (
                        <button
                            key={group.title}
                            onClick={() => setActiveCategory(group.title)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeCategory === group.title
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {group.title.split('(')[0].trim()} {/* Simplified Tab Name */}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-secondary/10 border-b flex justify-between items-center">
                    <span className="font-semibold text-xs uppercase tracking-wider text-foreground">
                        {activeGroup.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {activeGroup.resources.length} resources
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-secondary/5 text-muted-foreground border-b border-border/50">
                            <tr>
                                <th className="px-3 py-2 font-medium w-48 sticky left-0 bg-background/95 backdrop-blur z-10">Resource</th>
                                {rolesOrder.map(role => (
                                    <th key={role} className="px-1 py-2 font-medium text-center min-w-[60px] text-[10px] uppercase">
                                        {role.replace('representative', 'Rep').replace('seguimiento', 'Segui...').replace('digitacion', 'Digit...')}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {activeGroup.resources.map(resourceKey => (
                                <tr key={resourceKey} className="hover:bg-secondary/5 transition-colors">
                                    <td className="px-3 py-1.5 font-medium border-r border-border/50 sticky left-0 bg-background/95 backdrop-blur">
                                        {labelMap[resourceKey] || resourceKey}
                                    </td>
                                    {rolesOrder.map(role => {
                                        const perm = permissions.find(p => p.role === role && p.resource_key === resourceKey);
                                        const isAllowed = perm ? perm.is_allowed : false;
                                        const isCreator = role === 'creator';
                                        const isLoading = saving === `${role}-${resourceKey}`;

                                        const canEdit = canEditRole(role);

                                        return (
                                            <td key={role + resourceKey} className="px-1 py-1 text-center">
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={() => handleToggle(role, resourceKey, isAllowed)}
                                                        disabled={!canEdit || isLoading}
                                                        className={`
                                                            w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200
                                                            ${isAllowed
                                                                ? 'bg-green-600 border-green-600 text-white shadow-sm'
                                                                : 'bg-background border-input hover:border-indigo-500 hover:bg-secondary'}
                                                            ${(!canEdit) ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                                                        `}
                                                        title={!canEdit ? "Locked (Higher/Equal Rank)" : (isAllowed ? "Allowed" : "Denied")}
                                                    >
                                                        {isLoading ? (
                                                            <Loader2 size={10} className="animate-spin" />
                                                        ) : (
                                                            isCreator ? <Check size={12} strokeWidth={3} /> : (isAllowed && <Check size={12} strokeWidth={3} />)
                                                        )}
                                                    </button>
                                                    {isCreator && <Lock size={8} className="absolute top-0.5 right-0.5 text-indigo-600 opacity-70" />}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
