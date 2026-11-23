import { AppDatabase, KelasNumber, Student } from '../types';
import {
  buildLegerData,
  calculateGrade,
  formatDecimalId,
  getActivePeriodData,
  getFase,
  getGradeKey,
  getSubjectKktp,
  getSubjectsForKelas,
} from './helpers';

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]): void {
  const csvContent =
    '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportLegerCsv(db: AppDatabase, kelas: KelasNumber): void {
  const { subjects, rows, subjectStats } = buildLegerData(db, kelas);
  const { tahunAjaranAktif, semesterAktif, namaSekolah } = db.settings;

  const csvRows: (string | number | null)[][] = [
    [`LEGER NILAI - ${namaSekolah.toUpperCase()}`],
    [
      `Kelas ${kelas} (Fase ${getFase(kelas)})`,
      `Semester ${semesterAktif}`,
      `Tahun Ajaran ${tahunAjaranAktif}`,
    ],
    [],
    [
      'No',
      'NIS',
      'NISN',
      'Nama Siswa',
      'L/P',
      ...subjects.map((s) => `${s.kode} (${s.nama})`),
      'Jumlah Nilai',
      'Rata-Rata',
      'Peringkat',
      'Sakit',
      'Izin',
      'Tanpa Keterangan',
    ],
  ];

  rows.forEach((row, idx) => {
    csvRows.push([
      idx + 1,
      row.student.nis,
      row.student.nisn,
      row.student.nama,
      row.student.jenisKelamin,
      ...subjects.map((s) => row.scores[s.id]?.nilaiAkhir ?? ''),
      row.jumlahMapelDinilai > 0 ? row.jumlahNilai : '',
      row.rataRata !== null ? formatDecimalId(row.rataRata, 2) : '',
      row.ranking ?? '',
      row.meta.sakit,
      row.meta.izin,
      row.meta.tanpaKeterangan,
    ]);
  });

  csvRows.push([]);
  csvRows.push([
    '',
    '',
    '',
    'Rata-Rata Mapel',
    '',
    ...subjects.map((s) =>
      subjectStats[s.id]?.rataRata !== null
        ? formatDecimalId(subjectStats[s.id].rataRata, 2)
        : ''
    ),
  ]);
  csvRows.push([
    '',
    '',
    '',
    'Nilai Tertinggi',
    '',
    ...subjects.map((s) => subjectStats[s.id]?.tertinggi ?? ''),
  ]);
  csvRows.push([
    '',
    '',
    '',
    'Nilai Terendah',
    '',
    ...subjects.map((s) => subjectStats[s.id]?.terendah ?? ''),
  ]);

  const safeTa = tahunAjaranAktif.replace(/\//g, '-');
  downloadCsv(`leger-kelas-${kelas}-${semesterAktif.toLowerCase()}-${safeTa}.csv`, csvRows);
}

export function exportRekapSiswaCsv(db: AppDatabase, student: Student): void {
  const period = getActivePeriodData(db);
  const subjects = getSubjectsForKelas(db.subjects, student.kelas);
  const { tahunAjaranAktif, semesterAktif, namaSekolah } = db.settings;

  const csvRows: (string | number | null)[][] = [
    [`REKAP NILAI SISWA - ${namaSekolah.toUpperCase()}`],
    [`Nama Siswa`, student.nama, `NIS / NISN`, `${student.nis} / ${student.nisn}`],
    [
      `Kelas / Fase`,
      `Kelas ${student.kelas} (Fase ${getFase(student.kelas)})`,
      `Semester / TA`,
      `${semesterAktif} / ${tahunAjaranAktif}`,
    ],
    [],
    [
      'No',
      'Mata Pelajaran',
      'Formatif',
      'Sumatif',
      'STS',
      'SAS',
      'Nilai Akhir',
      'KKTP',
      'Status Ketuntasan',
      'Capaian Tertinggi',
      'Perlu Ditingkatkan',
    ],
  ];

  subjects.forEach((subj, idx) => {
    const entry = period.grades[getGradeKey(student.id, subj.id)];
    const kktp = getSubjectKktp(subj, db.settings.kktpDefault);
    const calc = calculateGrade(entry, db.settings.bobot, kktp);

    csvRows.push([
      idx + 1,
      subj.nama,
      entry?.formatif ?? '',
      entry?.sumatif ?? '',
      entry?.sts ?? '',
      entry?.sas ?? '',
      calc.nilaiAkhir ?? '',
      kktp,
      calc.tuntas === null
        ? 'Belum Dinilai'
        : calc.tuntas
        ? 'Tuntas'
        : 'Belum Tuntas',
      entry?.capaianTertinggi || '',
      entry?.perluDitingkatkan || '',
    ]);
  });

  const safeName = student.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  downloadCsv(`rekap-siswa-${safeName}-kelas-${student.kelas}.csv`, csvRows);
}

export function exportKetuntasanCsv(
  db: AppDatabase,
  kelasFilter: KelasNumber | 'all'
): void {
  const { tahunAjaranAktif, semesterAktif, namaSekolah } = db.settings;
  const kelasList: KelasNumber[] =
    kelasFilter === 'all' ? [1, 2, 3, 4, 5, 6] : [kelasFilter];

  const csvRows: (string | number | null)[][] = [
    [`REKAP KETUNTASAN PER MATA PELAJARAN - ${namaSekolah.toUpperCase()}`],
    [
      kelasFilter === 'all' ? 'Semua Kelas (1-6)' : `Kelas ${kelasFilter} (Fase ${getFase(kelasFilter)})`,
      `Semester ${semesterAktif}`,
      `Tahun Ajaran ${tahunAjaranAktif}`,
    ],
    [],
    [
      'No',
      'Mata Pelajaran',
      'KKTP',
      'Total Siswa',
      'Sudah Dinilai',
      'Tuntas',
      '% Tuntas',
      'Belum Tuntas',
      'Belum Diinput',
      'Nilai Tertinggi',
      'Nilai Terendah',
      'Rata-Rata',
    ],
  ];

  const sortedSubjects = [...db.subjects].sort((a, b) => a.urutan - b.urutan);
  let rowNo = 1;

  for (const subj of sortedSubjects) {
    const relevantKelas = kelasList.filter(
      (k) => !subj.kelasAktif || subj.kelasAktif.includes(k)
    );
    if (relevantKelas.length === 0) continue;

    let totalSiswa = 0;
    let tuntas = 0;
    let belumTuntas = 0;
    let belumDiinput = 0;
    const allVals: number[] = [];

    for (const k of relevantKelas) {
      const { rows } = buildLegerData(db, k);
      for (const r of rows) {
        totalSiswa++;
        const calc = r.scores[subj.id];
        if (calc && calc.nilaiAkhir !== null) {
          allVals.push(calc.nilaiAkhir);
          if (calc.tuntas) tuntas++;
          else belumTuntas++;
        } else {
          belumDiinput++;
        }
      }
    }

    const dinilai = tuntas + belumTuntas;
    const pct = dinilai > 0 ? `${((tuntas / dinilai) * 100).toFixed(1)}%` : '0%';
    const avg =
      allVals.length > 0
        ? formatDecimalId(allVals.reduce((a, b) => a + b, 0) / allVals.length, 2)
        : '-';

    csvRows.push([
      rowNo++,
      subj.nama,
      getSubjectKktp(subj, db.settings.kktpDefault),
      totalSiswa,
      dinilai,
      tuntas,
      pct,
      belumTuntas,
      belumDiinput,
      allVals.length > 0 ? Math.max(...allVals) : '-',
      allVals.length > 0 ? Math.min(...allVals) : '-',
      avg,
    ]);
  }

  const label = kelasFilter === 'all' ? 'semua-kelas' : `kelas-${kelasFilter}`;
  downloadCsv(`rekap-ketuntasan-${label}-${semesterAktif.toLowerCase()}.csv`, csvRows);
}
