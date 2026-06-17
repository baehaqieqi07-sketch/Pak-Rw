# Pak RW v10.10.76 — Auto Level Role Terpusat

Update ini menyambungkan role tingkatan langsung ke sistem level Pak RW yang sudah ada. Tidak ada sistem EXP atau level kedua. Angka level dari data lama tetap menjadi sumber utama, sedangkan nama tingkatan selalu dihitung melalui `level/levelRoleTiers.js`.

## Tingkatan resmi

| Minimum level | Tingkatan |
|---:|---|
| 1 | Warga Anyar |
| 5 | Warga Tetap |
| 10 | Warga Aktif |
| 20 | Warga Teladan |
| 30 | Tokoh Warga |
| 50 | Sesepuh Desa |
| 100 | Penggerak Desa |
| 150 | Tokoh Desa |
| 200 | Pemuka Desa |
| 300 | Panutan Desa |
| 400 | Kehormatan Desa |
| 500 | Legenda Desa |
| 750 | Kebanggaan Desa |
| 1000 | Karuhun Desa |

Level dikunci pada maksimum 1000. Semua nama di embed level, profil, leaderboard, dashboard, log, dan auto role berasal dari fungsi pusat `getLevelTier()`.

## Alur runtime

1. Pesan valid atau aktivitas voice menambah poin melalui sistem lama.
2. Pak RW menghitung level terbaru tanpa mengubah rumus lama.
3. Jika level naik, data disimpan.
4. Pak RW mencari tier tertinggi yang sesuai.
5. Hanya role tier lama yang terdaftar yang dicabut.
6. Satu role tier terbaru diberikan.
7. Satu embed level-up dikirim ke channel level.

Role staff, admin, moderator, booster, Donatur, Juragan, gender, minat, dan role lain tidak disentuh.

## Dashboard

Buka:

```text
/dashboard/manage/level
```

Di halaman ini owner dapat:

- mengaktifkan atau mematikan sistem level;
- mengaktifkan atau mematikan Auto Level Role;
- memilih satu channel level;
- memilih seluruh 14 role tier langsung dari daftar role Discord;
- menyimpan ID role tanpa mengetik manual.

Jika `autoLevelRole` dimatikan, poin dan level tetap berjalan tetapi Pak RW tidak menambah atau mencabut role tier. Jika sistem level dimatikan, poin, level, dan role level tidak berubah.

## Command pemeriksaan

```text
paksynclevelroles
pakceklevelrole @member
paksynclevelrole @member
```

- `paksynclevelroles` hanya untuk owner dan membuat backup sebelum memproses warga dalam batch 5 member dengan jeda.
- `pakceklevelrole` dapat digunakan owner/staff untuk membandingkan level tersimpan, tier seharusnya, role seharusnya, dan role yang sedang dimiliki.
- `paksynclevelrole` memperbaiki satu member tanpa mengubah poin atau level.

Alias prefix `rw` juga tersedia: `rwsynclevelroles`, `rwceklevelrole`, dan `rwsynclevelrole`.

## Susunan role Discord

Susun role dari atas ke bawah:

```text
Pak RW
Karuhun Desa
Kebanggaan Desa
Legenda Desa
Kehormatan Desa
Panutan Desa
Pemuka Desa
Tokoh Desa
Penggerak Desa
Sesepuh Desa
Tokoh Warga
Warga Teladan
Warga Aktif
Warga Tetap
Warga Anyar
@everyone
```

Pak RW wajib memiliki:

```text
Manage Roles
View Channel
Send Messages
Embed Links
Read Message History
```

## Proteksi data

- Tidak mereset level, poin chat, poin voice, lifetime point, atau leaderboard.
- Tidak mengubah schema MongoDB lama.
- Data lama tetap dibaca dan role dihitung dari level saat ini.
- Sinkronisasi massal tidak dijalankan otomatis setiap startup.
- Sinkronisasi massal membuat file backup lokal di folder `backups/`.
- Error role, hierarchy, permission, member keluar, atau role hilang hanya dicatat di log dan tidak mematikan bot.

## File utama yang berubah

```text
index.js
level/levelRoleTiers.js
tests/levelRoleTiers.test.js
config.json
config.example.json
package.json
package-lock.json
dashboard/src/app/types.ts
dashboard/src/lib/features.ts
dashboard/src/pages/manage/ManagePage.tsx
dashboard/dist/*
dashboard_archive/index.dashboard-legacy-v10.10.63.js
README.md
UPDATE_FINAL_v10.10.76.md
```

## Pengujian

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd run dashboard:build
npm.cmd start
```

Test tier mencakup batas minimum dan maksimum setiap tingkatan, termasuk Level 1000 dan input di atas 1000 yang dikunci menjadi Karuhun Desa.

## Hasil verifikasi build dan dashboard

```text
npm run check: berhasil
Auto Level Role tier tests: 28 boundary cases passed
Vite production build: berhasil
1599 modules transformed
/login: HTTP 200
/dashboard tanpa login: redirect ke /login
/dashboard setelah login: HTTP 200
/api/dashboard/bootstrap: 14 tier, Warga Anyar sampai Karuhun Desa
DASHBOARD_ENABLED=false: dashboard tidak memuat listener web
```

Pemberian role langsung ke server Discord belum dijalankan di lingkungan build karena token, server, dan role ID asli sengaja tidak disertakan. Setelah seluruh role dipilih di dashboard dan role Pak RW ditempatkan paling atas, gunakan `pakceklevelrole @member` lalu `paksynclevelrole @member` untuk uji satu warga sebelum menjalankan sinkronisasi massal.
