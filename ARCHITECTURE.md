# ARCHITECTURE.md — Kontrak Teknis

> Ini kontrak antar-agent. Backend, frontend, dan AI service dikerjakan agent
> berbeda, jadi **bentuk request/response di bawah ini adalah hukum**. Kalau butuh
> field baru, ubah file ini dulu lewat PR terpisah, baru koding.

---

## 1. Struktur Folder (kepemilikan per agent)

```
healthcare-portal/
├── server/                     ← OWNER: Claude Code
│   ├── config/
│   │   ├── config.js
│   │   └── constants.js        (SLOT_DURATION_MINUTES, MIN_BOOKING_LEAD_MINUTES,
│   │                            MIN_CANCEL_LEAD_HOURS, SIGNED_URL_TTL_SECONDS,
│   │                            MAX_UPLOAD_BYTES, REMINDER_OFFSETS)
│   ├── models/                 (Sequelize models)
│   ├── migrations/
│   ├── seeders/
│   ├── services/
│   │   ├── accessService.js        (satu-satunya penentu hak akses)
│   │   ├── availabilityService.js  (satu-satunya penghitung ketersediaan)
│   │   ├── appointmentService.js   (booking, reschedule, transisi status)
│   │   ├── documentService.js      (upload, signed URL, WAJIB tulis access log)
│   │   ├── summaryService.js       (cache + panggil aiServiceClient)
│   │   ├── chatService.js
│   │   ├── reminderService.js
│   │   └── statsService.js         (hitung angka dashboard admin, TANPA AI)
│   ├── ai/
│   │   └── aiServiceClient.js  (satu-satunya file yang memanggil ai-service)
│   ├── storage/
│   │   └── storageClient.js    (satu-satunya file yang memanggil object storage)
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/            (authentication, authorize, upload, errorHandler)
│   ├── sockets/
│   │   ├── index.js            (registrasi namespace + handshake JWT)
│   │   └── chatHandler.js
│   ├── helpers/                (jwt.js, bcrypt.js, money.js, dateHelper.js, timeRange.js)
│   ├── __tests__/
│   ├── app.js
│   ├── bin/www.js
│   └── bin/cron.js             (proses terpisah, bukan di dalam web server)
│
├── ai-service/                 ← OWNER: Claude Code
│   ├── main.py                 (FastAPI app, hanya routing + validasi)
│   ├── extractor.py            (PDF/gambar → teks mentah)
│   ├── deidentify.py           (WAJIB dilewati sebelum LLM)
│   ├── summarizer.py           (teks bersih → ringkasan)
│   ├── guardrail.py            (tolak output yang mengandung bahasa diagnosis)
│   ├── llm_client.py           (satu-satunya file yang memanggil API LLM)
│   ├── schemas.py              (pydantic, kontrak request/response)
│   └── tests/
│
├── client/                     ← OWNER: Cline
│   ├── src/
│   │   ├── components/         (DoctorCard, SlotPicker, DocumentUpload, ChatBox, ...)
│   │   ├── pages/              (Login, Register, DoctorSearch, DoctorDetail,
│   │   │                        Booking, PatientDashboard, DoctorDashboard,
│   │   │                        Documents, Chat, AdminDashboard)
│   │   ├── services/api.js
│   │   ├── services/socket.js
│   │   ├── context/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
│
├── .github/workflows/          ← OWNER: Antigravity
├── docs/                       ← OWNER: Antigravity
├── SPEC.md / PRD.md / ARCHITECTURE.md / ERD.md / STYLE.md / TESTING.md /
│   AGENTS.md / CLAUDE.md / WORKFLOW.md   ← OWNER: kamu (manusia)
└── README.md                   ← OWNER: Antigravity
```

**Aturan:** agent hanya boleh mengubah file di folder miliknya. Kalau butuh
perubahan di folder agent lain → buka issue, jangan edit sendiri.

## 2. Schema Database

