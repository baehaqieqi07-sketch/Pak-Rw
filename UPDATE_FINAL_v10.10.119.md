# Pak RW v10.10.119 — Hardfix drawKtpGrid Error

Update kecil dan aman.

## Masalah
Hosting masih mengeluarkan error:
`[LEADERBOARD_CANVAS_ERROR] drawKtpGrid is not defined`

## Fix
- Semua panggilan renderer lama `drawKtpGrid` diarahkan ke `drawPodium` + `drawRankingList`.
- Ditambah compatibility alias `drawKtpGrid()` supaya jalur lama tetap aman kalau masih kepanggil.
- Log render diganti dari KTP ke Podium supaya jelas versi yang aktif.
- Background custom user tetap dipakai.

## Tidak diubah
- Tidak reset data.
- Tidak reset database.
- Tidak ubah logic poin.
- Tidak ubah logic level.
- Tidak ubah MOTM.
- Tidak mengaktifkan Loket.
- Tidak generate gambar AI.
