import React from 'react';

const COLORS = {
  'New':           '#94a3b8',
  'Rising':        '#f59e0b',
  'Trusted':       '#10b981',
  'Highly Trusted':'#6366f1',
};

export default function ScoreRing({ score = 0, level = 'New', size = 120 }) {
  const radius      = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset      = circumference - (score / 100) * circumference;
  const color       = COLORS[level] || COLORS['New'];

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Background ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e2e8f0" strokeWidth="10"
        />
        {/* Score arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Score number centered below the ring via absolute positioning trick */}
      <div className="flex flex-col items-center -mt-2">
        <span className="text-3xl font-bold text-slate-800">{score}</span>
        <span className="text-xs text-slate-500">out of 100</span>
      </div>
    </div>
  );
}
