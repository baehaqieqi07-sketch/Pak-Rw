# UPDATE FINAL v10.10.85 — KTP Background Resmi Terbingkai Rapi

## Perubahan KTP

- Menggunakan file background yang diberikan pengguna sebagai asset resmi KTP Desa Tulus.
- Canvas mengikuti ukuran asli background: 1011 × 638 piksel.
- Background hanya digambar di dalam rounded frame; area luar bingkai memakai warna frame padat sehingga pola tidak bocor keluar garis.
- Menambahkan double-stroke tipis yang halus untuk hasil lebih premium tanpa terlihat ramai.
- Menata ulang judul, kolom data, jarak baris, area foto, tanggal pembuatan, status warga, watermark, dan footer.
- Tema desa tetap dipertahankan sebagai ornamen sangat tipis dan tidak menabrak teks.
- Foto avatar tetap memiliki fallback inisial sehingga kartu tidak pernah kosong.

## Keamanan Data

- Tidak mengubah struktur penyimpanan KTP.
- Tidak mengganti nomor KTP lama yang sudah valid.
- Tidak menghapus data lokal, MongoDB, level, poin, role, atau konfigurasi channel.
- AFK Voice 24/7 dan perbaikan reconnect dari v10.10.83 tetap dipertahankan.
