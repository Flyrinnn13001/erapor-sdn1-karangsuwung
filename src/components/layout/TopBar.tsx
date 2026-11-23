import React from 'react';
import { Calendar, GraduationCap } from 'lucide-react';
import { Semester } from '../../types';
import { useApp } from '../../context/AppContext';
import { NAV_ITEMS } from './Sidebar';
import { InstallPwaButton } from '../ui/InstallPwaButton';

export const TopBar: React.FC = () => {
  const { db, activePage, setActivePeriod } = useApp();
  const currentNav = NAV_ITEMS.find((i) => i.id === activePage);

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-sky-100 no-print">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile school emblem + desktop page title */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-extrabold text-slate-800 truncate">
              <span className="sm:hidden">
                {currentNav?.shortLabel || 'Beranda'}
              </span>
              <span className="hidden sm:inline">
                {currentNav?.label || 'Dashboard'}
              </span>
            </h2>
            <p className="lg:hidden text-[10px] sm:text-[11px] font-medium text-sky-600 truncate">
              {db.settings.namaSekolah}
            </p>
          </div>
        </div>

        {/* Right: Quick Active Academic Year & Semester selector */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <InstallPwaButton compact />
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-1.5 sm:px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-500 hidden sm:block" />
            <select
              aria-label="Pilih Tahun Ajaran"
              value={db.settings.tahunAjaranAktif}
              onChange={(e) =>
                setActivePeriod(e.target.value, db.settings.semesterAktif)
              }
              className="bg-transparent font-bold text-sky-800 focus:outline-none cursor-pointer"
            >
              {db.settings.daftarTahunAjaran.map((ta) => (
                <option key={ta} value={ta}>
                  {ta}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-sky-50 border border-sky-200 rounded-xl p-0.5">
            {(['Ganjil', 'Genap'] as Semester[]).map((sem) => {
              const active = db.settings.semesterAktif === sem;
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() =>
                    setActivePeriod(db.settings.tahunAjaranAktif, sem)
                  }
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  {sem}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
