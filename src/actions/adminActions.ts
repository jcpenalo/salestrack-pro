'use server';

import { createClient } from '@supabase/supabase-js';

// Initialize Service Role Client (PRIVILEGED ACCESS - SERVER ONLY)
const serviceClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url) {
        throw new Error('Server Error: Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    if (!key) {
        throw new Error('Server Error: Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Check Vercel Settings.');
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

export async function createUserAction(data: any) {
    try {
        const supabase = serviceClient();

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true, // Auto-confirm
            user_metadata: {
                full_name: data.full_name
            }
        });

        if (authError) {
            console.error('Auth Creation Error:', authError);
            return { success: false, error: authError.message };
        }

        if (!authData.user) {
            return { success: false, error: 'User creation failed without error' };
        }

        // 2. Insert/Update into public.users
        // We use Upsert to handle cases where a Trigger might have already created the row
        // or if we need to force the Role immediately.
        const { error: dbError } = await supabase
            .from('users')
            .upsert({
                id: authData.user.id,
                email: data.email,
                full_name: data.full_name,
                role: data.role || 'agent',
                status: 'active',
                // created_at: new Date().toISOString() // Removed to avoid schema error
            });

        if (dbError) {
            console.error('DB Insert Error:', dbError);
            // Optional: Delete auth user if DB fails to maintain consistency?
            // For now, return error but user exists in Auth.
            return { success: false, error: 'User created in Auth but failed in DB: ' + dbError.message };
        }

        return { success: true, data: authData.user };

    } catch (error: any) {
        console.error('Create User Action Exception:', error);
        return { success: false, error: error.message };
    }
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
    try {
        const supabase = serviceClient();

        const { data, error } = await supabase.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('Reset Password Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getAdminUsersAction() {
    try {
        const supabase = serviceClient();

        // 1. Fetch Auth Users (with pagination loop if needed, but assuming < 50 for now)
        // Note: listUsers defaults to 50 users. For production, needs recursion.
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers({
            perPage: 1000
        });

        if (authError) throw authError;

        // 2. Fetch Public Profiles
        const { data: publicUsers, error: dbError } = await supabase
            .from('users')
            .select('*')
            .order('email', { ascending: true });

        if (dbError) throw dbError;

        // 3. Merge Data
        const mergedUsers = publicUsers.map((user: any) => {
            // Try matching by ID first, then Email as fallback
            const authUser = authUsers.find(u => u.id === user.id) || authUsers.find(u => u.email === user.email);

            // Logic: User is confirmed if Auth says so, OR if they are the Creator (Hardcoded safety)
            const isConfirmed = !!authUser?.email_confirmed_at || user.role === 'creator';

            return {
                ...user,
                email_confirmed_at: authUser?.email_confirmed_at || null,
                last_sign_in_at: authUser?.last_sign_in_at || null,
                is_confirmed: isConfirmed
            };
        });

        return { success: true, data: mergedUsers };

    } catch (error: any) {
        console.error('getAdminUsersAction Error:', error);
        return { success: false, error: error.message };
    }
}

export async function confirmUserEmailAction(userId: string) {
    try {
        const supabase = serviceClient();

        const { data, error } = await supabase.auth.admin.updateUserById(
            userId,
            { email_confirm: true }
        );

        if (error) throw error;

        return { success: true, data };
    } catch (error: any) {
        console.error('Confirm Email Error:', error);
        return { success: false, error: error.message };
    }
}
