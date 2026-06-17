# Pak RW v10.10.75 — Custom Status Discord Otomatis

## Ringkasan

Sistem activity lama yang memakai `ActivityType.Playing`, `ActivityType.Watching`, dan `ActivityType.Listening` telah diganti menjadi Custom Status Discord melalui `ActivityType.Custom` dan properti `state`.

## Daftar status

1. 🗣️ Wilujeung Sumping
2. 🫂 Warga Desa Tulus
3. 😏 Mau Di Temenin?
4. 😏 Jadi 08 Berapa?
5. 👀 Sedang Memantau

Status pertama langsung tampil ketika bot ready. Rotasi berjalan setiap 15 detik dan kembali ke status pertama setelah status kelima. Status utama bot tetap `online`.

## Implementasi

- `ActivityType` tetap memakai import Discord.js yang sudah ada; tidak ada import ganda.
- Daftar status berada pada `PAK_RW_CUSTOM_STATUSES`.
- Durasi rotasi berada pada `PAK_RW_CUSTOM_STATUS_ROTATION_MS`.
- Fungsi rotasi berada pada `startPakRwCustomStatusRotation(discordClient)`.
- Event `client.once(Events.ClientReady, ...)` lama tetap dipakai; tidak dibuat event ready kedua.
- Interval lama dibersihkan sebelum interval baru dibuat.
- Timer memakai `unref()` saat tersedia.
- Perintah owner `setactivity` tetap dikenali, tetapi tidak lagi menimpa presence agar tidak bertabrakan dengan rotasi Custom Status.

## File berubah

- `index.js`
- `package.json`
- `package-lock.json`
- `config.json`
- `config.example.json`
- `README.md`
- `UPDATE_FINAL_v10.10.75.md`

## Keamanan data

Tidak ada perubahan pada command utama, prefix, dashboard, MongoDB schema, level, poin, voice, Top Aktif, Papan Aktif, MOTM, role, channel, atau data warga.

## Mengganti status

Buka `index.js`, cari `PAK_RW_CUSTOM_STATUSES`, lalu ubah teks di dalam array.

## Mengganti waktu rotasi

Buka `index.js`, cari:

```js
const PAK_RW_CUSTOM_STATUS_ROTATION_MS = 15_000;
```

Contoh 30 detik: `30_000`. Contoh 1 menit: `60_000`.
