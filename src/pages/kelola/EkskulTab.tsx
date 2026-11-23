import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Award, Sparkles } from 'lucide-react';
import {
  ExtracurricularActivity,
  KelasNumber,
  PredikatEkskul,
  Student,
  StudentExtracurricular,
} from '../../types';
import { KELAS_LIST, PREDIKAT_EKSKUL_LIST } from '../../data/defaults';
import { useApp } from '../../context/AppContext';
import {
  getActivePeriodData,
  getFase,
  getStudentsByKelas,
} from '../../utils/helpers';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';

const QUICK_ACTIVITIES = [
  {
    nama: 'Pramuka',
    keteranganDefault:
      'Aktif mengikuti latihan kepramukaan, disiplin, dan mampu bekerja sama dalam regu.',
  },
  {
    nama: 'Pencak Silat',
    keteranganDefault:
      'Menunjukkan semangat tinggi dalam latihan jurus dasar dan menjunjung sportivitas.',
  },
  {
    nama: 'Tari Tradisional',
    keteranganDefault:
      'Kreatif dan percaya diri dalam menampilkan gerak tari daerah.',
  },
  {
    nama: 'Baca Tulis Al-Qur’an (BTQ)',
    keteranganDefault:
      'Rajin berlatih membaca dan menulis huruf hijaiyah dengan baik.',
  },
];

