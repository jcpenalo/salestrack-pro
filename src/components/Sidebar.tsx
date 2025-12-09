'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    BarChart3,
    Users,
    FileText,
    Settings,
    ShieldAlert,
    LogOut
} from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import { supabase } from '@/lib/supabaseClient';
import AgentStatusToggle from './AgentStatusToggle';

// Define items with their required permission key
const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, href: '/dashboard', key: 'tab:overview' },
    { name: 'Sales', icon: ShoppingCart, href: '/dashboard/sales', key: 'tab:sales' },
    { name: 'Summary', icon: BarChart3, href: '/dashboard/summary', key: 'tab:summary' },
    { name: 'Team', icon: Users, href: '/dashboard/team', key: 'tab:team' },
    { name: 'Reports', icon: FileText, href: '/dashboard/reports', key: 'tab:reports' },
    { name: 'Config', icon: Settings, href: '/dashboard/config', key: 'tab:config' },
    { name: 'Admin', icon: ShieldAlert, href: '/dashboard/admin', key: 'tab:admin_dashboard' },
];

export default function Sidebar() {
    const { profile, loading, hasPermission } = usePermissions();
    const router = useRouter();

    const filteredItems = menuItems.filter(item => {
        // Items without key are always visible (if any), but here all have keys except maybe Sales in future
        if (!item.key) return true;

        // Use synchronous check from context
        return hasPermission(item.key);
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50 transition-all duration-300">
            <div className="p-6 border-b border-border">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    SalesTrack Pro
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {loading ? (
                    // Skeleton Loading for Nav Items
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl animate-pulse">
                            <div className="w-5 h-5 bg-muted rounded-md" />
                            <div className="h-4 bg-muted rounded w-24" />
                        </div>
                    ))
                ) : (
                    filteredItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors group"
                        >
                            <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))
                )}
            </nav>

            <div className="p-4 border-t border-border">
                {loading ? (
                    <div className="animate-pulse flex items-center gap-3 px-4 py-3">
                        <div className="w-10 h-10 rounded-full bg-muted"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-muted rounded w-3/4"></div>
                            <div className="h-2 bg-muted rounded w-1/2"></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 px-4 py-3 rounded-xl bg-secondary/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold uppercase">
                                {profile?.full_name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                                <p className="text-xs text-muted-foreground truncate capitalize">Role: {profile?.role || 'Guest'}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                            <AgentStatusToggle />
                            <button
                                onClick={handleLogout}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
