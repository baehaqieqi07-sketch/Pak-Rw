# Pak RW v10.10.99 — Background KTP Baru + Saran Baru + Warna Embed Editable

Update ini fokus pada tiga hal sesuai permintaan:

1. Background KTP diganti memakai file background yang dikirim user, tanpa membuat gambar baru.
2. Format embed Kritik & Saran diganti menjadi format baru.
3. Warna embed dibuat bisa diedit dari dashboard, baik warna default maupun warna template embed.

## Perubahan KTP

- Asset `assets/ktp-desa-tulus-background.png` diganti dengan background baru dari user.
- Ukuran asli background tetap `1011 x 639`.
- Renderer KTP, font Railway, posisi teks, avatar, dan sistem nomor KTP tetap dipertahankan.
- Tidak ada overlay/watermark tambahan yang dibuat dari kode.

## Perubahan Kritik & Saran

Default embed saran baru:

```text
📬 Kritik & Saran Baru

👤 Pengirim:
{user} atau anonim

💬 Isi Saran:
{content}
```

- Jika user mengisi nama, `{user}` memakai nama yang diisi.
- Jika dikosongkan, tampil sebagai `Anonim`.
- Judul saran tetap ikut disisipkan di bagian isi agar tidak hilang.
- Voting setuju/tidak setuju tetap aman.

## Warna Embed Editable

- `hexColor()` sekarang membaca warna asli dari config/dashboard.
- Warna default embed di Settings dashboard tidak lagi dikunci ke `#7DBD77`.
- Warna template embed tetap bisa diedit dari Embed Builder.
- Embed yang sebelumnya memakai warna default sekarang mengikuti `config.embedColor`.
- Template `suggestionResult` memakai warna dari `config.embeds.suggestionResult.color`.

## Tidak Diubah

- AI Pak RW GPT-4o mini.
- AI limit auto recovery.
- AFK Voice.
- Level, poin, role, welcome, curhat, saran voting logic, dashboard lama, MongoDB, dan data member.

## Tes

- `npm run check` lulus.
- `npm run dashboard:build` lulus.
- KTP renderer 1011 x 639 lulus.
- Font Railway lulus.
- AI tests lulus.
- AFK Voice tests lulus.
- KTP Design Studio tests lulus.
