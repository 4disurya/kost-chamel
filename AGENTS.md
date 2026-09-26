# AGENTS.md — KOST CHAMEL GOWA

## Status Proyek
Produk jalan: `public/index.html` (SPA ±71 KB) + `backend/Code.gs` (465 baris GAS), branch `main`, CI/CD Firebase Hosting aktif. Belum ada `package.json` — **app tidak pakai npm**.

## Commands (verifikasi, jangan tebak)
- **Tidak ada** `npm run dev`, test, lint, atau typecheck. Jangan buat/bilang perintah itu.
- **Preview lokal:** `firebase serve` (firebase CLI v15 terpasang).
- **Backend:** selalu dari folder `backend/` (`.clasp.json` ada di sana, `rootDir: ""`):
  1. edit lokal → `clasp push`
  2. `clasp update-deployment --deploymentId <DEV_ID>` → uji endpoint Dev
  3. jika valid → `clasp update-deployment --deploymentId <PROD_ID>`
- **DILARANG `clasp deploy` / `clasp create-deployment`** — pada clasp terpasang, `deploy` = alias `create-deployment` yang membuat ID deployment BARU (spam). Perintah update yang benar hanya `update-deployment|redeploy <deploymentId>`.
- ID tetap (DEV/PROD) dan `scriptId` tercatat di header `Code.gs:14-17`; URL-nya di `index.html:131-132` (`GAS_URL.dev/prod`) — keduanya wajib sinkron.

## 1. Tech Stack
- **Frontend:** Single File HTML5 + Vue 3 CDN + Tailwind CSS CDN
- **Backend:** Google Apps Script (CLASP) — **Database:** Google Sheets
- **Hosting:** Firebase Hosting — **CI/CD:** GitHub Actions
- **DILARANG KERAS:** React, Angular, Node.js backend runner, Python, Vite, Webpack, PostCSS, Axios/jQuery, atau memecah komponen ke `.vue` / file `.js` terpisah.

## 2. Frontend (SPA Single File Ketat)
- Seluruh markup, CSS, komponen Vue, routing, dan API call wajib utuh di **satu file `public/index.html`**. Jangan pecah kecuali instruksi langsung user.
- Routing **hash router** murni (`#/path`); peta rute di `index.html:1336` (objek `routes` → komponen View). Komponen = JavaScript Object, render via template literal `` template: `...` ``.
- Blok config global di `index.html:126-134`: `USE_MOCK`, `GAS_ENV` (`'dev'|'prod'`), `GAS_URL`, `ADMIN_PASSWORD`. **Mock:** `USE_MOCK = true` melewati fetch; format respon mock wajib 100% identik respon backend sungguhan; mock in-memory (seed ulang tiap reload, tanpa localStorage).
- **Fetch ke GAS** (`api()` di `index.html:308`):
  - Native `fetch()` + `redirect: 'follow'` (endpoint GAS selalu 302).
  - POST header `Content-Type: 'text/plain;charset=utf-8'` + `JSON.stringify(data)` untuk cegah preflight CORS diblokir.
  - Timeout: baca 10 dtk, tulis 30 dtk. **Tulisan sengaja tanpa retry** (commit `155be10` — retry menyebabkan duplikat); cegah duplikat lewat `clientRef` idempoten yang dibuat otomatis di `api()`.
  - Semua request dibungkus try/catch dan di-parse `.json()`.
- **Tanpa data sementara:** semua data full load dari backend saat dibuka (`refresh()` → `loadSemua`), tanpa snapshot/caching localStorage — **dilarang menambah penyimpanan lokal untuk data DB**. Auto-refresh tiap 45 dtk + saat tab kembali aktif (`index.html:434`).

## 3. Design System
- Token di **`design.md`**; konfigurasi Tailwind via script tag di `index.html`. Jangan hardcode warna lain.
- **Tema TERANG:** background `#F2F2F2`, surface putih, teks hitam (syarat kontras `prd.md` §7), brand hijau `#008444`, nav aktif ungu `#9B72B0`.
- Hijau = pemasukan/sukses, Oranye `#F9A825`/Merah `#D32F2F` = pengeluaran/alarma — konsisten di seluruh layar.

## 4. Backend (Google Apps Script via CLASP)
- Edit hanya lokal, sinkronisasi hanya `clasp push` (dilarang Web Editor). Kontrak di header `Code.gs:19-27`:
  - POST body: `{ action, payload, adminKey?, clientRef? }` → `{ success: true, data } | { success: false, message }`; GET = ping.
  - `adminKey` dikirim **di dalam body, bukan header** (header memicu preflight CORS yang ditolak GAS).
  - Aksi admin/baca/tulis terdaftar di `Code.gs:39-42` (`ADMIN_ACTIONS` / `READ_ACTIONS` / `CREATE_ACTIONS`) — ubah ketiganya bersamaan bila menambah aksi.
  - Aksi tulis `CREATE_ACTIONS` wajib idempoten: `clientRef` sama dalam 24 jam tidak menulis baris baru (`refDiterima_`).
- Setiap respon `doGet`/`doPost` wajib JSON via `out()`:
  `ContentService.createTextOutput(JSON.stringify(responsePayload)).setMimeType(ContentService.MimeType.JSON)`
- **Baca selalu fresh dari Sheets — tanpa cache backend** (`baca_`): perubahan/hapus langsung di spreadsheet wajib langsung tercermin di aplikasi (FE auto-sync tiap 45 dtk). Jangan tambah CacheService/caching baca.

## 5. CI/CD & Firebase Hosting
- Push ke `main` → `.github/workflows/deploy.yml` (`FirebaseExtended/action-hosting-deploy@v0`, `channelId: live`). **Tanpa build step** — upload mentah folder `public/`.
- Autentikasi: secret `FIREBASE_SERVICE_ACCOUNT`; project `kost-chamel-gowa` (`.firebaserc`).

## 6. Data & Skema
- Skema tab & validasi: `prd.md` §6 (FR-01…FR-05): tab `Kamar`, `Penghuni`, `Transaksi`.
- Kolom fisik ada di `HEADERS` (`Code.gs:34-38`) — **wajib sinkron dengan `prd.md` §6**; jangan ubah salah satu tanpa yang lain.

## 7. Aturan Modifikasi Kode (Ketat)
1. **Strict scope:** eksekusi hanya baris/fungsi yang diminta; dilarang refactor file tak terkait.
2. **Append-only:** prioritaskan fungsi baru tanpa menimpa yang sudah stabil.
3. **Single file integrity:** jangan pecah `index.html`.
4. **Zero packages:** jangan instal/sarankan dependensi npm frontend.
5. **Konfirmasi:** perubahan struktur dasar wajib minta izin dulu.

## 8. Konvensi Lain
- **Format commit:** `{type}: {description}` dengan type `feat` | `fix` | `chore` | `docs`.
- File sensitif sudah di `.gitignore` (`.clasprc.json`, `serviceAccount*.json`, `.env*`) — jangan pernah ditambahkan ke repo.
