export type KelasNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type Fase = 'A' | 'B' | 'C';
export type Semester = 'Ganjil' | 'Genap';
export type JenisKelamin = 'L' | 'P';

export type JabatanGuru =
  | 'Kepala Sekolah'
  | 'Wali Kelas 1'
  | 'Wali Kelas 2'
  | 'Wali Kelas 3'
  | 'Wali Kelas 4'
  | 'Wali Kelas 5'
  | 'Wali Kelas 6'
  | 'Guru Mata Pelajaran';

export type PageId =
  | 'dashboard'
  | 'kelola-data'
  | 'input-nilai'
  | 'rekap-leger'
  | 'e-rapor'
  | 'pengaturan';

export interface BobotNilai {
  formatif: number;
  sumatif: number;
  sts: number;
  sas: number;
}

export interface SchoolSettings {
  namaSekolah: string;
  npsn: string;
  alamatSekolah: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  tempatRapor: string;
  tanggalRapor: string; // YYYY-MM-DD
  tahunAjaranAktif: string; // e.g. "2026/2027"
  daftarTahunAjaran: string[];
  semesterAktif: Semester;
  bobot: BobotNilai;
  kktpDefault: number;
}

export interface Student {
  id: string;
  nama: string;
  nis: string;
  nisn: string;
  jenisKelamin: JenisKelamin;
  kelas: KelasNumber;
  namaOrangTua: string;
  status?: 'aktif' | 'lulus';
}

export interface Teacher {
  id: string;
  nama: string;
  nip: string;
  jabatan: JabatanGuru;
}

export interface Subject {
  id: string;
  nama: string;
  kode: string;
  kktp?: number;
  kelasAktif: KelasNumber[];
  urutan: number;
}

export interface ExtracurricularActivity {
  id: string;
  nama: string;
  keteranganDefault?: string;
}

export type PredikatEkskul = 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang';

export interface StudentExtracurricular {
  id: string;
  studentId: string;
  activityId: string;
  predikat: PredikatEkskul;
  deskripsi: string;
}

export interface GradeEntry {
  studentId: string;
  subjectId: string;
  formatif: number | null;
  sumatif: number | null;
  sts: number | null;
  sas: number | null;
  capaianTertinggi: string;
  perluDitingkatkan: string;
}

export type KeputusanKenaikan = 'naik' | 'tinggal' | 'lulus' | 'tidak_lulus' | '';

export interface StudentReportMeta {
  studentId: string;
  sakit: number;
  izin: number;
  tanpaKeterangan: number;
  catatanWaliKelas: string;
  keputusanKenaikan: KeputusanKenaikan;
}

export interface PeriodData {
  grades: Record<string, GradeEntry>; // `${studentId}__${subjectId}`
  reportMeta: Record<string, StudentReportMeta>; // `${studentId}`
  extracurriculars: StudentExtracurricular[];
}

export interface AppDatabase {
  version: number;
  isSampleData: boolean;
  settings: SchoolSettings;
  students: Student[];
  teachers: Teacher[];
  subjects: Subject[];
  activities: ExtracurricularActivity[];
  periods: Record<string, PeriodData>;
}

export interface CalculatedGrade {
  nilaiAkhir: number | null;
  isComplete: boolean;
  filledCount: number;
  requiredCount: number;
  kktp: number;
  tuntas: boolean | null; // null if nilaiAkhir is null
}

export interface NavigationTarget {
  page: PageId;
  kelas?: KelasNumber;
  subjectId?: string;
  studentId?: string;
  tab?: string;
}
