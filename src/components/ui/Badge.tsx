import React from 'react';

type BadgeTone = 'sky' | 'emerald' | 'rose' | 'amber' | 'slate';

const toneStyles: Record<BadgeTone, string> = {
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'sky', children, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
};
