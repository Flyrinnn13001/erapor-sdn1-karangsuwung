import React, { useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  School,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Trash2,
  ArrowRight,
  Calendar,
  BookOpen,
  ClipboardEdit,
  FileText,
  Table2,
  Info,
} from 'lucide-react';
import { Semester } from '../types';
import { KELAS_LIST, KELAS_ROMAWI } from '../data/defaults';
import { useApp } from '../context/AppContext';
import {
  getActiveStudents,
  getFase,
  getIncompleteGradeAlerts,
  getStudentsByKelas,
  getSubjectsForKelas,
  getWaliKelas,
} from '../utils/helpers';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export const DashboardPage: React.FC = () => {
  const {
    db,
    navigate,
    setActivePeriod,
    loadSampleData,
    clearAllData,
  } = useApp();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);

  const activeStudents = useMemo(
    () => getActiveStudents(db.students),
    [db.students]
  );
  const maleCount = activeStudents.filter((s) => s.jenisKelamin === 'L').length;
  const femaleCount = activeStudents.filter((s) => s.jenisKelamin === 'P').length;

  const isEmpty = activeStudents.length === 0 && db.teachers.length === 0;

  const alerts = useMemo(() => getIncompleteGradeAlerts(db), [db]);

  const completionPct =
    alerts.totalExpected > 0
      ? Math.round((alerts.totalCompleted / alerts.totalExpected) * 100)
      : 0;

  const classRows = useMemo(() => {
    return KELAS_LIST.map((kelas) => {
      const students = getStudentsByKelas(db.students, kelas);
      const wali = getWaliKelas(db.teachers, kelas);
      const subjects = getSubjectsForKelas(db.subjects, kelas);
      const classAlerts = alerts.items.filter((i) => i.kelas === kelas);
      const incompleteCount = classAlerts.reduce(
        (sum, i) => sum + i.belumLengkap,
        0
      );
      const expected = students.length * subjects.length;
      const done = Math.max(0, expected - incompleteCount);
      const pct = expected > 0 ? Math.round((done / expected) * 100) : 0;

      return {
        kelas,
        fase: getFase(kelas),
        studentsCount: students.length,
        wali,
        subjectsCount: subjects.length,
        incompleteCount,
        pct,
      };
    });
  }, [db.students, db.teachers, db.subjects, alerts.items]);

  const handleRequestSample = () => {
    if (!isEmpty && !db.isSampleData) {
      setConfirmSample(true);
    } else {
      loadSampleData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner & Period Control */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white p-5 sm:p-6 shadow-lg shadow-sky-600/15">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-24 -bottom-16 w-40 h-40 rounded-full bg-sky-300/15 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/25 text-xs font-semibold text-sky-50 mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              Kurikulum Merdeka • Fase A, B, dan C
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Selamat Datang di E-Rapor {db.settings.namaSekolah}
            </h1>
            <p className="text-sm text-sky-100 mt-1 max-w-2xl">
              Kelola data siswa & guru, input nilai Formatif–Sumatif–STS–SAS,
              pantau leger peringkat, dan cetak e-rapor SD dengan mudah.
            </p>
          </div>

          {/* Active Period Switcher Card */}
          <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-3.5 sm:p-4 shrink-0 min-w-[250px]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-100 flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Tahun Ajaran & Semester Aktif
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Tahun Ajaran Aktif"
                value={db.settings.tahunAjaranAktif}
                onChange={(e) =>
                  setActivePeriod(e.target.value, db.settings.semesterAktif)
                }
                className="flex-1 bg-white text-sky-900 font-bold text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300 cursor-pointer"
              >
                {db.settings.daftarTahunAjaran.map((ta) => (
                  <option key={ta} value={ta}>
                    TA {ta}
                  </option>
                ))}
              </select>

              <div className="flex bg-sky-900/30 rounded-xl p-1">
                {(['Ganjil', 'Genap'] as Semester[]).map((sem) => {
                  const active = db.settings.semesterAktif === sem;
                  return (
                    <button
                      key={sem}
                      type="button"
                      onClick={() =>
                        setActivePeriod(db.settings.tahunAjaranAktif, sem)
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-white text-sky-700 shadow-sm'
                          : 'text-sky-100 hover:bg-white/10'
                      }`}
                    >
                      {sem}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Empty State OR Sample Data Notice */}
      {isEmpty ? (
        <section className="rounded-2xl bg-white border border-sky-200 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Aplikasi Siap Digunakan (Data Masih Kosong)
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Belum ada data siswa, guru, dan nilai yang dimasukkan. Anda
                  bisa mulai mengisi data sekolah sendiri di menu{' '}
                  <strong className="text-slate-700">Kelola Data</strong>, atau
                  mencoba seluruh fitur terlebih dahulu menggunakan data contoh
                  (yang bisa dihapus kembali kapan saja).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleRequestSample}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm shadow-sky-500/20 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Isi Data Contoh
              </button>
              <button
                type="button"
                onClick={() => navigate({ page: 'kelola-data', tab: 'siswa' })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-sm font-bold transition-all cursor-pointer"
              >
                Mulai Isi Data Sendiri
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      ) : (
        db.isSampleData && (
          <section className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm text-sky-900">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Anda sedang melihat <strong>Data Contoh SDN 1 Karangsuwung</strong>.
                Anda dapat menghapusnya kapan saja untuk mulai mengisi data asli sekolah.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Data Contoh
            </button>
          </section>
        )
      )}

      {/* Summary KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          onClick={() => navigate({ page: 'kelola-data', tab: 'siswa' })}
          className="bg-white rounded-2xl border border-sky-100 p-4 sm:p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Jumlah Siswa
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2 tabular-nums">
            {activeStudents.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activeStudents.length > 0
              ? `${maleCount} Laki-laki • ${femaleCount} Perempuan`
              : 'Belum ada siswa aktif'}
          </p>
        </div>

        <div
          onClick={() => navigate({ page: 'kelola-data', tab: 'guru' })}
          className="bg-white rounded-2xl border border-sky-100 p-4 sm:p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Jumlah Guru
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2 tabular-nums">
            {db.teachers.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {db.teachers.filter((t) => t.jabatan.startsWith('Wali Kelas')).length} dari 6 wali kelas terisi
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Jumlah Kelas
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2 tabular-nums">
            6
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Kelas 1–6 (Fase A, B, C) • {db.subjects.length} Mapel
          </p>
        </div>

        <div
          onClick={() => navigate({ page: 'input-nilai' })}
          className="bg-white rounded-2xl border border-sky-100 p-4 sm:p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Kelengkapan Nilai
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                alerts.totalExpected > 0 && alerts.totalIncompleteEntries === 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-amber-50 text-amber-600'
              }`}
            >
              {alerts.totalExpected > 0 && alerts.totalIncompleteEntries === 0 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-2 tabular-nums">
            {alerts.totalExpected > 0 ? `${completionPct}%` : '-'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {alerts.totalExpected > 0
              ? `${alerts.totalCompleted}/${alerts.totalExpected} nilai mapel lengkap`
              : 'Menunggu data siswa'}
          </p>
        </div>
      </section>

      {/* Peringatan Nilai Belum Lengkap */}
      {activeStudents.length > 0 && (
        <section
          className={`rounded-2xl border p-5 shadow-sm ${
            alerts.items.length > 0
              ? 'bg-amber-50/80 border-amber-200'
              : 'bg-emerald-50/70 border-emerald-200'
          }`}
        >
          {alerts.items.length > 0 ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-amber-950">
                      Peringatan: Ada Nilai Siswa Belum Lengkap Diinput
                    </h2>
                    <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                      Terdapat{' '}
                      <strong>{alerts.totalIncompleteEntries} entri nilai</strong>{' '}
                      pada {alerts.items.length} kelas/mata pelajaran di Semester{' '}
                      {db.settings.semesterAktif} TA {db.settings.tahunAjaranAktif}{' '}
                      yang komponen nilainya (Formatif, Sumatif, STS, atau SAS) belum terisi penuh.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {alerts.items.map((item) => (
                  <div
                    key={`${item.kelas}-${item.subjectId}`}
                    className="bg-white rounded-xl border border-amber-200/80 px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge tone="sky">Kelas {item.kelas}</Badge>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.subjectNama}
                        </span>
                      </div>
                      <p className="text-xs text-amber-700 font-medium mt-1">
                        {item.belumLengkap} dari {item.totalSiswa} siswa belum lengkap
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          page: 'input-nilai',
                          kelas: item.kelas,
                          subjectId: item.subjectId,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Isi Nilai
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-emerald-950">
                  Semua Nilai Semester {db.settings.semesterAktif} TA{' '}
                  {db.settings.tahunAjaranAktif} Sudah Lengkap!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-800 mt-0.5">
                  Seluruh komponen nilai untuk semua siswa aktif telah terisi.
                  Anda dapat meninjau Leger Nilai atau langsung mencetak E-Rapor.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Daftar Kelas & Wali Kelas (Kelas 1 - 6) */}
      <section className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-sky-50/70 to-white">
          <div>
            <h2 className="text-base font-extrabold text-slate-800">
              Daftar Kelas & Wali Kelas (Kelas 1–6)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pembagian Kurikulum Merdeka: Fase A (Kelas 1–2), Fase B (Kelas 3–4),
              Fase C (Kelas 5–6)
            </p>
          </div>
          {!isEmpty && !db.isSampleData && (
            <button
              type="button"
              onClick={handleRequestSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Muat Data Contoh
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-5">
          {classRows.map((row) => (
            <div
              key={row.kelas}
              className="rounded-2xl border border-sky-100 bg-gradient-to-b from-white to-sky-50/30 p-4 flex flex-col justify-between gap-3.5 hover:border-sky-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-500 text-white font-extrabold flex items-center justify-center shadow-sm text-sm">
                      {KELAS_ROMAWI[row.kelas]}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm">
                        Kelas {row.kelas}
                      </h3>
                      <span className="inline-block text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md mt-0.5">
                        Fase {row.fase}
                      </span>
                    </div>
                  </div>
                  <Badge tone={row.studentsCount > 0 ? 'sky' : 'slate'}>
                    {row.studentsCount} Siswa
                  </Badge>
                </div>

                <div className="mt-3 pt-3 border-t border-sky-100/80">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                    Wali Kelas
                  </p>
                  {row.wali ? (
                    <div className="mt-0.5">
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {row.wali.nama}
                      </p>
                      <p className="text-xs text-slate-500">
                        NIP. {row.wali.nip || '-'}
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate({ page: 'kelola-data', tab: 'guru' })}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline mt-0.5 cursor-pointer"
                    >
                      Belum ditentukan • Tambah Wali Kelas →
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {row.studentsCount > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">
                        Kelengkapan Nilai
                      </span>
                      <span
                        className={`font-bold ${
                          row.pct === 100 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {row.pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-sky-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          row.pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                        }`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-sky-100/80">
                <button
                  type="button"
                  onClick={() =>
                    navigate({ page: 'input-nilai', kelas: row.kelas })
                  }
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <ClipboardEdit className="w-3.5 h-3.5" />
                  Nilai
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ page: 'rekap-leger', kelas: row.kelas })
                  }
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Table2 className="w-3.5 h-3.5" />
                  Leger
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ page: 'e-rapor', kelas: row.kelas })
                  }
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Rapor
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAllData}
        title="Hapus Semua Data Contoh?"
        message="Tindakan ini akan mengosongkan semua data siswa, guru, ekstrakurikuler, dan nilai yang ada sehingga aplikasi kembali bersih siap diisi data asli sekolah."
        confirmLabel="Ya, Kosongkan Data"
        variant="danger"
      />

      <ConfirmDialog
        open={confirmSample}
        onClose={() => setConfirmSample(false)}
        onConfirm={loadSampleData}
        title="Muat Data Contoh?"
        message="Memuat data contoh akan menggantikan data siswa, guru, dan nilai yang saat ini tersimpan. Jika Anda ingin menyimpan data saat ini, lakukan Backup JSON di menu Pengaturan terlebih dahulu."
        confirmLabel="Ya, Muat Data Contoh"
        variant="primary"
      />
    </div>
  );
};
