# Pak RW v10.10.79 — KTP Dashboard Path Fix

## Perbaikan utama

Dashboard sebelumnya menolak penyimpanan field KTP dengan pesan:

```text
Path config tidak diizinkan: ktpSystem.enabled
```

Penyebabnya adalah root `ktpSystem` belum dimasukkan ke allowlist adapter pengaturan dashboard.

## Yang diperbaiki

- Menambahkan `ktpSystem` ke `pakRwDashboardAllowedRoots` di `index.js`.
- Semua field dashboard KTP sekarang diizinkan melalui adapter aman, termasuk:
  - `ktpSystem.enabled`
  - `ktpSystem.channelId`
  - `ktpSystem.cooldownSeconds`
  - `ktpSystem.allowUpdate`
  - teks panel, tombol, kartu, footer, dan background path
- Proteksi path rahasia tetap aktif.
- Token, password, MongoDB URL, dan API key tetap tidak dapat disimpan melalui endpoint dashboard.
- Tidak ada perubahan pada level, poin, role, database, command, atau data KTP warga.

## Hasil verifikasi

- `node --check index.js` berhasil.
- `npm run check` berhasil.
- Dashboard production build berhasil.
- Audit allowlist memastikan `ktpSystem.enabled` dan `ktpSystem.channelId` diterima.
