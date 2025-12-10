'use client';

// ... imports
import { useUserProfile } from '@/hooks/useUserProfile';

// ... interface

export function NewSaleModal({ isOpen, onClose, masterData, onSuccess }: NewSaleModalProps) {
    const { profile } = useUserProfile();
    const canAssign = ['admin', 'creator', 'supervisor', 'gerente', 'senior_supervisor'].includes(profile?.role || '');

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
        plan_sold: '',
        pp: '',
        assigned_to: '' // Added field
    });

    // ... useMemo uniqueProductNames

    // ... useMemo availablePlans

    // ... useEffect auto-fill

    // ... handleProductChange

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { createSaleAction } = await import('@/actions/saleActions');

            const payload = {
                ...formData,
                campaign_id: formData.campaign_id || null,
                product_id: formData.product_id || null,
                concept_id: formData.concept_id || null,
                status_id: formData.status_id || null,
                pp: formData.pp || null,
                assigned_to: formData.assigned_to || null // Pass explicit assignment if set
            };

            const res = await createSaleAction(payload, session.access_token);

            if (res.success) {
                onSuccess();
                onClose();
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

    const assignableUsers = masterData.users?.filter((u: any) =>
        ['digitacion', 'seguimiento'].includes(u.role?.toLowerCase())
    ) || [];

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

    // 1. Extract Unique Product Names for the first dropdown
    const uniqueProductNames = useMemo(() => {
        if (!masterData.products) return [];
        const names = new Set(masterData.products.map((p: any) => p.name));
                    return Array.from(names).sort();
    }, [masterData.products]);

    // 2. Filter Plans based on selected Product Name
    const availablePlans = useMemo(() => {
        if (!selectedProductName || !masterData.products) return [];
        return masterData.products.filter((p: any) => p.name === selectedProductName);
    }, [selectedProductName, masterData.products]);

                    // 3. Handle Product Name Change
                    const handleProductNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const name = e.target.value;
                        setSelectedProductName(name);
        // Reset dependent fields
        setFormData(prev => ({
                            ...prev,
                            product_id: '',
                        plan_sold: '', // Visual helper if needed, but we use product_id as the unique row ID
                        pp: '',
                        concept_id: ''
        }));
    };

                        // 4. Handle Specific Plan (Row) Selection -> Auto-Fill PP & Concept
                        const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value;
        const selectedRow = masterData.products?.find((p: any) => p.id === productId);

                            if (selectedRow) {
            // Find concept ID based on name if possible, or just use what's in the row if it's an ID
            // The product row usually stores 'concept' as a NAME (string) based on the table definition
            // But the Sale needs a concept_id (UUID).
            // We need to find the matching concept ID from masterData.concepts
            const conceptObj = masterData.concepts?.find((c: any) => c.name === selectedRow.concept);
            
            setFormData(prev => ({
                                ...prev,
                                product_id: productId,
                            plan_sold: selectedRow.plans, // Store plan name for display/logic
                            pp: selectedRow.pp || '',
                            concept_id: conceptObj ? conceptObj.id : '' // Auto-link Concept ID
            }));
        } else {
                                setFormData(prev => ({ ...prev, product_id: productId }));
        }
    };

                            // ...

                            <div className="space-y-1 col-span-2">
                                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Product (Catalog)</label>
                                <select
                                    required
                                    className="w-full px-2 py-1 rounded text-xs border bg-background"
                                    value={selectedProductName}
                                    onChange={handleProductNameChange}
                                >
                                    <option value="">Select Product Family</option>
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
                                    onChange={handlePlanChange}
                                >
                                    <option value="">Select Plan</option>
                                    {availablePlans.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.plans} ({p.pp})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase text-muted-foreground">PP (Auto)</label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full px-2 py-1 rounded text-xs border bg-secondary/50 text-muted-foreground font-mono"
                                    value={formData.pp}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase text-muted-foreground">Concept (Auto)</label>
                                <select
                                    required
                                    className="w-full px-2 py-1 rounded text-xs border bg-secondary/50 appearance-none pointer-events-none text-muted-foreground"
                                    value={formData.concept_id}
                                    disabled
                                    tabIndex={-1}
                                    onChange={() => { }}
                                >
                                    <option value="">Auto-filled from Product</option>
                                    {masterData.concepts?.map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
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

                            {/* Admin Assignment Override */}
                            {canAssign && (
                                <div className="space-y-1 border-l pl-2 border-indigo-500/30">
                                    <label className="text-[10px] font-bold uppercase text-indigo-600">Assign To (Override)</label>
                                    <select
                                        className="w-full px-2 py-1 rounded text-xs border border-indigo-200 bg-indigo-50/10"
                                        value={formData.assigned_to}
                                        onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                                    >
                                        <option value="">Auto-Assign (Default)</option>
                                        {assignableUsers.map((u: any) => (
                                            <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

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
