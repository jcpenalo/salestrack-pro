'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { usePermission } from '@/hooks/usePermission';

export default function AgentStatusToggle() {
    const [status, setStatus] = useState<'active' | 'inactive' | 'loading'>('loading');
    const { isAllowed, loading: permLoading } = usePermission('feature:user_status_toggle');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('users')
                .select('is_active')
                .eq('id', user.id)
                .single();
            setStatus(data?.is_active ? 'active' : 'inactive');
        }
    };

    const toggleStatus = async () => {
        const newStatus = status === 'active' ? false : true; // Toggle
        setStatus('loading');

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase
                .from('users')
                .update({ is_active: newStatus })
                .eq('id', user.id);

            setStatus(newStatus ? 'active' : 'inactive');
        }
    };

    if (permLoading || status === 'loading') {
        return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }

    if (!isAllowed) return null;

    return (
        <button
            onClick={toggleStatus}
            className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm",
                status === 'active'
                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
            )}
            title={status === 'active' ? "You are Online" : "You are Offline"}
        >
            <div className={clsx("w-2 h-2 rounded-full",
                status === 'active' ? "bg-green-600" : "bg-gray-400"
            )} />
            {status === 'active' ? "Online" : "Away"}
        </button>
    );
}
