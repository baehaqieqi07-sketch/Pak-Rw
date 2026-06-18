# Pak RW v10.10.90 — AI GPT-5.4 Smart Memory Desa Tulus

## Tujuan

Membuat AI Pak RW lebih pintar, lebih natural seperti Pak RW asli, mengenal owner BEKIW, memanggil warga dengan sebutan “nak”, memahami channel server, mengingat konteks setiap warga secara terpisah, dan tetap hemat limit.

## Perubahan Utama

1. **Identitas Pak RW dikunci jelas**
   - Nama: Pak RW.
   - Server: DESA TULUS.
   - Owner: BEKIW.
   - Panggilan warga: “nak” secara natural.

2. **Memori MongoDB per warga**
   - Scope: `guildId:userId`.
   - Maksimal 10 turn terbaru per warga.
   - Maksimal 600 warga aktif dalam penyimpanan AI.
   - Pembahasan satu warga tidak dapat masuk ke prompt warga lain.
   - Pola token dan API key disensor sebelum memori disimpan.

3. **Pengetahuan channel server secara live**
   - Channel dan role dibaca dari cache guild Discord setiap request.
   - Channel difilter berdasarkan permission `View Channel` milik warga.
   - Pak RW dilarang mengarang nama atau ID channel.

4. **Mode curhat khusus**
   - Curhat tidak dicampur dengan bantuan teknis.
   - Pak RW mendengarkan, memvalidasi perasaan, dan bertanya lembut.
   - Solusi diberikan hanya jika warga meminta atau memang relevan.

5. **Router model hemat**
   - Pertanyaan rutin: `openai/gpt-5.4-mini`.
   - Pertanyaan kompleks, coding, audit, dan mode Juragan: `openai/gpt-5.4`.
   - Sapaan/pertanyaan sederhana tetap memakai jawaban lokal.
   - Cache dipisah per warga.

6. **Command owner AI diperjelas**
   - `rwai status`
   - `rwai smart openai/gpt-5.4`
   - `rwai hemat openai/gpt-5.4-mini`
   - `rwai memory on`
   - `rwai channel #channel`

## Keamanan Data

Update tidak mereset MongoDB, level, poin, KTP warga, role otomatis, AFK Voice, channel, dashboard, atau konfigurasi lama. Data memori lama tetap memakai key `memory` yang sudah tersedia.
