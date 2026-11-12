import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';

export default function QRCard({ url }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <QRCodeSVG value={url} size={160} bgColor="#ffffff" fgColor="#1e293b" />
      <p className="text-xs text-slate-400 text-center break-all">{url}</p>
      <button
        onClick={copy}
        className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied!' : 'Copy Passport Link'}
      </button>
    </div>
  );
}
