import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, IconButton, Card, Modal, ConfirmModal, Textarea, Badge, EmptyState, Tooltip } from '../../components/ui';
import {
    Plus,
    Search,
    Monitor as MonitorIcon,
    List,
    Pencil,
    Trash2,
    Server,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    Copy,
    Check
} from 'lucide-react';

const API_BASE = '/.netlify/functions';

// Color options for sessions
const COLORS = [
    { value: '#2563eb', label: 'Blue' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Amber' },
    { value: '#ef4444', label: 'Red' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#64748b', label: 'Slate' },
];

export default function PMTAMonitor() {
    const { token, user } = useAuth();
    const showToast = useToast();

    // State
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ total_sessions: 0, total_ips: 0 });

    // Modals
    const [sessionModal, setSessionModal] = useState({ open: false, session: null });
    const [ipsModal, setIpsModal] = useState({ open: false, session: null, ips: [], tab: 'list' });
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, session: null });

    // Form state
    const [form, setForm] = useState({ session_id: '', name: '', color: '#2563eb', raw_ips: '' });
    const [saving, setSaving] = useState(false);

    // Fetch sessions
    const fetchSessions = async () => {
        try {
            const res = await fetch(`${API_BASE}/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSessions(data.data || []);
                // Calculate stats
                const totalIps = (data.data || []).reduce((sum, s) => sum + (s.ip_count || 0), 0);
                setStats({
                    total_sessions: (data.data || []).length,
                    total_ips: totalIps
                });
            }
        } catch (err) {
            showToast('Failed to load sessions', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    // Filter sessions
    const filteredSessions = sessions.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.session_id?.toLowerCase().includes(search.toLowerCase())
    );

    // Create/Edit session
    const handleSaveSession = async () => {
        setSaving(true);
        try {
            const isEdit = !!sessionModal.session;
            const url = isEdit
                ? `${API_BASE}/sessions/${sessionModal.session.id}`
                : `${API_BASE}/sessions`;

            const body = isEdit
                ? { session_id: form.session_id, name: form.name, color: form.color }
                : { session_id: form.session_id, name: form.name, color: form.color, raw_ips: form.raw_ips };

            const res = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();

            if (data.success) {
                showToast(isEdit ? 'Session updated' : 'Session created', 'success');
                setSessionModal({ open: false, session: null });
                fetchSessions();
            } else {
                showToast(data.message || 'Failed to save', 'error');
            }
        } catch (err) {
            showToast('Failed to save session', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Delete session
    const handleDeleteSession = async () => {
        try {
            const res = await fetch(`${API_BASE}/sessions/${deleteConfirm.session.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                showToast('Session deleted', 'success');
                setDeleteConfirm({ open: false, session: null });
                if (expandedSessionId === deleteConfirm.session.id) {
                    setExpandedSessionId(null);
                }
                fetchSessions();
            }
        } catch (err) {
            showToast('Failed to delete session', 'error');
        }
    };

    // Fetch IPs for a session
    const fetchIps = async (session) => {
        try {
            const res = await fetch(`${API_BASE}/ips/${session.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                return data.data || [];
            }
        } catch (err) {
            showToast('Failed to load IPs', 'error');
        }
        return [];
    };

    // Open IPs modal
    const openIpsModal = async (session) => {
        const ips = await fetchIps(session);
        setIpsModal({ open: true, session, ips, tab: 'list' });
    };

    // Toggle monitor view
    const toggleMonitorView = async (session) => {
        if (expandedSessionId === session.id) {
            setExpandedSessionId(null);
        } else {
            setExpandedSessionId(session.id);
        }
    };

    // Open edit modal
    const openEditModal = (session) => {
        setForm({
            session_id: session.session_id || '',
            name: session.name || '',
            color: session.color || '#2563eb',
            raw_ips: ''
        });
        setSessionModal({ open: true, session });
    };

    // Open create modal
    const openCreateModal = () => {
        setForm({ session_id: user?.username || '', name: user?.username || '', color: '#2563eb', raw_ips: '' });
        setSessionModal({ open: true, session: null });
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#e8ecf0] bg-white">
                <div>
                    <h1 className="text-xl font-semibold text-[#1a1d21]">PMTA Monitor</h1>
                    <p className="text-sm text-[#5e6674] mt-0.5">
                        {stats.total_sessions} sessions · {stats.total_ips} IPs
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 pl-9 pr-4 w-[240px] border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all"
                        />
                    </div>
                    <Button icon={Plus} onClick={openCreateModal}>
                        New Session
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fafbfc]">
                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white border border-[#e8ecf0] rounded-xl p-5 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-1 h-12 rounded-full bg-[#e5e7eb]" />
                                    <div className="flex-1">
                                        <div className="h-5 w-32 bg-[#e5e7eb] rounded mb-2" />
                                        <div className="h-4 w-20 bg-[#f3f4f6] rounded" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <EmptyState
                        icon={Server}
                        title="No sessions found"
                        description={search ? "Try a different search term" : "Create your first session to get started"}
                        action={!search && <Button icon={Plus} onClick={openCreateModal}>New Session</Button>}
                    />
                ) : (
                    <div className="space-y-4">
                        {filteredSessions.map((session, index) => (
                            <SessionItem
                                key={session.id}
                                session={session}
                                isExpanded={expandedSessionId === session.id}
                                onToggleMonitor={() => toggleMonitorView(session)}
                                onViewIps={() => openIpsModal(session)}
                                onEdit={() => openEditModal(session)}
                                onDelete={() => setDeleteConfirm({ open: true, session })}
                                token={token}
                                showToast={showToast}
                                style={{ animationDelay: `${index * 50}ms` }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Session Modal */}
            <Modal
                isOpen={sessionModal.open}
                onClose={() => setSessionModal({ open: false, session: null })}
                title={sessionModal.session ? 'Edit Session' : 'New Session'}
                size="md"
            >
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                                Session ID
                            </label>
                            <input
                                value={form.session_id}
                                onChange={(e) => setForm({ ...form, session_id: e.target.value })}
                                placeholder="e.g., production-01"
                                className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                                Color
                            </label>
                            <div className="flex gap-2 mt-1">
                                {COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setForm({ ...form, color: c.value })}
                                        className={`
                                            w-7 h-7 rounded-lg transition-all
                                            ${form.color === c.value ? 'ring-2 ring-offset-2 ring-[#2563eb] scale-110' : 'hover:scale-110'}
                                        `}
                                        style={{ backgroundColor: c.value }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                            Name
                        </label>
                        <input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g., GML Production"
                            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                        />
                    </div>
                    {!sessionModal.session && (
                        <div>
                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                                Initial IPs (one per line)
                            </label>
                            <Textarea
                                value={form.raw_ips}
                                onChange={(e) => setForm({ ...form, raw_ips: e.target.value })}
                                placeholder="Label 192.168.1.1&#10;192.168.1.2"
                                rows={5}
                            />
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setSessionModal({ open: false, session: null })} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSession} loading={saving} className="flex-1">
                            {sessionModal.session ? 'Save Changes' : 'Create Session'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* IPs Modal */}
            <IpsModal
                isOpen={ipsModal.open}
                onClose={() => setIpsModal({ open: false, session: null, ips: [], tab: 'list' })}
                session={ipsModal.session}
                ips={ipsModal.ips}
                token={token}
                onRefresh={async () => {
                    const newIps = await fetchIps(ipsModal.session);
                    setIpsModal(prev => ({ ...prev, ips: newIps }));
                    fetchSessions();
                }}
                showToast={showToast}
            />

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, session: null })}
                onConfirm={handleDeleteSession}
                title="Delete Session"
                message={`Are you sure you want to delete "${deleteConfirm.session?.name}"? This will also delete all associated IPs.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}

// Session Item with embedded monitor
function SessionItem({ session, isExpanded, onToggleMonitor, onViewIps, onEdit, onDelete, token, showToast, style }) {
    const [ips, setIps] = useState([]);
    const [loadingIps, setLoadingIps] = useState(false);
    const [monitorSettings, setMonitorSettings] = useState({ cols: 4, perPage: 12, page: 1, refreshKey: 0 });

    useEffect(() => {
        if (isExpanded && ips.length === 0) {
            loadIps();
        }
    }, [isExpanded]);

    const loadIps = async () => {
        setLoadingIps(true);
        try {
            const res = await fetch(`/.netlify/functions/ips/${session.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setIps(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load IPs', err);
        } finally {
            setLoadingIps(false);
        }
    };

    const totalPages = Math.ceil(ips.length / monitorSettings.perPage);
    const paginatedIps = ips.slice(
        (monitorSettings.page - 1) * monitorSettings.perPage,
        monitorSettings.page * monitorSettings.perPage
    );

    return (
        <div
            className="bg-white border border-[#e8ecf0] rounded-xl overflow-hidden hover:border-[#d1d5db] transition-all animate-fade-in-up"
            style={{ boxShadow: 'var(--shadow-sm)', ...style }}
        >
            {/* Session Header */}
            <div className="p-5 flex items-center gap-4">
                {/* Color indicator */}
                <div
                    className="w-1 h-14 rounded-full flex-shrink-0"
                    style={{ backgroundColor: session.color || '#2563eb' }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-[#1a1d21] truncate">{session.name}</h3>
                        <Badge variant="neutral">{session.session_id}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#5e6674]">
                        <Server size={14} />
                        <span>{session.ip_count || 0} IPs</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={isExpanded ? "primary" : "outline"}
                        size="sm"
                        icon={MonitorIcon}
                        onClick={onToggleMonitor}
                    >
                        {isExpanded ? 'Close' : 'Monitor'}
                    </Button>
                    <Tooltip content="Manage IPs">
                        <IconButton icon={List} variant="outline" size="sm" onClick={onViewIps} />
                    </Tooltip>
                    <Tooltip content="Edit">
                        <IconButton icon={Pencil} variant="outline" size="sm" onClick={onEdit} />
                    </Tooltip>
                    <Tooltip content="Delete">
                        <IconButton icon={Trash2} variant="outline" size="sm" onClick={onDelete} />
                    </Tooltip>
                </div>
            </div>

            {/* Monitor View (Expanded) */}
            {isExpanded && (
                <div className="bg-[#1e293b] border-t border-[#e8ecf0] p-6 animate-fade-in">
                    {/* Monitor Controls */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live Monitor ({ips.length} Nodes)</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Columns selector */}
                            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                                {[2, 3, 4, 5, 6].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setMonitorSettings(s => ({ ...s, cols: n, page: 1 }))}
                                        className={`w-6 h-6 rounded text-xs font-bold transition-colors ${monitorSettings.cols === n ? 'bg-white text-[#1a1d21]' : 'text-white/50 hover:text-white'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>

                            {/* Per page */}
                            <div className="flex items-center bg-white/10 rounded-lg px-2 py-1">
                                <span className="text-xs font-bold text-white/50 mr-2">SHOW</span>
                                <select
                                    value={monitorSettings.perPage}
                                    onChange={e => setMonitorSettings(s => ({ ...s, perPage: Number(e.target.value), page: 1 }))}
                                    className="text-sm font-bold text-white bg-transparent focus:outline-none cursor-pointer"
                                >
                                    <option value="12">12</option>
                                    <option value="24">24</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center gap-1 bg-white/10 rounded-lg px-2 py-1">
                                <button
                                    disabled={monitorSettings.page === 1}
                                    onClick={() => setMonitorSettings(s => ({ ...s, page: Math.max(1, s.page - 1) }))}
                                    className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                >
                                    <ChevronLeft size={16} className="text-white" />
                                </button>
                                <span className="text-xs font-bold text-white/70 min-w-[40px] text-center">
                                    {monitorSettings.page}/{totalPages || 1}
                                </span>
                                <button
                                    disabled={monitorSettings.page >= totalPages}
                                    onClick={() => setMonitorSettings(s => ({ ...s, page: Math.min(totalPages, s.page + 1) }))}
                                    className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                                >
                                    <ChevronRight size={16} className="text-white" />
                                </button>
                            </div>

                            {/* Refresh */}
                            <button
                                onClick={() => setMonitorSettings(s => ({ ...s, refreshKey: s.refreshKey + 1 }))}
                                className="p-2 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* IPs Grid */}
                    {loadingIps ? (
                        <div className="text-center py-12 text-white/50">Loading...</div>
                    ) : paginatedIps.length === 0 ? (
                        <div className="text-center py-12 text-white/50">No IPs added to this session yet.</div>
                    ) : (
                        <div
                            className="grid gap-4"
                            style={{ gridTemplateColumns: `repeat(${monitorSettings.cols}, minmax(0, 1fr))` }}
                        >
                            {paginatedIps.map((ip, idx) => (
                                <div
                                    key={`${ip.id}-${monitorSettings.refreshKey}`}
                                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200"
                                >
                                    <div className="px-3 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[70%]">
                                            {ip.label || 'Server'}
                                        </span>
                                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                            {ip.ip}
                                        </span>
                                    </div>
                                    <iframe
                                        src={`http://${ip.ip}:8066?t=${monitorSettings.refreshKey}`}
                                        className="w-full h-[380px] bg-slate-50"
                                        loading="lazy"
                                        title={ip.ip}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// IPs Modal Component
function IpsModal({ isOpen, onClose, session, ips, token, onRefresh, showToast }) {
    const [newIps, setNewIps] = useState('');
    const [adding, setAdding] = useState(false);
    const [tab, setTab] = useState('list');
    const [editingIp, setEditingIp] = useState(null);
    const [editForm, setEditForm] = useState({ ip: '', label: '' });
    const [deleteList, setDeleteList] = useState([]);
    const [copied, setCopied] = useState(false);

    const handleAddIps = async () => {
        if (!newIps.trim()) return;
        setAdding(true);
        try {
            const res = await fetch(`/.netlify/functions/ips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ session_id: session.id, raw_ips: newIps })
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Added ${data.data?.added || 'new'} IPs`, 'success');
                setNewIps('');
                onRefresh();
            } else {
                showToast(data.message || 'Failed to add IPs', 'error');
            }
        } catch (err) {
            showToast('Failed to add IPs', 'error');
        } finally {
            setAdding(false);
        }
    };

    const handleEditIp = async () => {
        if (!editForm.ip.trim()) return;
        try {
            const res = await fetch(`/.netlify/functions/ips/${editingIp.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ip: editForm.ip, label: editForm.label })
            });
            const data = await res.json();
            if (data.success) {
                showToast('IP updated', 'success');
                setEditingIp(null);
                onRefresh();
            }
        } catch (err) {
            showToast('Failed to update IP', 'error');
        }
    };

    const handleDeleteIp = async (ipId) => {
        try {
            const res = await fetch(`/.netlify/functions/ips`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ip_id: ipId })
            });
            if (res.ok) {
                showToast('IP deleted', 'success');
                onRefresh();
            }
        } catch (err) {
            showToast('Failed to delete IP', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (deleteList.length === 0) return;
        try {
            const res = await fetch(`/.netlify/functions/ips`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ip_ids: deleteList })
            });
            if (res.ok) {
                showToast(`${deleteList.length} IPs deleted`, 'success');
                setDeleteList([]);
                onRefresh();
            }
        } catch (err) {
            showToast('Failed to delete IPs', 'error');
        }
    };

    const copyAllIps = () => {
        const text = ips.map(ip => ip.ip).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast('Copied to clipboard', 'success');
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage IPs - ${session?.name}`} size="lg">
            <div className="flex flex-col h-[500px]">
                {/* Tabs */}
                <div className="flex border-b border-[#e8ecf0] mb-4">
                    <button
                        onClick={() => setTab('list')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'list' ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-[#6b7280] hover:text-[#374151]'
                            }`}
                    >
                        IP List ({ips.length})
                    </button>
                    <button
                        onClick={() => setTab('add')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === 'add' ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-[#6b7280] hover:text-[#374151]'
                            }`}
                    >
                        Add / Edit
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {tab === 'list' && (
                        <div className="space-y-4">
                            {/* Actions bar */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {deleteList.length > 0 && (
                                        <Button variant="danger" size="sm" icon={Trash2} onClick={handleBulkDelete}>
                                            Delete ({deleteList.length})
                                        </Button>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={copyAllIps}>
                                    {copied ? 'Copied!' : 'Copy All'}
                                </Button>
                            </div>

                            {/* IP Table */}
                            <div className="border border-[#e8ecf0] rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-[#f9fafb] border-b border-[#e8ecf0]">
                                        <tr>
                                            <th className="p-3 w-10 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={deleteList.length === ips.length && ips.length > 0}
                                                    onChange={(e) => setDeleteList(e.target.checked ? ips.map(ip => ip.id) : [])}
                                                    className="w-4 h-4 rounded"
                                                />
                                            </th>
                                            <th className="p-3 text-left text-xs font-medium text-[#5e6674] uppercase">Label</th>
                                            <th className="p-3 text-left text-xs font-medium text-[#5e6674] uppercase">IP Address</th>
                                            <th className="p-3 text-right text-xs font-medium text-[#5e6674] uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f3f4f6]">
                                        {ips.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-[#6b7280]">
                                                    No IPs added yet. Go to "Add / Edit" to add some.
                                                </td>
                                            </tr>
                                        ) : ips.map(ip => (
                                            <tr key={ip.id} className="hover:bg-[#f9fafb] transition-colors">
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={deleteList.includes(ip.id)}
                                                        onChange={(e) => setDeleteList(prev =>
                                                            e.target.checked ? [...prev, ip.id] : prev.filter(id => id !== ip.id)
                                                        )}
                                                        className="w-4 h-4 rounded"
                                                    />
                                                </td>
                                                <td className="p-3 font-medium text-[#1a1d21]">{ip.label || 'Server'}</td>
                                                <td className="p-3 font-mono text-[#5e6674]">{ip.ip}</td>
                                                <td className="p-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <IconButton
                                                            icon={Pencil}
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingIp(ip);
                                                                setEditForm({ ip: ip.ip, label: ip.label || '' });
                                                                setTab('add');
                                                            }}
                                                        />
                                                        <IconButton
                                                            icon={Trash2}
                                                            size="sm"
                                                            onClick={() => handleDeleteIp(ip.id)}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'add' && (
                        <div className="space-y-6">
                            {/* Single IP form */}
                            <div className={`bg-[#f9fafb] p-5 rounded-xl border ${editingIp ? 'border-[#f59e0b]' : 'border-[#e8ecf0]'}`}>
                                <h4 className="text-sm font-semibold text-[#1a1d21] mb-4 flex items-center gap-2">
                                    {editingIp ? (
                                        <><Pencil size={14} className="text-[#f59e0b]" /> Edit IP</>
                                    ) : (
                                        <><Plus size={14} className="text-[#10b981]" /> Add Single IP</>
                                    )}
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-[#5e6674] mb-1">Label</label>
                                        <input
                                            value={editingIp ? editForm.label : ''}
                                            onChange={(e) => editingIp && setEditForm({ ...editForm, label: e.target.value })}
                                            placeholder="Server name"
                                            className="w-full h-10 px-3 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                                            disabled={!editingIp}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#5e6674] mb-1">IP Address</label>
                                        <input
                                            value={editingIp ? editForm.ip : ''}
                                            onChange={(e) => editingIp && setEditForm({ ...editForm, ip: e.target.value })}
                                            placeholder="192.168.1.1"
                                            className="w-full h-10 px-3 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                                            disabled={!editingIp}
                                        />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        {editingIp ? (
                                            <>
                                                <Button variant="secondary" onClick={() => setEditingIp(null)}>Cancel</Button>
                                                <Button onClick={handleEditIp}>Update</Button>
                                            </>
                                        ) : (
                                            <p className="text-xs text-[#6b7280]">Select an IP from the list to edit it.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bulk add */}
                            <div className="bg-[#f9fafb] p-5 rounded-xl border border-[#e8ecf0]">
                                <h4 className="text-sm font-semibold text-[#1a1d21] mb-4">Bulk Add</h4>
                                <Textarea
                                    value={newIps}
                                    onChange={(e) => setNewIps(e.target.value)}
                                    placeholder="Label 192.168.1.1&#10;192.168.1.2&#10;Another-Server 10.0.0.1"
                                    rows={5}
                                />
                                <div className="mt-4 flex justify-end">
                                    <Button onClick={handleAddIps} loading={adding}>
                                        Add IPs
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
