# UPDATE FINAL v10.10.83 — KTP Warga dan AFK Voice Stabil

## KTP Warga

- Background resmi `assets/ktp-desa-tulus-background.png` dimuat sebelum canvas dibuat.
- Canvas mengikuti ukuran asli background `1011 × 638`.
- Background digambar satu kali paling awal; seluruh judul, enam data warga, avatar/inisial, tanggal, status, catatan, dan footer digambar setelahnya.
- PNG baru dibuat setelah seluruh elemen selesai.
- Nama attachment dibuat unik per revisi untuk mencegah Discord memakai cache kartu kosong lama saat pesan KTP diperbarui.
- KTP lama dan nomor KTP yang sudah valid tetap dipertahankan.

## AFK Voice 24/7

- Error saat membuat voice connection ditangani aman dan tidak menghentikan startup bot.
- Status `Ready` diverifikasi bersama voice state member bot di channel tujuan.
- Perpindahan, kick, disconnect sementara, destroyed connection, dan error koneksi ditangani dengan satu lifecycle reconnect bertahap.
- Tidak melakukan loop reconnect saat channel hilang, tipe channel salah, permission View/Connect kurang, atau channel penuh.
- Status dashboard membaca koneksi nyata, termasuk self mute, self deaf, auto reconnect, error terakhir, dan waktu disconnect.
- Hanya satu operasi connect/reconnect berjalan dalam satu waktu.

## Keamanan data

Tidak ada reset atau penghapusan pada MongoDB, data KTP, nomor KTP, level, EXP, poin chat/voice, leaderboard, role, welcome, panel, AI, atau konfigurasi fitur lama.
