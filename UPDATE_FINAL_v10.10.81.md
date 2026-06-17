# UPDATE FINAL v10.10.81 — KTP Warga Tidak Kosong

## Fokus update

Perbaikan dilakukan pada fitur KTP Warga DESA TULUS. Update ini tidak membuat gambar terpisah dan tidak memakai generator gambar. Bot tetap membuat kartu secara otomatis setelah warga mengisi modal Discord.

## Background resmi

File background terbaru dari owner menggantikan asset lama:

```text
assets/ktp-desa-tulus-background.png
```

Dimensi renderer disamakan dengan background: `1011 × 638`.

## Perbaikan tampilan

- Header hijau gelap dengan judul KARTU TANDA PENDUDUK dan DESA TULUS.
- Panel data terang dan kontras agar tulisan tetap terbaca saat gambar diperkecil Discord.
- Enam data wajib selalu ditampilkan: No KTP Desa, Nama Warga, Jenis Kelamin, Domisili, Agama, dan Hobi.
- Panel avatar memiliki frame jelas. Avatar gagal dimuat akan diganti inisial nama.
- Tanggal pembuatan, status Warga Desa Tulus, catatan kartu komunitas, serta tanda Pak RW tampil rapi.
- Layout tidak menutupi watermark background DESA TULUS.

## Nomor KTP random unik

Nomor KTP sekarang:

```text
32 + 16 angka random
```

Total 18 digit. Sistem mengecek seluruh nomor KTP dalam guild sebelum menyimpan, sehingga nomor baru tidak sama dengan nomor warga lain. Nomor disimpan permanen di record KTP dan tidak berubah setiap kali kartu dilihat.

Record lama tidak dihapus. Nomor format lama dimigrasikan satu kali saat record dibaca atau diperbarui.

## Channel aktif

```text
💳│buat-ktp
1516813349957013614
```

## File diubah

- `services/ktpWarga.js`
- `assets/ktp-desa-tulus-background.png`
- `tests/ktpWarga.test.js`
- `config.json`
- `config.example.json`
- `index.js`
- `package.json`
- `package-lock.json`
- `dashboard/package.json`
- `dashboard/package-lock.json`
- `README.md`

## Pengujian

- Syntax seluruh file utama.
- 100 nomor KTP random tanpa duplikat.
- Nomor KTP 18 digit dan prefix 32.
- Background terbaru berhasil dimuat.
- Output PNG 1011 × 638.
- Perbandingan pixel memastikan renderer tidak hanya mengirim background kosong.
- Auto Level Role, dashboard allowlist, dan AFK Voice tetap lulus tes.

Tidak ada level, poin, leaderboard, role, KTP lama, MongoDB, config fitur lain, atau data member yang direset.
