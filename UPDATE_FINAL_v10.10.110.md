# Pak RW — Fix Total Image Leaderboard

Update ini fokus ke **image leaderboard Pak RW / Desa Tulus** saja.

## Yang diperbaiki

- `utils/leaderboardCanvas.js` dirender ulang total agar gambar leaderboard tidak kosong.
- Canvas tetap `1200 x 900`.
- Header jelas: `TOP AKTIF WARGA` + subtitle update `00.00 WIB`.
- List kiri menampilkan ranking 1–10 lengkap: rank, avatar/fallback, nama, panah static biru, dan poin format Indonesia.
- Podium kanan menampilkan top 3 lengkap: badge rank, avatar/fallback, nama, dan poin.
- Footer image: `<a:Desa_Tulus2:1518502350363430932> <a:Desa_Tulus2:1518502350363430932> DESA TULUS |`.
- Data leaderboard dinormalisasi dari berbagai property: `points`, `point`, `totalPoints`, `totalPoint`, `lifetimeTotal`, `score`, `xp`, `exp`.
- Nama dinormalisasi dari `displayName`, `globalName`, `username`, `name`, `tag`.
- Avatar error tidak menghentikan render; fallback lingkaran inisial dipakai.
- Background custom aman: default, URL, upload dashboard, overlay, darken, blur, dan fallback ke gradient kalau gagal.
- Embed tetap memakai quote `>>>` sekali dan arrow GIF untuk teks embed.
- Pengiriman tetap embed + `attachment://leaderboard.png`; kalau image gagal, embed teks tetap aman.
- Auto post tetap edit message lama jika `messageId` ada, jadi tidak spam channel.

## Dashboard

Di React dashboard bagian **Papan Aktif Lifetime** ditambahkan section **Leaderboard Image Background**:

- Enable image leaderboard
- Background mode: Default / URL / Upload
- Input URL background
- Upload background image
- Overlay darkness slider
- Darken slider
- Blur slider
- Preview image leaderboard
- Reset default

Endpoint baru:

- `POST /api/dashboard/leaderboard/upload`
- `GET /api/dashboard/leaderboard/background`
- `GET /api/dashboard/leaderboard/preview.png`

## Yang tidak diubah

- Tidak reset data member.
- Tidak mengubah logic poin.
- Tidak mengubah logic level.
- Tidak mengubah MOTM.
- Tidak mengubah database member.
- Tidak menghapus command lama.
- Tidak mengubah fitur lain.
