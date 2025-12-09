'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface NewSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    masterData: any;
    onSuccess: () => void;
}

export function NewSaleModal({ isOpen, onClose, masterData, onSuccess }: NewSaleModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedProductName, setSelectedProductName] = useState('');
    const [formData, setFormData] = useState({
        sale_date: new Date().toISOString().split('T')[0],
        campaign_id: '',
        product_id: '',
        concept_id: '',
        status_id: '',
        customer_name: '',
        contact_number: '',
        id_document: '',
        os_madre: '',
        os_hija: '',
        plan_sold: '', // Will store the same logic as product_id conceptually, but UI shows plans
        pp: ''
    });

    // Extract unique product names for the first dropdown
    const uniqueProductNames = useMemo(() => {
        if (!masterData.products) return [];
        const names = new Set(masterData.products.map((p: any) => p.name));
        return Array.from(names).sort();
    }, [masterData.products]);

    // Filter available plans based on selected product name
    const availablePlans = useMemo(() => {
        if (!selectedProductName || !masterData.products) return [];
        return masterData.products.filter((p: any) => p.name === selectedProductName);
    }, [selectedProductName, masterData.products]);

    // Auto-fill PP and Concept when specific Product ID (Plan) changes
    useEffect(() => {
        if (formData.product_id && masterData.products) {
            const product = masterData.products.find((p: any) => p.id === formData.product_id);

            console.log('Selected Plan/Product:', product); // Debugging

            if (product) {
                // Determine Concept
                let conceptId = '';
                if (product.concept && masterData.concepts) {
                    const concept = masterData.concepts.find((c: any) =>
                        c.name.trim().toLowerCase() === product.concept.trim().toLowerCase()
                    );
                    if (concept) conceptId = concept.id;
                }

                setFormData(prev => ({
                    ...prev,
                    plan_sold: product.plans || '',
                    pp: product.pp || '',
                    concept_id: conceptId || prev.concept_id
                }));
            }
        }
    }, [formData.product_id, masterData.products, masterData.concepts]);

    // Handle Product Name Change (Reset Plan)
    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newName = e.target.value;
        setSelectedProductName(newName);
        setFormData(prev => ({ ...prev, product_id: '', plan_sold: '', pp: '', concept_id: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Call Server Action (dynamically imported to avoid circular deps if any)
            const { createSaleAction } = await import('@/actions/saleActions');

            // Sanitize payload
            const payload = {
                ...formData,
                campaign_id: formData.campaign_id || null,
                product_id: formData.product_id || null,
                concept_id: formData.concept_id || null,
                status_id: formData.status_id || null,
                pp: formData.pp || null
            };

            const res = await createSaleAction(payload, session.access_token);

            if (res.success) {
                onSuccess();
                onClose();
                // Reset form?
            } else {
                alert('Error creating sale: ' + res.error);
            }
        } catch (error) {
            console.error(error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl rounded-xl shadow-xl border border-border max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-4 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="text-xl font-bold">New Sale Record</h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">

                    {/* Basic Info */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.sale_date}
                            onChange={e => setFormData({ ...formData, sale_date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Campaign</label>
                        <select
                            required
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.campaign_id}
                            onChange={e => setFormData({ ...formData, campaign_id: e.target.value })}
                        >
                            <option value="">Select Campaign</option>
                            {masterData.campaigns?.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Customer Name</label>
                        <input
                            type="text"
                            required
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.customer_name}
                            onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                        />
                    </div>

                    {/* Identifiers */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">ID Document (Cédula)</label>
                        <input
                            type="text"
                            maxLength={11}
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.id_document}
                            onChange={e => setFormData({ ...formData, id_document: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Contact Number</label>
                        <input
                            type="text"
                            maxLength={10}
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.contact_number}
                            onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">OS Madre</label>
                        <input
                            type="text"
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.os_madre}
                            onChange={e => setFormData({ ...formData, os_madre: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">OS Hija</label>
                        <input
                            type="text"
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.os_hija}
                            onChange={e => setFormData({ ...formData, os_hija: e.target.value })}
                        />
                    </div>


                    {/* Product Info */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 border-t border-border my-1"></div>

                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Product</label>
                        <select
                            required
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={selectedProductName}
                            onChange={handleProductChange}
                        >
                            <option value="">Select Product</option>
                            {uniqueProductNames.map((name: string) => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Plan Sold</label>
                        <select
                            required
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.product_id}
                            disabled={!selectedProductName}
                            onChange={e => setFormData({ ...formData, product_id: e.target.value })}
                        >
                            <option value="">Select Plan</option>
                            {availablePlans.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.plans}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">PP</label>
                        <input
                            type="text"
                            readOnly
                            className="w-full px-2 py-1 rounded text-xs border bg-secondary/50 text-muted-foreground cursor-not-allowed"
                            value={formData.pp}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Concept</label>
                        <div className="relative">
                            <select
                                required
                                className="w-full px-2 py-1 rounded text-xs border bg-secondary/50 appearance-none pointer-events-none"
                                value={formData.concept_id}
                                disabled
                                tabIndex={-1}
                                onChange={() => { }}
                            >
                                <option value="">Select Concept</option>
                                {masterData.concepts?.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground">Status</label>
                        <select
                            required
                            className="w-full px-2 py-1 rounded text-xs border bg-background"
                            value={formData.status_id}
                            onChange={e => setFormData({ ...formData, status_id: e.target.value })}
                        >
                            <option value="">Select Status</option>
                            {masterData.statuses?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                </form>

                <div className="p-4 border-t border-border flex justify-end gap-3 sticky bottom-0 bg-card z-10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        {loading && <Loader2 className="animate-spin" size={16} />}
                        Save Sale
                    </button>
                </div>
            </div>
        </div>
    );
}
