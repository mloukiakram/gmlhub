import { useState } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Minimize2, HardDrive } from 'lucide-react';
import { Button } from '../../components/ui';

export default function BucketTool() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const TOOL_URL = 'https://gcs-bucket-tool-1.onrender.com/';

    return (
        <div className={`h-full flex flex-col bg-base ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-base bg-surface transition-colors flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-main tracking-tight">Bucket Tool</h1>
                        <p className="text-sm text-secondary mt-0.5 font-medium">
                            GCS Bucket management tool
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        icon={RefreshCw}
                        onClick={() => setRefreshKey(k => k + 1)}
                        className="border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        icon={isFullscreen ? Minimize2 : Maximize2}
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="border-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                    <a
                        href={TOOL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="secondary" icon={ExternalLink} className="dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                            Open in New Tab
                        </Button>
                    </a>
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 overflow-hidden bg-[#fafbfc] dark:bg-[#020617] relative">
                {/* Loader Overlay (behind iframe) */}
                <div className="absolute inset-0 flex items-center justify-center -z-0">
                    <div className="w-8 h-8 border-3 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-500 rounded-full animate-spin"></div>
                </div>

                <iframe
                    key={refreshKey}
                    src={TOOL_URL}
                    className="w-full h-full border-none relative z-10 bg-white dark:bg-[#0f172a]"
                    title="GCS Bucket Tool"
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
