import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/context/PermissionsContext';

export function useRequireAccess(resourceKey: string) {
    const { profile, loading, hasPermission } = usePermissions();
    const router = useRouter();
    const [accessChecked, setAccessChecked] = useState(false);

    useEffect(() => {
        if (loading) return;

        if (!profile) {
            router.push('/login');
            return;
        }

        const allowed = hasPermission(resourceKey);

        if (!allowed) {
            router.push('/dashboard/access-denied');
        } else {
            setAccessChecked(true);
        }

    }, [loading, profile, resourceKey, router, hasPermission]);

    // Return current allowed state.
    // If loading, hasAccess is false-ish or null. 
    // We can infer hasAccess from hasPermission result immediately if not loading.
    const hasAccess = !loading && profile ? hasPermission(resourceKey) : false;

    return { hasAccess, loading, profile };
}