Relasi antar tabel, constraint, dan index ada di `ERD.md`. Di sini kolomnya.

### Users
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| email | string | unique, not null |
| password | string | hashed bcrypt, not null |
| role | string | enum: `patient` / `doctor` / `admin`. **Tidak pernah berubah setelah dibuat** |
| name | string | not null |
| phone | string | nullable |
| timezone | string | default `Asia/Jakarta` |
| isActive | boolean | default true. Nonaktif ≠ dihapus |

### PatientProfiles
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| UserId | integer FK | unique, not null |
| dateOfBirth | date | nullable |
| gender | string | enum: `male` / `female` / `undisclosed` |
| bloodType | string | nullable |
| allergies | text | nullable, teks bebas |
| emergencyContact | string | nullable |

### Specializations
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| name | string | not null, mis. `Kardiologi` |
| slug | string | unique, not null, mis. `kardiologi` |

### Clinics
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| name | string | not null |
| address | string | not null |
| city | string | not null, disimpan lowercase |
| timezone | string | default `Asia/Jakarta` |

### DoctorProfiles
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| UserId | integer FK | unique, not null |
| SpecializationId | integer FK | not null |
| licenseNumber | string | unique, not null (nomor STR) |
| experienceYears | integer | >= 0 |
| consultationFee | integer | rupiah penuh, >= 0 |
| languages | string[] | mis. `['id','en']` |
| bio | text | nullable |
| verifiedAt | date | nullable. **Null = tidak muncul di pencarian** |

### DoctorSchedules (pola berulang mingguan — BUKAN daftar slot)
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| DoctorProfileId | integer FK | not null |
| ClinicId | integer FK | not null |
| dayOfWeek | integer | 0 = Minggu … 6 = Sabtu |
| startTime | time | jam lokal klinik, mis. `09:00` |
| endTime | time | mis. `12:00` |
| slotDurationMinutes | integer | > 0, default `SLOT_DURATION_MINUTES` |
| effectiveFrom | date | not null |
| effectiveUntil | date | nullable = berlaku selamanya |

### ScheduleExceptions
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| DoctorProfileId | integer FK | not null |
| ClinicId | integer FK | nullable, wajib kalau `type` = `extra` |
| date | date | not null |
| type | string | enum: `off` / `extra` |
| startTime | time | nullable — null berarti seharian penuh (hanya untuk `off`) |
| endTime | time | nullable |
| reason | string | nullable |

### Appointments
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| PatientId | integer FK | → `Users.id`, role wajib `patient` |
| DoctorProfileId | integer FK | not null |
| ClinicId | integer FK | not null |
| startsAt | timestamptz | **UTC**, harus tepat di awal slot |
| endsAt | timestamptz | `startsAt + slotDurationMinutes` |
| status | string | enum: `scheduled` / `confirmed` / `completed` / `cancelled` / `no_show` |
| reasonText | text | keluhan singkat dari pasien, nullable |
| feeSnapshot | integer | tarif saat booking, tidak ikut berubah kalau dokter naik tarif |
| cancelledAt | timestamptz | nullable |
| cancelledBy | integer FK | nullable → `Users.id` |
| rescheduledFromId | integer FK | nullable → `Appointments.id` |

### MedicalDocuments
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| PatientId | integer FK | pemilik data, bukan pengunggah |
| UploaderId | integer FK | siapa yang mengunggah |
| AppointmentId | integer FK | nullable — pengait akses dokter |
| storageKey | string | unique, key di object storage. **Bukan URL** |
| originalName | string | nama file asli |
| mimeType | string | enum: `application/pdf` / `image/jpeg` / `image/png` |
| sizeBytes | integer | <= `MAX_UPLOAD_BYTES` |
| checksum | string | sha256, untuk deteksi duplikat |

