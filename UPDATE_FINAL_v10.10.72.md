# Pak RW v10.10.72 — Auto Savebar Clean Fix

Update ini fokus ke alur simpan dashboard.

## Perubahan utama

- Teks **Semua perubahan tersimpan** dihapus total dari Manage Page.
- Tombol **Simpan** dan **Batal** hanya muncul ketika user benar-benar mengubah setting.
- Kalau tidak ada perubahan, save bar disembunyikan supaya dashboard lebih bersih.
- Setelah Simpan berhasil, save bar otomatis hilang.
- Setelah Batal ditekan, semua field kembali ke nilai awal dan save bar hilang.
- Channel Manager, Role Manager, Settings, Banner Manager, dan Manage Page memakai pola yang sama.
- Tombol tidak lagi tampil terus-menerus di bawah halaman saat belum ada perubahan.

## Alur baru

1. User membuka halaman manage.
2. Dashboard tampil bersih tanpa save bar.
3. User mengubah toggle, channel, role, teks, multiplier, atau setting lain.
4. Save bar muncul di bawah: **Batal** dan **Simpan**.
5. Klik Simpan untuk menyimpan, atau Batal untuk mengembalikan nilai awal.

## Aman untuk data

Update ini hanya mengubah UI dashboard dan alur tombol. Logic level, poin, voice, Top Aktif, Papan Aktif Lifetime, MOTM, MongoDB, dan data warga tidak diubah.

## Test

```txt
npm run check
npm --prefix dashboard run build
```
