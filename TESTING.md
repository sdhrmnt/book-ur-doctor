# TESTING.md — TDD, Coverage & End-to-End

> Aturan pokok: **test ditulis sebelum kode.** PR yang test-nya ditulis belakangan
> dianggap belum selesai, walaupun hijau.

---

## 1. Siklus yang Diulang Terus

```
RED      → tulis test dari aturan bisnis di SPEC.md, jalankan, pastikan GAGAL
GREEN    → tulis kode seminimal mungkin sampai lulus
REFACTOR → rapikan, test tetap hijau
COMMIT   → commit test dulu, baru commit implementasi
```

Bukti di PR: dua commit terpisah, `test:` mendahului `feat:`. Kalau di riwayat
commit test dan implementasi masuk barengan, owner berhak menolak PR-nya.

**Kenapa seketat ini:** ini aplikasi kesehatan. Bug di `availabilityService`
artinya dua pasien datang di jam yang sama (klinik kacau). Bug di `accessService`
artinya rekam medis orang lain terbuka (tidak bisa ditarik kembali). Dua-duanya
tidak bisa diperbaiki dengan patch minggu depan.

## 2. Tiga Level Test

| Level | Folder | Database | ai-service | Object storage |
|---|---|---|---|---|
| Unit | `__tests__/unit/` | mock | mock | mock |
| Integration | `__tests__/integration/` | **Postgres test asli** | mock | mock |
| E2E | `__tests__/e2e/` | **Postgres test asli** | mock, payload diperiksa | mock, payload diperiksa |

Perbandingan jumlah kira-kira: unit 60%, integration 25%, e2e 15%.

**`ai-service` dan object storage SELALU di-mock di test Node.** Tidak ada
panggilan jaringan sungguhan di CI, dan tidak ada file sungguhan yang diunggah.
`ai-service` punya suite `pytest` sendiri; di sana **provider LLM juga di-mock**.

**Constraint database tidak boleh di-mock.** Test double-booking wajib jalan di
Postgres asli — kalau di-mock, yang diuji cuma kode kita, bukan pengaman
sesungguhnya.

## 3. Target Coverage (CI gagal kalau di bawah ini)

### Global (server/)
| Metrik | Minimum |
|---|---|
| Statements | **85%** |
| Branches | **80%** |
| Functions | **85%** |
| Lines | **85%** |

### Per file (lebih ketat untuk yang menyentuh jadwal & data medis)

| File | Statements | Branches | Kenapa seketat ini |
|---|---|---|---|
| `services/accessService.js` | **100%** | **100%** | Menentukan siapa boleh baca rekam medis siapa |
| `services/availabilityService.js` | **100%** | **100%** | Salah sedikit, pasien datang ke jadwal yang tidak ada |
| `helpers/timeRange.js` | **100%** | **100%** | Fungsi murni zona waktu, tidak ada alasan meleset |
| `services/appointmentService.js` | 95% | 90% | Booking, transisi status, double-booking |
| `services/documentService.js` | 95% | 90% | Signed URL + audit log |
| `services/summaryService.js` | 90% | 85% | Cache & penanganan status `rejected`/`failed` |
| `middlewares/` | 90% | 85% | Auth & otorisasi |
| `sockets/` | 90% | 85% | Pintu masuk real-time |
| `controllers/` | 85% | 80% | |
| `models/`, `migrations/`, `seeders/`, `config/`, `bin/` | — | — | **dikecualikan** |

### Global (ai-service/)
| Modul | Minimum |
|---|---|
| `deidentify.py` | **100%** |
| `guardrail.py` | **100%** |
| `summarizer.py` | 90% |
| `extractor.py` | 85% |
| global | 85% |

`deidentify.py` dan `guardrail.py` dipatok 100% karena keduanya adalah satu-satunya
alasan kita boleh mengirim dokumen medis ke pihak ketiga.

### Konfigurasi
```js
// server/jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!models/**', '!migrations/**', '!seeders/**', '!config/**', '!bin/**',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global:                               { statements: 85, branches: 80, functions: 85, lines: 85 },
    './services/accessService.js':        { statements: 100, branches: 100, functions: 100, lines: 100 },
    './services/availabilityService.js':  { statements: 100, branches: 100, functions: 100, lines: 100 },
    './helpers/timeRange.js':             { statements: 100, branches: 100, functions: 100, lines: 100 },
    './services/appointmentService.js':   { statements: 95, branches: 90, functions: 95, lines: 95 },
    './services/documentService.js':      { statements: 95, branches: 90, functions: 95, lines: 95 },
    './middlewares/':                     { statements: 90, branches: 85, functions: 90, lines: 90 },
    './sockets/':                         { statements: 90, branches: 85, functions: 90, lines: 90 },
    './controllers/':                     { statements: 85, branches: 80, functions: 85, lines: 85 },
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 15000,
  maxWorkers: 1,
};
```

