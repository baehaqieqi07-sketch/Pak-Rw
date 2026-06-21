# Pak RW v10.10.102 — Auto Level Role On-Demand

Update ini fokus ke sistem role level Pak RW. Data level, poin, MongoDB, KTP, AI, AFK Voice, welcome, curhat, saran, voting, dashboard lama, dan fitur lain tidak direset.

## Alur baru role level

- Pak RW tidak lagi membutuhkan role level manual dari dashboard.
- Role level dibuat otomatis hanya saat ada warga yang benar-benar mendapatkan tier tersebut.
- Role kosong tidak langsung dibuat saat bot startup.
- Jika role otomatis sudah ada dan masih dipakai warga, role dipertahankan.
- Jika role otomatis kosong lagi, Pak RW membersihkannya otomatis.
- Setiap warga tetap hanya memiliki satu role level tertinggi yang sesuai.
- Level maksimal tetap 1000.
- Role Level 1000 memakai nama: `Karuhun Desa (Lvl. Max)`.
- Semua role otomatis dibuat dengan warna default/no color supaya warna display name tetap mengikuti role Warga.
- Role otomatis dicoba diposisikan tepat di atas role Warga, selama hierarchy Discord mengizinkan.

## Catatan permission

Pak RW butuh permission `Manage Roles`, dan role bot Pak RW harus berada di atas role Warga serta role level otomatis yang dibuat. Kalau hierarchy Discord tidak mengizinkan, Pak RW akan mencatat log dan tidak merusak data user.

## File yang berubah

- `index.js`
- `level/levelRoleTiers.js`
- `tests/levelRoleTiers.test.js`
- `dashboard/src/pages/manage/ManagePage.tsx`
- `dashboard/src/lib/features.ts`
- `dashboard/src/app/types.ts`
- `config.example.json`
- `package.json`
- `package-lock.json`
- `dashboard/package.json`
- `dashboard/package-lock.json`
- `README.md`

## Test

- Syntax utama dicek.
- Test tier role level lulus.
- Full `npm run check` di environment ini terhenti pada optional native binding `@napi-rs/canvas` milik KTP, bukan karena perubahan level role. Di Railway/Windows setelah `npm ci --registry=https://registry.npmjs.org/`, test KTP biasanya berjalan seperti update sebelumnya.
