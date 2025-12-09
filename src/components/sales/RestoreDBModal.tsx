'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { restoreSalesAction } from '@/actions/saleActions';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';

interface RestoreDBModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function RestoreDBModal({ isOpen, onClose, onSuccess }: RestoreDBModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const handleRestore = async () => {
        if (!file) {
            setError('Please select a backup file');
            return;
        }

        if (!confirm('CRITICAL WARNING: This will DELETE ALL CURRENT DATA and replace it with the backup. Are you sure?')) return;

        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = e.target?.result as string;
                const data = JSON.parse(jsonContent);

                if (!Array.isArray(data)) {
                    throw new Error('Invalid backup format: root must be an array');
                }

                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    throw new Error('No session');
                }

                const res = await restoreSalesAction(session.access_token, data);

                if (res.success) {
                    alert(`Database restored successfully. ${res.count} records inserted.`);
                    onSuccess();
                    onClose();
                } else {
                    setError('Restore failed: ' + res.error);
                }
            } catch (err: any) {
                setError('Error processing file: ' + err.message);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Restore Database">
            <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <strong>Warning:</strong> This action is destructive. All current sales data will be wiped and replaced with the contents of the uploaded backup file.
                    </div>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-600">
                        {file ? file.name : "Click to Upload JSON Backup"}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">.json files only</span>
                </div>

                {error && (
                    <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 border rounded hover:bg-gray-100 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRestore}
                        disabled={loading || !file}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Restore Data
                    </button>
                </div>
            </div>
        </Modal>
    );
}
