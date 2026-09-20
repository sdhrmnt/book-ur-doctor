# STYLE.md — Gaya Coding Project Ini

> Tiru contoh ✅ persis. Hindari pola ❌.
> Tujuannya bukan "kode paling keren", tapi **kode yang pemiliknya bisa baca dan
> debug sendiri** — dan yang auditnya bisa dijelaskan ke orang lain.

---

## Prinsip Umum

1. Kode ditulis untuk dibaca manusia, bukan untuk pamer.
2. Satu fungsi = satu tanggung jawab, maksimal ~30 baris.
3. Eksplisit lebih baik daripada pintar. Tidak ada "magic".
4. Nama variabel dalam bahasa Inggris, camelCase, deskriptif.
   Pesan ke user dalam bahasa Indonesia.
5. Komentar hanya untuk menjelaskan **kenapa**, bukan **apa**.
6. Dilarang abstraksi prematur: tidak ada factory, decorator, atau generic helper
   sampai pola yang sama muncul minimal 3 kali.

---

## 1. Controller

✅ **BEGINI** — class dengan static method, try/catch, lempar ke `next()`:
```js
class AppointmentController {
  static async findAll(req, res, next) {
    try {
      const { status, dateFrom, dateTo, page = 1, limit = 10 } = req.query;

      const scope = AccessService.appointmentScope(req.user);
      const options = { where: { ...scope }, limit: Number(limit) };
      options.offset = (Number(page) - 1) * Number(limit);
      options.order = [['startsAt', 'DESC']];

      if (status) {
        options.where.status = status;
      }
      if (dateFrom && dateTo) {
        options.where.startsAt = { [Op.between]: [new Date(dateFrom), new Date(dateTo)] };
      }

      const result = await Appointment.findAndCountAll(options);

      res.status(200).json({
        data: result.rows,
        meta: {
          page: Number(page),
          limit: Number(limit),
          totalItems: result.count,
          totalPages: Math.ceil(result.count / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
```

❌ **JANGAN BEGINI** — arrow function anonim, filter role di dalam route, error ditelan:
```js
router.get('/appointments', (req, res) =>
  Appointment.findAll({ where: req.user.role === 'doctor' ? { DoctorProfileId: req.user.id } : {} })
    .then(a => res.json(a))
    .catch(() => res.status(500).send('error')));
```

---

## 2. Error Handling

✅ **BEGINI** — lempar object bernama, ditangani terpusat:
```js
// di controller / service
if (!appointment) {
  throw { name: 'NotFound', message: 'Janji temu tidak ditemukan' };
}
if (appointment.status !== 'confirmed') {
  throw { name: 'BadRequest', message: 'Hanya janji temu terkonfirmasi yang bisa diselesaikan' };
}
if (!AccessService.canReadDocument(actor, document)) {
  throw { name: 'Forbidden', message: 'Kamu tidak berhak membuka dokumen ini', requiredRole: 'patient' };
}
if (error instanceof UniqueConstraintError) {
  throw { name: 'Conflict', message: 'Jadwal ini sudah dipesan pasien lain' };
}
```

```js
// middlewares/errorHandler.js
function errorHandler(error, req, res, next) {
  console.error({ name: error.name, message: error.message, path: req.path });

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({ message: error.errors[0].message });
  }
  if (error.name === 'BadRequest') {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'Unauthorized') {
    return res.status(401).json({ message: error.message });
  }
  if (error.name === 'Forbidden') {
    return res.status(403).json({ message: error.message, requiredRole: error.requiredRole });
  }
  if (error.name === 'NotFound') {
    return res.status(404).json({ message: error.message });
  }
  if (error.name === 'Conflict' || error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ message: 'Jadwal ini sudah dipesan pasien lain' });
  }
  if (error.name === 'PayloadTooLarge') {
    return res.status(413).json({ message: error.message });
  }
  if (error.name === 'UnsupportedMediaType') {
    return res.status(415).json({ message: error.message });
  }
  if (error.name === 'SummaryRejected') {
    return res.status(422).json({ message: 'Ringkasan tidak tersedia untuk dokumen ini' });
  }

  res.status(500).json({ message: 'Internal server error' });
}
```