### DocumentSummaries (cache hasil AI, biar tidak panggil model berulang)
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| MedicalDocumentId | integer FK | not null |
| inputHash | string | hash dari teks ter-de-identifikasi — kunci cache |
| status | string | enum: `pending` / `done` / `failed` / `rejected` |
| documentType | string | mis. `hasil_lab`, `resep`, `radiologi`, `lainnya` |
| summaryText | text | narasi bahasa awam, nullable kalau belum `done` |
| keyFindings | jsonb | array poin, lihat §6 |
| model | string | nama model yang dipakai, untuk audit |
| tokensUsed | integer | untuk kontrol biaya |
| failureReason | string | nullable, diisi kalau `failed` / `rejected` |

### DocumentAccessLogs (append-only, tidak pernah di-update atau dihapus)
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| MedicalDocumentId | integer FK | not null |
| ActorId | integer FK | siapa yang mengakses |
| action | string | enum: `upload` / `view_url_issued` / `summary_requested` / `delete_requested` |
| ipAddress | string | nullable |
| userAgent | string | nullable |
| createdAt | timestamptz | |

### Conversations
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| PatientId | integer FK | not null |
| DoctorProfileId | integer FK | not null |
| lastMessageAt | timestamptz | nullable, untuk sorting daftar chat |

### Messages
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| ConversationId | integer FK | not null |
| SenderId | integer FK | → `Users.id` |
| body | text | nullable kalau ada lampiran |
| MedicalDocumentId | integer FK | nullable, lampiran |
| readAt | timestamptz | nullable |

### ConsultationNotes
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| AppointmentId | integer FK | not null |
| DoctorProfileId | integer FK | not null |
| body | text | not null |
| supersedesId | integer FK | nullable → `ConsultationNotes.id`. Revisi = baris baru |

### Reminders
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| AppointmentId | integer FK | not null |
| offsetLabel | string | enum: `h_24` / `h_2` |
| scheduledFor | timestamptz | |
| sentAt | timestamptz | nullable |
| status | string | enum: `pending` / `sent` / `cancelled` |

> **Tidak ada tabel `Slots`.** Ketersediaan dihitung, lihat `SPEC.md §4`.

## 3. Format Response Standar

Sukses:
```json
{ "message": "Appointment created", "data": { } }
```

List dengan pagination:
```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "totalItems": 57, "totalPages": 6 }
}
```

Error (SEMUA error lewat `errorHandler` middleware):
```json
{ "message": "Jadwal ini sudah dipesan pasien lain" }
```

Error karena hak akses (ada field tambahan supaya frontend bisa menampilkan
halaman yang benar, bukan pesan merah generik):
```json
{ "message": "Hanya dokter yang bertugas yang bisa membuka dokumen ini", "requiredRole": "doctor" }
```

Kode status yang dipakai: `200`, `201`, `400` (validasi/transisi status salah),
`401` (belum login / token invalid), `403` (role tidak berwenang), `404`,
`409` (**slot sudah dipesan** / bentrok), `413` (file terlalu besar),
`415` (tipe file tidak didukung), `422` (output AI ditolak guardrail), `500`.

`409` khusus double-booking. Jangan pakai `400` untuk kasus ini — frontend perlu
membedakannya supaya bisa me-refresh daftar slot secara otomatis.

## 4. Daftar Endpoint

