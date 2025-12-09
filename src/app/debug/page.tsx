'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DebugPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const runDiagnostics = async () => {
        setLogs([]);
        setStatus('testing');
        addLog('Starting diagnostics...');

        try {
            // 1. Check Auth Session
            addLog('1. Checking Session...');
            const session = await supabase.auth.getSession();
            if (!session.data.session) throw new Error('No active session. Please login first.');
            addLog(`   User: ${session.data.session.user.email}`);

            // 2. Test Read (Concepts)
            addLog('2. Testing Read (Concepts)...');
            const startRead = performance.now();
            const readRes = await supabase.from('concepts').select('count', { count: 'exact', head: true });
            const readTime = performance.now() - startRead;
            if (readRes.error) throw readRes.error;
            addLog(`   Success! Read took ${readTime.toFixed(2)}ms`);

            // 3. Test Write (Concepts)
            addLog('3. Testing Write (Concepts)...');
            const startWrite = performance.now();
            const dummyName = `Debug Test ${Date.now()}`;
            const writeRes = await supabase.from('concepts').insert([{ name: dummyName, type: 'sale', active: true }]).select();
            const writeTime = performance.now() - startWrite;

            if (writeRes.error) throw writeRes.error;

            const newId = writeRes.data?.[0]?.id;
            addLog(`   Success! Write took ${writeTime.toFixed(2)}ms. ID: ${newId}`);

            // 4. Test Delete (Cleanup)
            addLog('4. Cleaning up...');
            if (newId) {
                await supabase.from('concepts').delete().eq('id', newId);
                addLog('   Cleanup successful.');
            }

            setStatus('success');
            addLog('✅ ALL SYSTEMS OPERATIONAL');

        } catch (error: any) {
            console.error(error);
            addLog(`❌ ERROR: ${error.message || JSON.stringify(error)}`);
            setStatus('error');
        }
    };

    return (
        <div className="p-10 max-w-2xl mx-auto font-mono">
            <h1 className="text-2xl font-bold mb-4">Supabase Connection Debugger</h1>

            <button
                onClick={runDiagnostics}
                disabled={status === 'testing'}
                className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
                {status === 'testing' ? 'Running Tests...' : 'Run Diagnostics'}
            </button>

            <div className="mt-8 p-4 bg-gray-100 rounded border border-gray-300 min-h-[300px]">
                {logs.length === 0 ? (
                    <span className="text-gray-400">Logs will appear here...</span>
                ) : (
                    logs.map((log, i) => <div key={i} className="mb-1 border-b border-gray-200 pb-1 last:border-0">{log}</div>)
                )}
            </div>
        </div>
    );
}
