import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppDatabase, KelasNumber, Student } from '../types';
import { KELAS_ROMAWI } from '../data/defaults';
import {
  buildLegerData,
  calculateGrade,
  formatDecimalId,
  formatTanggalIndo,
  getActivePeriodData,
  getDefaultReportMeta,
  getFase,
  getGradeKey,
  getKepalaSekolah,
  getKeputusanLabel,
  getSubjectKktp,
  getSubjectsForKelas,
  getWaliKelas,
} from './helpers';

function getLastY(doc: jsPDF, fallback = 40): number {
  const anyDoc = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return anyDoc.lastAutoTable?.finalY ?? fallback;
}

function drawSchoolHeader(
  doc: jsPDF,
  db: AppDatabase,
  subtitle: string
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(12, 74, 110); // sky-900
  doc.text(db.settings.namaSekolah.toUpperCase(), centerX, 14, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const alamatLine = [
    db.settings.alamatSekolah || 'Alamat sekolah belum diatur',
    db.settings.npsn ? `NPSN: ${db.settings.npsn}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');
  doc.text(alamatLine, centerX, 19.5, { align: 'center' });

  // Double divider line
  doc.setDrawColor(2, 132, 199);
  doc.setLineWidth(0.7);
  doc.line(14, 22.5, pageWidth - 14, 22.5);
  doc.setLineWidth(0.25);
  doc.line(14, 23.6, pageWidth - 14, 23.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(subtitle, centerX, 30, { align: 'center' });

  return 34;
}

export function exportLegerPdf(db: AppDatabase, kelas: KelasNumber): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const { subjects, rows, subjectStats } = buildLegerData(db, kelas);
  const wali = getWaliKelas(db.teachers, kelas);
  const kepsek = getKepalaSekolah(db);

  let y = drawSchoolHeader(
    doc,
    db,
    `LEGER NILAI PESERTA DIDIK — KELAS ${KELAS_ROMAWI[kelas]} (FASE ${getFase(kelas)})`
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Tahun Ajaran: ${db.settings.tahunAjaranAktif}   |   Semester: ${db.settings.semesterAktif}   |   Wali Kelas: ${wali?.nama || '-'}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: 'center' }
  );
  y += 5;

  const head = [
    [
      'No',
      'NIS',
      'Nama Peserta Didik',
      'L/P',
      ...subjects.map((s) => s.kode),
      'Jml',
      'Rata²',
      'Rank',
      'S',
      'I',
      'A',
    ],
  ];

  const body = rows.map((row, idx) => [
    String(idx + 1),
    row.student.nis || '-',
    row.student.nama,
    row.student.jenisKelamin,
    ...subjects.map((s) => {
      const val = row.scores[s.id]?.nilaiAkhir;
      return val !== null && val !== undefined ? String(val) : '-';
    }),
    row.jumlahMapelDinilai > 0 ? String(row.jumlahNilai) : '-',
    row.rataRata !== null ? formatDecimalId(row.rataRata, 1) : '-',
    row.ranking !== null ? String(row.ranking) : '-',
    String(row.meta.sakit),
    String(row.meta.izin),
    String(row.meta.tanpaKeterangan),
  ]);

  const foot = [
    [
      '',
      '',
      'Rata-Rata Mapel',
      '',
      ...subjects.map((s) =>
        subjectStats[s.id]?.rataRata !== null
          ? formatDecimalId(subjectStats[s.id].rataRata, 1)
          : '-'
      ),
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      '',
      '',
      'Nilai Tertinggi / Terendah',
      '',
      ...subjects.map((s) => {
        const st = subjectStats[s.id];
        return st?.tertinggi !== null ? `${st.tertinggi}/${st.terendah}` : '-';
      }),
      '',
      '',
      '',
      '',
      '',
      '',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head,
    body,
    foot,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      halign: 'center',
      valign: 'middle',
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [240, 249, 255],
      textColor: [12, 74, 110],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 16 },
      2: { halign: 'left', cellWidth: 44 },
      3: { cellWidth: 8 },
    },
    didParseCell(data) {
      if (data.section === 'body') {
        const mapelIdx = data.column.index - 4;
        if (mapelIdx >= 0 && mapelIdx < subjects.length) {
          const row = rows[data.row.index];
          const subj = subjects[mapelIdx];
          const calc = row?.scores[subj.id];
          if (calc && calc.tuntas === false) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 242, 242];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });

  // Legend of subject codes
  let sigY = getLastY(doc, 140) + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const legend =
    'Keterangan Mapel: ' +
    subjects.map((s) => `${s.kode} = ${s.nama}`).join(', ');
  const splitLegend = doc.splitTextToSize(legend, 268);
  doc.text(splitLegend, 14, sigY);
  sigY += splitLegend.length * 3.5 + 6;

  if (sigY > 175) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const pageWidth = doc.internal.pageSize.getWidth();
  const tempatTanggal = `${db.settings.tempatRapor || 'Karangsuwung'}, ${formatTanggalIndo(db.settings.tanggalRapor)}`;

  doc.text('Mengetahui,', 30, sigY);
  doc.text('Kepala Sekolah,', 30, sigY + 4.5);
  doc.text(tempatTanggal, pageWidth - 85, sigY);
  doc.text(`Wali Kelas ${KELAS_ROMAWI[kelas]},`, pageWidth - 85, sigY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(kepsek.nama || '........................................', 30, sigY + 23);
  doc.text(wali?.nama || '........................................', pageWidth - 85, sigY + 23);

  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${kepsek.nip || '-'}`, 30, sigY + 27.5);
  doc.text(`NIP. ${wali?.nip || '-'}`, pageWidth - 85, sigY + 27.5);

  const safeTa = db.settings.tahunAjaranAktif.replace(/\//g, '-');
  doc.save(`Leger-Kelas-${kelas}-${db.settings.semesterAktif}-${safeTa}.pdf`);
}

export function exportRekapSiswaPdf(db: AppDatabase, student: Student): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const period = getActivePeriodData(db);
  const subjects = getSubjectsForKelas(db.subjects, student.kelas);

  let y = drawSchoolHeader(doc, db, 'REKAP NILAI PESERTA DIDIK');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Nama Peserta Didik : ${student.nama}`, 14, y);
  doc.text(`Kelas / Fase : Kelas ${student.kelas} (Fase ${getFase(student.kelas)})`, 125, y);
  y += 5;
  doc.text(`NIS / NISN : ${student.nis || '-'} / ${student.nisn || '-'}`, 14, y);
  doc.text(
    `Semester / TA : ${db.settings.semesterAktif} / ${db.settings.tahunAjaranAktif}`,
    125,
    y
  );
  y += 6;

  const body = subjects.map((subj, idx) => {
    const entry = period.grades[getGradeKey(student.id, subj.id)];
    const kktp = getSubjectKktp(subj, db.settings.kktpDefault);
    const calc = calculateGrade(entry, db.settings.bobot, kktp);

    return [
      String(idx + 1),
      subj.nama,
      entry?.formatif !== null && entry?.formatif !== undefined ? String(entry.formatif) : '-',
      entry?.sumatif !== null && entry?.sumatif !== undefined ? String(entry.sumatif) : '-',
      entry?.sts !== null && entry?.sts !== undefined ? String(entry.sts) : '-',
      entry?.sas !== null && entry?.sas !== undefined ? String(entry.sas) : '-',
      calc.nilaiAkhir !== null ? String(calc.nilaiAkhir) : '-',
      String(kktp),
      calc.tuntas === null ? 'Belum' : calc.tuntas ? 'Tuntas' : 'Belum Tuntas',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        'No',
        'Mata Pelajaran',
        'Fmt',
        'Smt',
        'STS',
        'SAS',
        'Akhir',
        'KKTP',
        'Status',
      ],
    ],
    body,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      halign: 'center',
      valign: 'middle',
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { halign: 'left', cellWidth: 62 },
      8: { cellWidth: 26 },
    },
  });

  const safeName = student.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  doc.save(`Rekap-Siswa-${safeName}-Kelas-${student.kelas}.pdf`);
}

export function exportKetuntasanPdf(
  db: AppDatabase,
  kelasFilter: KelasNumber | 'all'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const titleScope =
    kelasFilter === 'all'
      ? 'SEMUA KELAS (1–6)'
      : `KELAS ${KELAS_ROMAWI[kelasFilter]} (FASE ${getFase(kelasFilter)})`;

  let y = drawSchoolHeader(
    doc,
    db,
    `REKAP KETUNTASAN PER MATA PELAJARAN — ${titleScope}`
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Tahun Ajaran: ${db.settings.tahunAjaranAktif}   |   Semester: ${db.settings.semesterAktif}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: 'center' }
  );
  y += 6;

  const kelasList: KelasNumber[] =
    kelasFilter === 'all' ? [1, 2, 3, 4, 5, 6] : [kelasFilter];
  const sortedSubjects = [...db.subjects].sort((a, b) => a.urutan - b.urutan);

  const body: string[][] = [];
  let no = 1;

  for (const subj of sortedSubjects) {
    const relevantKelas = kelasList.filter(
      (k) => !subj.kelasAktif || subj.kelasAktif.includes(k)
    );
    if (relevantKelas.length === 0) continue;

    let total = 0;
    let tuntas = 0;
    let belumTuntas = 0;
    let kosong = 0;
    const vals: number[] = [];

    for (const k of relevantKelas) {
      const { rows } = buildLegerData(db, k);
      for (const r of rows) {
        total++;
        const calc = r.scores[subj.id];
        if (calc && calc.nilaiAkhir !== null) {
          vals.push(calc.nilaiAkhir);
          if (calc.tuntas) tuntas++;
          else belumTuntas++;
        } else {
          kosong++;
        }
      }
    }

    const dinilai = tuntas + belumTuntas;
    const pct = dinilai > 0 ? `${((tuntas / dinilai) * 100).toFixed(0)}%` : '-';
    const avg =
      vals.length > 0
        ? formatDecimalId(vals.reduce((a, b) => a + b, 0) / vals.length, 1)
        : '-';

    body.push([
      String(no++),
      subj.nama,
      String(getSubjectKktp(subj, db.settings.kktpDefault)),
      String(total),
      String(tuntas),
      pct,
      String(belumTuntas),
      String(kosong),
      avg,
    ]);
  }

  autoTable(doc, {
    startY: y,
    head: [
      [
        'No',
        'Mata Pelajaran',
        'KKTP',
        'Siswa',
        'Tuntas',
        '% Tuntas',
        'Belum Tuntas',
        'Kosong',
        'Rata²',
      ],
    ],
    body,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.3,
      halign: 'center',
      valign: 'middle',
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { halign: 'left', cellWidth: 62 },
    },
  });

  const label = kelasFilter === 'all' ? 'Semua-Kelas' : `Kelas-${kelasFilter}`;
  doc.save(`Rekap-Ketuntasan-${label}-${db.settings.semesterAktif}.pdf`);
}

function renderSingleRaporToDoc(
  doc: jsPDF,
  db: AppDatabase,
  student: Student,
  isFirstPage: boolean
): void {
  if (!isFirstPage) {
    doc.addPage();
  }

  const period = getActivePeriodData(db);
  const subjects = getSubjectsForKelas(db.subjects, student.kelas);
  const meta =
    period.reportMeta[student.id] || getDefaultReportMeta(student.id);
  const ekskulList = period.extracurriculars.filter(
    (e) => e.studentId === student.id
  );
  const wali = getWaliKelas(db.teachers, student.kelas);
  const kepsek = getKepalaSekolah(db);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Kop & Judul
  let y = drawSchoolHeader(doc, db, 'LAPORAN HASIL BELAJAR (RAPOR)');

  // Identitas Peserta Didik (2 kolom)
  doc.setFontSize(8.8);
  const leftLabelX = margin;
  const leftColonX = margin + 35;
  const leftValX = margin + 38;

  const rightLabelX = 122;
  const rightColonX = 152;
  const rightValX = 155;

  const idRows: [string, string, string, string][] = [
    ['Nama Peserta Didik', student.nama, 'Kelas', `${KELAS_ROMAWI[student.kelas]} (Kelas ${student.kelas})`],
    ['NIS / NISN', `${student.nis || '-'} / ${student.nisn || '-'}`, 'Fase', `Fase ${getFase(student.kelas)}`],
    [
      'Nama Sekolah',
      db.settings.namaSekolah,
      'Semester',
      db.settings.semesterAktif === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)',
    ],
    [
      'Alamat Sekolah',
      db.settings.alamatSekolah || '-',
      'Tahun Pelajaran',
      db.settings.tahunAjaranAktif,
    ],
  ];

  idRows.forEach(([lLabel, lVal, rLabel, rVal]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(lLabel, leftLabelX, y);
    doc.text(':', leftColonX, y);
    doc.text(rLabel, rightLabelX, y);
    doc.text(':', rightColonX, y);

    doc.setFont('helvetica', lLabel === 'Nama Peserta Didik' ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    const wrappedLeft = doc.splitTextToSize(lVal, 78);
    doc.text(wrappedLeft, leftValX, y);
    doc.text(rVal, rightValX, y);

    y += Math.max(5.2, wrappedLeft.length * 4.2 + 1);
  });

  y += 2;

  // A. Nilai Intrakurikuler
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(12, 74, 110);
  doc.text('A. Nilai dan Capaian Kompetensi', margin, y);
  y += 2.5;

  const gradeRows = subjects.map((subj, idx) => {
    const entry = period.grades[getGradeKey(student.id, subj.id)];
    const kktp = getSubjectKktp(subj, db.settings.kktpDefault);
    const calc = calculateGrade(entry, db.settings.bobot, kktp);

    const descParts: string[] = [];
    if (entry?.capaianTertinggi?.trim()) {
      descParts.push(entry.capaianTertinggi.trim());
    }
    if (entry?.perluDitingkatkan?.trim()) {
      descParts.push(entry.perluDitingkatkan.trim());
    }
    const descText = descParts.length > 0 ? descParts.join('\n\n') : '-';

    return [
      String(idx + 1),
      subj.nama,
      calc.nilaiAkhir !== null ? String(calc.nilaiAkhir) : '-',
      descText,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No', 'Muatan Pelajaran', 'Nilai Akhir', 'Capaian Kompetensi']],
    body: gradeRows,
    theme: 'grid',
    styles: {
      fontSize: 8.2,
      cellPadding: 2.3,
      valign: 'top',
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [224, 242, 254],
      textColor: [12, 74, 110],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 44, halign: 'left' },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 'auto', halign: 'left' },
    },
  });

  y = getLastY(doc, y + 40) + 6;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  // B. Ekstrakurikuler
  ensureSpace(26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(12, 74, 110);
  doc.text('B. Ekstrakurikuler', margin, y);
  y += 2.5;

  const ekskulRows =
    ekskulList.length > 0
      ? ekskulList.map((e, idx) => {
          const act = db.activities.find((a) => a.id === e.activityId);
          return [
            String(idx + 1),
            act?.nama || 'Kegiatan Ekstrakurikuler',
            e.predikat,
            e.deskripsi || '-',
          ];
        })
      : [['1', '-', '-', 'Belum mengikuti kegiatan ekstrakurikuler pada semester ini.']];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No', 'Kegiatan Ekstrakurikuler', 'Predikat', 'Keterangan']],
    body: ekskulRows,
    theme: 'grid',
    styles: {
      fontSize: 8.2,
      cellPadding: 2.2,
      valign: 'top',
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [224, 242, 254],
      textColor: [12, 74, 110],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 44 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 'auto' },
    },
  });

  y = getLastY(doc, y + 20) + 6;

  // C. Ketidakhadiran & D. Catatan Wali Kelas
  ensureSpace(34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(12, 74, 110);
  doc.text('C. Ketidakhadiran', margin, y);
  doc.text('D. Catatan Wali Kelas', margin + 74, y);
  y += 2.5;

  const tableStartY = y;
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: pageWidth - margin - 68 },
    body: [
      ['Sakit', `${meta.sakit} hari`],
      ['Izin', `${meta.izin} hari`],
      ['Tanpa Keterangan', `${meta.tanpaKeterangan} hari`],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8.2,
      cellPadding: 2.2,
      textColor: [15, 23, 42],
      lineColor: [148, 163, 184],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 26, halign: 'center' },
    },
  });

  const absenEndY = getLastY(doc, tableStartY + 22);

  // Draw Catatan Wali Kelas box beside Ketidakhadiran
  const catatanX = margin + 74;
  const catatanW = pageWidth - margin - catatanX;
  const catatanText =
    meta.catatanWaliKelas?.trim() ||
    'Terus tingkatkan semangat belajar, kedisiplinan, dan akhlak mulia baik di sekolah maupun di rumah.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const catatanLines = doc.splitTextToSize(catatanText, catatanW - 5);
  const catatanH = Math.max(absenEndY - tableStartY, catatanLines.length * 4.2 + 5);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.rect(catatanX, tableStartY, catatanW, catatanH);
  doc.setTextColor(15, 23, 42);
  doc.text(catatanLines, catatanX + 2.5, tableStartY + 4.8);

  y = Math.max(absenEndY, tableStartY + catatanH) + 6;

  // E. Keputusan Kenaikan Kelas (Khusus Semester Genap)
  if (db.settings.semesterAktif === 'Genap') {
    ensureSpace(22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(12, 74, 110);
    doc.text('E. Keputusan Kenaikan Kelas / Kelulusan', margin, y);
    y += 2.5;

    const keputusanBoxH = 15;
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(125, 211, 252);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, pageWidth - margin * 2, keputusanBoxH, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(30, 41, 59);
    doc.text(
      'Berdasarkan pencapaian seluruh kompetensi pada Semester Ganjil dan Genap, peserta didik dinyatakan:',
      margin + 3,
      y + 5.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(12, 74, 110);
    const labelKeputusan = meta.keputusanKenaikan
      ? getKeputusanLabel(meta.keputusanKenaikan, student.kelas).toUpperCase()
      : student.kelas < 6
      ? `NAIK KE KELAS ${student.kelas + 1} / TINGGAL DI KELAS ${student.kelas} *)`
      : 'LULUS / BELUM LULUS *)';
    doc.text(labelKeputusan, margin + 3, y + 11.5);

    y += keputusanBoxH + 6;
  }

  // Tanda Tangan
  ensureSpace(58);
  const tempatTanggal = `${db.settings.tempatRapor || 'Karangsuwung'}, ${formatTanggalIndo(db.settings.tanggalRapor)}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);

  // Left: Orang Tua / Wali
  doc.text('Mengetahui,', margin + 8, y + 4);
  doc.text('Orang Tua / Wali,', margin + 8, y + 8.5);
  doc.text(
    student.namaOrangTua ? `( ${student.namaOrangTua} )` : '( ........................................ )',
    margin + 8,
    y + 27
  );

  // Right: Wali Kelas
  const rightSigX = pageWidth - margin - 64;
  doc.text(tempatTanggal, rightSigX, y + 4);
  doc.text(`Wali Kelas ${KELAS_ROMAWI[student.kelas]},`, rightSigX, y + 8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(wali?.nama || '........................................', rightSigX, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${wali?.nip || '-'}`, rightSigX, y + 31.5);

  // Center bottom: Kepala Sekolah
  const kepsekY = y + 38;
  doc.text('Mengetahui,', pageWidth / 2, kepsekY, { align: 'center' });
  doc.text(`Kepala ${db.settings.namaSekolah},`, pageWidth / 2, kepsekY + 4.5, {
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.text(
    kepsek.nama || '........................................',
    pageWidth / 2,
    kepsekY + 21,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${kepsek.nip || '-'}`, pageWidth / 2, kepsekY + 25.5, {
    align: 'center',
  });
}

export function exportRaporPdf(db: AppDatabase, student: Student): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  renderSingleRaporToDoc(doc, db, student, true);
  const safeName = student.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const safeTa = db.settings.tahunAjaranAktif.replace(/\//g, '-');
  doc.save(
    `Rapor-${safeName}-Kelas-${student.kelas}-${db.settings.semesterAktif}-${safeTa}.pdf`
  );
}

export function exportRaporMassalPdf(
  db: AppDatabase,
  kelas: KelasNumber,
  students: Student[]
): void {
  if (students.length === 0) return;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  students.forEach((student, idx) => {
    renderSingleRaporToDoc(doc, db, student, idx === 0);
  });
  const safeTa = db.settings.tahunAjaranAktif.replace(/\//g, '-');
  doc.save(
    `Rapor-Massal-Kelas-${kelas}-${db.settings.semesterAktif}-${safeTa}.pdf`
  );
}
