import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { KelolaDataPage } from './pages/KelolaDataPage';
import { InputNilaiPage } from './pages/InputNilaiPage';
import { RekapLegerPage } from './pages/RekapLegerPage';
import { ERaporPage } from './pages/ERaporPage';
import { PengaturanPage } from './pages/PengaturanPage';

const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] no-print pointer-events-none">
      {toasts.map((t) => {
        const styles =
          t.type === 'success'
            ? 'bg-emerald-600 text-white'
            : t.type === 'error'
            ? 'bg-rose-600 text-white'
            : t.type === 'warning'
            ? 'bg-amber-500 text-white'
            : 'bg-sky-600 text-white';

        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? XCircle
            : t.type === 'warning'
            ? AlertTriangle
            : Info;

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-xs sm:text-sm font-semibold ${styles}`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{t.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="opacity-80 hover:opacity-100 cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

const MainShell: React.FC = () => {
  const { activePage } = useApp();

  return (
    <div className="min-h-screen bg-[#F6FAFF] print:bg-white">
      <Sidebar />

      <div className="lg:pl-64 print:pl-0 flex flex-col min-h-screen">
        <TopBar />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 pb-24 lg:pb-10 print:p-0 max-w-[1440px] w-full mx-auto">
          {activePage === 'dashboard' && <DashboardPage />}
          {activePage === 'kelola-data' && <KelolaDataPage />}
          {activePage === 'input-nilai' && <InputNilaiPage />}
          {activePage === 'rekap-leger' && <RekapLegerPage />}
          {activePage === 'e-rapor' && <ERaporPage />}
          {activePage === 'pengaturan' && <PengaturanPage />}
        </main>
      </div>

      <BottomNav />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
};

export default App;
