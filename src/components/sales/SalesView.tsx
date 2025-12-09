'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Filter, Search, Calendar, Download, Database, Trash2, Check, X as XIcon, Edit2, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { getSalesAction, createSaleAction, updateSaleFieldAction, truncateSalesAction } from '@/actions/saleActions';
import { getMasterDataAction } from '@/actions/configActions';
import { getPermissionsAction } from '@/actions/permissionActions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { NewSaleModal } from './NewSaleModal';
import { ClearDBModal } from './ClearDBModal';
import { RestoreDBModal } from './RestoreDBModal';

// Permission Helper (Dynamic)
const isEditable = (role: string | undefined, field: string, permissions: any[]) => {
    if (!role) return false;
    if (role === 'creator') return true; // Super Admin always true

    const perm = permissions.find(p => p.role === role && p.resource_key === `field:sales.${field}`);
    return perm ? perm.is_allowed : false;
};

// Generic Permission Check
const hasPermission = (permissions: any[], role: string | undefined, resource: string) => {
    if (!role) return false;
    if (role === 'creator') return true;
    const perm = permissions.find(p => p.role === role && p.resource_key === resource);
    return perm ? perm.is_allowed : false;
};

// Editable Cell Component
const EditableCell = ({ value, field, saleId, type, options, role, permissions, onSave }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => setCurrentValue(value), [value]);

    const canEdit = isEditable(role, field, permissions);

    const handleSave = async () => {
        if (currentValue === value) {
            setIsEditing(false);
            return;
        }

        setLoading(true);
        const success = await onSave(saleId, field, currentValue);
        setLoading(false);

        if (success) setIsEditing(false);
    };

    if (!canEdit) {
        if (type === 'select') {
            const option = options?.find((o: any) => o.id === value || o.value === value);
            return <span className="text-muted-foreground">{option?.name || option?.full_name || value || '-'}</span>;
        }
        return <span>{value || '-'}</span>;
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 min-w-[120px]">
                {type === 'select' ? (
                    <select
                        autoFocus
                        className="w-full text-xs p-1 border rounded bg-background"
                        value={currentValue || ''}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        disabled={loading}
                    >
                        <option value="">Select...</option>
                        {options?.map((opt: any) => (
                            <option key={opt.id} value={opt.id}>{opt.name || opt.full_name}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        autoFocus
                        type="text"
                        className="w-full text-xs p-1 border rounded bg-background"
                        value={currentValue || ''}
                        onChange={(e) => setCurrentValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        disabled={loading}
                    />
                )}
                {loading && <Loader2 size={12} className="animate-spin text-primary" />}
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer hover:bg-secondary/50 p-1 -m-1 rounded transition-colors group flex items-center justify-between min-h-[20px]"
        >
            <span className="truncate max-w-[150px]">
                {type === 'select'
                    ? (options?.find((o: any) => o.id === value)?.name || options?.find((o: any) => o.id === value)?.full_name || value || '-')
                    : (value || '-')
                }
            </span>
            <span className="opacity-0 group-hover:opacity-100 text-muted-foreground ml-1">
                <Edit2 size={10} />
            </span>
        </div>
    );
};

import { useRequireAccess } from '@/hooks/useRequireAccess';

export function SalesView() {
    const { hasAccess } = useRequireAccess('tab:sales');
    const { profile } = useUserProfile();

    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalDefault, setTotal] = useState(0);
    const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

    // Filters State
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        os_madre: '',
        os_hija: '',
        contact_number: '',
        concept_id: '',
        status_id: ''
    });

    const [masterData, setMasterData] = useState<any>({});
    const [permissions, setPermissions] = useState<any[]>([]);

    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await getSalesAction(session.access_token, filters);
            if (res.success) {
                setSales(res.data || []);
                setTotal(res.count || 0);
            } else {
                console.error('Fetch error:', res.error);
                alert('Error loading sales: ' + res.error);
            }
        } catch (error: any) {
            console.error(error);
            alert('System error: ' + error.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        const loadConfig = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const [configRes, permRes] = await Promise.all([
                    getMasterDataAction(session.access_token),
                    getPermissionsAction(session.access_token)
                ]);

                if (configRes.success) setMasterData(configRes.data);
                if (permRes.success) setPermissions(permRes.data || []);
            }
        };
        loadConfig();
        fetchSales();
    }, [fetchSales]);

    // Handle Inline Edit
    const handleSaveCell = async (saleId: string, field: string, value: any) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return false;

            const res = await updateSaleFieldAction(saleId, field, value, session.access_token);

            if (res.success) {
                setSales(prev => prev.map(s => {
                    if (s.id === saleId) {
                        return { ...s, [field]: value };
                    }
                    return s;
                }));
                fetchSales();
                return true;
            } else {
                alert('Update failed: ' + res.error);
                return false;
            }
        } catch (error: any) {
            alert('Update error: ' + error.message);
            return false;
        }
    };

    // Button Handlers
    const handleDownload = () => {
        if (!sales.length) return;
        const csvContent = "data:text/csv;charset=utf-8,"
            + [
                Object.keys(sales[0]).join(","), // Header
                ...sales.map(row => Object.values(row).map(v => `"${v}"`).join(",")) // Rows
            ].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBackup = () => {
        if (!sales.length) return;
        const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sales, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", jsonContent);
        link.setAttribute("download", `sales_backup_${new Date().toISOString()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteBD = async () => {
        if (!confirm('CRITICAL WARNING: This will DELETE ALL DATA in the sales table. This action cannot be undone. Are you absolutely sure?')) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await truncateSalesAction(session.access_token);
            if (res.success) {
                alert(`Database truncated. ${res.count || 0} records deleted.`);
                fetchSales();
            } else {
                alert('Delete failed: ' + res.error);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    // Permission Checks
    const canDownload = hasPermission(permissions, profile?.role, 'button:sales.download');
    const canBackup = hasPermission(permissions, profile?.role, 'button:sales.backup_bd');
    const canDelete = hasPermission(permissions, profile?.role, 'button:sales.delete_bd');
    const canClear = hasPermission(permissions, profile?.role, 'button:sales.clear_bd');
    const canRestore = hasPermission(permissions, profile?.role, 'button:sales.restore_bd');

    // Filter Permission Checks
    const canFilterContact = hasPermission(permissions, profile?.role, 'filter:sales.contact');
    const canFilterDate = hasPermission(permissions, profile?.role, 'filter:sales.date_range');
    const canFilterOsMadre = hasPermission(permissions, profile?.role, 'filter:sales.os_madre');
    const canFilterOsHija = hasPermission(permissions, profile?.role, 'filter:sales.os_hija');
    const canFilterConcept = hasPermission(permissions, profile?.role, 'filter:sales.concept');
    const canFilterStatus = hasPermission(permissions, profile?.role, 'filter:sales.status');

    // Access Check (Must be last)
    if (hasAccess === false) return null;

    const assignableUsers = masterData.users?.filter((u: any) =>
        ['seguimiento', 'digitacion'].includes(u.role?.toLowerCase())
    ) || [];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Sales Operations</h1>
                <div className="flex gap-2">
                    {/* Action Buttons */}
                    {canClear && (
                        <button onClick={() => setIsClearModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <Database size={14} /> Clear BD
                        </button>
                    )}
                    {canRestore && (
                        <button onClick={() => setIsRestoreModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <RotateCcw size={14} /> Restore BD
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={handleDeleteBD} className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <Trash2 size={14} /> Delete BD
                        </button>
                    )}
                    {canBackup && (
                        <button onClick={handleBackup} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <Database size={14} /> Backup BD
                        </button>
                    )}
                    {canDownload && (
                        <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                            <Download size={14} /> Download
                        </button>
                    )}

                    <button onClick={() => setIsNewSaleModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ml-2">
                        <Plus size={18} /> New Sale
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-card p-3 rounded-xl border border-border mb-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    {canFilterContact && (
                        <input type="text" placeholder="Search (Contact)..." className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, contact_number: e.target.value })} />
                    )}
                    {canFilterDate && (
                        <>
                            <input type="date" className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
                            <input type="date" className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
                        </>
                    )}
                    {canFilterOsMadre && (
                        <input type="text" placeholder="OS Madre" className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, os_madre: e.target.value })} />
                    )}
                    {canFilterOsHija && (
                        <input type="text" placeholder="OS Hija" className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, os_hija: e.target.value })} />
                    )}

                    {canFilterStatus && (
                        <select className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, status_id: e.target.value })}>
                            <option value="">Status...</option>
                            {masterData.statuses?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    )}

                    {canFilterConcept && (
                        <select className="border p-1 rounded text-xs" onChange={e => setFilters({ ...filters, concept_id: e.target.value })}>
                            <option value="">Concept...</option>
                            {masterData.concepts?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden pb-20">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                        <thead className="bg-secondary/50 font-semibold uppercase text-muted-foreground">
                            <tr>
                                <th className="px-3 py-2">#</th>
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2">Campaign</th>
                                <th className="px-3 py-2">Customer</th>
                                <th className="px-3 py-2">ID Document</th>
                                <th className="px-3 py-2">Contact</th>
                                <th className="px-3 py-2">OS Madre</th>
                                <th className="px-3 py-2">OS Hija</th>
                                <th className="px-3 py-2">Product</th>
                                <th className="px-3 py-2">Plan</th>
                                <th className="px-3 py-2">PP</th>
                                <th className="px-3 py-2">Concept</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Assigned To</th>
                                <th className="px-3 py-2">Comms Claro</th>
                                <th className="px-3 py-2">Comms Orion</th>
                                <th className="px-3 py-2">Comms DOFU</th>
                                <th className="px-3 py-2">Inst. Num</th>
                                <th className="px-3 py-2">Agent</th>
                                <th className="px-3 py-2">Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {sales.map((sale, index) => (
                                <tr key={sale.id} className="hover:bg-secondary/20 group">
                                    <td className="px-3 py-2 text-muted-foreground">{sales.length - index}</td>
                                    <td className="px-3 py-2">{sale.sale_date}</td>

                                    <td className="px-3 py-2">
                                        <EditableCell
                                            value={sale.campaign_id}
                                            field="campaign_id"
                                            saleId={sale.id}
                                            role={profile?.role}
                                            permissions={permissions}
                                            type="select"
                                            options={masterData.campaigns}
                                            onSave={handleSaveCell}
                                        />
                                    </td>

                                    <td className="px-3 py-2 font-medium">{sale.customer_name}</td>
                                    <td className="px-3 py-2">{sale.id_document}</td>

                                    <td className="px-3 py-2">
                                        <EditableCell
                                            value={sale.contact_number}
                                            field="contact_number"
                                            saleId={sale.id}
                                            role={profile?.role}
                                            permissions={permissions}
                                            type="text"
                                            onSave={handleSaveCell}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <EditableCell
                                            value={sale.os_madre}
                                            field="os_madre"
                                            saleId={sale.id}
                                            role={profile?.role}
                                            permissions={permissions}
                                            type="text"
                                            onSave={handleSaveCell}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <EditableCell
                                            value={sale.os_hija}
                                            field="os_hija"
                                            saleId={sale.id}
                                            role={profile?.role}
                                            permissions={permissions}
                                            type="text"
                                            onSave={handleSaveCell}
                                        />
                                    </td>

                                    <td className="px-3 py-2">{sale.product?.name}</td>
                                    <td className="px-3 py-2">{sale.plan_sold}</td>
                                    <td className="px-3 py-2">{sale.pp}</td>
                                    <td className="px-3 py-2">{sale.concept?.name}</td>

                                    <td className="px-3 py-2">
                                        <EditableCell
                                            value={sale.status_id}
                                            field="status_id"
                                            saleId={sale.id}
                                            role={profile?.role}
                                            permissions={permissions}
                                            type="select"
                                            options={masterData.statuses}
                                            onSave={handleSaveCell}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <EditableCell
                                            value={sale.assigned_to}
                                            field="assigned_to"
                                            saleId={sale.id}
                                            role={profile?.role}
                                            permissions={permissions}
                                            type="select"
                                            options={assignableUsers}
                                            onSave={handleSaveCell}
                                        />
                                    </td>

                                    <td className="px-3 py-2">
                                        <EditableCell value={sale.comment_claro} field="comment_claro" saleId={sale.id} role={profile?.role} permissions={permissions} type="text" onSave={handleSaveCell} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <EditableCell value={sale.comment_orion} field="comment_orion" saleId={sale.id} role={profile?.role} permissions={permissions} type="text" onSave={handleSaveCell} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <EditableCell value={sale.comment_dofu} field="comment_dofu" saleId={sale.id} role={profile?.role} permissions={permissions} type="text" onSave={handleSaveCell} />
                                    </td>
                                    <td className="px-3 py-2">
                                        <EditableCell value={sale.installed_number} field="installed_number" saleId={sale.id} role={profile?.role} permissions={permissions} type="text" onSave={handleSaveCell} />
                                    </td>

                                    <td className="px-3 py-2">{sale.agent?.full_name}</td>
                                    <td className="px-3 py-2 text-[10px] text-muted-foreground flex flex-col">
                                        <span>{sale.updated_by?.full_name || '-'}</span>
                                        <span className="text-[9px] opacity-70">
                                            {sale.status_updated_at ? new Date(sale.status_updated_at).toLocaleDateString() + ' ' + new Date(sale.status_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <NewSaleModal
                isOpen={isNewSaleModalOpen}
                onClose={() => setIsNewSaleModalOpen(false)}
                masterData={masterData}
                onSuccess={fetchSales}
            />

            <ClearDBModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                onSuccess={fetchSales}
            />

            <RestoreDBModal
                isOpen={isRestoreModalOpen}
                onClose={() => setIsRestoreModalOpen(false)}
                onSuccess={fetchSales}
            />
        </div>
    );
}
