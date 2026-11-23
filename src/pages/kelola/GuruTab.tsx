import React, { useState } from 'react';
import { Plus, Pencil, Trash2, UserCheck } from 'lucide-react';
import { JabatanGuru, Teacher } from '../../types';
import { JABATAN_LIST } from '../../data/defaults';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

interface TeacherForm {
  nama: string;
  nip: string;
  jabatan: JabatanGuru;
}

export const GuruTab: React.FC = () => {
  const { db, addTeacher, updateTeacher, deleteTeacher } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>({
    nama: '',
    nip: '',
    jabatan: 'Wali Kelas 1',
  });

  const sortedTeachers = [...db.teachers].sort((a, b) => {
    const idxA = JABATAN_LIST.indexOf(a.jabatan);
    const idxB = JABATAN_LIST.indexOf(b.jabatan);
    if (idxA !== idxB) return idxA - idxB;
    return a.nama.localeCompare(b.nama, 'id');
  });

  const openAdd = () => {
    setEditing(null);
    // Pick first unassigned Wali Kelas if available
    const usedJabatan = new Set(db.teachers.map((t) => t.jabatan));
    const suggested =
      JABATAN_LIST.find(
        (j) => j !== 'Guru Mata Pelajaran' && !usedJabatan.has(j)
      ) || 'Guru Mata Pelajaran';
    setForm({ nama: '', nip: '', jabatan: suggested });
    setModalOpen(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setForm({ nama: t.nama, nip: t.nip, jabatan: t.jabatan });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    if (editing) {
      updateTeacher(editing.id, {
        nama: form.nama.trim(),
        nip: form.nip.trim(),
        jabatan: form.jabatan,
      });
    } else {
      addTeacher({
        nama: form.nama.trim(),
        nip: form.nip.trim(),
        jabatan: form.jabatan,
      });
    }
    setModalOpen(false);
  };

  const getJabatanTone = (j: JabatanGuru) => {
    if (j === 'Kepala Sekolah') return 'emerald' as const;
    if (j.startsWith('Wali Kelas')) return 'sky' as const;
    return 'slate' as const;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
            Daftar Pendidik & Tenaga Kependidikan
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Wali Kelas 1–6 dan Kepala Sekolah otomatis tampil pada Dashboard,
            Leger, dan tanda tangan E-Rapor.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Guru
        </button>
      </div>

      {sortedTeachers.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-7 h-7" />}
          title="Belum Ada Data Guru"
          description="Tambahkan Kepala Sekolah, Wali Kelas 1 sampai 6, serta Guru Mata Pelajaran untuk melengkapi tanda tangan rapor dan daftar kelas."
          action={
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Guru Pertama
            </button>
          }
        />
      ) : (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-sky-50/90 text-sky-900 border-b border-sky-100 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center font-bold">No</th>
                  <th className="py-3 px-4 font-bold">Nama Guru</th>
                  <th className="py-3 px-4 font-bold">NIP</th>
                  <th className="py-3 px-4 font-bold">Jabatan</th>
                  <th className="py-3 px-4 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {sortedTeachers.map((t, idx) => (
                  <tr
                    key={t.id}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {t.nama}
                    </td>
                    <td className="py-3 px-4 text-slate-600 tabular-nums text-xs sm:text-sm">
                      {t.nip || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={getJabatanTone(t.jabatan)}>{t.jabatan}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="p-2 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                          title="Edit guru"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(t)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus guru"
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

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Ubah Data Guru' : 'Tambah Data Guru'}
        subtitle="Masukkan nama lengkap beserta gelar, NIP, dan jabatan"
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
              form="teacher-form"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              {editing ? 'Simpan Perubahan' : 'Simpan Guru'}
            </button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap & Gelar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Siti Aminah, S.Pd.SD"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              NIP (kosongkan jika belum PNS/PPPK)
            </label>
            <input
              type="text"
              value={form.nip}
              onChange={(e) => setForm({ ...form, nip: e.target.value })}
              placeholder="Contoh: 19830519 200902 2 004"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Jabatan
            </label>
            <select
              value={form.jabatan}
              onChange={(e) =>
                setForm({ ...form, jabatan: e.target.value as JabatanGuru })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {JABATAN_LIST.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteTeacher(deleting.id);
        }}
        title="Hapus Data Guru?"
        message={`Anda yakin ingin menghapus data guru "${deleting?.nama}"?`}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
};
