# UPDATE FINAL v10.10.78 — KTP WARGA DESA TULUS

## Ringkasan

Versi ini menambahkan fitur KTP Warga ke project Pak RW yang sudah ada. Fitur memakai satu handler pesan dan satu handler interaksi yang sudah aktif; tidak menambahkan listener `messageCreate` atau `InteractionCreate` baru.

## Alur

1. Owner membuat channel text privat `ktp-warga`.
2. Channel dipilih dari Dashboard → Komunitas → KTP Warga.
3. Owner/Admin/Manage Server mengetik `rwktppanel` di channel tersebut.
4. Warga menekan tombol **Buat KTP**.
5. Discord membuka modal **Isi Data KTP Kamu** dengan lima field:
   - Nama Lengkap
   - Jenis Kelamin
   - Domisili
   - Agama
   - Hobi
6. Pak RW membuat kartu memakai background owner dan avatar Discord warga.
7. Kartu dikirim ke channel KTP. Pembaruan berikutnya mengedit kartu lama bila masih tersedia.
8. Warga dapat mengetik `rwktp` untuk melihat kartu kembali.

## File baru

- `services/ktpWarga.js`
- `tests/ktpWarga.test.js`
- `assets/ktp-desa-tulus-background.png`
- `UPDATE_FINAL_v10.10.78.md`

## File yang diperbarui

- `index.js`
- `db/mongoStore.js`
- `config.json`
- `config.example.json`
- `package.json`
- `package-lock.json`
- `README.md`
- `dashboard/package.json`
- `dashboard/package-lock.json`
- `dashboard/src/app/App.tsx`
- `dashboard/src/lib/features.ts`
- `dashboard/src/pages/SystemPages.tsx`
- `dashboard/dist/*`

## Penyimpanan

Data KTP memakai MongoDB key `ktpWarga`. Saat MongoDB belum aktif, fallback berada di `data/ktp.json`. Folder data runtime tetap tidak dimasukkan ke GitHub/ZIP publik.

## Keamanan

- Tidak membuat channel otomatis.
- Tidak mengubah permission channel.
- Tidak mengubah role.
- Tidak mengubah level, poin, Top Aktif, MOTM, atau leaderboard.
- Tidak menampilkan token, ENV, password, atau API key.
- Kartu diberi label bukan dokumen resmi.
- Domisili diarahkan hanya kota/kabupaten dan provinsi, bukan alamat lengkap.

## Konfigurasi yang masih perlu dipilih

```json
"ktpSystem": {
  "channelId": ""
}
```

Setelah membuat channel `ktp-warga`, pilih melalui dashboard. Field ini sengaja tidak ditebak karena pada inventaris server terbaru belum ada channel KTP khusus.

## Config lama yang otomatis dibawa

Versi ini juga mempertahankan dan mengisi kembali ID yang sudah diketahui dari export `rwid`, termasuk:

- Data ID Server: `1516741217118060544`
- Rules: `1504495423883186287`
- Welcome: `1504495053224284400`
- Papan Aktif Lifetime: `1516167288066281672`
- Boost Poin: `1513924425374892172`
- Chat Juragan: `1512487010948874430`
- Seluruh 14 Auto Level Role tetap sama.

## Command

```text
rwktppanel
rwktp
```

`rwktppanel` hanya untuk owner, Administrator, atau pengguna dengan Manage Server. Kedua command hanya bekerja di channel KTP yang sudah dipilih.
