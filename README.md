# Pak RW / DESA TULUS v10.10.63

**Release:** Live Discord Channel & Role Picker & Binding Center  
**Branding publik:** Pak RW / DESA TULUS / Balai Warga Digital  
**Prefix publik:** `rw`

Update ini merombak dashboard besar-besaran supaya tidak lagi terasa seperti versi lama. Dashboard baru dibuat sebagai **control center premium bot Discord** dengan visual cinematic perdesaan DESA TULUS, plugin cards, tombol Manage, halaman manage per fitur, preview Discord, placeholder klik-copy, dan Embed Manager global.

## Perbaikan utama v10.10.63 — channel benar-benar bisa dipilih

Dashboard sekarang mengambil daftar channel dan role **langsung dari Discord melalui API internal** setiap halaman dibuka. Alurnya:

1. Buka halaman fitur atau `Channel Picker`.
2. Tunggu status hijau `Terhubung ke DESA TULUS`.
3. Klik dropdown channel.
4. Pilih nama channel, bukan menyalin ID.
5. Klik **Simpan**.

Perbaikan teknis:

- `GUILD_ID` diprioritaskan agar dashboard membaca server yang benar.
- Endpoint live baru: `/api/discord-picker-data`.
- Daftar channel dan role dapat dimuat ulang tanpa restart bot.
- Dropdown tetap menampilkan pilihan lama jika data Discord sedang terlambat dimuat.
- Channel dikelompokkan berdasarkan Text, Announcement, Forum, Voice, dan Category di picker besar.
- Config tetap menyimpan ID asli sehingga mention Discord bekerja benar.
- Tidak ada perubahan pada data level, poin, Top Aktif, Papan Aktif, MOTM, atau MongoDB.


## Yang baru di v10.10.63


- **Discord Data Picker** di setiap Manage Page dan Embed Manager:
  - pilih Channel langsung dari server
  - pilih Role langsung dari server
  - pilih User/Member yang sudah terbaca bot
  - pilih Server atau bot Pak RW
  - masukkan sebagai tag Discord asli, nama biasa, atau ID
- **Field aktif otomatis**: klik Content/Description/Title/Footer, lalu tekan `Masukkan Data`.
- **Perlindungan field Discord**: kalau tag dipasang di Title/Author/Footer, dashboard otomatis memakai nama biasa supaya tidak muncul sebagai teks mentah `<@ID>`.
- **Channel Placeholder Center**: `/dashboard/manage/channel-manager` untuk menghubungkan `{rulesChannel}`, `{chatWargaChannel}`, `{ticketChannel}`, `{leaderboardChannel}`, dan placeholder channel lain ke pilihan channel Discord.
- **Role Placeholder Center**: `/dashboard/manage/role-manager` untuk menghubungkan `{memberTulusRole}`, `{staffRole}`, `{adminRole}`, `{motmRole}`, `{donaturRole}`, dan `{juraganRole}` ke pilihan role Discord.
- Preview sekarang membaca nama channel/role asli dari server dan menampilkan mention seperti Discord.
- Judul Welcome default memakai `{displayName}`, bukan `{user}`, karena Title Discord tidak mendukung mention asli.
- Route dashboard utama baru: `/dashboard`
- Root `/` otomatis masuk ke `/dashboard`
- `/studio` diarahkan ke dashboard baru
- Route manage per fitur:
  - `/dashboard/manage/welcome`
  - `/dashboard/manage/ai`
  - `/dashboard/manage/curhat`
  - `/dashboard/manage/curhat-anonim`
  - `/dashboard/manage/saran`
  - `/dashboard/manage/level`
  - `/dashboard/manage/cek-poin`
  - `/dashboard/manage/top-aktif`
  - `/dashboard/manage/papan-aktif`
  - `/dashboard/manage/motm`
  - `/dashboard/manage/manual-motm`
  - `/dashboard/manage/donatur`
  - `/dashboard/manage/juragan`
  - `/dashboard/manage/mabar`
  - `/dashboard/manage/boost-poin`
  - `/dashboard/manage/embed`
  - `/dashboard/manage/channel-manager`
  - `/dashboard/manage/role-manager`
  - `/dashboard/manage/command-center`
  - `/dashboard/manage/permission-center`
  - `/dashboard/manage/logs-health`
  - `/dashboard/manage/backup-center`
