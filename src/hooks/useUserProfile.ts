import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

export type UserProfile = {
    id: string;
    email: string;
    full_name: string;
    role: 'creator' | 'admin' | 'supervisor' | 'representative' | 'seguimiento' | 'digitacion';
    avatar_url?: string;
    is_active?: boolean;
    skills?: any[]; // JSON array
};

export function useUserProfile() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);

                if (user) {
                    const { data } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (data) {
                        setProfile(data as UserProfile);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setUser(session.user);
                // Fetch profile again
                const { data } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                if (data) setProfile(data as UserProfile);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    return { user, profile, loading };
}
