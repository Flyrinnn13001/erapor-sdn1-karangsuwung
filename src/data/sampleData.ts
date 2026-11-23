import {
  AppDatabase,
  ExtracurricularActivity,
  GradeEntry,
  KelasNumber,
  Student,
  StudentExtracurricular,
  StudentReportMeta,
  Teacher,
} from '../types';
import {
  createEmptyPeriodData,
  DB_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_SUBJECTS,
} from './defaults';
import {
  calculateGrade,
  generateCompetencyDescription,
  getGradeKey,
  getPeriodKey,
} from '../utils/helpers';

export function createSampleDatabase(
  currentSettings = DEFAULT_SETTINGS
): AppDatabase {
  const teachers: Teacher[] = [
    {
      id: 'guru-kepsek',
      nama: 'H. Dedi Supriadi, S.Pd., M.Pd.',
      nip: '19700412 199403 1 006',
      jabatan: 'Kepala Sekolah',
    },
    {
      id: 'guru-wali-1',
      nama: 'Siti Aminah, S.Pd.SD',
      nip: '19830519 200902 2 004',
      jabatan: 'Wali Kelas 1',
    },
    {
      id: 'guru-wali-2',
      nama: 'Nani Suryani, S.Pd.',
      nip: '19851103 201001 2 011',
      jabatan: 'Wali Kelas 2',
    },
    {
      id: 'guru-wali-3',
      nama: 'Asep Saepudin, S.Pd.',
      nip: '19870822 201402 1 002',
      jabatan: 'Wali Kelas 3',
    },
    {
      id: 'guru-wali-4',
      nama: 'Yuni Kartika, S.Pd.',
      nip: '19890214 201503 2 007',
      jabatan: 'Wali Kelas 4',
    },
    {
      id: 'guru-wali-5',
      nama: 'Rudi Hartono, S.Pd.',
      nip: '19860710 201101 1 009',
      jabatan: 'Wali Kelas 5',
    },
    {
      id: 'guru-wali-6',
      nama: 'Dra. Tuti Alawiyah, S.Pd.',
      nip: '19751028 200501 2 005',
      jabatan: 'Wali Kelas 6',
    },
    {
      id: 'guru-pai',
      nama: 'Ustadz Ahmad Fauzi, S.Pd.I',
      nip: '19900315 201903 1 008',
      jabatan: 'Guru Mata Pelajaran',
    },
    {
      id: 'guru-pjok',
      nama: 'Bambang Pamungkas, S.Or.',
      nip: '19910904 202012 1 003',
      jabatan: 'Guru Mata Pelajaran',
    },
  ];

  const rawStudents: Array<{
    nama: string;
    jk: 'L' | 'P';
    kelas: KelasNumber;
    ortu: string;
  }> = [
    // Kelas 1 (Fase A)
    { nama: 'Aisyah Putri Ramadhani', jk: 'P', kelas: 1, ortu: 'Hendra Wijaya' },
    { nama: 'Arka Pratama Nugraha', jk: 'L', kelas: 1, ortu: 'Dadan Kurniawan' },
    { nama: 'Bilqis Zahra Azzahra', jk: 'P', kelas: 1, ortu: 'Suparman' },
    { nama: 'Fathan Alfarizi', jk: 'L', kelas: 1, ortu: 'Wahyu Hidayat' },
    // Kelas 2 (Fase A)
    { nama: 'Cinta Kirana Dewi', jk: 'P', kelas: 2, ortu: 'Agus Salim' },
    { nama: 'Daffa Maulana Malik', jk: 'L', kelas: 2, ortu: 'Taufik Rahman' },
    { nama: 'Kayla Anindya Putri', jk: 'P', kelas: 2, ortu: 'Iwan Setiawan' },
    { nama: 'Rafka Aditya Saputra', jk: 'L', kelas: 2, ortu: 'Eko Prasetyo' },
    // Kelas 3 (Fase B)
    { nama: 'Alifa Nabila Khairunnisa', jk: 'P', kelas: 3, ortu: 'Mulyana' },
    { nama: 'Bagas Permana Putra', jk: 'L', kelas: 3, ortu: 'Slamet Riyadi' },
    { nama: 'Nadia Safira Rahma', jk: 'P', kelas: 3, ortu: 'Suryana' },
    { nama: 'Rizky Ramadhan', jk: 'L', kelas: 3, ortu: 'Ujang Kosasih' },
    // Kelas 4 (Fase B)
    { nama: 'Azzam Firdaus Hakim', jk: 'L', kelas: 4, ortu: 'Lukman Hakim' },
    { nama: 'Keysha Aurelia Putri', jk: 'P', kelas: 4, ortu: 'Cecep Supriatna' },
    { nama: 'Muhammad Iqbal Pratama', jk: 'L', kelas: 4, ortu: 'Heri Susanto' },
    { nama: 'Salsa Bila Nurhaliza', jk: 'P', kelas: 4, ortu: 'Ade Suryadi' },
    { nama: 'Zidan Al-Ghifari', jk: 'L', kelas: 4, ortu: 'Yusuf Mansur' },
    // Kelas 5 (Fase C)
    { nama: 'Anisa Rahmawati', jk: 'P', kelas: 5, ortu: 'Karsono' },
    { nama: 'Fajar Sidik Maulana', jk: 'L', kelas: 5, ortu: 'Dedi Mulyadi' },
    { nama: 'Naila Putri Maharani', jk: 'P', kelas: 5, ortu: 'Suherman' },
    { nama: 'Rendra Kurnia Jaya', jk: 'L', kelas: 5, ortu: 'Nana Supriatna' },
    // Kelas 6 (Fase C)
    { nama: 'Dimas Aditya Pratama', jk: 'L', kelas: 6, ortu: 'Sugiarto' },
    { nama: 'Intan Permata Sari', jk: 'P', kelas: 6, ortu: 'Wawan Gunawan' },
    { nama: 'M. Rayhan Al-Faruq', jk: 'L', kelas: 6, ortu: 'Endang Sutisna' },
    { nama: 'Zahra Aulia Rahmadani', jk: 'P', kelas: 6, ortu: 'Rahmat Hidayat' },
  ];

  const students: Student[] = rawStudents.map((s, idx) => {
    const num = String(idx + 1).padStart(3, '0');
    const yearBase = 27 - s.kelas; // e.g. kelas 1 -> 26, kelas 6 -> 21
    return {
      id: `siswa-${idx + 1}`,
      nama: s.nama,
      nis: `${yearBase}27${num}`,
      nisn: `01${(9 - s.kelas) % 10}${String(4520100 + idx * 137)}`,
      jenisKelamin: s.jk,
      kelas: s.kelas,
      namaOrangTua: s.ortu,
      status: 'aktif',
    };
  });

  const activities: ExtracurricularActivity[] = [
    {
      id: 'ekskul-pramuka',
      nama: 'Pramuka',
      keteranganDefault:
        'Aktif mengikuti latihan kepramukaan, disiplin, dan mampu bekerja sama dalam regu.',
    },
    {
      id: 'ekskul-silat',
      nama: 'Pencak Silat',
      keteranganDefault:
        'Menunjukkan semangat tinggi dalam latihan jurus dasar dan menjunjung sportivitas.',
    },
    {
      id: 'ekskul-tari',
      nama: 'Tari Tradisional',
      keteranganDefault:
        'Kreatif dan percaya diri dalam menampilkan gerak tari daerah Jawa Barat.',
    },
    {
      id: 'ekskul-btq',
      nama: 'Baca Tulis Al-Qur’an (BTQ)',
      keteranganDefault:
        'Rajin berlatih membaca dan menulis huruf hijaiyah dengan tajwid yang baik.',
    },
  ];

  const subjects = DEFAULT_SUBJECTS.map((s) => ({
    ...s,
    kelasAktif: [...s.kelasAktif],
  }));

  const settings = {
    ...DEFAULT_SETTINGS,
    ...currentSettings,
    namaSekolah: 'SDN 1 Karangsuwung',
    npsn: '20214829',
    alamatSekolah:
      'Jl. Raya Karangsuwung No. 15, Kec. Karangsembung, Kab. Cirebon, Jawa Barat 45186',
    namaKepalaSekolah: teachers[0].nama,
    nipKepalaSekolah: teachers[0].nip,
    tempatRapor: 'Karangsuwung',
    bobot: { ...DEFAULT_SETTINGS.bobot },
    daftarTahunAjaran: [...DEFAULT_SETTINGS.daftarTahunAjaran],
  };

  const seeded = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };

  const catatanTemplates = [
    'Ananda menunjukkan perkembangan belajar yang sangat baik dan antusias di kelas. Pertahankan semangat belajar serta sikap sopan santun terhadap guru dan teman.',
    'Ananda tekun, rajin menyelesaikan tugas tepat waktu, dan mudah bekerja sama dalam kegiatan kelompok. Terus tingkatkan kepercayaan diri saat bertanya di kelas.',
    'Perkembangan belajar Ananda cukup baik. Diharapkan orang tua dapat terus mendampingi kegiatan membaca dan berlatih soal secara rutin di rumah.',
    'Ananda aktif berpartisipasi dalam pembelajaran dan memiliki rasa ingin tahu yang tinggi. Tingkatkan ketelitian dalam mengerjakan latihan soal.',
  ];

  const buildPeriod = (semester: 'Ganjil' | 'Genap', scoreBonus: number) => {
    const period = createEmptyPeriodData();
    const semSeedOffset = semester === 'Genap' ? 500 : 0;

    students.forEach((student, sIdx) => {
      const baseAbility =
        (sIdx % 7 === 5 ? 65 : sIdx % 5 === 0 ? 88 : 76 + (sIdx % 4) * 3) +
        scoreBonus;

      subjects.forEach((subj, mIdx) => {
        // Intentionally leave 2 students in Kelas 5 incomplete in Matematika & IPAS
        // so the Dashboard incomplete-grade alert immediately demonstrates its functionality!
        const isIntentionalGap =
          student.kelas === 5 &&
          sIdx >= 19 &&
          (subj.id === 'mapel-mtk' || subj.id === 'mapel-ipas');

        const jitter = (offset: number) =>
          Math.round(
            (seeded(sIdx * 31 + mIdx * 17 + offset + semSeedOffset) - 0.45) * 14
          );

        const clamp = (n: number) => Math.max(55, Math.min(98, n));

        const formatif = clamp(baseAbility + jitter(1));
        const sumatif = clamp(baseAbility + jitter(2));
        const sts = isIntentionalGap ? null : clamp(baseAbility + jitter(3));
        const sas = isIntentionalGap ? null : clamp(baseAbility + jitter(4));

        const entry: GradeEntry = {
          studentId: student.id,
          subjectId: subj.id,
          formatif,
          sumatif,
          sts,
          sas,
          capaianTertinggi: '',
          perluDitingkatkan: '',
        };

        const calc = calculateGrade(
          entry,
          settings.bobot,
          settings.kktpDefault
        );
        if (!isIntentionalGap) {
          const desc = generateCompetencyDescription(
            subj.nama,
            calc.nilaiAkhir,
            settings.kktpDefault
          );
          entry.capaianTertinggi = desc.capaianTertinggi;
          entry.perluDitingkatkan = desc.perluDitingkatkan;
        }

        period.grades[getGradeKey(student.id, subj.id)] = entry;
      });

      const meta: StudentReportMeta = {
        studentId: student.id,
        sakit: sIdx % 4 === 0 ? 1 : sIdx % 7 === 0 ? 2 : 0,
        izin: sIdx % 5 === 0 ? 1 : 0,
        tanpaKeterangan: sIdx % 9 === 0 ? 1 : 0,
        catatanWaliKelas: catatanTemplates[sIdx % catatanTemplates.length],
        keputusanKenaikan:
          semester === 'Genap'
            ? student.kelas === 6
              ? 'lulus'
              : 'naik'
            : '',
      };
      period.reportMeta[student.id] = meta;

      const pramukaPred = sIdx % 3 === 0 ? 'Sangat Baik' : 'Baik';
      const ekskul1: StudentExtracurricular = {
        id: `sek-${semester}-${student.id}-1`,
        studentId: student.id,
        activityId: 'ekskul-pramuka',
        predikat: pramukaPred,
        deskripsi:
          pramukaPred === 'Sangat Baik'
            ? 'Sangat aktif, disiplin, dan mampu memimpin regu dengan penuh tanggung jawab dalam kegiatan Pramuka.'
            : 'Aktif mengikuti latihan kepramukaan rutin dan mampu bekerja sama dengan baik dalam kelompok.',
      };
      period.extracurriculars.push(ekskul1);

      if (sIdx % 2 === 0) {
        const secondAct =
          student.jenisKelamin === 'P' ? activities[2] : activities[1];
        const ekskul2: StudentExtracurricular = {
          id: `sek-${semester}-${student.id}-2`,
          studentId: student.id,
          activityId: secondAct.id,
          predikat: sIdx % 4 === 0 ? 'Sangat Baik' : 'Baik',
          deskripsi:
            secondAct.keteranganDefault ||
            'Mengikuti kegiatan ekstrakurikuler dengan antusias dan tekun.',
        };
        period.extracurriculars.push(ekskul2);
      }
    });

    return period;
  };

  const ganjilKey = getPeriodKey(settings.tahunAjaranAktif, 'Ganjil');
  const genapKey = getPeriodKey(settings.tahunAjaranAktif, 'Genap');

  return {
    version: DB_VERSION,
    isSampleData: true,
    settings,
    students,
    teachers,
    subjects,
    activities,
    periods: {
      [ganjilKey]: buildPeriod('Ganjil', 0),
      [genapKey]: buildPeriod('Genap', 2),
    },
  };
}
