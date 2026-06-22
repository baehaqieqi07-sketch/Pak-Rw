# Pak RW v10.10.127 — Fix Footer Icon URL

Hotfix aman.

## Masalah
Footer masih menampilkan icon lama karena footer embed memakai URL/CDN icon, bukan text emoji.

## Perubahan
- Semua reference icon footer versi lama diganti ke:
  `<a:Desa_Tulus2:1518502350363430932>`
- Footer icon URL diarahkan ke:
  `https://cdn.discordapp.com/emojis/1518502350363430932.gif?size=64&quality=lossless`
- Emoji panah leaderboard tetap:
  `<a:Animated_Arrow_Bluelite:1512751559140839576>`

## Tidak diubah
- Emoji panah tidak diganti.
- Emoji lain tidak diganti massal.
- Tidak reset data.
- Tidak reset database.
- Tidak ubah logic poin.
- Tidak ubah logic level.
- Tidak ubah MOTM.
- Tidak generate gambar AI.
