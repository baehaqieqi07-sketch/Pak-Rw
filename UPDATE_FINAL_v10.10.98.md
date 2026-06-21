# UPDATE FINAL v10.10.98 — AI GPT-4o Mini Natural DESA TULUS

Fokus update:

- Mengembalikan model default AI Pak RW ke `openai/gpt-4o-mini` seperti gaya Bekiw OT lama agar lebih hemat limit.
- Model pintar, model hemat, dan model utama default semuanya memakai `openai/gpt-4o-mini`.
- Model GPT-5.4 lama diperlakukan sebagai legacy sehingga config lama otomatis jatuh ke GPT-4o mini.
- AI tetap memakai token budget dan auto recovery dari v10.10.97.
- AI makin paham mode channel: pertanyaan, curhat, saran/voting, laporan, warga umum, dan juragan.
- AI mendapat context channel relevan dan member relevan saat user minta tag/mention.
- Jika user minta tag channel, AI diarahkan memakai `<#channelId>`.
- Jika user minta tag user/member, AI diarahkan memakai `<@userId>` dari direktori guild.
- Jawaban diarahkan lebih natural seperti Pak RW asli: tidak kaku, tidak alay, tidak lebay, tidak seperti bot, dan tetap berisi.

Fitur yang tidak diubah:

- KTP dan dashboard KTP.
- AFK Voice.
- Level, poin, role, welcome, saran, voting.
- Data MongoDB dan memory lama.
- Command lama dan prefix lama.
