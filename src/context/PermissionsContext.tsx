'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

// Define types
type UserProfile = {
    id: string;
    email: string;
    full_name: string;
    role: string;
    avatar_url?: string;
    is_active?: boolean;
    skills?: any[];
    supervisor_id?: string;
};

type PermissionRule = {
    resource_key: string;
    is_allowed: boolean;
};

type PermissionsContextType = {
    user: User | null;
    profile: UserProfile | null;
    permissions: PermissionRule[];
    loading: boolean;
    hasPermission: (key: string) => boolean;
    refreshPermissions: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [permissions, setPermissions] = useState<PermissionRule[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            // 1. Get Session
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user || null;
            setUser(currentUser);

            if (!currentUser) {
                setProfile(null);
                setPermissions([]);
                setLoading(false);
                return;
            }

            // 2. Fetch Profile & Permissions in Parallel (with Timeout)
            const fetchPromise = Promise.all([
                supabase.from('users').select('*').eq('id', currentUser.id).single(),
                supabase.from('app_permissions').select('resource_key, is_allowed')
            ]);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Permissions check timed out')), 5000)
            );

            const [profileRes, permRes] = await Promise.race([fetchPromise, timeoutPromise]) as any;

            const userProfile = profileRes.data || null;
            setProfile(userProfile);

            if (userProfile) {
                // Fetch specific permissions for this role
                // Note: We could fetch ALL permissions for the role in one go.
                const { data: rolePerms } = await supabase
                    .from('app_permissions')
                    .select('resource_key, is_allowed')
                    .eq('role', userProfile.role);

                setPermissions(rolePerms || []);
            }

        } catch (error) {
            console.error('PermissionsContext Load Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Listen for Auth Changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session?.user?.id !== user?.id) {
                    loadData();
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
                setPermissions([]);
                setLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Helper: hasPermission
    const hasPermission = (key: string): boolean => {
        if (!profile) return false;

        // Normalize role to avoid case sensitivity issues (e.g. Creator vs creator)
        const role = profile.role?.toLowerCase() || '';

        if (role === 'creator') return true; // Super Admin Override

        // Look for explicit rule
        // Assuming strict deny by default if not found? Or strict allow?
        // In our Matrix, existing rows mean "defined".
        // Let's assume if the row exists and is true -> allowed.
        const rule = permissions.find(p => p.resource_key === key);
        return rule ? rule.is_allowed : false;
    };

    return (
        <PermissionsContext.Provider value={{ user, profile, permissions, loading, hasPermission, refreshPermissions: loadData }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
