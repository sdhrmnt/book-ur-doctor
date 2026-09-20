# PRD.md — Kenapa Project Ini Dibangun

> `SPEC.md` menjawab **apa** yang dibangun. File ini menjawab **kenapa**.
> Agent tidak wajib baca file ini untuk koding, tapi wajib baca kalau harus
> memutuskan sesuatu yang tidak tertulis di `SPEC.md`.

---

## 1. Masalah

Orang yang perlu ke dokter berhenti di tiga tembok:

1. **Tidak tahu jadwal yang benar-benar kosong.** Situs klinik menampilkan "Praktik
   Senin–Sabtu 09.00–12.00", lalu pasien telepon, lalu diberi tahu dokternya cuti.
   Informasi jadwal dan informasi ketersediaan adalah dua hal berbeda, dan
   kebanyakan sistem hanya menampilkan yang pertama.
2. **Dokumen medis berserakan dan tidak terbaca.** Hasil lab ada di map plastik,
   foto rontgen di galeri HP. Kalaupun ditemukan, isinya angka dan singkatan yang
   tidak dimengerti pasien.
3. **Pasien datang tanpa tahu harus bertanya apa.** Waktu konsultasi 15 menit
   habis untuk menjelaskan ulang riwayat, bukan untuk bertanya.

Sistem booking klinik menyelesaikan tembok pertama, itu pun sering setengah.
**Nilai jual kita ada di tembok kedua dan ketiga** — dokumen yang tersimpan rapi,
terbaca, dan berubah jadi daftar pertanyaan untuk dokter.

## 2. Kenapa Ketersediaan Dihitung, bukan Disimpan

| Alasan | Penjelasan |
|---|---|
| Jadwal berubah | Dokter cuti mendadak. Tabel slot yang sudah dibuat jadi bohong |
| Durasi berubah | Dokter menaikkan durasi konsultasi dari 15 ke 30 menit — semua slot masa depan harus dibuat ulang |
| Rentang tak terbatas | Kalau slot disimpan, harus diputuskan "sampai kapan dibuat". Tidak ada jawaban yang benar |
| Konsistensi | Satu sumber kebenaran (`DoctorSchedules` + `ScheduleExceptions` + `Appointments`) tidak bisa berbeda dari dirinya sendiri |
| Biaya | Menyimpan slot 12 bulan × 200 dokter = jutaan baris yang 99%-nya tidak pernah dibaca |

Konsekuensinya: `availabilityService` adalah file paling penting di repo, dan
`GET /availability` adalah endpoint yang paling perlu di-benchmark.

## 3. Siapa Penggunanya

| Persona | Profil | Yang dia butuh |
|---|---|---|
| **Rina, 32, ibu bekerja** | Anak sering sakit, waktunya sempit | Lihat jadwal Sabtu yang benar-benar kosong, booking dalam 2 menit |
| **Pak Hadi, 58, hipertensi** | Kontrol rutin, banyak hasil lab | Semua dokumen di satu tempat + penjelasan bahasa awam |
| **dr. Adi, 41, kardiolog** | Praktik di 2 klinik, jadwal padat | Jadwal hari ini + riwayat pasien sebelum pasien masuk ruangan |
| **Nur, 29, admin klinik** | Verifikasi dokter, pantau performa | Statistik janji temu tanpa perlu menyentuh data klinis |

Bukan target v1.0: rumah sakit dengan IGD, apotek, laboratorium, asuransi.

## 4. Prinsip AI di Produk Ini

**AI di sini adalah penerjemah, bukan dokter.**

| Yang AI lakukan | Yang AI TIDAK lakukan |
|---|---|
| Menyebut jenis dokumen | Menyebut nama penyakit sebagai kesimpulan |
| Menyalin nilai + rentang rujukan yang tertulis di dokumen | Menilai nilai itu berbahaya atau tidak |
| Menyusun daftar pertanyaan untuk dokter | Menyarankan obat, dosis, atau tindakan |
| Menyederhanakan istilah medis | Menyuruh pasien tenang atau khawatir |

Alasan ini bukan sekadar hukum. Ringkasan yang terdengar seperti diagnosis akan
membuat sebagian pasien **tidak jadi** ke dokter — itu bahaya nyata, dan itu
kebalikan dari tujuan produk ini.

Karena itu ada `guardrail.py` yang menolak output, dan status `rejected` yang
lebih baik ditampilkan sebagai "ringkasan tidak tersedia" daripada menampilkan
teks yang lolos begitu saja.

**Kenapa de-identifikasi wajib:** kami tidak mengontrol apa yang dilakukan
provider LLM dengan data yang dikirim. Satu-satunya jaminan yang bisa kami berikan
ke pasien adalah bahwa namanya tidak pernah ikut terkirim.

## 5. Ukuran Keberhasilan

