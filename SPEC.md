# SPEC.md — AI-Powered Healthcare Appointment & Patient Portal

> Sumber kebenaran tunggal untuk SEMUA agent (Claude Code, Cline, Antigravity).
> Kalau sesuatu tidak tertulis di sini → **berhenti dan tanya owner**, jangan mengarang.

---

## 1. Tujuan Project

Portal web tempat pasien mencari dokter, melihat jadwal yang benar-benar kosong,
memesan janji temu, mengunggah dokumen medis, dan berkomunikasi dengan dokternya.
**AI dipakai untuk meringkas dokumen medis ke bahasa awam dan membantu pencarian
jadwal — bukan untuk mendiagnosis.**

Bedanya dengan sistem booking klinik biasa: kompetitor berhenti di "janji temu
kamu hari Sabtu jam 10". Kita lanjut ke "hasil lab yang kamu unggah berisi 3
nilai di luar rentang rujukan — ini yang perlu kamu tanyakan ke dokter nanti".

**Alur inti:** cari dokter → ketersediaan dihitung → janji temu dibuat → dokumen
diunggah → diringkas AI → konsultasi. Semua fitur lain adalah turunan dari
`Appointments` dan `MedicalDocuments`.

## 2. Scope MVP (v1.0)

Yang **MASUK** v1.0:

- Registrasi & login email + password, 3 role: `patient` / `doctor` / `admin`
- Pencarian dokter dengan filter: spesialisasi, lokasi, tarif, pengalaman, bahasa
- Ketersediaan jadwal **dihitung real-time** dari jadwal dokter dikurangi janji temu
- Booking, reschedule, dan pembatalan janji temu
- Dashboard pasien: janji temu mendatang & lampau, dokumen, pesan, pengingat
- Dashboard dokter: janji temu hari ini, profil pasien, riwayat, catatan konsultasi
- Dashboard admin: jumlah pasien/dokter/janji temu, completion rate, spesialisasi populer
- Upload dokumen medis (PDF/JPG/PNG) dengan akses terkontrol + audit log
- Ringkasan dokumen oleh AI (bahasa awam, **tanpa diagnosis**)
- Chat dokter–pasien real-time (Socket.IO), termasuk status terbaca
- Pengingat janji temu (H-1 dan H-2 jam) lewat notifikasi in-app
- Verifikasi dokter oleh admin sebelum profilnya bisa dicari

Yang **TIDAK MASUK** v1.0 (jangan dikerjakan sampai diminta):

- Pembayaran online / payment gateway
- Video call / telemedicine
- Resep digital & e-prescription
- Sinkronisasi Google Calendar / iCal
- Notifikasi SMS, WhatsApp, atau email
- AI symptom checker / triase otomatis
- Multi-cabang dengan antrian fisik (nomor antrean)
- Asuransi & klaim
- Mobile app native, PWA offline mode
- Dark mode
- Multi-bahasa (v1.0 hanya Bahasa Indonesia)

## 3. Definisi Istilah

| Istilah | Arti di project ini |
|---|---|
| Appointment | Satu janji temu antara satu pasien dan satu dokter pada satu rentang waktu. |
| Schedule | Pola jadwal praktik dokter yang berulang mingguan. **Bukan** daftar slot. |
| Exception | Pengecualian jadwal pada tanggal tertentu (cuti, jadwal tambahan). |
| Slot | Rentang waktu yang **dihitung**, bukan disimpan. Tidak ada tabel `Slots`. |
| Availability | Hasil `Schedule + Exception − Appointment aktif` untuk rentang tanggal tertentu. |
| Document | File medis milik pasien. Disimpan di object storage, **bukan** di database. |
| Summary | Ringkasan bahasa awam dari dokumen, hasil AI. **Bukan** diagnosis, bukan saran medis. |
| De-identification | Pembuangan nama, NIK, nomor telepon, alamat dari teks **sebelum** dikirim ke LLM. |
| Access log | Catatan siapa membuka dokumen siapa, kapan. Append-only, tidak pernah dihapus. |

