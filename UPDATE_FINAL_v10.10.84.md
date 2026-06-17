# UPDATE FINAL v10.10.84 — KTP Desa Tulus Rapi Sesuai Referensi

## Yang diperbaiki
- Renderer KTP diubah menjadi format 16:9 agar tampil proporsional di embed Discord.
- Tata letak dibuat seperti kartu referensi: judul di tengah, data lurus di kiri, foto di kanan, dan tanggal di bawah foto.
- Kotak-kotak besar yang membuat desain ramai dihapus.
- Background tetap memakai tema Desa Tulus dengan pola, watermark, gunung, sawah, dan bale desa yang sangat halus.
- Foto Discord dipotong proporsional dan selalu memiliki fallback inisial agar area foto tidak kosong.
- Semua data warga, nomor KTP lama, MongoDB, level, poin, role, dan pengaturan AFK Voice tetap dipertahankan.

## Catatan pemasangan
Jangan hapus folder `data`, `.env`, atau database lama. Timpa hanya file program dari paket update ini.
