# Update Final v10.10.105 — Loket Dropdown Desa Tulus

Fokus update:
- Panel Loket memakai dropdown/select menu seperti contoh.
- Nama fitur tetap **Loket**, bukan Ticket.
- Tema tetap **Pak RW DESA TULUS**, tidak memakai branding Warrior.
- Setiap jenis loket bisa punya kategori dan prefix channel sendiri.
- Dashboard bisa edit judul panel, placeholder dropdown, banner/image, thumbnail, kategori, prefix channel, tombol claim/close, thread/log, dan JSON pilihan dropdown.
- Tidak reset data member, level, role, KTP, AI, welcome, curhat, saran, atau MongoDB.

Alur baru:
1. Owner kirim panel dengan `rwloket panel` / `rwloketpanel`.
2. Warga pilih jenis loket dari dropdown.
3. Modal muncul untuk isi keperluan.
4. Pak RW membuat channel privat sesuai kategori/pilihan loket.
5. Pengurus Loket bisa claim dan close.
6. Log dikirim jika channel log diatur.

Catatan:
- Gambar screenshot Warrior hanya dijadikan referensi layout, bukan dipasang sebagai default agar tema tetap Desa Tulus.
- Banner Loket bisa diatur dari Dashboard lewat URL image/thumbnail embed.