## 4. Ketersediaan Jadwal (ini inti sistemnya, jangan sampai salah)

**Tidak ada tabel `Slots`.** Ketersediaan selalu dihitung ulang oleh
`services/availabilityService.js` dengan rumus:

```
untuk setiap tanggal D dalam rentang yang diminta:
  1. ambil DoctorSchedules yang dayOfWeek-nya = hari(D)
     dan effectiveFrom <= D <= effectiveUntil (atau effectiveUntil null)
  2. buang rentang yang tertutup ScheduleExceptions type 'off' pada tanggal D
  3. tambahkan ScheduleExceptions type 'extra' pada tanggal D
  4. potong hasilnya jadi slot selebar slotDurationMinutes
  5. buang slot yang startsAt-nya sudah dipakai Appointment berstatus
     'scheduled' atau 'confirmed' untuk dokter itu
  6. buang slot yang startsAt < now + MIN_BOOKING_LEAD_MINUTES
```

**Kenapa dihitung, bukan disimpan:** jadwal dokter berubah, cuti mendadak terjadi,
dan durasi konsultasi bisa diubah. Tabel slot yang dibuat di muka akan langsung
basi dan menghasilkan booking ke jadwal yang sudah tidak ada. Ini kesalahan paling
mahal di sistem appointment.

## 5. Matriks Hak Akses Role

| | `patient` | `doctor` | `admin` |
|---|:---:|:---:|:---:|
| Cari & lihat profil dokter | ✅ | ✅ | ✅ |
| Booking / reschedule / batal janji temu sendiri | ✅ | ❌ | ❌ |
| Lihat janji temu miliknya | ✅ | ✅ | ✅ (semua) |
| Batalkan janji temu pasien | ❌ | ✅ (miliknya) | ✅ |
| Upload dokumen medis | ✅ | ❌ | ❌ |
| Baca dokumen pasien | ✅ (miliknya) | ✅ (bertautan janji temu) | ❌ |
| Minta ringkasan AI | ✅ (miliknya) | ✅ (bertautan janji temu) | ❌ |
| Tulis catatan konsultasi | ❌ | ✅ | ❌ |
| Chat | ✅ (dgn dokternya) | ✅ (dgn pasiennya) | ❌ |
| Kelola jadwal praktik | ❌ | ✅ (miliknya) | ✅ |
| Verifikasi dokter | ❌ | ❌ | ✅ |
| Dashboard statistik | ❌ | ❌ | ✅ |

**Admin TIDAK bisa membaca dokumen medis.** Ini disengaja. Admin mengelola sistem,
bukan data klinis. Kalau butuh untuk investigasi, jalurnya lewat proses manual di
luar aplikasi, bukan lewat tombol.

## 6. Aturan Bisnis (WAJIB — ini yang paling sering di-halu-kan agent)

1. **Tidak ada tabel/kolom `Slots`.** Ketersediaan selalu lewat
   `services/availabilityService.js`. Kalau kamu merasa butuh tabel slot, kamu
   salah baca §4.
2. **Semua pengecekan hak akses lewat `services/accessService.js`.** Dilarang
   menulis `if (user.role === 'doctor')` di controller, route, socket handler,
   atau komponen React mana pun.
3. **Double-booking dicegah database, bukan aplikasi.** Andalannya adalah partial
   unique index di `ERD.md §3`. Pola `SELECT dulu, kalau kosong INSERT` **dilarang**
   — dua request bersamaan akan lolos dua-duanya.
4. **Dokumen medis tidak pernah diakses lewat URL publik.** Selalu signed URL
   ber-TTL `SIGNED_URL_TTL_SECONDS`, dan setiap penerbitan URL **wajib** menulis
   baris `DocumentAccessLogs`. Menerbitkan URL tanpa mencatat log = pelanggaran berat.
5. **AI hanya meringkas, tidak mendiagnosis.** Output dilarang memuat kalimat
   diagnosis, nama penyakit sebagai kesimpulan, dosis obat, atau saran pengobatan.
   Semua ringkasan wajib membawa disclaimer.
