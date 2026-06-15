# Dashboard Pak RW - Archive / Disabled Mode

Dashboard Pak RW tidak dihapus. Di mode DisCloud, dashboard dimatikan default dengan ENV:

```env
DASHBOARD_ENABLED=false
```

Kode dashboard masih tersimpan di `index.js`, tetapi web server hanya berjalan jika:

```env
DASHBOARD_ENABLED=true
```

Aktifkan lagi nanti setelah bot Discord stabil.
