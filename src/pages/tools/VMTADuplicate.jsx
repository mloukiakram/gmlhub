import { useState, useEffect, useRef } from 'react';
import { Card, Button, Badge } from '../../components/ui';
import { Copy, Check, RefreshCw, ArrowRight, Settings, ToggleLeft, ToggleRight } from 'lucide-react';

// ISP Options
const ISP_OPTIONS = [
    'gmail', 'icloud', 'charter', 'juno', 'roadrunner', 'frontier', 'cox', 'optonline',
    'att', 'verizon', 'earthlink', 'comcast', 'sbcglobal', 'bt', 'sky', 'talktalk',
    'excite', 'windstream', 'mail', 'giuk', 'gius', 'gius2', 'hotmail', 'yahoo', 'aol',
    'cableone', 'centurylink', 'virginmedia', 'bellsouth'
];

export default function VMTADuplicate() {
    // Mode toggles
    const [isPasteMode, setIsPasteMode] = useState(true);
    const [isSequentialFormat, setIsSequentialFormat] = useState(false);

    // Paste mode inputs
    const [vmtaText, setVmtaText] = useState('');
    const [ipList, setIpList] = useState('');

    // Manual mode inputs
    const [isp, setIsp] = useState('gmail');
    const [mailerId, setMailerId] = useState(() => localStorage.getItem('savedMailerId') || '');
    const [hostname, setHostname] = useState('');
    const [saveMailerId, setSaveMailerId] = useState(() => !!localStorage.getItem('savedMailerId'));

    // Generation settings
    const [loopCount, setLoopCount] = useState(1);

    // Results
    const [vmtaOutput, setVmtaOutput] = useState('');
    const [ipListOutput, setIpListOutput] = useState('');
    const [copied, setCopied] = useState({ vmta: false, ipList: false });

    // Save mailerId preference
    useEffect(() => {
        if (saveMailerId) {
            localStorage.setItem('savedMailerId', mailerId);
        } else {
            localStorage.removeItem('savedMailerId');
        }
    }, [saveMailerId, mailerId]);

    const showToast = (msg) => {
        // Simple inline toast - you could use the context here
        console.log(msg);
    };

    const generate = () => {
        const loops = parseInt(loopCount, 10);
        const ipListText = ipList.trim();
        let vMtaBaseText = '';

        if (!isPasteMode) {
            // Manual mode
            const ipLines = ipList.trim().split('\n').filter(line => line.trim() !== '');
            if (!ipLines.length || !isp || !mailerId || !hostname) {
                alert("Please fill all manual fields and IP & Domain List.");
                return;
            }

            try {
                vMtaBaseText = ipLines.map(line => {
                    const parts = line.split(',');
                    if (parts.length < 1 || !parts[0]) {
                        throw new Error('Invalid line format: Cannot find IP address.');
                    }
                    const ip = parts[0].trim();
                    const isIpv6 = ip.includes(':');

                    if (isIpv6) {
                        if (parts.length < 3 || !parts[2]) {
                            throw new Error(`Invalid IPv6 line for ${ip}: Expected at least 3 comma-separated values (IP,Domain,ID).`);
                        }
                        const id = parts[2].trim();
                        return `<virtual-mta ipv6-${id}-${isp}-${mailerId}>\n smtp-source-ip ${ip}\n host-name ${hostname}\n</virtual-mta>`;
                    } else {
                        return `<virtual-mta ${ip}-${isp}-${mailerId}>\n smtp-source-ip ${ip}\n host-name ${hostname}\n</virtual-mta>`;
                    }
                }).join('\n');
            } catch (e) {
                alert(e.message);
                return;
            }
        } else {
            vMtaBaseText = vmtaText.trim();
        }

        if ((!vMtaBaseText && !ipListText) || loops < 1) {
            alert("Please provide input and a valid number of duplications.");
            return;
        }

        let vmtaResult = '';
        let ipResult = '';
        const vMtaRegex = /<virtual-mta\s+([\w.\-]+)>/g;
        let vMtaSequentialCounter = 1;
        let ipSequentialCounter = 1;

        for (let i = 1; i <= loops; i++) {
            if (vMtaBaseText) {
                if (isSequentialFormat) {
                    const modifiedText = vMtaBaseText.replaceAll(vMtaRegex, (match, p1) => {
                        const newVmtaname = `<virtual-mta ${p1}-${vMtaSequentialCounter}>`;
                        vMtaSequentialCounter++;
                        return newVmtaname;
                    });
                    vmtaResult += modifiedText + (i < loops ? '\n\n' : '');
                } else {
                    const modifiedText = vMtaBaseText.replaceAll(vMtaRegex, `<virtual-mta $1-${i}>`);
                    vmtaResult += modifiedText + (i < loops ? '\n\n' : '');
                }
            }
        }

        if (ipListText) {
            const lines = ipListText.split('\n').filter(line => line.trim() !== '');
            let allModifiedLines = [];
            if (isSequentialFormat) {
                for (let i = 1; i <= loops; i++) {
                    const modifiedLines = lines.map(line => {
                        const modifiedLine = `${line.trim()},${isp}-${ipSequentialCounter}`;
                        ipSequentialCounter++;
                        return modifiedLine;
                    });
                    allModifiedLines.push(...modifiedLines);
                }
                ipResult = allModifiedLines.join('\n');
            } else {
                for (let i = 1; i <= loops; i++) {
                    const modifiedLines = lines.map(line => `${line.trim()},${isp}-${i}`);
                    allModifiedLines.push(modifiedLines.join('\n'));
                }
                ipResult = allModifiedLines.join('\n\n');
            }
        }

        setVmtaOutput(vmtaResult);
        setIpListOutput(ipResult);
    };

    const copyOutput = async (type) => {
        const text = type === 'vmta' ? vmtaOutput : ipListOutput;
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(prev => ({ ...prev, [type]: true }));
        setTimeout(() => setCopied(prev => ({ ...prev, [type]: false })), 2000);
    };

    const clear = () => {
        setVmtaText('');
        setIpList('');
        setVmtaOutput('');
        setIpListOutput('');
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-[#e8ecf0] bg-white">
                <h1 className="text-xl font-semibold text-[#1a1d21]">VMTA Loop Generator</h1>
                <p className="text-sm text-[#5e6674] mt-0.5">
                    Generate duplicated Virtual-MTA configurations with numbered suffixes
                </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-[#fafbfc]">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Input Section - Two Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: VMTA Config */}
                        <Card>
                            {/* Mode Toggle */}
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#e8ecf0]">
                                <span className={`text-sm font-medium ${isPasteMode ? 'text-[#2563eb]' : 'text-[#9ca3af]'}`}>Paste Config</span>
                                <button
                                    onClick={() => setIsPasteMode(!isPasteMode)}
                                    className="relative w-12 h-6 bg-[#e5e7eb] rounded-full transition-colors"
                                    style={{ backgroundColor: isPasteMode ? '#e5e7eb' : '#2563eb' }}
                                >
                                    <span
                                        className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                                        style={{ left: isPasteMode ? '4px' : '28px' }}
                                    />
                                </button>
                                <span className={`text-sm font-medium ${!isPasteMode ? 'text-[#2563eb]' : 'text-[#9ca3af]'}`}>Manual Input</span>
                            </div>

                            {isPasteMode ? (
                                <div className="space-y-3">
                                    <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide">
                                        Full Virtual-MTA Configuration
                                    </label>
                                    <textarea
                                        value={vmtaText}
                                        onChange={(e) => setVmtaText(e.target.value)}
                                        placeholder="<virtual-mta ...>&#10; smtp-source-ip ...&#10; host-name ...&#10;</virtual-mta>"
                                        className="w-full h-64 px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">ISP</label>
                                            <select
                                                value={isp}
                                                onChange={(e) => setIsp(e.target.value)}
                                                className="w-full h-11 px-3 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                                            >
                                                {ISP_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-xs font-medium text-[#5e6674] uppercase tracking-wide">Mailer-ID</label>
                                                <label className="flex items-center gap-1.5 text-xs text-[#6b7280] cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={saveMailerId}
                                                        onChange={(e) => setSaveMailerId(e.target.checked)}
                                                        className="w-3.5 h-3.5"
                                                    />
                                                    Save
                                                </label>
                                            </div>
                                            <input
                                                type="text"
                                                value={mailerId}
                                                onChange={(e) => setMailerId(e.target.value)}
                                                placeholder="e.g., 931"
                                                className="w-full h-11 px-3 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">Host-name</label>
                                        <input
                                            type="text"
                                            value={hostname}
                                            onChange={(e) => setHostname(e.target.value)}
                                            placeholder="e.g., ulm.edu"
                                            className="w-full h-11 px-3 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>

                        {/* Right Column: IP List */}
                        <Card>
                            <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-3">
                                IP & Domain List
                            </label>
                            <textarea
                                value={ipList}
                                onChange={(e) => setIpList(e.target.value)}
                                placeholder="195.154.200.28,qdfnet.com,...&#10;2001:41d0:602:383e:5::a,fine.fa7yxdxy2j.com,17178017,...&#10;212.129.0.117,step.qdfnet.com,..."
                                className="w-full h-64 px-4 py-3 border border-[#e5e7eb] rounded-xl text-sm font-mono resize-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none transition-all"
                            />
                        </Card>
                    </div>

                    {/* Settings & Generate */}
                    <Card>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                                <div>
                                    <label className="block text-xs font-medium text-[#5e6674] uppercase tracking-wide mb-2">
                                        Number of Duplications
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="500"
                                        value={loopCount}
                                        onChange={(e) => setLoopCount(e.target.value)}
                                        className="w-24 h-11 px-3 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10 outline-none"
                                    />
                                </div>

                                {/* Format Toggle */}
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-medium ${!isSequentialFormat ? 'text-[#2563eb]' : 'text-[#9ca3af]'}`}>Standard</span>
                                    <button
                                        onClick={() => setIsSequentialFormat(!isSequentialFormat)}
                                        className="relative w-12 h-6 rounded-full transition-colors"
                                        style={{ backgroundColor: isSequentialFormat ? '#2563eb' : '#e5e7eb' }}
                                    >
                                        <span
                                            className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow"
                                            style={{ left: isSequentialFormat ? '28px' : '4px' }}
                                        />
                                    </button>
                                    <span className={`text-sm font-medium ${isSequentialFormat ? 'text-[#2563eb]' : 'text-[#9ca3af]'}`}>Sequential</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="secondary" icon={RefreshCw} onClick={clear}>
                                    Clear
                                </Button>
                                <Button icon={ArrowRight} iconPosition="right" onClick={generate}>
                                    Generate
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Results */}
                    {(vmtaOutput || ipListOutput) && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up">
                            {vmtaOutput && (
                                <Card>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-sm font-medium text-[#374151]">Virtual-MTA Output</label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={copied.vmta ? Check : Copy}
                                            onClick={() => copyOutput('vmta')}
                                        >
                                            {copied.vmta ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </div>
                                    <pre className="w-full h-64 px-4 py-3 bg-[#1a1d21] text-[#10b981] rounded-xl text-sm font-mono overflow-auto whitespace-pre-wrap">
                                        {vmtaOutput}
                                    </pre>
                                </Card>
                            )}
                            {ipListOutput && (
                                <Card>
                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-sm font-medium text-[#374151]">IP & Domain List Output</label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={copied.ipList ? Check : Copy}
                                            onClick={() => copyOutput('ipList')}
                                        >
                                            {copied.ipList ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </div>
                                    <pre className="w-full h-64 px-4 py-3 bg-[#1a1d21] text-[#10b981] rounded-xl text-sm font-mono overflow-auto whitespace-pre-wrap">
                                        {ipListOutput}
                                    </pre>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
