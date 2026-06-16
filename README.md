# Pak RW / DESA TULUS v10.10.68

Versi ini adalah **final dashboard finishing pass** untuk Pak RW Control Center. Fokus update hanya pada dashboard web: layout dirapikan, alur Manage dipertegas, picker Discord dibuat lebih aman, Embed Builder diberi batas dan counter, serta halaman Boost Poin dipecah menjadi bagian yang lebih mudah dipahami.

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
- Cek Poin memakai `<a:bar_chart:1516453838117277829>`.
- Level Up memakai `<a:rocket_animated:1512884173453529288>` dan `<a:Chart_Increasing:1516454160684290219>`.
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
