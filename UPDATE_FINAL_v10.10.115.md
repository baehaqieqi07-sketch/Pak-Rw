# Pak RW v10.10.115 — KTP Leaderboard Image Hotfix

Update aman lanjutan untuk memperbaiki image leaderboard yang masih terlihat kosong di deploy.

## Fokus

- Leaderboard image diganti ke mode **KTP Leaderboard Warga**.
- Setiap ranking tampil sebagai kartu/KTP mini dengan:
  - rank jelas,
  - avatar / inisial fallback,
  - nama warga,
  - username,
  - ID Discord ringkas,
  - total poin besar,
  - level.
- Font canvas dibootstrap dengan dependency `dejavu-fonts-ttf` supaya text lebih aman muncul di Linux/Railway.
- Nama stylized unicode dinormalisasi supaya tidak jadi kotak kosong.
- Attachment image leaderboard memakai nama unik `leaderboard-ktp-<timestamp>.png` untuk menghindari cache Discord menampilkan gambar lama/kosong.
- Debug leaderboard diringkas; detail penuh hanya aktif jika env `PAKRW_DEBUG_LEADERBOARD=1`.

## Aman

- Tidak reset database.
- Tidak reset data member.
- Tidak mengubah logic poin lama.
- Tidak mengubah logic level lama.
- Tidak mengubah MOTM lama.
- Tidak menghapus command lama.
- Tidak mengaktifkan Loket lagi.

## Test

- `npm run check` berhasil.
- `npm --prefix dashboard run build` berhasil.
