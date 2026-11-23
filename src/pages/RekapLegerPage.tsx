import React, { useEffect, useMemo, useState } from 'react';
import {
  Table2,
  User,
  BarChart3,
  FileDown,
  FileSpreadsheet,
  Trophy,
  FileText,
} from 'lucide-react';
import { KelasNumber } from '../types';
import { KELAS_LIST, KELAS_ROMAWI } from '../data/defaults';
import { useApp } from '../context/AppContext';
import {
  buildLegerData,
  calculateGrade,
  formatDecimalId,
  getActivePeriodData,
  getDefaultReportMeta,
  getFase,
  getGradeKey,
  getStudentsByKelas,
  getSubjectKktp,
  getSubjectsForKelas,
  getWaliKelas,
} from '../utils/helpers';
import {
  exportKetuntasanCsv,
  exportLegerCsv,
  exportRekapSiswaCsv,
} from '../utils/exportCsv';
import {
  exportKetuntasanPdf,
  exportLegerPdf,
  exportRekapSiswaPdf,
} from '../utils/exportPdf';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

type RekapTab = 'leger' | 'siswa' | 'ketuntasan';

export const RekapLegerPage: React.FC = () => {
  const { db, navState, navigate, showToast } = useApp();
  const [tab, setTab] = useState<RekapTab>('leger');
  const [selectedKelas, setSelectedKelas] = useState<KelasNumber>(
    navState.kelas || 1
  );
  const [ketuntasanFilter, setKetuntasanFilter] = useState<
    KelasNumber | 'all'
  >('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (navState.kelas) {
      setSelectedKelas(navState.kelas);
      setKetuntasanFilter(navState.kelas);
    }
  }, [navState.kelas]);

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

  const leger = useMemo(
    () => buildLegerData(db, selectedKelas),
    [db, selectedKelas]
  );

  const selectedStudent = studentsInClass.find(
    (s) => s.id === selectedStudentId
  );
  const selectedStudentLegerRow = leger.rows.find(
    (r) => r.student.id === selectedStudentId
  );

  const period = getActivePeriodData(db);
  const wali = getWaliKelas(db.teachers, selectedKelas);

  // Rekap ketuntasan per mata pelajaran
  const ketuntasanRows = useMemo(() => {
    const kelasList: KelasNumber[] =
      ketuntasanFilter === 'all' ? KELAS_LIST : [ketuntasanFilter];
    const sortedSubjects = [...db.subjects].sort((a, b) => a.urutan - b.urutan);

    return sortedSubjects
      .map((subj) => {
        const relevantKelas = kelasList.filter(
          (k) => !subj.kelasAktif || subj.kelasAktif.includes(k)
        );
        if (relevantKelas.length === 0) return null;

        let totalSiswa = 0;
        let tuntas = 0;
        let belumTuntas = 0;
        let belumDiinput = 0;
        const vals: number[] = [];

        for (const k of relevantKelas) {
          const { rows } = buildLegerData(db, k);
          for (const r of rows) {
            totalSiswa++;
            const calc = r.scores[subj.id];
            if (calc && calc.nilaiAkhir !== null) {
              vals.push(calc.nilaiAkhir);
              if (calc.tuntas) tuntas++;
              else belumTuntas++;
            } else {
              belumDiinput++;
            }
          }
        }

        const dinilai = tuntas + belumTuntas;
        const pctTuntas = dinilai > 0 ? (tuntas / dinilai) * 100 : 0;

        return {
          subject: subj,
          kktp: getSubjectKktp(subj, db.settings.kktpDefault),
          totalSiswa,
          dinilai,
          tuntas,
          belumTuntas,
          belumDiinput,
          pctTuntas,
          rataRata:
            vals.length > 0
              ? vals.reduce((a, b) => a + b, 0) / vals.length
              : null,
          tertinggi: vals.length > 0 ? Math.max(...vals) : null,
          terendah: vals.length > 0 ? Math.min(...vals) : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [db, ketuntasanFilter]);

  const tabs: Array<{
    key: RekapTab;
    label: string;
    icon: React.FC<{ className?: string }>;
  }> = [
    { key: 'leger', label: 'Leger Nilai Kelas', icon: Table2 },
    { key: 'siswa', label: 'Rekap per Siswa', icon: User },
    { key: 'ketuntasan', label: 'Ketuntasan Mapel', icon: BarChart3 },
  ];

  return (
    <div className="space-y-4">
      {/* Segmented Sub-tabs */}
      <div className="bg-white rounded-2xl border border-sky-100 p-1.5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-1.5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                active
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: LEGER NILAI KELAS */}
      {tab === 'leger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {KELAS_LIST.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKelas(k)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedKelas === k
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Kelas {k}
                </button>
              ))}
            </div>

            {leger.rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportLegerPdf(db, selectedKelas);
                    showToast(`Leger Kelas ${selectedKelas} diunduh (PDF).`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportLegerCsv(db, selectedKelas);
                    showToast(`Leger Kelas ${selectedKelas} diunduh (CSV).`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {leger.rows.length === 0 ? (
            <EmptyState
              icon={<Table2 className="w-7 h-7" />}
              title={`Belum Ada Siswa di Kelas ${selectedKelas}`}
              description="Tambahkan data siswa dan input nilainya terlebih dahulu untuk melihat leger kelas dan peringkat siswa."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 bg-sky-50/70 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Leger Nilai Kelas {KELAS_ROMAWI[selectedKelas]} (Fase{' '}
                    {getFase(selectedKelas)})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Wali Kelas: <strong>{wali?.nama || '-'}</strong> • Semester{' '}
                    {db.settings.semesterAktif} TA{' '}
                    {db.settings.tahunAjaranAktif}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Nilai merah = di bawah KKTP
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-sky-500 text-white text-xs">
                      <th className="py-3 px-2.5 text-center font-bold sticky left-0 bg-sky-500 z-10 w-10">
                        No
                      </th>
                      <th className="py-3 px-3 text-left font-bold sticky left-10 bg-sky-500 z-10 min-w-[175px] border-r border-sky-400">
                        Nama Siswa
                      </th>
                      {leger.subjects.map((subj) => (
                        <th
                          key={subj.id}
                          title={`${subj.nama} (KKTP ${getSubjectKktp(
                            subj,
                            db.settings.kktpDefault
                          )})`}
                          className="py-3 px-2 text-center font-bold min-w-[54px] cursor-help"
                        >
                          {subj.kode}
                        </th>
                      ))}
                      <th className="py-3 px-2.5 text-center font-bold bg-sky-600 min-w-[64px]">
                        Jumlah
                      </th>
                      <th className="py-3 px-2.5 text-center font-bold bg-sky-600 min-w-[66px]">
                        Rata²
                      </th>
                      <th className="py-3 px-2.5 text-center font-bold bg-sky-700 min-w-[64px]">
                        Rank
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {leger.rows.map((row, idx) => (
                      <tr
                        key={row.student.id}
                        className="hover:bg-sky-50/40 transition-colors"
                      >
                        <td className="py-2.5 px-2.5 text-center text-slate-400 font-bold sticky left-0 bg-white z-10 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 sticky left-10 bg-white z-10 border-r border-sky-100">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(row.student.id);
                              setTab('siswa');
                            }}
                            className="font-bold text-slate-800 hover:text-sky-600 text-left truncate max-w-[190px] block cursor-pointer"
                            title="Lihat rekap nilai siswa ini"
                          >
                            {row.student.nama}
                          </button>
                        </td>

                        {leger.subjects.map((subj) => {
                          const calc = row.scores[subj.id];
                          const val = calc?.nilaiAkhir;
                          const below = calc?.tuntas === false;
                          return (
                            <td
                              key={subj.id}
                              className={`py-2.5 px-2 text-center tabular-nums font-semibold ${
                                below
                                  ? 'bg-rose-50 text-rose-700 font-bold'
                                  : val !== null && val !== undefined
                                  ? 'text-slate-700'
                                  : 'text-slate-300'
                              }`}
                            >
                              {val !== null && val !== undefined ? val : '-'}
                            </td>
                          );
                        })}

                        <td className="py-2.5 px-2.5 text-center font-extrabold text-sky-900 bg-sky-50/60 tabular-nums">
                          {row.jumlahMapelDinilai > 0 ? row.jumlahNilai : '-'}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-extrabold text-sky-700 bg-sky-50/60 tabular-nums">
                          {row.rataRata !== null
                            ? formatDecimalId(row.rataRata, 1)
                            : '-'}
                        </td>
                        <td className="py-2.5 px-2.5 text-center bg-sky-50/90">
                          {row.ranking !== null ? (
                            <span
                              className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-full text-xs font-extrabold tabular-nums ${
                                row.ranking === 1
                                  ? 'bg-amber-400 text-amber-950'
                                  : row.ranking === 2
                                  ? 'bg-slate-200 text-slate-800'
                                  : row.ranking === 3
                                  ? 'bg-orange-200 text-orange-900'
                                  : 'bg-sky-100 text-sky-800'
                              }`}
                            >
                              {row.ranking}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-sky-50/90 border-t-2 border-sky-200 text-xs font-bold text-sky-900">
                    <tr>
                      <td
                        colSpan={2}
                        className="py-2.5 px-3 sticky left-0 bg-sky-50 z-10 border-r border-sky-200"
                      >
                        Rata-Rata Mapel
                      </td>
                      {leger.subjects.map((subj) => (
                        <td
                          key={subj.id}
                          className="py-2.5 px-2 text-center tabular-nums"
                        >
                          {leger.subjectStats[subj.id]?.rataRata !== null
                            ? formatDecimalId(
                                leger.subjectStats[subj.id].rataRata,
                                1
                              )
                            : '-'}
                        </td>
                      ))}
                      <td colSpan={3} />
                    </tr>
                    <tr className="border-t border-sky-100 text-slate-600 font-semibold">
                      <td
                        colSpan={2}
                        className="py-2 px-3 sticky left-0 bg-sky-50 z-10 border-r border-sky-200"
                      >
                        Tertinggi / Terendah
                      </td>
                      {leger.subjects.map((subj) => {
                        const st = leger.subjectStats[subj.id];
                        return (
                          <td
                            key={subj.id}
                            className="py-2 px-1.5 text-center tabular-nums text-[11px]"
                          >
                            {st?.tertinggi !== null
                              ? `${st.tertinggi}/${st.terendah}`
                              : '-'}
                          </td>
                        );
                      })}
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Legend */}
              <div className="px-4 py-3 bg-slate-50/70 border-t border-sky-100 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Keterangan:</span>
                {leger.subjects.map((s) => (
                  <span key={s.id}>
                    <strong className="text-sky-700">{s.kode}</strong> = {s.nama}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAP PER SISWA */}
      {tab === 'siswa' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
              <select
                value={selectedKelas}
                onChange={(e) =>
                  setSelectedKelas(Number(e.target.value) as KelasNumber)
                }
                className="px-3.5 py-2 rounded-xl border border-sky-200 bg-sky-50/40 text-sm font-bold text-slate-800 cursor-pointer"
              >
                {KELAS_LIST.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k} (Fase {getFase(k)})
                  </option>
                ))}
              </select>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={studentsInClass.length === 0}
                className="flex-1 max-w-md px-3.5 py-2 rounded-xl border border-sky-200 bg-white text-sm font-bold text-slate-800 cursor-pointer"
              >
                {studentsInClass.length === 0 ? (
                  <option value="">Belum ada siswa di kelas ini</option>
                ) : (
                  studentsInClass.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} (NIS: {s.nis || '-'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedStudent && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      page: 'e-rapor',
                      kelas: selectedStudent.kelas,
                      studentId: selectedStudent.id,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Buka E-Rapor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportRekapSiswaPdf(db, selectedStudent);
                    showToast(`Rekap ${selectedStudent.nama} diunduh (PDF).`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportRekapSiswaCsv(db, selectedStudent);
                    showToast(`Rekap ${selectedStudent.nama} diunduh (CSV).`);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
              </div>
            )}
          </div>

          {!selectedStudent ? (
            <EmptyState
              icon={<User className="w-7 h-7" />}
              title={`Belum Ada Siswa di Kelas ${selectedKelas}`}
              description="Pilih kelas yang sudah memiliki siswa untuk melihat rekap nilai lengkap per siswa."
            />
          ) : (
            (() => {
              const subjects = getSubjectsForKelas(
                db.subjects,
                selectedStudent.kelas
              );
              const meta =
                period.reportMeta[selectedStudent.id] ||
                getDefaultReportMeta(selectedStudent.id);
              const ekskul = period.extracurriculars.filter(
                (e) => e.studentId === selectedStudent.id
              );

              return (
                <div className="space-y-4">
                  {/* Student Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white rounded-2xl border border-sky-100 p-4">
                      <p className="text-xs font-semibold text-slate-400">
                        Rata-Rata Nilai
                      </p>
                      <p className="text-2xl font-extrabold text-sky-700 mt-1 tabular-nums">
                        {selectedStudentLegerRow?.rataRata !== null &&
                        selectedStudentLegerRow?.rataRata !== undefined
                          ? formatDecimalId(selectedStudentLegerRow.rataRata, 2)
                          : '-'}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-sky-100 p-4">
                      <p className="text-xs font-semibold text-slate-400">
                        Jumlah Nilai
                      </p>
                      <p className="text-2xl font-extrabold text-slate-800 mt-1 tabular-nums">
                        {selectedStudentLegerRow?.jumlahMapelDinilai
                          ? selectedStudentLegerRow.jumlahNilai
                          : '-'}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-sky-100 p-4">
                      <p className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        Peringkat Kelas
                      </p>
                      <p className="text-2xl font-extrabold text-amber-600 mt-1 tabular-nums">
                        {selectedStudentLegerRow?.ranking
                          ? `#${selectedStudentLegerRow.ranking} / ${studentsInClass.length}`
                          : '-'}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-sky-100 p-4">
                      <p className="text-xs font-semibold text-slate-400">
                        Ketidakhadiran (S/I/A)
                      </p>
                      <p className="text-xl font-extrabold text-slate-700 mt-1 tabular-nums">
                        {meta.sakit} / {meta.izin} / {meta.tanpaKeterangan}
                      </p>
                    </div>
                  </div>

                  {/* Full Subject Table for This Student */}
                  <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
                    <div className="px-4 sm:px-5 py-3.5 bg-sky-50/70 border-b border-sky-100">
                      <h3 className="text-sm font-extrabold text-slate-800">
                        {selectedStudent.nama} — Kelas {selectedStudent.kelas}{' '}
                        (Fase {getFase(selectedStudent.kelas)})
                      </h3>
                      <p className="text-xs text-slate-500">
                        NIS: {selectedStudent.nis || '-'} • NISN:{' '}
                        {selectedStudent.nisn || '-'} • Orang Tua:{' '}
                        {selectedStudent.namaOrangTua || '-'}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm text-left">
                        <thead>
                          <tr className="bg-sky-50 text-sky-900 border-b border-sky-100 text-xs">
                            <th className="py-3 px-3 w-10 text-center font-bold">
                              No
                            </th>
                            <th className="py-3 px-3 font-bold min-w-[180px]">
                              Mata Pelajaran
                            </th>
                            <th className="py-3 px-2 text-center font-bold">
                              Fmt
                            </th>
                            <th className="py-3 px-2 text-center font-bold">
                              Smt
                            </th>
                            <th className="py-3 px-2 text-center font-bold">
                              STS
                            </th>
                            <th className="py-3 px-2 text-center font-bold">
                              SAS
                            </th>
                            <th className="py-3 px-3 text-center font-bold bg-sky-100/60">
                              Akhir
                            </th>
                            <th className="py-3 px-3 text-center font-bold">
                              Status
                            </th>
                            <th className="py-3 px-3 font-bold min-w-[220px]">
                              Deskripsi Capaian
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-50">
                          {subjects.map((subj, idx) => {
                            const entry =
                              period.grades[
                                getGradeKey(selectedStudent.id, subj.id)
                              ];
                            const kktp = getSubjectKktp(
                              subj,
                              db.settings.kktpDefault
                            );
                            const calc = calculateGrade(
                              entry,
                              db.settings.bobot,
                              kktp
                            );
                            return (
                              <tr
                                key={subj.id}
                                className="hover:bg-sky-50/40 align-top"
                              >
                                <td className="py-3 px-3 text-center text-slate-400 font-bold">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-3 font-bold text-slate-800">
                                  {subj.nama}
                                  <span className="block text-[11px] font-normal text-slate-400">
                                    KKTP: {kktp}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center tabular-nums">
                                  {entry?.formatif ?? '-'}
                                </td>
                                <td className="py-3 px-2 text-center tabular-nums">
                                  {entry?.sumatif ?? '-'}
                                </td>
                                <td className="py-3 px-2 text-center tabular-nums">
                                  {entry?.sts ?? '-'}
                                </td>
                                <td className="py-3 px-2 text-center tabular-nums">
                                  {entry?.sas ?? '-'}
                                </td>
                                <td className="py-3 px-3 text-center font-extrabold text-sky-800 bg-sky-50/40 tabular-nums">
                                  {calc.nilaiAkhir ?? '-'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  {calc.tuntas === null ? (
                                    <Badge tone="slate">Belum</Badge>
                                  ) : calc.tuntas ? (
                                    <Badge tone="emerald">Tuntas</Badge>
                                  ) : (
                                    <Badge tone="rose">Belum Tuntas</Badge>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-xs text-slate-600 space-y-1">
                                  {entry?.capaianTertinggi ||
                                  entry?.perluDitingkatkan ? (
                                    <>
                                      {entry.capaianTertinggi && (
                                        <p>{entry.capaianTertinggi}</p>
                                      )}
                                      {entry.perluDitingkatkan && (
                                        <p className="text-slate-500">
                                          {entry.perluDitingkatkan}
                                        </p>
                                      )}
                                    </>
                                  ) : (
                                    <span className="italic text-slate-400">
                                      -
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {ekskul.length > 0 && (
                      <div className="p-4 border-t border-sky-100 bg-sky-50/30">
                        <p className="text-xs font-extrabold text-sky-900 mb-2">
                          Ekstrakurikuler Diikuti:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {ekskul.map((e) => {
                            const act = db.activities.find(
                              (a) => a.id === e.activityId
                            );
                            return (
                              <Badge key={e.id} tone="sky">
                                {act?.nama || 'Ekskul'}: {e.predikat}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* TAB 3: REKAP KETUNTASAN PER MATA PELAJARAN */}
      {tab === 'ketuntasan' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setKetuntasanFilter('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  ketuntasanFilter === 'all'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                Semua Kelas (1–6)
              </button>
              {KELAS_LIST.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKetuntasanFilter(k)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    ketuntasanFilter === k
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Kelas {k}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  exportKetuntasanPdf(db, ketuntasanFilter);
                  showToast('Rekap ketuntasan diunduh (PDF).');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  exportKetuntasanCsv(db, ketuntasanFilter);
                  showToast('Rekap ketuntasan diunduh (CSV).');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead>
                  <tr className="bg-sky-50 text-sky-900 border-b border-sky-100 text-xs">
                    <th className="py-3 px-3 w-10 text-center font-bold">No</th>
                    <th className="py-3 px-3 font-bold min-w-[200px]">
                      Mata Pelajaran
                    </th>
                    <th className="py-3 px-2.5 text-center font-bold">KKTP</th>
                    <th className="py-3 px-2.5 text-center font-bold">Siswa</th>
                    <th className="py-3 px-2.5 text-center font-bold text-emerald-700">
                      Tuntas
                    </th>
                    <th className="py-3 px-2.5 text-center font-bold text-rose-700">
                      Belum Tuntas
                    </th>
                    <th className="py-3 px-2.5 text-center font-bold text-amber-700">
                      Kosong
                    </th>
                    <th className="py-3 px-3 font-bold min-w-[160px]">
                      Persentase Tuntas
                    </th>
                    <th className="py-3 px-2.5 text-center font-bold">Rata²</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-50">
                  {ketuntasanRows.map((row, idx) => (
                    <tr
                      key={row.subject.id}
                      className="hover:bg-sky-50/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800">
                          {row.subject.nama}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Tertinggi: {row.tertinggi ?? '-'} • Terendah:{' '}
                          {row.terendah ?? '-'}
                        </p>
                      </td>
                      <td className="py-3 px-2.5 text-center font-bold tabular-nums">
                        {row.kktp}
                      </td>
                      <td className="py-3 px-2.5 text-center font-semibold tabular-nums">
                        {row.totalSiswa}
                      </td>
                      <td className="py-3 px-2.5 text-center">
                        <Badge tone="emerald">{row.tuntas}</Badge>
                      </td>
                      <td className="py-3 px-2.5 text-center">
                        <Badge tone={row.belumTuntas > 0 ? 'rose' : 'slate'}>
                          {row.belumTuntas}
                        </Badge>
                      </td>
                      <td className="py-3 px-2.5 text-center">
                        <Badge tone={row.belumDiinput > 0 ? 'amber' : 'slate'}>
                          {row.belumDiinput}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.pctTuntas >= 80
                                  ? 'bg-emerald-500'
                                  : row.pctTuntas >= 60
                                  ? 'bg-sky-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.round(row.pctTuntas)}%` }}
                            />
                          </div>
                          <span className="text-xs font-extrabold tabular-nums w-10 text-right text-slate-700">
                            {row.dinilai > 0
                              ? `${Math.round(row.pctTuntas)}%`
                              : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2.5 text-center font-extrabold text-sky-700 tabular-nums">
                        {row.rataRata !== null
                          ? formatDecimalId(row.rataRata, 1)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
