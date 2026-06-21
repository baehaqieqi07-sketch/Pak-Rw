# Pak RW v10.10.107 — Dashboard Saran, Welcome, dan Role Level Fix

Fokus update ini adalah memastikan perubahan benar-benar terlihat di dashboard dan ikut masuk ke hasil Discord.

## Perubahan utama

### 1. Dashboard benar-benar berubah
- Menu `Saran & Voting` diganti menjadi `Kotak Saran`.
- Halaman Welcome menampilkan editor teks welcome DESA TULUS.
- Halaman Kotak Saran menampilkan editor judul, deskripsi, teks tombol, dan toggle tombol ikut di hasil saran.
- Halaman Level menampilkan penjelasan Auto Level Role dan contoh nama role baru.
- Source dashboard dan build `dashboard/dist` ikut diperbarui agar perubahan langsung terlihat setelah redeploy.

### 2. Tombol Kirim Saran ikut muncul terus
- Saat user mengirim saran, hasil saran tetap punya tombol `📬 Kirim Saran` di bawah embed.
- Reaction `✅` dan `❌` tetap otomatis.
- Thread `💬 Berikan Tanggapan` tetap otomatis.

### 3. Welcome dipaksa ke format baru
Welcome default:

```text
Wilujeung sumping, **{user}!** akhirnya mampir juga ke {server}. Di sini tempatnya ngobrol santai, saling kenal, curhat, bercanda, dan jadi bagian dari warga Desa Tulus. Jangan sungkan buat mulai ngobrol ya. Semoga betah di sini {memberTulusRole}
```

### 4. Role Level otomatis lebih jelas
- Role level dibuat otomatis hanya saat ada warga yang mencapai tier.
- Role tidak dibuat massal dari level 1 sampai 1000.
- Role otomatis no color/default color.
- Role dicoba diposisikan di atas Warga.
- Nama role mengikuti format:
  - `Warga Anyar (Lvl. 1)`
  - `Warga Tetap (Lvl. 5)`
  - `Penggerak Desa (Lvl. 100)`
  - `Karuhun Desa (Lvl. Max)`
- Embed level-up memakai mention role hasil auto role tersebut.

## Data aman
- Tidak reset MongoDB.
- Tidak reset level/poin user.
- Tidak menghapus data warga.
- Tidak mengubah AI, KTP, AFK Voice, Loket, Curhat, Welcome channel, atau fitur lain di luar fokus ini.

## Catatan deploy
Agar dashboard tidak memakai bundle lama, lakukan Clear Build Cache di Railway setelah push. Bila build lokal dipakai, jalankan `npm run dashboard:build` sebelum push.
