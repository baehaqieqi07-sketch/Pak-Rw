# UPDATE FINAL v10.10.80 — AFK Voice 24/7 Pak RW

- Modul baru `services/afkVoiceManager.js`.
- Dashboard baru `/dashboard/afk-voice`.
- API terautentikasi untuk config, status, connect, reconnect, dan disconnect.
- Auto reconnect bertahap 5–60 detik, satu timer dan satu koneksi per guild.
- Startup otomatis setelah ClientReady jika fitur aktif.
- Shutdown SIGINT/SIGTERM menghentikan timer dan koneksi voice.
- Tidak memutar audio dan tidak mengubah Custom Status Pak RW.
- Data lama, level, poin, MongoDB, KTP, rwid, dan fitur lain tidak direset.
