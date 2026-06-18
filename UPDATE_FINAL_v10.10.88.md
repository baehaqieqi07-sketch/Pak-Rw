# Pak RW v10.10.88 — KTP Text Layer Railway Fix

## Penyebab pasti

Renderer v10.10.87 mengunci seluruh tulisan ke font `DejaVu Sans` tanpa mendaftarkan font tersebut. Di runtime Railway/Linux font itu tidak tersedia dengan nama yang sama, sehingga `@napi-rs/canvas` tetap menghasilkan PNG berisi background dan avatar tetapi pemanggilan `fillText()` tidak menghasilkan pixel tulisan. Pengujian lama hanya memeriksa ukuran PNG dan perubahan umum terhadap background, sehingga gambar kosong tulisan masih dapat lolos.

## Perbaikan

- Font KTP dipilih melalui pemeriksaan pixel nyata pada runtime.
- Generic font `sans-serif` diprioritaskan agar kompatibel dengan Railway/Linux.
- Berat font memakai `bold`/`normal`, bukan hanya numeric weight.
- Judul, enam baris identitas, tanggal, status, dan footer dirender pada canvas transparan terpisah.
- Text layer divalidasi berdasarkan jumlah pixel terlihat sebelum digabungkan ke kartu final.
- Jika text layer gagal, renderer membatalkan pengiriman dengan error jelas dan tidak mengirim KTP kosong.
- State Canvas direset: alpha, composite, alignment, baseline, shadow, dan clip.
- Data kosong menggunakan fallback aman dan nama panjang dipotong agar tetap muat.
- Log diagnostik menampilkan awal render, ukuran canvas, status avatar, jumlah pixel teks, dan ukuran buffer PNG.
- Background resmi, watermark Desa Tulus, avatar, nomor KTP lama, MongoDB, level, poin, role, AFK Voice, dashboard, dan konfigurasi lama tetap dipertahankan.

## File yang diubah

- `services/ktpWarga.js`
- `tests/ktpWarga.test.js`
- `package.json` dan `package-lock.json`
- metadata versi di `index.js`, `config.example.json`, dashboard, dan README

## Log sukses

```text
[KTP WARGA] Font Canvas aktif: sans-serif (Railway-safe).
[KTP WARGA] Render teks berhasil: ... pixel • font sans-serif.
[KTP WARGA] Buffer PNG berhasil dibuat: ... bytes.
```

## Pengujian

- text layer benar-benar menghasilkan pixel tulisan
- enam baris data tampil
- font fallback Railway aktif
- nama panjang tetap muat
- data kosong memakai fallback
- PNG 1011×638 valid
- background tidak keluar bingkai
- attachment anti-cache tetap aktif
- AFK Voice v10.10.87 tetap lulus test

## Keamanan data

Tidak ada reset atau migrasi destruktif. Update hanya mengubah renderer KTP dan metadata versi.