❌ **JANGAN BEGINI** — `res.status()` berserakan di controller, `catch (e) { console.log(e) }`
tanpa response, atau **memasukkan isi dokumen/pesan pasien ke dalam log error**.

---

## 3. Async/Await

✅ `await` dengan try/catch.
❌ `.then().catch()` berantai, callback bersarang, `Promise.all` tanpa penjelasan.

---

## 4. Pengecekan Hak Akses

✅ **BEGINI** — satu sumber, dipanggil dari middleware dan service:
```js
// services/accessService.js
const CAPABILITIES = {
  patient: ['appointment.book', 'appointment.cancel', 'document.upload',
            'document.read.own', 'summary.request', 'chat.use'],
  doctor:  ['appointment.confirm', 'appointment.complete', 'appointment.cancel',
            'document.read.linked', 'summary.request', 'note.write',
            'schedule.manage', 'chat.use'],
  admin:   ['doctor.create', 'doctor.verify', 'appointment.cancel', 'stats.read'],
};

class AccessService {
  static can(role, capability) {
    return CAPABILITIES[role].includes(capability);
  }

  static async canReadDocument(actor, document) {
    if (actor.role === 'admin') {
      return false;                       // admin TIDAK PERNAH baca data klinis
    }
    if (actor.role === 'patient') {
      return document.PatientId === actor.id;
    }
    const linked = await Appointment.count({
      where: {
        PatientId: document.PatientId,
        DoctorProfileId: actor.DoctorProfileId,
        status: { [Op.in]: ['confirmed', 'completed'] },
      },
    });
    return linked > 0;
  }
}
```

```js
// middlewares/authorize.js
function authorize(capability) {
  return function (req, res, next) {
    try {
      if (!AccessService.can(req.user.role, capability)) {
        throw { name: 'Forbidden', message: 'Kamu tidak berhak melakukan ini', requiredRole: req.user.role };
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// dipakai di route:
router.post('/appointments', authentication, authorize('appointment.book'), AppointmentController.create);
```

❌ **JANGAN BEGINI** — pengecekan role tersebar, tiap tempat beda logika:
```js
if (user.role === 'doctor') { ... }                      // ❌
if (req.user.isAdmin) { ... }                            // ❌
if (['doctor','admin'].includes(req.user.role)) { ... }  // ❌
socket.on('message', (data) => { if (socket.user.role === 'patient') ... }) // ❌
```

---

## 5. Ketersediaan Jadwal

✅ **BEGINI** — satu service, waktu masuk sebagai parameter, output slot murni:
```js
// services/availabilityService.js
class AvailabilityService {
  static async build({ DoctorProfileId, from, to, now }) {
    const schedules = await DoctorSchedule.findAll({ where: { DoctorProfileId } });
    const exceptions = await ScheduleException.findAll({
      where: { DoctorProfileId, date: { [Op.between]: [from, to] } },
    });
    const booked = await Appointment.findAll({
      where: {
        DoctorProfileId,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        startsAt: { [Op.between]: [from, to] },
      },
      attributes: ['startsAt'],
    });

    const bookedKeys = new Set(booked.map((row) => row.startsAt.toISOString()));
    const days = [];

    for (const date of eachDate(from, to)) {
      const ranges = applyExceptions(rangesFor(schedules, date), exceptions, date);
      const slots = ranges
        .flatMap((range) => sliceIntoSlots(range))
        .filter((slot) => !bookedKeys.has(slot.startsAt.toISOString()))
        .filter((slot) => slot.startsAt >= addMinutes(now, MIN_BOOKING_LEAD_MINUTES));

      if (slots.length > 0) {
        days.push({ date, ClinicId: ranges[0].ClinicId, slots });
      }
    }

    return { DoctorProfileId, days };
  }
}
```

❌ **JANGAN BEGINI**:
```js
await Slot.findAll({ where: { isBooked: false } });   // ❌ tidak ada tabel Slots
const now = new Date();                               // ❌ di dalam service, tidak bisa di-test
slots.map(s => ({ ...s, isBooked: bookedKeys.has(s) })) // ❌ jangan bocorkan slot terisi
```

