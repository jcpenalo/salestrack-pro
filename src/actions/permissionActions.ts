'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Fetch all permissions (matrix)
export async function getPermissionsAction(token: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data, error } = await supabase
        .from('app_permissions')
        .select('*')
        .order('resource_key')
        .order('role');

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// Update or Insert a permission rule
export async function upsertPermissionAction(token: string, role: string, resourceKey: string, isAllowed: boolean) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Initial check to prevent modifying 'creator' role is handled by RLS, 
    // but explicit check here is good practice.
    if (role === 'creator') {
        return { success: false, error: 'Cannot modify Creator permissions' };
    }

    // --- HIERARCHY CHECK ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Get current user's role
    const { data: userProfile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const myRole = userProfile?.role?.toLowerCase() || 'representative';

    const roleHierarchy: { [key: string]: number } = {
        'creator': 0, 'admin': 1, 'gerente': 2, 'senior': 3,
        'supervisor': 4, 'auditor': 5, 'seguimiento': 6,
        'digitacion': 7, 'representative': 8
    };

    const myLevel = roleHierarchy[myRole] ?? 99;
    const targetLevel = roleHierarchy[role.toLowerCase()] ?? 99;

    if (myLevel >= targetLevel) {
        return { success: false, error: `Insufficient permissions. You cannot edit roles equal to or above your rank. (Your Rank: ${myLevel}, Target: ${targetLevel})` };
    }
    // -----------------------

    const { error } = await supabase
        .from('app_permissions')
        .upsert(
            { role, resource_key: resourceKey, is_allowed: isAllowed, updated_at: new Date().toISOString() },
            { onConflict: 'role,resource_key' }
        );

    if (error) return { success: false, error: error.message };

    // revalidatePath('/dashboard/admin');
    return { success: true };
}
