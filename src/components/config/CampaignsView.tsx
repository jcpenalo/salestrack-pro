'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, Pencil, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';

type Campaign = {
    id: string;
    code: string;
    name: string;
    active: boolean;
    created_at: string;
};

export function CampaignsView() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ code: '', name: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCampaigns = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ code: '', name: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (campaign: Campaign) => {
        setEditingId(campaign.id);
        setFormData({ code: campaign.code, name: campaign.name });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code.trim() || !formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('campaigns')
                    .update({
                        code: formData.code,
                        name: formData.name
                    })
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('campaigns')
                    .insert([{
                        code: formData.code,
                        name: formData.name
                    }]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            fetchCampaigns();
        } catch (error: any) {
            alert('Error saving campaign: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this campaign?')) return;

        try {
            const { error } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCampaigns();
        } catch (error: any) {
            alert('Error deleting campaign: ' + error.message);
        }
    };

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Campaigns Management</h3>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Campaign
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No campaigns configured yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {campaigns.map((campaign) => (
                        <div key={campaign.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border group hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">{campaign.code}</span>
                                <span className="font-medium">{campaign.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full mr-2 ${campaign.active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500'}`}>
                                    {campaign.active ? 'Active' : 'Inactive'}
                                </span>

                                <button
                                    onClick={() => handleOpenEdit(campaign)}
                                    className="p-2 text-muted-foreground hover:text-primary transition-colors"
                                    title="Edit"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(campaign.id)}
                                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete"
                                >
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
                title={editingId ? "Edit Campaign" : "Create New Campaign"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Campaign Code</label>
                        <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            placeholder="e.g., CAMP-001"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50"
                        // Disable code editing if needed, generally codes are immutable or handle with care. Allowing edit for now.
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Campaign Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Black Friday 2024"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.code.trim() || !formData.name.trim()}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Create Campaign')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
