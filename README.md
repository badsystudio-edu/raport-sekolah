# Lentera Akademik - Frontend (GitHub Pages)

Frontend statis aplikasi Raport Ujian Sekolah. Backend-nya adalah Google Apps
Script yang berjalan sebagai REST API murni (JSON), bukan lagi HtmlService
dengan iframe -- ini menghindari masalah proxy/ekstensi keamanan sekolah yang
membongkar iframe Apps Script.

## Struktur folder

```
index.html      <- halaman utama (jangan dipindah dari root)
css/style.css   <- semua gaya tampilan
js/config.js    <- ISI URL BACKEND DI SINI sebelum dipakai
js/api.js       <- lapisan komunikasi fetch() ke backend
js/app.js       <- seluruh logika aplikasi (SPA)
```

## Sebelum dipakai

1. Deploy backend (`Kode.gs`) ke Google Apps Script terlebih dahulu (lihat
   `PANDUAN-INSTALASI.md`), salin URL yang berakhiran `/exec`.
2. Buka `js/config.js`, ganti `PASTE_URL_WEB_APP_DISINI/exec` dengan URL
   tersebut.
3. Deploy folder ini ke GitHub Pages (lihat `PANDUAN-INSTALASI.md`).

## Login awal

Username `admin`, sandi `admin123` -- segera ganti setelah login pertama.
