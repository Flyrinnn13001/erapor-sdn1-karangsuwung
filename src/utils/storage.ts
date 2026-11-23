import { AppDatabase } from '../types';
import {
  APP_STORAGE_KEY,
  createEmptyDatabase,
  DB_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_SUBJECTS,
} from '../data/defaults';

export function loadDatabase(): AppDatabase {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return createEmptyDatabase();
    const parsed = JSON.parse(raw);
    return normalizeDatabase(parsed);
  } catch (err) {
    console.error('Gagal membaca data dari penyimpanan lokal:', err);
    return createEmptyDatabase();
  }
}

export function saveDatabase(db: AppDatabase): void {
  try {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    console.error('Gagal menyimpan data ke penyimpanan lokal:', err);
  }
}

export function normalizeDatabase(raw: unknown): AppDatabase {
  const base = createEmptyDatabase();
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<AppDatabase>;

  const settings = {
    ...DEFAULT_SETTINGS,
    ...(obj.settings || {}),
    bobot: {
      ...DEFAULT_SETTINGS.bobot,
      ...(obj.settings?.bobot || {}),
    },
    daftarTahunAjaran:
      Array.isArray(obj.settings?.daftarTahunAjaran) &&
      obj.settings!.daftarTahunAjaran.length > 0
        ? obj.settings!.daftarTahunAjaran
        : [...DEFAULT_SETTINGS.daftarTahunAjaran],
  };

  // Ensure active tahun ajaran is in daftarTahunAjaran
  if (!settings.daftarTahunAjaran.includes(settings.tahunAjaranAktif)) {
    settings.daftarTahunAjaran = [
      ...settings.daftarTahunAjaran,
      settings.tahunAjaranAktif,
    ];
  }

  return {
    version: DB_VERSION,
    isSampleData: Boolean(obj.isSampleData),
    settings,
    students: Array.isArray(obj.students) ? obj.students : [],
    teachers: Array.isArray(obj.teachers) ? obj.teachers : [],
    subjects:
      Array.isArray(obj.subjects) && obj.subjects.length >= 0
        ? obj.subjects
        : DEFAULT_SUBJECTS,
    activities: Array.isArray(obj.activities) ? obj.activities : [],
    periods:
      obj.periods && typeof obj.periods === 'object' ? obj.periods : {},
  };
}

export function validateBackupJson(rawText: string): {
  valid: boolean;
  data?: AppDatabase;
  error?: string;
  summary?: {
    namaSekolah: string;
    jumlahSiswa: number;
    jumlahGuru: number;
    jumlahMapel: number;
    jumlahPeriode: number;
  };
} {
  try {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Format JSON tidak valid.' };
    }
    if (
      !('settings' in parsed) ||
      !Array.isArray(parsed.students) ||
      !Array.isArray(parsed.teachers)
    ) {
      return {
        valid: false,
        error:
          'File JSON bukan merupakan file backup E-Rapor SDN 1 Karangsuwung yang sah.',
      };
    }
    const normalized = normalizeDatabase(parsed);
    return {
      valid: true,
      data: normalized,
      summary: {
        namaSekolah: normalized.settings.namaSekolah,
        jumlahSiswa: normalized.students.length,
        jumlahGuru: normalized.teachers.length,
        jumlahMapel: normalized.subjects.length,
        jumlahPeriode: Object.keys(normalized.periods).length,
      },
    };
  } catch {
    return {
      valid: false,
      error: 'Gagal membaca file JSON. Pastikan file tidak rusak.',
    };
  }
}

export function downloadBackupJson(db: AppDatabase): void {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const slug = (db.settings.namaSekolah || 'sdn1-karangsuwung')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-erapor-${slug}-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
