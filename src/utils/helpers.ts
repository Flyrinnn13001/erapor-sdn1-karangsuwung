import {
  AppDatabase,
  BobotNilai,
  CalculatedGrade,
  Fase,
  GradeEntry,
  JenisKelamin,
  KelasNumber,
  PeriodData,
  Semester,
  Student,
  StudentReportMeta,
  Subject,
  Teacher,
} from '../types';
import { createEmptyPeriodData, KELAS_LIST } from '../data/defaults';

export function generateId(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function getFase(kelas: KelasNumber): Fase {
  if (kelas <= 2) return 'A';
  if (kelas <= 4) return 'B';
  return 'C';
}

export function getPeriodKey(tahunAjaran: string, semester: Semester): string {
  return `${tahunAjaran}__${semester}`;
}

export function getGradeKey(studentId: string, subjectId: string): string {
  return `${studentId}__${subjectId}`;
}

export function getActivePeriodData(db: AppDatabase): PeriodData {
  const key = getPeriodKey(
    db.settings.tahunAjaranAktif,
    db.settings.semesterAktif
  );
  return db.periods[key] || createEmptyPeriodData();
}

export function getActiveStudents(students: Student[]): Student[] {
  return students.filter((s) => s.status !== 'lulus');
}

export function getStudentsByKelas(
  students: Student[],
  kelas: KelasNumber
): Student[] {
  return getActiveStudents(students)
    .filter((s) => s.kelas === kelas)
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
}

export function getSubjectsForKelas(
  subjects: Subject[],
  kelas: KelasNumber
): Subject[] {
  return [...subjects]
    .filter((s) => !s.kelasAktif || s.kelasAktif.includes(kelas))
    .sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama, 'id'));
}

export function getWaliKelas(
  teachers: Teacher[],
  kelas: KelasNumber
): Teacher | undefined {
  return teachers.find((t) => t.jabatan === `Wali Kelas ${kelas}`);
}

export function getKepalaSekolah(
  db: AppDatabase
): { nama: string; nip: string } {
  if (db.settings.namaKepalaSekolah.trim()) {
    return {
      nama: db.settings.namaKepalaSekolah.trim(),
      nip: db.settings.nipKepalaSekolah.trim(),
    };
  }
  const kepsekTeacher = db.teachers.find((t) => t.jabatan === 'Kepala Sekolah');
  if (kepsekTeacher) {
    return { nama: kepsekTeacher.nama, nip: kepsekTeacher.nip };
  }
  return { nama: '', nip: '' };
}

export function clampScore(val: string | number | null | undefined): number | null {
  if (val === '' || val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(String(val).replace(',', '.'));
  if (Number.isNaN(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num * 100) / 100));
}

export function calculateGrade(
  entry: GradeEntry | undefined,
  bobot: BobotNilai,
  kktp: number
): CalculatedGrade {
  const components: { value: number | null; weight: number }[] = [
    { value: entry?.formatif ?? null, weight: bobot.formatif },
    { value: entry?.sumatif ?? null, weight: bobot.sumatif },
    { value: entry?.sts ?? null, weight: bobot.sts },
    { value: entry?.sas ?? null, weight: bobot.sas },
  ];

  const required = components.filter((c) => c.weight > 0);
  const filled = required.filter(
    (c) => c.value !== null && !Number.isNaN(c.value)
  );

  if (filled.length === 0 || required.length === 0) {
    return {
      nilaiAkhir: null,
      isComplete: false,
      filledCount: 0,
      requiredCount: required.length,
      kktp,
      tuntas: null,
    };
  }

  const filledWeight = filled.reduce((acc, c) => acc + c.weight, 0);
  const weightedSum = filled.reduce(
    (acc, c) => acc + (c.value as number) * c.weight,
    0
  );
  const nilaiAkhir = Math.round(weightedSum / filledWeight);
  const isComplete = filled.length === required.length;

  return {
    nilaiAkhir,
    isComplete,
    filledCount: filled.length,
    requiredCount: required.length,
    kktp,
    tuntas: nilaiAkhir >= kktp,
  };
}

export function getSubjectKktp(subject: Subject, kktpDefault: number): number {
  return typeof subject.kktp === 'number' && !Number.isNaN(subject.kktp)
    ? subject.kktp
    : kktpDefault;
}

export function formatTanggalIndo(isoDate: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const [year, monthStr, dayStr] = parts;
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const m = parseInt(monthStr, 10) - 1;
  const d = parseInt(dayStr, 10);
  if (m < 0 || m > 11 || Number.isNaN(d)) return isoDate;
  return `${d} ${months[m]} ${year}`;
}