### Cara membaca persentasenya
Output `npm run test:coverage`:
```
=============================== Coverage summary ===============================
Statements   : 88.24% ( 615/697 )
Branches     : 84.11% ( 281/334 )
Functions    : 90.00% ( 108/120 )
Lines        : 88.41% ( 602/681 )
================================================================================
```
Angka ini **wajib ditempel di deskripsi PR**. Coverage yang turun lebih dari 0,5
poin dibanding `main` ditolak, walaupun masih di atas ambang.

## 4. Struktur Folder Test

```
server/__tests__/
├── setup.js                 (koneksi DB test, truncate antar test, freeze waktu)
├── factories/
│   ├── userFactory.js       createUser({ role: 'doctor' })
│   ├── doctorFactory.js     createDoctor({ verified: true, fee: 180000 })
│   ├── scheduleFactory.js   createSchedule({ dayOfWeek: 6, startTime: '09:00' })
│   └── documentFactory.js
├── fixtures/
│   ├── availability/        (jadwal + pengecualian + slot yang diharapkan, ≥20 kasus)
│   ├── documents/           (PDF & JPG kecil, isinya data karangan)
│   └── ai/                  (response ai-service: done, rejected, timeout)
├── mocks/
│   ├── aiServiceClient.js   (bisa diatur per test, punya counter panggilan)
│   └── storageClient.js     (menangkap key & TTL yang diminta)
├── unit/
├── integration/
└── e2e/
```

**Mock `aiServiceClient` wajib punya counter dan wajib merekam payload.** Banyak
test yang bunyinya "pastikan yang dikirim ke AI sudah tanpa nama pasien" — itu
butuh `expect(aiServiceClient.lastPayload).not.toContain('Rina')`.

**Fixture dokumen tidak boleh berisi data medis orang sungguhan.** Semua karangan.

## 5. Skenario End-to-End Backend (wajib ada semua)

Setiap skenario memeriksa tiga hal: **(a)** status & body response, **(b)** isi
database setelahnya, **(c)** efek samping (socket emit / access log / pemanggilan mock).

### Autentikasi & role
| # | Skenario | Yang diperiksa |
|---|---|---|
| E1 | Register pasien | User + PatientProfile dibuat, password ter-hash, tidak muncul di response |
| E2 | Register dengan `role: 'doctor'` | Ditolak 400, tidak ada user dibuat |
| E3 | Login salah password | 401, pesan tidak membocorkan mana yang salah |
| E4 | `GET /api/me` tanpa token | 401 |
| E5 | Token milik user `isActive: false` | 401 |

### Ketersediaan jadwal
| # | Skenario | Yang diperiksa |
|---|---|---|
| E6 | Availability dokter dengan 1 jadwal Sabtu 09–12, slot 30 menit | 6 slot, `startsAt` UTC benar |
| E7 | Ada 1 janji temu `confirmed` di slot pertama | 5 slot, slot terisi **tidak muncul sama sekali** |
| E8 | Janji temu di slot itu berstatus `cancelled` | 6 slot lagi |
| E9 | `ScheduleException` type `off` seharian | 0 slot di tanggal itu |
| E10 | `ScheduleException` type `extra` di hari libur | Slot tambahan muncul |
| E11 | Slot yang < `MIN_BOOKING_LEAD_MINUTES` dari now | Tidak muncul (waktu di-freeze) |
| E12 | Rentang > 31 hari | 400 |
| E13 | Dokter `verifiedAt` null | 404, tidak membocorkan bahwa dokternya ada |

### Booking
| # | Skenario | Yang diperiksa |
|---|---|---|
| E14 | Booking slot valid | 201, 1 baris `Appointments` `scheduled`, `feeSnapshot` terisi, 2 baris `Reminders` |
| E15 | Booking slot di luar jadwal | 400, 0 baris |
| E16 | **Dua request booking slot sama secara bersamaan** | **Tepat 1 baris tersimpan, request kedua 409** |
| E17 | Booking jam yang sudah dipakai janji temu pasien itu dengan dokter lain | 409 |
| E18 | Booking oleh role `doctor` | 403 + `requiredRole` |
| E19 | Booking dengan `startsAt` bukan awal slot (mis. 09:07) | 400 |
| E20 | Dokter menaikkan tarif setelah booking | `feeSnapshot` lama **tidak berubah** |

