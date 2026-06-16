# Pak RW Dashboard-Only Rebuild v10.10.64

## Scope

Update ini hanya membangun ulang dashboard web. Core bot Discord, command handler, AI response logic, perhitungan level/poin, voice tracker, scheduler Top Aktif, Papan Aktif lifetime, MOTM, MongoDB schema, dan data warga tidak dirombak.

Project referensi `tulus-design-reference-main` hanya dipakai untuk mempelajari pemisahan komponen, Vite production build, live preview, CSS variables, responsive layout, dan penggunaan icon SVG. Branding, cosmic background, animasi bintang, serta layout profil tidak disalin.

## Arsitektur baru

```text
dashboard/
  public/
    desa-tulus-landscape.webp
    pak-rw-mark.svg
  src/
    app/
      App.tsx
      DashboardContext.tsx
      types.ts
    components/
      background/VillageBackdrop.tsx
      embed/DiscordPreview.tsx
      embed/EmbedBuilder.tsx
      pickers/DiscordPicker.tsx
      ui/Button.tsx
      ui/Card.tsx
      ui/StatusBadge.tsx
      ui/Toast.tsx
      ui/Toggle.tsx
    layouts/AppShell.tsx
    lib/api.ts
    lib/features.ts
    pages/DashboardHome.tsx
    pages/PlaceholderCenter.tsx
    pages/SystemPages.tsx
    pages/manage/ManagePage.tsx
    styles/index.css
    styles/theme.css
  dist/
  index.html
  package.json
  package-lock.json
  vite.config.ts
dashboard_archive/
  index.dashboard-legacy-v10.10.63.js
  README.md
```

## Route dashboard baru

```text
/dashboard
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
/dashboard/activity
/dashboard/logs
/dashboard/backup
/dashboard/settings
```

## API adapter baru

```text
GET  /api/dashboard/bootstrap
PUT  /api/dashboard/settings
PUT  /api/dashboard/embed/:key
POST /api/dashboard/test-embed
GET  /api/dashboard/health
GET  /api/discord-picker-data
```

Adapter hanya menerima path config yang masuk allowlist. Path token, secret, password, API key, dan MongoDB URI ditolak. Config lama dibaca apa adanya dan hanya field yang dipilih yang diperbarui.

## Fitur dashboard

- Application shell baru dengan sidebar berkelompok, topbar, mobile drawer, global search, status bot, dan account action.
- Home baru dengan hero perdesaan DESA TULUS, runtime summary, quick actions, overview cards, recent activity, dan feature center.
- Manage page per fitur dengan tab Umum, Channel & Role, Konten, Embed, Izin, dan Aktivitas.
- Searchable channel picker, role picker, dan user picker dari Discord cache/API.
- Universal Embed Builder dengan content, author, title, description, color, fields, thumbnail, image, footer, timestamp, buttons, preview device, save, test send, reset, dan copy JSON.
- Discord preview memakai struktur data draft yang sama dengan endpoint save/test.
- Placeholder Center dengan kategori User, Server, Role, Channel, Level & Poin, Event, dan Waktu.
- Channel Manager dan Role Manager yang menyimpan ID tetapi menampilkan nama Discord.
- Logs & Health, Backup Center, Permission Center, Command Center, Banner Manager, Settings, dan Activity.
- Semua icon UI memakai Lucide SVG. Tidak ada emoji Unicode pada UI dashboard.
- Background WebP lokal teroptimasi, overlay, fog, grain, dan parallax ringan.
- `prefers-reduced-motion` didukung.

## Hasil build

```text
dist/index.html                  0.81 kB
dist/assets/index CSS          45.25 kB
dist/assets/app JS             71.63 kB
dist/assets/icons JS           29.84 kB
dist/assets/vendor JS         165.25 kB
dist/desa-tulus-landscape.webp 49.74 kB
```

Vite production build berhasil.

## Hasil pengujian

### Syntax check

```text
node --check index.js
node --check ai/brain.js
node --check utils/cooldown.js
node --check db/mongoStore.js
```

Semua berhasil.

### Dashboard enabled

Diuji dengan `DASHBOARD_ENABLED=true` pada port test:

- `GET /login`: HTTP 200
- akses `/dashboard` tanpa sesi: redirect ke `/login`
- login password benar: redirect ke `/dashboard`
- `GET /dashboard`: HTTP 200
- static JavaScript asset: HTTP 200
- `GET /dashboard/manage/welcome`: HTTP 200
- `GET /api/dashboard/bootstrap`: HTTP 200
- safe settings patch: HTTP 200
- unsafe `DISCORD_TOKEN` patch: HTTP 400

### Dashboard disabled

Diuji dengan `DASHBOARD_ENABLED=false`:

- web server tidak dijalankan
- proses bot tetap dapat melanjutkan startup normal
- tidak ada requirement untuk memuat React dashboard

### Responsive

CSS production memiliki breakpoint untuk desktop, laptop/tablet, drawer mobile, grid satu kolom, preview mobile, sticky save bar, tombol minimal 40-44px, dan pencegahan overflow pada picker/preview. Headless Chromium pada lingkungan build memblokir akses localhost dengan kebijakan administrator, sehingga screenshot browser otomatis tidak dapat dibuat di lingkungan ini. Build dan route HTTP tetap berhasil diuji dengan curl.

## Install

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Dashboard production build sudah ikut di dalam `dashboard/dist`. Untuk rebuild frontend:

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

Aktifkan dashboard:

```env
DASHBOARD_ENABLED=true
DASHBOARD_PASSWORD=ISI_PASSWORD_DASHBOARD
PORT=3000
```

## Push GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "rebuild Pak RW realistic village dashboard"
git push
```

## Railway

1. Pastikan repo source `baehaqieqi07-sketch/Pak-Rw` branch `main`.
2. Root Directory kosong.
3. Isi Variables di Railway, bukan file `.env`.
4. Pastikan `DASHBOARD_ENABLED=true` dan `DASHBOARD_PASSWORD` terisi.
5. Push GitHub untuk memicu redeploy.

## DisCloud

`discloud.config` tetap menggunakan RAM 100 MB. Untuk runtime bot ringan, dashboard dapat dimatikan:

```env
DASHBOARD_ENABLED=false
```

Jika dashboard diaktifkan di hosting lain, static production build disajikan oleh Express tanpa Vite development server.

## Rollback

Cara paling cepat agar bot tetap online tanpa dashboard:

```env
DASHBOARD_ENABLED=false
```

Kemudian restart service.

Untuk rollback penuh, gunakan ZIP/commit v10.10.63 atau pulihkan `dashboard_archive/index.dashboard-legacy-v10.10.63.js` beserta config backup sebelumnya. Jangan menimpa MongoDB, `data/`, backup aktif, atau file `.env`.
