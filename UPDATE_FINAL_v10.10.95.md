# Pak RW v10.10.95 — AI Jawaban Konflik Warga Lebih Jelas

Fokus update ini hanya memperbaiki jawaban AI Pak RW yang sebelumnya terasa template/gajelas ketika warga melapor ada konflik/ribut.

## Perbaikan

- Pak RW tidak lagi menganggap semua pesan yang mengandung kata `warga` sebagai permintaan Basa Sunda formal.
- Laporan seperti `iye aya warga garelut`, `ada warga ribut`, `member berantem`, atau `warga cekcok` sekarang masuk intent konflik warga.
- Jawaban konflik dibuat langsung ke tindakan:
  - jangan ikut panas,
  - cek channel kejadian,
  - simpan bukti bila perlu,
  - panggil staff/owner BEKIW bila mengganggu,
  - minta detail siapa, channel mana, dan awal masalahnya.
- Fallback lokal tidak lagi memakai template kosong `Biar jelas, jawabannya bakal dibuat begini` untuk laporan pendek.
- Deteksi greeting diperketat supaya kalimat yang hanya menyebut `Pak RW` tetapi berisi masalah tidak dianggap sapaan biasa.

## Tidak diubah

- KTP Warga
- Dashboard KTP Design Studio
- AI memory per user
- AFK Voice
- Level, poin, role
- MongoDB dan data lama
- Command lain