### Transisi status
| # | Skenario | Yang diperiksa |
|---|---|---|
| E21 | Dokter confirm `scheduled` | Status `confirmed` |
| E22 | Dokter complete `scheduled` (belum confirmed) | 400, status tidak berubah |
| E23 | Dokter complete `confirmed` sebelum `endsAt` | 400 |
| E24 | Pasien batal < `MIN_CANCEL_LEAD_HOURS` | 400 |
| E25 | Pasien batal jauh hari | `cancelled` + `cancelledAt` + `cancelledBy`, `Reminders` jadi `cancelled` |
| E26 | Reschedule | Baris lama `cancelled`, baris baru dengan `rescheduledFromId`, slot lama kembali kosong |
| E27 | Pasien membatalkan janji temu pasien lain | 403 |

### Dokumen medis & audit
| # | Skenario | Yang diperiksa |
|---|---|---|
| E28 | Upload PDF valid | 201, response **tanpa URL**, 1 baris `DocumentAccessLogs` action `upload` |
| E29 | Upload file 20 MB | 413, tidak ada baris dan tidak ada objek di storage |
| E30 | Upload `.docx` | 415 |
| E31 | Pasien minta signed URL dokumennya | 200 + URL, **1 baris log baru** `view_url_issued` |
| E32 | Pasien minta URL dokumen pasien lain | 403, **tidak ada baris log baru**, `storageClient.signUrl` tidak dipanggil |
| E33 | Dokter tanpa janji temu terkait minta URL | 403 |
| E34 | Dokter dengan janji temu `confirmed` minta URL | 200 + baris log |
| E35 | **Admin minta URL dokumen mana pun** | **403 selalu**, tanpa kecuali |
| E36 | Penulisan access log gagal (mock throw) | 500, **URL tidak diterbitkan** |

### Ringkasan AI
| # | Skenario | Yang diperiksa |
|---|---|---|
| E37 | Minta ringkasan dokumen sendiri | 200, `DocumentSummaries` `done`, disclaimer ada di `summaryText` |
| E38 | Minta ringkasan 2× tanpa perubahan | **`aiServiceClient.callCount === 1`** (cache hit) |
| E39 | `ai-service` balas `rejected` | 422, baris tersimpan `rejected`, **`summaryText` tidak dikirim ke client** |
| E40 | `ai-service` timeout | 200 dengan dokumen apa adanya, baris `failed`, **dokumen tetap bisa diunduh** |
| E41 | Payload yang dikirim ke `ai-service` | Tidak memuat nama/email/telepon pasien dari fixture |
| E42 | Minta ringkasan dokumen pasien lain | 403, `aiServiceClient.callCount === 0` |

### Chat (Socket.IO)
| # | Skenario | Yang diperiksa |
|---|---|---|
| E43 | Connect tanpa token | Ditolak di handshake |
| E44 | Kirim pesan ke percakapan sendiri | Tersimpan, ter-emit ke room, ack `ok: true` |
| E45 | Kirim pesan ke percakapan orang lain | Ditolak, tidak ada baris `Messages` |
| E46 | Client mencoba `join` room sembarangan | Diabaikan, room ditentukan server |

### Pencarian & admin
| # | Skenario | Yang diperiksa |
|---|---|---|
| E47 | `GET /api/doctors` filter spesialisasi + maxFee | Hasil benar, semua `verifiedAt` tidak null |
| E48 | Filter `availableFrom`/`availableTo` | Dokter tanpa slot kosong tidak muncul |
| E49 | Admin verify dokter | `verifiedAt` terisi, dokter muncul di pencarian |
| E50 | `GET /api/admin/stats` | `completionRate` benar, **dihitung `statsService`, bukan AI** |
| E51 | `GET /api/admin/stats` oleh pasien | 403 |

**E16, E32, E35, E36, E41, E42 adalah test paling penting di repo ini.**
E16 menjaga integritas jadwal. Sisanya menjaga kerahasiaan rekam medis.
Dilarang di-`skip` dengan alasan apa pun.

## 6. Skenario Test `ai-service` (pytest)