export function formatDecimalId(val: number | null, digits = 2): string {
  if (val === null || Number.isNaN(val)) return '-';
  return val.toFixed(digits).replace('.', ',');
}

export interface LegerRow {
  student: Student;
  scores: Record<string, CalculatedGrade>; // subjectId -> CalculatedGrade
  jumlahNilai: number;
  rataRata: number | null;
  jumlahMapelDinilai: number;
  ranking: number | null;
  meta: StudentReportMeta;
}

export function getDefaultReportMeta(studentId: string): StudentReportMeta {
  return {
    studentId,
    sakit: 0,
    izin: 0,
    tanpaKeterangan: 0,
    catatanWaliKelas: '',
    keputusanKenaikan: '',
  };
}

export function buildLegerData(
  db: AppDatabase,
  kelas: KelasNumber
): {
  subjects: Subject[];
  rows: LegerRow[];
  subjectStats: Record<
    string,
    {
      rataRata: number | null;
      tertinggi: number | null;
      terendah: number | null;
      tuntas: number;
      belumTuntas: number;
      belumDiinput: number;
    }
  >;
} {
  const period = getActivePeriodData(db);
  const students = getStudentsByKelas(db.students, kelas);
  const subjects = getSubjectsForKelas(db.subjects, kelas);

  const rows: LegerRow[] = students.map((student) => {
    const scores: Record<string, CalculatedGrade> = {};
    let jumlahNilai = 0;
    let jumlahMapelDinilai = 0;

    for (const subj of subjects) {
      const entry = period.grades[getGradeKey(student.id, subj.id)];
      const kktp = getSubjectKktp(subj, db.settings.kktpDefault);
      const calc = calculateGrade(entry, db.settings.bobot, kktp);
      scores[subj.id] = calc;
      if (calc.nilaiAkhir !== null) {
        jumlahNilai += calc.nilaiAkhir;
        jumlahMapelDinilai += 1;
      }
    }

    const rataRata =
      jumlahMapelDinilai > 0 ? jumlahNilai / jumlahMapelDinilai : null;
    const meta =
      period.reportMeta[student.id] || getDefaultReportMeta(student.id);

    return {
      student,
      scores,
      jumlahNilai,
      rataRata,
      jumlahMapelDinilai,
      ranking: null,
      meta,
    };
  });

  // Compute competition ranking among students who have at least 1 graded subject
  const rankedIndices = rows
    .map((r, idx) => ({ idx, jumlah: r.jumlahNilai, rata: r.rataRata }))
    .filter((item) => item.rata !== null)
    .sort((a, b) => {
      if (b.jumlah !== a.jumlah) return b.jumlah - a.jumlah;
      return (b.rata ?? 0) - (a.rata ?? 0);
    });

  let currentRank = 1;
  for (let i = 0; i < rankedIndices.length; i++) {
    if (i > 0) {
      const prev = rankedIndices[i - 1];
      const curr = rankedIndices[i];
      if (curr.jumlah !== prev.jumlah || curr.rata !== prev.rata) {
        currentRank = i + 1;
      }
    }
    rows[rankedIndices[i].idx].ranking = currentRank;
  }

  // Per-subject stats
  const subjectStats: Record<
    string,
    {
      rataRata: number | null;
      tertinggi: number | null;
      terendah: number | null;
      tuntas: number;
      belumTuntas: number;
      belumDiinput: number;
    }
  > = {};

  for (const subj of subjects) {
    const vals: number[] = [];
    let tuntas = 0;
    let belumTuntas = 0;
    let belumDiinput = 0;

    for (const row of rows) {
      const calc = row.scores[subj.id];
      if (calc && calc.nilaiAkhir !== null) {
        vals.push(calc.nilaiAkhir);
        if (calc.tuntas) tuntas++;
        else belumTuntas++;
      } else {
        belumDiinput++;
      }
    }

    subjectStats[subj.id] = {
      rataRata:
        vals.length > 0
          ? vals.reduce((a, b) => a + b, 0) / vals.length
          : null,
      tertinggi: vals.length > 0 ? Math.max(...vals) : null,
      terendah: vals.length > 0 ? Math.min(...vals) : null,
      tuntas,
      belumTuntas,
      belumDiinput,
    };
  }

  return { subjects, rows, subjectStats };
}

export interface IncompleteItem {
  kelas: KelasNumber;
  subjectId: string;
  subjectNama: string;
  subjectKode: string;
  totalSiswa: number;
  belumLengkap: number;
  tanpaDeskripsi: number;
}

