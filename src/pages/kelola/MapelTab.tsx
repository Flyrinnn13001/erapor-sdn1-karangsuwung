import React, { useState } from 'react';
import { Plus, Pencil, Trash2, RotateCcw, BookOpen } from 'lucide-react';
import { KelasNumber, Subject } from '../../types';
import { KELAS_LIST } from '../../data/defaults';
import { useApp } from '../../context/AppContext';
import { getSubjectKktp } from '../../utils/helpers';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

interface SubjectForm {
  nama: string;
  kode: string;
  kktp: string;
  kelasAktif: KelasNumber[];
}

export const MapelTab: React.FC = () => {
  const { db, addSubject, updateSubject, deleteSubject, resetDefaultSubjects } =
    useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [form, setForm] = useState<SubjectForm>({
    nama: '',
    kode: '',
    kktp: '',
    kelasAktif: [1, 2, 3, 4, 5, 6],
  });

  const sortedSubjects = [...db.subjects].sort(
    (a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama, 'id')
  );

  const openAdd = () => {
    setEditing(null);
    setForm({
      nama: '',
      kode: '',
      kktp: '',
      kelasAktif: [1, 2, 3, 4, 5, 6],
    });
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({
      nama: s.nama,
      kode: s.kode,
      kktp: s.kktp !== undefined ? String(s.kktp) : '',
      kelasAktif: s.kelasAktif?.length ? [...s.kelasAktif] : [1, 2, 3, 4, 5, 6],
    });
    setModalOpen(true);
  };

  const toggleKelas = (k: KelasNumber) => {
    setForm((prev) => {
      const exists = prev.kelasAktif.includes(k);
      const next = exists
        ? prev.kelasAktif.filter((x) => x !== k)
        : [...prev.kelasAktif, k].sort((a, b) => a - b);
      return { ...prev, kelasAktif: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    const kode =
      form.kode.trim().toUpperCase() ||
      form.nama
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 5);
    const kktpNum = form.kktp.trim() === '' ? undefined : Number(form.kktp);
    const kelasAktif =
      form.kelasAktif.length > 0 ? form.kelasAktif : ([1, 2, 3, 4, 5, 6] as KelasNumber[]);

    if (editing) {
      updateSubject(editing.id, {
        nama: form.nama.trim(),
        kode,
        kktp: kktpNum,
        kelasAktif,
      });
    } else {
      addSubject({
        nama: form.nama.trim(),
        kode,
        kktp: kktpNum,
        kelasAktif,
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
            Mata Pelajaran SD Kurikulum Merdeka
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur daftar mata pelajaran, kode singkatan untuk leger, kelas
            pengampu, serta KKTP (default: {db.settings.kktpDefault}).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Default 9 Mapel
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Mapel
          </button>
        </div>
      </div>

      {sortedSubjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-7 h-7" />}
          title="Belum Ada Mata Pelajaran"
          description="Tambahkan mata pelajaran baru atau muat 9 mata pelajaran standar SD Kurikulum Merdeka."
          action={
            <button
              type="button"
              onClick={resetDefaultSubjects}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
            >
              Muat 9 Mapel Kurikulum Merdeka
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
                  <th className="py-3 px-4 font-bold">Nama Mata Pelajaran</th>
                  <th className="py-3 px-4 font-bold">Kode Leger</th>
                  <th className="py-3 px-4 text-center font-bold">KKTP</th>
                  <th className="py-3 px-4 font-bold">Berlaku di Kelas</th>
                  <th className="py-3 px-4 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50">
                {sortedSubjects.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-sky-50/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-semibold tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {s.nama}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone="sky">{s.kode}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-bold tabular-nums text-slate-700">
                      {getSubjectKktp(s, db.settings.kktpDefault)}
                      {s.kktp === undefined && (
                        <span className="text-[10px] font-normal text-slate-400 block">
                          default
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {KELAS_LIST.map((k) => {
                          const on = !s.kelasAktif || s.kelasAktif.includes(k);
                          return (
                            <span
                              key={k}
                              className={`w-6 h-6 rounded-md text-[11px] font-bold inline-flex items-center justify-center ${
                                on
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-300'
                              }`}
                            >
                              {k}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="p-2 rounded-lg text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer"
                          title="Edit mapel"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(s)}
                          className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus mapel"
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
        title={editing ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran'}
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
              form="subject-form"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              {editing ? 'Simpan Perubahan' : 'Simpan Mapel'}
            </button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Mata Pelajaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: Muatan Lokal Bahasa Sunda"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kode / Singkatan Leger
              </label>
              <input
                type="text"
                maxLength={8}
                value={form.kode}
                onChange={(e) => setForm({ ...form, kode: e.target.value })}
                placeholder="Contoh: B.SUN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                KKTP Khusus (opsional)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.kktp}
                onChange={(e) => setForm({ ...form, kktp: e.target.value })}
                placeholder={`Default: ${db.settings.kktpDefault}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Berlaku untuk Kelas
            </label>
            <div className="grid grid-cols-6 gap-2">
              {KELAS_LIST.map((k) => {
                const active = form.kelasAktif.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleKelas(k)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-sky-50'
                    }`}
                  >
                    Kls {k}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteSubject(deleting.id);
        }}
        title="Hapus Mata Pelajaran?"
        message={`Anda yakin ingin menghapus mata pelajaran "${deleting?.nama}"?`}
        confirmLabel="Ya, Hapus"
      />

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={resetDefaultSubjects}
        title="Kembalikan 9 Mapel Default?"
        message="Daftar mata pelajaran akan dikembalikan ke 9 mata pelajaran standar SD Kurikulum Merdeka (PAI, Pendidikan Pancasila, Bahasa Indonesia, Matematika, IPAS, PJOK, Seni Budaya, Bahasa Inggris, dan Muatan Lokal Bahasa Sunda)."
        confirmLabel="Ya, Kembalikan"
        variant="primary"
      />
    </div>
  );
};