---

## 6. Booking dan Double-Booking

✅ **BEGINI** — andalkan constraint database, tangkap error-nya:
```js
async function book({ PatientId, DoctorProfileId, ClinicId, startsAt, now }, transaction) {
  const isOpen = await AvailabilityService.isSlotOpen({ DoctorProfileId, ClinicId, startsAt, now });
  if (!isOpen) {
    throw { name: 'BadRequest', message: 'Slot ini di luar jadwal praktik dokter' };
  }

  try {
    return await Appointment.create({
      PatientId,
      DoctorProfileId,
      ClinicId,
      startsAt,
      endsAt: addMinutes(startsAt, SLOT_DURATION_MINUTES),
      status: 'scheduled',
      feeSnapshot: doctor.consultationFee,
    }, { transaction });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw { name: 'Conflict', message: 'Jadwal ini sudah dipesan pasien lain' };
    }
    throw error;
  }
}
```

❌ **JANGAN BEGINI** — pola cek-lalu-insert, dua request bersamaan lolos dua-duanya:
```js
const existing = await Appointment.findOne({ where: { DoctorProfileId, startsAt } });
if (existing) {
  throw { name: 'BadRequest', message: 'Sudah dipesan' };
}
await Appointment.create({ ... });    // ❌ race condition
```

---

## 7. Uang dan Waktu

✅ **BEGINI**:
```js
// helpers/money.js — fungsi murni, tanpa I/O
function formatRupiah(amount) {
  return `Rp ${amount.toLocaleString('id-ID')}`;   // Rp 180.000
}
```

```js
// helpers/dateHelper.js — supaya bisa di-freeze saat test
function now() {
  return new Date();
}

// helpers/timeRange.js — konversi jam lokal klinik ke UTC, eksplisit
function toUtc(dateOnly, timeOnly, timezone) { }
```

❌ **JANGAN BEGINI**:
```js
const fee = parseFloat(input);                     // ❌ uang jangan float
const fee = 180000.00;                             // ❌ tidak ada sen di project ini
if (new Date() > appointment.startsAt) { ... }     // ❌ di dalam service, tidak bisa di-test
startsAt: '2026-09-05 09:00'                       // ❌ string jam lokal, zona waktu hilang
const rupiah = 'Rp ' + fee;                        // ❌ Rp 180000, tanpa pemisah ribuan
```

Waktu di service selalu diterima sebagai parameter atau lewat `dateHelper.now()`.
Test pengingat H-24 dan batas pembatalan mustahil ditulis kalau `new Date()`
dipanggil langsung di dalam logika.

Semua `startsAt`/`endsAt` disimpan UTC. Konversi ke `Asia/Jakarta` hanya di
komponen React dan di teks notifikasi.

---

## 8. Dokumen Medis

✅ **BEGINI** — satu pintu ke storage, audit log dalam transaksi yang sama:
```js
// services/documentService.js
static async issueViewUrl({ actor, documentId, ipAddress, userAgent }, transaction) {
  const document = await MedicalDocument.findByPk(documentId, { transaction });
  if (!document) {
    throw { name: 'NotFound', message: 'Dokumen tidak ditemukan' };
  }

  const allowed = await AccessService.canReadDocument(actor, document);
  if (!allowed) {
    throw { name: 'Forbidden', message: 'Kamu tidak berhak membuka dokumen ini' };
  }

  await DocumentAccessLog.create({
    MedicalDocumentId: document.id,
    ActorId: actor.id,
    action: 'view_url_issued',
    ipAddress,
    userAgent,
  }, { transaction });

  return storageClient.signUrl(document.storageKey, SIGNED_URL_TTL_SECONDS);
}
```

