import React from 'react';
import {
  LayoutDashboard,
  Database,
  ClipboardEdit,
  Table2,
  FileText,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { PageId } from '../../types';
import { useApp } from '../../context/AppContext';

export const NAV_ITEMS: Array<{
  id: PageId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Beranda', icon: LayoutDashboard },
  { id: 'kelola-data', label: 'Kelola Data', shortLabel: 'Data', icon: Database },
  { id: 'input-nilai', label: 'Input Nilai', shortLabel: 'Nilai', icon: ClipboardEdit },
  { id: 'rekap-leger', label: 'Rekap & Leger', shortLabel: 'Leger', icon: Table2 },
  { id: 'e-rapor', label: 'E-Rapor (Cetak)', shortLabel: 'Rapor', icon: FileText },
  { id: 'pengaturan', label: 'Pengaturan', shortLabel: 'Atur', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { db, activePage, navigate } = useApp();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-sky-100 shadow-[4px_0_24px_-12px_rgba(2,132,199,0.08)] z-30 no-print">
      {/* Brand header */}
      <div className="px-5 py-5 border-b border-sky-100 bg-gradient-to-br from-sky-500 to-sky-600 text-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-100">
              E-Rapor Kurikulum Merdeka
            </p>
            <h1 className="text-sm font-extrabold leading-tight truncate">
              {db.settings.namaSekolah}
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate({ page: item.id })}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  active ? 'text-white' : 'text-sky-500'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-sky-100 bg-sky-50/60">
        <div className="rounded-xl bg-white border border-sky-100 p-3">
          <p className="text-[11px] font-semibold text-sky-600 uppercase tracking-wide">
            Periode Aktif
          </p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">
            TA {db.settings.tahunAjaranAktif}
          </p>
          <p className="text-xs text-slate-500">
            Semester {db.settings.semesterAktif} • KKTP {db.settings.kktpDefault}
          </p>
        </div>
      </div>
    </aside>
  );
};
