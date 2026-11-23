# E-Rapor SDN 1 Karangsuwung — Kurikulum Merdeka

Aplikasi web nilai & **E-Rapor Kurikulum Merdeka** (Fase A: Kelas 1–2, Fase B: Kelas 3–4, Fase C: Kelas 5–6) untuk **SDN 1 Karangsuwung**.

- **Alamat Online (GitHub Pages)**: https://flyrinnn13001.github.io/erapor-sdn1-karangsuwung/
- **Mendukung PWA (Aplikasi HP)**: bisa di-install langsung ke layar utama HP Android/iPhone dan digunakan secara offline.

## Fitur Utama
- **Dashboard**: Ringkasan siswa, guru, kelas 1–6, pemilih Tahun Ajaran & Semester (Ganjil/Genap), daftar wali kelas, peringatan nilai belum lengkap, serta tombol *Isi Data Contoh* & *Hapus Data Contoh*.
- **Kelola Data**: Data Siswa (tambah satuan, tempel banyak nama sekaligus, naik kelas massal), Data Guru, Mata Pelajaran Kurikulum Merdeka (9 mapel standar termasuk Muatan Lokal Bahasa Sunda), dan Ekstrakurikuler.
- **Input Nilai**: Tabel gaya spreadsheet per kelas & mapel (Formatif, Sumatif, STS, SAS → Nilai Akhir otomatis & status Tuntas/Belum Tuntas), Deskripsi Capaian Kompetensi Kurikulum Merdeka, mode Kartu HP, serta Absensi & Catatan Wali Kelas.
- **Rekap & Leger Nilai**: Leger kelas (jumlah, rata-rata, ranking), Rekap per siswa, Rekap ketuntasan per mata pelajaran, dengan export **PDF** dan **CSV**.
- **E-Rapor (Cetak)**: Format rapor resmi Kurikulum Merdeka A4 (cetak/PDF 1 siswa atau massal 1 kelas sekaligus), termasuk keputusan kenaikan kelas/kelulusan pada Semester Genap.
- **Pengaturan**: Identitas sekolah, kepala sekolah & NIP, tanggal rapor, bobot nilai akhir, KKTP default, serta **Backup & Restore JSON**.

## Cara Memasang di HP Seperti Aplikasi (PWA)
1. Buka **https://flyrinnn13001.github.io/erapor-sdn1-karangsuwung/** di HP.
2. **Android (Chrome)**: ketuk tombol **Install Aplikasi** (atau menu `⋮` → *Install aplikasi / Tambahkan ke layar utama*).
3. **iPhone (Safari)**: ketuk tombol **Bagikan (Share)** → **Tambahkan ke Layar Utama**.

## Pengembangan Lokal
```powershell
npm install
npm run dev
```
