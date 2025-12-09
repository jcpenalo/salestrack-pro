'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function PresenceTracker({ userId }: { userId: string }) {
    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel('online_users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId,
                });
            }
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return null; // Invisible component
}
