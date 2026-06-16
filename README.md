# Pak RW / DESA TULUS v10.10.66

Pak RW adalah bot dan Balai Warga Digital untuk server **DESA TULUS**. Versi ini menyelesaikan alur **Boost Poin Event** dan menyinkronkan ulang embed Level, Cek Poin, Top Aktif, Papan Aktif Lifetime, Juragan, serta footer DESA TULUS.

## Update v10.10.66

### Boost Poin Event

Halaman:

```txt
/dashboard/manage/boost-poin
```

Alur dashboard:

1. Tentukan nama event.
2. Isi multiplier, misalnya `x10`.
3. Isi durasi dalam menit.
4. Pilih mode Chat, Voice, atau Chat dan Voice.
5. Pilih Channel Pengumuman, Channel Chat, Voice Channel, dan user pengaktif langsung dari data Discord.
6. Pilih apakah event selesai otomatis dan apakah embed awal/akhir dikirim.
7. Tekan **Mulai event dan kirim embed**.
8. Saat durasi habis, multiplier kembali ke `x1` dan embed selesai dikirim. Owner juga dapat menekan **Hentikan sekarang**.

Contoh perhitungan:

```txt
Poin dasar: 5
Multiplier: x10
Bonus event: 45
Total masuk: 50 poin
```

Event hanya memengaruhi channel dan tipe aktivitas yang dipilih. Data level, poin lifetime, Top Aktif, Papan Aktif, dan MongoDB tidak direset.

### Embed Discord

Template yang diperbarui:

- `levelUp`
- `levelProfile`
- `topActiveBoard`
- `papanAktif`
- `juragan`
- `boostPoinActive`
- `boostPoinEnd`

Semua footer aktif memakai:

```txt
DESA TULUS • Nama Fitur
```

Dengan footer icon animasi Discord:

```txt
https://cdn.discordapp.com/emojis/1516424353934348299.gif
```

Custom emoji animasi di Title/Description ditampilkan sebagai GIF pada Discord dan pada live preview dashboard. User, role, dan channel dikirim sebagai mention Discord asli menggunakan ID yang dipilih dari dashboard.

## Menjalankan project

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Build ulang dashboard:

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

## Environment

Gunakan Variables Railway/hosting, jangan commit `.env`:

```env
DISCORD_TOKEN=ISI_TOKEN_BOT_DISCORD
CLIENT_ID=ISI_CLIENT_ID_BOT
GUILD_ID=ISI_ID_SERVER_DESA_TULUS
MONGODB_URI=ISI_MONGODB_URI_ATLAS
OPENROUTER_API_KEY=ISI_OPENROUTER_API_KEY
AI_KEY=ISI_OPENROUTER_API_KEY
DASHBOARD_ENABLED=true
DASHBOARD_PASSWORD=ISI_PASSWORD_DASHBOARD
NODE_ENV=production
PORT=3000
OT_PORT=3000
```

Buka dashboard:

```txt
http://localhost:3000/dashboard
```

## Push GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "update Pak RW boost poin dan embed final v10.10.66"
git push
```

## Keamanan data

Jangan upload:

- `.env`
- `node_modules`
- `data`
- `logs`
- `runtime-logs`
- `backups`
- token/API key/password

Update ini mempertahankan MongoDB, level, poin, lifetime point, voice, Top Aktif, Papan Aktif, MOTM, Donatur, Juragan, dan konfigurasi server yang sudah aktif.
