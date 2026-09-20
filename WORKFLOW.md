# WORKFLOW.md — Alur Kerja Harian (Owner + 3 Agent)

> Dokumen ini menjawab **bagaimana** kerjaan mengalir sehari-hari. Aturan
> (apa yang boleh/dilarang) tetap di `AGENTS.md`. File ini hanya boleh
> diubah oleh manusia, sama seperti `AGENTS.md`.

---

## 1. Siklus Satu Task

```
OWNER                    AGENT                              OWNER
  │                         │                                  │
  ├─ buat GitHub Issue ─────┤                                  │
  │  (1 issue = 1 task,     │                                  │
  │   pakai template sesuai │                                  │
  │   agent, isi acceptance │                                  │
  │   criteria dari SPEC.md)│                                  │
  │                         │                                  │
  │                         ├─ baca urutan wajib AGENTS.md §0  │
  │                         │  (SPEC → ARCHITECTURE → ERD →    │
  │                         │   STYLE → TESTING → file target) │
  │                         │                                  │
  │                         ├─ kalau task non-trivial:          │
  │                         │  kirim rencana singkat ──────────►│
  │                         │                                  ├─ approve / revisi
  │                         │◄─────────────────────────────────┤
  │                         │                                  │
  │                         ├─ git checkout -b <type>/<no>-<slug>
  │                         ├─ commit test: (RED)               │
  │                         ├─ commit feat: (GREEN)              │
  │                         ├─ push, buka PR (isi template)      │
  │                         │                                  │
  │                         ├─ CI jalan otomatis ───────────────┤
  │                         │  (lint, unit, integration, e2e,   │
  │                         │   pytest, coverage gate)          │
  │                         │                                  │
  │◄────────────────────────┤  PR siap direview                │
  ├─ review ─────────────────────────────────────────────────────►
  │  (cek "Yang TIDAK saya kerjakan", cek ASUMSI:, cek bukti)    │
  │                         │                                  │
  ├─ merge (squash) ────────┤                                  │
  ├─ tutup issue ───────────┤                                  │
```

## 2. Kapan Agent Harus Berhenti dan Tanya (bukan Jalan Terus)

Urutan eskalasi, dari `AGENTS.md §8`:

1. Jawaban ada di `SPEC.md` / `ARCHITECTURE.md` / `ERD.md` → **pakai itu**, jangan tanya.
2. Tidak ada di manapun → **berhenti**, tulis pertanyaan di komentar issue, jangan lanjut menulis kode untuk bagian yang ambigu itu.
3. Owner tidak merespons dan agent terpaksa jalan (misal sesi tidak diawasi): pilih opsi paling ketat soal akses data medis, tulis `ASUMSI:` di deskripsi PR, dan **beri label `asumsi`** di PR-nya supaya owner tahu harus review ekstra teliti.

Agent **tidak pernah** memilih diam-diam dan lanjut seolah tidak ada keraguan.

## 3. Penomoran Branch & Issue

- Branch: `<type>/<nomor-issue>-<slug-singkat>`, contoh `feat/12-availability-service`.
- `type` sama dengan tipe commit: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`.
- Satu issue → maksimal satu branch aktif. Kalau task ternyata harus dipecah,
  agent menutup issue lama dengan komentar pemecahan dan owner membuka issue baru.

## 4. Urutan Rilis Task per Sprint (saran, bukan aturan kaku)

Supaya agent tidak saling menunggu file yang belum ada:

1. **Claude Code duluan** untuk fondasi: `availabilityService`, `accessService`,
   skema DB/migration — karena Cline & Antigravity butuh kontrak endpoint yang
   sudah stabil (`ARCHITECTURE.md §4`) sebelum bisa kerja produktif.
2. **Cline** menyusul begitu endpoint yang dibutuhkan sudah ada responsnya di
   `ARCHITECTURE.md`, bukan menunggu implementasi selesai 100% — kontrak
   response sudah cukup untuk mulai bikin UI + mock.
3. **Antigravity** paralel dari awal untuk `.github/**` (template, CI) karena
   tidak bergantung pada kode aplikasi sama sekali.

## 5. Checklist Owner Sebelum Merge

- [ ] Deskripsi PR mengikuti format `AGENTS.md §5` lengkap (termasuk bagian
      "Yang TIDAK saya kerjakan / ragu" — bukan kosong tanpa alasan)
- [ ] CI hijau semua (lint, unit, integration, e2e, pytest, coverage gate)
- [ ] File yang diubah hanya yang disebut di issue (cek diff, bukan cuma judul PR)
- [ ] Kalau ada label `asumsi` → baca `ASUMSI:` di deskripsi, putuskan diterima
      atau minta revisi
- [ ] Commit history menunjukkan `test:` sebelum `feat:` (lihat `TESTING.md §1`)

## 6. Kalau Ada Konflik Antar Agent

Contoh: Cline butuh field baru di response `GET /api/doctors`, tapi field itu
hanya boleh ditambah oleh Claude Code (`server/**`), dan menyentuh kontrak di
`ARCHITECTURE.md` (file yang hanya boleh diubah manusia).

Alurnya:
1. Cline **tidak** menambah field sendiri di frontend dengan asumsi bentuknya.
2. Cline membuka issue baru berlabel `agent:claude-code`, deskripsinya:
   field apa yang dibutuhkan dan kenapa.
3. Owner memutuskan apakah field itu masuk scope, lalu **owner** yang update
   `ARCHITECTURE.md` (bukan agent mana pun).
4. Baru setelah `ARCHITECTURE.md` diupdate, issue untuk Claude Code dibuka
   untuk implementasi.

Ini memastikan `ARCHITECTURE.md` tetap jadi satu-satunya sumber kebenaran
kontrak antar folder, tidak pernah "disepakati diam-diam" lewat chat.
