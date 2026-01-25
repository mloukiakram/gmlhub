import { useState, useEffect } from 'react';
import { Card, Button, Modal, ConfirmModal, Badge } from '../../components/ui';
import {
    Plus, Search, Trash2, Copy, Check, Download, Upload,
    History, RefreshCw, Eye, Shield, Globe, Database, Settings, ArrowRight, Pencil
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

    // Modals
    const [libraryModal, setLibraryModal] = useState(false);
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

    const filteredServers = appData.servers.filter(s =>
        s?.name?.toLowerCase().includes(search.toLowerCase()) ||
        s?.ips?.toLowerCase().includes(search.toLowerCase())
    );

    const openServerModal = (server = null) => {
        if (server) {
            setServerForm({ name: server.name, ips: server.ips, domains: server.domains });
        } else {
            setServerForm({ name: '', ips: '', domains: '' });
        }
        setServerModal({ open: true, server });
    };

    const handleSaveServer = () => {
        if (!serverForm.name.trim()) return alert('Server name is required');
        const updatedServers = serverModal.server
            ? appData.servers.map(s => s.id === serverModal.server.id ? { ...s, ...serverForm } : s)
            : [...appData.servers, { id: Date.now(), ...serverForm }];
        saveData({ ...appData, servers: updatedServers });
        setServerModal({ open: false, server: null });
    };

    const handleDeleteServers = () => {
        const idsToDelete = new Set(deleteModal.serverIds.map(Number));
        const updatedServers = appData.servers.filter(s => !idsToDelete.has(s.id));
        if (idsToDelete.has(currentServerId)) { setCurrentServerId(null); setDomains(''); }
        saveData({ ...appData, servers: updatedServers });
        setDeleteModal({ open: false, serverIds: [] });
    };

    const loadServer = (server) => {
        setCurrentServerId(server.id);
        setDomains(server.domains);
        setLog(`Loaded server: <strong>${server.name}</strong>`);
        setLibraryModal(false);
    };

    const extractDomains = (text) => {
        return text.split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                if (line.includes('@')) {
                    const emailMatch = line.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/);
                    if (emailMatch) return emailMatch[0].split('@')[1].toLowerCase();
                }
                const domainMatch = line.match(DOMAIN_SEARCH_REGEX);
                if (domainMatch) return domainMatch[0].toLowerCase();
                return null;
            })
            .filter(Boolean);
    };

    const processDomains = () => {
        setStats([]);
        const getLines = (text) => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        let master = getLines(domains).map(l => l.trim().toLowerCase()).filter(l => DOMAIN_REGEX.test(l));
        const originalCount = master.length;

        if (deduplicateMaster) master = [...new Set(master)];

        if (master.length === 0) return alert('The domain list is empty or invalid.');

        const toRemoveSet = new Set(extractDomains(bouncedDomains));
        const keptList = master.filter(domain => !toRemoveSet.has(domain));
        const removedList = master.filter(domain => toRemoveSet.has(domain));

        setLastResults({ kept: keptList, removed: removedList });
        const updatedHistory = Array.from(new Set([...appData.bounceHistory, ...removedList]));

        if (currentServerId) {
            const updatedServers = appData.servers.map(s => s.id === currentServerId ? { ...s, domains: keptList.join('\n') } : s);
            saveData({ ...appData, servers: updatedServers, bounceHistory: updatedHistory });
            setDomains(keptList.join('\n'));
            setLog(`<strong>Saved.</strong> Server updated with ${keptList.length} domains.`);
        } else {
            saveData({ ...appData, bounceHistory: updatedHistory });
            setLog(`<strong>Done.</strong> Processed in manual mode.`);
        }
        setResultsModal(true);
    };

    const handlePreview = () => {
        const extracted = [...new Set(extractDomains(bouncedDomains))];
        if (extracted.length === 0) return alert('No valid domains found.');
        setLastResults({ ...lastResults, preview: extracted });
        setPreviewModal(true);
    };

    const copyToClipboard = async (text, type) => {
        await navigator.clipboard.writeText(text);
        setCopied(prev => ({ ...prev, [type]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
    };

    const downloadText = (text, filename) => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (confirm('Importing will overwrite existing data. Are you sure?')) saveData(imported);
            } catch { alert('Import failed.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `domain-cleaner-backup.json`; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col bg-base transition-colors duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-base bg-surface transition-colors flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-main tracking-tight">Bounce Cleaner</h1>
                        <p className="text-xs text-secondary font-medium">
                            Professional Domain Cleaning
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        icon={Database}
                        onClick={() => setLibraryModal(true)}
                        className="bg-surface hover:bg-surface-hover border-base"
                    >
                        Server Library
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={History}
                        onClick={() => setHistoryModal(true)}
                        className="bg-surface hover:bg-surface-hover border-base"
                    >
                        History
                    </Button>
                </div>
            </div>

            {/* Content - DENSE LAYOUT, NO SCROLLING */}
            <div className="flex-1 overflow-hidden p-6 flex gap-6">
                {/* Left Panel: Source */}
                <div className="flex-1 flex flex-col bg-surface rounded-lg border border-base shadow-none overflow-hidden">
                    <div className="px-4 py-3 border-b border-base bg-base flex justify-between items-center">
                        <label className="text-xs font-bold text-main flex items-center gap-2 uppercase tracking-wide">
                            <Globe size={14} className="text-secondary" />
                            Source List
                        </label>
                        <div className="flex gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-base rounded text-secondary border border-base">
                                {domains ? domains.split('\n').filter(Boolean).length : 0} lines
                            </span>
                            <button onClick={() => setDomains('')} className="p-1 hover:bg-surface-hover rounded text-secondary">
                                <RefreshCw size={12} />
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={domains}
                        onChange={(e) => setDomains(e.target.value)}
                        placeholder="Paste domains here..."
                        className="flex-1 w-full p-4 bg-transparent text-sm font-mono text-main resize-none focus:outline-none placeholder:text-muted"
                    />
                </div>

                {/* Right Panel: Bounced Input */}
                <div className="flex-1 flex flex-col bg-surface rounded-lg border border-base shadow-none overflow-hidden relative">
                    <div className="px-4 py-3 border-b border-base bg-base flex justify-between items-center">
                        <label className="text-xs font-bold text-main flex items-center gap-2 uppercase tracking-wide">
                            <Shield size={14} className="text-secondary" />
                            Bounced Input
                        </label>
                        <label className="flex items-center gap-1.5 text-[10px] font-medium text-secondary cursor-pointer select-none px-2 py-0.5 border border-transparent hover:border-base rounded">
                            <input
                                type="checkbox"
                                checked={deduplicateMaster}
                                onChange={(e) => setDeduplicateMaster(e.target.checked)}
                                className="w-3 h-3 rounded text-secondary border-base"
                            />
                            Dedupe Source
                        </label>
                    </div>
                    <textarea
                        value={bouncedDomains}
                        onChange={(e) => setBouncedDomains(e.target.value)}
                        placeholder="Paste bounced emails or return paths here..."
                        className="flex-1 w-full p-4 bg-transparent text-sm font-mono text-main resize-none focus:outline-none placeholder:text-muted"
                    />

                    {/* Action Bar Overlay - Simpler */}
                    <div className="absolute bottom-6 left-6 right-6">
                        <Button
                            icon={Trash2}
                            onClick={processDomains}
                            className="w-full shadow-sm"
                        >
                            Clean Domains & Save
                        </Button>
                    </div>
                </div>
            </div>

            {/* Library / Server Modal */}
            <Modal
                isOpen={libraryModal}
                onClose={() => setLibraryModal(false)}
                title="Server Library"
                size="xl"
            >
                <div className="h-[600px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <input
                            type="text"
                            placeholder="Search library..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64 h-9 px-3 bg-base border border-base rounded-md text-sm outline-none focus:border-blue-500 text-main"
                        />
                        <div className="flex gap-2">
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
                            <Button variant="outline" size="sm" icon={Upload} onClick={() => document.getElementById('import-file').click()} className="border-base">Import</Button>
                            <Button variant="outline" size="sm" icon={Download} onClick={handleExport} className="border-base">Export</Button>
                            <Button size="sm" icon={Plus} onClick={() => openServerModal()}>Add Server</Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto border border-base rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-base sticky top-0 z-10 border-b border-base">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-secondary">Server Name</th>
                                    <th className="px-4 py-3 font-semibold text-secondary">IPs / Domains</th>
                                    <th className="px-4 py-3 text-right font-semibold text-secondary">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base">
                                {filteredServers.map(server => (
                                    <tr key={server.id} className="hover:bg-surface-hover group">
                                        <td className="px-4 py-2.5 font-medium text-main">
                                            {server.name}
                                            {currentServerId === server.id && <span className="ml-2 text-xs text-secondary">(Active)</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-secondary">
                                            {server.ips.split('\n').filter(Boolean).length} IPs · {server.domains.split('\n').filter(Boolean).length} Domains
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="xs" variant="outline" onClick={() => loadServer(server)} className="border-base">Load</Button>
                                                <Button variant="outline" size="xs" icon={Pencil} onClick={() => openServerModal(server)} className="border-base" />
                                                <Button variant="outline" size="xs" icon={Trash2} className="text-secondary hover:text-main border-base" onClick={() => setDeleteModal({ open: true, serverIds: [server.id] })} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredServers.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-secondary">No servers found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            {/* Server Form Modal */}
            <Modal
                isOpen={serverModal.open}
                onClose={() => setServerModal({ open: false, server: null })}
                title={serverModal.server ? 'Edit Server' : 'Add New Server'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-secondary uppercase mb-1">Server Name</label>
                        <input
                            type="text"
                            value={serverForm.name}
                            onChange={e => setServerForm({ ...serverForm, name: e.target.value })}
                            className="w-full h-10 px-3 border border-base rounded bg-base outline-none focus:border-blue-500 text-main"
                            placeholder="e.g. sl2147"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-secondary uppercase mb-1">IP Addresses</label>
                        <textarea
                            value={serverForm.ips}
                            onChange={e => setServerForm({ ...serverForm, ips: e.target.value })}
                            className="w-full h-32 p-3 border border-base rounded bg-base outline-none focus:border-blue-500 font-mono text-sm text-main"
                            placeholder="192.168.1.1"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-secondary uppercase mb-1">Master Domain List</label>
                        <textarea
                            value={serverForm.domains}
                            onChange={e => setServerForm({ ...serverForm, domains: e.target.value })}
                            className="w-full h-32 p-3 border border-base rounded bg-base outline-none focus:border-blue-500 font-mono text-sm text-main"
                            placeholder="domain1.com"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setServerModal({ open: false, server: null })}>Cancel</Button>
                        <Button onClick={handleSaveServer}>Save Server</Button>
                    </div>
                </div>
            </Modal>

            {/* Results Modal */}
            <Modal
                isOpen={resultsModal}
                onClose={() => setResultsModal(false)}
                title="Cleaning Complete"
                size="lg"
            >
                <div className="flex flex-col gap-6 max-h-[600px] overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                        <div className="flex flex-col h-64 md:h-96">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-secondary uppercase">
                                    Kept Domains ({lastResults.kept.length})
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={() => copyToClipboard(lastResults.kept.join('\n'), 'kept')} className="text-xs text-blue-600 font-bold hover:underline">
                                        {copied.kept ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button onClick={() => downloadText(lastResults.kept.join('\n'), 'kept_domains.txt')} className="text-xs text-blue-600 font-bold hover:underline">
                                        Download
                                    </button>
                                </div>
                            </div>
                            <textarea
                                readOnly
                                value={lastResults.kept.join('\n')}
                                className="flex-1 w-full p-3 bg-base border border-base rounded text-sm font-mono resize-none focus:outline-none text-main"
                            />
                        </div>

                        <div className="flex flex-col h-64 md:h-96">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-secondary uppercase">
                                    Removed Domains ({lastResults.removed.length})
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={() => copyToClipboard(lastResults.removed.join('\n'), 'removed')} className="text-xs text-red-600 font-bold hover:underline">
                                        {copied.removed ? 'Copied!' : 'Copy'}
                                    </button>
                                    <button onClick={() => downloadText(lastResults.removed.join('\n'), 'removed_domains.txt')} className="text-xs text-red-600 font-bold hover:underline">
                                        Download
                                    </button>
                                </div>
                            </div>
                            <textarea
                                readOnly
                                value={lastResults.removed.join('\n')}
                                className="flex-1 w-full p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded text-sm font-mono resize-none focus:outline-none text-red-700 dark:text-red-400"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-base">
                        <Button onClick={() => setResultsModal(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* Preview Modal */}
            <Modal
                isOpen={previewModal}
                onClose={() => setPreviewModal(false)}
                title="Preview Extracted Domains"
                size="md"
            >
                <div className="flex flex-col h-[400px]">
                    <p className="text-sm text-secondary mb-2">
                        Found {lastResults.preview?.length || 0} unique domains in "Bounced Input".
                    </p>
                    <textarea
                        readOnly
                        value={lastResults.preview ? lastResults.preview.join('\n') : ''}
                        className="flex-1 w-full p-3 bg-base border border-base rounded text-sm font-mono resize-none focus:outline-none text-main"
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => copyToClipboard(lastResults.preview?.join('\n') || '', 'domains')}>Copy List</Button>
                        <Button onClick={() => setPreviewModal(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* History Modal */}
            <Modal
                isOpen={historyModal}
                onClose={() => setHistoryModal(false)}
                title="Global Bounce History"
                size="lg"
            >
                <div className="flex flex-col h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-secondary">
                            Total Bounced Domains: {appData.bounceHistory.length}
                        </p>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => {
                                if (confirm('Clear entire bounce history?')) saveData({ ...appData, bounceHistory: [] });
                            }}>Clear History</Button>
                        </div>
                    </div>
                    <textarea
                        readOnly
                        value={appData.bounceHistory.join('\n')}
                        className="flex-1 w-full p-3 bg-base border border-base rounded text-sm font-mono resize-none focus:outline-none text-main"
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => copyToClipboard(appData.bounceHistory.join('\n'), 'domains')}>Copy All</Button>
                        <Button onClick={() => setHistoryModal(false)}>Close</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, serverIds: [] })}
                onConfirm={handleDeleteServers}
                title="Delete Server(s)"
                message="Are you sure you want to delete the selected server(s)? This action cannot be undone."
                variant="danger"
            />
        </div>
    );
}
