'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { createClient } from '@supabase/supabase-js'; // Import createClient directly
import { supabase } from '@/lib/supabaseClient'; // Standard import
import { Modal } from '@/components/ui/Modal';

type Concept = {
    id: string;
    name: string;
    type: 'sale' | 'rejection' | 'cancellation';
    active: boolean;
};

export function ConceptsView() {
    const [concepts, setConcepts] = useState<Concept[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Exact same structure as StatusesView
    const [formData, setFormData] = useState({
        name: '',
        type: 'sale' as 'sale' | 'rejection' | 'cancellation'
    });

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchConcepts = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('concepts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setConcepts(data || []);
        } catch (error) {
            console.error('Error fetching concepts:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConcepts();
    }, [fetchConcepts]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ name: '', type: 'sale' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (concept: Concept) => {
        setEditingId(concept.id);
        setFormData({ name: concept.name, type: concept.type });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            // Force a FRESH connection for this specific request
            // 1. Get current valid session token
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            if (!accessToken) throw new Error('No active session');

            // 2. Create client WITH auth headers
            const localClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    global: {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        }
                    },
                    auth: {
                        persistSession: false // Still keep it clean locally
                    }
                }
            );

            // Explicit payload construction
            const payload = {
                name: formData.name,
                type: 'sale',
                active: true
            };

            if (editingId) {
                const { error } = await localClient
                    .from('concepts')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await localClient
                    .from('concepts')
                    .insert([payload]);
                if (error) throw error;
            }

            // Success path
            alert('Concept saved successfully!');
            window.location.reload();
            // setIsModalOpen(false); // Reload handles this
            // fetchConcepts();

        } catch (error: any) {
            console.error('Save error:', error);
            alert('Error saving concept: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this concept?')) return;
        try {
            const { error } = await supabase.from('concepts').delete().eq('id', id);
            if (error) throw error;
            fetchConcepts();
        } catch (error: any) {
            alert('Error deleting concept: ' + error.message);
        }
    };

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Concepts Management</h3>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Concept
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : concepts.length === 0 ? (
                <div className="text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No concepts found.
                </div>
            ) : (
                <div className="space-y-2">
                    {concepts.map((concept) => (
                        <div key={concept.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <span className="font-medium">{concept.name}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleOpenEdit(concept)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(concept.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
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
                title={editingId ? "Edit Concept" : "Create Concept"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Concept Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                            placeholder="e.g., Sale (Fiber)"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting || !formData.name.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