### 4a. Publik
| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/auth/register` | body: `email`, `password`, `name`, `role` (`patient` saja; dokter dibuat admin) |
| POST | `/api/auth/login` | return `{ access_token, user }` |
| GET | `/api/specializations` | daftar spesialisasi |
| GET | `/api/doctors` | pencarian, filter di `SPEC.md §8`. Hanya dokter `verifiedAt` tidak null |
| GET | `/api/doctors/:id` | detail profil publik |
| GET | `/api/doctors/:id/availability` | query: `from`, `to` (maks 31 hari). **Wajib lewat availabilityService** |
| GET | `/health` | untuk uptime monitor & smoke test deploy |

### 4b. Pasien
| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/api/me` | semua | profil + `{ role }` |
| POST | `/api/appointments` | patient | body: `DoctorProfileId`, `ClinicId`, `startsAt`, `reasonText` |
| GET | `/api/appointments` | semua | difilter otomatis sesuai role. query: `status`, `dateFrom`, `dateTo`, `page`, `limit` |
| GET | `/api/appointments/:id` | semua | 403 kalau bukan pihak terkait |
| PATCH | `/api/appointments/:id/cancel` | patient, doctor, admin | |
| PATCH | `/api/appointments/:id/reschedule` | patient | body: `startsAt` baru → membuat baris baru |
| POST | `/api/documents` | patient | multipart `file`, opsional `AppointmentId` |
| GET | `/api/documents` | patient, doctor | daftar metadata, **tanpa** URL |
| GET | `/api/documents/:id/url` | patient, doctor | menerbitkan signed URL + **menulis access log** |
| POST | `/api/documents/:id/summary` | patient, doctor | memicu ringkasan, idempoten per `inputHash` |
| GET | `/api/documents/:id/summary` | patient, doctor | ambil ringkasan yang sudah ada |
| GET | `/api/conversations` | patient, doctor | |
| GET | `/api/conversations/:id/messages` | patient, doctor | pagination |
| GET | `/api/reminders` | patient | pengingat yang belum dibaca |

### 4c. Dokter
| Method | Path | Role | Keterangan |
|---|---|---|---|
| GET | `/api/doctor/schedules` | doctor | jadwal praktik miliknya |
| POST | `/api/doctor/schedules` | doctor | |
| DELETE | `/api/doctor/schedules/:id` | doctor | ditolak 409 kalau masih ada janji temu aktif di dalamnya |
| POST | `/api/doctor/schedule-exceptions` | doctor | cuti / jadwal tambahan |
| PATCH | `/api/appointments/:id/confirm` | doctor | `scheduled` → `confirmed` |
| PATCH | `/api/appointments/:id/complete` | doctor | `confirmed` → `completed` |
| PATCH | `/api/appointments/:id/no-show` | doctor | `confirmed` → `no_show` |
| POST | `/api/appointments/:id/notes` | doctor | catatan konsultasi |

### 4d. Admin
| Method | Path | Role | Keterangan |
|---|---|---|---|
| POST | `/api/admin/doctors` | admin | buat akun dokter + profil |
| PATCH | `/api/admin/doctors/:id/verify` | admin | isi `verifiedAt` |
| GET | `/api/admin/stats` | admin | angka ringkasan + data grafik, **dihitung `statsService`** |
| GET | `/api/admin/users` | admin | pagination, **tanpa** data klinis |

Role yang memanggil endpoint di luar wewenangnya → **403** dengan `requiredRole`.

### Contoh response availability
```json
{
  "data": {
    "DoctorProfileId": 7,
    "timezone": "Asia/Jakarta",
    "days": [
      {
        "date": "2026-09-05",
        "ClinicId": 2,
        "slots": [
          { "startsAt": "2026-09-05T02:00:00.000Z", "endsAt": "2026-09-05T02:30:00.000Z" },
          { "startsAt": "2026-09-05T02:30:00.000Z", "endsAt": "2026-09-05T03:00:00.000Z" }
        ]
      }
    ]
  }
}
```
Slot yang sudah dipesan **tidak dikirim sama sekali** — bukan dikirim dengan flag
`isBooked: false`. Frontend tidak boleh tahu jadwal siapa yang penuh.

## 5. Header Autentikasi

```
Authorization: Bearer <access_token>
```
Payload JWT hanya berisi: `{ id, role }`. Untuk dokter, `DoctorProfileId`
**tidak masuk token** — selalu dibaca ulang dari DB, supaya pencabutan verifikasi
langsung berlaku tanpa menunggu token kedaluwarsa.

Socket.IO memakai token yang sama lewat `handshake.auth.token`. Koneksi tanpa
token valid ditolak di `sockets/index.js`, bukan di handler.

