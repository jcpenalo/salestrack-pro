'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';

type Status = {
    id: string;
    name: string;
    category: 'pending' | 'approved' | 'rejected' | 'installed';
    color: string;
    order_index: number;
};

const CATEGORIES = ['pending', 'approved', 'rejected', 'installed'];
const DEFAULT_COLORS = {
    pending: '#f59e0b',   // Amber
    approved: '#10b981',  // Emerald
    rejected: '#ef4444',  // Red
    installed: '#3b82f6'  // Blue
};

export function StatusesView() {
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState<Partial<Status>>({
        name: '',
        category: 'pending',
        color: '#f59e0b',
        order_index: 0
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchStatuses = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('statuses')
                .select('*')
                .order('order_index', { ascending: true }); // Order by index important for pipeline

            if (error) throw error;
            setStatuses(data || []);
        } catch (error) {
            console.error('Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatuses();
    }, [fetchStatuses]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            name: '',
            category: 'pending',
            color: DEFAULT_COLORS['pending'],
            order_index: statuses.length + 1 // Auto-increment order
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (status: Status) => {
        setEditingId(status.id);
        setFormData({
            name: status.name,
            category: status.category,
            color: status.color,
            order_index: status.order_index
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name?.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('statuses')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('statuses')
                    .insert([formData]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchStatuses();
        } catch (error: any) {
            console.error('Save error:', error);
            alert('Error saving status: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this status?')) return;
        try {
            const { error } = await supabase
                .from('statuses')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchStatuses();
        } catch (error: any) {
            alert('Error deleting status: ' + error.message);
        }
    };

    // Auto-set color when category changes if user hasn't vastly customized it (optional UX polish)
    const handleCategoryChange = (cat: string) => {
        setFormData(prev => ({
            ...prev,
            category: cat as any,
            color: DEFAULT_COLORS[cat as keyof typeof DEFAULT_COLORS] || prev.color
        }));
    };

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Pipeline Statuses</h3>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Status
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : statuses.length === 0 ? (
                <div className="text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No statuses configured.
                </div>
            ) : (
                <div className="space-y-2">
                    {statuses.map((status) => (
                        <div key={status.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-4">
                                {/* Color Dot */}
                                <div
                                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                                    style={{ backgroundColor: status.color }}
                                />
                                <span className="font-medium text-lg">{status.name}</span>
                                <span className="text-xs text-muted-foreground uppercase tracking-widest border border-border px-2 py-0.5 rounded">
                                    {status.category}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground mr-4">Order: {status.order_index}</span>
                                <button onClick={() => handleOpenEdit(status)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(status.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Status" : "Create Status"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1 block">Status Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                                placeholder="e.g., Installation Scheduled"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all appearance-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Color</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="h-10 w-20 p-1 bg-background border border-border rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1 block">Sort Order</label>
                            <input
                                type="number"
                                value={formData.order_index}
                                onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first in the pipeline.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting || !formData.name?.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
