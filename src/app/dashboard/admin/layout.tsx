'use client';

import { useRequireAccess } from '@/hooks/useRequireAccess';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { hasAccess, loading } = useRequireAccess('tab:admin_dashboard');

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasAccess) {
        return null; // useRequireAccess handles redirect
    }

    return <>{children}</>;
}
