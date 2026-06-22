# Pak RW v10.10.122 — Leaderboard Embed Format

Update kecil dan aman.

## Perubahan
- Format embed leaderboard lifetime diganti sesuai request:
  - Title: `🏆 TOP AKTIF WARGA SEPANJANG WAKTU`
  - Description diawali `Update otomatis setiap hari pukul 00.00 WIB`
  - Header list: `🏆 Peringkat Warga:`
  - Quote `>>>` hanya dipakai di awal daftar ranking.
  - Poin tidak dibold supaya tampil clean.
- Arrow tetap memakai emoji config `<a:Animated_Arrow_Bluelite:1512751559140839576>` dengan fallback `➜`.
- Nama user tetap pakai mention Discord jika ada `userId`, supaya tampil sebagai @nama user di Discord.
- Attachment image diganti cache key dari `leaderboard-ktp` ke `leaderboard-podium`.

## Tidak diubah
- Tidak reset data.
- Tidak reset database.
- Tidak ubah logic poin.
- Tidak ubah logic level.
- Tidak ubah MOTM.
- Tidak mengaktifkan Loket.
- Tidak generate gambar AI.
