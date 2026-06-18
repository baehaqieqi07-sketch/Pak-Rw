# Pak RW v10.10.91 — Background KTP Resmi Tanpa Watermark Tambahan

## Perubahan
- Asset `assets/ktp-desa-tulus-background.png` diganti menggunakan background yang diberikan owner.
- Background disesuaikan tepat ke ukuran renderer 1011×638 tanpa mengubah rasio kartu.
- Watermark, emblem, gunung, sawah, dan ornamen tambahan yang sebelumnya digambar ulang oleh Canvas dihapus.
- Renderer sekarang hanya memakai motif yang sudah menyatu di file background sehingga tidak terjadi efek double.
- Overlay keterbacaan dikurangi menjadi sangat tipis agar warna dan motif background tetap asli.
- Bingkai, teks, avatar, nomor KTP, tombol, command, database, AI, AFK Voice, level, role, dan dashboard tetap dipertahankan.

## Keamanan data
Update tidak mengubah atau mereset `.env`, `config.json`, MongoDB, folder `data`, data KTP, level, poin, role, ataupun konfigurasi server.
