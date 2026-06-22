# UPDATE FINAL v10.10.114 — Hotfix Leaderboard Aktif Channel

Update ini memperbaiki error runtime yang muncul setelah deploy:

```txt
LEADERBOARD AKTIF AUTO POST ERROR: getLeaderboardActiveChannel is not defined
```

## Yang diperbaiki

- Menambahkan function `getLeaderboardActiveChannel(guild)` yang sebelumnya terpanggil tetapi belum ada.
- Auto post Leaderboard Aktif sekarang bisa mengambil channel dari beberapa sumber aman:
  - `topActive.leaderboardActiveChannelId`
  - `leaderboard.channelId`
  - `leaderboardAktif.channelId`
  - `papanAktif.channelId`
  - fallback ke `topActive.channelId` / `levelChannelId`
- Channel sekarang dicari dari cache dan fetch Discord, jadi lebih aman ketika cache belum lengkap.
- Debug leaderboard tetap ada, tetapi dibuat ringkas supaya log Railway tidak penuh/kacau.
- Tidak mengubah data member, poin, level, MOTM, leaderboard lama, database, atau command lama.

## Test

```powershell
npm run check
npm --prefix dashboard run build
```

Keduanya lulus.

## Cara pasang

```powershell
Copy-Item -Path "D:\Pak-RW-v10.10.114-Hotfix-Leaderboard-Active-Channel\*" -Destination "D:\Pak Rw" -Recurse -Force
cd "D:\Pak Rw"
npm install
npm --prefix dashboard install
npm run check
npm --prefix dashboard run build
```

## Cara push GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "fix: define leaderboard active channel resolver"
git push origin main
```

Kalau GitHub lebih baru:

```powershell
git pull --rebase origin main
git push origin main
```
