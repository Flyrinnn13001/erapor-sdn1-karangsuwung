import React from 'react';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from './Sidebar';

export const BottomNav: React.FC = () => {
  const { activePage, navigate } = useApp();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-sky-100 shadow-[0_-4px_20px_-6px_rgba(2,132,199,0.12)] no-print">
      <div className="grid grid-cols-6 px-1 py-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate({ page: item.id })}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors cursor-pointer ${
                active ? 'text-sky-600 bg-sky-50' : 'text-slate-400 hover:text-sky-500'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] font-bold leading-none">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
