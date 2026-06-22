# Pak RW / DESA TULUS v10.10.78

Versi ini menambahkan **KTP Warga DESA TULUS** dengan tombol Discord, modal lima kolom, background resmi yang diberikan owner, avatar Discord, dashboard channel picker, serta penyimpanan MongoDB/fallback lokal. Auto Level Role, Custom Status, Boost Poin, Top Aktif, Papan Aktif, MOTM, dan seluruh fitur lama tetap dipertahankan tanpa reset data.

## Perubahan utama

- Navigasi dashboard memakai istilah Indonesia yang lebih jelas.
- Header fitur, tab, card, spacing, font, dan responsive layout dirapikan.
- Alur Manage menjadi empat tahap: atur fitur, pilih Discord, edit/preview, simpan/test.
- Channel/role/user picker:
  - bisa mencari berdasarkan nama;
  - hasil dikelompokkan dan diurutkan;
  - ID lama tetap terlihat jika belum cocok dengan data Discord;
  - config tetap menyimpan ID asli.
- Embed Builder:
  - counter batas karakter Discord;
  - batas maksimal 25 fields dan 5 buttons;
  - reset memakai konfirmasi;
  - reset mempertahankan footer identitas DESA TULUS;
  - mention hanya dimasukkan pada bagian yang didukung Discord.
- Boost Poin:
  - status event dipisah dari form pengaturan;
  - pengaturan dikunci saat event sedang berjalan;
  - multiplier harus lebih dari x1;
  - durasi minimal 1 menit;
  - ada pemeriksaan kesiapan channel chat/voice/pengumuman;
  - stop event memakai konfirmasi;
  - tombol mulai, hentikan, simpan, dan pilih target dibuat terpisah dan jelas.
- Peringatan perubahan belum disimpan ketika menutup halaman.
- Topbar dan sidebar dirapikan untuk laptop dan layar kecil.

## Menjalankan project

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Buka dashboard:

```txt
http://localhost:3000/dashboard
```

## Build dashboard

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

## Environment dashboard

```env
DASHBOARD_ENABLED=true
DASHBOARD_PASSWORD=ISI_PASSWORD_DASHBOARD
PORT=3000
OT_PORT=3000
```

Data Discord picker memerlukan:

```env
DISCORD_TOKEN=ISI_TOKEN_BOT_DISCORD
GUILD_ID=ISI_ID_SERVER_DESA_TULUS
```

Isi rahasia hanya melalui Railway Variables atau environment hosting. Jangan commit `.env`.

## Push GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "finish dashboard Pak RW v10.10.67"
git push
```

## Keamanan data

Update ini tidak mengubah perhitungan level, poin, voice, Top Aktif, Papan Aktif Lifetime, MOTM, MongoDB schema, collection lama, maupun data warga. Perbandingan config dengan v10.10.66 hanya mengubah:

```txt
version
dashboard.uiVersion
```

Jangan upload `.env`, `node_modules`, `data`, `logs`, `runtime-logs`, atau `backups`.


## v10.10.68 — Top Aktif & Emoji Embed Fix

- Memperbaiki `>>> ` supaya Top Voice, Top Chat, dan Papan Aktif tampil dengan garis kutipan Discord.
- Mengubah shortcode emoji lama menjadi custom emoji GIF Discord asli.
- Cek Poin memakai `<a:Desa_Tulus2:1518502350363430932>`.
- Level Up memakai `<a:Desa_Tulus2:1518502350363430932>` dan `<a:Desa_Tulus2:1518502350363430932>`.
- Level Up dan Cek Poin tidak lagi memasang thumbnail/image.
- Preview dashboard menampilkan blockquote dan custom emoji dengan format yang sama seperti Discord.

## Update v10.10.71

Dashboard dirapikan lagi: embed editor sekarang mendukung autocomplete `@` untuk role/member dan `#` untuk channel/category/voice, picker Discord menjadi modal rapi, preview memakai nama asli dari server, dan background diganti menjadi ilustrasi 2D DESA TULUS yang lebih adem.

## Update v10.10.71

Dashboard difinishing ulang untuk mengunci simetri layout, merapikan modal picker Discord, mengurangi transparansi berlebihan, menstabilkan editor embed, dan membuat tampilan lebih clean serta mudah dipahami.

## Update v10.10.72

