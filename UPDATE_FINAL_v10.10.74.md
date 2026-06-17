# Pak RW v10.10.74 — Rotasi Activity Discord Otomatis

Update ini hanya menambahkan rotasi activity/presence Discord pada bot Pak RW. Logic command, database, dashboard, level, poin, voice, Top Aktif, Papan Aktif, MOTM, dan data warga tidak diubah.

## Activity yang digunakan

1. `🗣️ Wilujeung Sumping` — Playing
2. `🫂 Warga Desa Tulus` — Watching
3. `😏 Mau Di Temenin?` — Listening
4. `😏 Jadi 08 Berapa?` — Playing
5. `👀 Sedang Memantau` — Watching

Activity pertama langsung dipasang saat `ClientReady`, lalu berganti setiap 15 detik dan kembali ke urutan pertama setelah activity terakhir.

## Keamanan interval

- Menggunakan satu variabel interval global.
- Interval lama selalu dibersihkan sebelum rotasi dimulai ulang.
- Event `ClientReady` lama tetap dipakai; tidak dibuat event ready kedua.
- Presence selalu memakai status `online`.
- Panggilan `setPresence()` dibungkus `try/catch` agar kegagalan sementara tidak mematikan bot.
- Tidak bergantung pada cache guild, channel, role, atau member.

## File yang berubah

- `index.js`
- `package.json`
- `package-lock.json`
- `config.json`
- `config.example.json`
- `README.md`
- `UPDATE_FINAL_v10.10.74.md`

## Perbaikan startup tambahan

Urutan pemuatan config dipindahkan setelah tabel normalisasi emoji tersedia. Ini menghilangkan error console lama:

```txt
SYNC CONFIG ERROR: Cannot access 'PAK_RW_KNOWN_EMOJI_CODES' before initialization
```

Perubahan ini hanya memperbaiki urutan inisialisasi dan tidak mengubah data/config aktif.

## Mengganti tulisan status

Edit daftar `PAK_RW_ACTIVITIES` di `index.js`. Setiap item memiliki `name` dan `type`.

## Mengganti waktu rotasi

Edit:

```js
const PAK_RW_ACTIVITY_ROTATION_MS = 15_000;
```

Contoh 30 detik:

```js
const PAK_RW_ACTIVITY_ROTATION_MS = 30_000;
```

## Pengecekan

```powershell
npm.cmd run check
npm.cmd start
```

Live login Discord memerlukan `DISCORD_TOKEN` asli pada `.env` lokal atau Variables hosting. Token tidak disertakan dalam ZIP.
