# Pak RW v10.10.70 — Dashboard Clean Finishing

Update ini memakai `Pak Rw.zip` terbaru sebagai baseline dan fokus pada finishing dashboard.

## Fokus utama

- Editor embed lebih rapi dan mudah dipahami.
- Ketik `@` untuk memilih role atau member Discord.
- Ketik `#` untuk memilih channel, category, voice, stage, announcement, forum, dan media channel.
- Picker channel/role dibuat sebagai modal bersih agar tidak menabrak tombol Simpan atau keluar layar.
- Preview Discord memakai nama user/role/channel asli dari picker, bukan label dummy.
- Background foto asli diganti menjadi ilustrasi SVG 2D DESA TULUS yang adem dan ringan.
- Visual dashboard dibuat lebih solid, tidak terlalu transparan, spacing lebih lega, dan form lebih jelas.

## Perubahan dashboard

### Embed Builder

- Content, Description, Field Value: mention disimpan sebagai `<@id>`, `<@&id>`, `<#id>`.
- Title, Author, Footer: otomatis memakai nama biasa supaya tidak muncul teks mentah di Discord.
- Ada petunjuk kecil: `@ role/member` dan `# channel/category/voice`.
- Suggestion dropdown bisa dipilih dengan klik, Arrow Up/Down, Enter, Tab, dan Esc.
- Preview blockquote, emoji GIF, fields, footer, timestamp, buttons, mention, dan custom emoji tetap dirender.

### Discord Picker

- Picker tidak lagi membuka dropdown sempit di dalam card.
- Picker sekarang memakai modal tengah layar dengan overlay.
- Daftar dikelompokkan berdasarkan kategori Discord.
- Pencarian lebih jelas dan tidak tertutup save bar.
- ID lama tetap aman walau channel/role belum ditemukan setelah refresh.

### Discord data API

Endpoint `/api/discord-picker-data` sekarang mengambil:

- semua channel non-thread;
- category;
- voice channel;
- stage voice;
- announcement;
- forum;
- media channel;
- semua role selain `@everyone`;
- member yang tersedia di cache/fetch Discord;
- avatar dan display name member.

Jika member belum lengkap, aktifkan Server Members Intent di Discord Developer Portal.

### Background

- Foto realistis lama tidak dipakai lagi.
- Background diganti menjadi `dashboard/src/assets/desa-tulus-2d.svg`.
- Tidak ada aset eksternal baru.
- Background 2D menggambarkan gunung, sawah, jalan desa, balai warga, rumah desa, dan bambu.

## File utama berubah

- `index.js`
- `package.json`
- `config.json`
- `config.example.json`
- `dashboard/package.json`
- `dashboard/package-lock.json`
- `dashboard/src/app/types.ts`
- `dashboard/src/components/pickers/DiscordPicker.tsx`
- `dashboard/src/components/embed/EmbedBuilder.tsx`
- `dashboard/src/components/embed/DiscordPreview.tsx`
- `dashboard/src/styles/index.css`
- `dashboard/src/assets/desa-tulus-2d.svg`
- `dashboard/public/desa-tulus-2d.svg`
- `dashboard/dist/*`

## Hasil test

```txt
npm run check: berhasil
node --check index.js: berhasil
node --check ai/brain.js: berhasil
node --check utils/cooldown.js: berhasil
node --check db/mongoStore.js: berhasil
npm --prefix dashboard run build: berhasil
1599 modules transformed
```

## Cara pasang

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Build dashboard manual:

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

## Push GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "finish clean dashboard Pak RW v10.10.70"
git push
```

## Catatan aman

Update ini tidak membawa `.env`, token, MongoDB URI, OpenRouter key, `node_modules`, `.git`, data aktif, logs, runtime logs, atau backup. Logic level, poin, voice, Top Aktif, Papan Aktif Lifetime, MOTM, dan MongoDB tidak direset.
