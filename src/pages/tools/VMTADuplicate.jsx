import { useState, useEffect } from 'react';
import { Button } from '../../components/ui';
import { Copy, Check, Code, List, FileText } from 'lucide-react';

export default function VMTADuplicate() {
    const [activeTab, setActiveTab] = useState('manual'); // Default to Manual
    const [loopCount, setLoopCount] = useState(1);
    const [sequential, setSequential] = useState(false);

    // Config Mode State
    const [configInput, setConfigInput] = useState('');

    // Manual Mode State
    const [manualForm, setManualForm] = useState({
        isp: 'gmail',
        mailerId: '',
        hostname: '',
        ipList: ''
    });

    // Outputs
    const [result, setResult] = useState('');
    const [ipResult, setIpResult] = useState(''); // Separate result for IP list
    const [copied, setCopied] = useState({ config: false, ip: false });

    // Unified Persistence: Load on mount
    useEffect(() => {
        try {
            // Try loading unified preferences first
            const savedPrefs = localStorage.getItem('vmta_preferences');
            if (savedPrefs) {
                const parsed = JSON.parse(savedPrefs);
                setManualForm(prev => ({
                    ...prev,
                    isp: parsed.isp || prev.isp,
                    mailerId: parsed.mailerId || prev.mailerId,
                    hostname: parsed.hostname || prev.hostname
                }));
                if (parsed.loopCount) setLoopCount(parsed.loopCount);
                if (parsed.sequential !== undefined) setSequential(parsed.sequential);
            } else {
                // Fallback: Check for legacy single-item storage (original behavior migration)
                const legacyMailerId = localStorage.getItem('savedMailerId');
                if (legacyMailerId) {
                    setManualForm(prev => ({ ...prev, mailerId: legacyMailerId }));
                }
            }
        } catch (error) {
            console.error("Failed to load VMTA preferences:", error);
        }
    }, []);

    // Unified Persistence: Save on any change (Auto-save)
    useEffect(() => {
        const prefs = {
            isp: manualForm.isp,
            mailerId: manualForm.mailerId,
            hostname: manualForm.hostname,
            loopCount: loopCount,
            sequential: sequential
        };
        localStorage.setItem('vmta_preferences', JSON.stringify(prefs));

        // Keep legacy key synced for now if needed, or we can consider it migrated. 
        // We'll update it to maintain backward compat if the user checks 'save' specifically, 
        // but here we are auto-saving everything.
        localStorage.setItem('savedMailerId', manualForm.mailerId);
    }, [manualForm.isp, manualForm.mailerId, manualForm.hostname, loopCount, sequential]);

    // Handlers (Simplified, logic moved to useEffect)
    const handleMailerIdChange = (val) => {
        setManualForm(prev => ({ ...prev, mailerId: val }));
    };

    const ISPs = [
        'gmail', 'icloud', 'charter', 'juno', 'roadrunner', 'frontier', 'cox', 'optonline',
        'att', 'verizon', 'earthlink', 'comcast', 'sbcglobal', 'bt', 'sky', 'talktalk',
        'excite', 'windstream', 'mail', 'giuk', 'gius', 'gius2', 'hotmail', 'yahoo',
        'aol', 'cableone', 'centurylink', 'virginmedia', 'bellsouth'
    ];

    const generate = () => {
        if (loopCount < 1) {
            alert("Loop count must be at least 1");
            return;
        }

        let output = "";
        let ipListOutput = "";

        if (activeTab === 'config') {
            // MODE 1: Config Duplicator
            if (!configInput.trim()) {
                alert("Please paste the Virtual-MTA configuration.");
                return;
            }

            const vMtaRegex = /<virtual-mta\s+([\w\.\-]+)>/g;
            let sequentialCounter = 1;

            for (let i = 1; i <= loopCount; i++) {
                if (sequential) {
                    const modified = configInput.replace(vMtaRegex, (match, p1) => {
                        const newName = `<virtual-mta ${p1}-${sequentialCounter}>`;
                        sequentialCounter++;
                        return newName;
                    });
                    output += modified + (i < loopCount ? '\n\n' : '');
                } else {
                    const modified = configInput.replace(vMtaRegex, `<virtual-mta $1-${i}>`);
                    output += modified + (i < loopCount ? '\n\n' : '');
                }
            }

        } else {
            // MODE 2: Manual IP Generator
            const { isp, mailerId, hostname, ipList } = manualForm;
            const lines = ipList.split('\n').filter(l => l.trim());

            if (!lines.length || !isp || !mailerId || !hostname) {
                alert("Please fill all fields and provide IP list.");
                return;
            }

            // Step 1: Generate Base Configs from IPs
            let baseConfigs = [];
            try {
                baseConfigs = lines.map(line => {
                    const parts = line.split(',');
                    const ip = parts[0].trim();
                    if (!ip) throw new Error("Invalid IP format in line: " + line);

                    if (ip.includes(':')) {
                        // IPv6
                        if (parts.length < 3 || !parts[2]) {
                            throw new Error(`IPv6 ${ip} missing ID (IP,Domain,ID)`);
                        }
                        const id = parts[2].trim();
                        return `<virtual-mta ipv6-${id}-${isp}-${mailerId}>\n smtp-source-ip ${ip}\n host-name ${hostname}\n</virtual-mta>`;
                    } else {
                        // IPv4
                        return `<virtual-mta ${ip}-${isp}-${mailerId}>\n smtp-source-ip ${ip}\n host-name ${hostname}\n</virtual-mta>`;
                    }
                });
            } catch (err) {
                alert(err.message);
                return;
            }

            const baseText = baseConfigs.join('\n');
            const vMtaRegex = /<virtual-mta\s+([\w\.\-]+)>/g;
            let sequentialCounter = 1;
            let ipSequentialCounter = 1;

            // Step 2: Loop duplication
            for (let i = 1; i <= loopCount; i++) {
                // Config
                if (sequential) {
                    const modified = baseText.replace(vMtaRegex, (match, p1) => {
                        const newName = `<virtual-mta ${p1}-${sequentialCounter}>`;
                        sequentialCounter++;
                        return newName;
                    });
                    output += modified + (i < loopCount ? '\n\n' : '');
                } else {
                    const modified = baseText.replace(vMtaRegex, `<virtual-mta $1-${i}>`);
                    output += modified + (i < loopCount ? '\n\n' : '');
                }
            }

            // Step 3: IP List Output Generation (Only for Manual Mode)
            let allModifiedIpLines = [];
            if (sequential) {
                for (let i = 1; i <= loopCount; i++) {
                    const modifiedLines = lines.map(line => {
                        const modifiedLine = `${line.trim()},${isp}-${ipSequentialCounter}`;
                        ipSequentialCounter++;
                        return modifiedLine;
                    });
                    allModifiedIpLines.push(...modifiedLines);
                }
                ipListOutput = allModifiedIpLines.join('\n');
            } else {
                for (let i = 1; i <= loopCount; i++) {
                    const modifiedLines = lines.map(line => `${line.trim()},${isp}-${i}`);
                    allModifiedIpLines.push(modifiedLines.join('\n'));
                }
                ipListOutput = allModifiedIpLines.join('\n\n');
            }
        }

        setResult(output);
        setIpResult(ipListOutput);
    };

    const copyToClipboard = async (text, type) => {
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(prev => ({ ...prev, [type]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-base transition-colors duration-300">
            {/* Header */}
            <div className="px-6 py-4 border-b border-base bg-surface transition-colors flex items-center justify-between flex-shrink-0 shadow-none">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-main tracking-tight">VMTA Loop Generator</h1>
                        <p className="text-xs text-secondary font-medium">
                            Generate & Duplicate PMTA Configs
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-6 flex gap-6">
                {/* LEFT COLUMN - INPUTS */}
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
                    {/* Input Container */}
                    <div className="flex-1 flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden">

                        {/* Tab Headers */}
                        <div className="flex border-b border-base">
                            <button
                                onClick={() => { setActiveTab('manual'); setResult(''); setIpResult(''); }}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'manual' ? 'bg-surface text-blue-600 border-b-2 border-blue-600' : 'bg-base text-secondary hover:text-main'}`}
                            >
                                Manual Generator
                            </button>
                            <button
                                onClick={() => { setActiveTab('config'); setResult(''); setIpResult(''); }}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'config' ? 'bg-surface text-blue-600 border-b-2 border-blue-600' : 'bg-base text-secondary hover:text-main'}`}
                            >
                                Paste Config
                            </button>
                        </div>

                        <div className="p-0 flex-1 flex flex-col overflow-y-auto">
                            {activeTab === 'config' ? (
                                <div className="flex flex-col h-full p-4">
                                    <label className="text-xs font-bold text-secondary uppercase mb-2">VMTA Source Code</label>
                                    <textarea
                                        value={configInput}
                                        onChange={(e) => setConfigInput(e.target.value)}
                                        placeholder={`<virtual-mta example-mta>\n smtp-source-ip 1.1.1.1\n host-name example.com\n</virtual-mta>`}
                                        className="w-full h-full p-4 bg-base border border-base rounded text-sm font-mono focus:outline-none resize-none placeholder:text-muted"
                                    />
                                    <p className="text-[10px] text-muted mt-2">
                                        Paste existing configuration to duplicate it.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-secondary uppercase mb-1">ISP</label>
                                            <select
                                                value={manualForm.isp}
                                                onChange={e => setManualForm({ ...manualForm, isp: e.target.value })}
                                                className="w-full h-9 px-2 bg-base border border-base rounded text-sm outline-none text-main"
                                            >
                                                {ISPs.map(isp => <option key={isp} value={isp}>{isp}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-secondary uppercase mb-1">Mailer ID</label>
                                            <input
                                                type="text"
                                                value={manualForm.mailerId}
                                                onChange={e => handleMailerIdChange(e.target.value)}
                                                placeholder="e.g. 931"
                                                className="w-full h-9 px-3 bg-base border border-base rounded text-sm outline-none text-main"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-secondary uppercase mb-1">Host Name</label>
                                        <input
                                            type="text"
                                            value={manualForm.hostname}
                                            onChange={e => setManualForm({ ...manualForm, hostname: e.target.value })}
                                            placeholder="e.g. ulm.edu"
                                            className="w-full h-9 px-3 bg-base border border-base rounded text-sm outline-none text-main"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <label className="block text-xs font-bold text-secondary uppercase mb-1">IP & Domain List</label>
                                        <textarea
                                            value={manualForm.ipList}
                                            onChange={(e) => setManualForm({ ...manualForm, ipList: e.target.value })}
                                            placeholder={`1.1.1.1\nOR\nIPv6,Domain,ID`}
                                            className="w-full h-full p-3 bg-base border border-base rounded text-sm font-mono outline-none resize-none text-main"
                                        />
                                        <p className="text-[10px] text-muted mt-2">
                                            One IP per line. For IPv6, use: IP,Domain,ID
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-surface p-4 rounded-lg border border-base shadow-none">
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-secondary uppercase mb-2">Loop Count</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={loopCount}
                                    onChange={(e) => setLoopCount(parseInt(e.target.value) || 1)}
                                    className="w-full h-10 px-3 bg-base border border-base rounded font-bold outline-none focus:border-blue-500 text-main"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-secondary uppercase mb-2">Naming Format</label>
                                <div className="flex items-center gap-2 h-10">
                                    <label className="flex items-center cursor-pointer gap-2 select-none">
                                        <div className={`w-10 h-5 rounded-full p-1 transition-colors ${sequential ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`} onClick={() => setSequential(!sequential)}>
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${sequential ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm font-medium text-main">
                                            {sequential ? 'Sequential' : 'Standard'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <Button size="lg" onClick={generate} className="h-10 px-8">
                                Generate
                            </Button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - OUTPUT */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Config Output */}
                    <div className="flex-1 flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden h-1/2">
                        <div className="px-5 py-3 border-b border-base bg-base flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FileText size={14} className="text-secondary" />
                                <label className="text-xs font-bold text-main uppercase tracking-wide">VMTA Config Output</label>
                            </div>
                            <button
                                onClick={() => copyToClipboard(result, 'config')}
                                className={`p-1.5 rounded-md transition-all ${copied.config ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-base hover:bg-surface-hover text-secondary'}`}
                                title="Copy Content"
                            >
                                {copied.config ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                        <textarea
                            value={result}
                            readOnly
                            placeholder="Generated VMTA config blocks..."
                            className="flex-1 w-full p-5 bg-base text-main text-sm font-mono resize-none focus:outline-none"
                        />
                    </div>

                    {/* IP List Output (Only visible if active or content exists) */}
                    {(activeTab === 'manual' || ipResult) && (
                        <div className="flex-1 flex flex-col bg-white [.dark_&]:bg-slate-900 rounded-lg border border-slate-300 [.dark_&]:border-slate-700 shadow-none overflow-hidden h-1/2">
                            <div className="px-5 py-3 border-b border-base bg-base flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <List size={14} className="text-secondary" />
                                    <label className="text-xs font-bold text-main uppercase tracking-wide">IP & Domain List Output</label>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(ipResult, 'ip')}
                                    className={`p-1.5 rounded-md transition-all ${copied.ip ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-base hover:bg-surface-hover text-secondary'}`}
                                    title="Copy Content"
                                >
                                    {copied.ip ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                            <textarea
                                value={ipResult}
                                readOnly
                                placeholder="Generated IP list entries..."
                                className="flex-1 w-full p-5 bg-base text-main text-sm font-mono resize-none focus:outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
