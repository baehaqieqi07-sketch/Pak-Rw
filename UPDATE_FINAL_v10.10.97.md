# Pak RW v10.10.97 — AI Limit Auto Recovery + Token Budget

Update ini fokus hanya pada sistem AI Pak RW agar tetap hemat limit, tidak mati permanen setelah rate limit/provider cooldown, dan bisa mencoba normal lagi otomatis setelah waktu cooldown lewat.

## Perubahan utama

- Token budget sebelum call AI: prompt dihitung kira-kira karakter/4.
- Prompt dipangkas otomatis jika melebihi budget.
- Error AI diklasifikasikan: rate limit, token limit, credit limit, auth error, provider error.
- Rate limit/provider error masuk cooldown sementara dan otomatis retry normal setelah waktunya lewat.
- Credit/auth lock tidak spam retry.
- Token limit tidak dianggap waktu reset; prompt dipangkas dan retry maksimal 1x.
- Fallback lokal dibuat natural, pendek, dan tidak disimpan panjang ke memory.
- Memory dikirim sebagai ringkasan, bukan full percakapan.
- Server context hanya dikirim saat pertanyaan memang butuh channel/role/dashboard/fitur server.
- Dashboard Feature Settings mendapat panel AI Limit & Recovery.
- Owner command tambahan: ailimit, aireset, aitest, aimode, aifallback, trimemory.

## File yang diubah

- ai/brain.js
- index.js
- config.example.json
- .env.example
- README.md
- package.json
- package-lock.json
- dashboard/package.json
- dashboard/package-lock.json
- tests/aiBrain.test.js

## Data aman

Tidak ada reset data member, MongoDB, memory lama, level, role, welcome, curhat, saran, voting, KTP, AFK Voice, atau dashboard lama.
