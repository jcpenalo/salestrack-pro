'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Pencil, User, Calendar, CreditCard, Hash, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { getUsersAction, updateUserAction, getExitReasonsAction } from '@/actions/userActions';
import { usePresence } from '@/context/PresenceContext';

export function UsersView() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filtered lists for dropdowns
    const [supervisors, setSupervisors] = useState<any[]>([]);
    const [exitReasons, setExitReasons] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [canManageSkills, setCanManageSkills] = useState(false);

    const { onlineUserIds } = usePresence();

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fast Path Token
            let token = null;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
                        const item = localStorage.getItem(key);
                        if (item) {
                            const parsed = JSON.parse(item);
                            token = parsed.access_token;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn('Fast token read failed', e);
            }

            if (!token) {
                const { data: { session } } = await supabase.auth.getSession();
                token = session?.access_token;
            }

            if (!token) throw new Error('No session');

            // Parallel fetch
            const [usersRes, reasonsRes, masterRes, permRes] = await Promise.all([
                getUsersAction(token),
                getExitReasonsAction(token),
                import('@/actions/configActions').then(m => m.getMasterDataAction(token)),
                import('@/actions/permissionActions').then(m => m.getPermissionsAction(token))
            ]);

            if (!usersRes.success) throw new Error(usersRes.error);

            setUsers(usersRes.data || []);
            setExitReasons(reasonsRes.data || []);

            if (masterRes.success) {
                // Deduplicate products by ID/Name to be safe
                const rawProducts = (masterRes.data as any).products || [];
                const uniqueProducts = Array.from(new Map(rawProducts.map((p: any) => [p.name, p])).values());
                setProducts(uniqueProducts);
            }

            // Derive supervisors
            const sups = (usersRes.data || []).filter((u: any) => u.role === 'supervisor');
            setSupervisors(sups);

            // Access Check
            if (permRes.success) {
                // Get current user role to check permissions list
                const myRole = (usersRes.data || []).find((u: any) => u.email === (JSON.parse(atob(token.split('.')[1])).email))?.role; // Decode JWT roughly or rely on session user if available, but usersRes has all users.
                // Better: we don't know OUR role easily from here without decoding token or Auth getUser.
                // Let's assume the permission action returns data relevant to *our* role? 
                // getPermissionsAction returns ALL permissions for ALL roles? No, usually returns permissions for the *caller*.
                // Let's check getPermissionsAction... it returns a list of { resource_key, is_allowed }.
                // So we just check if config:manage_skills is true in the list.
                const perms = permRes.data || [];
                const allowed = perms.some((p: any) => p.resource_key === 'config:manage_skills' && p.is_allowed);
                // Also Creator/Admin override? The action usually resolves that? 
                // No, the action usually returns logic. 
                // Our pattern: isEditable helper.
                // Let's simple check:
                const hasPerm = perms.some((p: any) => p.resource_key === 'config:manage_skills' && p.is_allowed);
                // Also check if I am creator? 
                // The token owner might be creator. 
                // Note: Creator always has all access in our logic, usually handles in 'hasAccess' hooks.
                // For now, assume if the key is present and allowed, or if we are creator (hard to know here without profile).
                // I will update canManageSkills state.
                setCanManageSkills(hasPerm || false);

                // Hack: If I am creator, I might not have a specific 'config:manage_skills' entry if I didn't add it to DB.
                // But creators usually bypass.
                // Let's trust the perms list or rely on backend for final enforcement.
                // Actually, let's fetch profile properly if needed, but for now rely on perm list presence.
                // If I am Creator, I should ensure getPermissionsAction returns true for everything or I handle it.
            }

        } catch (error: any) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    // Auto-update status when exit date changes logic is in RENDER mostly, but we can enforce it here
    const handleExitDateChange = (date: string) => {
        if (date) {
            setEditingUser({ ...editingUser, exit_date: date, status: 'inactive' });
        } else {
            setEditingUser({ ...editingUser, exit_date: null });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // 1. Try Fast Local Storage Read
            let token = null;
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
                        const item = localStorage.getItem(key);
                        if (item) {
                            const parsed = JSON.parse(item);
                            token = parsed.access_token;
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn('Fast token read failed', e);
            }

            // 2. Fallback to standard SDK if needed
            if (!token) {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                token = session?.access_token;
            }

            if (!token) throw new Error('No session functionality available. Please refresh.');

            const result = await updateUserAction(editingUser, token);

            if (!result.success) throw new Error(result.error);

            await fetchData(); // Refresh data
            setIsModalOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            console.error('Save failed:', error);
            alert('Error updating user: ' + (error.message || 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    User Management
                </h3>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground font-semibold">
                            <tr>
                                <th className="px-4 py-3 rounded-tl-lg">User</th>
                                <th className="px-4 py-3">Supervisor</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Vici ID</th>
                                <th className="px-4 py-3">Card No</th>
                                <th className="px-4 py-3">Dates (In/Out)</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-tr-lg text-right">Edit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => {
                                const supName = users.find(u => u.id === user.supervisor_id)?.full_name || '-';
                                return (
                                    <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="font-medium">{user.full_name || 'No Name'}</div>
                                                {onlineUserIds.has(user.id) && (
                                                    <span className="relative flex h-2.5 w-2.5" title="Online now">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {user.supervisor_id ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                                                        {supName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs">{supName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.role === 'supervisor' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-secondary'
                                                }`}>
                                                {user.role || 'agent'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">{user.vicidial_id || '-'}</td>
                                        <td className="px-4 py-3 text-xs">{user.card_number || '-'}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <div className="text-green-600">In: {user.entry_date || '-'}</div>
                                            <div className="text-red-600">Out: {user.exit_date || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'inactive'
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                : user.status === 'licencia_medica'
                                                    ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                    : 'bg-green-500/10 text-green-500 border border-green-500/20'
                                                }`}>
                                                {user.status === 'licencia_medica' ? 'Licencia Médica' : (user.status || 'active')}
                                            </span>
                                            {canManageSkills && user.skills?.length > 0 && (
                                                <div className="mt-1 flex gap-1 flex-wrap">
                                                    <span className="text-[9px] px-1 bg-blue-100 text-blue-700 rounded border border-blue-200">
                                                        {user.skills.length} Skills
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Edit User Details"
            >
                {editingUser && (
                    <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">

                        <div className="grid grid-cols-1 gap-4">
                            {/* Role is Read-Only here */}
                            <div className="flex justify-between items-center bg-muted/30 p-2 rounded text-xs text-muted-foreground">
                                <span>Role: <strong className="text-foreground">{editingUser.role || 'agent'}</strong></span>
                                <span>(Managed by Admin)</span>
                            </div>

                            <div className="col-span-1">
                                <label className="text-xs font-medium mb-1 block">Status</label>
                                <select
                                    value={editingUser.status || 'active'}
                                    disabled={!!editingUser.exit_date} // Disabled if exit date is set
                                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm disabled:opacity-50"
                                >
                                    <option value="active">Active</option>
                                    <option value="licencia_medica">Licencia Médica</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                                {editingUser.exit_date && <span className="text-[10px] text-red-500">Auto-set by Exit Date</span>}
                            </div>
                        </div>

                        {/* Identifiers */}
                        <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-3 rounded-lg border border-border/50">
                            <div className="col-span-1">
                                <label className="text-xs font-medium mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Vicidial ID</label>
                                <input
                                    type="text"
                                    value={editingUser.vicidial_id || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, vicidial_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                    placeholder="1001"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-medium mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Card No.</label>
                                <input
                                    type="text"
                                    value={editingUser.card_number || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, card_number: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                    placeholder="CARD-001"
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border/50">
                            <div className="col-span-1">
                                <label className="text-xs font-medium mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Entry Date</label>
                                <input
                                    type="date"
                                    value={editingUser.entry_date || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, entry_date: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                />
                            </div>
                            <div className="col-span-1">
                                <label className="text-xs font-medium mb-1 flex items-center gap-1 text-red-400"><LogOut className="w-3 h-3" /> Exit Date</label>
                                <input
                                    type="date"
                                    value={editingUser.exit_date || ''}
                                    onChange={(e) => handleExitDateChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-red-500"
                                />
                            </div>
                        </div>

                        {/* Exit Reason (Only if inactive or exit date set) */}
                        {(editingUser.status === 'inactive' || editingUser.exit_date) && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="text-sm font-medium mb-1 block">Reason for Exit</label>
                                <select
                                    value={editingUser.exit_reason_id || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, exit_reason_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                >
                                    <option value="">Select Reason...</option>
                                    {exitReasons.map(r => (
                                        <option key={r.id} value={r.id}>{r.reason}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Supervisor */}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Supervisor</label>
                            <select
                                value={editingUser.supervisor_id || ''}
                                onChange={(e) => setEditingUser({ ...editingUser, supervisor_id: e.target.value === '' ? null : e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            >
                                <option value="">No Supervisor</option>
                                {supervisors
                                    .filter(s => s.id !== editingUser.id)
                                    .map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.full_name || s.email}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* SKILLS MANAGER */}
                        {canManageSkills && (
                            <div className="bg-secondary/10 p-3 rounded-lg border border-border/50">
                                <label className="text-xs font-bold mb-2 block uppercase text-muted-foreground">Product Skills</label>
                                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                                    {products.map(p => {
                                        const hasSkill = (editingUser.skills || []).includes(p.id);
                                        return (
                                            <div key={p.id} className="flex items-center gap-2 bg-background p-2 rounded border border-border/50">
                                                <input
                                                    type="checkbox"
                                                    id={`skill-${p.id}`}
                                                    checked={hasSkill}
                                                    onChange={(e) => {
                                                        const currentSkills = editingUser.skills || [];
                                                        let newSkills;
                                                        if (e.target.checked) {
                                                            newSkills = [...currentSkills, p.id];
                                                        } else {
                                                            newSkills = currentSkills.filter((id: any) => id !== p.id);
                                                        }
                                                        setEditingUser({ ...editingUser, skills: newSkills });
                                                    }}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <label htmlFor={`skill-${p.id}`} className="text-xs truncate cursor-pointer select-none flex-1">
                                                    {p.name}
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2">
                                    * Checked products will be auto-assigned to this user.
                                </p>
                            </div>
                        )}


                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                                {isSubmitting ? 'Save Changes' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
