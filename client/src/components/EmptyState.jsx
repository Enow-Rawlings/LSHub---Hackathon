import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4">
      <Inbox className="w-12 h-12 text-slate-300" />
      <div>
        <p className="font-semibold text-slate-700">{title}</p>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
