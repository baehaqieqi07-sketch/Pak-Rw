# UPDATE FINAL v10.10.112 — Welcome Text Delay

Fokus update:
- Welcome Pak RW tetap text biasa / context tanpa embed.
- Pesan welcome tidak dikirim terlalu cepat setelah member baru join.
- Default delay welcome: 5500 ms.
- Delay bisa diatur dari config/dashboard melalui `welcome.delayMs`.
- Setelah delay, bot fetch ulang member supaya data member baru lebih aman sebelum kirim welcome.

Yang dijaga:
- Tidak reset data.
- Tidak ubah logic poin.
- Tidak ubah logic level.
- Tidak ubah MOTM.
- Tidak ubah leaderboard image.
- Tidak mengembalikan welcome ke embed.

Test:
- `npm run check` berhasil.
- `npm --prefix dashboard run build` berhasil.
