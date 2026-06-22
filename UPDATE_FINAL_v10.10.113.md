# UPDATE FINAL v10.10.113 — Pak RW Desa Tulus

Fokus update ini: memperbaiki total image leaderboard agar tidak kosong, menambahkan kontrol background leaderboard dari dashboard, menonaktifkan fitur Loket/Loket Desa dari bot dan dashboard, serta menjaga semua data lama tetap aman.

## Perubahan utama

### 1. Leaderboard image tidak kosong lagi
- Canvas leaderboard tetap 1200 x 900.
- Semua teks digambar dengan helper `drawSafeText()` agar `globalAlpha`, warna, alignment, baseline, dan font selalu aman sebelum render.
- Data user dinormalisasi dari banyak kemungkinan field: `points`, `point`, `totalPoints`, `totalPoint`, `score`, `xp`, `exp`, `lifetimeTotal`.
- Jika data hanya punya `userId`, bot mencoba hydrate dari Discord member untuk ambil `displayName` dan avatar.
- List ranking 1–10 sekarang menampilkan rank, avatar/fallback, nama, panah biru, dan poin.
- Podium top 3 sekarang menampilkan medal, avatar/fallback, nama, dan poin.
- Footer image tetap: `Pak RW • Desa Tulus Leaderboard`.
- Jika avatar/background gagal, bot fallback aman dan tidak crash.

### 2. Background leaderboard dari dashboard/config
- Config leaderboard mendukung `backgroundMode`, `backgroundUrl`, `backgroundPath`, `backgroundUploadPath`, `backgroundOverlay`, `backgroundDarken`, dan `backgroundBlur`.
- Background default tetap gradient dark premium.
- Background custom URL/upload gagal akan fallback ke default gradient.
- Overlay gelap tetap dipakai agar teks selalu terbaca.

### 3. Loket / Loket Desa dinonaktifkan
- Loket disembunyikan dari dashboard React.
- Loket disembunyikan dari dashboard server lama.
- Loket tidak masuk allowed dashboard roots.
- Loket tidak tampil di help.
- Command lama `loket`, `loketpanel`, dan `kirimpaneloket` tidak menjalankan fitur lagi.
- Button/select/modal Loket lama akan dibalas bahwa fitur sudah dinonaktifkan.
- Data/config Loket lama tidak dihapus paksa, hanya dijadikan legacy ignored.

### 4. Dashboard lebih aman dan rapi
- Menu Loket dihapus.
- Embed editor tidak menampilkan key Loket.
- Channel manager tidak menampilkan channel Loket.
- Dashboard build ulang dari source terbaru.

## Yang tidak disentuh

- Tidak reset database.
- Tidak reset data member.
- Tidak ubah logic poin lama.
- Tidak ubah logic level lama.
- Tidak ubah MOTM lama.
- Tidak hapus command lama selain Loket dinonaktifkan.
- Tidak mengubah update welcome text delay sebelumnya.

## Test yang sudah dijalankan

```bash
npm run check
npm --prefix dashboard run build
```

Keduanya berhasil.

## Cara pasang lokal

```powershell
Copy-Item -Path "D:\Pak-RW-v10.10.113-Leaderboard-Dashboard-Loket-Off\*" -Destination "D:\Pak Rw" -Recurse -Force
cd "D:\Pak Rw"
npm install
npm --prefix dashboard install
npm run check
npm --prefix dashboard run build
```

## Cara push ke GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "fix: finalize leaderboard image and disable Loket"
git push origin main
```

Kalau GitHub lebih baru:

```powershell
git pull --rebase origin main
git push origin main
```