export function getIncompleteGradeAlerts(db: AppDatabase): {
  items: IncompleteItem[];
  totalExpected: number;
  totalCompleted: number;
  totalIncompleteEntries: number;
} {
  const period = getActivePeriodData(db);
  const items: IncompleteItem[] = [];
  let totalExpected = 0;
  let totalCompleted = 0;
  let totalIncompleteEntries = 0;

  for (const kelas of KELAS_LIST) {
    const students = getStudentsByKelas(db.students, kelas);
    if (students.length === 0) continue;
    const subjects = getSubjectsForKelas(db.subjects, kelas);

    for (const subj of subjects) {
      let belumLengkap = 0;
      let tanpaDeskripsi = 0;
      const kktp = getSubjectKktp(subj, db.settings.kktpDefault);

      for (const student of students) {
        totalExpected++;
        const entry = period.grades[getGradeKey(student.id, subj.id)];
        const calc = calculateGrade(entry, db.settings.bobot, kktp);

        if (calc.isComplete) {
          totalCompleted++;
        } else {
          belumLengkap++;
          totalIncompleteEntries++;
        }

        const hasDesc =
          Boolean(entry?.capaianTertinggi?.trim()) ||
          Boolean(entry?.perluDitingkatkan?.trim());
        if (!hasDesc) {
          tanpaDeskripsi++;
        }
      }

      if (belumLengkap > 0) {
        items.push({
          kelas,
          subjectId: subj.id,
          subjectNama: subj.nama,
          subjectKode: subj.kode,
          totalSiswa: students.length,
          belumLengkap,
          tanpaDeskripsi,
        });
      }
    }
  }

  return {
    items,
    totalExpected,
    totalCompleted,
    totalIncompleteEntries,
  };
}

export function getNextAcademicYear(current: string): string {
  const match = current.match(/^(\d{4})\/(\d{4})$/);
  if (!match) return '2027/2028';
  const y1 = parseInt(match[1], 10) + 1;
  const y2 = parseInt(match[2], 10) + 1;
  return `${y1}/${y2}`;
}

export function generateCompetencyDescription(
  subjectNama: string,
  nilaiAkhir: number | null,
  kktp: number
): { capaianTertinggi: string; perluDitingkatkan: string } {
  const mapel = subjectNama.toLowerCase();

  let topikTinggi = `konsep dasar dan penerapan materi ${subjectNama}`;
  let topikTingkat = `ketelitian dan pemahaman mendalam pada materi ${subjectNama}`;

  if (mapel.includes('agama')) {
    topikTinggi =
      'memahami nilai keimanan, akhlak mulia, serta praktik ibadah sehari-hari';
    topikTingkat =
      'membiasakan penerapan akhlak terpuji dan hafalan bacaan secara konsisten';
  } else if (mapel.includes('pancasila')) {
    topikTinggi =
      'mengenal nilai-nilai Pancasila, aturan di sekolah, dan sikap gotong royong';
    topikTingkat =
      'menerapkan sikap musyawarah serta menghargai keberagaman di lingkungan sekitar';
  } else if (mapel.includes('bahasa indonesia')) {
    topikTinggi =
      'membaca pemahaman teks bacaan serta menyampaikan gagasan secara lisan dan tulisan';
    topikTingkat =
      'penggunaan ejaan, tanda baca, serta penyusunan kalimat efektif dalam paragraf';
  } else if (mapel.includes('matematika')) {
    topikTinggi =
      'operasi hitung bilangan serta pemecahan masalah matematika sederhana';
    topikTingkat =
      'ketelitian menyelesaikan soal cerita dan pemahaman konsep pengukuran';
  } else if (mapel.includes('ipas')) {
    topikTinggi =
      'mengamati fenomena alam dan sosial di lingkungan sekitar secara aktif';
    topikTingkat =
      'menyimpulkan hasil pengamatan dan mengaitkan konsep IPAS dengan kehidupan sehari-hari';
  } else if (mapel.includes('pjok')) {
    topikTinggi =
      'mempraktikkan gerak dasar lokomotor, non-lokomotor, serta pola hidup sehat';
    topikTingkat =
      'koordinasi gerakan, kebugaran jasmani, dan sportivitas dalam permainan kelompok';
  } else if (mapel.includes('seni')) {
    topikTinggi =
      'mengekspresikan kreativitas melalui karya seni rupa, musik, maupun gerak';
    topikTingkat =
      'kerapian penyelesaian karya dan keberanian menampilkan hasil kreasi di depan kelas';
  } else if (mapel.includes('inggris')) {
    topikTinggi =
      'mengenal kosakata dasar dan ungkapan sederhana dalam percakapan sehari-hari';
    topikTingkat =
      'pelafalan kosakata serta menyusun kalimat sederhana dalam Bahasa Inggris';
  } else if (mapel.includes('sunda')) {
    topikTinggi =
      'memahami kosakata Bahasa Sunda, tatakrama basa, dan cerita rakyat daerah';
    topikTingkat =
      'penggunaan undak-usuk basa Sunda yang santun dalam percakapan sehari-hari';
  }

  if (nilaiAkhir === null) {
    return {
      capaianTertinggi: `Menunjukkan penguasaan yang baik dalam ${topikTinggi}.`,
      perluDitingkatkan: `Perlu bimbingan lebih lanjut dalam ${topikTingkat}.`,
    };
  }

  if (nilaiAkhir >= 90) {
    return {
      capaianTertinggi: `Menunjukkan penguasaan yang sangat baik dalam ${topikTinggi}.`,
      perluDitingkatkan: `Perlu terus mempertahankan semangat belajar dan memperkaya latihan pada ${topikTingkat}.`,
    };
  }
  if (nilaiAkhir >= 80) {
    return {
      capaianTertinggi: `Menunjukkan penguasaan yang baik dalam ${topikTinggi}.`,
      perluDitingkatkan: `Perlu pendampingan ringan untuk meningkatkan ${topikTingkat}.`,
    };
  }
  if (nilaiAkhir >= kktp) {
    return {
      capaianTertinggi: `Menunjukkan penguasaan yang cukup baik dalam ${topikTinggi}.`,
      perluDitingkatkan: `Perlu bimbingan dan latihan teratur dalam ${topikTingkat}.`,
    };
  }
  return {
    capaianTertinggi: `Mulai menunjukkan perkembangan dalam ${topikTinggi}.`,
    perluDitingkatkan: `Memerlukan bimbingan intensif dan pendampingan khusus dalam ${topikTingkat}.`,
  };
}

