# Pak RW v10.10.87 — AFK Voice Single-Flight Fix

## Masalah yang diperbaiki

Log lama memperlihatkan satu percobaan koneksi memicu beberapa jalur reconnect sekaligus: listener `Disconnected`, listener `error`, timeout `Ready`, perubahan voice state, dan penyimpanan dashboard. Akibatnya countdown 5, 10, 20, dan 40 detik dapat berjalan saling bertabrakan. `entersState(...Ready)` kemudian dibatalkan saat koneksi lain menghancurkan objek koneksi yang sedang ditunggu sehingga muncul `The operation was aborted`.

## Perbaikan

1. **Single-flight connection**
   - Hanya satu percobaan koneksi untuk guild dan channel yang sama.
   - Percobaan lama dibatalkan saat channel benar-benar diganti.

2. **Satu reconnect timer**
   - Event error dan disconnect tidak lagi membuat timer baru bila timer sudah ada.
   - Backoff tetap 5 → 10 → 20 → 40 → 60 detik, tetapi tidak tumpang tindih.

3. **AFK gateway fallback**
   - Bila akun Pak RW sudah terlihat di channel tujuan, AFK dinyatakan berhasil meskipun handshake UDP belum `Ready`.
   - Koneksi tidak dihancurkan hanya karena timeout transport, karena fitur ini tidak memutar audio.

4. **Dashboard aman**
   - Menyimpan delay atau opsi auto reconnect tidak memaksa reconnect.
   - Reconnect penuh hanya dilakukan saat enable pertama, guild/channel berubah, atau mute/deaf berubah.

5. **Health check**
   - Pemeriksaan berkala memastikan Pak RW masih berada di channel tersimpan.
   - Transport dibangun ulang tanpa membuat loop jika voice state masih aktif.

6. **Runtime voice terbaru**
   - `@discordjs/voice` 0.19.2.
   - Node.js `>=22.12.0 <23` dan `.nvmrc` 22.16.0.

7. **Pembersihan log lain**
   - Avatar KTP memakai PNG statis 256 px dan batas 12 MB.
   - Log role Active Voice yang sama maksimal sekali per 15 menit.
   - Log hierarchy member yang sama maksimal sekali per 30 menit.

## Keamanan data

Tidak ada migrasi yang menghapus data. Update tidak menjalankan reset untuk MongoDB, level, poin, KTP, temp role, snapshot member, atau konfigurasi server.
