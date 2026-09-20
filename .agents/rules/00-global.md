# .agents/rules/00-global.md — Aturan Main untuk Antigravity

> File ini adalah salinan `AGENTS.md` dengan tambahan catatan khusus
> Antigravity di bagian atas. Kalau `AGENTS.md` berubah, file ini **wajib**
> ikut disalin ulang, lalu tempel kembali bagian "Catatan Khusus Antigravity"
> di bawah ini.
>
> **Setelan di IDE Antigravity:** buka panel Rules, set mode aktivasi file
> ini ke **Always On** (bukan manual/glob) — ini aturan dasar yang harus
> selalu ada di context, sama seperti `CLAUDE.md` buat Claude Code dan
> `.clinerules/00-rules.md` buat Cline.

---

## Catatan Khusus Antigravity

Kamu memegang `.github/**`, `docs/**`, `README.md`, dan file konfigurasi di
root (contoh: `.editorconfig`, `.gitignore`, `docker-compose.yml` kalau ada).
Kamu **tidak pernah** menulis kode aplikasi (`server/**`, `ai-service/**`,
`client/**`) — kalau workflow CI butuh perubahan di kode aplikasi (misal
skrip `test:coverage` baru), buka issue untuk agent pemilik folder itu,
jangan mengedit sendiri.

**File yang sering kamu kerjakan dan kenapa hati-hati:**
- `.github/workflows/ci.yml` — kalau ambang coverage di sini beda dari
  `TESTING.md §3`, CI akan meloloskan PR yang seharusnya ditolak. Selalu
  samakan angka.
- `.github/pull_request_template.md` — harus persis format `AGENTS.md §5`.
  Jangan menyederhanakan bagian "Yang TIDAK saya kerjakan / ragu", itu
  bagian paling penting.
- `.github/CODEOWNERS` — pemetaannya harus sama persis dengan tabel
  "Batas Wilayah Kerja" di `AGENTS.md §2`. Kalau tabel itu berubah, file ini
  ikut berubah di PR yang sama.
- `README.md` — jangan mendokumentasikan endpoint atau schema di sini;
  itu tugas `ARCHITECTURE.md`/`ERD.md` (punya manusia). README cukup cara
  install & jalanin project.

**Yang paling sering salah di role ini:**
1. Menulis ulang aturan bisnis di `README.md` atau `docs/**` yang beda dari
   `SPEC.md` — bikin dua sumber kebenaran yang bisa saling kontradiksi.
   `docs/**` isinya penjelasan/onboarding, bukan aturan baru.
2. Ambang coverage di `ci.yml` tidak disamakan dengan `TESTING.md §3` setelah
   file itu diubah manusia.
3. Menambah step CI yang menjalankan test dengan `--forceExit` atau
   men-skip suite yang gagal supaya pipeline hijau — dilarang keras
   (`AGENTS.md §6`), sekalipun cuma di level CI config.

---
---


# AGENTS.md — Aturan Main untuk Semua AI Agent

> Berlaku untuk Claude Code, Cline, dan Antigravity.
> Salin file ini juga sebagai `CLAUDE.md` dan `.clinerules/00-rules.md`.

---

## 0. Baca dulu sebelum menulis kode apa pun

Urutan wajib di awal setiap sesi:
1. `SPEC.md` — apa yang dibangun & aturan bisnis
2. `ARCHITECTURE.md` — schema, endpoint, kepemilikan folder
3. `ERD.md` — relasi & aturan integritas data (kalau task-nya menyentuh DB)
4. `STYLE.md` — gaya penulisan kode
5. `TESTING.md` — cara membuktikan task-nya selesai
6. File yang akan diubah — **baca isinya, jangan menebak**

`PRD.md` dibaca kalau kamu harus memutuskan sesuatu yang tidak tertulis di `SPEC.md`.

## 1. Anti-Halusinasi (aturan paling penting)

- **Dilarang menebak isi file.** Selalu baca file dulu sebelum mengedit.
- **Dilarang mengarang nama fungsi, kolom DB, endpoint, atau field response.**
  Kalau tidak ada di `ARCHITECTURE.md` → berhenti dan tanya.
- **Dilarang menambah dependency baru.** Termasuk library "kecil" seperti
  `lodash`, `moment`, `dayjs`, `date-fns`, `uuid`, `axios` di server, SDK LLM,
  atau UI library. Stack sudah dikunci di `SPEC.md §10`. Kalau merasa butuh → tanya dulu.