| # | Skenario | Yang diperiksa |
|---|---|---|
| A1 | `deidentify` teks berisi nama, NIK, telepon, email, alamat | Semuanya hilang dari output |
| A2 | `deidentify` teks berisi nilai lab | Angka dan satuan **tetap utuh** |
| A3 | `guardrail` output memuat "menderita" | `rejected` |
| A4 | `guardrail` output memuat dosis (`500 mg`) | `rejected` |
| A5 | `guardrail` output bersih | Lolos, disclaimer ditempel |
| A6 | Output tanpa disclaimer | Disclaimer ditambahkan otomatis |
| A7 | `inputHash` sama untuk teks bersih yang sama | Hash identik |
| A8 | LLM timeout | Balas `failed`, bukan 500 tanpa penjelasan |
| A9 | `summarize` dipanggil dengan mime tidak didukung | 415 |
| A10 | Pipeline dijalankan tanpa `deidentify` (test regresi) | **Test ini gagal by design** kalau ada yang menambah jalur pintas |

## 7. Aturan Menulis Test

- Nama test menyebut aturan bisnis yang diuji:
  ```js
  describe('accessService.canReadDocument', () => {
    it('mengembalikan false untuk admin, walaupun dokumennya ada', ...);
    it('mengembalikan true untuk dokter yang punya janji temu confirmed dengan pasien itu', ...);
    it('mengembalikan false untuk dokter yang janji temunya masih scheduled', ...);
  });
  ```
- **Waktu wajib di-freeze.** Test lead time booking, batas pembatalan, dan
  pengingat H-24 mustahil stabil kalau bergantung jam nyata:
  ```js
  jest.spyOn(dateHelper, 'now').mockReturnValue(new Date('2026-09-01T03:00:00Z'));
  ```
- **Zona waktu proses test wajib dipatok**: `TZ=UTC` di script npm. Test yang
  lulus di laptop WIB tapi gagal di CI UTC adalah test yang salah tulis.
- Pakai factory, bukan fixture panjang: `await createDoctor({ verified: true })`.
- Test double-booking (E16) wajib benar-benar konkuren:
  ```js
  const results = await Promise.allSettled([bookRequest(), bookRequest()]);
  const created = results.filter((r) => r.value?.status === 201);
  expect(created).toHaveLength(1);
  ```
- Test harus lulus kalau file-nya dijalankan sendirian, bukan cuma sebagai satu
  suite besar.
- Test yang cuma `expect(response.status).toBe(200)` tanpa memeriksa isi
  dianggap tidak menguji apa-apa.

## 8. Yang Memblokir Merge

1. `npm run lint` — 0 error
2. `npm run test:unit` — hijau
3. `npm run test:integration` — hijau
4. `npm run test:e2e` — hijau, tidak ada yang di-skip
5. `pytest` di `ai-service` — hijau
6. Ambang coverage global + per file terpenuhi (Node dan Python)
7. Coverage tidak turun > 0,5 poin dari `main`
8. Migration bisa `up` lalu `down` bersih, termasuk partial unique index
9. Build frontend sukses

## 9. Script npm

```json
{
  "scripts": {
    "test":             "TZ=UTC jest",
    "test:watch":       "TZ=UTC jest --watch",
    "test:unit":        "TZ=UTC jest __tests__/unit",
    "test:integration": "TZ=UTC jest __tests__/integration --runInBand",
    "test:e2e":         "TZ=UTC jest __tests__/e2e --runInBand",
    "test:coverage":    "TZ=UTC jest --coverage",
    "db:migrate:test":  "NODE_ENV=test sequelize db:migrate"
  }
}
```

## 10. Test Frontend (OWNER: Cline)

- Vitest + React Testing Library.
- Coverage minimum: **75%** untuk `src/components` dan `src/pages`, **90%** untuk
  `src/services/api.js`.
- Setiap halaman wajib punya test untuk 4 keadaan: loading, kosong, error, sukses.
- Wajib ada test untuk **409 saat booking → daftar slot dimuat ulang otomatis**,
  bukan pesan error merah lalu diam.
- Wajib ada test bahwa **setiap tampilan ringkasan AI memuat disclaimer**.
- Wajib ada test bahwa signed URL **tidak disimpan** di localStorage atau state
  global yang bertahan setelah pindah halaman.
- Mock API pakai contoh response dari `ARCHITECTURE.md §3` dan `§4`. Kalau
  kontraknya berubah, mock ikut berubah di PR yang sama.