❌ **JANGAN BEGINI**:
```js
res.json({ url: `https://bucket.s3.amazonaws.com/${doc.storageKey}` });  // ❌ URL permanen
DocumentAccessLog.create({ ... });                  // ❌ tanpa await, gagal diam-diam
console.log('membuka dokumen', doc.originalName);   // ❌ nama file pasien masuk log
await s3.getSignedUrl(...)                          // ❌ langsung, bukan lewat storageClient
```

---

## 9. Memanggil AI

✅ **BEGINI** — satu pintu, timeout eksplisit, gagal tidak menghancurkan alur:
```js
// ai/aiServiceClient.js — SATU-SATUNYA file yang memanggil ai-service
async function summarize(payload, { timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${process.env.AI_SERVICE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.AI_SERVICE_INTERNAL_KEY,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw { name: 'AIError', message: 'AI service error' };
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
```

```js
// pemakaian: dokumen tetap selamat walaupun AI mati
let summary = null;
try {
  summary = await summaryService.generate(document);
} catch (error) {
  console.error({ event: 'summary.failed', documentId: document.id, name: error.name });
  await DocumentSummary.create({ MedicalDocumentId: document.id, status: 'failed' });
}
res.status(200).json({ data: { document, summary } });
```

❌ **JANGAN BEGINI**:
```js
await fetch(LLM_PROVIDER_URL, ...)                     // ❌ Node tidak pernah panggil LLM langsung
const answer = await summarize(`Apakah pasien ini menderita anemia? ${text}`); // ❌ minta diagnosis
await summarize({ text: rawOcrText })                  // ❌ belum di-de-identifikasi
console.log(summary.summaryText)                       // ❌ isi medis masuk log
```

Di `ai-service`, urutan `extractor → deidentify → summarizer → guardrail` tidak
boleh dilewati atau dibalik. Kalau kamu menambah jalur baru, jalur itu wajib
melewati `deidentify.py` juga.

---

## 10. Middleware

✅ Satu file satu middleware, nama file = nama fungsi:
`middlewares/authentication.js`, `middlewares/authorize.js`,
`middlewares/upload.js`, `middlewares/errorHandler.js`

```js
async function authentication(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw { name: 'Unauthorized', message: 'Silakan login terlebih dahulu' };
    }

    const payload = verifyToken(header.split(' ')[1]);
    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive) {
      throw { name: 'Unauthorized', message: 'Sesi tidak valid' };
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}
```

Role dibaca ulang dari DB, **tidak** dipercaya dari isi token.

---

## 11. Socket.IO

✅ **BEGINI** — autentikasi di handshake, otorisasi lewat `accessService`:
```js
// sockets/index.js
io.use(async (socket, next) => {
  try {
    const payload = verifyToken(socket.handshake.auth.token);
    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive) {
      return next(new Error('Unauthorized'));
    }
    socket.data.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    next(new Error('Unauthorized'));
  }
});
```

```js
// sockets/chatHandler.js
socket.on('message:send', async (payload, ack) => {
  try {
    const message = await ChatService.send(socket.data.user, payload);
    io.to(`conversation:${message.ConversationId}`).emit('message:new', message);
    ack({ ok: true, data: message });
  } catch (error) {
    ack({ ok: false, message: error.message });
  }
});
```

❌ **JANGAN BEGINI**:
```js
io.on('connection', (socket) => { socket.join(socket.handshake.query.room); }); // ❌ user pilih room sendiri
socket.on('message', (d) => Message.create(d));    // ❌ tanpa validasi kepemilikan percakapan
console.log('pesan:', payload.body);               // ❌ isi chat pasien masuk log
```

Room selalu ditentukan server dari `Conversations` yang benar-benar melibatkan
user tersebut. Client tidak pernah memilih room sendiri.

---

## 12. React Component

✅ **BEGINI** — function component, satu komponen satu file, state eksplisit:
```jsx
function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function fetchAppointments() {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await api.get('/appointments');
      setAppointments(response.data.data);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Gagal memuat janji temu');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, []);

  if (isLoading) return <p>Loading...</p>;
  if (errorMessage) return <p className="error">{errorMessage}</p>;
  if (appointments.length === 0) return <EmptyState message="Belum ada janji temu" />;

  return (
    <div className="appointment-list">
      {appointments.map((appointment) => (
        <AppointmentRow key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
}
```

**Khusus project ini:** setiap halaman booking wajib menangani **409** dengan
memuat ulang daftar slot, bukan menampilkan pesan merah lalu diam:
```jsx
if (error.response?.status === 409) {
  setErrorMessage('Jadwal itu baru saja dipesan orang lain. Ini jadwal terbaru:');
  await fetchAvailability();
  return;
}
```

Dan setiap halaman yang menampilkan ringkasan AI wajib menampilkan disclaimer:
```jsx
<p className="summary-disclaimer">
  Ringkasan otomatis. Bukan diagnosis dan bukan pengganti konsultasi dokter.
</p>
```

❌ **JANGAN BEGINI** — custom hook untuk hal sepele, komponen 300 baris, ternary
bersarang di JSX, satu file berisi 5 komponen, menyimpan signed URL ke state
global yang bertahan setelah pindah halaman.

---

## 13. CSS

✅ **BEGINI** — kelas deskriptif, mobile ditangani lewat media query:
```css
.doctor-card {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
}

.doctor-card__fee {
  font-weight: 600;
}

@media (max-width: 768px) {
  .doctor-card {
    width: 100%;
  }
}
```

❌ Inline style untuk hal yang berulang, `!important`, nama kelas seperti `.a1`,
`.box2`, atau utility class buatan sendiri yang meniru Tailwind.

---

## 14. Penamaan

| Jenis | Aturan | Contoh |
|---|---|---|
| Variabel & fungsi | camelCase | `consultationFee`, `fetchAvailability` |
| Boolean | awali `is`/`has`/`can` | `isLoading`, `hasActiveAppointment`, `canReadDocument` |
| Class & Component | PascalCase | `AppointmentController`, `DoctorCard` |
| File model/controller | PascalCase | `AppointmentController.js` |
| File lain | camelCase | `errorHandler.js`, `availabilityService.js` |
| File Python | snake_case | `deidentify.py`, `llm_client.py` |
| Fungsi Python | snake_case | `extract_text`, `strip_identifiers` |
| Konstanta | UPPER_SNAKE | `SLOT_DURATION_MINUTES`, `SIGNED_URL_TTL_SECONDS` |
| Konstanta env | UPPER_SNAKE | `AI_SERVICE_URL`, `JWT_SECRET` |
| Kolom FK | PascalCase + Id | `DoctorProfileId`, `MedicalDocumentId` |

Dilarang singkatan tidak jelas: `p`, `d`, `tmp`, `data2`, `handleThing`, `appt`,
`doc` (untuk dokumen maupun dokter — dua-duanya ambigu di project ini).

---

## 15. Yang Dilarang Keras

- Chaining lebih dari 2 level dalam satu baris
- Ternary bersarang
- `var`
- `==` (pakai `===`)
- **Menyimpan tarif sebagai float**
- **Membuat tabel, kolom, atau cache `Slots`**
- **Mencegah double-booking dengan pola cek-lalu-insert**
- **Angka ajaib.** `30` → `SLOT_DURATION_MINUTES`, `900` → `SIGNED_URL_TTL_SECONDS`,
  `2` → `MIN_CANCEL_LEAD_HOURS`. Semua di `config/constants.js`
- **Pengecekan role di luar `services/accessService.js`**
- **Memanggil object storage di luar `storage/storageClient.js`**
- **Memanggil `ai-service` di luar `ai/aiServiceClient.js`**
- **Memanggil API LLM dari Node, atau dari file Python selain `llm_client.py`**
- **Menerbitkan URL dokumen tanpa menulis `DocumentAccessLogs`**
- **Mengirim teks dokumen ke LLM tanpa melewati `deidentify.py`**
- **Menulis kalimat diagnosis, dosis, atau saran pengobatan di prompt maupun output**
- **Menyimpan waktu sebagai string jam lokal**
- Logic bisnis di dalam file route atau socket handler
- Query database langsung di dalam React component
- `console.log` sisa debugging (pakai `console.error` untuk error sungguhan)
- **Menyimpan isi dokumen medis, hasil OCR, nama file pasien, atau isi chat ke log**
- Menghapus atau mengomentari kode orang lain tanpa penjelasan di PR
