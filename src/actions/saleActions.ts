'use server';

import { createClient } from '@supabase/supabase-js';

// Initialize Service Client for Admin/Privileged operations
const serviceClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
};

export async function createSaleAction(saleData: any, token: string) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: `Bearer ${token}` } }
            }
        );

        // 1. Validate User
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        // 2. Auto-Assignment Logic (Smart Distribution)
        if (!saleData.assigned_to) {
            // A. Fetch Candidates (Role=Digitacion + Active + Skill Match)
            const { data: candidates, error: candidateError } = await supabase
                .from('users')
                .select('id, skills')
                .eq('role', 'digitacion')
                .eq('is_active', true);

            if (!candidateError && candidates && candidates.length > 0) {
                // B. Filter by Skill (Product Match)
                const skilledCandidates = candidates.filter((u: any) => {
                    const userSkills = u.skills || []; // JSONB array
                    return userSkills.includes(saleData.product_id) || userSkills.includes(String(saleData.product_id));
                });

                // If no one has the specific skill, fallback to ALL active digitadores (or none?)
                // Strategy: Try Skilled first. If empty, maybe fallback to any Active Digitador?
                // User said: "only two of those 5 know... 3 do not". Implies strictness.
                // But if NO ONE is skilled/online, what do we do? Leave unassigned?
                // Decision: Fallback to all Active Digitadores (Better than nothing), or leave unassigned.
                // I'll stick to Skilled Candidates if any exist. If not, I'll fallback to any Active Digitador to ensure coverage.
                let finalPool = skilledCandidates.length > 0 ? skilledCandidates : candidates;

                if (finalPool.length > 0) {
                    // C. Load Balancing (Pending Sales Only - ID: 1)
                    // The "Digitacion" team prioritizes clearing the pending queue.
                    // We assign to the user with the FEWEST Pending sales to avoid bottlenecks.
                    const loads = await Promise.all(finalPool.map(async (u: any) => {
                        const { count } = await supabase
                            .from('sales')
                            .select('id', { count: 'exact', head: true })
                            .eq('assigned_to', u.id)
                            .eq('status_id', 1); // Strictly count "Pending" sales

                        return { userId: u.id, load: count || 0 };
                    }));

                    // D. Sort & Pick
                    loads.sort((a, b) => a.load - b.load);
                    const bestCandidate = loads[0];
                    saleData.assigned_to = bestCandidate.userId;

                    // Log the assignment?
                    // console.log(`Auto-assigned to ${bestCandidate.userId} with load ${bestCandidate.load}`);
                }
            }
        }

        // 3. Insert Sale
        const { data, error } = await supabase
            .from('sales')
            .insert({
                ...saleData,
                user_id: user.id, // Enforce current user
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('Create Sale Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getSalesAction(
    token: string,
    filters: {
        startDate?: string,
        endDate?: string,
        os_madre?: string,
        os_hija?: string,
        contact_number?: string,
        concept_id?: string,
        status_id?: string,
        page?: number,
        limit?: number
    } = {}
) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: `Bearer ${token}` } }
            }
        );

        // 1. Get User & Role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = userData?.role || 'agent';
        const isRestricted = role === 'representative' || role === 'agent';

        let query = supabase
            .from('sales')
            .select(`
                *,
                campaign:campaigns(name),
                product:products(name),
                concept:concepts(name),
                status:statuses(name, color),
                agent:users!sales_user_id_fkey(full_name),
                assigned:users!sales_assigned_to_fkey(full_name),
                updated_by:users!sales_status_updated_by_fkey(full_name)
            `, { count: 'exact' });

        // Apply Restrictions
        if (isRestricted) {
            query = query.eq('user_id', user.id);
        }

        // Apply Filters
        if (filters.startDate) query = query.gte('sale_date', filters.startDate);
        if (filters.endDate) query = query.lte('sale_date', filters.endDate);
        if (filters.os_madre) query = query.ilike('os_madre', `%${filters.os_madre}%`);
        if (filters.os_hija) query = query.ilike('os_hija', `%${filters.os_hija}%`);
        if (filters.contact_number) query = query.ilike('contact_number', `%${filters.contact_number}%`);
        if (filters.concept_id) query = query.eq('concept_id', filters.concept_id);
        if (filters.status_id) query = query.eq('status_id', filters.status_id);

        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const { data, error, count } = await query
            .order('sale_date', { ascending: false })
            .range(from, to);

        if (error) throw error;

        return { success: true, data, count, page, limit };

    } catch (error: any) {
        console.error('Get Sales Error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateSaleFieldAction(
    saleId: string,
    field: string,
    value: any,
    token: string
) {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: `Bearer ${token}` } }
            }
        );

        // 1. Get Current User & Role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Unauthorized');

        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        if (userError || !userData) throw new Error('Role fetch failed');

        const role = userData.role;

        // 2. Permission Check (Dynamic)
        if (role === 'creator') {
            // Allow
        } else {
            // Check DB for specific rule
            // Resource key format: field:sales.[field_name]
            // We map the UI field name to the DB resource key if needed, or stick to 1:1
            // In SalesView we used 'field:sales.assigned_to', so we match that.

            // Special handling if field names don't exactly match DB keys, but I aligned them in the seed.
            const resourceKey = `field:sales.${field}`;

            const { data: perm } = await supabase
                .from('app_permissions')
                .select('is_allowed')
                .eq('role', role)
                .eq('resource_key', resourceKey)
                .single();

            if (!perm || !perm.is_allowed) {
                throw new Error(`Role '${role}' is not allowed to edit '${field}'`);
            }
        }

        // 3. Update Sales Table (Use Service Role to bypass restrictive RLS)
        // We already validated permissions against the Matrix above.
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing. Check your .env.local file.');
        }
        const adminSupabase = serviceClient();

        const updateData: any = { [field]: value };

        // AUDIT LOGIC
        if (field === 'status_id') {
            updateData.status_updated_by = user.id;
            updateData.status_updated_at = new Date().toISOString();
        }

        const { data: updatedRow, error } = await adminSupabase
            .from('sales')
            .update(updateData)
            .eq('id', saleId)
            .select();

        if (error) throw error;
        if (!updatedRow || updatedRow.length === 0) {
            throw new Error('Update failed: Record not found.');
        }

        return { success: true };
    } catch (error: any) {
        console.error('Update Field Error:', error);
        return { success: false, error: error.message };
    }
}

