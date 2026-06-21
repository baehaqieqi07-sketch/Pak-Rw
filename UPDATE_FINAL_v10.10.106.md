# UPDATE FINAL v10.10.106 — Welcome Exact + Role Level Embed Jelas

Fokus update:

- Welcome DESA TULUS dipaksa migrasi dari format lama ke teks baru yang diminta owner.
- Role Warga default diset ke ID `1504495052695797857` dari data server DESA TULUS.
- Content welcome lama `{memberTulusRole}` tidak lagi dikirim terpisah agar tidak dobel.
- Embed level-up sekarang menerima hasil sync role otomatis, sehingga field **Role Level** menampilkan role yang baru dibuat/diberikan pada saat itu juga.
- Role level otomatis tetap on-demand, no color, tidak dibuat massal saat startup.
- Role level otomatis yang sudah ada akan dipaksa no color jika Pak RW punya hierarchy untuk mengubahnya.
- Kalau role bot Pak RW belum berada di atas role Warga, log akan menjelaskan penyebab posisi role tidak bisa dinaikkan di atas Warga.
- Tidak reset data level, poin, member, MongoDB, KTP, AI, AFK Voice, Loket, Curhat, Saran, atau fitur lain.

Catatan penting Discord:

Agar role level otomatis benar-benar bisa berada di atas role Warga, role bot Pak RW di Server Settings > Roles wajib berada di atas role Warga. Kalau role bot masih di bawah Warga, Discord menolak pemindahan role walaupun kode sudah benar.
