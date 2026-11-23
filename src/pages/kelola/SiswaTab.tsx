import React, { useMemo, useState } from 'react';
import {
  Plus,
  ClipboardPaste,
  ArrowUpCircle,
  Search,
  Pencil,
  Trash2,
  Users,
  Check,
  GraduationCap,
} from 'lucide-react';
import { JenisKelamin, KelasNumber, Student } from '../../types';
import { KELAS_LIST } from '../../data/defaults';
import { useApp } from '../../context/AppContext';
import {
  getActivePeriodData,
  getActiveStudents,
  getFase,
  getNextAcademicYear,
  parseBulkStudents,
} from '../../utils/helpers';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

interface StudentFormState {
  nama: string;
  nis: string;
  nisn: string;
  jenisKelamin: JenisKelamin;
  kelas: KelasNumber;
  namaOrangTua: string;
}

const emptyForm = (kelas: KelasNumber = 1): StudentFormState => ({
  nama: '',
  nis: '',
  nisn: '',
  jenisKelamin: 'L',
  kelas,
  namaOrangTua: '',
});

export const SiswaTab: React.FC = () => {
  const {
    db,
    addStudent,
    addStudentsBulk,
    updateStudent,
    deleteStudent,
    promoteStudentsMass,
  } = useApp();

  const [kelasFilter, setKelasFilter] = useState<KelasNumber | 'all' | 'lulus'>('all');
  const [search, setSearch] = useState('');

  // Single add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormState>(emptyForm());

  // Bulk paste modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkKelas, setBulkKelas] = useState<KelasNumber>(1);
  const [bulkText, setBulkText] = useState('');

  // Mass promotion modal
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteChecked, setPromoteChecked] = useState<Set<string>>(new Set());
  const [advanceYear, setAdvanceYear] = useState(true);
  const [nextYearText, setNextYearText] = useState('');

  // Delete confirm
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  const activeStudents = useMemo(
    () => getActiveStudents(db.students),
    [db.students]
  );
  const graduatedStudents = useMemo(
    () => db.students.filter((s) => s.status === 'lulus'),
    [db.students]
  );

  const filteredStudents = useMemo(() => {
    let list =
      kelasFilter === 'lulus'
        ? graduatedStudents
        : kelasFilter === 'all'
        ? activeStudents
        : activeStudents.filter((s) => s.kelas === kelasFilter);

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q) ||
          s.namaOrangTua.toLowerCase().includes(q)
      );
    }

    return [...list].sort(
      (a, b) => a.kelas - b.kelas || a.nama.localeCompare(b.nama, 'id')
    );
  }, [activeStudents, graduatedStudents, kelasFilter, search]);

  const parsedBulk = useMemo(() => parseBulkStudents(bulkText), [bulkText]);

  const openAddModal = () => {
    setEditingStudent(null);
    const defaultKelas = typeof kelasFilter === 'number' ? kelasFilter : 1;
    setForm(emptyForm(defaultKelas));
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setForm({
      nama: student.nama,
      nis: student.nis,
      nisn: student.nisn,
      jenisKelamin: student.jenisKelamin,
      kelas: student.kelas,
      namaOrangTua: student.namaOrangTua,
    });
    setModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    if (editingStudent) {
      updateStudent(editingStudent.id, {
        ...form,
        nama: form.nama.trim(),
        nis: form.nis.trim(),
        nisn: form.nisn.trim(),
        namaOrangTua: form.namaOrangTua.trim(),
      });
    } else {
      addStudent({
        ...form,
        nama: form.nama.trim(),
        nis: form.nis.trim(),
        nisn: form.nisn.trim(),
        namaOrangTua: form.namaOrangTua.trim(),
        status: 'aktif',
      });
    }
    setModalOpen(false);
  };

  const handleSaveBulk = () => {
    if (parsedBulk.length === 0) return;
    addStudentsBulk(
      parsedBulk.map((p) => ({
        ...p,
        kelas: bulkKelas,
        status: 'aktif',
      }))
    );
    setBulkText('');
    setBulkOpen(false);
  };

  const openPromoteModal = () => {
    const period = getActivePeriodData(db);
    const initialSet = new Set<string>();
    for (const s of activeStudents) {
      const keputusan = period.reportMeta[s.id]?.keputusanKenaikan;
      // Pre-check everyone unless explicitly marked tinggal / tidak_lulus
      if (keputusan !== 'tinggal' && keputusan !== 'tidak_lulus') {
        initialSet.add(s.id);
      }
    }
    setPromoteChecked(initialSet);
    setNextYearText(getNextAcademicYear(db.settings.tahunAjaranAktif));
    setAdvanceYear(true);
    setPromoteOpen(true);
  };

  const togglePromoteStudent = (id: string) => {
    setPromoteChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmPromote = () => {
    const promoteIds = new Set<string>();
    const graduateIds = new Set<string>();
    for (const s of activeStudents) {
      if (!promoteChecked.has(s.id)) continue;
      if (s.kelas === 6) graduateIds.add(s.id);
      else promoteIds.add(s.id);
    }
    promoteStudentsMass(
      promoteIds,
      graduateIds,
      advanceYear,
      nextYearText.trim() || undefined
    );
    setPromoteOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa, NIS, NISN, atau orang tua..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-sky-200 bg-sky-50/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkKelas(typeof kelasFilter === 'number' ? kelasFilter : 1);
                setBulkOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-4 h-4" />
              Tempel Banyak Nama
            </button>
            {activeStudents.length > 0 && (
              <button
                type="button"
                onClick={openPromoteModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Naik Kelas Massal
              </button>
            )}
          </div>
        </div>

        {/* Class Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setKelasFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              kelasFilter === 'all'
                ? 'bg-sky-500 text-white'
                : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
            }`}
          >
            Semua ({activeStudents.length})
          </button>
          {KELAS_LIST.map((k) => {
            const count = activeStudents.filter((s) => s.kelas === k).length;
            const active = kelasFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKelasFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-500 text-white'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                Kelas {k} ({count})
              </button>
            );
          })}
          {graduatedStudents.length > 0 && (
            <button
              type="button"
              onClick={() => setKelasFilter('lulus')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                kelasFilter === 'lulus'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Alumni/Lulus ({graduatedStudents.length})
            </button>
          )}
        </div>
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title={
            activeStudents.length === 0
              ? 'Belum Ada Data Siswa'
              : 'Tidak Ada Siswa yang Cocok'
          }
          description={
            activeStudents.length === 0
              ? 'Tambahkan data siswa kelas 1 sampai 6 satu per satu, atau tempel banyak nama sekaligus dari Excel/WhatsApp.'
              : 'Coba ubah filter kelas atau kata kunci pencarian.'
          }
          action={
            activeStudents.length === 0 ? (
              <>
                <button
                  type="button"
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Siswa Pertama
                </button>
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-sm font-bold cursor-pointer"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Tempel Banyak Nama
                </button>
              </>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-sky-50/90 text-sky-900 border-b border-sky-100 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center font-bold">No</th>
                  <th className="py-3 px-4 font-bold">Nama Siswa</th>
                  <th className="py-3 px-4 font-bold">NIS / NISN</th>
                  <th className="py-3 px-4 text-center font-bold">L/P</th>
                  <th className="py-3 px-4 font-bold">Kelas / Fase</th>
                  <th className="py-3 px-4 font-bold">Orang Tua / Wali</th>
                  <th className="py-3 px-4 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {filteredStudents.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{s.nama}</p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">
                      <div>NIS: {s.nis || '-'}</div>
                      <div className="text-slate-400">NISN: {s.nisn || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge tone={s.jenisKelamin === 'L' ? 'sky' : 'amber'}>
                        {s.jenisKelamin}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {s.status === 'lulus' ? (
                        <Badge tone="emerald">Lulus</Badge>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          Kelas {s.kelas}
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 text-[11px]">
                            Fase {getFase(s.kelas)}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.namaOrangTua || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          className="p-2 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                          title="Edit siswa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(s)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus siswa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Single Student Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingStudent ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
        subtitle="Isi identitas peserta didik sesuai buku induk sekolah"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="student-form"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              {editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleSaveStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap Siswa <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Aisyah Putri Ramadhani"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                NIS
              </label>
              <input
                type="text"
                value={form.nis}
                onChange={(e) => setForm({ ...form, nis: e.target.value })}
                placeholder="Contoh: 2627001"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                NISN
              </label>
              <input
                type="text"
                value={form.nisn}
                onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                placeholder="Contoh: 0184520100"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jenis Kelamin
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['L', 'P'] as JenisKelamin[]).map((jk) => (
                  <button
                    key={jk}
                    type="button"
                    onClick={() => setForm({ ...form, jenisKelamin: jk })}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      form.jenisKelamin === jk
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                        : 'bg-white text-slate-600 border-sky-200 hover:bg-sky-50'
                    }`}
                  >
                    {jk === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kelas (Fase Otomatis)
              </label>
              <select
                value={form.kelas}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kelas: Number(e.target.value) as KelasNumber,
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
              >
                {KELAS_LIST.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k} — Fase {getFase(k)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Orang Tua / Wali
            </label>
            <input
              type="text"
              value={form.namaOrangTua}
              onChange={(e) =>
                setForm({ ...form, namaOrangTua: e.target.value })
              }
              placeholder="Contoh: Hendra Wijaya"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </form>
      </Modal>

      {/* Bulk Paste Students Modal */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Tempel Banyak Nama Siswa Sekaligus"
        subtitle="Salin daftar nama dari Excel, Word, atau WhatsApp lalu tempel di bawah ini"
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setBulkOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={parsedBulk.length === 0}
              onClick={handleSaveBulk}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              Simpan {parsedBulk.length} Siswa ke Kelas {bulkKelas}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-sky-50 border border-sky-100 rounded-xl p-3.5">
            <div className="flex-1">
              <p className="text-xs font-bold text-sky-900">
                Format yang didukung (1 siswa per baris):
              </p>
              <p className="text-xs text-sky-700 mt-0.5">
                Cukup ketik/tempel <strong>Nama saja</strong>, atau format{' '}
                <code className="bg-white px-1.5 py-0.5 rounded text-[11px]">
                  Nama, NIS, NISN, L/P, Nama Ortu
                </code>{' '}
                (dipisah koma, titik koma, atau tab dari Excel).
              </p>
            </div>
            <div className="shrink-0">
              <label className="block text-[11px] font-bold text-sky-800 mb-1">
                Masukkan ke Kelas:
              </label>
              <select
                value={bulkKelas}
                onChange={(e) =>
                  setBulkKelas(Number(e.target.value) as KelasNumber)
                }
                className="px-3 py-1.5 rounded-lg border border-sky-300 bg-white text-sm font-bold text-sky-900"
              >
                {KELAS_LIST.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k} (Fase {getFase(k)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Contoh:\nAhmad Fauzan, 2627010, 0181122334, L, Budi Santoso\nSiti Rahma, 2627011, 0181122335, P, Dadang\nRizki Pratama`}
            className="w-full p-3.5 rounded-xl border border-sky-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
          />

          {parsedBulk.length > 0 && (
            <div className="border border-sky-100 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-sky-50 border-b border-sky-100 text-xs font-bold text-sky-900">
                Pratinjau ({parsedBulk.length} siswa terdeteksi)
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b">
                      <th className="py-1.5 px-2.5 text-left">Nama</th>
                      <th className="py-1.5 px-2.5 text-left">NIS</th>
                      <th className="py-1.5 px-2.5 text-left">NISN</th>
                      <th className="py-1.5 px-2.5 text-center">L/P</th>
                      <th className="py-1.5 px-2.5 text-left">Orang Tua</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedBulk.map((p, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                          {p.nama}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500">
                          {p.nis || '-'}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500">
                          {p.nisn || '-'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {p.jenisKelamin}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500">
                          {p.namaOrangTua || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Mass Class Promotion Modal */}
      <Modal
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        title="Naik Kelas Massal — Tahun Ajaran Baru"
        subtitle="Siswa yang dicentang akan naik 1 tingkat (Kelas 6 akan ditandai Lulus). Nilai tahun ajaran sebelumnya tetap tersimpan aman."
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPromoteOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={promoteChecked.size === 0}
              onClick={handleConfirmPromote}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              <GraduationCap className="w-4 h-4" />
              Proses Kenaikan ({promoteChecked.size} Siswa)
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Option to switch active academic year */}
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={advanceYear}
                onChange={(e) => setAdvanceYear(e.target.checked)}
                className="mt-1 w-4 h-4 accent-sky-600"
              />
              <span className="text-xs sm:text-sm text-sky-950">
                <strong>Otomatis pindah ke Tahun Ajaran baru</strong> & atur
                Semester menjadi <strong>Ganjil</strong>
              </span>
            </label>
            {advanceYear && (
              <input
                type="text"
                value={nextYearText}
                onChange={(e) => setNextYearText(e.target.value)}
                placeholder="2027/2028"
                className="w-32 px-3 py-1.5 rounded-lg border border-sky-300 bg-white text-sm font-bold text-sky-900"
              />
            )}
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {[...KELAS_LIST].reverse().map((k) => {
              const list = activeStudents
                .filter((s) => s.kelas === k)
                .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
              if (list.length === 0) return null;

              const targetLabel =
                k === 6 ? 'Lulus (Alumni)' : `Naik ke Kelas ${k + 1}`;

              return (
                <div
                  key={k}
                  className="border border-sky-100 rounded-xl overflow-hidden"
                >
                  <div className="px-3.5 py-2 bg-sky-50/80 border-b border-sky-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-sky-900">
                      Kelas {k} → {targetLabel}
                    </span>
                    <span className="text-xs text-slate-500">
                      {list.filter((s) => promoteChecked.has(s.id)).length} /{' '}
                      {list.length} dipilih
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {list.map((s) => {
                      const checked = promoteChecked.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-sky-50/40 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => togglePromoteStudent(s.id)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                checked
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {checked && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-sm font-semibold text-slate-700">
                              {s.nama}
                            </span>
                          </div>
                          <Badge tone={checked ? 'emerald' : 'amber'}>
                            {checked ? targetLabel : `Tinggal di Kelas ${k}`}
                          </Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={() => {
          if (deletingStudent) deleteStudent(deletingStudent.id);
        }}
        title="Hapus Data Siswa?"
        message={`Anda yakin ingin menghapus siswa "${deletingStudent?.nama}"? Data nilai yang terkait dengan siswa ini tidak akan tampil lagi di leger maupun rapor.`}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
};
