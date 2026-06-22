# UPDATE FINAL v10.10.108 — Leaderboard Premium PNG + Quote Format

Fokus update ini hanya tampilan Leaderboard / Papan Aktif lifetime Pak RW.

## Aman / tidak diubah

- Tidak reset data member.
- Tidak mengubah logic poin.
- Tidak mengubah logic level.
- Tidak mengubah sistem MOTM.
- Tidak mengubah database member.
- Tidak menghapus command lama.
- Tidak mengubah KTP, AI, AFK Voice, Welcome, Kotak Saran, Loket, Curhat, atau fitur lain.

## Perubahan utama

- Leaderboard lifetime sekarang mengirim embed teks rapi + image PNG otomatis.
- Embed memakai multiline quote `>>>` satu kali di awal daftar ranking.
- Pemisah user dan poin memakai emoji GIF:
  `<a:Desa_Tulus2:1518502350363430932>`
- Format poin memakai format Indonesia, maksimal 2 desimal.
- Ranking maksimal 10 warga.
- Fallback aman kalau data kosong.
- Fallback aman kalau avatar gagal load.
- Jika image gagal dibuat, embed teks tetap dikirim.
- Jika pesan leaderboard lama ada, Pak RW akan edit pesan lama agar tidak spam.
- Jika message lama hilang, Pak RW kirim pesan baru dan simpan messageId baru.

## File baru

- `utils/leaderboardCanvas.js`
- `tests/leaderboardFormat.test.js`

## File yang diubah

- `index.js`
- `package.json`
- `package-lock.json`
- `config.example.json`
- `dashboard/package.json`
- `dashboard/package-lock.json`
- `README.md`

## Command yang ikut pakai tampilan baru

- `rwpapanaktif`
- `rwleaderboardaktif`
- `rwpostpapanaktif`
- `rwpostleaderboardaktif`
- `/papanaktif`
- `/postpapanaktif`

Command tambahan owner/staff:

- `rwpreviewtop`
- `rwpreviewpapanaktif`
- `rwpreviewleaderboardaktif`

Preview tidak mengubah data dan tidak menyimpan messageId.

## Dashboard

Dashboard Top Aktif / Papan Aktif sekarang punya field baru:

- Judul Leaderboard Lifetime
- Warna Leaderboard Lifetime
- Footer Leaderboard Lifetime
- Message ID Leaderboard Lama
- Toggle pakai Image PNG otomatis

## Permission yang dibutuhkan

Pak RW butuh permission channel leaderboard:

- View Channel
- Send Messages
- Embed Links
- Attach Files
- Use External Emojis
- Read Message History

Kalau permission kurang, Pak RW akan mengirim error jelas dan tidak crash.