## 6. Kontrak `ai-service`

Node **tidak pernah** memanggil API LLM langsung. Semua lewat
`server/ai/aiServiceClient.js` → `ai-service`.

### `POST /summarize`
Request dari Node:
```json
{
  "documentId": 42,
  "mimeType": "application/pdf",
  "fileBase64": "JVBERi0xLjQK..."
}
```

Response sukses:
```json
{
  "status": "done",
  "documentType": "hasil_lab",
  "summaryText": "📄 Jenis dokumen: ...",
  "keyFindings": [
    { "label": "Hemoglobin", "value": "11,2 g/dL", "flag": "below_reference" },
    { "label": "Leukosit", "value": "9.800 /µL", "flag": "within_reference" }
  ],
  "inputHash": "a3f9...",
  "model": "provider/model-name",
  "tokensUsed": 812
}
```

Response ditolak guardrail:
```json
{ "status": "rejected", "failureReason": "output_contains_diagnostic_language" }
```
Node menyimpannya sebagai `DocumentSummaries.status = 'rejected'` dan membalas
`422` ke client. **Dilarang menampilkan teks yang ditolak ke user.**

`flag` hanya boleh salah satu dari: `below_reference`, `within_reference`,
`above_reference`, `not_applicable`. Ini deskripsi posisi angka terhadap rentang
yang **tertulis di dokumen** — bukan penilaian klinis.

### Pipeline wajib di dalam `ai-service` (urutan tidak boleh diubah)
```
1. extractor.py   : PDF/gambar → teks mentah
2. deidentify.py  : buang nama, NIK, no. telepon, alamat, email, no. rekam medis
                    → kalau langkah ini dilewati, LLM menerima data pribadi pasien
3. hash           : inputHash = sha256(teks bersih)  → dikembalikan ke Node untuk cache
4. summarizer.py  : teks bersih → prompt → llm_client.py
5. guardrail.py   : tolak kalau output memuat kata terlarang (SPEC.md §9)
6. tempel disclaimer, kembalikan
```
`llm_client.py` adalah **satu-satunya** file yang boleh melakukan panggilan
jaringan ke provider LLM.

### Provider LLM: Gemini API

- `llm_client.py` memanggil `generativelanguage.googleapis.com` lewat `httpx`.
  **Dilarang** menambah SDK `google-generativeai` atau SDK LLM apa pun —
  panggilan tetap HTTP polos, konsisten dengan `SPEC.md §10`.
- Model default: `gemini-2.5-flash` (lihat `GEMINI_MODEL` di `.env`). Boleh
  dinaikkan ke `gemini-2.5-pro` lewat env var kalau kualitas ringkasan kurang,
  **tanpa** mengubah kode.
- Input ke Gemini **selalu teks bersih hasil `deidentify.py`**, tidak pernah
  gambar/PDF mentah. `extractor.py` (OCR `pytesseract`) tetap wajib jalan
  duluan — Gemini di sini hanya dipakai sebagai `summarizer.py`, bukan
  pengganti langkah `extractor` atau `deidentify`. Kalau ada yang mengirim
  `fileBase64` langsung ke Gemini tanpa lewat langkah 1–2 di pipeline, itu
  pelanggaran, walaupun secara teknis Gemini bisa baca gambar langsung.
- Timeout & retry: `GEMINI_TIMEOUT_SECONDS` (default 15). Timeout →
  `status: "failed"`, bukan exception yang bocor ke Node (lihat `TESTING.md`
  skenario A8).

## 7. Alur Kritis: Booking Janji Temu

