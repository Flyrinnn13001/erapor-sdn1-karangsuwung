import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  AppDatabase,
  ExtracurricularActivity,
  GradeEntry,
  KelasNumber,
  NavigationTarget,
  PageId,
  PeriodData,
  SchoolSettings,
  Semester,
  Student,
  StudentExtracurricular,
  StudentReportMeta,
  Subject,
  Teacher,
} from '../types';
import {
  createEmptyDatabase,
  createEmptyPeriodData,
  DEFAULT_SUBJECTS,
} from '../data/defaults';
import { createSampleDatabase } from '../data/sampleData';
import { loadDatabase, saveDatabase } from '../utils/storage';
import {
  generateId,
  getDefaultReportMeta,
  getGradeKey,
  getPeriodKey,
} from '../utils/helpers';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextValue {
  db: AppDatabase;
  activePage: PageId;
  navState: NavigationTarget;
  navigate: (target: NavigationTarget) => void;
  toasts: ToastMessage[];
  showToast: (
    text: string,
    type?: 'success' | 'info' | 'warning' | 'error'
  ) => void;
  dismissToast: (id: string) => void;

  // Settings & Period
  updateSettings: (partial: Partial<SchoolSettings>) => void;
  setActivePeriod: (tahunAjaran: string, semester: Semester) => void;
  addTahunAjaran: (tahunAjaran: string) => void;

  // Students
  addStudent: (data: Omit<Student, 'id'>) => void;
  addStudentsBulk: (items: Omit<Student, 'id'>[]) => void;
  updateStudent: (id: string, data: Partial<Omit<Student, 'id'>>) => void;
  deleteStudent: (id: string) => void;
  promoteStudentsMass: (
    promoteIds: Set<string>,
    graduateIds: Set<string>,
    advanceYear: boolean,
    nextTahunAjaran?: string
  ) => void;

  // Teachers
  addTeacher: (data: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, data: Partial<Omit<Teacher, 'id'>>) => void;
  deleteTeacher: (id: string) => void;

  // Subjects
  addSubject: (data: Omit<Subject, 'id' | 'urutan'>) => void;
  updateSubject: (id: string, data: Partial<Omit<Subject, 'id'>>) => void;
  deleteSubject: (id: string) => void;
  resetDefaultSubjects: () => void;

  // Extracurriculars
  addActivity: (data: Omit<ExtracurricularActivity, 'id'>) => void;
  updateActivity: (
    id: string,
    data: Partial<Omit<ExtracurricularActivity, 'id'>>
  ) => void;
  deleteActivity: (id: string) => void;
  upsertStudentExtracurricular: (
    item: Omit<StudentExtracurricular, 'id'> & { id?: string }
  ) => void;
  deleteStudentExtracurricular: (id: string) => void;

  // Grades & Report Meta
  upsertGrade: (
    studentId: string,
    subjectId: string,
    patch: Partial<GradeEntry>
  ) => void;
  upsertGradesBatch: (
    updates: Array<{
      studentId: string;
      subjectId: string;
      patch: Partial<GradeEntry>;
    }>
  ) => void;
  upsertReportMeta: (
    studentId: string,
    patch: Partial<StudentReportMeta>
  ) => void;

  // Sample data & Backup/Restore
  loadSampleData: () => void;
  clearAllData: () => void;
  restoreDatabase: (newDb: AppDatabase) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabase());
  const [navState, setNavState] = useState<NavigationTarget>({
    page: 'dashboard',
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    saveDatabase(db);
  }, [db]);

  const showToast = useCallback(
    (
      text: string,
      type: 'success' | 'info' | 'warning' | 'error' = 'success'
    ) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev, { id, text, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const navigate = useCallback((target: NavigationTarget) => {
    setNavState(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updatePeriod = useCallback(
    (updater: (period: PeriodData) => PeriodData) => {
      setDb((prev) => {
        const key = getPeriodKey(
          prev.settings.tahunAjaranAktif,
          prev.settings.semesterAktif
        );
        const current = prev.periods[key] || createEmptyPeriodData();
        return {
          ...prev,
          periods: {
            ...prev.periods,
            [key]: updater(current),
          },
        };
      });
    },
    []
  );

  const updateSettings = useCallback((partial: Partial<SchoolSettings>) => {
    setDb((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...partial,
        bobot: partial.bobot
          ? { ...prev.settings.bobot, ...partial.bobot }
          : prev.settings.bobot,
      },
    }));
  }, []);

  const setActivePeriod = useCallback(
    (tahunAjaran: string, semester: Semester) => {
      setDb((prev) => {
        const daftar = prev.settings.daftarTahunAjaran.includes(tahunAjaran)
          ? prev.settings.daftarTahunAjaran
          : [...prev.settings.daftarTahunAjaran, tahunAjaran];
        return {
          ...prev,
          settings: {
            ...prev.settings,
            tahunAjaranAktif: tahunAjaran,
            semesterAktif: semester,
            daftarTahunAjaran: daftar,
          },
        };
      });
      showToast(
        `Periode aktif diubah ke TA ${tahunAjaran} Semester ${semester}`,
        'info'
      );
    },
    [showToast]
  );

  const addTahunAjaran = useCallback(
    (tahunAjaran: string) => {
      const trimmed = tahunAjaran.trim();
      if (!trimmed) return;
      setDb((prev) => {
        if (prev.settings.daftarTahunAjaran.includes(trimmed)) return prev;
        return {
          ...prev,
          settings: {
            ...prev.settings,
            daftarTahunAjaran: [...prev.settings.daftarTahunAjaran, trimmed].sort(),
          },
        };
      });
      showToast(`Tahun ajaran ${trimmed} ditambahkan.`);
    },
    [showToast]
  );

  // Students
  const addStudent = useCallback(
    (data: Omit<Student, 'id'>) => {
      const student: Student = {
        ...data,
        id: generateId('siswa'),
        status: 'aktif',
      };
      setDb((prev) => ({ ...prev, students: [...prev.students, student] }));
      showToast(`Siswa "${data.nama}" berhasil ditambahkan.`);
    },
    [showToast]
  );

  const addStudentsBulk = useCallback(
    (items: Omit<Student, 'id'>[]) => {
      if (items.length === 0) return;
      const created: Student[] = items.map((item) => ({
        ...item,
        id: generateId('siswa'),
        status: 'aktif',
      }));
      setDb((prev) => ({ ...prev, students: [...prev.students, ...created] }));
      showToast(`${created.length} siswa berhasil ditambahkan sekaligus.`);
    },
    [showToast]
  );

  const updateStudent = useCallback(
    (id: string, data: Partial<Omit<Student, 'id'>>) => {
      setDb((prev) => ({
        ...prev,
        students: prev.students.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
      }));
      showToast('Data siswa diperbarui.');
    },
    [showToast]
  );

  const deleteStudent = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        students: prev.students.filter((s) => s.id !== id),
      }));
      showToast('Data siswa dihapus.', 'info');
    },
    [showToast]
  );

  const promoteStudentsMass = useCallback(
    (
      promoteIds: Set<string>,
      graduateIds: Set<string>,
      advanceYear: boolean,
      nextTahunAjaran?: string
    ) => {
      setDb((prev) => {
        const updatedStudents = prev.students.map((s) => {
          if (s.status === 'lulus') return s;
          if (graduateIds.has(s.id) && s.kelas === 6) {
            return { ...s, status: 'lulus' as const };
          }
          if (promoteIds.has(s.id) && s.kelas < 6) {
            return { ...s, kelas: (s.kelas + 1) as KelasNumber };
          }
          return s;
        });

        let settings = prev.settings;
        if (advanceYear && nextTahunAjaran) {
          const daftar = settings.daftarTahunAjaran.includes(nextTahunAjaran)
            ? settings.daftarTahunAjaran
            : [...settings.daftarTahunAjaran, nextTahunAjaran].sort();
          settings = {
            ...settings,
            tahunAjaranAktif: nextTahunAjaran,
            semesterAktif: 'Ganjil',
            daftarTahunAjaran: daftar,
          };
        }

        return {
          ...prev,
          students: updatedStudents,
          settings,
        };
      });
      showToast(
        `Kenaikan kelas massal berhasil diproses (${promoteIds.size} naik kelas, ${graduateIds.size} lulus).`
      );
    },
    [showToast]
  );

  // Teachers
  const addTeacher = useCallback(
    (data: Omit<Teacher, 'id'>) => {
      const teacher: Teacher = { ...data, id: generateId('guru') };
      setDb((prev) => {
        const nextSettings = { ...prev.settings };
        // Auto-sync Kepala Sekolah if empty in settings
        if (
          data.jabatan === 'Kepala Sekolah' &&
          !nextSettings.namaKepalaSekolah.trim()
        ) {
          nextSettings.namaKepalaSekolah = data.nama;
          nextSettings.nipKepalaSekolah = data.nip;
        }
        return {
          ...prev,
          teachers: [...prev.teachers, teacher],
          settings: nextSettings,
        };
      });
      showToast(`Guru "${data.nama}" berhasil ditambahkan.`);
    },
    [showToast]
  );

  const updateTeacher = useCallback(
    (id: string, data: Partial<Omit<Teacher, 'id'>>) => {
      setDb((prev) => ({
        ...prev,
        teachers: prev.teachers.map((t) =>
          t.id === id ? { ...t, ...data } : t
        ),
      }));
      showToast('Data guru diperbarui.');
    },
    [showToast]
  );

  const deleteTeacher = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        teachers: prev.teachers.filter((t) => t.id !== id),
      }));
      showToast('Data guru dihapus.', 'info');
    },
    [showToast]
  );

  // Subjects
  const addSubject = useCallback(
    (data: Omit<Subject, 'id' | 'urutan'>) => {
      setDb((prev) => {
        const maxUrutan = prev.subjects.reduce(
          (max, s) => Math.max(max, s.urutan),
          0
        );
        const subject: Subject = {
          ...data,
          id: generateId('mapel'),
          urutan: maxUrutan + 1,
        };
        return { ...prev, subjects: [...prev.subjects, subject] };
      });
      showToast(`Mata pelajaran "${data.nama}" ditambahkan.`);
    },
    [showToast]
  );

  const updateSubject = useCallback(
    (id: string, data: Partial<Omit<Subject, 'id'>>) => {
      setDb((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === id ? { ...s, ...data } : s
        ),
      }));
      showToast('Mata pelajaran diperbarui.');
    },
    [showToast]
  );

  const deleteSubject = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== id),
      }));
      showToast('Mata pelajaran dihapus.', 'info');
    },
    [showToast]
  );

  const resetDefaultSubjects = useCallback(() => {
    setDb((prev) => ({
      ...prev,
      subjects: DEFAULT_SUBJECTS.map((s) => ({
        ...s,
        kelasAktif: [...s.kelasAktif],
      })),
    }));
    showToast('Daftar mata pelajaran dikembalikan ke default Kurikulum Merdeka.');
  }, [showToast]);

  // Extracurriculars
  const addActivity = useCallback(
    (data: Omit<ExtracurricularActivity, 'id'>) => {
      const act: ExtracurricularActivity = { ...data, id: generateId('ekskul') };
      setDb((prev) => ({ ...prev, activities: [...prev.activities, act] }));
      showToast(`Kegiatan "${data.nama}" ditambahkan.`);
    },
    [showToast]
  );

  const updateActivity = useCallback(
    (id: string, data: Partial<Omit<ExtracurricularActivity, 'id'>>) => {
      setDb((prev) => ({
        ...prev,
        activities: prev.activities.map((a) =>
          a.id === id ? { ...a, ...data } : a
        ),
      }));
      showToast('Kegiatan ekstrakurikuler diperbarui.');
    },
    [showToast]
  );

  const deleteActivity = useCallback(
    (id: string) => {
      setDb((prev) => ({
        ...prev,
        activities: prev.activities.filter((a) => a.id !== id),
      }));
      showToast('Kegiatan ekstrakurikuler dihapus.', 'info');
    },
    [showToast]
  );

  const upsertStudentExtracurricular = useCallback(
    (item: Omit<StudentExtracurricular, 'id'> & { id?: string }) => {
      updatePeriod((period) => {
        if (item.id) {
          return {
            ...period,
            extracurriculars: period.extracurriculars.map((e) =>
              e.id === item.id ? ({ ...e, ...item } as StudentExtracurricular) : e
            ),
          };
        }
        const created: StudentExtracurricular = {
          ...item,
          id: generateId('sek'),
        };
        return {
          ...period,
          extracurriculars: [...period.extracurriculars, created],
        };
      });
      showToast('Data ekstrakurikuler siswa disimpan.');
    },
    [updatePeriod, showToast]
  );

  const deleteStudentExtracurricular = useCallback(
    (id: string) => {
      updatePeriod((period) => ({
        ...period,
        extracurriculars: period.extracurriculars.filter((e) => e.id !== id),
      }));
      showToast('Ekstrakurikuler siswa dihapus.', 'info');
    },
    [updatePeriod, showToast]
  );

  // Grades
  const upsertGrade = useCallback(
    (studentId: string, subjectId: string, patch: Partial<GradeEntry>) => {
      updatePeriod((period) => {
        const key = getGradeKey(studentId, subjectId);
        const existing: GradeEntry = period.grades[key] || {
          studentId,
          subjectId,
          formatif: null,
          sumatif: null,
          sts: null,
          sas: null,
          capaianTertinggi: '',
          perluDitingkatkan: '',
        };
        return {
          ...period,
          grades: {
            ...period.grades,
            [key]: { ...existing, ...patch },
          },
        };
      });
    },
    [updatePeriod]
  );

  const upsertGradesBatch = useCallback(
    (
      updates: Array<{
        studentId: string;
        subjectId: string;
        patch: Partial<GradeEntry>;
      }>
    ) => {
      updatePeriod((period) => {
        const nextGrades = { ...period.grades };
        for (const u of updates) {
          const key = getGradeKey(u.studentId, u.subjectId);
          const existing: GradeEntry = nextGrades[key] || {
            studentId: u.studentId,
            subjectId: u.subjectId,
            formatif: null,
            sumatif: null,
            sts: null,
            sas: null,
            capaianTertinggi: '',
            perluDitingkatkan: '',
          };
          nextGrades[key] = { ...existing, ...u.patch };
        }
        return {
          ...period,
          grades: nextGrades,
        };
      });
    },
    [updatePeriod]
  );

  // Report Meta (Attendance, Notes, Promotion decision)
  const upsertReportMeta = useCallback(
    (studentId: string, patch: Partial<StudentReportMeta>) => {
      updatePeriod((period) => {
        const existing =
          period.reportMeta[studentId] || getDefaultReportMeta(studentId);
        return {
          ...period,
          reportMeta: {
            ...period.reportMeta,
            [studentId]: { ...existing, ...patch },
          },
        };
      });
    },
    [updatePeriod]
  );

  // Sample Data & Reset
  const loadSampleData = useCallback(() => {
    setDb((prev) => createSampleDatabase(prev.settings));
    showToast(
      'Data contoh SDN 1 Karangsuwung berhasil dimuat (25 siswa, 9 guru, nilai & ekstrakurikuler).'
    );
  }, [showToast]);

  const clearAllData = useCallback(() => {
    setDb(createEmptyDatabase());
    showToast('Semua data telah dikosongkan. Aplikasi kembali bersih.', 'info');
  }, [showToast]);

  const restoreDatabase = useCallback(
    (newDb: AppDatabase) => {
      setDb(newDb);
      showToast('Data backup berhasil dipulihkan!');
    },
    [showToast]
  );

  return (
    <AppContext.Provider
      value={{
        db,
        activePage: navState.page,
        navState,
        navigate,
        toasts,
        showToast,
        dismissToast,
        updateSettings,
        setActivePeriod,
        addTahunAjaran,
        addStudent,
        addStudentsBulk,
        updateStudent,
        deleteStudent,
        promoteStudentsMass,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addSubject,
        updateSubject,
        deleteSubject,
        resetDefaultSubjects,
        addActivity,
        updateActivity,
        deleteActivity,
        upsertStudentExtracurricular,
        deleteStudentExtracurricular,
        upsertGrade,
        upsertGradesBatch,
        upsertReportMeta,
        loadSampleData,
        clearAllData,
        restoreDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp harus digunakan di dalam AppProvider');
  return ctx;
}
