# Panduan Instalasi - Lentera Akademik (Arsitektur Baru: GAS sebagai API)

## Kenapa migrasi ini dilakukan

Sebelumnya, tampilan aplikasi (HTML/CSS/JS) dimuat langsung oleh Google Apps
Script dan dibuka di dalam iframe berlapis milik Google (`userCodeAppPanel`,
`userHtmlFrame`, dst). Di jaringan/perangkat terkelola sekolah Anda, lapisan
iframe itu dibongkar dan ditulis ulang oleh proxy/ekstensi keamanan sekolah
sebelum sempat berjalan, sehingga tombol Masuk gagal (`doLogin is not
defined`) walau kode di baliknya sudah benar.

Sekarang:
- **Backend** (`Kode.gs`) hanya jadi API JSON murni (tidak ada HTML sama
  sekali untuk halaman aplikasi) -- dipanggil lewat `fetch()`, bukan
  `google.script.run`, dan tidak lagi dibungkus iframe Apps Script.
- **Frontend** (folder ini) dihosting terpisah di **GitHub Pages**, jadi
  yang dibuka pengguna adalah `https://USERNAME.github.io/nama-repo/`
  biasa -- halaman web polos, bukan alamat `script.google.com`.

Ini menghilangkan sama sekali penyebab masalah sebelumnya.

---

## BAGIAN 1 -- Backend (Google Apps Script)

1. Buka https://script.google.com -> **Proyek Baru**.
2. Klik file `Code.gs` bawaan, ganti namanya jadi **Kode**, hapus isinya,
   lalu tempel seluruh isi `Kode.gs` yang saya berikan terpisah (bukan di
   dalam ZIP ini).
3. Ganti baris berikut dengan teks rahasia Anda sendiri (jangan biarkan nilai
   bawaan):
   ```js
   const SALT = 'lentera-2026';
   ```
4. Jalankan fungsi **`setupAppEnvironment`** sekali (pilih di dropdown fungsi
   atas editor -> klik ▶ Run -> setujui izin). Ini membuat Google Sheets dan
   folder Drive secara otomatis. Cek **Execution Log** untuk memastikan
   berhasil.
   > ⚠️ **Hanya jalankan sekali** untuk instalasi baru. Kalau sudah pernah
   > berjalan sebelumnya (versi lama aplikasi ini), **tidak perlu** dijalankan
   > ulang -- data Anda sudah ada, cukup lanjut ke langkah deploy.
5. **Deploy -> New deployment**:
   - Pilih tipe **Web app**.
   - **Execute as:** Me
   - **Who has access:** **Anyone** (bukan "Anyone with Google account" --
     karena frontend akan memanggilnya tanpa login Google sama sekali, login
     aplikasi ditangani sendiri oleh sistem username/password kita).
   - Klik **Deploy**, salin URL yang **berakhiran `/exec`**. Simpan URL ini,
     akan dipakai di Bagian 2.

Kalau nanti Anda mengubah `Kode.gs` lagi, ulangi: **Deploy -> Manage
deployments -> ikon pensil -> Version: New version -> Deploy** (URL tetap
sama, tidak perlu diganti di frontend).

---

## BAGIAN 2 -- Frontend (folder di ZIP ini)

1. Ekstrak ZIP. Folder hasil ekstrak **adalah** folder proyek Anda --
   `index.html` ada tepat di dalamnya (bukan di dalam subfolder lagi).
2. Buka `js/config.js` dengan Notepad/editor teks, ganti baris:
   ```js
   const GAS_URL = 'PASTE_URL_WEB_APP_DISINI/exec';
   ```
   dengan URL `/exec` dari Bagian 1 langkah 5. Simpan.
3. **Uji coba lokal dulu (opsional tapi disarankan):** buka `index.html`
   langsung dua kali klik di file explorer -- kalau browser Anda mengizinkan
   `fetch()` dari file lokal, halaman login akan langsung memuat nama
   aplikasi. Kalau tidak muncul, tidak masalah, lanjut saja ke deploy --
   yang penting nanti setelah online.
4. **Deploy ke GitHub Pages** -- ini butuh langkah git dari terminal, akan
   saya pandu satu per satu langsung di percakapan (bukan di dokumen ini),
   supaya setiap langkah bisa dicek hasilnya sebelum lanjut.

---

## Uji coba setelah online

1. Buka alamat GitHub Pages Anda (`https://username.github.io/nama-repo/`).
2. Coba login dengan `admin` / `admin123`.
3. **Segera ganti password admin** setelah berhasil masuk (Data Master ->
   Users -> ikon kunci pada baris admin).
4. Buka F12 -> Console kalau ada kendala; error `Failed to fetch` biasanya
   berarti `GAS_URL` di `config.js` belum diisi/salah, atau deployment GAS
   belum diatur ke akses **Anyone**.

## Berkas lama yang tidak dipakai lagi

`Index.html`, `Stylesheet.html`, dan `JavaScript.html` dari versi
sebelumnya **tidak lagi dipakai** dan boleh dihapus dari proyek Apps
Script Anda (klik titik tiga di sebelah nama file -> Delete) -- cukup
sisakan `Kode.gs` di proyek Apps Script.