- Save bar dashboard sekarang hanya muncul saat ada perubahan.
- Tulisan “Semua perubahan tersimpan” dihapus agar UI tidak ramai.
- Tombol Batal dan Simpan muncul otomatis setelah user mengubah setting.
- Channel Manager, Role Manager, Settings, Banner Manager, dan Manage Page memakai alur simpan yang sama.

## v10.10.74 — Activity Discord Otomatis (digantikan v10.10.75)

Versi ini sebelumnya memakai variasi Playing/Watching/Listening. Sistem tersebut sudah diganti sepenuhnya oleh Custom Status pada v10.10.75.


## v10.10.75 — Custom Status Discord Otomatis

Sistem activity Playing/Watching/Listening lama diganti menjadi `ActivityType.Custom` dengan properti `state`. Lima Custom Status Pak RW tampil bergantian setiap 15 detik, status pertama langsung tampil saat `ClientReady`, dan hanya satu interval presence yang aktif. Lihat `UPDATE_FINAL_v10.10.75.md`.

## v10.10.76 — Auto Level Role Terpusat

Auto Level Role sekarang terhubung langsung ke sistem level Pak RW yang sudah ada. Seluruh nama tingkatan berasal dari `level/levelRoleTiers.js`, level maksimal dikunci di 1000, dan setiap warga hanya memiliki satu role tier aktif.

Konfigurasi role tersedia di:

```text
/dashboard/manage/level
```

Command owner/staff:

```text
paksynclevelroles
pakceklevelrole @member
paksynclevelrole @member
```

Sebelum sinkronisasi massal, Pak RW membuat backup data level. Proses berjalan bertahap dan tidak mengubah poin, EXP, level, leaderboard, atau data warga lama. Dokumentasi lengkap tersedia di `UPDATE_FINAL_v10.10.76.md`.


## COMMAND RWID — DATA ID SERVER

Command `rwid` membuat satu file TXT berisi Server ID, seluruh category, text channel, voice, announcement, forum, media, stage, other channel, dan seluruh role yang dapat dilihat Pak RW. Command hanya dapat dipakai oleh owner server, Administrator, atau pengguna dengan izin Manage Server di channel khusus `rw-id-server`.

### Persiapan
1. Buat Text Channel privat bernama `rw-id-server` atau `📋・rw-id-server`.
2. Beri Pak RW izin View Channel, Send Messages, Attach Files, Embed Links, dan Read Message History.
3. Beri role Pak RW View Channel pada category privat yang ingin ikut didata.
4. Pilih channel melalui Dashboard → Sistem Server → Data ID Server.
5. Aktifkan Message Content Intent di Discord Developer Portal → Applications → Pak RW → Bot → Privileged Gateway Intents.
6. Ketik `rwid` di channel khusus.

### Menyalin
- PC: buka TXT, tekan Ctrl+A lalu Ctrl+C.
- HP: buka TXT, tekan dan tahan, Pilih Semua, lalu Salin.

### Rollback
Nonaktifkan `serverIdExporter.enabled`, hapus pemanggilan `handleRwIdCommand` dan file `services/serverIdExporter.js`, lalu restart bot. Tidak ada data member yang perlu dihapus.

## v10.10.78 — KTP Warga DESA TULUS

Fitur KTP Warga memakai background yang diberikan owner dan menghasilkan kartu digital langsung dari bot. Pak RW tidak membuat channel otomatis. Owner harus membuat channel text privat, lalu memilihnya melalui dashboard.

### Alur penggunaan

1. Buat text channel privat bernama `ktp-warga` atau `🪪・ktp-warga`.
2. Berikan Pak RW izin `View Channel`, `Send Messages`, `Attach Files`, `Embed Links`, dan `Read Message History`.
3. Buka Dashboard → Komunitas → KTP Warga.
4. Pilih channel KTP lalu klik Simpan Pengaturan.
5. Di channel tersebut, owner/admin mengetik `rwktppanel`.
6. Warga menekan tombol **Buat KTP**.
7. Modal menampilkan lima kolom wajib: Nama Lengkap, Jenis Kelamin, Domisili, Agama, dan Hobi.
8. Pak RW membuat kartu memakai background `assets/ktp-desa-tulus-background.png` dan avatar Discord warga.
9. Warga dapat mengetik `rwktp` untuk menampilkan kartu lagi.