export interface ParsedBulkStudent {
  nama: string;
  nis: string;
  nisn: string;
  jenisKelamin: JenisKelamin;
  namaOrangTua: string;
}

/**
 * Parses pasted lines from Excel / WhatsApp / Word.
 * Supports:
 * - Single name per line: "Ahmad Fauzan"
 * - Tab / semicolon / comma separated: "Ahmad Fauzan, 2501, 0152345678, L, Budi Santoso"
 */
export function parseBulkStudents(rawText: string): ParsedBulkStudent[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedBulkStudent[] = [];

  for (const line of lines) {
    // Strip leading numbering like "1. " or "1) "
    const cleaned = line.replace(/^\d+[\.\)]\s+/, '').trim();
    if (!cleaned) continue;

    // Detect delimiter: tab first, then semicolon, then comma
    let parts: string[];
    if (cleaned.includes('\t')) {
      parts = cleaned.split('\t').map((p) => p.trim());
    } else if (cleaned.includes(';')) {
      parts = cleaned.split(';').map((p) => p.trim());
    } else if (cleaned.includes(',')) {
      parts = cleaned.split(',').map((p) => p.trim());
    } else {
      parts = [cleaned];
    }

    const nama = parts[0] || '';
    if (!nama) continue;
    // Skip header row if pasted from Excel
    if (
      nama.toLowerCase() === 'nama' ||
      nama.toLowerCase() === 'nama siswa' ||
      nama.toLowerCase() === 'nama lengkap'
    ) {
      continue;
    }

    const nis = parts[1] || '';
    const nisn = parts[2] || '';
    const jkRaw = (parts[3] || 'L').toUpperCase();
    const jenisKelamin: JenisKelamin =
      jkRaw.startsWith('P') || jkRaw.startsWith('W') ? 'P' : 'L';
    const namaOrangTua = parts[4] || '';

    results.push({
      nama,
      nis,
      nisn,
      jenisKelamin,
      namaOrangTua,
    });
  }

  return results;
}

export function getKeputusanLabel(
  keputusan: string,
  kelas: KelasNumber
): string {
  switch (keputusan) {
    case 'naik':
      return kelas < 6
        ? `Naik ke Kelas ${kelas + 1}`
        : 'Lulus dari Satuan Pendidikan';
    case 'tinggal':
      return `Tinggal di Kelas ${kelas}`;
    case 'lulus':
      return 'Lulus dari Satuan Pendidikan';
    case 'tidak_lulus':
      return 'Belum Lulus';
    default:
      return 'Belum ditentukan';
  }
}
