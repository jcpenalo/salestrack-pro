'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Shield, UserPlus, Lock, Unlock, Mail, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Modal } from '@/components/ui/Modal';
import { getUsersAction, updateUserAction } from '@/actions/userActions';
import { createUserAction } from '@/actions/adminActions';
import { usePresence } from '@/context/PresenceContext';

export function AdminUsersView() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Editing Role State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { onlineUserIds } = usePresence();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'agent' });

    // Password Reset State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetPassword, setResetPassword] = useState('');
    const [userToReset, setUserToReset] = useState<any>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        console.time('AdminFetch');
        setLoading(true);
        try {
            console.time('TokenFetch');
            // Fast Path Token
            let token = null;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
                    const item = localStorage.getItem(key);
                    if (item) token = JSON.parse(item).access_token;
                    break;
                }
            }
            if (!token) {
                console.warn('Fast path failed, falling back to getSession');
                const { data: { session } } = await supabase.auth.getSession();
                token = session?.access_token;
            }
            console.timeEnd('TokenFetch');

            if (!token) return;

            console.time('ServerAction');
            const { getAdminUsersAction } = await import('@/actions/adminActions');
            const res = await getAdminUsersAction();
            console.timeEnd('ServerAction');

            if (res.success) {
                setUsers(res.data || []);
            } else {
                console.error('Server Action Failed:', res.error);
                // If it's the Service Key error, show a friendly component message later, but for now Alert is fine for Admin.
                alert(`Error loading users: ${res.error}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
            console.timeEnd('AdminFetch');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditRole = (user: any) => {
        setEditingUser({ ...user });
        setIsEditModalOpen(true);
    };

    const handleConfirmEmail = async (user: any) => {
        if (!confirm(`Are you sure you want to manually confirm email for ${user.email}?`)) return;

        try {
            const { confirmUserEmailAction } = await import('@/actions/adminActions');
            const res = await confirmUserEmailAction(user.id);
            if (!res.success) throw new Error(res.error);
            alert('Email confirmed successfully.');
            await fetchData();
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let token = null;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
                    const item = localStorage.getItem(key);
                    if (item) token = JSON.parse(item).access_token;
                    break;
                }
            }
            if (!token) {
                const { data: { session } } = await supabase.auth.getSession();
                token = session?.access_token;
            }
            if (!token) throw new Error('No session');

            const res = await updateUserAction(editingUser, token);
            if (!res.success) throw new Error(res.error);

            await fetchData();
            setIsEditModalOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await createUserAction(newUser);
            if (!res.success) throw new Error(res.error);

            alert(`User ${newUser.email} created successfully!`);
            setNewUser({ full_name: '', email: '', password: '', role: 'agent' }); // Reset
            setIsCreateModalOpen(false);
            await fetchData(); // Refresh list

        } catch (error: any) {
            alert('Creation Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userToReset) return;
        setIsSubmitting(true);
        try {
            const { resetUserPasswordAction } = await import('@/actions/adminActions');
            const res = await resetUserPasswordAction(userToReset.id, resetPassword);
            if (!res.success) throw new Error(res.error);

            alert(`Password for ${userToReset.email} has been reset.`);
            setIsResetModalOpen(false);
            setResetPassword('');
            setUserToReset(null);
        } catch (error: any) {
            alert('Reset Error: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-card rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-500" />
                        Admin User Management
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Manage system roles and access.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    New User
                </button>
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
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Auth</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium flex items-center gap-2">
                                            {user.full_name || 'No Name'}
                                            {onlineUserIds.has(user.id) && (
                                                <span className="relative flex h-2.5 w-2.5" title="Online now">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> {user.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                                            user.role === 'supervisor' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                'bg-secondary text-muted-foreground border-border'
                                            }`}>
                                            {user.role || 'agent'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {!user.is_confirmed ? (
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                    Unconfirmed
                                                </span>
                                                <button
                                                    onClick={() => handleConfirmEmail(user)}
                                                    className="text-[10px] underline text-indigo-500 hover:text-indigo-400"
                                                >
                                                    Verify Now
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-green-500 font-medium bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                                Verified
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {/* HR Status */}
                                            <div className="flex items-center gap-1 text-xs">
                                                <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                                <span className="text-muted-foreground capitalize">{user.status || 'Active'}</span>
                                            </div>
                                            {/* Access Status */}
                                            {user.is_active === false && (
                                                <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                                                    <Lock className="w-2.5 h-2.5" /> Login Disabled
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleEditRole(user)}
                                            className="px-3 py-1 bg-secondary hover:bg-secondary/80 text-foreground text-xs rounded border border-border transition-colors"
                                        >
                                            Edit Role
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* EDIT ROLE MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit System Role"
            >
                {editingUser && (
                    <form onSubmit={handleSaveRole} className="space-y-4">
                        <div className="p-3 bg-secondary/20 rounded-lg border border-border">
                            <div className="text-sm font-medium">{editingUser.full_name}</div>
                            <div className="text-xs text-muted-foreground">{editingUser.email}</div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Account Access</label>
                            <label className={`flex items-center gap-2 p-3 border border-border rounded-lg bg-background transition-colors ${editingUser.role === 'creator' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-secondary/20'}`}>
                                <input
                                    type="checkbox"
                                    checked={editingUser.is_active !== false}
                                    disabled={editingUser.role === 'creator'}
                                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <span className="text-sm font-medium">
                                    {editingUser.role === 'creator'
                                        ? 'Enabled (System Locked)'
                                        : (editingUser.is_active !== false ? 'Enabled (Can Login)' : 'Disabled (Login Blocked)')}
                                </span>
                            </label>
                            {editingUser.role === 'creator' && (
                                <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Creator account cannot be disabled.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">System Role</label>
                            <select
                                value={editingUser.role || 'agent'}
                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                disabled={editingUser.role === 'creator'} // Protect Creator Role
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="admin">Admin</option>
                                <option value="creator" disabled>Creator (System Only)</option>
                                <option value="gerente">Gerente</option>
                                <option value="senior_supervisor">Supervisor Senior</option>
                                <option value="supervisor">Supervisor</option>
                                <option value="estadistica">Estadística</option>
                                <option value="auditor">Auditor</option>
                                <option value="seguimiento">Seguimiento</option>
                                <option value="digitacion">Digitación</option>
                                <option value="representative">Representative</option>

                            </select>
                            {editingUser.role === 'creator' && (
                                <p className="text-[10px] text-red-400 mt-1 font-medium">
                                    <Lock className="w-3 h-3 inline mr-1" />
                                    Creator role cannot be modified.
                                </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Admins/Gerentes have full access. Supervisors have team access. Others have specific limited access.
                            </p>
                        </div>

                        <div className="flex justify-between mt-6 pt-4 border-t border-border">
                            {editingUser.role !== 'creator' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUserToReset(editingUser);
                                        setIsEditModalOpen(false);
                                        setIsResetModalOpen(true);
                                    }}
                                    className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded border border-red-500/20 transition-colors"
                                >
                                    <Lock className="w-3 h-3 inline mr-1" />
                                    Reset Password
                                </button>
                            ) : (
                                <div className="text-xs text-muted-foreground flex items-center">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Security Locked
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </Modal>

            {/* PASSWORD RESET MODAL */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset User Password"
            >
                {userToReset && (
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
                            <p className="text-xs text-red-500 font-medium">
                                Warning: You are changing the password for:
                            </p>
                            <p className="text-sm font-bold text-foreground mt-1">{userToReset.email}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                placeholder="Enter new password..."
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Reset Password
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* CREATE USER MODAL */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New User"
            >
                <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Full Name</label>
                        <input
                            type="text"
                            required
                            value={newUser.full_name}
                            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email</label>
                        <input
                            type="email"
                            required
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                            placeholder="******"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Initial Role</label>
                        <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                        >
                            <option value="admin">Admin</option>
                            <option value="creator" disabled>Creator (System Only)</option>
                            <option value="gerente">Gerente</option>
                            <option value="senior_supervisor">Supervisor Senior</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="estadistica">Estadística</option>
                            <option value="auditor">Auditor</option>
                            <option value="seguimiento">Seguimiento</option>
                            <option value="digitacion">Digitación</option>
                            <option value="representative">Representative</option>

                        </select>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-secondary rounded-lg transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Create Account
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