Kartu yang sudah ada akan diperbarui pada pesan lama bila masih dapat ditemukan, sehingga hasil tidak menumpuk. Data KTP disimpan ke MongoDB melalui store `ktpWarga` dan memiliki fallback lokal `data/ktp.json`. Data level, poin, role, leaderboard, dan database lama tidak diubah.

### Catatan privasi

Gunakan nama panggilan dan domisili umum seperti kota/kabupaten serta provinsi. Jangan memasukkan alamat rumah lengkap, nomor telepon, kata sandi, token, atau data akun. Kartu diberi label **Kartu Komunitas Digital — Bukan Dokumen Resmi**.

### Command

```text
rwktppanel  → owner/admin mengirim panel KTP
rwktp       → warga melihat KTP miliknya
```

### Background

```text
assets/ktp-desa-tulus-background.png
```

Background tersebut berasal dari file yang diberikan owner dan tidak dibuat ulang oleh bot.


## AFK Voice 24/7 Pak RW — v10.10.80

Menu dashboard: `Pak RW → Pengaturan Bot → AFK Voice 24/7`.

Fitur ini membuat Pak RW bergabung ke satu voice channel biasa dan menjaga koneksi selama proses bot/hosting aktif tanpa memutar audio. Konfigurasi disimpan pada `afkVoice` di config aktif.

Permission minimum pada voice channel:
- View Channel
- Connect

Penggunaan:
1. Aktifkan dashboard dengan `DASHBOARD_ENABLED=true`.
2. Buka `/dashboard/afk-voice`.
3. Aktifkan fitur dan pilih voice channel.
4. Klik **Simpan dan Terapkan**.
5. Gunakan **Hubungkan Ulang** jika ingin membuat sesi voice baru tanpa restart.

Pak RW menggunakan self mute dan self deaf. Permission Speak tidak diperlukan karena fitur tidak memutar audio.

## v10.10.81 — Perbaikan Final KTP Warga

Renderer KTP Warga diperbarui agar kartu tidak tampak kosong saat ditampilkan kecil di Discord. Background resmi terbaru dari owner tetap digunakan sebagai dasar, lalu bot menambahkan panel kontras, judul, enam baris data, foto/avatar, tanggal pembuatan, status warga, dan footer Pak RW.

Perubahan utama:
- Channel aktif KTP sudah diarahkan ke `💳│buat-ktp` (`1516813349957013614`).
- Ukuran hasil mengikuti background `1011 × 638` agar tidak gepeng atau terpotong.
- Nomor KTP memakai 18 digit random unik dengan prefix `32`, dibuat satu kali lalu disimpan bersama data warga.
- Data KTP lama tidak dihapus. Nomor versi lama dimigrasikan aman saat kartu pertama kali dibuka atau diperbarui.
- Avatar Discord tetap digunakan; jika avatar gagal dimuat, kartu menampilkan inisial nama, bukan kotak kosong.
- Tes otomatis memeriksa 100 nomor unik dan memastikan hasil render berbeda cukup besar dari background kosong.

Command tetap:

```text
rwktppanel  → owner/admin mengirim panel KTP
rwktp       → warga melihat KTP miliknya
```

## Railway npm Registry Lock Fix v10.10.82

Lockfile project sudah dibersihkan dari URL registry internal dan sekarang memakai `https://registry.npmjs.org/`, sehingga `npm ci` di Railway tidak mencoba mengakses host internal yang tidak tersedia.



## Pak RW v10.10.83 — KTP dan AFK Voice Stabil

- Renderer KTP memuat background lebih dulu, membuat canvas dari ukuran asli, lalu menggambar seluruh data sebelum PNG dibuat.
- Attachment KTP memakai nama unik per revisi agar Discord tidak menampilkan cache gambar kosong lama.
- Record KTP, nomor KTP valid, MongoDB, level, poin, role, dan data warga tidak direset.
- AFK Voice menangani error `joinVoiceChannel`, memastikan voice state bot benar-benar masuk, membaca status koneksi nyata, dan reconnect bertahap tanpa loop pada channel hilang atau permission kurang.
- Kegagalan AFK Voice saat startup tidak menghentikan fitur Pak RW lainnya.

