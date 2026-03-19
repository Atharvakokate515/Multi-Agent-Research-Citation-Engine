import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Download, Check } from 'lucide-react';

interface Props {
  report: string;
}

export default function ReportViewer({ report }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green" />
          <span className="text-[12px] font-mono text-text-2">report.md</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-text-3 hover:text-text hover:bg-bg-3 transition-colors duration-[40ms]"
          >
            {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-text-3 hover:text-text hover:bg-bg-3 transition-colors duration-[40ms]"
          >
            <Download size={12} />
            Download
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 prose-research">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
      </div>
    </div>
  );
}
