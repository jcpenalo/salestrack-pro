'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Loader2, Trash2 } from 'lucide-react';
import { clearSalesByDateAction } from '@/actions/saleActions';
import { supabase } from '@/lib/supabaseClient';

interface ClearDBModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ClearDBModal({ isOpen, onClose, onSuccess }: ClearDBModalProps) {
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [loading, setLoading] = useState(false);

    const handleClear = async () => {
        if (!confirm(`Are you sure you want to delete all sales from ${month}/${year}? This cannot be undone.`)) {
            return;
        }

        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await clearSalesByDateAction(session.access_token, year, month);

        if (res.success) {
            alert(`Succesfully deleted ${res.count} records.`);
            onSuccess();
            onClose();
        } else {
            alert('Error: ' + res.error);
        }
        setLoading(false);
    };

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = [
        { val: 1, name: 'January' }, { val: 2, name: 'February' }, { val: 3, name: 'March' },
        { val: 4, name: 'April' }, { val: 5, name: 'May' }, { val: 6, name: 'June' },
        { val: 7, name: 'July' }, { val: 8, name: 'August' }, { val: 9, name: 'September' },
        { val: 10, name: 'October' }, { val: 11, name: 'November' }, { val: 12, name: 'December' }
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Clear Database by Date">
            <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-sm text-amber-800">
                    <p className="font-bold mb-1">Warning: Destructive Action</p>
                    <p>This will permanently delete sales records for the selected period. Ensure you have a backup before proceeding.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full p-2 border rounded-md"
                        >
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Month</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="w-full p-2 border rounded-md"
                        >
                            {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-secondary/50">
                        Cancel
                    </button>
                    <button
                        onClick={handleClear}
                        disabled={loading}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        <Trash2 size={16} />
                        Clear Data
                    </button>
                </div>
            </div>
        </Modal>
    );
}
