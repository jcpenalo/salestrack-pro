'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function saveProductAction(productData: any, token: string) {
    if (!token) {
        return { success: false, error: 'No authenticated session' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        },
        auth: {
            persistSession: false
        }
    });

    try {
        const { id, ...data } = productData;
        let error;

        if (id) {
            // Update
            const result = await supabase
                .from('products')
                .update(data)
                .eq('id', id);
            error = result.error;
        } else {
            // Insert
            const result = await supabase
                .from('products')
                .insert([data]);
            error = result.error;
        }

        if (error) throw error;
        return { success: true };

    } catch (error: any) {
        console.error('Server Action Error:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteProductAction(id: string, token: string) {
    if (!token) {
        return { success: false, error: 'No authenticated session' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        },
        auth: {
            persistSession: false
        }
    });

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };

    } catch (error: any) {
        console.error('Server Action Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getConceptsAction(token?: string) {
    // If token is provided, use it. If not, use anon key (works if public read is allowed)
    // For now, we try to use the token if passed, but fallback to anon client for robustness

    const options: any = {
        auth: {
            persistSession: false
        }
    };

    if (token) {
        options.global = {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    }

    const supabase = createClient(supabaseUrl, supabaseKey, options);

    try {
        const { data, error } = await supabase
            .from('concepts')
            .select('name')
            .eq('active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        console.error('getConceptsAction Error:', error);
        return { success: false, error: error.message };
    }
}
