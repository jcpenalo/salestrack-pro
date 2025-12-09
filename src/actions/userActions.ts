'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const createServerClient = (token?: string) => {
    const options: any = {
        auth: { persistSession: false }
    };
    if (token) {
        options.global = {
            headers: { Authorization: `Bearer ${token}` }
        };
    }
    return createClient(supabaseUrl, supabaseKey, options);
};

export async function getUsersAction(token: string) {
    if (!token) return { success: false, error: 'No authenticated session' };
    const supabase = createServerClient(token);

    try {
        // Fetch all fields including new ones
        const { data, error } = await supabase
            .from('users')
            .select(`
                id, email, full_name, role, supervisor_id,
                vicidial_id, card_number, entry_date, exit_date, status, is_active, exit_reason_id, skills
            `)
            .order('email', { ascending: true });

        if (error) {
            // Fallback for missing columns (Backwards compatibility during migration)
            const { data: basicData, error: basicError } = await supabase
                .from('users')
                .select('id, email, full_name') // Minimal fetch
                .order('email', { ascending: true });

            if (basicError) throw basicError;

            // Return basic structure with nulls for new fields
            return {
                success: true, data: basicData.map((u: any) => ({
                    ...u,
                    role: 'agent',
                    supervisor_id: null,
                    status: 'active',
                    is_active: true,
                    skills: []
                }))
            };
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('getUsersAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateUserAction(data: any, token: string) {
    if (!token) return { success: false, error: 'No authenticated session' };
    const supabase = createServerClient(token);

    try {
        // Business Rule: If exit_date is set, status MUST be inactive
        let status = data.status || 'active';
        if (data.exit_date) {
            status = 'inactive';
        }

        const updatePayload = {
            role: data.role,
            supervisor_id: data.supervisor_id,
            vicidial_id: data.vicidial_id,
            card_number: data.card_number,
            entry_date: data.entry_date || null, // Ensure empty string becomes null
            exit_date: data.exit_date || null,
            status: status,
            is_active: data.is_active !== undefined ? data.is_active : true, // Default true
            exit_reason_id: data.exit_reason_id || null,
            skills: data.skills || [] // JSONB array
        };

        const { error } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', data.id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('updateUserAction Error:', error);
        return { success: false, error: error.message };
    }
}

// New Action: Fetch Exit Reasons
export async function getExitReasonsAction(token: string) {
    if (!token) return { success: true, data: [] }; // Don't block if no token (public?) No, auth req.
    const supabase = createServerClient(token);
    try {
        const { data, error } = await supabase
            .from('exit_reasons')
            .select('*')
            .eq('active', true)
            .order('reason', { ascending: true });

        if (error) return { success: true, data: [] }; // Fail gracefully if table missing
        return { success: true, data };
    } catch (e) {
        return { success: false, error: 'Failed to fetch reasons' };
    }
}

// --- NEW ACTIONS FOR SMART ASSIGNMENT ---

export async function toggleUserStatusAction(userId: string, isActive: boolean, token: string) {
    if (!token) return { success: false, error: 'Unauthorized' };
    const supabase = createServerClient(token);

    try {
        // Verify user is changing their own status OR is admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'No user' };

        // For now, allow self-toggle or admin-toggle.
        // Assuming strict permission check is done in UI or middleware.
        // To be safe: If target != me, check if I am admin? 
        // Let's implement robust check:
        if (user.id !== userId) {
            const { data: requester } = await supabase.from('users').select('role').eq('id', user.id).single();
            if (requester?.role !== 'admin' && requester?.role !== 'creator' && requester?.role !== 'supervisor') {
                // But wait, supervisors can disable agents? Yes.
                // If not privilege, fail.
                return { success: false, error: 'Cannot change status of another user' };
            }
        }

        const { error } = await supabase
            .from('users')
            .update({ is_active: isActive })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        console.error('Toggle Status Error:', e);
        return { success: false, error: e.message };
    }
}

export async function updateUserSkillsAction(userId: string, skills: string[], token: string) {
    if (!token) return { success: false, error: 'Unauthorized' };
    const supabase = createServerClient(token);

    try {
        const { error } = await supabase
            .from('users')
            .update({ skills: skills })
            .eq('id', userId);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
