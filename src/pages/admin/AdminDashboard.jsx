import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, UserPlus, LogOut, Loader, Search, RefreshCw, Key, Sun, Moon } from 'lucide-react';
import { Button, Card, Modal, Input, Badge, ConfirmModal } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';

const API_URL = '/.netlify/functions/admin-users';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Modals
    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, user: null });

    // Forms
    const [newUser, setNewUser] = useState({ username: '', password: '' });

    // Auth Check
    useEffect(() => {
        const adminAuth = localStorage.getItem('admin_session');
        if (!adminAuth) navigate('/admin-login');
    }, [navigate]);

    // Fetch Users
    useEffect(() => {
        const fetchUsers = async () => {
            const adminKey = localStorage.getItem('admin_key');
            try {
                setLoading(true);
                const res = await fetch(API_URL, {
                    headers: { 'X-Admin-Pass': adminKey }
                });
                const data = await res.json();

                if (data.success) {
                    setUsers(data.data);
                } else {
                    setError('Failed to load users: ' + (data.error || 'Unknown error'));
                    if (res.status === 401) navigate('/admin-login');
                }
            } catch (err) {
                setError('Connection Error');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [refreshKey, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_key');
        navigate('/admin-login');
    };

    const handleAddUser = async () => {
        if (!newUser.username || !newUser.password) return alert('Fill all fields');

        const adminKey = localStorage.getItem('admin_key');
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-Pass': adminKey
                },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();

            if (data.success) {
                setAddModal(false);
                setNewUser({ username: '', password: '' });
                setRefreshKey(k => k + 1);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Failed to create user');
        }
    };

    const handleDeleteUser = async () => {
        if (!deleteModal.user) return;

        const adminKey = localStorage.getItem('admin_key');
        try {
            const res = await fetch(`${API_URL}?id=${deleteModal.user.id}`, {
                method: 'DELETE',
                headers: { 'X-Admin-Pass': adminKey }
            });
            const data = await res.json();

            if (data.success) {
                setDeleteModal({ open: false, user: null });
                setRefreshKey(k => k + 1);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-base text-main font-sans">
            {/* Nav */}
            <nav className="h-16 border-b border-base bg-surface px-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" className="text-secondary" onClick={toggleTheme}>
                        {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                    </Button>
                    <Button variant="ghost" icon={LogOut} onClick={handleLogout}>Logout</Button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold mb-1">User Management</h1>
                        <p className="text-secondary text-sm">Manage access and credentials for GML Tools</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" icon={RefreshCw} onClick={() => setRefreshKey(k => k + 1)}>Refresh</Button>
                        <Button icon={UserPlus} onClick={() => setAddModal(true)} className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700">Add User</Button>
                    </div>
                </div>

                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 h-10 bg-white [.dark_&]:bg-slate-900 border border-slate-300 [.dark_&]:border-slate-700 rounded-lg outline-none focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader className="animate-spin text-primary" size={32} />
                    </div>
                ) : (
                    <div className="bg-surface border border-base rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-base border-b border-base">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-secondary w-20">ID</th>
                                    <th className="px-6 py-4 font-semibold text-secondary">Username</th>
                                    <th className="px-6 py-4 font-semibold text-secondary">Role</th>
                                    <th className="px-6 py-4 font-semibold text-secondary">Created At</th>
                                    <th className="px-6 py-4 font-semibold text-secondary">Password Hash</th>
                                    <th className="px-6 py-4 font-semibold text-secondary text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-surface-hover transition-colors group">
                                        <td className="px-6 py-4 font-mono text-secondary">#{user.id}</td>
                                        <td className="px-6 py-4 font-medium text-main">{user.username}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.role === 'admin' ? 'primary' : 'neutral'} className="uppercase text-[10px]">
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-secondary">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-muted truncate max-w-[150px]" title={user.password}>
                                            {user.password ? user.password.substring(0, 15) + '...' : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="xs"
                                                icon={Trash2}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-8 h-8 p-0 grid place-items-center"
                                                onClick={() => setDeleteModal({ open: true, user })}
                                                title="Remove User"
                                            />
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-secondary">No users found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Add User Modal */}
            <Modal
                isOpen={addModal}
                onClose={() => setAddModal(false)}
                title="Create New User"
                size="sm"
            >
                <div className="space-y-4">
                    <Input
                        label="Username"
                        value={newUser.username}
                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                        placeholder="e.g. jdoe"
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Initial password"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
                        <Button onClick={handleAddUser}>Create User</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, user: null })}
                onConfirm={handleDeleteUser}
                title="Remove User?"
                message={`Are you sure you want to remove user "${deleteModal.user?.username}"? They will no longer be able to login.`}
                confirmText="Remove User"
                variant="danger"
            />
        </div>
    );
}