- Background dashboard baru: cinematic village / Balai Warga Digital DESA TULUS.
- Plugin & Manage Center seperti dashboard bot besar: status, tombol Manage, card fitur, dan alur edit jelas.
- Manage Page per fitur: kiri form setting, kanan preview Discord, tombol Save/Test/Reset, warning channel/role kosong.
- Embed Manager global untuk semua template embed utama.
- Placeholder library lengkap dan bisa klik-copy.
- Mention aman: `@everyone` dan `@here` diblokir dari preview/template dashboard.
- Papan Aktif Lifetime dipisah dari Top Aktif Bulanan.
- Top Aktif Bulanan memakai title template otomatis: `🏆 TOP AKTIF WARGA BULAN {month} {server}`.
- MOTM 100.000 poin tetap: role otomatis, cycle reset, lifetime tidak reset.
- AI Pak RW tetap hemat: `openai/gpt-4o-mini`, cooldown, global cooldown, local cache, fallback lokal.
- DisCloud tetap aman RAM 100 MB.

## File penting yang berubah

- `index.js`
  - Menambahkan Discord Data Picker, Placeholder Binding Center, dan perlindungan mention pada field embed.
  - Menambahkan route `/dashboard` dan `/dashboard/manage/:feature`.
  - Menambahkan Manage Page, Global Embed Manager, preview Discord, Discord Data Picker, Channel/Role Placeholder Center, dan CSS cinematic desa.
- `config.json`
  - Menambahkan setting dashboard rebuild.
  - Menambahkan `papanAktif` dan `leaderboardAktif`.
  - Menambahkan placeholder library lengkap.
  - Menambahkan template embed `welcome`, `papanAktif`, `boostPoinActive`, `boostPoinEnd`, dan `aiFallback`.
- `config.example.json`
  - Disamakan dengan struktur config baru tanpa rahasia.
- `package.json`
  - Deskripsi release diperbarui.
- `README.md`
  - Dokumentasi update baru.

## Cara pasang di lokal

Extract ZIP ke:

```bat
D:\Pak Rw
```

Lalu jalankan:

```bat
cd /d "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Kalau dashboard mau dibuka, isi ENV:

```env
DASHBOARD_ENABLED=true
DASHBOARD_PASSWORD=ISI_PASSWORD_DASHBOARD
PORT=3000
```

Lalu buka:

```txt
http://localhost:3000/dashboard
```

## Cara test aman

```bat
npm.cmd run check
```

Hasil yang diharapkan:

```txt
node --check index.js
node --check ai/brain.js
node --check utils/cooldown.js
node --check db/mongoStore.js
```

Saat start, target database yang bagus:

```txt
✅ MongoDB connected
🗄️ Database mode: MongoDB
```

Kalau masih:

```txt
Database mode: Local JSON fallback
```

berarti cek `MONGODB_URI`, DNS, atau Atlas Network Access.

## Cara push GitHub

```bat
cd /d "D:\Pak Rw"
git status
git add .
git commit -m "update Pak RW live Discord picker v10.10.63"
git push
```

Repo:

```txt
https://github.com/baehaqieqi07-sketch/Pak-Rw.git
```

## Railway redeploy

1. Pastikan repo Railway mengarah ke `baehaqieqi07-sketch/Pak-Rw`.
2. Root Directory kosong kalau file ada di root.
3. Branch `main`.
4. Isi ENV lewat Railway Variables, bukan `.env`.
5. Setelah `git push`, Railway auto deploy.

## DisCloud deploy

`discloud.config` harus tetap:

```txt
NAME=Pak RW
TYPE=bot
MAIN=index.js
RAM=100
VERSION=latest
START=npm start
AUTORESTART=true
```

Buat ZIP publik tanpa file berat/rahasia:

```powershell
cd "D:\Pak Rw"
$exclude = @("node_modules", ".git", "logs", "runtime-logs", "backups", "data")
Get-ChildItem -Force | Where-Object { $exclude -notcontains $_.Name } | Compress-Archive -DestinationPath "D:\pak-rw-discloud.zip" -Force
```

## Penting

- Jangan commit `.env`.
- Jangan commit `node_modules`.
- Jangan commit `data`, `logs`, `runtime-logs`, `backups`.
- Jangan masukkan token Discord, MongoDB URI asli, OpenRouter key, password dashboard, CLIENT_ID, atau GUILD_ID ke GitHub/chat publik.
- Update ini tidak menghapus data lama.
- Level, poin, Top Aktif, Papan Aktif Lifetime, MOTM, Donatur, Juragan, dan MongoDB data tidak direset.
- Nama collection MongoDB internal lama boleh tetap untuk anti-reset data, tapi tidak tampil di branding publik.

---

## Dashboard-Only Rebuild v10.10.64

Dashboard Pak RW sekarang dipisah menjadi aplikasi React/Vite di folder `dashboard/` dan disajikan sebagai static production build oleh Express. Core bot tetap dijalankan dengan `npm start` dan tidak bergantung pada Vite development server.

Dokumentasi lengkap, route, komponen, hasil build, pengujian, deploy, serta rollback tersedia di:

```text
DASHBOARD_REBUILD_v10.10.64.md
```

Build dashboard:

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

Jalankan project utama:

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```
