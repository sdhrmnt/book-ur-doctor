<!--
Format ini wajib, lihat AGENTS.md §5. Jangan menghapus bagian mana pun,
termasuk kalau isinya "tidak ada".
-->

## Issue terkait
Closes #

## Apa yang dikerjakan
-

## File yang diubah
-

## Bukti jalan
<!-- Tempel output terminal asli, bukan ringkasan. -->

```
$ npm test

```

```
$ npm run test:coverage

```

<!-- Kalau PR ini di ai-service/, tempel juga output pytest -->
```
$ pytest

```

## Yang TIDAK saya kerjakan / ragu
<!--
Wajib diisi jujur (AGENTS.md §5). Menulis "tidak ada" padahal ada keraguan
dianggap pelanggaran berat. Kalau memang benar-benar tidak ada keraguan,
tulis alasannya secara singkat, bukan cuma "tidak ada".
-->
-

## ASUMSI (isi hanya kalau ada)
<!--
Isi HANYA kalau kamu terpaksa memutuskan sendiri karena owner tidak
merespons (AGENTS.md §8 poin 3). Tambahkan label `asumsi` ke PR ini kalau
bagian ini diisi.
-->

## Checklist
- [ ] Test ditulis sebelum kode (`test:` commit mendahului `feat:` di riwayat)
- [ ] Tidak menambah dependency baru
- [ ] Tidak menyentuh file di luar folder milik agent ini (lihat `AGENTS.md §2`)
- [ ] Tidak mengubah `SPEC.md`/`PRD.md`/`ARCHITECTURE.md`/`ERD.md`/`STYLE.md`/`TESTING.md`
- [ ] Coverage tidak turun >0,5 poin dari `main`
