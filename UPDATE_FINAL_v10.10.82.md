# UPDATE FINAL v10.10.82 — Railway npm Registry Lock Fix

## Masalah

Build Railway gagal pada `npm ci` karena beberapa field `resolved` di `package-lock.json` dan `dashboard/package-lock.json` masih mengarah ke registry internal lingkungan build pengembangan yang tidak dapat diakses Railway. Contoh host lama:

```text
packages.applied-caas-gateway1.internal.api.openai.org
```

## Perbaikan

- Seluruh URL `resolved` registry internal diganti ke registry npm publik resmi:

```text
https://registry.npmjs.org/
```

- Root lockfile: 3 URL diperbaiki, termasuk `@discordjs/voice`, `discord-api-types`, dan `prism-media`.
- Dashboard lockfile: 124 URL diperbaiki.
- Tidak ada dependency yang dihapus atau diganti versinya.
- Tidak ada perubahan pada token, database, level, poin, role, KTP, AFK Voice, dashboard, atau data member.

## Verifikasi

- Tidak ada string registry internal tersisa di kedua lockfile.
- Kedua `package-lock.json` valid JSON.
- `node --check index.js` berhasil.
- `npm run check` berhasil menggunakan dependency yang sudah terpasang pada workspace verifikasi.

## Deploy Railway

Setelah file ini dipush ke GitHub, jalankan redeploy. Railway akan menjalankan `npm ci` menggunakan URL paket publik npm.
