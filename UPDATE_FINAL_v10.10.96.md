# UPDATE FINAL v10.10.96 — AI Natural Chat Pak RW

Fokus update ini hanya gaya jawaban AI Pak RW.

## Perubahan

- Jawaban Pak RW dibuat lebih natural seperti chat manusia biasa.
- Chat pendek dibalas pendek, bukan template panjang.
- Menghapus gaya jawaban seperti:
  - `Pak RW tangkap inti pesannya...`
  - `Pak RW belum dapat detail yang cukup...`
  - `Biar jelas, jawabannya bakal dibuat begini...`
  - `Supaya jawabannya tepat, kirim salah satu dari ini...`
- Sapaan singkat seperti `pa`, `pak`, `pak rw`, atau `p` dijawab singkat dan natural.
- Fallback lokal tetap hemat limit, tetapi tidak lagi terasa seperti format prompt.
- Jawaban API juga disaring; jika model mengembalikan pola template lama, Pak RW menggantinya dengan jawaban natural.
- Mode serius seperti konflik, error, dashboard, Discord, dan curhat tetap punya alur jelas saat memang dibutuhkan.

## Tidak diubah

- KTP Warga
- Dashboard KTP
- AFK Voice
- Level, poin, role
- MongoDB dan memori warga
- Command lain
- Background/desain KTP

## Test

- Syntax `ai/brain.js` lulus.
- Unit test AI natural chat lulus.
- Test memastikan output template lama tidak muncul lagi pada fallback lokal.
