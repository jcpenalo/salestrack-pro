'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { usePermissions } from '@/context/PermissionsContext';
import { PermissionsProvider } from '@/context/PermissionsContext';

function DebugContent() {
    const { user, profile, loading: contextLoading, permissions } = usePermissions();
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    // Auto-log Context State on Load
    useEffect(() => {
        addLog(`Context State: Loading=${contextLoading}`);
        if (!contextLoading) {
            addLog(`Context User: ${user?.email || 'NULL'}`);
            addLog(`Context Profile: ${profile ? JSON.stringify(profile) : 'NULL'}`);
            addLog(`Context Permissions: ${permissions.length} rules found`);
        }
    }, [contextLoading, user, profile, permissions]);

    // Existing state...

    const checkServerEnv = async () => {
        addLog('--- Checking SERVER Environment ---');
        try {
            const { debugEnvVars } = await import('@/actions/debugActions');
            const res = await debugEnvVars();
            if (res.success) {
                addLog(`✅ Environment Access OK`);
                addLog(`   Node Env: ${res.nodeEnv}`);
                addLog(`   Vercel Env: ${res.vercelEnv || 'N/A'}`);
                addLog(`   Is Edge: ${res.isEdge ? 'YES' : 'NO'}`);
                addLog(`   Supabase Keys Found: ${(res.visibleSupabaseKeys || []).join(', ')}`);

                if (res.hasServiceKey) {
                    addLog(`✅ Service Key is PRESENT (Length: ${res.serviceKeyLength})`);
                } else {
                    addLog(`❌ Service Key is MISSING!`);
                    addLog(`   Found keys: ${JSON.stringify(res.visibleSupabaseKeys || [])}`);
                }
            } else {
                addLog(`❌ Env Check Failed: ${res.error}`);
            }
        } catch (e: any) {
            addLog(`❌ Check Exception: ${e.message}`);
        }
    };

    const runDiagnostics = async () => {
        setLogs(prev => []); // Clear previous logs
        setStatus('testing');

        try {
            // Run Env Check First
            await checkServerEnv();

            addLog('Starting Client Diagnostics...');

            // 1. Check Auth Session
            addLog('1. Checking Raw Supabase Session...');
            const session = await supabase.auth.getSession();
            if (!session.data.session) {
                addLog('❌ No active session found in Supabase Auth.');
                // Don't throw, let's keep checking RLS
            } else {
                addLog(`✅ Session Active: ${session.data.session.user.email}`);
                addLog(`   ID: ${session.data.session.user.id}`);
            }

            // 2. Direct Profile Fetch (Bypassing Context)
            addLog('2. Testing Direct Profile Fetch...');
            if (session.data.session) {
                const uid = session.data.session.user.id;
                const { data: userRow, error: userError } = await supabase.from('users').select('*').eq('id', uid).single();

                if (userError) {
                    addLog(`❌ Profile Fetch Error: ${userError.message} (Code: ${userError.code})`);
                    addLog(`   Hint: Check RLS policies on 'public.users'.`);
                } else if (!userRow) {
                    addLog('❌ Profile Row is NULL (No error, but no data). User not in table?');
                } else {
                    addLog(`✅ Profile Found: Role=[${userRow.role}] Name=[${userRow.full_name}]`);
                }
            } else {
                addLog('   Skipping Profile Fetch (No Session)');
            }

            // 3. Test Read (Concepts) - Basic Connectivity
            addLog('3. Testing Generic DB Read...');
            const readRes = await supabase.from('concepts').select('count', { count: 'exact', head: true });
            if (readRes.error) {
                addLog(`❌ DB Connection Failed: ${readRes.error.message}`);
                throw readRes.error;
            }
            addLog(`✅ DB Connection OK. (Status: ${readRes.status})`);

            setStatus('success');
            addLog('--- DIAGNOSTICS COMPLETE ---');

        } catch (error: any) {
            console.error(error);
            addLog(`❌ CRITICAL ERROR: ${error.message || JSON.stringify(error)}`);
            setStatus('error');
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">🩺 Permissions & Connection Debugger</h1>

            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                <p><strong>Context Status:</strong> {contextLoading ? 'LOADING...' : 'READY'}</p>
                <p><strong>User:</strong> {user?.email || 'None'}</p>
                <p><strong>Role:</strong> {profile?.role || 'None'}</p>
            </div>

            <button
                onClick={runDiagnostics}
                disabled={status === 'testing'}
                className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-bold"
            >
                {status === 'testing' ? 'Running Tests...' : 'RUN DEEP DIAGNOSTICS'}
            </button>

            <div className="mt-8 p-4 bg-slate-900 text-green-400 rounded border border-slate-700 min-h-[400px] overflow-auto whitespace-pre-wrap font-mono">
                {logs.length === 0 ? (
                    <span className="text-slate-600">Logs will appear here...</span>
                ) : (
                    logs.map((log, i) => <div key={i} className="mb-1 border-b border-slate-800 pb-1 last:border-0">{log}</div>)
                )}
            </div>
        </div>
    );
}

export default function DebugPage() {
    return (
        <PermissionsProvider>
            <DebugContent />
        </PermissionsProvider>
    );
}
