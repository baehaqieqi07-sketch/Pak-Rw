# Pak RW / DESA TULUS v10.10.65

Versi final dashboard **Pak RW Control Center — Balai Warga Digital DESA TULUS**.

Update ini berfokus pada perapihan dan penyelesaian dashboard web. Core bot Discord, command, level, poin, voice tracker, scheduler Top Aktif, Papan Aktif Lifetime, MOTM, MongoDB, serta data warga tidak dirombak.

## Perbaikan final

- Shell React/Vite baru dengan sidebar, topbar, Feature Center, Manage Page, dan responsive drawer.
- Background perdesaan realistis yang sudah dioptimasi menjadi WebP.
- Channel picker dan role picker searchable dengan nama Discord yang mudah dibaca; ID tetap disimpan internal.
- Halaman Welcome memiliki pilihan jelas untuk channel Welcome, role Member Tulus, channel Aturan, Chat Warga, dan Ticket.
- Embed Builder memiliki pilihan sisipkan placeholder/channel/role/user tanpa mengetik manual.
- Mention aman: Content dan Description dapat memakai mention asli; Title, Author, dan Footer otomatis memakai nama biasa.
- Preview Discord, validasi config, status koneksi, peringatan setup, toast, loading, dan save bar dirapikan.
- Route dashboard lama dialihkan ke dashboard React baru agar tidak membuka UI lama yang berantakan.
- UI dashboard tidak menggunakan emoji Unicode; icon memakai Lucide SVG.
- Dashboard dapat dimatikan sepenuhnya dengan `DASHBOARD_ENABLED=false`.

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

## Environment dashboard

```env
DASHBOARD_ENABLED=true
DASHBOARD_PASSWORD=ISI_PASSWORD_DASHBOARD
PORT=3000
OT_PORT=3000
```

Discord picker membutuhkan:

```env
DISCORD_TOKEN=ISI_TOKEN_BOT_DISCORD
GUILD_ID=ISI_ID_SERVER_DESA_TULUS
```

Dashboard menampilkan nama channel/role, tetapi config tetap menyimpan Discord ID.

## Route utama

```txt
/dashboard
/dashboard/activity
/dashboard/manage/welcome
/dashboard/manage/ai
/dashboard/manage/curhat
/dashboard/manage/curhat-anonim
/dashboard/manage/saran
/dashboard/manage/level
/dashboard/manage/cek-poin
/dashboard/manage/top-aktif
/dashboard/manage/papan-aktif
/dashboard/manage/motm
/dashboard/manage/donatur
/dashboard/manage/juragan
/dashboard/manage/mabar
/dashboard/manage/boost-poin
/dashboard/manage/embed
/dashboard/channel-manager
/dashboard/role-manager
/dashboard/placeholder-center
/dashboard/banner-manager
/dashboard/command-center
/dashboard/permission-center
/dashboard/logs
/dashboard/backup
/dashboard/settings
```

## GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "finish Pak RW dashboard v10.10.65"
git push
```

## Railway

- Repository: `baehaqieqi07-sketch/Pak-Rw`
- Branch: `main`
- Root Directory: kosong
- Start Command: `npm start`
- Isi rahasia melalui Railway Variables, bukan file `.env` di GitHub.

## DisCloud

`discloud.config` tetap menggunakan `RAM=100` dan `START=npm start`.

## Keamanan data

ZIP publik tidak menyertakan `.env`, `node_modules`, `data`, `logs`, `runtime-logs`, `backups`, atau rahasia. Jangan menghapus collection MongoDB lama karena dapat memutus data warga yang sudah ada.

Laporan lengkap tersedia di `DASHBOARD_FINAL_v10.10.65.md`.