## Pak RW v10.10.84 — KTP Desa Tulus Rapi
Renderer KTP kini memakai layout 16:9 seperti kartu referensi: data rata di kiri, foto di kanan, tanggal di bawah foto, serta background Desa Tulus yang tetap terisi tetapi tidak ramai. Update ini tidak mereset data warga atau konfigurasi lama.


## Pak RW v10.10.85 — KTP Background Resmi Terbingkai

- Renderer KTP memakai background resmi Desa Tulus berukuran 1011 × 638.
- Background diklip di dalam bingkai membulat sehingga pola tidak keluar melewati garis kartu.
- Tata letak data, foto, tanggal, watermark, dan footer dirapikan agar lebih premium dan mudah dibaca.
- Perbaikan anti-cache KTP dan AFK Voice 24/7 dari versi sebelumnya tetap dipertahankan.
- Tidak mengubah atau mereset data KTP, level, poin, role, MongoDB, maupun konfigurasi server.

## Pak RW v10.10.86 — KTP Watermark Desa Premium

- Renderer KTP memakai watermark **DESA TULUS** transparan di bagian tengah.
- Ornamen perdesaan dibuat sederhana: gunung, matahari, bale desa, dan garis sawah tipis.
- Watermark, lanskap, background, serta seluruh dekorasi selalu dipotong di dalam garis kartu.
- Jarak judul, foto, tanggal, data warga, dan footer dirapikan tanpa mengubah data KTP lama.
- AFK Voice 24/7 dan seluruh fitur/data dari versi sebelumnya tetap dipertahankan.

## Pak RW v10.10.87 — AFK Voice Single-Flight Fix

Update ini memperbaiki koneksi AFK Voice yang sebelumnya berulang kali menampilkan `The operation was aborted` dan membuat beberapa timer reconnect sekaligus.

Perubahan utama:

- AFK Voice memakai voice state Discord sebagai sumber kebenaran utama untuk mode AFK tanpa audio.
- Pak RW tidak lagi langsung keluar hanya karena transport UDP belum mencapai status `Ready`.
- Hanya satu proses koneksi dan satu timer reconnect yang boleh aktif pada satu waktu.
- Penyimpanan dashboard yang tidak mengubah channel tidak lagi memutus dan menyambungkan bot.
- Health check 30 detik menjaga bot tetap berada di channel tujuan.
- `@discordjs/voice` diperbarui ke 0.19.2 dan runtime dikunci ke Node.js 22.12 atau lebih baru dalam seri Node 22.
- Avatar KTP dipaksa menjadi PNG statis 256 px dan batas unduhan dinaikkan agar avatar besar tidak terus gagal.
- Log Active Voice Role serta hierarchy role dibatasi agar console tidak penuh oleh pesan yang sama.
- Data level, poin, KTP, MongoDB, role, dan konfigurasi warga tidak dihapus atau diinisialisasi ulang.

## Pak RW v10.10.89 — KTP Text Layer Railway Fix

- Memperbaiki KTP yang hanya menampilkan background dan avatar di Railway.
- Font dipilih lewat probe pixel runtime dengan generic `sans-serif` sebagai prioritas.
- Seluruh tulisan KTP dirender pada layer transparan terpisah lalu divalidasi sebelum dikomposisikan.
- Renderer tidak lagi mengirim kartu apabila text layer kosong.
- AFK Voice v10.10.87 dan seluruh data lama tetap dipertahankan.


## KTP Font Railway v10.10.89

Renderer KTP mendaftarkan DejaVu Sans dari dependency `dejavu-fonts-ttf` melalui `GlobalFonts.registerFromPath()` sebelum menggambar teks. Font generic host hanya menjadi fallback terakhir. Garis dekorasi tidak ikut dihitung sebagai pixel teks, sehingga KTP kosong tidak dapat lolos validasi.

## Pak RW v10.10.91 — Background KTP Resmi Tanpa Watermark Tambahan

- Background KTP diganti menggunakan asset resmi yang diberikan owner.
- Asset disesuaikan ke ukuran native renderer **1011 × 638** tanpa memotong motif atau mengubah rasio desain.
- Watermark, emblem, gunung, sawah, cahaya, dan ornamen tambahan dari kode Canvas dihapus agar tidak terjadi efek double.
- Renderer hanya memakai motif yang sudah menyatu di file background resmi.
- Overlay keterbacaan dibuat sangat tipis; bingkai, teks, avatar, tanggal, dan footer tetap rapi di dalam kartu.
- AI v10.10.90, font Railway v10.10.89, AFK Voice v10.10.87, MongoDB, level, poin, role, dashboard, dan data lama tetap dipertahankan.

