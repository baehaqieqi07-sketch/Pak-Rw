# Pak RW v10.10.77 — DATA ID SERVER

Fitur read-only baru dengan command final `rwid`. Tidak ada alias lama, listener baru, perubahan channel, perubahan role, atau reset data.

## File baru
- `services/serverIdExporter.js`

## File diubah
- `index.js`
- `config.json`
- `config.example.json`
- `package.json`
- `README.md`
- dashboard React: App, features, dan SystemPages

## Channel yang belum diisi
`serverIdExporter.channelId` masih kosong. Buat text channel privat `rw-id-server`, lalu pilih dari Dashboard → Sistem Server → Data ID Server.

## Permission minimum bot
View Channel, Send Messages, Attach Files, Embed Links, Read Message History.

## Pengguna yang diizinkan
Owner server, Administrator, dan Manage Server.

## Pengujian lokal
`npm.cmd install`
`npm.cmd run check`
`npm.cmd run dashboard:build`
`npm.cmd start`
