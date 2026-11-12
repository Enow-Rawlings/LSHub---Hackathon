import React from 'react';

export default function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';
  return (
    <div className={`${s} rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin`} />
  );
}