## Pak RW v10.10.90 — AI GPT-4o mini, Memori Per Warga, dan Pengetahuan Server Live

- Pak RW mengenal dirinya sebagai **Pak RW DESA TULUS** dan mengenal owner server sebagai **BEKIW**.
- Pak RW memanggil warga dengan sebutan **nak** secara natural tanpa mengulanginya di setiap kalimat.
- Memori percakapan disimpan terpisah berdasarkan `guildId:userId`, sehingga pembahasan satu warga tidak tercampur dengan warga lain.
- Memori dibatasi hingga 10 turn per warga, maksimal 600 warga, dan pola token/kunci API disensor sebelum disimpan.
- Direktori channel dibaca langsung dari guild sesuai permission warga. Pak RW tidak mengarang channel atau role yang tidak ditemukan.
- Mode curhat dipisahkan dari mode tanya umum: Pak RW mendengarkan lebih dulu dan tidak mengubah curhat menjadi tutorial bot kecuali diminta.
- Router hemat memakai `openai/gpt-4o-mini` untuk pertanyaan rutin dan `openai/gpt-4o-mini` untuk pertanyaan kompleks.
- Cache AI sekarang terpisah per warga agar jawaban atau konteks tidak tertukar.
- KTP v10.10.89, AFK Voice v10.10.87, MongoDB, level, poin, role, dashboard, serta data lama tetap dipertahankan.


## Pak RW v10.10.94 — Background KTP Owner 1:1 Tanpa Perubahan

- Asset `assets/ktp-desa-tulus-background.png` diganti persis dengan PNG terbaru dari owner.
- Background dirender pada ukuran native **1011 × 639** tanpa crop, resize, tint, gradient, frame, overlay, atau watermark tambahan.
- Hanya layer data KTP dan foto warga yang ditambahkan di atas background.
- Tata letak teks dan foto dirapikan tanpa mengubah pixel background pada area kosong.
- Test menyimpan SHA-256 background resmi agar file tidak berubah tanpa sengaja.
- AI v10.10.90, font Railway, AFK Voice, level, role, dashboard, MongoDB, dan data KTP lama tetap dipertahankan.


## Pak RW v10.10.96 — AI Natural Chat

Pak RW sekarang menjawab lebih natural seperti chat orang asli. Chat singkat dibalas singkat, masalah serius baru diberi alur. Gaya template lama seperti “Pak RW tangkap inti pesannya”, “Pak RW belum dapat detail”, dan “Supaya jawabannya tepat” sudah diblokir dari fallback lokal serta disaring dari jawaban AI.


## Pak RW v10.10.97 — AI Limit Auto Recovery

Update ini menambahkan token budget sebelum AI dipanggil, klasifikasi error AI, recovery otomatis setelah rate limit/provider cooldown, credit/auth lock yang tidak spam retry, fallback lokal natural, dan panel dashboard **AI Limit & Recovery**. Prompt Pak RW dibuat lebih ringkas: memory dikirim sebagai ringkasan pendek, history dibatasi, dan server context hanya dikirim saat benar-benar dibutuhkan.

Owner command tambahan:
- `rwailimit` / `pakailimit` melihat status AI limit/recovery.
- `rwaireset` / `pakaireset` memaksa AI state kembali normal.
- `rwaitest` / `pakaitest` mengetes AI dengan prompt pendek.
- `rwaimode` / `pakaimode` melihat mode AI saat ini.
- `rwaifallback` / `pakaifallback` mengetes gaya fallback natural.

Data member, memory lama, level, role, welcome, curhat, saran, voting, KTP, AFK Voice, dan dashboard lama tidak direset.

## Update v10.10.100

- Background KTP diganti memakai asset baru dari user tanpa membuat gambar baru.
- Format Kritik & Saran menjadi `📬 Kritik & Saran Baru` dengan bagian `👤 Pengirim` dan `💬 Isi Saran`.
- Warna embed default dan warna tiap template embed dapat diedit dari dashboard.
- Fitur lain tetap aman tanpa reset data.

