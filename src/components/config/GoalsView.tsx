'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { getGoalsAction, getAgentsAction, getProductsSimpleAction, saveGoalAction, deleteGoalAction } from '@/actions/goalActions';

type Goal = {
    id: string;
    user_id: string;
    product_id: string;
    month: number;
    year: number;
    monthly_target: number;
    individual_target: number;
    daily_target: number;
    // Joins
    users?: { email: string; full_name: string };
    products?: { name: string };
};

type UserOption = { id: string; email: string; full_name: string; supervisor_id?: string };
type ProductOption = { id: string; name: string };

export function GoalsView() {
    // 1. State Declarations
    const [goals, setGoals] = useState<Goal[]>([]);
    const [users, setUsers] = useState<UserOption[]>([]);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [supervisors, setSupervisors] = useState<UserOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Filter State
    const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');

    // Form Data
    const today = new Date();
    const [formData, setFormData] = useState({
        user_id: [] as string | string[],
        product_id: '',
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        monthly_target: 0, // Maps to 'monthly_target' (Individual) in DB
        daily_target: 1,
        individual_target: 0 // Unused in UI, kept for type compatibility
    });

    // 2. Data Fetching
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            console.log('Fetching Goals Data...');
            // Dynamic import for supervisors if not standard, or just use Promise.all
            // We assume getSupervisorsAction is exported from goalActions
            const { getSupervisorsAction } = await import('@/actions/goalActions');

            const [goalsRes, usersRes, productsRes, supervisorsRes] = await Promise.all([
                getGoalsAction(),
                getAgentsAction(),
                getProductsSimpleAction(),
                getSupervisorsAction ? getSupervisorsAction() : { success: false, data: [] }
            ]);

            if (!goalsRes.success) throw new Error(goalsRes.error || 'Failed to fetch goals');
            if (!usersRes.success) throw new Error(usersRes.error || 'Failed to fetch agents');
            if (!productsRes.success) throw new Error(productsRes.error || 'Failed to fetch products');

            setGoals(goalsRes.data || []);
            setUsers(usersRes.data || []);
            setProducts(productsRes.data || []);
            if (supervisorsRes && supervisorsRes.success) setSupervisors(supervisorsRes.data || []);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);


    // 3. Handlers
    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            user_id: [],
            product_id: products[0]?.id || '',
            month: today.getMonth() + 1,
            year: today.getFullYear(),
            monthly_target: 100,
            individual_target: 0,
            daily_target: 1
        });
        setSelectedSupervisor('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (goal: Goal) => {
        setEditingId(goal.id);
        setFormData({
            user_id: goal.user_id, // Single ID for edit
            product_id: goal.product_id,
            month: goal.month,
            year: goal.year,
            monthly_target: goal.monthly_target,
            individual_target: goal.individual_target,
            daily_target: goal.daily_target
        });
        setIsModalOpen(true);
    };

    const getAuthToken = async () => {
        // Robust Token Scanning (Fast Path)
        let token = null;
        let debugKeys: string[] = [];

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) debugKeys.push(key);
                if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
                    const val = localStorage.getItem(key);
                    if (val) {
                        try {
                            const parsed = JSON.parse(val);
                            if (parsed.access_token) {
                                token = parsed.access_token;
                                break;
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }
        } catch (e) { }

        if (!token) {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Auth check timed out (Network)')), 5000)
            );
            try {
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
                token = session?.access_token;
            } catch (e) { }
        }
        return { token, debugKeys };
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { token, debugKeys } = await getAuthToken();
            if (!token) throw new Error(`Authentication failed.`);

            // Payload prep
            let payload: any = { ...formData, id: editingId };

            // Map the UI "Monthly Target" (which is essentially individual) -> DB monthly_target
            // DB has: monthly_target, individual_target.
            // User wants: "Monthly Target (per Agent)" input to be the main value.
            // We'll save it to `monthly_target`. `individual_target` is now redundant/legacy.

            // Handle Bulk User IDs
            if (!editingId && Array.isArray(formData.user_id)) {
                payload.user_ids = formData.user_id;
                delete payload.user_id;
            } else if (editingId && Array.isArray(formData.user_id)) {
                payload.user_id = formData.user_id[0];
            }

            const result = await saveGoalAction(payload, token);
            if (!result.success) throw new Error(result.error);

            alert('Goal(s) saved successfully!');
            window.location.reload();
        } catch (error: any) {
            console.error('Save error:', error);
            alert('Error saving goal: ' + error.message);
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            const { token } = await getAuthToken();
            if (!token) throw new Error(`Authentication failed.`);
            const result = await deleteGoalAction(id, token);
            if (!result.success) throw new Error(result.error);
            fetchData();
        } catch (error: any) {
            alert('Error deleting goal: ' + error.message);
        }
    };

    // Filter Logic
    const filteredUsers = selectedSupervisor
        ? users.filter((u: any) => u.supervisor_id === selectedSupervisor)
        : users;

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Sales Goals (Monthly)</h3>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Goal
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : goals.length === 0 ? (
                <div className="text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No goals defined yet.
                </div>
            ) : (
                <div className="space-y-2">
                    {goals.map((goal) => (
                        <div key={goal.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Agent</span>
                                    <span className="font-medium">{goal.users?.full_name || goal.users?.email || 'Unknown'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Product</span>
                                    <span className="font-medium">{goal.products?.name || 'Unknown'}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Period</span>
                                    <span className="font-medium">{goal.month}/{goal.year}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Targets</span>
                                    <span className="font-medium font-mono text-sm">
                                        M: {goal.monthly_target} / D: {goal.daily_target}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button onClick={() => handleOpenEdit(goal)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(goal.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
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
                title={editingId ? "Edit Goal" : "Set New Goal"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">

                        {/* Supervisor Filter (Only for New) */}
                        {!editingId && (
                            <div className="col-span-2">
                                <label className="text-sm font-medium mb-1 block">Filter by Supervisor</label>
                                <select
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none"
                                    value={selectedSupervisor}
                                    onChange={(e) => setSelectedSupervisor(e.target.value)}
                                >
                                    <option value="">All Agents</option>
                                    {supervisors.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Agents (Multi) */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-sm font-medium mb-1 block">Agents (Select Multiple)</label>
                            <div className="border border-border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                                <label className="flex items-center gap-2 p-1 hover:bg-secondary/50 rounded cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!editingId && filteredUsers.length > 0 && Array.isArray(formData.user_id) && formData.user_id.length === filteredUsers.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setFormData({ ...formData, user_id: filteredUsers.map(u => u.id) });
                                            else setFormData({ ...formData, user_id: [] });
                                        }}
                                        className="rounded border-gray-300"
                                        disabled={!!editingId}
                                    />
                                    <span className="text-sm font-semibold">Select All ({filteredUsers.length})</span>
                                </label>
                                {filteredUsers.map((u) => (
                                    <label key={u.id} className="flex items-center gap-2 p-1 hover:bg-secondary/50 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            value={u.id}
                                            checked={Array.isArray(formData.user_id) ? formData.user_id.includes(u.id) : formData.user_id === u.id}
                                            onChange={(e) => {
                                                if (editingId) return; // Edit mode single user
                                                const currentIds = Array.isArray(formData.user_id) ? formData.user_id : (formData.user_id ? [formData.user_id] : []);
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, user_id: [...currentIds, u.id] });
                                                } else {
                                                    setFormData({ ...formData, user_id: currentIds.filter(id => id !== u.id) });
                                                }
                                            }}
                                            className="rounded border-gray-300"
                                            disabled={!!editingId && formData.user_id !== u.id}
                                        />
                                        <span className="text-sm">{u.full_name || u.email}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Product */}
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-sm font-medium mb-1 block">Product</label>
                            <select
                                required
                                value={formData.product_id}
                                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary"
                            >
                                <option value="">Select Product...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Month</label>
                                <input
                                    type="number"
                                    min="1" max="12"
                                    value={formData.month}
                                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Year</label>
                                <input
                                    type="number"
                                    min="2024" max="2030"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2024 })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none"
                                />
                            </div>
                        </div>

                        {/* Targets */}
                        <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-border pt-4 mt-2">
                            <div>
                                <label className="text-xs font-medium mb-1 block text-muted-foreground uppercase">Monthly Target (Average/Agent)</label>
                                <input
                                    type="number"
                                    value={formData.monthly_target}
                                    onChange={(e) => setFormData({ ...formData, monthly_target: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1 block text-muted-foreground uppercase">Daily Target (Average/Agent)</label>
                                <input
                                    type="number"
                                    value={formData.daily_target}
                                    onChange={(e) => setFormData({ ...formData, daily_target: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
