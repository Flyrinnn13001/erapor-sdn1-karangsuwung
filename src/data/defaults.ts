import {
  AppDatabase,
  JabatanGuru,
  KelasNumber,
  PeriodData,
  PredikatEkskul,
  SchoolSettings,
  Subject,
} from '../types';

export const APP_STORAGE_KEY = 'erapor_sdn1_karangsuwung_v1';
export const DB_VERSION = 1;

export const KELAS_LIST: KelasNumber[] = [1, 2, 3, 4, 5, 6];

export const KELAS_ROMAWI: Record<KelasNumber, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
};

export const JABATAN_LIST: JabatanGuru[] = [
  'Kepala Sekolah',
  'Wali Kelas 1',
  'Wali Kelas 2',
  'Wali Kelas 3',
  'Wali Kelas 4',
  'Wali Kelas 5',
  'Wali Kelas 6',
  'Guru Mata Pelajaran',
];

export const PREDIKAT_EKSKUL_LIST: PredikatEkskul[] = [
  'Sangat Baik',
  'Baik',
  'Cukup',
  'Kurang',
];

export const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'mapel-pai',
    nama: 'Pendidikan Agama dan Budi Pekerti',
    kode: 'PAI',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 1,
  },
  {
    id: 'mapel-pp',
    nama: 'Pendidikan Pancasila',
    kode: 'PP',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 2,
  },
  {
    id: 'mapel-bind',
    nama: 'Bahasa Indonesia',
    kode: 'B.IND',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 3,
  },
  {
    id: 'mapel-mtk',
    nama: 'Matematika',
    kode: 'MTK',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 4,
  },
  {
    id: 'mapel-ipas',
    nama: 'IPAS',
    kode: 'IPAS',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 5,
  },
  {
    id: 'mapel-pjok',
    nama: 'PJOK',
    kode: 'PJOK',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 6,
  },
  {
    id: 'mapel-sbdp',
    nama: 'Seni Budaya',
    kode: 'SBdP',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 7,
  },
  {
    id: 'mapel-bing',
    nama: 'Bahasa Inggris',
    kode: 'B.ING',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 8,
  },
  {
    id: 'mapel-bsunda',
    nama: 'Muatan Lokal Bahasa Sunda',
    kode: 'B.SUN',
    kelasAktif: [1, 2, 3, 4, 5, 6],
    urutan: 9,
  },
];

export const DEFAULT_SETTINGS: SchoolSettings = {
  namaSekolah: 'SDN 1 Karangsuwung',
  npsn: '',
  alamatSekolah: '',
  namaKepalaSekolah: '',
  nipKepalaSekolah: '',
  tempatRapor: 'Karangsuwung',
  tanggalRapor: '2026-12-18',
  tahunAjaranAktif: '2026/2027',
  daftarTahunAjaran: ['2024/2025', '2025/2026', '2026/2027', '2027/2028'],
  semesterAktif: 'Ganjil',
  bobot: {
    formatif: 20,
    sumatif: 30,
    sts: 20,
    sas: 30,
  },
  kktpDefault: 70,
};

export function createEmptyPeriodData(): PeriodData {
  return {
    grades: {},
    reportMeta: {},
    extracurriculars: [],
  };
}

export function createEmptyDatabase(): AppDatabase {
  return {
    version: DB_VERSION,
    isSampleData: false,
    settings: {
      ...DEFAULT_SETTINGS,
      bobot: { ...DEFAULT_SETTINGS.bobot },
      daftarTahunAjaran: [...DEFAULT_SETTINGS.daftarTahunAjaran],
    },
    students: [],
    teachers: [],
    subjects: DEFAULT_SUBJECTS.map((s) => ({
      ...s,
      kelasAktif: [...s.kelasAktif],
    })),
    activities: [],
    periods: {},
  };
}
