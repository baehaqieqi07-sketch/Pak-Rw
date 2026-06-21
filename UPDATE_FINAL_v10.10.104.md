# Pak RW v10.10.104 — Format Kotak Saran Rapi

Update fokus ke tampilan **Kotak Saran** supaya hasil embed sesuai contoh Discord yang diminta.

## Perubahan

- Modal saran sekarang hanya berisi:
  - `Nama (kosongkan untuk anonim)`
  - `Masukkan kritik/saran kamu di sini:`
- Field `Judul saran` tidak dipaksa lagi.
- Embed saran default menjadi:

```text
📬 Kritik & Saran Baru

👤 Pengirim:
{user / Anonim}

💬 Isi Saran:
{content}
```

- Template lama yang masih berisi `{user} atau anonim` otomatis dinormalisasi saat render, jadi teks `atau anonim` tidak tampil mentah di Discord.
- Tombol panel saran menjadi `📬 Kirim Saran`.
- Reaction otomatis ✅ dan ❌ tetap ada.
- Thread otomatis `💬 Berikan Tanggapan` tetap ada.

## Aman

Tidak reset data member, MongoDB, KTP, AI, AFK Voice, Loket, level, role, welcome, curhat, atau fitur lain.
