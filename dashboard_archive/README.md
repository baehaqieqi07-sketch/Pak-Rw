# Dashboard Archive

`index.dashboard-legacy-v10.10.63.js` adalah snapshot lengkap sebelum dashboard React/Vite v10.10.64 dipasang.

Core bot tidak dihapus. Fungsi renderer dashboard lama masih dibiarkan di `index.js` untuk kompatibilitas dan rollback, tetapi route `/dashboard/*` sekarang menyajikan static production build dari `dashboard/dist`.

Rollback cepat:

1. Set `DASHBOARD_ENABLED=false` agar bot berjalan tanpa dashboard.
2. Untuk mengembalikan seluruh file lama, pulihkan snapshot ini sebagai `index.js` dan gunakan config/ZIP backup sebelumnya.