```
 1. authentication → role wajib 'patient'
 2. Validasi body: DoctorProfileId, ClinicId, startsAt (ISO UTC)
 3. Dokter ada dan verifiedAt tidak null? Tidak → 404
 4. availabilityService.isSlotOpen(doctor, clinic, startsAt)
    - slot ada di jadwal? tidak → 400 "Di luar jadwal praktik dokter"
    - startsAt >= now + MIN_BOOKING_LEAD_MINUTES? tidak → 400
 5. Buka transaksi DB
 6. INSERT Appointments (status 'scheduled', feeSnapshot = consultationFee saat ini)
 7. Kalau INSERT melanggar partial unique index → tangkap SequelizeUniqueConstraintError
    → rollback → 409 "Jadwal ini sudah dipesan pasien lain"
 8. Buat baris Reminders untuk h_24 dan h_2 (yang scheduledFor-nya sudah lewat
    langsung diberi status 'cancelled', bukan dikirim terlambat)
 9. Commit
10. Emit event socket ke dokter terkait
```

**Langkah 4 bukan pengaman.** Itu hanya untuk pesan error yang enak dibaca.
Pengaman sesungguhnya adalah langkah 7. Dilarang menghapus langkah 7 dengan alasan
"kan sudah dicek di langkah 4".

## 8. Alur Kritis: Upload Dokumen → Ringkasan AI

```
 1. authentication → role wajib 'patient'
 2. multer memory storage, tolak > MAX_UPLOAD_BYTES (413) dan mime di luar
    daftar (415)
 3. Hitung checksum sha256
 4. storageClient.put() → dapat storageKey
 5. INSERT MedicalDocuments
 6. INSERT DocumentAccessLogs { action: 'upload' }
 7. Balas 201 dengan metadata (TANPA URL)

Ringkasan (endpoint terpisah, dipanggil setelahnya):
 8. accessService.canReadDocument(actor, document) → tidak → 403
 9. INSERT DocumentAccessLogs { action: 'summary_requested' }
10. Sudah ada DocumentSummaries status 'done' untuk dokumen ini? → kembalikan cache
11. storageClient.get() → base64 → aiServiceClient.summarize()
12. Sukses  → simpan status 'done'
    Rejected→ simpan status 'rejected', balas 422
    Timeout → simpan status 'failed', balas 200 dengan data dokumen apa adanya
```

**Kalau langkah 11–12 gagal:** dokumen yang sudah masuk di langkah 5 **tetap
tersimpan** dan tetap bisa diunduh pasien. Jangan rollback file user karena AI down.

## 9. Alur Kritis: Menerbitkan Signed URL

```
1. accessService.canReadDocument(actor, document)
   - actor.role 'patient' → document.PatientId === actor.id
   - actor.role 'doctor'  → ada Appointment antara doctor & document.PatientId
                            berstatus confirmed/completed
   - actor.role 'admin'   → SELALU false
2. Tidak berwenang → 403 + requiredRole. JANGAN terbitkan URL.
3. storageClient.signUrl(storageKey, SIGNED_URL_TTL_SECONDS)
4. INSERT DocumentAccessLogs { action: 'view_url_issued', ipAddress, userAgent }
5. Balas { data: { url, expiresAt } }
```

Langkah 4 **tidak boleh dilewati, tidak boleh async fire-and-forget, dan tidak
boleh gagal diam-diam.** Kalau penulisan log gagal, seluruh operasi gagal dan URL
tidak diterbitkan. Audit trail lebih penting daripada satu kali gagal buka file.

## 10. Alur Kritis: Cron (bin/cron.js)

```
Tiap 5 menit:
1. Reminders status 'pending' dengan scheduledFor <= now
   → kirim notifikasi in-app, set 'sent'
2. Reminders milik Appointment berstatus 'cancelled' → set 'cancelled', jangan kirim

Tiap hari 00:10:
3. Appointments 'confirmed' yang endsAt-nya lewat > AUTO_NO_SHOW_HOURS dan belum
   ditandai dokter → biarkan apa adanya, hanya catat di log. JANGAN otomatis
   mengubah status. Menandai pasien tidak datang adalah keputusan manusia.
4. Tidak ada data janji temu atau dokumen yang dihapus. Selamanya.
```
