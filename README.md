# Pak RW — DESA TULUS

Pak RW adalah bot utama untuk server **DESA TULUS**. Branding tetap bernuansa perdesaan: warga, balai desa, pos ronda, sawah, rukun, dan tata krama. Mulai v10.10.59, semua embed publik default memakai Bahasa Indonesia yang jelas agar warga tidak bingung.

## Update v10.10.59 — Welcome Mention Sinkron

- Semua teks utama diarahkan ke **Pak RW** dan **DESA TULUS**.
- Persona AI dibuat seperti **Pak RW asli**: sopan, formal, ngayomi, tegas kalau perlu, tidak kasar, dan solutif.
- Vibes server tetap perdesaan, tetapi embed publik tidak dibuat full Sunda.
- Bahasa mengikuti permintaan warga:
  - Jika warga minta Bahasa Indonesia, Pak RW menjawab Bahasa Indonesia.
  - Jika warga minta Basa Sunda, Pak RW menjawab Basa Sunda formal.
  - Tidak mencampur bahasa kecuali warga memang minta gaya campuran.
- Judul welcome tetap **Wilujeung Sumping Warga Anyar**, isi bawahnya memakai Bahasa Indonesia jelas.
- Curhat diarahkan jadi **Pak RW ngadangu warga**: mendengarkan, tidak menghakimi, dan membantu pelan-pelan.
- OpenRouter tetap hemat: model ringan, cooldown, max token kecil, dan fallback lokal saat limit/error.
- Dashboard tetap default mati untuk DisCloud: `DASHBOARD_ENABLED=false`.
- Data lama/MongoDB tidak direset.

## ENV wajib

```env
DISCORD_TOKEN=
CLIENT_ID=
GUILD_ID=
MONGODB_URI=
OPENROUTER_API_KEY=
AI_KEY=
DASHBOARD_ENABLED=false
```

## Tes lokal

```bat
cd /d "D:\Pak Rw"
npm install
npm run check
npm start
```

Target log:

```txt
🌐 DNS resolver aktif untuk MongoDB Atlas.
🌐 Dashboard Pak RW dimatikan sementara untuk mode DisCloud.
✅ MongoDB connected
🤍 Pak RW ONLINE sebagai Pak RW
🗄️ Database mode: MongoDB
```

## Deploy DisCloud

1. Pastikan `discloud.config` ada di root project.
2. RAM plan free diset `RAM=100`.
3. Buat ZIP tanpa `node_modules`, `.git`, `logs`, `backups`, dan `data` aktif.
4. Untuk DisCloud, `.env` boleh masuk ZIP privat hosting. Untuk GitHub, `.env` jangan pernah di-commit.
5. Upload ZIP ke DisCloud.
6. Restart app dan cek logs.

## Catatan penting

- Jangan commit `.env`.
- Jangan reset MongoDB/data level.
- Jangan hapus dashboard permanen; dashboard hanya dimatikan dulu di mode DisCloud.
- Prefix utama sekarang `rw`.
- Mention user/channel asli tetap aktif, tetapi `@everyone` dan `@here` tetap diblokir.

## Update v10.10.55 — Pak RW Big Bot DESA TULUS

Update ini menaikkan identitas Pak RW menjadi bot besar untuk DESA TULUS. Fokusnya bukan mengganti data lama, tetapi membuat alur bot terasa seperti balai warga digital yang rapi, sopan, dan kuat.

### Identitas utama
- Server: DESA TULUS
- Bot: Pak RW
- Prefix warga: `rw`
- Vibes: perdesaan, sopan, formal-natural, mengayomi, tegas secukupnya
- Dashboard DisCloud tetap default mati: `DASHBOARD_ENABLED=false`
- RAM DisCloud tetap 100 MB

### Mode bot besar
Pak RW sekarang membawa konsep **Balai Warga Digital**:
- AI Pak RW untuk tanya jawab warga
- Curhat Warga dan Curhat Anonim
- Kotak Saran Warga
- Welcome Warga Anyar dengan judul Wilujeung Sumping dan isi Bahasa Indonesia
- Level & Poin Warga
- Top Aktif dan Member Of The Month
- Donatur Desa dan Juragan Desa
- Voice Warga dan Boost Poin
- Discord Manager dan command bantu ID/channel/role

### Command baru/ringkas
- `rwbesar` — ringkasan Pak RW Big Bot
- `rwdesa` — ringkasan balai warga digital DESA TULUS
- `rwpakrw` — identitas Pak RW
- `rwfitur` — daftar fitur utama
- `rwhelp` — bantuan warga

