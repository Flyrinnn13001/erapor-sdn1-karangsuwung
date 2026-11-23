import React, { useRef, useState } from 'react';
import {
  Save,
  Download,
  Upload,
  Sparkles,
  Trash2,
  RotateCcw,
  School,
  Sliders,
  Database,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { AppDatabase, Semester } from '../types';
import { DEFAULT_SETTINGS } from '../data/defaults';
import { useApp } from '../context/AppContext';
import { downloadBackupJson, validateBackupJson } from '../utils/storage';
import { formatTanggalIndo } from '../utils/helpers';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { InstallPwaButton } from '../components/ui/InstallPwaButton';

export const PengaturanPage: React.FC = () => {
  const {
    db,
    updateSettings,
    addTahunAjaran,
    loadSampleData,
    clearAllData,
    restoreDatabase,
    showToast,
  } = useApp();

  // School Identity local form
  const [namaSekolah, setNamaSekolah] = useState(db.settings.namaSekolah);
  const [npsn, setNpsn] = useState(db.settings.npsn);
  const [alamatSekolah, setAlamatSekolah] = useState(db.settings.alamatSekolah);
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState(
    db.settings.namaKepalaSekolah
  );
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState(
    db.settings.nipKepalaSekolah
  );
  const [tempatRapor, setTempatRapor] = useState(db.settings.tempatRapor);
  const [tanggalRapor, setTanggalRapor] = useState(db.settings.tanggalRapor);

  // Period local
  const [newTa, setNewTa] = useState('');

  // Weights & KKTP
  const [bobot, setBobot] = useState({ ...db.settings.bobot });
  const [kktpDefault, setKktpDefault] = useState(db.settings.kktpDefault);

  // Modals
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    data: AppDatabase;
    summary: {
      namaSekolah: string;
      jumlahSiswa: number;
      jumlahGuru: number;
      jumlahMapel: number;
      jumlahPeriode: number;
    };
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync local inputs when db changes (e.g., after restore or sample data load)
  React.useEffect(() => {
    setNamaSekolah(db.settings.namaSekolah);
    setNpsn(db.settings.npsn);
    setAlamatSekolah(db.settings.alamatSekolah);
    setNamaKepalaSekolah(db.settings.namaKepalaSekolah);
    setNipKepalaSekolah(db.settings.nipKepalaSekolah);
    setTempatRapor(db.settings.tempatRapor);
    setTanggalRapor(db.settings.tanggalRapor);
    setBobot({ ...db.settings.bobot });
    setKktpDefault(db.settings.kktpDefault);
  }, [db.settings]);

  const totalBobot =
    (Number(bobot.formatif) || 0) +
    (Number(bobot.sumatif) || 0) +
    (Number(bobot.sts) || 0) +
    (Number(bobot.sas) || 0);

  const kepsekFromTeachers = db.teachers.find(
    (t) => t.jabatan === 'Kepala Sekolah'
  );

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      namaSekolah: namaSekolah.trim() || 'SDN 1 Karangsuwung',
      npsn: npsn.trim(),
      alamatSekolah: alamatSekolah.trim(),
      namaKepalaSekolah: namaKepalaSekolah.trim(),
      nipKepalaSekolah: nipKepalaSekolah.trim(),
      tempatRapor: tempatRapor.trim() || 'Karangsuwung',
      tanggalRapor,
    });
    showToast('Identitas sekolah & tanggal rapor berhasil disimpan.');
  };

  const handleSaveScoring = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalBobot !== 100) {
      showToast('Total bobot penilaian harus tepat 100%.', 'error');
      return;
    }
    const clampedKktp = Math.max(0, Math.min(100, Number(kktpDefault) || 70));
    updateSettings({
      bobot: {
        formatif: Number(bobot.formatif) || 0,
        sumatif: Number(bobot.sumatif) || 0,
        sts: Number(bobot.sts) || 0,
        sas: Number(bobot.sas) || 0,
      },
      kktpDefault: clampedKktp,
    });
    showToast('Bobot nilai akhir & KKTP default berhasil diperbarui.');
  };

  const handleAddTa = () => {
    const clean = newTa.trim();
    if (!clean) return;
    addTahunAjaran(clean);
    updateSettings({ tahunAjaranAktif: clean });
    setNewTa('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const result = validateBackupJson(text);
      if (!result.valid || !result.data || !result.summary) {
        setRestoreError(result.error || 'File backup tidak valid.');
      } else {
        setPendingRestore({ data: result.data, summary: result.summary });
      }
    };
    reader.readAsText(file);
    // Reset so user can re-upload same file if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* 1. Identitas Sekolah & Tanggal Rapor */}
      <form
        onSubmit={handleSaveIdentity}
        className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/70 to-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              Identitas Sekolah & Tanggal Rapor
            </h3>
            <p className="text-xs text-slate-500">
              Informasi ini akan otomatis tercetak pada kop dan tanda tangan
              Leger & E-Rapor.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Sekolah
              </label>
              <input
                type="text"
                required
                value={namaSekolah}
                onChange={(e) => setNamaSekolah(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                NPSN (opsional)
              </label>
              <input
                type="text"
                value={npsn}
                onChange={(e) => setNpsn(e.target.value)}
                placeholder="Contoh: 20214829"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alamat Sekolah
            </label>
            <textarea
              rows={2}
              value={alamatSekolah}
              onChange={(e) => setAlamatSekolah(e.target.value)}
              placeholder="Contoh: Jl. Raya Karangsuwung No. 15, Kec. Karangsembung, Kab. Cirebon, Jawa Barat"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="pt-2 border-t border-sky-50">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold text-sky-800">
                Data Kepala Sekolah
              </span>
              {kepsekFromTeachers && (
                <button
                  type="button"
                  onClick={() => {
                    setNamaKepalaSekolah(kepsekFromTeachers.nama);
                    setNipKepalaSekolah(kepsekFromTeachers.nip);
                    showToast('Nama & NIP Kepala Sekolah diambil dari Data Guru.', 'info');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Ambil dari Data Guru ({kepsekFromTeachers.nama})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={namaKepalaSekolah}
                  onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                  placeholder="Contoh: H. Dedi Supriadi, S.Pd., M.Pd."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={nipKepalaSekolah}
                  onChange={(e) => setNipKepalaSekolah(e.target.value)}
                  placeholder="Contoh: 19700412 199403 1 006"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tempat Penandatanganan Rapor
              </label>
              <input
                type="text"
                value={tempatRapor}
                onChange={(e) => setTempatRapor(e.target.value)}
                placeholder="Karangsuwung"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tanggal Rapor ({formatTanggalIndo(tanggalRapor)})
              </label>
              <input
                type="date"
                value={tanggalRapor}
                onChange={(e) => setTanggalRapor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Identitas Sekolah
            </button>
          </div>
        </div>
      </form>

      {/* 2. Tahun Ajaran & Semester Aktif */}
      <section className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
            Tahun Ajaran & Semester Aktif
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Data nilai, absensi, dan ekstrakurikuler disimpan terpisah per Tahun
            Ajaran dan Semester sehingga riwayat tidak saling menimpa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tahun Ajaran Aktif
            </label>
            <select
              value={db.settings.tahunAjaranAktif}
              onChange={(e) =>
                updateSettings({ tahunAjaranAktif: e.target.value })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 bg-white text-sm font-bold text-slate-800"
            >
              {db.settings.daftarTahunAjaran.map((ta) => (
                <option key={ta} value={ta}>
                  {ta}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Semester Aktif
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Ganjil', 'Genap'] as Semester[]).map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => updateSettings({ semesterAktif: sem })}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    db.settings.semesterAktif === sem
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-white text-slate-600 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  Semester {sem}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-sky-50">
          <input
            type="text"
            value={newTa}
            onChange={(e) => setNewTa(e.target.value)}
            placeholder="Tambah tahun ajaran baru (contoh: 2028/2029)"
            className="flex-1 px-3.5 py-2 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="button"
            onClick={handleAddTa}
            disabled={!newTa.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-700 border border-sky-200 text-xs sm:text-sm font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah & Aktifkan
          </button>
        </div>
      </section>

      {/* 3. Bobot Perhitungan Nilai Akhir & KKTP Default */}
      <form
        onSubmit={handleSaveScoring}
        className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/70 to-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                Bobot Nilai Akhir & KKTP Default
              </h3>
              <p className="text-xs text-slate-500">
                Total bobot Formatif + Sumatif + STS + SAS harus sama dengan
                100%.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setBobot({ ...DEFAULT_SETTINGS.bobot });
              setKktpDefault(DEFAULT_SETTINGS.kktpDefault);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Default
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {(
              [
                ['formatif', 'Formatif (%)'],
                ['sumatif', 'Sumatif (%)'],
                ['sts', 'STS (%)'],
                ['sas', 'SAS (%)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bobot[key]}
                  onChange={(e) =>
                    setBobot({
                      ...bobot,
                      [key]: Math.max(
                        0,
                        Math.min(100, parseInt(e.target.value || '0', 10) || 0)
                      ),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm font-extrabold text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            ))}
          </div>

          <div
            className={`rounded-xl px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold border ${
              totalBobot === 100
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {totalBobot === 100 ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              Total Bobot Saat Ini
            </span>
            <span className="tabular-nums text-base">{totalBobot}%</span>
          </div>

          <div className="max-w-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nilai KKTP Default (0–100)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={kktpDefault}
              onChange={(e) =>
                setKktpDefault(
                  Math.max(
                    0,
                    Math.min(100, parseInt(e.target.value || '0', 10) || 0)
                  )
                )
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm font-extrabold tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Siswa dengan Nilai Akhir ≥ {kktpDefault} dinyatakan{' '}
              <strong className="text-emerald-600">Tuntas</strong>.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={totalBobot !== 100}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Simpan Bobot & KKTP
            </button>
          </div>
        </div>
      </form>

      {/* 4. Backup, Restore & Data Contoh */}
      <section className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100 bg-gradient-to-r from-sky-50/70 to-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              Backup, Restore JSON & Data Contoh
            </h3>
            <p className="text-xs text-slate-500">
              Simpan cadangan semua data secara berkala agar aman saat ganti HP
              atau browser.
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  Backup Semua Data (JSON)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mengunduh seluruh data siswa, guru, mapel, ekskul, nilai, dan
                  pengaturan ke 1 file <code>.json</code>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  downloadBackupJson(db);
                  showToast('File backup JSON berhasil diunduh.');
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Unduh Backup JSON
              </button>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  Restore Data dari Backup (JSON)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Pulihkan data dari file backup <code>.json</code> yang pernah
                  Anda unduh sebelumnya.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-sm font-bold cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Pilih File Backup JSON
                </button>
              </div>
            </div>
          </div>

          {restoreError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
              {restoreError}
            </div>
          )}

          {/* Install Aplikasi di HP (PWA) */}
          <div className="pt-4 border-t border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                Pasang sebagai Aplikasi di HP (PWA)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Di <strong>Android (Chrome)</strong>: ketuk menu ⋮ →{' '}
                <em>Install aplikasi / Tambahkan ke layar utama</em>. Di{' '}
                <strong>iPhone (Safari)</strong>: ketuk tombol Bagikan →{' '}
                <em>Tambahkan ke Layar Utama</em>. Aplikasi akan tampil layar
                penuh dan dapat digunakan secara offline.
              </p>
            </div>
            <div className="shrink-0">
              <InstallPwaButton />
            </div>
          </div>

          {/* Data Contoh & Reset */}
          <div className="pt-4 border-t border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                Data Contoh & Kosongkan Aplikasi
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Gunakan <strong>Isi Data Contoh</strong> untuk simulasi, lalu
                hapus kembali saat siap mengisi data resmi SDN 1 Karangsuwung.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmSample(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Isi Data Contoh
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Kosongkan Semua Data
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Restore Preview Modal */}
      <Modal
        open={Boolean(pendingRestore)}
        onClose={() => setPendingRestore(null)}
        title="Konfirmasi Restore Backup JSON"
        subtitle="Pastikan ringkasan file backup di bawah ini sudah sesuai"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPendingRestore(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingRestore) {
                  restoreDatabase(pendingRestore.data);
                  setPendingRestore(null);
                }
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
            >
              Ya, Pulihkan Data
            </button>
          </>
        }
      >
        {pendingRestore && (
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-sky-50 border border-sky-100 p-3.5 space-y-1.5 text-xs">
              <p>
                <strong>Sekolah:</strong> {pendingRestore.summary.namaSekolah}
              </p>
              <p>
                <strong>Jumlah Siswa:</strong>{' '}
                {pendingRestore.summary.jumlahSiswa} siswa
              </p>
              <p>
                <strong>Jumlah Guru:</strong>{' '}
                {pendingRestore.summary.jumlahGuru} guru
              </p>
              <p>
                <strong>Mata Pelajaran:</strong>{' '}
                {pendingRestore.summary.jumlahMapel} mapel
              </p>
              <p>
                <strong>Periode Nilai Tersimpan:</strong>{' '}
                {pendingRestore.summary.jumlahPeriode} semester
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Data yang ada di browser saat ini akan diganti dengan data dari
              file backup tersebut.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmSample}
        onClose={() => setConfirmSample(false)}
        onConfirm={loadSampleData}
        title="Isi Data Contoh SDN 1 Karangsuwung?"
        message="Data contoh berisi 25 siswa (Kelas 1–6), 9 guru, ekstrakurikuler, nilai, dan catatan wali kelas akan dimuat untuk simulasi. Data yang ada saat ini akan terganti."
        confirmLabel="Ya, Isi Data Contoh"
        variant="primary"
      />

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAllData}
        title="Kosongkan Semua Data?"
        message="Semua data siswa, guru, nilai, absensi, dan ekstrakurikuler akan dihapus sehingga aplikasi kembali dalam keadaan kosong. Pastikan Anda sudah Backup JSON bila diperlukan."
        confirmLabel="Ya, Kosongkan Semua"
        variant="danger"
      />
    </div>
  );
};
