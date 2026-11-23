import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardEdit,
  Sparkles,
  CheckCircle2,
  FileEdit,
  LayoutGrid,
  Table as TableIcon,
  UserCheck,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import {
  GradeEntry,
  KelasNumber,
  KeputusanKenaikan,
  Student,
} from '../types';
import { KELAS_LIST } from '../data/defaults';
import { useApp } from '../context/AppContext';
import {
  calculateGrade,
  clampScore,
  formatDecimalId,
  generateCompetencyDescription,
  getActivePeriodData,
  getDefaultReportMeta,
  getFase,
  getGradeKey,
  getStudentsByKelas,
  getSubjectKktp,
  getSubjectsForKelas,
  getWaliKelas,
} from '../utils/helpers';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';

type InputTab = 'nilai' | 'wali-kelas';
type ScoreField = 'formatif' | 'sumatif' | 'sts' | 'sas';
const SCORE_FIELDS: ScoreField[] = ['formatif', 'sumatif', 'sts', 'sas'];

export const InputNilaiPage: React.FC = () => {
  const {
    db,
    navState,
    navigate,
    upsertGrade,
    upsertGradesBatch,
    upsertReportMeta,
    showToast,
  } = useApp();

  const [tab, setTab] = useState<InputTab>('nilai');
  const [selectedKelas, setSelectedKelas] = useState<KelasNumber>(
    navState.kelas || 1
  );
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const subjects = useMemo(
    () => getSubjectsForKelas(db.subjects, selectedKelas),
    [db.subjects, selectedKelas]
  );

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    navState.subjectId || subjects[0]?.id || ''
  );

  // Sync incoming navigation params (e.g., from Dashboard alert)
  useEffect(() => {
    if (navState.kelas) setSelectedKelas(navState.kelas);
    if (navState.subjectId) {
      setSelectedSubjectId(navState.subjectId);
      setTab('nilai');
    }
    if (navState.tab === 'wali-kelas') setTab('wali-kelas');
  }, [navState.kelas, navState.subjectId, navState.tab]);

  // Keep selectedSubjectId valid when class changes
  useEffect(() => {
    if (
      subjects.length > 0 &&
      !subjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const students = useMemo(
    () => getStudentsByKelas(db.students, selectedKelas),
    [db.students, selectedKelas]
  );

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const period = getActivePeriodData(db);
  const wali = getWaliKelas(db.teachers, selectedKelas);

  // Competency description editor modal
  const [descModalStudent, setDescModalStudent] = useState<Student | null>(
    null
  );
  const [descForm, setDescForm] = useState({
    capaianTertinggi: '',
    perluDitingkatkan: '',
  });

  // Refs for spreadsheet keyboard navigation (Enter / ArrowUp / ArrowDown)
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeKktp = activeSubject
    ? getSubjectKktp(activeSubject, db.settings.kktpDefault)
    : db.settings.kktpDefault;

  // Compute summary stats for selected class + subject
  const stats = useMemo(() => {
    if (!activeSubject) {
      return { avg: null, tuntas: 0, belumTuntas: 0, incomplete: 0 };
    }
    const vals: number[] = [];
    let tuntas = 0;
    let belumTuntas = 0;
    let incomplete = 0;

    for (const s of students) {
      const entry = period.grades[getGradeKey(s.id, activeSubject.id)];
      const calc = calculateGrade(entry, db.settings.bobot, activeKktp);
      if (!calc.isComplete) incomplete++;
      if (calc.nilaiAkhir !== null) {
        vals.push(calc.nilaiAkhir);
        if (calc.tuntas) tuntas++;
        else belumTuntas++;
      }
    }

    return {
      avg:
        vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : null,
      tuntas,
      belumTuntas,
      incomplete,
    };
  }, [students, activeSubject, period.grades, db.settings.bobot, activeKktp]);

  const handleScoreChange = (
    studentId: string,
    field: ScoreField,
    raw: string
  ) => {
    if (!activeSubject) return;
    const val = raw.trim() === '' ? null : clampScore(raw);
    upsertGrade(studentId, activeSubject.id, { [field]: val });
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startRow: number,
    startCol: number
  ) => {
    if (!activeSubject) return;
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n') && !text.includes('\t')) return;
    e.preventDefault();

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const updates: Array<{
      studentId: string;
      subjectId: string;
      patch: Partial<GradeEntry>;
    }> = [];

    lines.forEach((line, rOffset) => {
      const targetStudent = students[startRow + rOffset];
      if (!targetStudent) return;
      const cols = line.split('\t');
      const patch: Partial<GradeEntry> = {};
      cols.forEach((cellVal, cOffset) => {
        const field = SCORE_FIELDS[startCol + cOffset];
        if (!field) return;
        const parsed = clampScore(cellVal.trim());
        if (parsed !== null) {
          patch[field] = parsed;
        }
      });
      if (Object.keys(patch).length > 0) {
        updates.push({
          studentId: targetStudent.id,
          subjectId: activeSubject.id,
          patch,
        });
      }
    });

    if (updates.length > 0) {
      upsertGradesBatch(updates);
      showToast(`Nilai berhasil ditempel untuk ${updates.length} baris siswa.`);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(students.length - 1, rowIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, rowIdx - 1);
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      nextCol = Math.min(SCORE_FIELDS.length - 1, colIdx + 1);
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      nextCol = Math.max(0, colIdx - 1);
    } else {
      return;
    }
    const target = cellRefs.current[`${nextRow}-${nextCol}`];
    if (target) {
      target.focus();
      target.select();
    }
  };

  const openDescModal = (student: Student) => {
    if (!activeSubject) return;
    const entry = period.grades[getGradeKey(student.id, activeSubject.id)];
    setDescModalStudent(student);
    setDescForm({
      capaianTertinggi: entry?.capaianTertinggi || '',
      perluDitingkatkan: entry?.perluDitingkatkan || '',
    });
  };

  const handleSaveDesc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descModalStudent || !activeSubject) return;
    upsertGrade(descModalStudent.id, activeSubject.id, {
      capaianTertinggi: descForm.capaianTertinggi.trim(),
      perluDitingkatkan: descForm.perluDitingkatkan.trim(),
    });
    setDescModalStudent(null);
    showToast(`Deskripsi capaian ${descModalStudent.nama} disimpan.`);
  };

  const handleGenerateOneDesc = () => {
    if (!descModalStudent || !activeSubject) return;
    const entry =
      period.grades[getGradeKey(descModalStudent.id, activeSubject.id)];
    const calc = calculateGrade(entry, db.settings.bobot, activeKktp);
    const generated = generateCompetencyDescription(
      activeSubject.nama,
      calc.nilaiAkhir,
      activeKktp
    );
    setDescForm(generated);
  };

  const handleBulkAutoDescriptions = () => {
    if (!activeSubject || students.length === 0) return;
    const updates: Array<{
      studentId: string;
      subjectId: string;
      patch: Partial<GradeEntry>;
    }> = [];

    for (const student of students) {
      const entry = period.grades[getGradeKey(student.id, activeSubject.id)];
      const hasDesc =
        Boolean(entry?.capaianTertinggi?.trim()) ||
        Boolean(entry?.perluDitingkatkan?.trim());
      if (hasDesc) continue;
      const calc = calculateGrade(entry, db.settings.bobot, activeKktp);
      if (calc.nilaiAkhir === null) continue;
      const generated = generateCompetencyDescription(
        activeSubject.nama,
        calc.nilaiAkhir,
        activeKktp
      );
      updates.push({
        studentId: student.id,
        subjectId: activeSubject.id,
        patch: generated,
      });
    }

    if (updates.length === 0) {
      showToast(
        'Semua siswa yang sudah memiliki nilai telah memiliki deskripsi capaian.',
        'info'
      );
      return;
    }

    upsertGradesBatch(updates);
    showToast(
      `Berhasil membuat deskripsi otomatis untuk ${updates.length} siswa.`
    );
  };

  const handleMarkAllPromoted = () => {
    const val: KeputusanKenaikan = selectedKelas === 6 ? 'lulus' : 'naik';
    students.forEach((s) => {
      upsertReportMeta(s.id, { keputusanKenaikan: val });
    });
    showToast(
      `Semua siswa Kelas ${selectedKelas} ditandai ${
        selectedKelas === 6 ? 'Lulus' : `Naik ke Kelas ${selectedKelas + 1}`
      }.`
    );
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tabs */}
      <div className="bg-white rounded-2xl border border-sky-100 p-1.5 shadow-sm grid grid-cols-2 gap-1.5 max-w-xl">
        <button
          type="button"
          onClick={() => setTab('nilai')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === 'nilai'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
          }`}
        >
          <ClipboardEdit className="w-4 h-4 shrink-0" />
          Nilai Mata Pelajaran
        </button>
        <button
          type="button"
          onClick={() => setTab('wali-kelas')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === 'wali-kelas'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-sky-50 hover:text-sky-700'
          }`}
        >
          <UserCheck className="w-4 h-4 shrink-0" />
          Absensi & Catatan Wali
        </button>
      </div>

      {/* Filter Kelas & Mapel Bar */}
      <div className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Class selector pills */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Pilih Kelas (Fase {getFase(selectedKelas)})
            </p>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {KELAS_LIST.map((k) => {
                const active = selectedKelas === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSelectedKelas(k)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                    }`}
                  >
                    Kelas {k}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Selector (only on Nilai tab) */}
          {tab === 'nilai' && (
            <div className="flex-1 lg:max-w-md">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Mata Pelajaran
              </p>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-sky-200 bg-sky-50/40 text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.kode})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Weight & KKTP formula bar */}
        {tab === 'nilai' && activeSubject && (
          <div className="pt-3 border-t border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-slate-600">
              <span className="font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                Bobot: Formatif {db.settings.bobot.formatif}% • Sumatif{' '}
                {db.settings.bobot.sumatif}% • STS {db.settings.bobot.sts}% •
                SAS {db.settings.bobot.sas}%
              </span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                KKTP: {activeKktp}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tersimpan otomatis
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {students.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkAutoDescriptions}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Bantu Deskripsi Otomatis
                </button>
              )}

              {/* View toggle for mobile/desktop comfort */}
              <div className="inline-flex bg-sky-50 border border-sky-200 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-sky-500 text-white'
                      : 'text-sky-700'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Tabel
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-sky-500 text-white'
                      : 'text-sky-700'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Kartu HP
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty state if no students in this class */}
      {students.length === 0 ? (
        <EmptyState
          icon={<ClipboardEdit className="w-7 h-7" />}
          title={`Belum Ada Siswa di Kelas ${selectedKelas}`}
          description="Tambahkan data siswa terlebih dahulu di menu Kelola Data agar Anda bisa mulai menginput nilai, absensi, dan catatan wali kelas."
          action={
            <button
              type="button"
              onClick={() => navigate({ page: 'kelola-data', tab: 'siswa' })}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold cursor-pointer"
            >
              Buka Kelola Data Siswa
            </button>
          }
        />
      ) : tab === 'nilai' && activeSubject ? (
        <>
          {/* Mini Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white rounded-xl border border-sky-100 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400">
                Rata-Rata Mapel
              </p>
              <p className="text-lg font-extrabold text-sky-700 tabular-nums">
                {stats.avg !== null ? formatDecimalId(stats.avg, 1) : '-'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-100 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400">
                Tuntas (≥ {activeKktp})
              </p>
              <p className="text-lg font-extrabold text-emerald-600 tabular-nums">
                {stats.tuntas} siswa
              </p>
            </div>
            <div className="bg-white rounded-xl border border-rose-100 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400">
                Belum Tuntas
              </p>
              <p className="text-lg font-extrabold text-rose-600 tabular-nums">
                {stats.belumTuntas} siswa
              </p>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-slate-400">
                Belum Lengkap
              </p>
              <p className="text-lg font-extrabold text-amber-600 tabular-nums">
                {stats.incomplete} siswa
              </p>
            </div>
          </div>

          {/* SPREADSHEET TABLE VIEW */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between text-xs text-sky-800">
                <span className="font-semibold">
                  Tips: Tekan <strong>Enter</strong> / <strong>↓</strong> untuk
                  pindah cepat ke siswa berikutnya, atau <strong>Tab</strong>{' '}
                  untuk pindah kolom (Skala 0–100).
                </span>
                <span className="hidden sm:inline font-bold">
                  {students.length} Siswa
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-sky-50 text-sky-900 border-b border-sky-200 text-xs">
                      <th className="py-3 px-3 w-10 text-center font-bold sticky left-0 bg-sky-50 z-10">
                        No
                      </th>
                      <th className="py-3 px-3 min-w-[180px] text-left font-bold sticky left-10 bg-sky-50 z-10 border-r border-sky-200">
                        Nama Siswa
                      </th>
                      <th className="py-3 px-2 w-24 text-center font-bold">
                        Formatif
                        <span className="block text-[10px] font-medium text-sky-600">
                          ({db.settings.bobot.formatif}%)
                        </span>
                      </th>
                      <th className="py-3 px-2 w-24 text-center font-bold">
                        Sumatif
                        <span className="block text-[10px] font-medium text-sky-600">
                          ({db.settings.bobot.sumatif}%)
                        </span>
                      </th>
                      <th className="py-3 px-2 w-24 text-center font-bold">
                        STS
                        <span className="block text-[10px] font-medium text-sky-600">
                          ({db.settings.bobot.sts}%)
                        </span>
                      </th>
                      <th className="py-3 px-2 w-24 text-center font-bold">
                        SAS
                        <span className="block text-[10px] font-medium text-sky-600">
                          ({db.settings.bobot.sas}%)
                        </span>
                      </th>
                      <th className="py-3 px-3 w-24 text-center font-bold bg-sky-100/70">
                        Nilai Akhir
                      </th>
                      <th className="py-3 px-3 w-32 text-center font-bold">
                        Ketuntasan
                      </th>
                      <th className="py-3 px-3 min-w-[210px] text-left font-bold">
                        Deskripsi Capaian Kompetensi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100">
                    {students.map((student, rowIdx) => {
                      const entry =
                        period.grades[getGradeKey(student.id, activeSubject.id)];
                      const calc = calculateGrade(
                        entry,
                        db.settings.bobot,
                        activeKktp
                      );
                      const hasDesc =
                        Boolean(entry?.capaianTertinggi?.trim()) ||
                        Boolean(entry?.perluDitingkatkan?.trim());

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-sky-50/40 transition-colors"
                        >
                          <td className="py-2 px-3 text-center text-xs font-bold text-slate-400 sticky left-0 bg-white z-10 tabular-nums">
                            {rowIdx + 1}
                          </td>
                          <td className="py-2 px-3 sticky left-10 bg-white z-10 border-r border-sky-100">
                            <p className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[200px]">
                              {student.nama}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              NIS: {student.nis || '-'}
                            </p>
                          </td>

                          {SCORE_FIELDS.map((field, colIdx) => {
                            const val = entry?.[field];
                            const isEmpty = val === null || val === undefined;
                            return (
                              <td key={field} className="p-1.5 text-center">
                                <input
                                  ref={(el) => {
                                    cellRefs.current[`${rowIdx}-${colIdx}`] = el;
                                  }}
                                  type="number"
                                  min={0}
                                  max={100}
                                  inputMode="numeric"
                                  value={isEmpty ? '' : val}
                                  placeholder="-"
                                  onChange={(e) =>
                                    handleScoreChange(
                                      student.id,
                                      field,
                                      e.target.value
                                    )
                                  }
                                  onKeyDown={(e) =>
                                    handleCellKeyDown(e, rowIdx, colIdx)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, rowIdx, colIdx)
                                  }
                                  className={`no-spinner w-full max-w-[76px] mx-auto text-center py-2 px-2 rounded-lg border text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-400 transition-colors ${
                                    isEmpty
                                      ? 'border-amber-200 bg-amber-50/30 text-slate-700'
                                      : 'border-sky-200 bg-white text-slate-800'
                                  }`}
                                />
                              </td>
                            );
                          })}

                          <td className="py-2 px-3 text-center bg-sky-50/40">
                            {calc.nilaiAkhir !== null ? (
                              <div>
                                <span
                                  className={`text-base font-extrabold tabular-nums ${
                                    calc.tuntas
                                      ? 'text-sky-700'
                                      : 'text-rose-600'
                                  }`}
                                >
                                  {calc.nilaiAkhir}
                                </span>
                                {!calc.isComplete && (
                                  <span
                                    title="Belum semua komponen nilai terisi"
                                    className="block text-[10px] font-semibold text-amber-600"
                                  >
                                    ({calc.filledCount}/{calc.requiredCount})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300 font-bold">-</span>
                            )}
                          </td>

                          <td className="py-2 px-3 text-center">
                            {calc.tuntas === null ? (
                              <Badge tone="slate">Belum Dinilai</Badge>
                            ) : calc.tuntas ? (
                              <Badge tone="emerald">Tuntas</Badge>
                            ) : (
                              <Badge tone="rose">Belum Tuntas</Badge>
                            )}
                          </td>

                          <td className="py-2 px-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {hasDesc ? (
                                  <p className="text-xs text-slate-600 line-clamp-2">
                                    {entry?.capaianTertinggi ||
                                      entry?.perluDitingkatkan}
                                  </p>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">
                                    Belum diisi
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => openDescModal(student)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                                  hasDesc
                                    ? 'bg-sky-50 hover:bg-sky-100 text-sky-700'
                                    : 'bg-sky-500 hover:bg-sky-600 text-white'
                                }`}
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                                {hasDesc ? 'Ubah' : 'Tulis'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* MOBILE-FRIENDLY CARD VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {students.map((student, idx) => {
                const entry =
                  period.grades[getGradeKey(student.id, activeSubject.id)];
                const calc = calculateGrade(
                  entry,
                  db.settings.bobot,
                  activeKktp
                );
                const hasDesc =
                  Boolean(entry?.capaianTertinggi?.trim()) ||
                  Boolean(entry?.perluDitingkatkan?.trim());

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl border border-sky-100 p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-sky-600">
                          #{idx + 1} • NIS {student.nis || '-'}
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm">
                          {student.nama}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold tabular-nums text-sky-700 leading-none">
                          {calc.nilaiAkhir ?? '-'}
                        </p>
                        <div className="mt-1">
                          {calc.tuntas === null ? (
                            <Badge tone="slate">Belum</Badge>
                          ) : calc.tuntas ? (
                            <Badge tone="emerald">Tuntas</Badge>
                          ) : (
                            <Badge tone="rose">Belum Tuntas</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          ['formatif', 'Formatif'],
                          ['sumatif', 'Sumatif'],
                          ['sts', 'STS'],
                          ['sas', 'SAS'],
                        ] as [ScoreField, string][]
                      ).map(([field, label]) => (
                        <div key={field}>
                          <label className="block text-[10px] font-bold text-slate-500 text-center mb-1">
                            {label}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            inputMode="numeric"
                            placeholder="-"
                            value={
                              entry?.[field] === null ||
                              entry?.[field] === undefined
                                ? ''
                                : entry[field]!
                            }
                            onChange={(e) =>
                              handleScoreChange(
                                student.id,
                                field,
                                e.target.value
                              )
                            }
                            className="no-spinner w-full text-center py-2 rounded-xl border border-sky-200 font-bold text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-sky-400"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-sky-50 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 truncate">
                        {hasDesc
                          ? entry?.capaianTertinggi || entry?.perluDitingkatkan
                          : 'Deskripsi capaian belum ditulis'}
                      </p>
                      <button
                        type="button"
                        onClick={() => openDescModal(student)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Deskripsi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* TAB 2: ABSENSI, CATATAN WALI KELAS & KENAIKAN KELAS */
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 bg-sky-50/70 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Data Wali Kelas {selectedKelas} (Fase {getFase(selectedKelas)})
              </h3>
              <p className="text-xs text-slate-500">
                Wali Kelas: <strong>{wali?.nama || 'Belum ditentukan'}</strong> •
                Semester {db.settings.semesterAktif} TA{' '}
                {db.settings.tahunAjaranAktif}
              </p>
            </div>
            {db.settings.semesterAktif === 'Genap' && (
              <button
                type="button"
                onClick={handleMarkAllPromoted}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tandai Semua {selectedKelas === 6 ? 'Lulus' : `Naik Kelas ${selectedKelas + 1}`}
              </button>
            )}
          </div>

          <div className="divide-y divide-sky-100">
            {students.map((student, idx) => {
              const meta =
                period.reportMeta[student.id] ||
                getDefaultReportMeta(student.id);

              return (
                <div
                  key={student.id}
                  className="p-4 hover:bg-sky-50/30 transition-colors space-y-3"
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

                    {/* Ketidakhadiran Inputs */}
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ['sakit', 'Sakit'],
                          ['izin', 'Izin'],
                          ['tanpaKeterangan', 'Alpa'],
                        ] as const
                      ).map(([field, label]) => (
                        <label
                          key={field}
                          className="inline-flex items-center gap-1.5 bg-sky-50/70 border border-sky-100 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700"
                        >
                          <span>{label}:</span>
                          <input
                            type="number"
                            min={0}
                            max={150}
                            value={meta[field]}
                            onChange={(e) =>
                              upsertReportMeta(student.id, {
                                [field]: Math.max(
                                  0,
                                  parseInt(e.target.value || '0', 10) || 0
                                ),
                              })
                            }
                            className="no-spinner w-12 text-center py-0.5 rounded-lg border border-sky-200 bg-white font-extrabold text-sky-800"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:pl-8">
                    <div
                      className={
                        db.settings.semesterAktif === 'Genap'
                          ? 'lg:col-span-8'
                          : 'lg:col-span-12'
                      }
                    >
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Catatan Wali Kelas
                      </label>
                      <textarea
                        rows={2}
                        value={meta.catatanWaliKelas}
                        onChange={(e) =>
                          upsertReportMeta(student.id, {
                            catatanWaliKelas: e.target.value,
                          })
                        }
                        placeholder="Tuliskan apresiasi perkembangan belajar dan saran untuk peserta didik..."
                        className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>

                    {db.settings.semesterAktif === 'Genap' && (
                      <div className="lg:col-span-4">
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">
                          Keputusan Semester Genap
                        </label>
                        <select
                          value={meta.keputusanKenaikan}
                          onChange={(e) =>
                            upsertReportMeta(student.id, {
                              keputusanKenaikan: e.target
                                .value as KeputusanKenaikan,
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-xl border border-sky-200 bg-white text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                          <option value="">-- Pilih Keputusan --</option>
                          {selectedKelas < 6 ? (
                            <>
                              <option value="naik">
                                Naik ke Kelas {selectedKelas + 1}
                              </option>
                              <option value="tinggal">
                                Tinggal di Kelas {selectedKelas}
                              </option>
                            </>
                          ) : (
                            <>
                              <option value="lulus">
                                Lulus dari Satuan Pendidikan
                              </option>
                              <option value="tidak_lulus">Belum Lulus</option>
                            </>
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Editor Deskripsi Capaian Kompetensi */}
      <Modal
        open={Boolean(descModalStudent)}
        onClose={() => setDescModalStudent(null)}
        title={`Deskripsi Capaian Kompetensi`}
        subtitle={
          descModalStudent && activeSubject
            ? `${descModalStudent.nama} • ${activeSubject.nama} (Kelas ${selectedKelas})`
            : undefined
        }
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={handleGenerateOneDesc}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs sm:text-sm font-bold mr-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Bantu Buat Otomatis
            </button>
            <button
              type="button"
              onClick={() => setDescModalStudent(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="desc-form"
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-sm cursor-pointer"
            >
              Simpan Deskripsi
            </button>
          </>
        }
      >
        <form id="desc-form" onSubmit={handleSaveDesc} className="space-y-4">
          <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 flex items-start gap-2.5 text-xs text-sky-800">
            <AlertCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <p>
              Sesuai panduan rapor <strong>Kurikulum Merdeka</strong>, deskripsi
              capaian kompetensi memuat dua hal: kompetensi yang paling dikuasai
              (capaian tertinggi) dan kompetensi yang masih perlu ditingkatkan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              1. Capaian Tertinggi (Kompetensi yang sudah dikuasai dengan baik)
            </label>
            <textarea
              rows={3}
              value={descForm.capaianTertinggi}
              onChange={(e) =>
                setDescForm({ ...descForm, capaianTertinggi: e.target.value })
              }
              placeholder="Contoh: Menunjukkan penguasaan yang sangat baik dalam operasi hitung bilangan bulat dan pemecahan soal cerita."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              2. Yang Perlu Ditingkatkan (Kompetensi yang memerlukan bimbingan)
            </label>
            <textarea
              rows={3}
              value={descForm.perluDitingkatkan}
              onChange={(e) =>
                setDescForm({ ...descForm, perluDitingkatkan: e.target.value })
              }
              placeholder="Contoh: Perlu pendampingan dan latihan rutin dalam memahami konsep pengukuran luas dan keliling bangun datar."
              className="w-full px-3.5 py-2.5 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
