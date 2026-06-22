# Pak RW v10.10.129 — Dashboard Green & AI Safety

## Selesai
- Tema dashboard dipindahkan dari indigo/biru ke forest green premium; backdrop kini memakai kontur desa CSS ringan.
- Dashboard Home menampilkan status Pak RW AI dan readiness privasi memory.
- AI Control Center menambahkan pengaturan provider non-secret, model, budget, cache, memory, dan penghapusan memory per warga.
- Backend hanya mengirim status AI, statistik memory, dan status key terkonfigurasi; tidak pernah mengirim key atau isi memory.
- `ai/brain.js` mendukung `AI_BASE_URL`/`ai.baseUrl`, fallback OpenRouter aman, header OpenRouter bersyarat, scrub nomor/email/ID, batas memory yang dapat dikonfigurasi, dan forget memory per guild-user.

## Masih perlu diverifikasi
- Jalankan check dashboard dan root setelah semua perubahan tersimpan.
- Verifikasi browser manual ketika runtime browser tersedia: tema hijau, mobile, save flow AI, dan reset memory.

## Safety
- Jangan reset data/database atau mengubah `.env`.
- Jangan menampilkan API key, token, atau isi memory warga.
- Lanjutkan hanya pada dashboard dan `ai/brain.js` bila sesi terputus.
