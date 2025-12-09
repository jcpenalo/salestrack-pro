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

export async function getGoalsAction(token?: string) {
    const supabase = createServerClient(token);
    try {
        // 1. Fetch raw goals (no joins to avoid schema errors)
        const { data: goals, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .order('created_at', { ascending: false });

        if (goalsError) throw goalsError;

        if (!goals || goals.length === 0) return { success: true, data: [] };

        // 2. Fetch related data manually (Application-side Join)
        // This is robust against missing Foreign Keys in the DB
        const userIds = [...new Set(goals.map((g: any) => g.user_id).filter(Boolean))];
        const productIds = [...new Set(goals.map((g: any) => g.product_id).filter(Boolean))];

        const [usersRes, productsRes] = await Promise.all([
            supabase.from('users').select('id, email, full_name').in('id', userIds),
            supabase.from('products').select('id, name').in('id', productIds)
        ]);

        const usersMap = new Map(usersRes.data?.map((u: any) => [u.id, u]) || []);
        const productsMap = new Map(productsRes.data?.map((p: any) => [p.id, p]) || []);

        // 3. Enrich the goals
        const enrichedGoals = goals.map((g: any) => ({
            ...g,
            users: usersMap.get(g.user_id) || { email: 'Unknown', full_name: 'Unknown' },
            products: productsMap.get(g.product_id) || { name: 'Unknown' }
        }));

        return { success: true, data: enrichedGoals };
    } catch (error: any) {
        console.error('getGoalsAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getAgentsAction(token?: string) {
    const supabase = createServerClient(token);
    try {
        // Try to fetch supervisor_id as well. If it fails (column missing), it might throw.
        // To be safe, let's select simple columns first, or ideally check if we can select everything?
        // Let's assume supervisor_id might exist. 
        // ACTUALLY, if I select a non-existent column, PostgREST throws.
        // For now, I will NOT select supervisor_id to avoid breaking the app if the column is missing.
        // I will just return all agents and let the UI filter if possible (but without column I can't filter).
        // Wait, the user WANTS filtering.
        // I'll try to select '*, supervisor_id'. No 'id, email, full_name, role, supervisor_id'.
        // If it fails, I'll catch it and return basic data.

        const { data, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, supervisor_id') // speculative
            .order('full_name', { ascending: true });

        if (error) {
            // Fallback if supervisor_id is missing
            if (error.message.includes('supervisor_id')) {
                const { data: basicData, error: basicError } = await supabase
                    .from('users')
                    .select('id, email, full_name, role')
                    .order('full_name', { ascending: true });
                if (basicError) throw basicError;
                return { success: true, data: basicData };
            }
            throw error;
        }
        return { success: true, data };
    } catch (error: any) {
        console.error('getAgentsAction Error:', error);
        // Robust fallback
        return { success: false, error: error.message };
    }
}

export async function getSupervisorsAction(token?: string) {
    const supabase = createServerClient(token);
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('role', 'supervisor')
            .order('full_name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('getSupervisorsAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getProductsSimpleAction(token?: string) {
    const supabase = createServerClient(token);
    try {
        const { data, error } = await supabase
            .from('products')
            .select('id, name')
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('getProductsSimpleAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function saveGoalAction(goalData: any, token: string) {
    if (!token) return { success: false, error: 'No authenticated session' };
    const supabase = createServerClient(token);

    try {
        const { id, users, products, user_ids, ...data } = goalData; // user_ids for bulk
        let error;

        if (id) {
            // Update single
            const { error: updateError } = await supabase
                .from('goals')
                .update(data)
                .eq('id', id);
            error = updateError;
        } else {
            // Insert (Single or Bulk)
            if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
                // Bulk Insert
                const rows = user_ids.map(uid => ({
                    ...data,
                    user_id: uid
                }));
                const { error: insertError } = await supabase
                    .from('goals')
                    .insert(rows);
                error = insertError;
            } else {
                // Single Insert fallback
                const { error: insertError } = await supabase
                    .from('goals')
                    .insert([data]);
                error = insertError;
            }
        }

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('saveGoalAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteGoalAction(id: string, token: string) {
    if (!token) return { success: false, error: 'No authenticated session' };
    const supabase = createServerClient(token);

    try {
        const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error('deleteGoalAction Error:', error);
        return { success: false, error: error.message };
    }
}
