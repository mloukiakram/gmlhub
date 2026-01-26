import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, Modal, ConfirmModal, Badge } from '../../components/ui';
import {
    Trash2, Check, Plus, Upload, Download, Undo2, Copy, Trash, Filter, RefreshCw,
    Database, Search, Edit, ArrowRight
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
    const [libraryModal, setLibraryModal] = useState(false);
    const [listModal, setListModal] = useState({ open: false, list: null });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, listId: null });
    const [vmtaModal, setVmtaModal] = useState({ open: false, vmtas: [], filterData: [] });

    // Search state for library
    const [librarySearch, setLibrarySearch] = useState('');

    // Form for list modal
    const [listForm, setListForm] = useState({ name: '', content: '' });

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            setSavedLists(JSON.parse(saved));
        }
    }, []);

    const saveListsToStorage = (lists) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
        setSavedLists(lists);
    };

    const filteredLists = savedLists.filter(l =>
        l.name.toLowerCase().includes(librarySearch.toLowerCase())
    );

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
                parsedData.push({ line: parseInt(match[2], 10), vmta: match[1].toLowerCase() });
            } else if (/^\d+$/.test(trimmed)) {
                parsedData.push({ line: parseInt(trimmed, 10), vmta: null });
            } else {
                const parts = trimmed.split(/[\s-]+/);
                const lastPart = parts[parts.length - 1];
                if (/^\d+$/.test(lastPart)) {
                    parsedData.push({ line: parseInt(lastPart, 10), vmta: null });
                }
            }
        });

        const uniqueData = Array.from(new Map(parsedData.map(item => [`${item.line}-${item.vmta}`, item])).values());
        return {
            type: 'number',
            data: uniqueData.sort((a, b) => a.line - b.line)
        };
    };

    const executeProcessing = (selectedVmta, filterDataArray, filterType) => {
        const sourceLines = sourceList.split('\n');
        const resultLines = [];
        const logDetails = [];

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
        let filterDesc = filterType === 'keyword' ? `${keywordFilterArray.length} keyword(s)` : `${numberFilterSet.size} line number(s)`;
        if (selectedVmta && selectedVmta !== 'null') filterDesc += ` for VMTA "${selectedVmta}"`;

        setLog([`--- PROCESSING SUMMARY ---`, `Action: ${mode.toUpperCase()} lines based on ${filterDesc}.`, `Lines Kept: ${resultLines.length}`, `Lines Removed: ${sourceLines.length - resultLines.length}`, updateMessage, `\n--- DETAILED LOG ---`, ...logDetails].join('\n').trim());
    };

    const processAndShow = () => {
        const parsedResult = parseFilterData();
        if (parsedResult.type === 'keyword' && parsedResult.data.length === 0) return alert("Filter data is empty.");
        if (parsedResult.data.length === 0) return alert("Filter data is empty.");

        if (parsedResult.type === 'keyword') return executeProcessing(null, parsedResult.data, 'keyword');

        const filterDataParsed = parsedResult.data;
        const vmtas = new Set(filterDataParsed.map(item => item.vmta).filter(vmta => vmta !== null));
        const uniqueVmtas = Array.from(vmtas);
        const hasNullVmta = filterDataParsed.some(item => item.vmta === null);

        if (uniqueVmtas.length + (hasNullVmta ? 1 : 0) > 1) {
            setVmtaModal({ open: true, vmtas: uniqueVmtas, hasNullVmta, filterData: filterDataParsed });
        } else {
            executeProcessing(uniqueVmtas.length === 1 ? uniqueVmtas[0] : (hasNullVmta ? 'null' : null), filterDataParsed, 'number');
        }
    };

    const handleUndo = () => {
        if (!lastActionState) return;
        const listIndex = savedLists.findIndex(l => l.id === lastActionState.listId);
        if (listIndex > -1) {
            const updatedLists = [...savedLists];
            updatedLists[listIndex].content = lastActionState.previousContent;
            saveListsToStorage(updatedLists);
            if (currentLoadedListId === lastActionState.listId) setSourceList(lastActionState.previousContent);
        }
        setLastActionState(null);
    };

    const handleSaveList = () => {
        if (!listForm.name.trim()) return alert('List name is required');
        const updatedLists = listModal.list
            ? savedLists.map(l => l.id === listModal.list.id ? { ...l, ...listForm } : l)
            : [...savedLists, { id: Date.now(), ...listForm }];
        saveListsToStorage(updatedLists);
        setListModal({ open: false, list: null });
    };

    const handleDeleteList = () => {
        saveListsToStorage(savedLists.filter(l => l.id !== deleteConfirm.listId));
        if (currentLoadedListId === deleteConfirm.listId) { setCurrentLoadedListId(null); setSourceList(''); }
        setDeleteConfirm({ open: false, listId: null });
    };

    const loadList = (list) => {
        setSourceList(list.content);
        setCurrentLoadedListId(list.id);
        setLibraryModal(false);
    };

    const copyResult = async () => {
        if (!result) return;
        await navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported) && confirm('Importing will overwrite existing lists. Are you sure?')) saveListsToStorage(imported);
            } catch { alert('Import failed.'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleExport = () => {
        if (savedLists.length === 0) return alert('No data to export.');
        const blob = new Blob([JSON.stringify(savedLists, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `aura-processor-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col bg-base transition-colors duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-base bg-surface transition-colors flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-main tracking-tight">Lines Processor</h1>
                        <p className="text-xs text-secondary font-medium">
                            Professional Line Management
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
                        List Library
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={Undo2}
                        disabled={!lastActionState}
                        onClick={handleUndo}
                        className="bg-surface hover:bg-surface-hover border-base"
                    >
                        Undo Last
                    </Button>
                </div>
            </div>

            {/* Content - MODERN SPLIT LAYOUT */}
            <div className="flex-1 overflow-hidden p-6 flex flex-col md:flex-row gap-6">

                {/* LEFT PANEL: INPUTS & CONTROLS */}
                <div className="flex-1 flex flex-col gap-6 min-w-0">

                    {/* Source List */}
                    <div className="flex-[3] flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden relative group transition-all hover:border-slate-400 [.dark_&]:hover:border-slate-600">
                        <div className="px-4 py-3 border-b border-base bg-base flex justify-between items-center">
                            <label className="text-xs font-bold text-main uppercase tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                1. Source List
                            </label>
                            <Badge variant="neutral" className="font-mono text-[10px]">
                                {sourceList.split('\n').filter(Boolean).length} lines
                            </Badge>
                        </div>
                        <textarea
                            value={sourceList}
                            onChange={(e) => {
                                setSourceList(e.target.value);
                                if (currentLoadedListId) setCurrentLoadedListId(null);
                            }}
                            className="flex-1 w-full p-4 bg-transparent text-sm font-mono text-main resize-none focus:outline-none placeholder:text-muted"
                            spellCheck={false}
                            placeholder="Paste your lines here..."
                        />
                    </div>

                    {/* Filter & Actions */}
                    <div className="flex-[2] flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden relative hover:border-slate-400 [.dark_&]:hover:border-slate-600 transition-all">
                        <div className="px-4 py-3 border-b border-base bg-base flex justify-between items-center">
                            <label className="text-xs font-bold text-main uppercase tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                2. Filter Configuration
                            </label>
                            <div className="flex bg-surface rounded-md border border-base p-0.5 shadow-sm">
                                <button
                                    onClick={() => setFilterBy('number')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${filterBy === 'number' ? 'bg-base text-main shadow-sm' : 'text-secondary hover:text-main'}`}
                                >
                                    Number
                                </button>
                                <button
                                    onClick={() => setFilterBy('keyword')}
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${filterBy === 'keyword' ? 'bg-base text-main shadow-sm' : 'text-secondary hover:text-main'}`}
                                >
                                    Keyword
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 relative flex flex-col">
                            <textarea
                                value={filterData}
                                onChange={(e) => setFilterData(e.target.value)}
                                className="flex-1 w-full p-4 bg-transparent text-sm font-mono text-main resize-none focus:outline-none placeholder:text-muted mb-16"
                                spellCheck={false}
                                placeholder="Paste filter numbers or keywords..."
                            />
                            {/* Action Bar Integrated at Bottom of Filter */}
                            <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                                <div className="flex bg-base p-1 rounded-lg border border-base">
                                    <button
                                        onClick={() => setMode('delete')}
                                        className={`px-3 py-2 rounded-md flex items-center justify-center transition-all ${mode === 'delete' ? 'bg-surface text-red-600 shadow-sm font-bold' : 'text-muted'}`}
                                        title="Delete Mode"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setMode('keep')}
                                        className={`px-3 py-2 rounded-md flex items-center justify-center transition-all ${mode === 'keep' ? 'bg-surface text-emerald-600 shadow-sm font-bold' : 'text-muted'}`}
                                        title="Keep Mode"
                                    >
                                        <Check size={16} />
                                    </button>
                                </div>
                                <Button
                                    onClick={processAndShow}
                                    className="flex-1 shadow-sm font-bold tracking-wide"
                                    icon={ArrowRight}
                                    iconPosition="right"
                                >
                                    {mode === 'delete' ? 'Delete Lines' : 'Keep Lines'}
                                    {currentLoadedListId && <span className="ml-1 opacity-70 font-normal text-xs">(Update)</span>}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: OUTPUT */}
                <div className="flex-1 flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden min-w-0">
                    <div className="px-4 py-3 border-b border-base bg-base flex justify-between items-center">
                        <label className="text-xs font-bold text-main uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            3. Result Output
                        </label>
                        <button
                            onClick={copyResult}
                            className={`p-1.5 rounded-md transition-all ${copied ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-base hover:bg-surface-hover text-secondary'}`}
                            title="Copy Result"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                    <textarea
                        value={result}
                        readOnly
                        className="flex-1 w-full p-4 bg-base text-main text-sm font-mono resize-none focus:outline-none"
                    />
                    <div className="h-40 border-t border-base bg-surface overflow-hidden flex flex-col">
                        <div className="px-4 py-2 border-b border-base text-[10px] font-bold text-secondary uppercase bg-base">Processing Log</div>
                        <textarea
                            value={log}
                            readOnly
                            className="flex-1 w-full p-3 bg-[#1e293b] text-xs font-mono text-slate-300 resize-none focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* List Library Modal */}
            <Modal
                isOpen={libraryModal}
                onClose={() => setLibraryModal(false)}
                title="Saved Lists Library"
                size="xl"
            >
                <div className="h-[500px] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <input
                            type="text"
                            placeholder="Search saved lists..."
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            className="w-64 h-9 px-3 bg-base border border-base rounded-md text-sm outline-none focus:border-blue-500 text-main"
                        />
                        <div className="flex gap-2">
                            <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
                            <Button variant="outline" size="sm" icon={Upload} onClick={() => document.getElementById('import-file').click()} className="border-base">Import</Button>
                            <Button variant="outline" size="sm" icon={Download} onClick={handleExport} className="border-base">Export</Button>
                            <Button size="sm" icon={Plus} onClick={() => {
                                setListForm({ name: '', content: '' });
                                setListModal({ open: true, list: null });
                            }}>New List</Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto border border-base rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-base sticky top-0 z-10 border-b border-base">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-secondary">List Name</th>
                                    <th className="px-4 py-3 font-semibold text-secondary">Line Count</th>
                                    <th className="px-4 py-3 text-right font-semibold text-secondary">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-base">
                                {filteredLists.map(list => (
                                    <tr key={list.id} className="hover:bg-surface-hover group">
                                        <td className="px-4 py-2.5 font-medium text-main">
                                            {list.name}
                                            {currentLoadedListId === list.id && <span className="ml-2 text-xs text-secondary">(Active)</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-secondary">{list.content.split('\n').filter(Boolean).length}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button size="xs" variant="outline" onClick={() => loadList(list)} className="border-base">Load</Button>
                                                <Button variant="outline" size="xs" icon={Edit} onClick={() => {
                                                    setListForm({ name: list.name, content: list.content });
                                                    setListModal({ open: true, list });
                                                }} className="border-base" />
                                                <Button variant="outline" size="xs" icon={Trash2} className="text-secondary hover:text-main border-base" onClick={() => setDeleteConfirm({ open: true, listId: list.id })} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLists.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-secondary">No lists found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Modal>

            {/* List Form Modal */}
            <Modal
                isOpen={listModal.open}
                onClose={() => setListModal({ open: false, list: null })}
                title={listModal.list ? 'Edit List' : 'Add New List'}
            >
                <div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-secondary uppercase mb-1">List Name</label>
                        <input
                            value={listForm.name}
                            onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                            className="w-full h-10 px-3 border border-base rounded outline-none focus:border-blue-500 bg-base text-main"
                            placeholder="e.g. My Project Domains"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-secondary uppercase mb-1">Content</label>
                        <textarea
                            value={listForm.content}
                            onChange={(e) => setListForm({ ...listForm, content: e.target.value })}
                            className="w-full h-40 p-3 border border-base rounded outline-none focus:border-blue-500 font-mono text-sm bg-base text-main"
                            placeholder="Paste lines here..."
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setListModal({ open: false, list: null })}>Cancel</Button>
                        <Button onClick={handleSaveList}>Save List</Button>
                    </div>
                </div>
            </Modal>

            {/* VMTA Selection Modal - MISSING FROM PREVIOUS VERSION */}
            <Modal
                isOpen={vmtaModal.open}
                onClose={() => setVmtaModal({ open: false, vmtas: [], filterData: [] })}
                title="Multiple VMTAs Detected"
            >
                <div className="space-y-4">
                    <p className="text-sm text-secondary text-center">
                        Your filter list contains lines for multiple VMTAs. Please choose which group to process.
                    </p>
                    <div className="border border-base rounded-lg max-h-60 overflow-y-auto divide-y divide-base">
                        {vmtaModal.vmtas.map((vmta, idx) => (
                            <button
                                key={vmta}
                                onClick={() => {
                                    executeProcessing(vmta, vmtaModal.filterData, 'number');
                                    setVmtaModal({ open: false, vmtas: [], filterData: [] });
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-surface-hover flex flex-col transition-colors"
                            >
                                <span className="font-bold text-main">VMTA: {vmta}</span>
                                <span className="text-xs text-secondary">Process lines extracted for this VMTA</span>
                            </button>
                        ))}
                        {vmtaModal.hasNullVmta && (
                            <button
                                onClick={() => {
                                    executeProcessing('null', vmtaModal.filterData, 'number');
                                    setVmtaModal({ open: false, vmtas: [], filterData: [] });
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-surface-hover flex flex-col transition-colors"
                            >
                                <span className="font-bold text-main">Generic (No VMTA)</span>
                                <span className="text-xs text-secondary">Process generic line numbers</span>
                            </button>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={() => setVmtaModal({ open: false, vmtas: [], filterData: [] })}>Cancel</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, listId: null })}
                onConfirm={handleDeleteList}
                title="Delete List"
                message="Are you sure you want to delete this list? This action cannot be undone."
                variant="danger"
            />
        </div>
    );
}