| Yang diukur | Target 90 hari pertama |
|---|---|
| Pasien baru yang menyelesaikan booking pertama dalam 24 jam | ≥ 50% |
| Janji temu yang berakhir `completed` (bukan `cancelled`/`no_show`) | ≥ 75% |
| Pasien yang mengunggah ≥1 dokumen | ≥ 35% |
| Ringkasan AI yang dinilai "membantu" oleh pasien | ≥ 70% |
| Ringkasan yang ditolak `guardrail.py` | ≤ 5% (kalau lebih tinggi, promptnya salah) |
| Kasus double-booking yang lolos ke produksi | **0** |
| p95 waktu respons `GET /availability` (rentang 7 hari) | ≤ 500 ms |
| p95 waktu ringkasan dokumen selesai | ≤ 20 detik |

Kalau `completed` di bawah 60%, yang dievaluasi duluan adalah **pengingat dan alur
konfirmasi**, bukan pencarian dokter.

## 6. Prinsip Produk (dipakai untuk memutuskan hal yang tidak tertulis)

1. **Jangan sampai user kehilangan data medis.** Kalau AI down, dokumen tetap
   tersimpan dan tetap bisa diunduh. Penyimpanan lebih penting daripada ringkasan.
2. **Kalau ragu antara menampilkan dan menyembunyikan data medis — sembunyikan.**
   Salah menolak akses menyebalkan. Salah memberi akses tidak bisa ditarik kembali.
3. **Riwayat tidak pernah dihapus, hanya ditandai.** Batal, tidak datang, revisi
   catatan — semuanya jadi baris atau kolom baru.
4. **Database yang menjaga integritas, bukan niat baik developer.** Kalau sebuah
   aturan bisa ditegakkan constraint, tegakkan di sana.
5. **Setiap akses ke dokumen medis meninggalkan jejak.** Tanpa kecuali, tanpa mode
   senyap, tanpa "cuma admin kok".
6. **Sederhana dulu.** Fitur yang tidak dipakai tetap harus dirawat — dan di
   domain ini, tetap harus diaudit.

## 7. Roadmap

| Versi | Isi | Selesai kalau |
|---|---|---|
| **v1.0** | Scope di `SPEC.md §2` | Pasien bisa booking → unggah → dapat ringkasan → konsultasi, tanpa double-booking |
| v1.1 | Notifikasi email + SMS | Angka `no_show` turun |
| v1.2 | Pembayaran online | Klinik tidak perlu menagih di tempat |
| v1.3 | Sinkronisasi kalender dokter (iCal) | Dokter tidak perlu maintain dua jadwal |
| v1.4 | Video konsultasi | Pasien luar kota bisa dilayani |
| v2.0 | Resep digital + integrasi apotek | — |

## 8. Risiko

| Risiko | Mitigasi |
|---|---|
| Double-booking di jam sibuk | Partial unique index di DB, bukan pengecekan aplikasi (`ERD.md §3`) |
| Dokumen medis bocor | Signed URL ber-TTL pendek, akses lewat `accessService`, audit log wajib, admin dikecualikan |
| AI menghasilkan kalimat diagnosis | `guardrail.py` menolak output; status `rejected` tidak pernah ditampilkan |
| Data pasien terkirim ke provider LLM | `deidentify.py` wajib dilewati; tidak ada jalur langsung OCR → LLM |
| Query availability lambat saat dokter banyak | Rentang dibatasi maks 31 hari, index di `ERD.md §3`, benchmark masuk CI |
| Zona waktu salah (booking meleset 7 jam) | Semua `timestamptz` UTC, konversi hanya di presentasi, test wajib pakai waktu beku |
| Dokter palsu mendaftar | Akun dokter dibuat admin, dan baru muncul setelah `verifiedAt` diisi |
| Object storage down | Upload gagal jelas (5xx), bukan baris `MedicalDocuments` tanpa file |

## 9. Keputusan Owner

- [x] Object storage: **ImageKit** (lihat `SPEC.md §10`)
- [x] Provider LLM: **Gemini API**, model default `gemini-2.5-flash` (env
      `GEMINI_MODEL`, boleh naik ke `gemini-2.5-pro` tanpa ubah kode — lihat
      `SPEC.md §10` dan `ARCHITECTURE.md §6`)
- [x] OCR: **`pytesseract` lokal** untuk v1.0. Alasan: input ke Gemini wajib
      teks yang sudah lewat `deidentify.py` (`SPEC.md §6` aturan #6) — kalau
      gambar dikirim langsung ke provider LLM (Gemini bisa baca gambar
      langsung / multimodal), langkah de-identifikasi tekstual jadi tidak
      bisa ditegakkan sebelum data keluar server. Mode multimodal
      dipertimbangkan lagi di v1.1+ setelah ada desain deidentifikasi level
      gambar.
- [x] `MIN_CANCEL_LEAD_HOURS` = **6 jam** (`config/constants.js`)
- [x] Retensi dokumen medis setelah akun pasien dinonaktifkan: **90 hari**,
      lalu dihapus permanen dari object storage. Baris `MedicalDocuments`
      tetap ada (ditandai, bukan dihapus — sesuai prinsip §6.3) tapi
      `fileKey`-nya tidak lagi valid setelah 90 hari.
- [x] Dokter melihat dokumen pasien **hanya setelah** janji temu `confirmed`
      (v1.0, tidak berubah).