export const EkskulTab: React.FC = () => {
  const {
    db,
    addActivity,
    updateActivity,
    deleteActivity,
    upsertStudentExtracurricular,
    deleteStudentExtracurricular,
  } = useApp();

  const [selectedKelas, setSelectedKelas] = useState<KelasNumber>(1);

  // Master Activity Modal
  const [actModalOpen, setActModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<ExtracurricularActivity | null>(
    null
  );
  const [deletingAct, setDeletingAct] =
    useState<ExtracurricularActivity | null>(null);
  const [actForm, setActForm] = useState({ nama: '', keteranganDefault: '' });

  // Student Ekskul Modal
  const [stuModalOpen, setStuModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [editingStuEkskul, setEditingStuEkskul] =
    useState<StudentExtracurricular | null>(null);
  const [stuForm, setStuForm] = useState<{
    activityId: string;
    predikat: PredikatEkskul;
    deskripsi: string;
  }>({
    activityId: '',
    predikat: 'Baik',
    deskripsi: '',
  });

  const period = getActivePeriodData(db);
  const studentsInClass = useMemo(
    () => getStudentsByKelas(db.students, selectedKelas),
    [db.students, selectedKelas]
  );

  const openAddAct = () => {
    setEditingAct(null);
    setActForm({ nama: '', keteranganDefault: '' });
    setActModalOpen(true);
  };

  const openEditAct = (act: ExtracurricularActivity) => {
    setEditingAct(act);
    setActForm({
      nama: act.nama,
      keteranganDefault: act.keteranganDefault || '',
    });
    setActModalOpen(true);
  };

  const handleSaveAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actForm.nama.trim()) return;
    if (editingAct) {
      updateActivity(editingAct.id, {
        nama: actForm.nama.trim(),
        keteranganDefault: actForm.keteranganDefault.trim(),
      });
    } else {
      addActivity({
        nama: actForm.nama.trim(),
        keteranganDefault: actForm.keteranganDefault.trim(),
      });
    }
    setActModalOpen(false);
  };

  const openAddStuEkskul = (student: Student) => {
    setTargetStudent(student);
    setEditingStuEkskul(null);
    const firstAct = db.activities[0];
    setStuForm({
      activityId: firstAct?.id || '',
      predikat: 'Baik',
      deskripsi: firstAct?.keteranganDefault || '',
    });
    setStuModalOpen(true);
  };

  const openEditStuEkskul = (
    student: Student,
    item: StudentExtracurricular
  ) => {
    setTargetStudent(student);
    setEditingStuEkskul(item);
    setStuForm({
      activityId: item.activityId,
      predikat: item.predikat,
      deskripsi: item.deskripsi,
    });
    setStuModalOpen(true);
  };

  const handleSaveStuEkskul = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !stuForm.activityId) return;
    upsertStudentExtracurricular({
      id: editingStuEkskul?.id,
      studentId: targetStudent.id,
      activityId: stuForm.activityId,
      predikat: stuForm.predikat,
      deskripsi: stuForm.deskripsi.trim(),
    });
    setStuModalOpen(false);
  };

  const predikatTone = (p: PredikatEkskul) => {
    if (p === 'Sangat Baik') return 'emerald' as const;
    if (p === 'Baik') return 'sky' as const;
    if (p === 'Cukup') return 'amber' as const;
    return 'rose' as const;
  };

  return (
    <div className="space-y-5">
      {/* Section 1: Master Daftar Kegiatan */}
      <section className="bg-white rounded-2xl border border-sky-100 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              1. Daftar Kegiatan Ekstrakurikuler
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tambahkan kegiatan ekstrakurikuler sekolah (contoh: Pramuka, Pencak
              Silat, Tari, BTQ).
            </p>
          </div>
          <button
            type="button"
            onClick={openAddAct}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Kegiatan
          </button>
        </div>

        {db.activities.length === 0 ? (
          <div className="rounded-xl bg-sky-50/70 border border-dashed border-sky-200 p-4 text-center space-y-3">
            <p className="text-xs sm:text-sm text-slate-600">
              Belum ada kegiatan ekstrakurikuler. Klik salah satu saran cepat di
              bawah atau buat sendiri:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIVITIES.map((qa) => (
                <button
                  key={qa.nama}
                  type="button"
                  onClick={() => addActivity(qa)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />+ {qa.nama}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {db.activities.map((act) => (
              <div
                key={act.id}
                className="rounded-xl border border-sky-100 bg-sky-50/30 p-3.5 flex items-start justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-sky-500 shrink-0" />
                    <h4 className="font-bold text-slate-800 text-sm truncate">
                      {act.nama}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {act.keteranganDefault || 'Tidak ada template deskripsi'}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditAct(act)}
                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-100 cursor-pointer"
                    title="Ubah kegiatan"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingAct(act)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                    title="Hapus kegiatan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Penilaian Ekstrakurikuler per Siswa */}
      <section className="bg-white rounded-2xl border border-sky-100 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
              2. Predikat & Deskripsi Ekstrakurikuler per Siswa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Periode aktif: TA {db.settings.tahunAjaranAktif} Semester{' '}
              {db.settings.semesterAktif}
            </p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {KELAS_LIST.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedKelas(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedKelas === k
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                Kelas {k}
              </button>
            ))}
          </div>
        </div>

        {studentsInClass.length === 0 ? (
          <EmptyState
            icon={<Award className="w-7 h-7" />}
            title={`Belum Ada Siswa di Kelas ${selectedKelas} (Fase ${getFase(selectedKelas)})`}
            description="Tambahkan data siswa terlebih dahulu di tab Data Siswa untuk mengisi kegiatan ekstrakurikuler mereka."
          />
        ) : (
          <div className="divide-y divide-sky-100 border border-sky-100 rounded-xl overflow-hidden">
            {studentsInClass.map((student, idx) => {
              const items = period.extracurriculars.filter(
                (e) => e.studentId === student.id
              );
              return (
                <div
                  key={student.id}
                  className="p-3.5 sm:p-4 hover:bg-sky-50/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold inline-flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          {student.nama}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          NIS: {student.nis || '-'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={db.activities.length === 0}
                      onClick={() => openAddStuEkskul(student)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-700 border border-sky-200 text-xs font-bold self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Ekskul
                    </button>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:pl-8">
                      {items.map((item) => {
                        const act = db.activities.find(
                          (a) => a.id === item.activityId
                        );
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl bg-white border border-sky-100 p-3 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-800">
                                  {act?.nama || 'Kegiatan'}
                                </span>
                                <Badge tone={predikatTone(item.predikat)}>
                                  {item.predikat}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                {item.deskripsi || '-'}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditStuEkskul(student, item)}
                                className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  deleteStudentExtracurricular(item.id)
                                }
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Master Kegiatan */}
      <Modal
        open={actModalOpen}
        onClose={() => setActModalOpen(false)}
        title={
          editingAct
            ? 'Ubah Kegiatan Ekstrakurikuler'
            : 'Tambah Kegiatan Ekstrakurikuler'
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setActModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="act-form"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              Simpan Kegiatan
            </button>
          </>
        }
      >
        <form id="act-form" onSubmit={handleSaveAct} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Kegiatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={actForm.nama}
              onChange={(e) => setActForm({ ...actForm, nama: e.target.value })}
              placeholder="Contoh: Pramuka"
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Template Deskripsi (opsional)
            </label>
            <textarea
              rows={3}
              value={actForm.keteranganDefault}
              onChange={(e) =>
                setActForm({ ...actForm, keteranganDefault: e.target.value })
              }
              placeholder="Contoh: Aktif mengikuti latihan kepramukaan dan disiplin dalam bekerja sama."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </form>
      </Modal>

      {/* Modal Ekskul Siswa */}
      <Modal
        open={stuModalOpen}
        onClose={() => setStuModalOpen(false)}
        title={`Ekstrakurikuler — ${targetStudent?.nama || ''}`}
        subtitle={`Kelas ${selectedKelas} • TA ${db.settings.tahunAjaranAktif} Semester ${db.settings.semesterAktif}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setStuModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="stu-ekskul-form"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              Simpan
            </button>
          </>
        }
      >
        <form
          id="stu-ekskul-form"
          onSubmit={handleSaveStuEkskul}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Kegiatan
            </label>
            <select
              required
              value={stuForm.activityId}
              onChange={(e) => {
                const act = db.activities.find((a) => a.id === e.target.value);
                setStuForm({
                  ...stuForm,
                  activityId: e.target.value,
                  deskripsi:
                    !editingStuEkskul && act?.keteranganDefault
                      ? act.keteranganDefault
                      : stuForm.deskripsi,
                });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              {db.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Predikat
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PREDIKAT_EKSKUL_LIST.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setStuForm({ ...stuForm, predikat: p })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    stuForm.predikat === p
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-white text-slate-600 border-sky-200 hover:bg-sky-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Deskripsi / Keterangan di Rapor
            </label>
            <textarea
              rows={3}
              value={stuForm.deskripsi}
              onChange={(e) =>
                setStuForm({ ...stuForm, deskripsi: e.target.value })
              }
              placeholder="Tuliskan keterangan perkembangan siswa dalam kegiatan ini..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAct)}
        onClose={() => setDeletingAct(null)}
        onConfirm={() => {
          if (deletingAct) deleteActivity(deletingAct.id);
        }}
        title="Hapus Kegiatan Ekstrakurikuler?"
        message={`Hapus kegiatan "${deletingAct?.nama}" dari daftar ekstrakurikuler?`}
        confirmLabel="Ya, Hapus"
      />
    </div>
  );
};
