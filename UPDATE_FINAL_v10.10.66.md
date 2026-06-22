# Pak RW v10.10.66 — Boost Event & Embed Final

## Scope

Update ini menambahkan lifecycle Boost Poin yang dapat dikendalikan melalui dashboard dan merapikan embed Discord utama sesuai format DESA TULUS. Data aktif dan schema MongoDB tidak diubah.

## Boost Poin

### Dashboard control

- Toggle fitur aktif/nonaktif.
- Nama event.
- Multiplier `x1` sampai `x100`.
- Durasi dalam menit.
- Mode Chat, Voice, atau Chat + Voice.
- Searchable Discord picker untuk:
  - channel pengumuman;
  - channel chat target;
  - voice channel target;
  - user pengaktif.
- Toggle selesai otomatis.
- Toggle pengumuman saat mulai.
- Toggle pengumuman saat selesai.
- Tombol mulai event.
- Tombol berhenti manual.
- Status event, multiplier, durasi, dan waktu selesai.

### Runtime flow

1. Dashboard menyimpan konfigurasi aman.
2. Saat Start ditekan, `eventActive=true`, `startedAt` dan `endsAt` dibuat.
3. Bonus dihitung dengan rumus `base × (multiplier - 1)`.
4. Hanya aktivitas dan channel target yang mendapat multiplier.
5. Watcher memeriksa waktu selesai setiap 15 detik.
6. Saat selesai otomatis/manual, `eventActive=false` dan poin kembali x1.
7. Embed akhir dikirim jika opsi pengumuman aktif.
8. Kegagalan mengirim embed tidak membatalkan status event; dashboard menampilkan peringatan yang jelas.

## Embed yang diperbarui

### Level Up

- Mention warga asli pada content.
- Animated rocket title.
- Rank, level, total poin, target level berikutnya, chat, dan voice.
- Footer icon DESA TULUS animasi.

### Cek Poin

- Mention warga asli.
- Animated loading title.
- Level/poin/progress Chat dan Voice.
- Total rank, level, dan poin.

### Top Aktif Bulanan

- Author DESA TULUS.
- Bulan dan tahun otomatis dari WIB.
- Top Voice dan Top Chat.
- Mention user asli dan animated arrow.
- Auto post pukul 00.00 WIB tetap memakai scheduler lama.

### Papan Aktif Lifetime

- Penjelasan cycle 100.000 poin.
- Lifetime point tidak direset.
- Rank, lifetime level, dan mention user asli.

### Juragan Desa

- User dan role mention asli.
- Voice VIP dan channel Juragan dipilih dari Discord picker.
- Bonus poin +15% dan benefit lain.

### Footer

Semua template aktif menggunakan icon URL custom emoji `1518502350363430932` dan teks `DESA TULUS • ...`. Custom emoji tidak ditulis mentah di footer karena Discord footer tidak merender syntax emoji; emoji digunakan sebagai `iconURL` agar benar-benar tampil.

## File berubah

```txt
index.js
config.json
config.example.json
embed-templates.json
package.json
package-lock.json
README.md
UPDATE_FINAL_v10.10.66.md
dashboard/package.json
dashboard/package-lock.json
dashboard/src/lib/api.ts
dashboard/src/pages/manage/ManagePage.tsx
dashboard/src/pages/PlaceholderCenter.tsx
dashboard/src/components/embed/DiscordPreview.tsx
dashboard/src/styles/index.css
dashboard/dist/*
```

## Test result

```txt
npm run check: PASS
Vite production build: PASS
1599 modules transformed
```

Static responsive rules were checked for desktop/tablet/mobile and the production bundle compiled successfully. Browser screenshot automation could not access localhost because Chromium in the build environment blocks local navigation by administrator policy. Live Discord sending was not executed because the ZIP intentionally contains no token or GUILD_ID.

## Install

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

## Rollback

1. Set `DASHBOARD_ENABLED=false` to disable the dashboard without stopping the bot.
2. Revert the Git commit or restore the previous v10.10.65 ZIP.
3. Do not replace active `data/`, `.env`, or MongoDB contents during rollback.