6. **Teks dokumen wajib di-de-identifikasi sebelum masuk LLM.** Nama, NIK, nomor
   telepon, alamat, email, nomor rekam medis dibuang di `ai-service/deidentify.py`.
   Tidak ada jalur langsung dari OCR ke LLM.
7. **Tarif konsultasi selalu integer rupiah penuh.** `150000`, bukan `150000.00`.
   Dilarang float untuk uang di mana pun.
8. **Semua waktu disimpan sebagai `timestamptz` UTC.** Konversi ke zona waktu
   klinik hanya terjadi di lapisan presentasi. Dilarang menyimpan string jam lokal.
9. **Status janji temu hanya boleh berpindah sesuai §7.** Transisi di luar itu → 400.
10. **Pembatalan tidak menghapus baris.** Set `status: 'cancelled'` + `cancelledAt`
    + `cancelledBy`. Riwayat medis tidak pernah dihapus.
11. **Reschedule = janji temu baru.** Baris lama jadi `cancelled`, baris baru dibuat
    dengan `rescheduledFromId` menunjuk yang lama.
12. **Dokter yang belum diverifikasi (`verifiedAt` null) tidak muncul di pencarian
    dan tidak bisa dibooking.**
13. **Password tidak pernah masuk response API atau log.** Hash bcrypt salt 10.
14. **Isi dokumen medis, hasil OCR, dan isi chat tidak pernah masuk `console.log`.**
15. **Kalau AI gagal/timeout → dokumen tetap tersimpan**, ringkasan berstatus
    `failed`, dan pasien tetap bisa mengunduh dokumennya. Jangan sampai user
    kehilangan file karena AI down.

## 7. State Machine Janji Temu

```
            booking oleh pasien
                    │
                    ▼
              [scheduled] ──── dikonfirmasi dokter ────► [confirmed]
                    │                                          │
                    │                                          │
      dibatalkan ───┼──────────────────────────────────────────┤
                    ▼                                          ▼
              [cancelled]                              [completed]  ← ditandai dokter
                                                                     setelah endsAt lewat
              [confirmed] ── endsAt lewat, pasien tidak datang ──► [no_show]
```

| Dari | Ke | Siapa yang boleh | Syarat |
|---|---|---|---|
| `scheduled` | `confirmed` | dokter, admin | — |
| `scheduled` | `cancelled` | pasien, dokter, admin | pasien hanya kalau `startsAt` > now + `MIN_CANCEL_LEAD_HOURS` |
| `confirmed` | `cancelled` | pasien, dokter, admin | idem |
| `confirmed` | `completed` | dokter | `endsAt` sudah lewat |
| `confirmed` | `no_show` | dokter | `endsAt` sudah lewat |
| apa pun | `scheduled` | — | **dilarang**, tidak ada jalan balik |

Transisi lain → `400 Bad Request`. Jangan diam-diam diizinkan.

## 8. Filter Pencarian Dokter yang Wajib Didukung

| Query param | Contoh | Perilaku |
|---|---|---|
| `specialization` | `kardiologi` | slug spesialisasi, exact |
| `city` | `bogor` | exact, case-insensitive |
| `maxFee` | `200000` | `consultationFee <= nilai` |
| `minExperience` | `5` | `experienceYears >= nilai` |
| `language` | `id` | dokter menguasai bahasa itu |
| `availableFrom` / `availableTo` | `2026-09-05` | dokter punya ≥1 slot kosong di rentang itu |
| `q` | `jantung` | cocok ke nama dokter atau nama spesialisasi |

Contoh: "Dokter kardiologi di Bogor yang ada jadwal Sabtu ini, tarif ≤ 200rb" →
`?specialization=kardiologi&city=bogor&maxFee=200000&availableFrom=2026-09-05&availableTo=2026-09-05`

Filter ketersediaan **selalu** lewat `availabilityService`. Dilarang meng-query
tabel `Appointments` langsung dari controller pencarian.

