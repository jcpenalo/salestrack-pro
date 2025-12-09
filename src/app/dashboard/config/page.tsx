'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
    Tags,
    Package,
    Activity,
    Lightbulb,
    Target,
    User,
    Loader2,
    ShieldAlert
} from 'lucide-react';

import { CampaignsView } from '@/components/config/CampaignsView';
import { ProductsView } from '@/components/config/ProductsView';
import { StatusesView } from '@/components/config/StatusesView';
import { ConceptsView } from '@/components/config/ConceptsView';
import { GoalsView } from '@/components/config/GoalsView';
import { UsersView } from '@/components/config/UsersView';

const tabs = [
    { id: 'campaigns', label: 'Campaigns', icon: Tags, component: CampaignsView },
    { id: 'products', label: 'Products', icon: Package, component: ProductsView },
    { id: 'statuses', label: 'Statuses', icon: Activity, component: StatusesView },
    { id: 'concepts', label: 'Concepts', icon: Lightbulb, component: ConceptsView },
    { id: 'goals', label: 'Goals', icon: Target, component: GoalsView },
    { id: 'users', label: 'Users', icon: User, component: UsersView },
];

export default function ConfigPage() {
    const { profile } = useUserProfile();
    const [permissions, setPermissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('');

    useEffect(() => {
        const loadPermissions = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from('app_permissions')
                    .select('*')
                    .eq('role', profile?.role);
                setPermissions(data || []);
            }
            setLoading(false);
        };
        if (profile?.role) loadPermissions();
    }, [profile?.role]);

    const hasTabPermission = (tabId: string) => {
        if (!profile?.role) return false;
        if (profile.role === 'creator') return true;

        const permissionKey = `tab:config.${tabId}`;
        const perm = permissions.find(p => p.resource_key === permissionKey && p.role === profile.role);
        return perm ? perm.is_allowed : false;
    };

    const allowedTabs = tabs.filter(tab => hasTabPermission(tab.id));

    // Set initial active tab once permissions are loaded
    useEffect(() => {
        if (!loading && allowedTabs.length > 0 && !activeTab) {
            setActiveTab(allowedTabs[0].id);
        }
    }, [loading, allowedTabs, activeTab]);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (allowedTabs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground p-8 border rounded-xl bg-card">
                <ShieldAlert size={48} className="mb-4 text-orange-500" />
                <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
                <p>You do not have permission to view any configuration sections.</p>
            </div>
        );
    }

    const ActiveComponent = allowedTabs.find(t => t.id === activeTab)?.component || allowedTabs[0].component;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Configuration</h2>
                <p className="text-muted-foreground mt-2">Manage your master data and system settings.</p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-xl w-full md:w-fit">
                {allowedTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
            `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area with Animation Placeholder */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ActiveComponent />
            </div>
        </div>
    );
}
