# Pak RW v10.10.73 — Embed Color Lock #7DBD77

Update ini mengunci seluruh warna embed Discord Pak RW ke warna utama DESA TULUS:

```txt
#7DBD77
```

## Yang diubah

- `config.json` dan `config.example.json`:
  - `embedColor` menjadi `#7DBD77`.
  - semua `config.embeds.*.color` menjadi `#7DBD77`.
  - `suggestion.color` menjadi `#7DBD77`.
  - `boostPoin.announcementColor` dan `boostPoin.endColor` menjadi `#7DBD77`.
- `embed-templates.json`:
  - semua `embed.color` menjadi `8240503` atau `0x7DBD77`.
- `index.js`:
  - helper warna embed dikunci ke `0x7DBD77`.
  - semua `.setColor(...)` yang dipakai embed bot diarahkan ke warna yang sama.
- Dashboard Embed Builder:
  - default color picker memakai `#7DBD77`.
  - preview Discord memakai warna `#7DBD77`.

## Catatan

Update ini tidak mengubah data level, poin, voice, Top Aktif, Papan Aktif Lifetime, MOTM, MongoDB, token, atau file `.env`.

Pesan lama di Discord tidak berubah otomatis. Embed baru atau test send baru akan memakai warna `#7DBD77`.