- **Dilarang mengklaim "sudah jalan" tanpa bukti.** Sertakan output terminal
  (`npm test`, `pytest`, `curl`, log) di deskripsi PR.
- **Dilarang menulis kode untuk fitur yang ada di daftar "TIDAK MASUK v1.0"**
  di `SPEC.md`, meskipun kelihatan berguna.
- Kalau ada dua cara dan spesifikasi ambigu → **jangan pilih sendiri**, tanya.
- Kalau sebuah test gagal, **jangan mengubah test-nya supaya hijau.**
  Perbaiki kodenya, atau laporkan kalau memang spesifikasinya yang salah.

## 1b. Anti-Halusinasi Khusus Project Ini

Tujuh hal ini paling sering dilanggar agent di domain kesehatan. Hafalkan.

1. **Jangan bikin tabel, kolom, atau cache `Slots`.** Ketersediaan dihitung
   `availabilityService`, tidak disimpan. Kalau kamu merasa butuh, kamu salah baca
   `SPEC.md §4`.
2. **Jangan mencegah double-booking dengan `findOne` lalu `create`.** Dua request
   bersamaan akan lolos dua-duanya. Pengamannya partial unique index di
   `ERD.md §3`; tugas kode hanya menangkap `SequelizeUniqueConstraintError` dan
   membalas **409**.
3. **Jangan menulis `if (user.role === ...)` di luar `services/accessService.js`.**
   Termasuk di socket handler, cron, dan komponen React.
4. **Jangan menerbitkan URL dokumen tanpa menulis `DocumentAccessLogs`** dalam
   transaksi yang sama. Log yang gagal = URL tidak terbit. Bukan sebaliknya.
5. **Jangan mengirim teks dokumen ke LLM tanpa melewati `deidentify.py`.**
   Kalau kamu menambah jalur pemrosesan baru, jalur itu wajib lewat sana juga.
6. **Jangan menulis prompt atau output yang meminta/menghasilkan diagnosis.**
   Kalau prompt yang kamu tulis berisi kata "apakah pasien ini menderita",
   "apa penyakitnya", "obat apa" — berhenti. AI hanya meringkas.
7. **Jangan menaruh `new Date()` di dalam service.** Pakai `dateHelper.now()`,
   supaya test lead time booking, batas pembatalan, dan pengingat H-24 bisa ditulis.

Bonus yang juga sering salah: **jangan menyimpan waktu sebagai string jam lokal.**
Semua `timestamptz` UTC, konversi hanya di presentasi.

Kalau kamu terlanjur menulis salah satu dari ini, **jangan diam-diam diperbaiki** —
sebutkan di deskripsi PR.

## 2. Batas Wilayah Kerja

| Agent | Boleh mengubah | Dilarang menyentuh |
|---|---|---|
| **Claude Code** | `server/**`, `ai-service/**` | `client/**`, `.github/**` |
| **Cline** | `client/**` | `server/**`, `ai-service/**`, `.github/**` |
| **Antigravity** | `.github/**`, `docs/**`, `README.md`, file konfigurasi root | `server/**`, `ai-service/**`, `client/**` |

`SPEC.md`, `PRD.md`, `ARCHITECTURE.md`, `ERD.md`, `STYLE.md`, `TESTING.md`,
`AGENTS.md`, `CLAUDE.md`, `WORKFLOW.md` hanya boleh diubah oleh manusia.

## 3. Ukuran Task

- Satu task = satu GitHub Issue = satu branch = satu PR.
- **Maksimal ~200 baris perubahan per PR** (di luar test dan lockfile). Kalau
  lebih besar, pecah dulu dan laporkan rencana pemecahannya.
- Untuk task non-trivial: kirim **rencana singkat dulu** (file apa yang diubah,
  fungsi apa yang dibuat), tunggu approval owner, baru menulis kode.

## 4. Alur Git

```bash
git checkout main && git pull
git checkout -b feat/12-availability-service
# ...kerja...
git add -A
git commit -m "feat(schedule): hitung slot dari jadwal & pengecualian refs #12"
git push -u origin feat/12-availability-service
```

- **Dilarang commit langsung ke `main`.**
- **Dilarang `git push --force`, `git rebase`, atau menghapus branch orang lain.**
- **Dilarang mengubah `package-lock.json` / `requirements.txt`** kecuali memang
  task-nya soal dependency.
- Commit message: `type(scope): deskripsi refs #issue`
  (`type` = feat / fix / test / docs / chore / refactor)
- Scope yang dipakai: `auth`, `schedule`, `appointment`, `document`, `ai`, `chat`,
  `admin`, `api`, `db`, `client`, `ci`, `docs`

