import React, { useEffect, useMemo, useState } from 'react';
import {
  Printer,
  FileDown,
  FileText,
  Users,
  User,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { KelasNumber, KeputusanKenaikan } from '../types';
import { KELAS_LIST, KELAS_ROMAWI } from '../data/defaults';
import { useApp } from '../context/AppContext';
import {
  getActivePeriodData,
  getDefaultReportMeta,
  getFase,
  getStudentsByKelas,
} from '../utils/helpers';
import { exportRaporMassalPdf, exportRaporPdf } from '../utils/exportPdf';
import { RaporDocument } from '../components/rapor/RaporDocument';
import { EmptyState } from '../components/ui/EmptyState';

type PrintMode = 'single' | 'mass';

export const ERaporPage: React.FC = () => {
  const { db, navState, navigate, upsertReportMeta, showToast } = useApp();

  const [mode, setMode] = useState<PrintMode>('single');
  const [selectedKelas, setSelectedKelas] = useState<KelasNumber>(
    navState.kelas || 1
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    navState.studentId || ''
  );
  const [showQuickEdit, setShowQuickEdit] = useState<boolean>(false);

  useEffect(() => {
    if (navState.kelas) setSelectedKelas(navState.kelas);
    if (navState.studentId) {
      setSelectedStudentId(navState.studentId);
      setMode('single');
    }
  }, [navState.kelas, navState.studentId]);

  const studentsInClass = useMemo(
    () => getStudentsByKelas(db.students, selectedKelas),
    [db.students, selectedKelas]
  );

  useEffect(() => {
    if (
      studentsInClass.length > 0 &&
      !studentsInClass.some((s) => s.id === selectedStudentId)
    ) {
      setSelectedStudentId(studentsInClass[0].id);
    } else if (studentsInClass.length === 0) {
      setSelectedStudentId('');
    }
  }, [studentsInClass, selectedStudentId]);

  const selectedStudent = studentsInClass.find(
    (s) => s.id === selectedStudentId
  );
  const period = getActivePeriodData(db);
  const currentMeta = selectedStudent
    ? period.reportMeta[selectedStudent.id] ||
      getDefaultReportMeta(selectedStudent.id)
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (mode === 'single' && selectedStudent) {
      exportRaporPdf(db, selectedStudent);
      showToast(`PDF Rapor ${selectedStudent.nama} berhasil diunduh.`);
    } else if (mode === 'mass' && studentsInClass.length > 0) {
      exportRaporMassalPdf(db, selectedKelas, studentsInClass);
      showToast(
        `PDF Rapor Massal Kelas ${selectedKelas} (${studentsInClass.length} siswa) berhasil diunduh.`
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Panel (Hidden during Print) */}
      <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Print Mode Switch */}
          <div className="inline-flex bg-sky-50 border border-sky-200 rounded-xl p-1 self-start">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                mode === 'single'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-700 hover:bg-sky-100'
              }`}
            >
              <User className="w-4 h-4" />
              Cetak 1 Siswa
            </button>
            <button
              type="button"
              onClick={() => setMode('mass')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                mode === 'mass'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-700 hover:bg-sky-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Cetak Massal 1 Kelas
            </button>
          </div>

          {/* Action Buttons */}
          {studentsInClass.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {mode === 'single' && selectedStudent && (
                <button
                  type="button"
                  onClick={() => setShowQuickEdit((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Edit Absensi & Catatan
                  {showQuickEdit ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                {mode === 'single'
                  ? 'Export PDF'
                  : `Export PDF (${studentsInClass.length} Siswa)`}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {mode === 'single'
                  ? 'Cetak / Print'
                  : `Print Massal (${studentsInClass.length})`}
              </button>
            </div>
          )}
        </div>

        {/* Select Class & Student */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-sky-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
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

          {mode === 'single' && (
            <div className="flex-1 sm:max-w-sm">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={studentsInClass.length === 0}
                className="w-full px-3.5 py-2 rounded-xl border border-sky-200 bg-white text-sm font-bold text-slate-800 cursor-pointer"
              >
                {studentsInClass.length === 0 ? (
                  <option value="">Belum ada siswa di kelas ini</option>
                ) : (
                  studentsInClass.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {idx + 1}. {s.nama}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {mode === 'mass' && studentsInClass.length > 0 && (
            <p className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
              Siap mencetak <strong>{studentsInClass.length} rapor</strong> Kelas{' '}
              {KELAS_ROMAWI[selectedKelas]} (Fase {getFase(selectedKelas)}) sekaligus.
            </p>
          )}
        </div>

        {/* Quick Inline Editor for Attendance, Homeroom Note & Promotion Decision */}
        {mode === 'single' &&
          showQuickEdit &&
          selectedStudent &&
          currentMeta && (
            <div className="pt-4 border-t border-sky-100 bg-sky-50/50 -mx-4 px-4 pb-2 space-y-3">
              <p className="text-xs font-extrabold text-sky-900">
                Ubah Cepat Pelengkap Rapor — {selectedStudent.nama}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4 grid grid-cols-3 gap-2">
                  {(
                    [
                      ['sakit', 'Sakit'],
                      ['izin', 'Izin'],
                      ['tanpaKeterangan', 'Tanpa Ket.'],
                    ] as const
                  ).map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        {label}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={150}
                        value={currentMeta[field]}
                        onChange={(e) =>
                          upsertReportMeta(selectedStudent.id, {
                            [field]: Math.max(
                              0,
                              parseInt(e.target.value || '0', 10) || 0
                            ),
                          })
                        }
                        className="w-full px-2.5 py-2 rounded-xl border border-sky-200 bg-white text-sm font-bold text-center"
                      />
                    </div>
                  ))}
                </div>

                <div
                  className={
                    db.settings.semesterAktif === 'Genap'
                      ? 'md:col-span-5'
                      : 'md:col-span-8'
                  }
                >
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Catatan Wali Kelas
                  </label>
                  <textarea
                    rows={2}
                    value={currentMeta.catatanWaliKelas}
                    onChange={(e) =>
                      upsertReportMeta(selectedStudent.id, {
                        catatanWaliKelas: e.target.value,
                      })
                    }
                    placeholder="Tulis catatan wali kelas..."
                    className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-xs sm:text-sm"
                  />
                </div>

                {db.settings.semesterAktif === 'Genap' && (
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Keputusan Kenaikan
                    </label>
                    <select
                      value={currentMeta.keputusanKenaikan}
                      onChange={(e) =>
                        upsertReportMeta(selectedStudent.id, {
                          keputusanKenaikan: e.target
                            .value as KeputusanKenaikan,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-xs sm:text-sm font-bold"
                    >
                      <option value="">-- Pilih --</option>
                      {selectedStudent.kelas < 6 ? (
                        <>
                          <option value="naik">
                            Naik ke Kelas {selectedStudent.kelas + 1}
                          </option>
                          <option value="tinggal">
                            Tinggal di Kelas {selectedStudent.kelas}
                          </option>
                        </>
                      ) : (
                        <>
                          <option value="lulus">Lulus</option>
                          <option value="tidak_lulus">Belum Lulus</option>
                        </>
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Preview & Printable Area */}
      {studentsInClass.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7" />}
          title={`Belum Ada Siswa di Kelas ${selectedKelas}`}
          description="Tambahkan data siswa terlebih dahulu di menu Kelola Data untuk melihat pratinjau dan mencetak E-Rapor Kurikulum Merdeka."
          action={
            <button
              type="button"
              onClick={() => navigate({ page: 'kelola-data', tab: 'siswa' })}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
            >
              Tambah Data Siswa
            </button>
          }
        />
      ) : mode === 'single' && selectedStudent ? (
        <div className="py-1">
          <RaporDocument db={db} student={selectedStudent} />
        </div>
      ) : (
        <div className="space-y-8 print:space-y-0">
          {studentsInClass.map((student) => (
            <RaporDocument
              key={student.id}
              db={db}
              student={student}
              pageBreakAfter
            />
          ))}
        </div>
      )}
    </div>
  );
};