## 9. Kontrak Output AI (tiru gaya ini)

Ringkasan dokumen yang benar:
```
📄 Jenis dokumen: Hasil pemeriksaan laboratorium (darah lengkap)
🗓 Tanggal pada dokumen: 12 Agustus 2026

Poin utama:
• Hemoglobin 11,2 g/dL — di bawah rentang rujukan pada dokumen (12,0–15,5)
• Leukosit 9.800 /µL — di dalam rentang rujukan
• Trombosit 210.000 /µL — di dalam rentang rujukan

Yang bisa kamu tanyakan ke dokter:
• Apa arti nilai hemoglobin yang di bawah rentang pada kondisi saya?
• Apakah perlu pemeriksaan lanjutan?

⚠️ Ringkasan ini dibuat otomatis untuk membantu kamu membaca dokumen.
Bukan diagnosis dan bukan pengganti konsultasi dokter.
```

Aturan gaya: netral, tidak menakut-nakuti, maksimal 3 emoji, maksimal ~15 baris,
disclaimer **selalu** ada di baris terakhir.

❌ "Kamu kemungkinan menderita anemia" → ✅ "Hemoglobin di bawah rentang rujukan pada dokumen"
❌ "Sebaiknya minum tablet penambah darah" → ✅ "Tanyakan ke dokter apakah perlu tindak lanjut"
❌ "Hasil ini normal, tidak perlu khawatir" → ✅ "Nilai ini berada di dalam rentang rujukan"

**Kata terlarang di output AI:** `diagnosis`, `menderita`, `terindikasi`, `dosis`,
`mg`, `resep`, `harus minum`, `tidak perlu ke dokter`, `normal`/`abnormal` sebagai
kesimpulan berdiri sendiri. Divalidasi otomatis, lihat `ARCHITECTURE.md §6`.

## 10. Tech Stack (DIKUNCI — dilarang menambah/mengganti tanpa izin)

- Backend: Node.js 20, Express 5, Sequelize 6, PostgreSQL 15
- CORS: `cors`, dibutuhkan karena client (Vite, port beda) dan server beda origin
- Auth: `jsonwebtoken`, `bcryptjs`
- Real-time: `socket.io` (server) + `socket.io-client` (client)
- Upload: `multer` (memory storage) → **ImageKit** (SDK `imagekit` Node.js), private file + signed URL
- HTTP ke `ai-service`: **`fetch` bawaan Node 20**. Dilarang menambah `axios` di server
- Cron: `node-cron`, dijalankan sebagai proses terpisah `bin/cron.js`
- Test backend: Jest + Supertest
- AI service: Python 3.11, FastAPI, `pydantic`. OCR: `pytesseract`. PDF: `pypdf`
- LLM: **Gemini API** (`generativelanguage.googleapis.com`), model default
  `gemini-2.5-flash` (env `GEMINI_MODEL`). Panggil pakai `httpx` biasa —
  dilarang menambah SDK `google-generativeai` atau SDK LLM apa pun. Detail
  kontrak & alasan tidak pakai mode gambar-langsung-ke-Gemini ada di
  `ARCHITECTURE.md §6`.
- Test AI service: `pytest`
- Frontend: React 18 + Vite, React Router, Axios
- Grafik dashboard admin: `recharts` — hanya ini, dan hanya untuk grafik
- Styling: CSS biasa / CSS Modules + Tailwind — **bukan** UI library
- State frontend: React state + Context. **Bukan** Redux/Zustand/React Query di v1

## 11. Definition of Done (satu task dianggap selesai kalau...)

- [ ] Kode jalan lokal tanpa error
- [ ] Test ditulis **sebelum** kode (lihat `TESTING.md`), dan `npm test` hijau
- [ ] Coverage memenuhi ambang di `TESTING.md §3`
- [ ] Tidak melanggar `STYLE.md`
- [ ] Tidak menambah dependency baru
- [ ] File yang disentuh hanya yang disebut di issue
- [ ] Ada bukti output terminal di deskripsi PR
