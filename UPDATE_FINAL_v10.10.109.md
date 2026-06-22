# Pak RW v10.10.109 — Dashboard All-in-One Visible Fix

Update ini memperbaiki masalah dashboard yang masih terlihat seperti versi lama.

## Fokus

- Dashboard legacy `/modules` dan `/maxton-control` sekarang ikut menampilkan pengaturan baru.
- React dashboard `/dashboard/manage/...` tetap dipertahankan dan backend save patch sekarang mengizinkan `loket` dan `leaderboard`.
- Welcome, Kotak Saran, Loket, Auto Level Role, dan label Top Voice/Top Chat dibuat terlihat dan bisa disimpan dari dashboard.

## Perubahan penting

### Welcome

Default welcome dipaksa ke:

`Wilujeung sumping, **{user}!** akhirnya mampir juga ke {server}. Di sini tempatnya ngobrol santai, saling kenal, curhat, bercanda, dan jadi bagian dari warga Desa Tulus. Jangan sungkan buat mulai ngobrol ya. Semoga betah di sini {memberTulusRole}`

Dashboard legacy dan React dashboard sama-sama punya editor welcome.

### Kotak Saran

- Tombol `📬 Kirim Saran` bisa diedit dari dashboard.
- Tombol ikut muncul di setiap hasil saran baru jika `buttonOnResult` aktif.
- Reaction ✅ dan ❌ tetap otomatis.
- Thread `💬 Berikan Tanggapan` tetap otomatis.

### Loket

- Pengaturan Loket sekarang terlihat di `/modules`, `/maxton-control`, dan React dashboard.
- Bisa edit panel channel, category, staff role, log channel, title, description, banner, thumbnail, dropdown placeholder, JSON pilihan, claim label, close label, transcript, dan thread.

### Auto Level Role

- Dashboard menampilkan toggle Auto Level Role On-Demand.
- Role tetap dibuat hanya saat ada warga yang mencapai tier.
- Nama role memakai format `Nama Tier (Lvl. X)`, contoh `Warga Anyar (Lvl. 1)`.
- Level 1000 tetap `Karuhun Desa (Lvl. Max)`.
- Role tetap no color dan dicoba diposisikan di atas role Warga.

### Top Voice / Top Chat

Label default diganti menjadi:

- `🎙️ Top Voice:`
- `💬 Top Chat:`

## Tidak diubah

- Data member
- Poin
- Level user
- MongoDB
- MOTM logic
- KTP
- AFK Voice
- AI
- Logic leaderboard poin

## Catatan

Setelah deploy, wajib clear cache browser atau buka incognito. Untuk Railway, gunakan Clear Build Cache + Redeploy.
