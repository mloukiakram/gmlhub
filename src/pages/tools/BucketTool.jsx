import { useState } from 'react';
import { RefreshCw, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../components/ui';

export default function BucketTool() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const TOOL_URL = 'https://gcs-bucket-tool-1.onrender.com/';

    return (
        <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#e8ecf0] bg-white flex-shrink-0">
                <div>
                    <h1 className="text-xl font-semibold text-[#1a1d21]">Bucket Tool</h1>
                    <p className="text-sm text-[#5e6674] mt-0.5">
                        GCS Bucket management tool
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        icon={RefreshCw}
                        onClick={() => setRefreshKey(k => k + 1)}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        icon={isFullscreen ? Minimize2 : Maximize2}
                        onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                    <a
                        href={TOOL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Button variant="secondary" icon={ExternalLink}>
                            Open in New Tab
                        </Button>
                    </a>
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 overflow-hidden bg-[#fafbfc]">
                <iframe
                    key={refreshKey}
                    src={TOOL_URL}
                    className="w-full h-full border-none"
                    title="GCS Bucket Tool"
                    allow="clipboard-read; clipboard-write"
                />
            </div>
        </div>
    );
}
