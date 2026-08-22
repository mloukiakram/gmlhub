import React, { useState } from 'react';

export default function RDNSGenerator() {
  const [ipInput, setIpInput] = useState('');
  const [suffix, setSuffix] = useState('.dynamic.hinet.net');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generateMessage = () => {
    const ips = ipInput.split('\n').map(ip => ip.trim()).filter(ip => ip !== '');
    
    if (ips.length === 0) {
      setOutput('');
      return;
    }

    const formattedIPs = ips.map(ip => {
      const dashedIP = ip.replace(/\./g, '-');
      return `${ip} > ${dashedIP}${suffix}`;
    });

    const header = "Hello,\nPlease set up the rdns for the following IPs :\n\n";
    const body = formattedIPs.join('\n');
    const footer = "\n\nRegards.";

    setOutput(header + body + footer);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">rDNS Request Generator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Generate formatted rDNS request templates for your IP addresses.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* IPs Input Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter IPs (one per line)
          </label>
          <textarea
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="103.27.75.224&#10;192.168.1.1"
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-900 dark:text-white font-mono text-sm transition-colors"
          />
        </div>

        {/* Suffix Select Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Suffix
          </label>
          <select
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-900 dark:text-white transition-colors"
          >
            <option value=".dynamic.hinet.net">.dynamic.hinet.net</option>
            <option value=".cprapid.com">.cprapid.com</option>
            <option value=".hinet-ip.hinet.net">.hinet-ip.hinet.net</option>
            <option value=".ip.reactoo.com">.ip.reactoo.com</option>
            <option value=".emome-ip.hinet.net">.emome-ip.hinet.net</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateMessage}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-blue-500/50"
        >
          Generate Template
        </button>

        {/* Output Section */}
        {output && (
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Final Output
              </label>
              <button
                onClick={copyToClipboard}
                className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-1.5 rounded-md transition-colors font-medium flex items-center gap-2"
              >
                {copied ? '✓ Copied!' : 'Copy Message'}
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 dark:text-white font-mono text-sm leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
}