**Khusus project ini:** commit `test:` ditulis **sebelum** commit `feat:` yang
membuatnya lulus. Riwayat commit adalah bukti bahwa TDD-nya dijalankan.

## 5. Format Laporan Selesai

Setiap PR wajib berisi:

```md
## Apa yang dikerjakan
- ...

## File yang diubah
- server/services/availabilityService.js (baru)
- server/__tests__/unit/availabilityService.test.js (baru)

## Bukti jalan
$ npm test
 PASS  __tests__/unit/availabilityService.test.js
 Tests: 22 passed

$ npm run test:coverage
 All files | 88.2 | 84.1 | 90.0 | 88.4

## Yang TIDAK saya kerjakan / ragu
- Belum menangani dokter dengan 2 jadwal tumpang tindih di hari yang sama
  karena tidak ada di SPEC.md
```

Bagian terakhir wajib diisi jujur. Menulis "tidak ada" padahal ada keraguan
dianggap pelanggaran berat.

## 6. Testing

Detailnya di `TESTING.md`. Yang wajib diingat:

- **Test ditulis duluan.** Jalankan, pastikan MERAH, baru tulis kodenya.
- Setiap endpoint minimal punya: 1 test sukses, 1 test validasi gagal (400),
  1 test tanpa token (401), 1 test role salah (403).
- Setiap endpoint yang menyentuh dokumen medis wajib punya test **403 untuk pihak
  yang tidak berhak**, dan test bahwa **tidak ada baris access log yang dibuat**
  saat ditolak.
- Test double-booking wajib benar-benar konkuren (`Promise.allSettled`) dan jalan
  di Postgres asli, bukan mock.
- Waktu wajib di-freeze, dan test dijalankan dengan `TZ=UTC`.
- `ai-service`, object storage, dan provider LLM **selalu di-mock**. Tidak boleh
  ada panggilan jaringan sungguhan di CI.
- Fixture dokumen medis **selalu data karangan**. Dilarang memakai dokumen asli
  siapa pun.
- Dilarang memakai `.skip`, `.only`, atau `--forceExit` untuk melewati test.

## 7. Keamanan & Privasi

- Password selalu di-hash bcrypt (salt rounds 10) lewat hook Sequelize.
- Password dan hash tidak pernah masuk response API atau log.
- Semua secret (`JWT_SECRET`, `AI_SERVICE_INTERNAL_KEY`, kredensial object
  storage, kredensial DB, API key LLM) dari `.env`. **Dilarang hardcode.**
- `.env` tidak pernah di-commit. Update `.env.example` kalau ada variabel baru.
- Query selalu lewat Sequelize (parameterized). Dilarang string concat SQL.
- Dokumen medis **hanya** lewat signed URL ber-TTL. Tidak ada bucket publik,
  tidak ada URL permanen, tidak ada `Content-Disposition` yang bisa ditebak.
- **Setiap akses dokumen menulis `DocumentAccessLogs`.** Tanpa kecuali.
- **Admin tidak pernah bisa membaca dokumen medis.** Kalau kamu menulis kode yang
  memberi admin akses, itu bug, bukan fitur.
- **Isi dokumen medis, hasil OCR, ringkasan, nama file pasien, dan isi chat tidak
  boleh masuk log.** Boleh disimpan di DB, tidak boleh di `console.log`.
- Endpoint `ai-service` tidak boleh terekspos ke internet. Hanya dipanggil server
  Node, divalidasi header `x-internal-key`.
- Pesan error tidak boleh membocorkan keberadaan data orang lain. "Dokumen tidak
  ditemukan" lebih baik daripada "Dokumen ini milik pasien lain".

## 8. Kalau Kamu Ragu

Urutannya:
1. Cari jawabannya di `SPEC.md` → `ARCHITECTURE.md` → `ERD.md`.
2. Masih tidak ada? **Berhenti dan tanya owner.** Jangan pilih sendiri.
3. Kalau owner tidak ada dan kamu terpaksa memilih: pilih yang **paling ketat
   soal akses data medis** dan **paling mudah dites**, lalu tulis di deskripsi PR
   dengan awalan `ASUMSI:`.

Di project ini, salah menolak akses hanya menyebalkan. Salah memberi akses tidak
bisa ditarik kembali. Kalau bimbang, tolak.

Jangan pernah: menghapus test yang gagal, menurunkan ambang coverage, mengubah
bentuk response supaya test lulus, melewati `deidentify.py`, atau membuat "solusi
sementara" yang tidak dicatat di PR.