## Pak RW v10.10.100 — Label Top Chat dan Top Voice Lebih Singkat

- Label field board Top Aktif yang sebelumnya `Top Voice Bulanan` diganti menjadi `Top Voice:`.
- Label field board Top Aktif yang sebelumnya `Top Chat Bulanan` diganti menjadi `Top Chat:`.
- Config lama yang masih menyimpan label `Top Voice Bulanan` atau `Top Chat Bulanan` otomatis dinormalisasi saat render, tanpa mereset config/data.
- Command `rwtopchat` dan `rwtopvoice` juga memakai judul singkat `Top Chat:` dan `Top Voice:`.
- Fitur lain tetap tidak diubah.


## Update v10.10.101

- Welcome default diganti menjadi teks Wilujeung sumping yang diminta, dengan mention role warga lewat `{memberTulusRole}`.
- Kritik & Saran tidak lagi memakai tombol Setuju/Tidak Setuju; pesan saran otomatis diberi reaction ✅ dan ❌.
- Setiap saran baru otomatis dibuat thread `💬 Berikan Tanggapan`.
- Embed Papan Aktif lifetime dibuat lebih ringkas: title TOP AKTIF WARGA SEPANJANG WAKTU, update 00.00 WIB, dan daftar peringkat warga saja.
- Fitur lain tidak diubah dan data lama tidak direset.

## v10.10.102 — Auto Level Role On-Demand

Role level sekarang dibuat otomatis hanya ketika ada warga yang mendapat tier tersebut. Tidak perlu membuat role manual dari dashboard. Role otomatis memakai warna default/no color, dicoba diposisikan di atas role Warga, dan role kosong dibersihkan otomatis. Level maksimal tetap 1000 dengan role `Karuhun Desa (Lvl. Max)`. Data level, poin, dan member tidak direset.


## Update v10.10.104 — Format Kotak Saran Rapi

- Modal saran dibuat lebih mirip Kotak Saran Discord: `Nama (kosongkan untuk anonim)` dan `Masukkan kritik/saran kamu di sini:`.
- Embed hasil saran memakai format sederhana: `📬 Kritik & Saran Baru`, lalu bagian `👤 Pengirim:` dan `💬 Isi Saran:`.
- Kalau nama dikosongkan, pengirim tampil sebagai `Anonim`; teks `atau anonim` tidak ikut tampil di embed.
- Tombol panel saran menjadi `📬 Kirim Saran`.
- Reaction ✅/❌ dan thread `💬 Berikan Tanggapan` tetap otomatis.
- Tidak mengubah data member, level, AI, KTP, AFK Voice, Loket, welcome, dan fitur lama.

## Update v10.10.105 — Loket Dropdown Desa Tulus

- Loket Bantuan sekarang memakai dropdown/select menu seperti contoh ticket bot, tetapi tetap bernama **Loket** dan bertema **Pak RW DESA TULUS**.
- Panel Loket menampilkan embed utama, daftar pilihan loket, dan menu dropdown.
- Setiap pilihan loket bisa punya kategori dan prefix channel sendiri.
- Dashboard bisa mengedit judul, placeholder dropdown, banner/image, thumbnail, kategori, prefix channel, tombol claim/close, thread/log, dan JSON pilihan dropdown.
- Data member, level, role, KTP, AI, welcome, curhat, saran, dan MongoDB tidak direset.


## v10.10.106 — Welcome Exact + Role Level Embed Jelas

Welcome default sekarang memakai teks Desa Tulus terbaru dan role Warga ID `1504495052695797857`. Auto level role tetap on-demand/no color dan field Role Level pada embed naik level memakai hasil sync role otomatis agar tidak tampil `@unknown-role` ketika role berhasil dibuat.

## v10.10.108 — Leaderboard Premium PNG

Papan Aktif lifetime sekarang memakai embed quote rapi + image PNG otomatis bertema Desa Tulus.
Ranking maksimal 10 warga, memakai emoji panah `<a:Desa_Tulus2:1518502350363430932>` di embed, dan panah static biru di canvas.
Jika image gagal dirender, Pak RW tetap mengirim embed teks biasa.
Auto post akan mengedit pesan lama jika `leaderboard.messageId` tersedia supaya channel tidak spam.
