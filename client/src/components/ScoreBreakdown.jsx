import React from 'react';

const BARS = [
  { key: 'jobs',        max: 40, label: 'Verified jobs', hint: (v, b) => `${v} of 40 pts — from ${Math.round(b/4)} confirmed jobs` },
  { key: 'ratings',     max: 20, label: 'Customer ratings', hint: (v) => `${v} of 20 pts — needs 3+ rated jobs` },
  { key: 'vouches',     max: 25, label: 'Community vouches', hint: (v) => `${v} of 25 pts — from trusted verifiers` },
  { key: 'skills',      max: 10, label: 'Verified skills', hint: (v) => `${v} of 10 pts — signed off by verifiers` },
  { key: 'consistency', max: 5,  label: 'Consistency', hint: (v) => `${v} of 5 pts — 90+ day account, no flags` },
];

const COLORS = {
  jobs:        'bg-emerald-500',
  ratings:     'bg-amber-400',
  vouches:     'bg-indigo-500',
  skills:      'bg-sky-500',
  consistency: 'bg-rose-400',
};

export default function ScoreBreakdown({ breakdown = {} }) {
  return (
    <div className="space-y-4">
      {BARS.map(({ key, max, label, hint }) => {
        const val = breakdown[key] || 0;
        const pct = Math.min(100, (val / max) * 100);
        return (
          <div key={key}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <span className="text-xs text-slate-400">{val} / {max} pts</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${COLORS[key]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{hint(val, val)}</p>
          </div>
        );
      })}
    </div>
  );
}