### Bahasa dan gaya
Pak RW harus mengikuti bahasa user:
- Kalau user meminta Bahasa Indonesia, jawab Bahasa Indonesia sopan dan jelas.
- Kalau user meminta Basa Sunda, jawab Basa Sunda formal dan sopan.
- Jangan campur bahasa kecuali user meminta campuran.
- Tetap hemat OpenRouter: jawaban ringkas, jelas, dan tidak membuang token.

### Data aman
Update ini tidak menyertakan `.env`, `data/`, `logs/`, `backups/`, atau file runtime aktif. Data level, Top Aktif, MOTM, Donatur, Juragan, dan AI memory tetap aman selama MongoDB/ENV lama dipakai.

## v10.10.59 — Papan Aktif Lifetime + Siklus 100.000 Poin

Update ini menambahkan alur level yang lebih besar untuk DESA TULUS:

- **Top Aktif Bulanan** tetap otomatis post setiap pukul **00.00 WIB**.
- Judul Top Aktif otomatis mengikuti bulan berjalan, contoh: `TOP AKTIF WARGA BULAN JUNI 2026 DESA TULUS`, lalu bulan berikutnya otomatis menjadi Juli, Agustus, dan seterusnya.
- **Leaderboard Aktif / Papan Aktif Lifetime** dipisah ke channel khusus. Board ini mencatat total poin warga dari awal sampai seterusnya dan tidak ikut reset.
- Jika warga mencapai **100.000 poin aktif**, Pak RW memberi role **Member Of The Month** otomatis, lalu poin siklus level warga tersebut dikembalikan dari awal.
- Jika setelah reset warga mendapat 1 poin lagi, Papan Aktif lifetime akan tetap menghitung totalnya sebagai **100.001 poin**.
- Dashboard `/top-active` sekarang disiapkan untuk memilih channel Top Aktif Bulanan, channel Leaderboard Aktif, target poin MOTM/reset, dan image board.
- Jika ingin gambar seperti contoh, isi `Image Board Top Aktif URL` / `leaderboardActiveImageUrl` di dashboard dengan URL gambar/banner yang valid.

Command baru:

- `rwpapanaktif` / `rwleaderboardaktif` — lihat Papan Aktif lifetime.
- `rwpostpapanaktif` — owner mengirim Papan Aktif lifetime ke channel Leaderboard Aktif.
- `/papanaktif` — slash command Papan Aktif lifetime.
- `/postpapanaktif` — slash command owner untuk mengirim Papan Aktif.

Data aman:

- Data lifetime tidak reset.
- MongoDB tetap dipakai.
- `.env`, `data`, `logs`, `backups`, dan `node_modules` tidak dimasukkan ke ZIP update.

## v10.10.59 - Bahasa Embed Lebih Jelas

Update ini membuat Pak RW tetap bernuansa DESA TULUS, tetapi semua embed publik default memakai Bahasa Indonesia yang jelas agar warga tidak bingung.

- Judul welcome tetap `Wilujeung Sumping Warga Anyar!` sebagai ciri khas desa.
- Isi welcome memakai Bahasa Indonesia: `Sambut warga anyar barudak {user}` lalu penjelasan yang mudah dipahami.
- Curhat, Donatur, Juragan, Cari Mabar, Top Aktif, Papan Aktif, dan dashboard tidak dibuat full Sunda.
- Basa Sunda formal hanya dipakai ketika user meminta Pak RW menjawab pakai Bahasa Sunda.
- Mode hemat OpenRouter tetap aktif: sapaan dan pertanyaan sederhana dijawab lokal, AI dipakai hanya saat perlu.


## v10.10.60 — Arcane Manage Dashboard + Unified Embed Sync

Update ini merapikan Pak RW supaya terasa seperti bot besar untuk DESA TULUS. Fokusnya:

- AI Pak RW memakai context engine: jawaban harus nyambung dengan curhat, coding, Discord, dashboard, embed, level/top aktif, GitHub/DisCloud, atau teks.
- Pak RW tetap memanggil warga dengan `nak`, tetapi pembuka tidak selalu `Iya nak`; opener dipilih sesuai konteks.
- Semua embed publik diarahkan ke tema DESA TULUS yang singkat, jelas, sopan, dan tidak full Basa Sunda.
- Welcome dibuat simpel dan bisa tag user, role Member Tulus, channel aturan, chat warga, dan ticket.
- Dashboard diarahkan ke gaya Arcane/Carl/Dyno: card plugin + tombol Manage, embed editor all-in-one, preview sama dengan Discord, placeholder lebih banyak, dan desain desa soft premium.
- OpenRouter tetap hemat: sapaan dan pertanyaan sederhana dijawab lokal, cooldown/global limit aktif, max token lebih aman, fallback lokal saat limit/credit/rate-limit.

Catatan aman: `.env`, `data`, `logs`, `backups`, dan `node_modules` tidak perlu dipush ke GitHub.