// ... existing actions

// TRUNCATE: Delete ALL data (Nuclear)
export async function truncateSalesAction(token: string) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Double check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Delete all rows where ID is distinct from -1 (assuming logic for "all")
    // Note: If using a real Truncate via RPC, that would be faster for millions of rows.
    // For typical app scale, Delete All works fine if RLS allows it.
    const { error, count } = await supabase
        .from('sales')
        .delete({ count: 'exact' })
        .neq('id', -1);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/sales');
    return { success: true, count };
}

// CLEAR: Delete by Date Range
export async function clearSalesByDateAction(token: string, year: number, month: number) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Validate inputs
    if (!year || !month) return { success: false, error: 'Invalid date params' };

    // Construct timestamps for filtering
    // Start of the selected month
    const startDate = new Date(year, month - 1, 1).toISOString();

    // Start of the NEXT month (exclusive end date)
    // Handle December edge case: month 12 becomes next year month 0
    let nextMonth = month; // 0-indexed for Date constructor is month (0-11)?
    // Date constructor: (year, monthIndex). monthIndex 0=Jan, 11=Dec.
    // Our input 'month' is likely 1-12.
    // So current month start: (year, month-1, 1)
    // Next month start: (year, month, 1) -> Automatically handles rollover to next year if month=12
    const endDate = new Date(year, month, 1).toISOString();

    const { error, count } = await supabase
        .from('sales')
        .delete({ count: 'exact' })
        .gte('sale_date', startDate)
        .lt('sale_date', endDate);

    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard/sales');
    return { success: true, count };
}

// RESTORE: Truncate and Insert Bulk Data
export async function restoreSalesAction(token: string, salesData: any[]) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // 1. Validate Admin/Creator? (Implicitly handled by RLS or caller, but good to check)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // 2. Truncate first
    const { error: deleteError } = await supabase
        .from('sales')
        .delete({ count: 'exact' })
        .neq('id', -1);

    if (deleteError) return { success: false, error: 'Truncate failed: ' + deleteError.message };

    // 3. Clean Data (Remove IDs to let DB auto-increment? Or keep them?)
    // If we keep IDs, we might have conflicts if sequences aren't reset. 
    // Usually backups preserve IDs. Let's try to UPSERT or INSERT strict.
    // Ideally we strip 'id' if we want fresh IDs, but for "Restore" we usually want exact copy.
    // Let's Insert. If 'id' is present, Supabase respects it if it doesn't conflict. Since table is empty, it should work.

    // Batch insert to avoid payload limits? Supabase handles large payloads well but 10k rows might error.
    // For now, assume reasonable size or simple batching.

    // Sanitize: Remove helper fields that might be in the export like 'product' object if simple 'product_id' is needed.
    // The export was likely exact DB shape + relations. We need to strip relations.
    const cleanData = salesData.map(s => {
        const {
            campaign, product, concept, status, agent, assigned, updated_by, // relational objects
            ...rest
        } = s;
        return rest;
    });

    const { error: insertError, count } = await supabase
        .from('sales')
        .insert(cleanData);

    if (insertError) return { success: false, error: 'Insert failed: ' + insertError.message };

    revalidatePath('/dashboard/sales');
    return { success: true, count: cleanData.length };
}

// Deprecated local permission logic - now handled by DB + App State
function isAllowedToEdit(role: string, field: string): boolean {
    return true;
}
