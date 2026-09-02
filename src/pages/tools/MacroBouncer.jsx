import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, Button, Modal, ConfirmModal, Badge, Tooltip } from '../../components/ui';
import {
    Server, Save, Download, Plus, Trash2, Copy, Check, RefreshCw, Power
} from 'lucide-react';

const API_BASE = '/.netlify/functions/macro-bouncer';
const IP_RE = /^((?:\d{1,3}\.){3}\d{1,3}|([a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4})$/i;

export default function MacroBouncer() {
    const { token } = useAuth();
    const showToast = useToast();

    // Data state
    const [teams, setTeams] = useState({ "Team A": [], "Team B": [] });
    const [currentTeam, setCurrentTeam] = useState('Team A');
    
    // UI state
    const [filter, setFilter] = useState('');
    const [editIdx, setEditIdx] = useState(null);
    const [editVal, setEditVal] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const addRef = useRef(null);

    // Derived state
    const ips = teams[currentTeam] || [];
    const visible = ips
        .map((ip, i) => ({ ip, i }))
        .filter(({ ip }) => ip.toLowerCase().includes(filter.toLowerCase()));

    // Load data
    const loadIPs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            
            if (res.ok && result.success && result.data && result.data.teams) {
                setTeams(result.data.teams);
                const teamKeys = Object.keys(result.data.teams);
                if (teamKeys.length > 0 && !teamKeys.includes(currentTeam)) {
                    setCurrentTeam(teamKeys[0]);
                }
                const total = Object.values(result.data.teams).reduce((sum, arr) => sum + arr.length, 0);
                showToast(`Loaded ${total} IPs across ${teamKeys.length} teams`, 'success');
            } else {
                showToast(result.message || 'Failed to load IPs', 'error');
            }
        } catch (err) {
            showToast('Network error while loading IPs', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIPs();
    }, []);

    // Save data
    const saveIPs = async () => {
        if (ips.length === 0) {
            showToast(`Nothing to save for ${currentTeam}`, 'error');
            return;
        }
        if (!window.confirm(`Save ${ips.length} IPs to server for ${currentTeam}?\nA backup will be created automatically.`)) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ team: currentTeam, ips })
            });
            const result = await res.json();
            
            if (res.ok && result.success) {
                showToast(result.message || `Saved IPs for ${currentTeam}`, 'success');
            } else {
                showToast(result.message || 'Failed to save IPs', 'error');
            }
        } catch (err) {
            showToast('Network error while saving IPs', 'error');
        } finally {
            setSaving(false);
        }
    };

    const restartPDNS = async () => {
        if (!window.confirm('Are you sure you want to restart PowerDNS (pdns) on the remote server?')) return;
        
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'restart_pdns' })
            });
            const result = await res.json();
            
            if (res.ok && result.success) {
                showToast(result.message || 'PowerDNS restarted successfully', 'success');
            } else {
                showToast(result.message || 'Failed to restart PowerDNS', 'error');
            }
        } catch (err) {
            showToast('Network error while restarting PowerDNS', 'error');
        } finally {
            setSaving(false);
        }
    };

    const updateCurrentTeamIps = (updater) => {
        setTeams(prev => {
            const current = prev[currentTeam] || [];
            const next = typeof updater === 'function' ? updater(current) : updater;
            return { ...prev, [currentTeam]: next };
        });
    };

    // Edit logic
    const startEdit = (i) => {
        setEditIdx(i);
        setEditVal(ips[i]);
    };

    const commitEdit = () => {
        if (editIdx === null) return;
        const val = editVal.trim();
        if (!IP_RE.test(val)) {
            showToast('Invalid IP address', 'error');
            return;
        }
        updateCurrentTeamIps(curr => {
            const arr = [...curr];
            arr[editIdx] = val;
            return arr;
        });
        setEditIdx(null);
    };

    const removeIP = (i) => {
        updateCurrentTeamIps(curr => {
            const arr = [...curr];
            arr.splice(i, 1);
            return arr;
        });
    };

    // Add logic
    const parseAndAdd = () => {
        if (!addRef.current) return;
        const raw = addRef.current.value;
        const parsed = [...raw.matchAll(/[a-f0-9.:]+/gi)]
            .map(m => m[0])
            .filter(ip => IP_RE.test(ip));
            
        if (parsed.length === 0) {
            showToast('No valid IPs found to add', 'error');
            return;
        }
        
        updateCurrentTeamIps(curr => {
            const set = new Set(curr);
            parsed.forEach(ip => set.add(ip));
            return Array.from(set);
        });
        
        showToast(`Added ${parsed.length} IPs`, 'success');
        addRef.current.value = '';
    };

    const replaceList = () => {
        if (!addRef.current) return;
        const raw = addRef.current.value;
        const parsed = [...raw.matchAll(/[a-f0-9.:]+/gi)]
            .map(m => m[0])
            .filter(ip => IP_RE.test(ip));
            
        if (parsed.length === 0) {
            showToast('No valid IPs found', 'error');
            return;
        }
        
        if (window.confirm(`Replace entire list for ${currentTeam} with ${parsed.length} IPs?`)) {
            const unique = Array.from(new Set(parsed));
            updateCurrentTeamIps(unique);
            showToast(`Replaced list with ${unique.length} IPs`, 'success');
            addRef.current.value = '';
        }
    };

    const copyAll = async () => {
        if (ips.length === 0) return;
        await navigator.clipboard.writeText(ips.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-base transition-colors duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-base bg-surface transition-colors flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-main tracking-tight flex items-center gap-2">
                            Macro SPF changer
                        </h1>
                        <p className="text-xs text-secondary font-medium">
                            Manage AUTHORIZED_IPS in the remote Python server
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={currentTeam}
                        onChange={(e) => setCurrentTeam(e.target.value)}
                        className="h-9 px-3 bg-base border border-base rounded-md text-sm outline-none focus:border-blue-500 text-main"
                    >
                        {Object.keys(teams).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-6 flex gap-6">
                
                {/* Left Column: IP Grid */}
                <div className="flex-[2] flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden">
                    <div className="px-4 py-3 border-b border-base bg-base flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                icon={loading ? RefreshCw : Download} 
                                onClick={loadIPs} 
                                disabled={loading}
                                className={loading ? "animate-pulse" : ""}
                            >
                                {loading ? 'Loading...' : 'Load'}
                            </Button>
                            
                            <input
                                type="text"
                                placeholder={`Filter ${currentTeam} IPs...`}
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                className="h-8 px-3 bg-white [.dark_&]:bg-slate-800 border border-base rounded text-sm outline-none focus:border-blue-500 text-main w-48"
                            />
                            
                            <Badge variant="secondary">{ips.length} IPs</Badge>
                        </div>
                        
                        <div className="flex gap-2">
                            <Tooltip content="Copy all IPs">
                                <Button variant="outline" size="sm" icon={copied ? Check : Copy} onClick={copyAll} className="border-base" />
                            </Tooltip>
                            
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Power}
                                onClick={restartPDNS}
                                disabled={saving}
                                className={saving ? "opacity-70" : ""}
                            >
                                Restart PowerDNS
                            </Button>
                            
                            <Button
                                icon={Save}
                                size="sm"
                                onClick={saveIPs}
                                disabled={saving}
                                className={saving ? "opacity-70" : ""}
                            >
                                {saving ? 'Saving...' : 'Save to Server'}
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-y-auto bg-transparent">
                        {ips.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-secondary">
                                <Server size={48} className="mb-4 opacity-20" />
                                <p>Click <strong>Load</strong> to fetch IPs from the server.</p>
                            </div>
                        ) : visible.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-secondary">
                                <p>No IPs match "{filter}"</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {visible.map(({ ip, i }) => (
                                    <div key={i} className="flex items-center bg-base border border-base rounded overflow-hidden group">
                                        <div 
                                            className="px-3 py-1.5 text-sm font-mono text-main cursor-text min-w-[120px]"
                                            onClick={() => startEdit(i)}
                                        >
                                            {editIdx === i ? (
                                                <input
                                                    className="w-full bg-transparent outline-none border-b border-blue-500"
                                                    value={editVal}
                                                    autoFocus
                                                    onChange={e => setEditVal(e.target.value)}
                                                    onBlur={commitEdit}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') commitEdit();
                                                        else if (e.key === 'Escape') setEditIdx(null);
                                                    }}
                                                />
                                            ) : (
                                                ip
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => removeIP(i)}
                                            className="px-2 py-1.5 text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
                                            title="Remove IP"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Sidebar */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Add IPs Panel */}
                    <div className="bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden">
                        <div className="px-4 py-3 border-b border-base bg-base">
                            <label className="text-xs font-bold text-main flex items-center gap-2 uppercase tracking-wide">
                                <Plus size={14} className="text-secondary" />
                                Add to {currentTeam}
                            </label>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            <textarea
                                ref={addRef}
                                placeholder="Paste IPs here...&#10;&#10;192.168.1.1&#10;10.0.0.1, 10.0.0.2"
                                className="w-full h-40 p-3 bg-base border border-base rounded text-sm font-mono resize-none focus:outline-none text-main"
                            />
                            <p className="text-xs text-secondary">Duplicates are removed automatically.</p>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Button className="col-span-2" onClick={parseAndAdd}>
                                    Merge into List
                                </Button>
                                <Button variant="secondary" onClick={replaceList}>
                                    Replace All
                                </Button>
                                <Button variant="outline" className="border-base" onClick={() => { if (addRef.current) addRef.current.value = ''; }}>
                                    Clear Input
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
