import React from 'react';
import { AppDatabase, Student } from '../../types';
import { KELAS_ROMAWI } from '../../data/defaults';
import {
  calculateGrade,
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
} from '../../utils/helpers';

interface RaporDocumentProps {
  db: AppDatabase;
  student: Student;
  pageBreakAfter?: boolean;
}

export const RaporDocument: React.FC<RaporDocumentProps> = ({
  db,
  student,
  pageBreakAfter = false,
}) => {
  const period = getActivePeriodData(db);
  const subjects = getSubjectsForKelas(db.subjects, student.kelas);
  const meta =
    period.reportMeta[student.id] || getDefaultReportMeta(student.id);
  const ekskulList = period.extracurriculars.filter(
    (e) => e.studentId === student.id
  );
  const wali = getWaliKelas(db.teachers, student.kelas);
  const kepsek = getKepalaSekolah(db);
  const fase = getFase(student.kelas);
  const semesterText =
    db.settings.semesterAktif === 'Ganjil' ? '1 (Ganjil)' : '2 (Genap)';

  return (
    <article
      className={`rapor-sheet bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-8 md:p-10 mx-auto max-w-[210mm] text-[12px] leading-relaxed ${
        pageBreakAfter ? 'rapor-page-break' : ''
      }`}
    >
      {/* Kop Sekolah */}
      <header className="text-center pb-3 mb-4 border-b-[3px] border-double border-sky-800">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-500">
          Laporan Hasil Belajar Peserta Didik — Kurikulum Merdeka
        </p>
        <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-sky-950 mt-0.5">
          {db.settings.namaSekolah}
        </h1>
        <p className="text-[11px] text-slate-600 mt-0.5">
          {db.settings.alamatSekolah || 'Alamat sekolah belum diisi (atur di menu Pengaturan)'}
          {db.settings.npsn ? ` • NPSN: ${db.settings.npsn}` : ''}
        </p>
      </header>

      <h2 className="text-center font-extrabold text-sm tracking-wide uppercase text-slate-900 mb-4">
        LAPORAN HASIL BELAJAR (RAPOR)
      </h2>

      {/* Identitas Peserta Didik */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-5 text-[12px]">
        <div className="space-y-1">
          <div className="grid grid-cols-[120px_10px_1fr]">
            <span className="text-slate-600">Nama Peserta Didik</span>
            <span>:</span>
            <span className="font-bold text-slate-900">{student.nama}</span>
          </div>
          <div className="grid grid-cols-[120px_10px_1fr]">
            <span className="text-slate-600">NIS / NISN</span>
            <span>:</span>
            <span className="font-medium">
              {student.nis || '-'} / {student.nisn || '-'}
            </span>
          </div>
          <div className="grid grid-cols-[120px_10px_1fr]">
            <span className="text-slate-600">Nama Sekolah</span>
            <span>:</span>
            <span>{db.settings.namaSekolah}</span>
          </div>
          <div className="grid grid-cols-[120px_10px_1fr]">
            <span className="text-slate-600">Alamat Sekolah</span>
            <span>:</span>
            <span>{db.settings.alamatSekolah || '-'}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[110px_10px_1fr]">
            <span className="text-slate-600">Kelas</span>
            <span>:</span>
            <span className="font-bold">
              {KELAS_ROMAWI[student.kelas]} (Kelas {student.kelas})
            </span>
          </div>
          <div className="grid grid-cols-[110px_10px_1fr]">
            <span className="text-slate-600">Fase</span>
            <span>:</span>
            <span className="font-bold">Fase {fase}</span>
          </div>
          <div className="grid grid-cols-[110px_10px_1fr]">
            <span className="text-slate-600">Semester</span>
            <span>:</span>
            <span className="font-medium">{semesterText}</span>
          </div>
          <div className="grid grid-cols-[110px_10px_1fr]">
            <span className="text-slate-600">Tahun Pelajaran</span>
            <span>:</span>
            <span className="font-medium">{db.settings.tahunAjaranAktif}</span>
          </div>
        </div>
      </section>

      {/* A. Nilai dan Capaian Kompetensi */}
      <section className="mb-5">
        <h3 className="font-bold text-[12.5px] text-sky-950 mb-1.5">
          A. Nilai dan Capaian Kompetensi
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400 text-[11.5px]">
            <thead>
              <tr className="bg-sky-100/90 text-sky-950">
                <th className="border border-slate-400 px-2 py-2 w-9 text-center font-bold">
                  No
                </th>
                <th className="border border-slate-400 px-2.5 py-2 w-[28%] text-left font-bold">
                  Muatan Pelajaran
                </th>
                <th className="border border-slate-400 px-2 py-2 w-16 text-center font-bold">
                  Nilai Akhir
                </th>
                <th className="border border-slate-400 px-2.5 py-2 text-left font-bold">
                  Capaian Kompetensi
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subj, idx) => {
                const entry = period.grades[getGradeKey(student.id, subj.id)];
                const kktp = getSubjectKktp(subj, db.settings.kktpDefault);
                const calc = calculateGrade(entry, db.settings.bobot, kktp);

                return (
                  <tr key={subj.id} className="align-top">
                    <td className="border border-slate-400 px-2 py-2 text-center">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-2 font-medium">
                      {subj.nama}
                    </td>
                    <td className="border border-slate-400 px-2 py-2 text-center font-bold tabular-nums text-[12.5px]">
                      {calc.nilaiAkhir !== null ? calc.nilaiAkhir : '-'}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-2">
                      {entry?.capaianTertinggi || entry?.perluDitingkatkan ? (
                        <div className="space-y-1.5">
                          {entry.capaianTertinggi && (
                            <p>{entry.capaianTertinggi}</p>
                          )}
                          {entry.perluDitingkatkan && (
                            <p className="pt-1 border-t border-dashed border-slate-200">
                              {entry.perluDitingkatkan}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* B. Ekstrakurikuler */}
      <section className="mb-5 avoid-break">
        <h3 className="font-bold text-[12.5px] text-sky-950 mb-1.5">
          B. Ekstrakurikuler
        </h3>
        <table className="w-full border-collapse border border-slate-400 text-[11.5px]">
          <thead>
            <tr className="bg-sky-100/90 text-sky-950">
              <th className="border border-slate-400 px-2 py-1.5 w-9 text-center font-bold">
                No
              </th>
              <th className="border border-slate-400 px-2.5 py-1.5 w-[28%] text-left font-bold">
                Kegiatan Ekstrakurikuler
              </th>
              <th className="border border-slate-400 px-2 py-1.5 w-24 text-center font-bold">
                Predikat
              </th>
              <th className="border border-slate-400 px-2.5 py-1.5 text-left font-bold">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody>
            {ekskulList.length > 0 ? (
              ekskulList.map((e, idx) => {
                const act = db.activities.find((a) => a.id === e.activityId);
                return (
                  <tr key={e.id} className="align-top">
                    <td className="border border-slate-400 px-2 py-1.5 text-center">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5 font-medium">
                      {act?.nama || 'Kegiatan Ekstrakurikuler'}
                    </td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-semibold">
                      {e.predikat}
                    </td>
                    <td className="border border-slate-400 px-2.5 py-1.5">
                      {e.deskripsi || '-'}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="border border-slate-400 px-2 py-2 text-center">
                  1
                </td>
                <td className="border border-slate-400 px-2.5 py-2">-</td>
                <td className="border border-slate-400 px-2 py-2 text-center">
                  -
                </td>
                <td className="border border-slate-400 px-2.5 py-2 text-slate-500">
                  Belum mengikuti kegiatan ekstrakurikuler pada semester ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* C. Ketidakhadiran & D. Catatan Wali Kelas */}
      <section className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-5 avoid-break">
        <div className="sm:col-span-5">
          <h3 className="font-bold text-[12.5px] text-sky-950 mb-1.5">
            C. Ketidakhadiran
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-[11.5px]">
            <tbody>
              <tr>
                <td className="border border-slate-400 px-2.5 py-1.5">Sakit</td>
                <td className="border border-slate-400 px-2.5 py-1.5 text-center font-semibold w-24">
                  {meta.sakit} hari
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2.5 py-1.5">Izin</td>
                <td className="border border-slate-400 px-2.5 py-1.5 text-center font-semibold">
                  {meta.izin} hari
                </td>
              </tr>
              <tr>
                <td className="border border-slate-400 px-2.5 py-1.5">
                  Tanpa Keterangan
                </td>
                <td className="border border-slate-400 px-2.5 py-1.5 text-center font-semibold">
                  {meta.tanpaKeterangan} hari
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="sm:col-span-7 flex flex-col">
          <h3 className="font-bold text-[12.5px] text-sky-950 mb-1.5">
            D. Catatan Wali Kelas
          </h3>
          <div className="border border-slate-400 p-2.5 text-[11.5px] flex-1 min-h-[82px]">
            {meta.catatanWaliKelas?.trim() ||
              'Terus tingkatkan semangat belajar, kedisiplinan, dan akhlak mulia baik di sekolah maupun di rumah.'}
          </div>
        </div>
      </section>

      {/* E. Keputusan Kenaikan Kelas (Khusus Semester Genap) */}
      {db.settings.semesterAktif === 'Genap' && (
        <section className="mb-6 avoid-break">
          <h3 className="font-bold text-[12.5px] text-sky-950 mb-1.5">
            E. Keputusan Kenaikan Kelas / Kelulusan
          </h3>
          <div className="border border-sky-400 bg-sky-50/60 p-3 text-[11.5px]">
            <p className="text-slate-700">
              Berdasarkan pencapaian seluruh kompetensi pada Semester Ganjil dan
              Genap, peserta didik dinyatakan:
            </p>
            <p className="font-extrabold text-[13px] text-sky-950 uppercase mt-1">
              {meta.keputusanKenaikan
                ? getKeputusanLabel(meta.keputusanKenaikan, student.kelas)
                : student.kelas < 6
                ? `Naik ke Kelas ${student.kelas + 1} / Tinggal di Kelas ${student.kelas} *)`
                : 'Lulus / Belum Lulus *)'}
            </p>
          </div>
        </section>
      )}

      {/* Tanda Tangan */}
      <section className="mt-7 pt-2 avoid-break text-[11.5px]">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <p>Mengetahui,</p>
            <p>Orang Tua / Wali,</p>
            <div className="h-16" />
            <p className="font-bold underline decoration-slate-400 underline-offset-4">
              {student.namaOrangTua || '........................................'}
            </p>
          </div>

          <div className="text-center">
            <p>
              {db.settings.tempatRapor || 'Karangsuwung'},{' '}
              {formatTanggalIndo(db.settings.tanggalRapor)}
            </p>
            <p>Wali Kelas {KELAS_ROMAWI[student.kelas]},</p>
            <div className="h-16" />
            <p className="font-bold underline decoration-slate-500 underline-offset-4">
              {wali?.nama || '........................................'}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              NIP. {wali?.nip || '-'}
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p>Mengetahui,</p>
          <p>Kepala {db.settings.namaSekolah},</p>
          <div className="h-16" />
          <p className="font-bold underline decoration-slate-500 underline-offset-4">
            {kepsek.nama || '........................................'}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            NIP. {kepsek.nip || '-'}
          </p>
        </div>
      </section>
    </article>
  );
};
