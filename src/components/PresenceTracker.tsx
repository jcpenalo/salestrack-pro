'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function PresenceTracker() {
    useEffect(() => {
        const trackPresence = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const channel = supabase.channel('online_users', {
                config: {
                    presence: {
                        key: user.id,
                    },
                },
            });

            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        online_at: new Date().toISOString(),
                        user_id: user.id,
                    });
                }
            });

            return () => {
                supabase.removeChannel(channel);
            };
        };

        trackPresence();
    }, []);

    return null; // Invisible component
}
