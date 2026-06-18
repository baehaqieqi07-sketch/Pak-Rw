# Pak RW v10.10.89 — KTP Font Railway Hard Fix

## Penyebab

Pada v10.10.88, resolver mencatat `sans-serif` sebagai font aktif walaupun probe semua font gagal. Nilai 97 pixel berasal hampir seluruhnya dari garis aksen judul, bukan tulisan. Railway tidak menyediakan font generic yang dapat dipakai oleh Canvas pada container tersebut.

## Perbaikan

- Tambah dependency `dejavu-fonts-ttf@2.37.3`.
- Daftarkan DejaVu Sans regular dan bold secara eksplisit lewat `GlobalFonts.registerFromPath()`.
- Prioritaskan font dari `node_modules`, lalu fallback host Windows/Linux.
- Jangan pernah menganggap `sans-serif` aktif tanpa probe pixel yang lulus.
- Pindahkan garis aksen keluar dari text layer agar validasi hanya menghitung tulisan.
- Error dibuat spesifik apabila dependency font belum terpasang.
- Desain, background, avatar, tombol, AFK Voice, level, role, dashboard, dan data tidak diubah.
