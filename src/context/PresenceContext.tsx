'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserProfile } from '@/hooks/useUserProfile';

interface PresenceContextType {
    onlineUserIds: Set<string>;
}

const PresenceContext = createContext<PresenceContextType>({ onlineUserIds: new Set() });

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const { profile } = useUserProfile();
    const userId = profile?.id;

    useEffect(() => {
        if (!userId) return;

        // Create a single channel with the necessary configuration
        const channel = supabase.channel('online_users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const ids = new Set<string>();
                for (const key in newState) {
                    newState[key].forEach((payload: any) => {
                        if (payload.user_id) ids.add(payload.user_id);
                    });
                }
                setOnlineUserIds(ids);
            })
            .subscribe(async (status) => {
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

    const value = useMemo(() => ({ onlineUserIds }), [onlineUserIds]);

    return (
        <PresenceContext.Provider value={value}>
            {children}
        </PresenceContext.Provider>
    );
}

export const usePresence = () => useContext(PresenceContext);
