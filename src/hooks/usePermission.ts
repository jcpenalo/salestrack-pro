'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserProfile } from './useUserProfile';

export function usePermission(resourceKey: string) {
    const { profile, loading: profileLoading } = useUserProfile();
    const [isAllowed, setIsAllowed] = useState<boolean>(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const check = async () => {
            if (profileLoading) return;
            if (!profile) {
                setIsAllowed(false);
                setChecking(false);
                return;
            }

            if (profile.role === 'creator') {
                setIsAllowed(true);
                setChecking(false);
                return;
            }

            const { data } = await supabase
                .from('app_permissions')
                .select('is_allowed')
                .eq('role', profile.role)
                .eq('resource_key', resourceKey)
                .single();

            setIsAllowed(data?.is_allowed || false);
            setChecking(false);
        };

        check();
    }, [profile, profileLoading, resourceKey]);

    return { isAllowed, loading: checking };
}
