# Pak RW v10.10.118 — Fix Podium Preview Render

Update kecil dan aman.

## Perubahan
- Memperbaiki renderer leaderboard podium yang masih memanggil fungsi lama `drawKtpGrid`.
- Renderer sekarang memanggil `drawPodium` dan `drawRankingList`.
- Preview leaderboard podium bisa dirender sesuai layout screenshot referensi.
- Background custom user tetap dipakai.

## Tidak diubah
- Tidak reset data.
- Tidak reset database.
- Tidak ubah logic poin.
- Tidak ubah logic level.
- Tidak ubah MOTM.
- Tidak mengaktifkan Loket.
- Tidak generate image AI.
