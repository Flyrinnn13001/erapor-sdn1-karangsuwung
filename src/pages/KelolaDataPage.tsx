import React, { useEffect, useState } from 'react';
import { Users, UserCheck, BookOpen, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getActiveStudents } from '../utils/helpers';
import { SiswaTab } from './kelola/SiswaTab';
import { GuruTab } from './kelola/GuruTab';
import { MapelTab } from './kelola/MapelTab';
import { EkskulTab } from './kelola/EkskulTab';

type TabKey = 'siswa' | 'guru' | 'mapel' | 'ekskul';

export const KelolaDataPage: React.FC = () => {
  const { db, navState } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>('siswa');

  useEffect(() => {
    if (
      navState.tab &&
      (['siswa', 'guru', 'mapel', 'ekskul'] as string[]).includes(navState.tab)
    ) {
      setActiveTab(navState.tab as TabKey);
    }
  }, [navState.tab]);

  const activeStudentsCount = getActiveStudents(db.students).length;

  const tabs: Array<{
    key: TabKey;
    label: string;
    count: number;
    icon: React.FC<{ className?: string }>;
  }> = [
    { key: 'siswa', label: 'Data Siswa', count: activeStudentsCount, icon: Users },
    { key: 'guru', label: 'Data Guru', count: db.teachers.length, icon: UserCheck },
    { key: 'mapel', label: 'Mata Pelajaran', count: db.subjects.length, icon: BookOpen },
    { key: 'ekskul', label: 'Ekstrakurikuler', count: db.activities.length, icon: Award },
  ];

  return (
    <div className="space-y-5">
      {/* Segmented Tabs */}
      <div className="bg-white rounded-2xl border border-sky-100 p-1.5 shadow-sm overflow-x-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 min-w-[320px]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'siswa' && <SiswaTab />}
      {activeTab === 'guru' && <GuruTab />}
      {activeTab === 'mapel' && <MapelTab />}
      {activeTab === 'ekskul' && <EkskulTab />}
    </div>
  );
};
