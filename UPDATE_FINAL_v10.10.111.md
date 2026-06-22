# UPDATE FINAL v10.10.111 — Welcome Text Biasa Tanpa Embed

## Fokus update
Update ini mengganti seluruh welcome Pak RW menjadi pesan text/context biasa, bukan embed.

## Pesan welcome baru
```text
Wilujeung sumping, {user}!

Akhirnya mampir juga ke {server}
Disini tempatnya ngobrol santai, saling kenal, curhat, bercanda, dan jadi bagian dari warga Desa Tulus.

Jangan sungkan buat mulai ngobrol ya. Semoga betah disini!
{memberTulusRole}
```

Catatan: `{memberTulusRole}` akan berubah menjadi mention role Warga yang tersimpan di config. Kalau role belum diatur, fallback tetap aman.

## Yang diubah
- Event `GuildMemberAdd` sekarang mengirim `content` text biasa.
- Tidak ada `EmbedBuilder` untuk welcome member baru.
- Tidak ada title embed, description embed, thumbnail, image, author, footer, atau timestamp untuk welcome.
- Config lama dipaksa migrasi ke mode `text` agar dashboard/config lama tidak mengembalikan welcome ke embed.
- `config.json` dan `config.example.json` disinkronkan.
- Dashboard manage welcome diperbarui agar jelas: welcome sekarang text biasa tanpa embed.
- Embed Sync untuk template welcome tidak memaksa embed jika `embed: null`.

## Yang tidak diubah
- Tidak reset data member.
- Tidak ubah logic poin.
- Tidak ubah logic level.
- Tidak ubah MOTM.
- Tidak ubah leaderboard image fix sebelumnya.
- Tidak hapus command lama.

## Test yang sudah dijalankan
```bash
npm run check
npm --prefix dashboard run build
```

Keduanya berhasil.

## Cara pasang update ke folder project
Misal ZIP diextract ke `D:\Pak-RW-Welcome-Text-No-Embed`, dan project utama ada di `D:\Pak Rw`:

```powershell
Copy-Item -Path "D:\Pak-RW-Welcome-Text-No-Embed\*" -Destination "D:\Pak Rw" -Recurse -Force
cd "D:\Pak Rw"
npm install
npm --prefix dashboard install
npm run check
npm --prefix dashboard run build
```

## Cara push ke GitHub
```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "fix: send Pak RW welcome as plain text"
git push origin main
```

Kalau GitHub lebih baru:
```powershell
git pull --rebase origin main
git push origin main
```
