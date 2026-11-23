import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-5 bg-white rounded-2xl border border-dashed border-sky-200">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2.5">{action}</div>}
    </div>
  );
};
