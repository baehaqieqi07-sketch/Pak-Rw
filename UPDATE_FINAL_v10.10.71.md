# Pak RW v10.10.71 — Symmetry Clean Dashboard Final

Update ini dibuat setelah hasil v10.10.70 masih terasa tidak simetris, terlalu transparan, dan beberapa area editor/picker masih terlihat menumpuk.

## Fokus finishing

- Layout dashboard dikunci lebih simetris.
- Card dibuat lebih solid dan konsisten.
- Jarak antar section dibuat sama.
- Picker channel/role/user dibuat modal tengah layar yang rapi, bukan popover yang numpuk di card.
- Editor embed dibuat lebih mudah dibaca.
- Preview Discord tetap berada di kolom yang stabil.
- Background 2D tetap dipakai, tetapi overlay dibuat lebih tenang agar tidak mengganggu form.
- Mobile dan tablet dibuat satu kolom supaya tidak pecah.

## Perubahan visual utama

- `main-content` diberi batas lebar maksimal agar tidak terlalu melebar.
- `surface-card`, `builder-disclosure`, `page-save-bar`, `manage-tabs`, dan `target-picker-row` memakai style yang sama.
- Border, shadow, radius, padding, dan font size diseragamkan.
- Topbar dan sidebar dibuat lebih solid.
- Efek background dikurangi supaya dashboard lebih adem dan tidak ramai.
- Workflow steps dibuat sejajar.
- Manage page memakai grid kanan-kiri yang tetap stabil.

## Picker Discord

Picker sekarang:

- muncul sebagai modal di tengah layar;
- ukuran maksimal stabil di desktop;
- fullscreen rapi di HP;
- punya search yang jelas;
- list tidak keluar layar;
- tombol close dan footer tetap terlihat;
- tetap menyimpan ID Discord asli.

## Embed editor

Editor embed sekarang:

- field lebih tinggi dan mudah diketik;
- autocomplete `@` dan `#` tetap aktif;
- suggestion tidak ketutup card;
- preview kanan tidak ikut melebar berantakan;
- save bar lebih stabil;
- form kiri dan preview kanan tidak saling numpuk.

## Yang tidak diubah

- Logic bot Discord.
- Level dan poin.
- Top Aktif scheduler.
- Papan Aktif lifetime.
- MOTM.
- Voice tracker.
- MongoDB schema dan data.
- `.env`, token, API key, MongoDB URI.

## Hasil test

```txt
npm run check: berhasil
npm --prefix dashboard run build: berhasil
Vite modules transformed: 1599
```

## Cara pasang

```powershell
cd "D:\Pak Rw"
npm.cmd install
npm.cmd run check
npm.cmd start
```

Build dashboard manual:

```powershell
cd "D:\Pak Rw\dashboard"
npm.cmd install
npm.cmd run build
```

## Push GitHub

```powershell
cd "D:\Pak Rw"
git status
git add .
git commit -m "fix dashboard symmetry Pak RW v10.10.71"
git push
```

## Catatan

Kalau setelah deploy tampilan masih seperti versi lama, bersihkan cache browser dengan hard refresh:

```txt
Ctrl + F5
```

atau buka mode incognito. Railway/Vercel/Browser kadang masih menyimpan asset lama.
