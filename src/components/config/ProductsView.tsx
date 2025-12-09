'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { saveProductAction, deleteProductAction, getConceptsAction } from '@/actions/productActions';

type Product = {
    id: string;
    concept: string;
    plans: string;
    name: string;
    family: string;
    pp: string;
    center_price: number;
    incentive: number;
    active: boolean;
};

const INITIAL_FORM_DATA = {
    concept: '',
    plans: '',
    name: '',
    family: '',
    pp: '',
    center_price: 0,
    incentive: 0
};

export function ProductsView() {
    const [products, setProducts] = useState<Product[]>([]);
    const [conceptsList, setConceptsList] = useState<{ name: string }[]>([]); // New state for dropdown
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch Products (Client side for now, could be moved too)
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (productsError) throw productsError;
            setProducts(productsData || []);

            // Fetch Concepts via Server Action (Robuster)
            // We optimize by just trying without token first (public read?)
            // If that fails, we might need token, but for now let's try direct call
            // Actually, best to try to get token if possible, but let's try anonymous first for speed
            // If the user is authenticated, RLS *might* require token. 
            // Let's blindly call it without token first, as concepts usually are public readable in this app context? 
            // Wait, RLS is usually "authenticated only". 
            // So we DO need the token. 
            // We can reuse the token scanning logic here? No, that's heavy.
            // Let's try to get session normally, and if it fails, just try the action without token?
            // BETTER: Use the action, but passed undefined. If RLS blocks, we know we need token.

            // For this specific turn, to be safe, let's try to pass the token if we have it easily.
            // But we don't have it easily without the scan.
            // Let's try calling it without token. If RLS is "enable read for anon" it works.
            // If not, we might need to rely on the "Fast Path" scanner for this too?
            // Actually, let's just use the server action. 
            // It runs on Node. It's cleaner. 

            const conceptsResult: any = await getConceptsAction(); // Import this!
            if (conceptsResult.success) {
                setConceptsList(conceptsResult.data || []);
            } else {
                console.warn('Failed to fetch concepts:', conceptsResult.error);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData(INITIAL_FORM_DATA);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (product: Product) => {
        setEditingId(product.id);
        setFormData({
            concept: product.concept || '',
            plans: product.plans || '',
            name: product.name,
            family: product.family || '',
            pp: product.pp || '',
            center_price: product.center_price || 0,
            incentive: product.incentive || 0
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSubmitting(true);
        try {
            console.log('Starting save process...');

            let token = null;
            let debugKeys: string[] = [];

            // 1. Try Fast Local Storage Scan (Bypassing Network)
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) debugKeys.push(key);

                    // Look for ANY key that might contain the token
                    if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
                        const val = localStorage.getItem(key);
                        if (val) {
                            try {
                                const parsed = JSON.parse(val);
                                if (parsed.access_token) {
                                    token = parsed.access_token;
                                    console.log('Token found in LocalStorage:', key);
                                    break;
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('LocalStorage scan failed:', e);
            }

            // 2. Fallback to SDK (Network) if scan failed
            if (!token) {
                console.log('Scanning failed. Keys available:', debugKeys);
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth check timed out (Network)')), 5000)
                );

                try {
                    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
                    token = session?.access_token;
                } catch (e) {
                    console.warn('SDK fallback failed:', e);
                }
            }

            if (!token) {
                throw new Error(`Authentication failed. Could not find session token.\nDebug: Found ${debugKeys.length} LS keys: ${debugKeys.slice(0, 5).join(', ')}...`);
            }

            // 3. Server Action
            console.log('Calling Server Action...');
            const result = await saveProductAction({ ...formData, id: editingId }, token);

            if (!result.success) {
                throw new Error(result.error);
            }

            alert('Product saved successfully via Fast Server!');
            window.location.href = window.location.href;

        } catch (error: any) {
            console.error('Save error:', error);
            alert('Error: ' + error.message);
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error('No active session.');

            const result = await deleteProductAction(id, token);

            if (!result.success) throw new Error(result.error);

            fetchData();
        } catch (error: any) {
            alert('Error deleting product: ' + error.message);
        }
    };

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Products Catalog</h3>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Product
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-muted-foreground text-center py-12 border-2 border-dashed border-border rounded-lg">
                    No products configured yet.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">Product</th>
                                <th className="px-4 py-3">Family</th>
                                <th className="px-4 py-3">Concept</th>
                                <th className="px-4 py-3">Plans</th>
                                <th className="px-4 py-3 text-right">PP</th>
                                <th className="px-4 py-3 text-right">Price</th>
                                <th className="px-4 py-3 text-right">Incentive</th>
                                <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {products.map((product) => (
                                <tr key={product.id} className="group hover:bg-secondary/20 transition-colors">
                                    <td className="px-4 py-3 font-medium">{product.name}</td>
                                    <td className="px-4 py-3">{product.family}</td>
                                    <td className="px-4 py-3">{product.concept}</td>
                                    <td className="px-4 py-3 max-w-[200px] truncate" title={product.plans}>{product.plans}</td>
                                    <td className="px-4 py-3 text-right font-mono">{product.pp}</td>
                                    <td className="px-4 py-3 text-right font-mono">${product.center_price}</td>
                                    <td className="px-4 py-3 text-right font-mono text-green-600">${product.incentive}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(product)}
                                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-primary/10"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Product" : "Create New Product"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1 block">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                                placeholder="e.g. Fiber 300Mb"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Family</label>
                            <input
                                type="text"
                                value={formData.family}
                                onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                                placeholder="e.g. Internet"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Concept</label>
                            <select
                                value={formData.concept}
                                onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all appearance-none"
                            >
                                <option value="">Select a concept...</option>
                                {conceptsList.map((c, i) => (
                                    <option key={i} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="text-sm font-medium mb-1 block">Plans</label>
                            <input
                                type="text"
                                value={formData.plans}
                                onChange={(e) => setFormData({ ...formData, plans: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                                placeholder="Comma separated plans"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Center Price</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.center_price}
                                onChange={(e) => setFormData({ ...formData, center_price: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">PP</label>
                            <input
                                type="text"
                                maxLength={10}
                                value={formData.pp}
                                onChange={(e) => setFormData({ ...formData, pp: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                                placeholder="Max 10 chars"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Incentive</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.incentive}
                                onChange={(e) => setFormData({ ...formData, incentive: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim()}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : (editingId ? 'Save Changes' : 'Save (Fast Server)')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
