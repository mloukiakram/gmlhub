import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, IconButton, Modal, ConfirmModal, Textarea, Badge, EmptyState, Tooltip } from '../../components/ui';
import {
    Plus, Search, Monitor as MonitorIcon, List, Pencil, Trash2, Server,
    RefreshCw, ChevronLeft, ChevronRight, Copy, Check, ExternalLink
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
    const queryClient = useQueryClient();

    // State
    const [search, setSearch] = useState('');
    const [expandedSessionId, setExpandedSessionId] = useState(null);

    // Modals
    const [sessionModal, setSessionModal] = useState({ open: false, session: null });
    const [ipsModal, setIpsModal] = useState({ open: false, session: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, session: null });

    // React Query: Fetch Sessions
    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            return data.success ? data.data : [];
        }
    });

    // Mutations
    const createSessionMutation = useMutation({
        mutationFn: async (body) => {
            const res = await fetch(`${API_BASE}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries(['sessions']);
                showToast('Session created', 'success');
                setSessionModal({ open: false, session: null });
            } else {
                showToast(data.message, 'error');
            }
        }
    });

    const updateSessionMutation = useMutation({
        mutationFn: async ({ id, ...body }) => {
            const res = await fetch(`${API_BASE}/sessions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries(['sessions']);
                showToast('Session updated', 'success');
                setSessionModal({ open: false, session: null });
            } else {
                showToast(data.message, 'error');
            }
        }
    });

    const deleteSessionMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`${API_BASE}/sessions/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.json();
        },
        onSuccess: (data, id) => {
            if (data.success) {
                queryClient.invalidateQueries(['sessions']);
                showToast('Session deleted', 'success');
                setDeleteConfirm({ open: false, session: null });
                if (expandedSessionId === id) setExpandedSessionId(null);
            }
        }
    });

    // Stats
    const totalSessions = sessions.length;
    const totalIps = sessions.reduce((sum, s) => sum + (s.ip_count || 0), 0);

    // Filter
    const filteredSessions = sessions.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.session_id?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-base transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-base bg-surface transition-colors duration-300">
                <div>
                    <h1 className="text-xl font-bold text-main tracking-tight">PMTA Monitor</h1>
                    <p className="text-sm text-secondary mt-0.5 font-medium">
                        {totalSessions} sessions · {totalIps} IPs monitored
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 pl-9 pr-4 w-[240px] bg-base border-none rounded-xl text-sm 
                                focus:ring-2 focus:ring-blue-500/20 text-main placeholder:text-muted
                                transition-all"
                        />
                    </div>
                    <Button icon={Plus} onClick={() => setSessionModal({ open: true, session: null })}>
                        New Session
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                {isLoading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-6 animate-pulse">
                                <div className="flex items-center gap-4">
                                    <div className="w-1 h-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <div className="flex-1">
                                        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                                        <div className="h-4 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
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
                        action={!search && <Button icon={Plus} onClick={() => setSessionModal({ open: true, session: null })}>New Session</Button>}
                    />
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence initial={false}>
                            {filteredSessions.map((session, index) => (
                                <SessionItem
                                    key={session.id}
                                    session={session}
                                    isExpanded={expandedSessionId === session.id}
                                    onToggleMonitor={() => setExpandedSessionId(contact => contact === session.id ? null : session.id)}
                                    onViewIps={() => setIpsModal({ open: true, session })}
                                    onEdit={() => setSessionModal({ open: true, session })}
                                    onDelete={() => setDeleteConfirm({ open: true, session })}
                                    token={token}
                                    showToast={showToast}
                                    index={index}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Session Modal */}
            <SessionFormModal
                isOpen={sessionModal.open}
                onClose={() => setSessionModal({ open: false, session: null })}
                session={sessionModal.session}
                user={user}
                onSubmit={async (data) => {
                    if (sessionModal.session) {
                        await updateSessionMutation.mutateAsync({ id: sessionModal.session.id, ...data });
                    } else {
                        await createSessionMutation.mutateAsync(data);
                    }
                }}
                isSubmitting={createSessionMutation.isPending || updateSessionMutation.isPending}
            />

            {/* IPs Modal */}
            {ipsModal.open && (
                <IpsModal
                    isOpen={ipsModal.open}
                    onClose={() => setIpsModal({ open: false, session: null })}
                    session={ipsModal.session}
                    token={token}
                    showToast={showToast}
                />
            )}

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, session: null })}
                onConfirm={() => deleteSessionMutation.mutate(deleteConfirm.session.id)}
                title="Delete Session"
                message={`Are you sure you want to delete "${deleteConfirm.session?.name}"? This action cannot be undone.`}
                confirmText="Delete Session"
                variant="danger"
            />
        </div>
    );
}

// Session Item Component
function SessionItem({ session, isExpanded, onToggleMonitor, onViewIps, onEdit, onDelete, token, showToast, index }) {
    const [monitorSettings, setMonitorSettings] = useState({ cols: 4, perPage: 12, page: 1, refreshKey: 0 });

    // React Query for IPs
    const { data: ips = [], isLoading: loadingIps } = useQuery({
        queryKey: ['ips', session.id],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/ips/${session.id}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            return data.success ? data.data : [];
        },
        enabled: isExpanded, // Only fetch when expanded
        staleTime: 1000 * 60, // Cache for 1 min
    });

    const totalPages = Math.ceil(ips.length / monitorSettings.perPage);
    const paginatedIps = ips.slice(
        (monitorSettings.page - 1) * monitorSettings.perPage,
        monitorSettings.page * monitorSettings.perPage
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`
                bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden
                hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm
                ${isExpanded ? 'ring-2 ring-blue-500/10 dark:ring-blue-500/20' : ''}
            `}
        >
            <div className="p-5 flex items-center gap-4">
                <div
                    className="w-1 h-14 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: session.color || '#2563eb' }}
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate text-base">{session.name}</h3>
                        <Badge variant="neutral" className="dark:bg-slate-800 dark:text-slate-300">{session.session_id}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        <Server size={14} />
                        <span>{session.ip_count || 0} IPs</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={isExpanded ? "primary" : "outline"}
                        size="sm"
                        icon={MonitorIcon}
                        onClick={onToggleMonitor}
                    >
                        {isExpanded ? 'Close Monitor' : 'Monitor'}
                    </Button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
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

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }} // Smooth spring-like ease
                        className="bg-slate-900 border-t border-slate-200 dark:border-slate-800 overflow-hidden"
                    >
                        <div className="p-6">
                            {/* Controls */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3 text-sm font-medium text-white">
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </div>
                                    <span className="tracking-wide">LIVE MONITOR · {ips.length} NODES</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/5 rounded-lg p-1 flex items-center gap-1 backdrop-blur-sm border border-white/10">
                                        {[2, 3, 4, 5, 6].map(n => (
                                            <button
                                                key={n}
                                                onClick={() => setMonitorSettings(s => ({ ...s, cols: n, page: 1 }))}
                                                className={`w-7 h-7 rounded text-xs font-bold transition-all ${monitorSettings.cols === n
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center bg-white/5 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-white/10">
                                        <select
                                            value={monitorSettings.perPage}
                                            onChange={e => setMonitorSettings(s => ({ ...s, perPage: Number(e.target.value), page: 1 }))}
                                            className="text-sm font-bold text-white bg-transparent outline-none cursor-pointer"
                                        >
                                            <option value="12" className="text-black">12 PER PAGE</option>
                                            <option value="24" className="text-black">24 PER PAGE</option>
                                            <option value="50" className="text-black">50 PER PAGE</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 backdrop-blur-sm border border-white/10">
                                        <button
                                            disabled={monitorSettings.page === 1}
                                            onClick={() => setMonitorSettings(s => ({ ...s, page: Math.max(1, s.page - 1) }))}
                                            className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30 text-white transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs font-bold text-white/70 min-w-[50px] text-center">
                                            {monitorSettings.page} / {totalPages || 1}
                                        </span>
                                        <button
                                            disabled={monitorSettings.page >= totalPages}
                                            onClick={() => setMonitorSettings(s => ({ ...s, page: Math.min(totalPages, s.page + 1) }))}
                                            className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30 text-white transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setMonitorSettings(s => ({ ...s, refreshKey: s.refreshKey + 1 }))}
                                        className="p-2 bg-white/5 hover:bg-blue-600 text-slate-300 hover:text-white rounded-lg transition-all border border-white/10 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-600/20"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>

                            {loadingIps ? (
                                <div className="h-64 flex items-center justify-center text-slate-500">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                                        <span className="text-sm font-medium">Connecting to nodes...</span>
                                    </div>
                                </div>
                            ) : paginatedIps.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/50">
                                    <Server size={32} className="mb-3 opacity-50" />
                                    <p>No IPs configured for this session</p>
                                </div>
                            ) : (
                                <div
                                    className="grid gap-4"
                                    style={{ gridTemplateColumns: `repeat(${monitorSettings.cols}, minmax(0, 1fr))` }}
                                >
                                    {paginatedIps.map((ip) => (
                                        <div
                                            key={`${ip.id}-${monitorSettings.refreshKey}`}
                                            className="bg-white rounded-lg overflow-hidden shadow-lg shadow-black/20 group"
                                        >
                                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-700 truncate max-w-[70%] group-hover:text-blue-600 transition-colors">
                                                    {ip.label || 'Server'}
                                                </span>
                                                <span className="text-[10px] font-mono bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {ip.ip}
                                                </span>
                                            </div>
                                            <div className="relative w-full h-[380px] bg-slate-100">
                                                <iframe
                                                    src={`http://${ip.ip}:8066?t=${monitorSettings.refreshKey}`}
                                                    className="w-full h-full border-none"
                                                    loading="lazy"
                                                    title={ip.ip}
                                                />
                                                <a
                                                    href={`http://${ip.ip}:8066`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Session Form Modal
function SessionFormModal({ isOpen, onClose, session, user, onSubmit, isSubmitting }) {
    const [formData, setFormData] = useState({
        session_id: session?.session_id || user?.username || '',
        name: session?.name || user?.username || '',
        color: session?.color || '#2563eb',
        raw_ips: ''
    });

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={session ? 'Edit Session' : 'New Session'} size="md">
            <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Session ID</label>
                        <input
                            value={formData.session_id}
                            onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                            className="w-full h-11 px-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Color Tag</label>
                        <div className="flex gap-2 mt-1">
                            {COLORS.slice(0, 5).map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => setFormData({ ...formData, color: c.value })}
                                    className={`w-7 h-7 rounded-lg transition-transform ${formData.color === c.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                                    style={{ backgroundColor: c.value }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Session Name</label>
                    <input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full h-11 px-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                </div>
                {!session && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Initial IPs (Optional)</label>
                        <Textarea
                            value={formData.raw_ips}
                            onChange={(e) => setFormData({ ...formData, raw_ips: e.target.value })}
                            placeholder="Label 192.168.1.1&#10;192.168.1.2"
                            rows={4}
                            className="font-mono text-sm"
                        />
                    </div>
                )}
                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button onClick={() => onSubmit(formData)} loading={isSubmitting} className="flex-1">
                        {session ? 'Save Changes' : 'Create Session'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// IPs Management Modal
function IpsModal({ isOpen, onClose, session, token, showToast }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('list');
    const [selectedIps, setSelectedIps] = useState([]);
    const [newIpsText, setNewIpsText] = useState('');

    // Fetch IPs
    const { data: ips = [] } = useQuery({
        queryKey: ['ips', session.id],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/ips/${session.id}`, { headers: { Authorization: `Bearer ${token}` } });
            return (await res.json()).data || [];
        }
    });

    // Mutations
    const addIpsMutation = useMutation({
        mutationFn: async (raw_ips) => {
            const res = await fetch(`${API_BASE}/ips`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ session_id: session.id, raw_ips })
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries(['ips', session.id]);
                queryClient.invalidateQueries(['sessions']);
                showToast(`Added ${data.data.added} IPs`, 'success');
                setNewIpsText('');
                setActiveTab('list');
            }
        }
    });

    const deleteIpsMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await fetch(`${API_BASE}/ips`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ip_ids: ids })
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['ips', session.id]);
            queryClient.invalidateQueries(['sessions']);
            showToast('IPs deleted', 'success');
            setSelectedIps([]);
        }
    });

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage IPs - ${session?.name}`} size="lg">
            <div className="flex flex-col h-[550px]">
                <div className="flex gap-6 border-b border-slate-200 dark:border-slate-700 mb-6">
                    {['list', 'add'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold capitalize transition-colors relative ${activeTab === tab ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab === 'list' ? `IP List (${ips.length})` : 'Add IPs'}
                            {activeTab === tab && (
                                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'list' ? (
                        <div className="flex-1 flex flex-col">
                            {/* Actions */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                    {selectedIps.length > 0 ? `${selectedIps.length} selected` : 'Select to manage'}
                                </div>
                                <div className="flex gap-2">
                                    {selectedIps.length > 0 && (
                                        <Button variant="danger" size="sm" icon={Trash2} onClick={() => deleteIpsMutation.mutate(selectedIps)}>
                                            Delete Selected
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" icon={Copy} onClick={() => {
                                        navigator.clipboard.writeText(ips.map(i => i.ip).join('\n'));
                                        showToast('Copied all IPs', 'success');
                                    }}>
                                        Copy All
                                    </Button>
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                                {ips.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <p>No IPs yet</p>
                                        <Button variant="link" onClick={() => setActiveTab('add')}>Add New IPs</Button>
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                            <tr>
                                                <th className="p-3 w-10"><input type="checkbox" onChange={(e) => setSelectedIps(e.target.checked ? ips.map(i => i.id) : [])} checked={selectedIps.length === ips.length && ips.length > 0} className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700" /></th>
                                                <th className="p-3 text-left font-bold text-slate-500 dark:text-slate-400">Label</th>
                                                <th className="p-3 text-left font-bold text-slate-500 dark:text-slate-400">IP Address</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {ips.map(ip => (
                                                <tr key={ip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-3"><input type="checkbox" checked={selectedIps.includes(ip.id)} onChange={(e) => setSelectedIps(prev => e.target.checked ? [...prev, ip.id] : prev.filter(id => id !== ip.id))} className="rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700" /></td>
                                                    <td className="p-3 font-medium text-slate-900 dark:text-white">{ip.label}</td>
                                                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{ip.ip}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <Textarea
                                value={newIpsText}
                                onChange={(e) => setNewIpsText(e.target.value)}
                                placeholder="Label 192.168.1.1&#10;192.168.1.2"
                                className="flex-1 font-mono resize-none text-sm dark:bg-slate-800 dark:text-white dark:border-slate-700"
                            />
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => addIpsMutation.mutate(newIpsText)} loading={addIpsMutation.isPending} size="lg">
                                    Add IPs
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
