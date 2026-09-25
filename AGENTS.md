# AGENTS.md — KOST CHAMEL GOWA

## Status Proyek
Greenfield: repo baru berisi `prd.md` (kebutuhan produk + skema data), `design.md` (design token), `image1.jpg` (referensi visual), dan file ini. Belum ada kode, git, CI, atau manifest — semua struktur di bawah adalah **target** yang wajib dibuat dari nol.

## Prerequisites & Local Setup
1. **Google Apps Script (CLASP)** — `clasp login`, lalu jika belum ada: `clasp create --type webapp --title "KOST CHAMEL GOWA" --rootDir ./backend`
2. **Firebase CLI** — `firebase login`, lalu `firebase init hosting` (direktori `public`).
3. **Preview lokal:** `firebase serve` atau `firebase emulators:start`. **Tidak ada** `npm run dev`, Vite, atau dev server Node — jangan menebak perintah itu.

## 1. Tech Stack
- **Frontend:** Single File HTML5 + Vue 3 CDN + Tailwind CSS CDN
- **Backend:** Google Apps Script (CLASP) — **Database:** Google Sheets
- **Hosting:** Firebase Hosting — **CI/CD:** GitHub Actions
- **DILARANG KERAS:** React, Angular, Node.js backend runner, Python, Vite, Webpack, PostCSS, Axios/jQuery, atau memecah komponen ke `.vue` / file `.js` terpisah.

## 2. Frontend (SPA Single File Ketat)
- Seluruh markup, CSS, komponen Vue, routing, dan API call wajib utuh di **satu file `public/index.html`**.
- Routing wajib **hash router** murni (`#/path`) tanpa reload.
- Komponen Vue ditulis sebagai JavaScript Object di `<script>`, render via template literal `` template: `...` ``.
- **Fetch ke GAS:**
  - Native `fetch()` saja, selalu `redirect: 'follow'` (endpoint GAS selalu 302).
  - POST wajib header `Content-Type: 'text/plain;charset=utf-8'` + `JSON.stringify(data)` untuk mencegah CORS preflight OPTIONS diblokir browser.
  - Semua request dibungkus try/catch dan di-parse `.json()`.
- **Mock system:** variabel global `USE_MOCK = true` melewati fetch dan memakai object mock lokal; format respon mock wajib **100% identik** dengan respon backend sungguhan.

## 3. Design System
- Wajib patuhi token di **`design.md`**; konfigurasikan Tailwind via script tag di `index.html` dari token tersebut. Jangan hardcode warna lain.
- **Tema TERANG**, bukan dark mode: background `#F2F2F2`, surface putih, teks hitam (syarat kontras `prd.md` §7), brand hijau `#008444`, nav aktif ungu `#9B72B0`.
- Warna Hijau = pemasukan/sukses, Oranye `#F9A825`/Merah `#D32F2F` = pengeluaran/alarma — konsisten di seluruh layar.

## 4. Backend (Google Apps Script via CLASP)
- File utama: `backend/Code.gs` + utilitas pendukung. Dilarang edit via Web Editor; sinkronisasi hanya `clasp push`.
- Setiap respon `doGet(e)`/`doPost(e)` wajib JSON valid:
  `ContentService.createTextOutput(JSON.stringify(responsePayload)).setMimeType(ContentService.MimeType.JSON)`
- **Deployment:** 1 project GAS, 2 Deployment ID tetap (Dev & Prod). **Dilarang `clasp deploy` tanpa `--deploymentId`** (menimbulkan spam ID baru).
- Alur update: edit lokal → `clasp push` → `clasp deploy --deploymentId {DEV_DEPLOYMENT_ID}` → uji endpoint Dev → jika valid → `clasp deploy --deploymentId {PROD_DEPLOYMENT_ID}`.

## 5. CI/CD & Firebase Hosting
- Deploy frontend otomatis setiap `push` ke branch `main` via `.github/workflows/deploy.yml` dengan step `FirebaseExtended/action-hosting-deploy@v0`.
- Autentikasi wajib Google Cloud Service Account via secret `FIREBASE_SERVICE_ACCOUNT`.

## 6. Struktur Folder Target
```text
kost-chamel/
├── public/index.html         <-- SATU file SPA (HTML + Vue 3 + Tailwind + script)
├── backend/
│   ├── Code.gs               <-- Logika GAS & Spreadsheet
│   ├── appsscript.json
│   └── .clasp.json
├── .github/workflows/deploy.yml
├── firebase.json             <-- arahkan ke folder "public"
├── .firebaserc
├── .gitignore
├── prd.md / design.md / AGENTS.md
```

## 7. Aturan Modifikasi Kode (Ketat)
1. **Strict scope:** eksekusi hanya baris/fungsi yang diminta eksplisit; dilarang refactor/format ulang file tak terkait.
2. **Append-only:** prioritaskan fungsi baru tanpa menimpa yang sudah stabil.
3. **Single file integrity:** jangan pecah `index.html` kecuali ada instruksi langsung user.
4. **Zero packages:** jangan instal/sarankan dependensi npm frontend.
5. **Konfirmasi:** perubahan struktur dasar wajib minta izin dulu.

## 8. Data & Konvensi Lain
- **Skema tab Google Sheets & aturan validasi** ada di `prd.md` §6 (FR-01…FR-05): tab `Kamar`, `Penghuni`, `Transaksi`. Jangan duplikasi atau ubah tanpa sinkron ke `prd.md`.
- **Format commit:** `{type}: {description}` dengan type `feat` | `fix` | `chore` | `docs`.
