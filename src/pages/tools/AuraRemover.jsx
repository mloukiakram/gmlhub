import { useState, useEffect } from 'react';
import { Card, Button, Modal, ConfirmModal, Badge } from '../../components/ui';
import {
    Trash2, Check, RefreshCw, Plus, Upload, Download, Undo2, Copy,
    FileText, Edit, X
} from 'lucide-react';

const STORAGE_KEY = 'auraLineProcessor_v1';

export default function AuraRemover() {
    // State
    const [mode, setMode] = useState('delete'); // 'delete' or 'keep'
    const [filterBy, setFilterBy] = useState('number'); // 'number' or 'keyword'
    const [sourceList, setSourceList] = useState('');
    const [filterData, setFilterData] = useState('');
    const [result, setResult] = useState('');
    const [log, setLog] = useState('');
    const [copied, setCopied] = useState(false);

    // Saved lists
    const [savedLists, setSavedLists] = useState([]);
    const [currentLoadedListId, setCurrentLoadedListId] = useState(null);
    const [lastActionState, setLastActionState] = useState(null);

    // Modals
    const [listModal, setListModal] = useState({ open: false, list: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, listId: null });
    const [vmtaModal, setVmtaModal] = useState({ open: false, vmtas: [], filterData: [] });

    // Form for list modal
    const [listForm, setListForm] = useState({ name: '', content: '' });

    // Load saved lists from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setSavedLists(JSON.parse(saved));
        }
    }, []);

    // Save lists to localStorage
    const saveListsToStorage = (lists) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
        setSavedLists(lists);
    };

    // Parse filter data
    const parseFilterData = () => {
        const rawText = filterData;

        if (filterBy === 'keyword') {
            return {
                type: 'keyword',
                data: rawText.split('\n').map(k => k.trim().toLowerCase()).filter(Boolean)
            };
        }

        const cleanedText = rawText.replace(/,/g, '\n');
        const lines = cleanedText.split('\n');
        const parsedData = [];

        const vmtaRegex = /^\d+(?:\.\d+){3}-([a-zA-Z0-9]+)-.*-(\d+)$/;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            const match = trimmed.match(vmtaRegex);
            if (match) {
                parsedData.push({
                    line: parseInt(match[2], 10),
                    vmta: match[1].toLowerCase()
                });
            } else if (/^\d+$/.test(trimmed)) {
                parsedData.push({
                    line: parseInt(trimmed, 10),
                    vmta: null
                });
            } else {
                const parts = trimmed.split(/[\s-]+/);
                const lastPart = parts[parts.length - 1];
                if (/^\d+$/.test(lastPart)) {
                    parsedData.push({
                        line: parseInt(lastPart, 10),
                        vmta: null
                    });
                }
            }
        });

        const uniqueData = Array.from(new Map(parsedData.map(item => [`${item.line}-${item.vmta}`, item])).values());
        return {
            type: 'number',
            data: uniqueData.sort((a, b) => a.line - b.line)
        };
    };

    // Execute processing
    const executeProcessing = (selectedVmta, filterDataArray, filterType) => {
        const sourceLines = sourceList.split('\n');
        const resultLines = [];
        const logDetails = [];

        // Save undo state
        if (currentLoadedListId) {
            const listIndex = savedLists.findIndex(l => l.id === currentLoadedListId);
            if (listIndex > -1) {
                setLastActionState({ listId: currentLoadedListId, previousContent: savedLists[listIndex].content });
            }
        } else {
            setLastActionState(null);
        }

        let numberFilterSet;
        let keywordFilterArray;

        if (filterType === 'number') {
            const targetVmta = selectedVmta === 'null' ? null : selectedVmta;
            numberFilterSet = new Set(
                filterDataArray
                    .filter(item => item.vmta === targetVmta)
                    .map(item => item.line)
            );
        } else {
            keywordFilterArray = filterDataArray;
        }

        sourceLines.forEach((line, index) => {
            const currentLineNumber = index + 1;
            const lineContentLower = line.trim().toLowerCase();
            let shouldProcess = false;

            if (filterType === 'number') {
                shouldProcess = numberFilterSet.has(currentLineNumber);
            } else {
                shouldProcess = keywordFilterArray.some(keyword => lineContentLower.includes(keyword));
            }

            const keepLine = (mode === 'keep' && shouldProcess) || (mode === 'delete' && !shouldProcess);
            if (keepLine) {
                resultLines.push(line);
                logDetails.push(`Line ${currentLineNumber}: Kept     -> "${line.trim()}"`);
            } else {
                const logAction = mode === 'delete' ? 'DELETED' : 'Discarded';
                logDetails.push(`Line ${currentLineNumber}: ${logAction} -> "${line.trim()}"`);
            }
        });

        const finalContent = resultLines.join('\n');
        let updateMessage = "";

        if (currentLoadedListId) {
            const listIndex = savedLists.findIndex(l => l.id === currentLoadedListId);
            if (listIndex > -1) {
                const updatedLists = [...savedLists];
                updatedLists[listIndex].content = finalContent;
                saveListsToStorage(updatedLists);
                updateMessage = `\n✅ Saved list "${savedLists[listIndex].name}" was automatically updated.`;
            }
        }

        setResult(finalContent);

        let filterDesc = "";
        if (filterType === 'keyword') {
            filterDesc = `${keywordFilterArray.length} keyword(s)`;
        } else {
            filterDesc = `${numberFilterSet.size} line number(s)`;
            if (selectedVmta && selectedVmta !== 'null') {
                filterDesc += ` for VMTA "${selectedVmta}"`;
            }
        }

        setLog([
            `--- PROCESSING SUMMARY ---`,
            `Action: ${mode.toUpperCase()} lines based on ${filterDesc}.`,
            `Lines Kept: ${resultLines.length}`,
            `Lines Removed: ${sourceLines.length - resultLines.length}`,
            updateMessage,
            `\n--- DETAILED LOG ---`,
            ...logDetails
        ].join('\n').trim());
    };

    // Process button handler
    const processAndShow = () => {
        const parsedResult = parseFilterData();

        if (parsedResult.type === 'keyword') {
            if (parsedResult.data.length === 0) {
                alert("Filter data is empty. Nothing to process.");
                return;
            }
            executeProcessing(null, parsedResult.data, 'keyword');
            return;
        }

        const filterDataParsed = parsedResult.data;
        if (filterDataParsed.length === 0) {
            alert("Filter data is empty. Nothing to process.");
            return;
        }

        const vmtas = new Set(filterDataParsed.map(item => item.vmta).filter(vmta => vmta !== null));
        const uniqueVmtas = Array.from(vmtas);
        const hasNullVmta = filterDataParsed.some(item => item.vmta === null);
        const totalOptionGroups = uniqueVmtas.length + (hasNullVmta ? 1 : 0);

        if (totalOptionGroups > 1) {
            setVmtaModal({ open: true, vmtas: uniqueVmtas, hasNullVmta, filterData: filterDataParsed });
        } else {
            let selectedVmta = null;
            if (uniqueVmtas.length === 1) {
                selectedVmta = uniqueVmtas[0];
            } else if (hasNullVmta) {
                selectedVmta = 'null';
            }
            executeProcessing(selectedVmta, filterDataParsed, 'number');
        }
    };

    // Undo
    const handleUndo = () => {
        if (!lastActionState) return;
        const listIndex = savedLists.findIndex(l => l.id === lastActionState.listId);
        if (listIndex > -1) {
            const updatedLists = [...savedLists];
            updatedLists[listIndex].content = lastActionState.previousContent;
            saveListsToStorage(updatedLists);
            if (currentLoadedListId === lastActionState.listId) {
                setSourceList(lastActionState.previousContent);
            }
        }
        setLastActionState(null);
    };

    // List CRUD
    const openListModal = (list = null) => {
        if (list) {
            setListForm({ name: list.name, content: list.content });
        } else {
            setListForm({ name: '', content: '' });
        }
        setListModal({ open: true, list });
    };

    const handleSaveList = () => {
        if (!listForm.name.trim()) {
            alert('List name is required');
            return;
        }

        let updatedLists;
        if (listModal.list) {
            updatedLists = savedLists.map(l =>
                l.id === listModal.list.id ? { ...l, ...listForm } : l
            );
        } else {
            updatedLists = [...savedLists, { id: Date.now(), ...listForm }];
        }
        saveListsToStorage(updatedLists);
        setListModal({ open: false, list: null });
    };

    const handleDeleteList = () => {
        const updatedLists = savedLists.filter(l => l.id !== deleteConfirm.listId);
        saveListsToStorage(updatedLists);
        if (currentLoadedListId === deleteConfirm.listId) {
            setCurrentLoadedListId(null);
            setSourceList('');
        }
        setDeleteConfirm({ open: false, listId: null });
    };

    const loadList = (list) => {
        setSourceList(list.content);
        setCurrentLoadedListId(list.id);
    };

    // Import/Export
    const handleExport = () => {
        if (savedLists.length === 0) {
            alert('No saved lists to export.');
            return;
        }
        const dataStr = JSON.stringify(savedLists, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aura-processor-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
                if (Array.isArray(imported) && confirm('Importing will overwrite existing lists. Are you sure?')) {
                    saveListsToStorage(imported);
                }
            } catch {
                alert('Import failed. Invalid file format.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Copy result
    const copyResult = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getSourceLineCount = () => sourceList.split('\n').filter(Boolean).length;
    const getFilterLineCount = () => filterData.split('\n').filter(Boolean).length;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#e8ecf0] bg-white">
                <h1 className="text-xl font-semibold text-[#1a1d21]">Lines Processor</h1>
                <p className="text-sm text-[#5e6674] mt-0.5">
                    Process lines by deleting or keeping based on line numbers or keywords
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fafbfc]">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Controls */}
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                {/* Mode Toggle */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[#5e6674]">Mode</span>
                                    <div className="flex bg-[#f3f4f6] rounded-lg p-1">
                                        <button
                                            onClick={() => setMode('delete')}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'delete'
                                                    ? 'bg-white text-[#ef4444] shadow-sm'
                                                    : 'text-[#6b7280] hover:text-[#374151]'
                                                }`}
                                        >
                                            Delete
                                        </button>
                                        <button
                                            onClick={() => setMode('keep')}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'keep'
                                                    ? 'bg-white text-[#2563eb] shadow-sm'
                                                    : 'text-[#6b7280] hover:text-[#374151]'
                                                }`}
                                        >
                                            Keep
                                        </button>
                                    </div>
                                </div>

                                {/* Filter Toggle */}
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-[#5e6674]">Filter</span>
                                    <div className="flex bg-[#f3f4f6] rounded-lg p-1">
                                        <button
                                            onClick={() => setFilterBy('number')}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterBy === 'number'
                                                    ? 'bg-white text-[#1a1d21] shadow-sm'
                                                    : 'text-[#6b7280] hover:text-[#374151]'
                                                }`}
                                        >
                                            Line Number
                                        </button>
                                        <button
                                            onClick={() => setFilterBy('keyword')}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filterBy === 'keyword'
                                                    ? 'bg-white text-[#1a1d21] shadow-sm'
                                                    : 'text-[#6b7280] hover:text-[#374151]'
                                                }`}
                                        >
                                            Keyword
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Button
                                variant="secondary"
                                icon={Undo2}
                                disabled={!lastActionState}
                                onClick={handleUndo}
                            >
                                Undo
                            </Button>
                        </div>
                    </Card>

                    {/* Saved Lists */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-[#1a1d21]">Saved Lists</h3>
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
                                <Button size="sm" icon={Plus} onClick={() => openListModal()}>
                                    Add New List
                                </Button>
                            </div>
                        </div>

                        {savedLists.length === 0 ? (
                            <p className="text-sm text-[#6b7280] text-center py-6">
                                No saved lists. Add one to get started.
                            </p>
                        ) : (
                            <div className="border border-[#e8ecf0] rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-[#f9fafb]">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#5e6674] uppercase">Name</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-[#5e6674] uppercase">Lines</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-[#5e6674] uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {savedLists.map(list => (
                                            <tr
                                                key={list.id}
                                                className={`border-t border-[#f3f4f6] hover:bg-[#f9fafb] ${currentLoadedListId === list.id ? 'bg-[#eff6ff]' : ''
                                                    }`}
                                            >
                                                <td className="px-4 py-3 text-sm text-[#1a1d21]">{list.name}</td>
                                                <td className="px-4 py-3 text-sm text-[#6b7280]">
                                                    {list.content.split('\n').filter(Boolean).length}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="primary" size="sm" onClick={() => loadList(list)}>Load</Button>
                                                        <Button variant="outline" size="sm" onClick={() => openListModal(list)}>Edit</Button>
                                                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirm({ open: true, listId: list.id })}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Input/Output Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Source List */}
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-[#374151]">1. Source List</label>
                                <span className="text-xs text-[#9ca3af]">{getSourceLineCount()} lines</span>
                            </div>
                            <textarea
                                value={sourceList}
                                onChange={(e) => {
                                    setSourceList(e.target.value);
                                    if (currentLoadedListId) setCurrentLoadedListId(null);
                                }}
                                placeholder="Paste your source list here..."
                                className="w-full h-64 px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                            />
                        </Card>

                        {/* Filter Data */}
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-[#374151]">
                                    2. {filterBy === 'number' ? 'Line Numbers' : 'Keywords'} to Process
                                </label>
                                <span className="text-xs text-[#9ca3af]">{getFilterLineCount()} lines</span>
                            </div>
                            <textarea
                                value={filterData}
                                onChange={(e) => setFilterData(e.target.value)}
                                placeholder={filterBy === 'number'
                                    ? "1\n5\n10\nor\n192.168.1.1-gmail-foo-42"
                                    : "keyword1\nkeyword2"
                                }
                                className="w-full h-64 px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                            />
                        </Card>
                    </div>

                    {/* Process Button */}
                    <div className="flex justify-center">
                        <Button
                            variant={mode === 'delete' ? 'danger' : 'primary'}
                            size="lg"
                            icon={mode === 'delete' ? Trash2 : Check}
                            onClick={processAndShow}
                            className="min-w-[300px]"
                        >
                            {mode === 'delete' ? 'Delete' : 'Keep'} Lines
                            {currentLoadedListId && ' & Update List'}
                        </Button>
                    </div>

                    {/* Results */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-[#374151]">3. Final Result</label>
                                <Button variant="outline" size="sm" icon={copied ? Check : Copy} onClick={copyResult}>
                                    {copied ? 'Copied!' : 'Copy'}
                                </Button>
                            </div>
                            <textarea
                                value={result}
                                readOnly
                                className="w-full h-64 px-4 py-3 bg-[#1a1d21] text-[#10b981] rounded-xl text-sm font-mono resize-none outline-none"
                            />
                        </Card>

                        <Card>
                            <label className="block text-sm font-medium text-[#374151] mb-3">4. Processing Log</label>
                            <textarea
                                value={log}
                                readOnly
                                className="w-full h-64 px-4 py-3 bg-[#f9fafb] border border-[#e8ecf0] rounded-xl text-sm font-mono resize-none outline-none text-[#5e6674]"
                            />
                        </Card>
                    </div>
                </div>
            </div>

            {/* List Modal */}
            <Modal
                isOpen={listModal.open}
                onClose={() => setListModal({ open: false, list: null })}
                title={listModal.list ? 'Edit List' : 'Add New List'}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                            List Name
                        </label>
                        <input
                            type="text"
                            value={listForm.name}
                            onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                            placeholder="e.g., My Project Domains"
                            className="w-full h-11 px-4 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                            List Content
                        </label>
                        <textarea
                            value={listForm.content}
                            onChange={(e) => setListForm({ ...listForm, content: e.target.value })}
                            placeholder="domain1.com..."
                            rows={6}
                            className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg text-sm font-mono focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" onClick={() => setListModal({ open: false, list: null })} className="flex-1">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveList} className="flex-1">
                            Save List
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, listId: null })}
                onConfirm={handleDeleteList}
                title="Delete List"
                message="Are you sure you want to delete this list? This cannot be undone."
                confirmText="Delete"
                variant="danger"
            />

            {/* VMTA Selection Modal */}
            <Modal
                isOpen={vmtaModal.open}
                onClose={() => setVmtaModal({ open: false, vmtas: [], filterData: [] })}
                title="Multiple VMTAs Detected"
                size="sm"
            >
                <p className="text-sm text-[#5e6674] mb-4">
                    Your filter list contains lines for multiple VMTAs. Please choose which group to process.
                </p>
                <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                    {vmtaModal.vmtas?.map((vmta, i) => (
                        <label key={vmta} className="flex items-center gap-3 p-2 rounded hover:bg-[#f9fafb] cursor-pointer">
                            <input
                                type="radio"
                                name="vmta-select"
                                value={vmta}
                                defaultChecked={i === 0}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Process only "<strong>{vmta}</strong>" lines</span>
                        </label>
                    ))}
                    {vmtaModal.hasNullVmta && (
                        <label className="flex items-center gap-3 p-2 rounded hover:bg-[#f9fafb] cursor-pointer">
                            <input
                                type="radio"
                                name="vmta-select"
                                value="null"
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Process only lines with <strong>no VMTA</strong></span>
                        </label>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => setVmtaModal({ open: false, vmtas: [], filterData: [] })} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={() => {
                        const selected = document.querySelector('input[name="vmta-select"]:checked')?.value;
                        if (selected) {
                            executeProcessing(selected, vmtaModal.filterData, 'number');
                            setVmtaModal({ open: false, vmtas: [], filterData: [] });
                        }
                    }} className="flex-1">
                        Process Selected
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
