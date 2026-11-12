import React from 'react';
import { Shield } from 'lucide-react';

const LEVEL_STYLES = {
  'New':          'bg-slate-100 text-slate-700 border-slate-200',
  'Rising':       'bg-amber-50 text-amber-700 border-amber-200',
  'Trusted':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Highly Trusted':'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function TrustBadge({ level, score, size = 'md' }) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES['New'];
  const isHigh = level === 'Highly Trusted';

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5 gap-1'
    : 'text-sm px-3 py-1 gap-1.5';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${style} ${sizeClasses}`}>
      {isHigh && <Shield className="w-3 h-3" />}
      {level}
      {score !== undefined && <span className="ml-1 opacity-75">· {score}</span>}
    </span>
  );
}
