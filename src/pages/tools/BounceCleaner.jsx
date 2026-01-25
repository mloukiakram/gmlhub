import { useState, useEffect } from 'react';
import { Card, Button, Modal, ConfirmModal, Badge } from '../../components/ui';
import {
    Plus, Search, Trash2, Copy, Check, Download, Upload, Server, Edit,
    ArrowDown, History, RefreshCw, Eye
} from 'lucide-react';

const STORAGE_KEY = 'domainCleanerDataV8';
const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,63}$/;
const DOMAIN_SEARCH_REGEX = /(?!:\/\/)([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,63}/;

export default function BounceCleaner() {
    // Data state
    const [appData, setAppData] = useState({ servers: [], bounceHistory: [] });
    const [currentServerId, setCurrentServerId] = useState(null);

    // UI state
    const [search, setSearch] = useState('');
    const [domains, setDomains] = useState('');
    const [bouncedDomains, setBouncedDomains] = useState('');
    const [deduplicateMaster, setDeduplicateMaster] = useState(false);
    const [log, setLog] = useState('Ready.');
    const [stats, setStats] = useState([]);
    const [lastResults, setLastResults] = useState({ kept: [], removed: [] });
    const [copied, setCopied] = useState({ domains: false, kept: false, removed: false });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    // Modals
    const [serverModal, setServerModal] = useState({ open: false, server: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, serverIds: [] });
    const [resultsModal, setResultsModal] = useState(false);
    const [previewModal, setPreviewModal] = useState(false);
    const [historyModal, setHistoryModal] = useState(false);

    // Server form
    const [serverForm, setServerForm] = useState({ name: '', ips: '', domains: '' });

    // Load data from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setAppData(JSON.parse(saved));
        }
    }, []);

    // Save data to localStorage
    const saveData = (newData) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        setAppData(newData);
    };

    // Filter and paginate servers
    const filteredServers = appData.servers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.ips.toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = itemsPerPage === 'all' ? 1 : Math.ceil(filteredServers.length / itemsPerPage);
    const paginatedServers = itemsPerPage === 'all'
        ? filteredServers
        : filteredServers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Server CRUD
    const openServerModal = (server = null) => {
        if (server) {
            setServerForm({ name: server.name, ips: server.ips, domains: server.domains });
        } else {
            setServerForm({ name: '', ips: '', domains: '' });
        }
        setServerModal({ open: true, server });
    };

    const handleSaveServer = () => {
        if (!serverForm.name.trim()) {
            alert('Server name is required');
            return;
        }

        let updatedServers;
        if (serverModal.server) {
            updatedServers = appData.servers.map(s =>
                s.id === serverModal.server.id ? { ...s, ...serverForm } : s
            );
        } else {
            updatedServers = [...appData.servers, { id: Date.now(), ...serverForm }];
        }

        saveData({ ...appData, servers: updatedServers });
        setServerModal({ open: false, server: null });
    };

    const handleDeleteServers = () => {
        const idsToDelete = new Set(deleteModal.serverIds.map(Number));
        const updatedServers = appData.servers.filter(s => !idsToDelete.has(s.id));

        if (idsToDelete.has(currentServerId)) {
            setCurrentServerId(null);
            setDomains('');
        }

        saveData({ ...appData, servers: updatedServers });
        setDeleteModal({ open: false, serverIds: [] });
    };

    const loadServer = (server) => {
        setCurrentServerId(server.id);
        setDomains(server.domains);
        setLog(`Loaded server: <strong>${server.name}</strong>`);
    };

    // Extract domains from bounce list
    const extractDomains = (text) => {
        return text.split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                // Check for email first
                if (line.includes('@')) {
                    const emailMatch = line.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/);
                    if (emailMatch) return emailMatch[0].split('@')[1].toLowerCase();
                }
                // Search for any domain in the line
                const domainMatch = line.match(DOMAIN_SEARCH_REGEX);
                if (domainMatch) return domainMatch[0].toLowerCase();
                return null;
            })
            .filter(Boolean);
    };

    // Process domains
    const processDomains = () => {
        setStats([]);

        const getLines = (text) => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        let master = getLines(domains).map(l => l.trim().toLowerCase()).filter(l => DOMAIN_REGEX.test(l));
        const originalCount = master.length;

        if (deduplicateMaster) {
            master = [...new Set(master)];
        }
        const deduplicatedCount = master.length;

        if (master.length === 0) {
            alert('The domain list is empty or invalid.');
            return;
        }

        const toRemoveSet = new Set(extractDomains(bouncedDomains));
        const keptList = master.filter(domain => !toRemoveSet.has(domain));
        const removedList = master.filter(domain => toRemoveSet.has(domain));

        setLastResults({ kept: keptList, removed: removedList });

        // Update bounce history
        const historySet = new Set(appData.bounceHistory);
        removedList.forEach(domain => historySet.add(domain));
        const updatedHistory = Array.from(historySet);

        // Update server if loaded
        if (currentServerId) {
            const updatedServers = appData.servers.map(s =>
                s.id === currentServerId ? { ...s, domains: keptList.join('\n') } : s
            );
            saveData({ ...appData, servers: updatedServers, bounceHistory: updatedHistory });
            setDomains(keptList.join('\n'));
            setLog(`<strong>Saved.</strong> Server updated with ${keptList.length} domains.`);
        } else {
            saveData({ ...appData, bounceHistory: updatedHistory });
            setLog(`<strong>Done.</strong> Processed in manual mode (not saved).`);
        }

        // Stats
        const newStats = [{ label: `Original: ${originalCount}`, type: null }];
        if (deduplicateMaster && originalCount !== deduplicatedCount) {
            newStats.push({ label: `Deduplicated: ${deduplicatedCount}`, type: null });
        }
        newStats.push({ label: `Removed: ${removedList.length}`, type: 'removed' });
        newStats.push({ label: `Kept: ${keptList.length}`, type: 'kept' });
        setStats(newStats);

        setResultsModal(true);
    };

    // Preview extracted domains
    const handlePreview = () => {
        const extracted = [...new Set(extractDomains(bouncedDomains))];
        if (extracted.length === 0) {
            alert('No valid domains found in the bounce list.');
            return;
        }
        setLastResults({ ...lastResults, preview: extracted });
        setPreviewModal(true);
    };

    // Copy helper
    const copyToClipboard = async (text, type) => {
        await navigator.clipboard.writeText(text);
        setCopied(prev => ({ ...prev, [type]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
    };

    // Download helper
    const downloadText = (text, filename) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import/Export
    const handleExport = () => {
        const dataStr = JSON.stringify(appData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `domain-cleaner-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (confirm('Importing will overwrite existing data. Are you sure?')) {
                    saveData(imported);
                }
            } catch {
                alert('Import failed. Invalid file format.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const clearHistory = () => {
        if (confirm('Clear all bounce history?')) {
            saveData({ ...appData, bounceHistory: [] });
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#e8ecf0] bg-white">
                <h1 className="text-xl font-semibold text-[#1a1d21]">Bounce Domain Cleaner</h1>
                <p className="text-sm text-[#5e6674] mt-0.5">
                    Remove bounced domains from your server domain lists
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fafbfc]">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Server Management */}
                    <Card>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#e8ecf0]">
                            <h3 className="font-semibold text-[#1a1d21]">Your Servers</h3>
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    className="hidden"
                                    id="import-file"
                                />
                                <Button variant="outline" size="sm" icon={Upload} onClick={() => document.getElementById('import-file').click()}>
                                    Import
                                </Button>
                                <Button variant="outline" size="sm" icon={Download} onClick={handleExport}>
                                    Export
                                </Button>
                                <Button size="sm" icon={Plus} onClick={() => openServerModal()}>
                                    Add Server
                                </Button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                            <input
                                type="text"
                                placeholder="Search servers by name or IP..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                            />
                        </div>

                        {/* Server Table */}
                        {paginatedServers.length === 0 ? (
                            <p className="text-sm text-[#6b7280] text-center py-8">
                                No servers found. Add one to get started.
                            </p>
                        ) : (
                            <div className="border border-[#e8ecf0] rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-[#f9fafb]">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#5e6674] uppercase">Server Name</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#5e6674] uppercase">IPs</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#5e6674] uppercase">Domains</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-[#5e6674] uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedServers.map(server => (
                                            <tr
                                                key={server.id}
                                                className={`border-t border-[#f3f4f6] hover:bg-[#f9fafb] ${currentServerId === server.id ? 'bg-[#eff6ff]' : ''
                                                    }`}
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-[#1a1d21]">{server.name}</td>
                                                <td className="px-4 py-3 text-sm text-[#6b7280]">
                                                    {server.ips.split('\n').filter(Boolean).length || 0}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-[#6b7280]">
                                                    {server.domains.split('\n').filter(Boolean).length || 0}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="primary" size="sm" icon={ArrowDown} onClick={() => loadServer(server)}>
                                                            Load
                                                        </Button>
                                                        <Button variant="outline" size="sm" icon={Copy} onClick={() => copyToClipboard(server.domains, 'domains')}>
                                                            {copied.domains ? <Check size={14} /> : null}
                                                        </Button>
                                                        <Button variant="outline" size="sm" icon={Edit} onClick={() => openServerModal(server)} />
                                                        <Button variant="outline" size="sm" icon={Trash2} onClick={() => setDeleteModal({ open: true, serverIds: [server.id] })} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {filteredServers.length > 5 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#e8ecf0]">
                                <span className="text-sm text-[#6b7280]">
                                    {filteredServers.length} servers
                                </span>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="h-9 px-3 border border-[#e5e7eb] rounded-lg text-sm"
                                    >
                                        <option value={5}>5 per page</option>
                                        <option value={10}>10 per page</option>
                                        <option value={25}>25 per page</option>
                                        <option value="all">All</option>
                                    </select>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Domain Processing */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* File Domain List */}
                        <Card>
                            <label className="block text-sm font-medium text-[#374151] mb-3">File Domain List</label>
                            <textarea
                                value={domains}
                                onChange={(e) => setDomains(e.target.value)}
                                placeholder="Load a server or paste domains here."
                                className="w-full h-64 px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                            />
                            <div className="flex items-center gap-2 mt-3">
                                <Button variant="outline" size="sm" icon={Copy} onClick={() => copyToClipboard(domains, 'domains')}>
                                    Copy
                                </Button>
                                <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setDomains('')}>
                                    Clear
                                </Button>
                            </div>
                            <p className="text-xs text-[#9ca3af] mt-3">
                                Changes will be saved to the loaded server upon processing.
                            </p>
                        </Card>

                        {/* Bounced Domains */}
                        <Card>
                            <label className="block text-sm font-medium text-[#374151] mb-3">Bounced Domains</label>
                            <textarea
                                value={bouncedDomains}
                                onChange={(e) => setBouncedDomains(e.target.value)}
                                placeholder="return@bounced.com&#10;another-bounced.com"
                                className="w-full h-64 px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                            />
                            <div className="flex items-center gap-2 mt-3">
                                <Button icon={Trash2} onClick={processDomains}>
                                    Remove Bounced & Save
                                </Button>
                                <Button variant="outline" size="sm" icon={Eye} onClick={handlePreview}>
                                    Preview
                                </Button>
                                <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setBouncedDomains('')}>
                                    Clear
                                </Button>
                            </div>
                            <label className="flex items-center gap-2 mt-3 text-sm text-[#6b7280] cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={deduplicateMaster}
                                    onChange={(e) => setDeduplicateMaster(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                Deduplicate master list
                            </label>
                        </Card>
                    </div>

                    {/* Logs & Stats */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[#1a1d21]">Logs & Stats</h3>
                            <Button variant="outline" size="sm" icon={History} onClick={() => setHistoryModal(true)}>
                                View Bounce History
                            </Button>
                        </div>
                        <div
                            className="bg-[#f9fafb] border border-[#e8ecf0] rounded-lg p-4 text-sm text-[#5e6674] min-h-[100px]"
                            dangerouslySetInnerHTML={{ __html: log }}
                        />
                        {stats.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {stats.map((stat, i) => (
                                    <span
                                        key={i}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${stat.type === 'removed'
                                                ? 'bg-[#fef2f2] text-[#ef4444]'
                                                : stat.type === 'kept'
                                                    ? 'bg-[#ecfdf5] text-[#10b981]'
                                                    : 'bg-[#f3f4f6] text-[#6b7280]'
                                            }`}
                                    >
                                        {stat.label}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Server Modal */}
            <Modal
                isOpen={serverModal.open}
                onClose={() => setServerModal({ open: false, server: null })}
                title={serverModal.server ? 'Edit Server' : 'Add New Server'}
                size="lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                            Server Name (Envoi)
                        </label>
                        <input
                            type="text"
                            value={serverForm.name}
                            onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                            placeholder="e.g., sl2147"
                            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                                IPs (one per line)
                            </label>
                            <textarea
                                value={serverForm.ips}
                                onChange={(e) => setServerForm({ ...serverForm, ips: e.target.value })}
                                placeholder="192.168.1.1"
                                rows={6}
                                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm font-mono focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                                Master Domain List
                            </label>
                            <textarea
                                value={serverForm.domains}
                                onChange={(e) => setServerForm({ ...serverForm, domains: e.target.value })}
                                placeholder="domain1.com (Optional)"
                                rows={6}
                                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm font-mono focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setServerModal({ open: false, server: null })} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveServer} className="flex-1">
                            Save Server
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, serverIds: [] })}
                onConfirm={handleDeleteServers}
                title="Delete Server"
                message="Are you sure you want to delete this server? This cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            {/* Results Modal */}
            <Modal
                isOpen={resultsModal}
                onClose={() => setResultsModal(false)}
                title="Cleaning Complete!"
                size="lg"
            >
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-[#374151]">
                                Kept Domains ({lastResults.kept.length})
                            </label>
                        </div>
                        <textarea
                            value={lastResults.kept.join('\n')}
                            readOnly
                            className="w-full h-48 px-4 py-3 bg-[#f9fafb] border border-[#e8ecf0] rounded-lg text-sm font-mono resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                            <Button size="sm" icon={copied.kept ? Check : Copy} onClick={() => copyToClipboard(lastResults.kept.join('\n'), 'kept')}>
                                Copy
                            </Button>
                            <Button variant="outline" size="sm" icon={Download} onClick={() => downloadText(lastResults.kept.join('\n'), 'kept-domains.txt')}>
                                Download
                            </Button>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-[#374151]">
                                Removed Domains ({lastResults.removed.length})
                            </label>
                        </div>
                        <textarea
                            value={lastResults.removed.join('\n')}
                            readOnly
                            className="w-full h-48 px-4 py-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg text-sm font-mono resize-none text-[#b91c1c]"
                        />
                        <div className="flex gap-2 mt-2">
                            <Button size="sm" icon={copied.removed ? Check : Copy} onClick={() => copyToClipboard(lastResults.removed.join('\n'), 'removed')}>
                                Copy
                            </Button>
                            <Button variant="outline" size="sm" icon={Download} onClick={() => downloadText(lastResults.removed.join('\n'), 'removed-domains.txt')}>
                                Download
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={previewModal}
                onClose={() => setPreviewModal(false)}
                title="Preview Extracted Domains"
            >
                <p className="text-sm text-[#6b7280] mb-4">
                    Unique domains from the 'Bounced' list.
                </p>
                <textarea
                    value={lastResults.preview?.join('\n') || ''}
                    readOnly
                    className="w-full h-48 px-4 py-3 bg-[#f9fafb] border border-[#e8ecf0] rounded-lg text-sm font-mono resize-none"
                />
                <div className="flex gap-3 mt-4">
                    <Button icon={Copy} onClick={() => copyToClipboard(lastResults.preview?.join('\n') || '', 'preview')}>
                        Copy
                    </Button>
                    <Button variant="secondary" onClick={() => setPreviewModal(false)}>
                        Close
                    </Button>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal
                isOpen={historyModal}
                onClose={() => setHistoryModal(false)}
                title="Global Bounce History"
            >
                <p className="text-sm text-[#6b7280] mb-4">
                    This is a list of every domain that has ever been removed.
                </p>
                <textarea
                    value={appData.bounceHistory.join('\n')}
                    readOnly
                    className="w-full h-48 px-4 py-3 bg-[#f9fafb] border border-[#e8ecf0] rounded-lg text-sm font-mono resize-none"
                />
                <div className="flex gap-3 mt-4">
                    <Button variant="danger" size="sm" icon={Trash2} onClick={clearHistory}>
                        Clear History
                    </Button>
                    <Button size="sm" icon={Copy} onClick={() => copyToClipboard(appData.bounceHistory.join('\n'), 'history')}>
                        Copy
                    </Button>
                    <Button variant="secondary" onClick={() => setHistoryModal(false)}>
                        Close
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
