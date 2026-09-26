# AGENTS.md — KOST CHAMEL GOWA

## Status Proyek
Repo: SPA **`public/index.html`** (1.455 baris, ±68 KB, Vue 3) + backend **`backend/Code.gs`** (497 baris, Google Apps Script, **ditulis ulang dari nol** — kontrak identik mock FE; versi lama masih di `origin/main`) + `backend/.clasp.json` + `backend/appsscript.json`. Belum ada `package.json` — **app tidak pakai npm**.
**Project GAS dibuat ulang 26 Sep 2026** — scriptId & ID deployment lama (di `origin/main`) sudah mati/404; ID yang berlaku ada di header `Code.gs` (sinkron dgn `GAS_URL` FE).
Masih dihapus dari worktree: `firebase.json`, `.firebaserc`, `.gitignore`, `.github/workflows/deploy.yml`.

## Commands (verifikasi, jangan tebak)
- **Tidak ada** `npm run dev/test/lint/typecheck`, build step, atau codegen. Jangan buat/bilang perintah itu.
- **Preview FE:** buka `public/index.html` langsung di browser; set `USE_MOCK = true` (`index.html:128`) untuk demo tanpa backend. `firebase serve` **tidak bisa** (tidak ada `firebase.json`); tidak ada alur deploy hosting di repo (CI dihapus) — jangan mengarang perintah deploy.
- **Backend — selalu dari folder `backend/`** (`.clasp.json` di sana, `rootDir: ""`; clasp 3.4.1 terpasang):
  1. edit lokal → `clasp push` (bila output `Skipping push.` → pakai `clasp push --force`)
  2. `clasp update-deployment --deploymentId <DEV_ID>` → uji endpoint Dev (FE `GAS_ENV = 'dev'`)
  3. valid → `clasp update-deployment --deploymentId <PROD_ID>` → `GAS_ENV = 'prod'`
  4. **Provisioning/seed DB tanpa browser** — lewat webapp sendiri: `POST GAS_URL.exec` (`Content-Type: text/plain;charset=utf-8`) body `{"action":"setup"|"seedContoh","adminKey":"kost_chamel"}`. Jangan `clasp run` — Execution API selalu `403 PERMISSION_DENIED` (project GAS belum terikat GCP). Sudah dijalankan 26 Sep 2026: folder + spreadsheet "KOST CHAMEL GOWA", tab Kamar/Penghuni/Transaksi + header, Script Property `SHEET_ID`, seed 8/6/12 baris.
- **DILARANG `clasp deploy` / `clasp create-deployment`** — pada clasp terpasang, `deploy` = alias `create-deployment` yang membuat ID deployment BARU (spam). Update hanya via `update-deployment|redeploy <deploymentId>`.
- ID tetap (DEV/PROD) + `scriptId` ada di header `Code.gs` (bagian "DEPLOYMENT ID") dan harus sinkron dgn `GAS_URL.dev/prod` (`index.html:131-132`).

## 1. Tech Stack
- **Frontend:** Single File HTML5 + Vue 3 CDN (`index.html:123`) + Tailwind CDN (`:15`, `tailwind.config` `:17`) + font Inter.
- **Backend:** Google Apps Script (CLASP) — **Database:** Google Sheets.
- **DILARANG KERAS:** React, Angular, Node.js backend runner, Python, Vite, Webpack, PostCSS, Axios/jQuery, atau memecah komponen ke `.vue` / file `.js` terpisah.

## 2. Frontend (SPA Single File Ketat)
- Seluruh markup, CSS, komponen Vue, routing, dan API call wajib utuh di **satu file `public/index.html`**. Jangan pecah kecuali instruksi langsung user.
- Routing **hash router** murni (`#/path`); peta rute: objek `routes` di `index.html:1361` (komponen = JS Object, render via template literal `` template: `...` ``).
- Blok config global `index.html:127-135`: `USE_MOCK` (`:128`), `GAS_ENV` `'dev'|'prod'` (`:129`), `GAS_URL` dev/prod (`:131-132`), `ADMIN_PASSWORD` (`:134`), `ADMIN_ROUTES` (`:135`). `GAS_ENV` saat ini **`'dev'`** — pastikan sesuai sebelum push ke hosting produksi.
- **Tanpa data sementara:** semua data full load dari backend (`refresh()` → `loadSemua`), **dilarang menyimpan data DB di localStorage/snapshot** (sisa kunci lama dibersihkan di `index.html:1406`). Auto-refresh tiap 45 dtk + saat tab aktif lagi (`index.html:441-442`).

## 3. API & Mock (sumber kontrak = kode, bukan dokumen)
- `api()` di `index.html:315-358`:
  - Native `fetch()` + `redirect: 'follow'` (endpoint GAS selalu 302).
  - POST header `Content-Type': 'text/plain;charset=utf-8'` + `JSON.stringify` untuk cegah preflight CORS yang ditolak GAS; **`adminKey` dikirim di dalam body, bukan header** (`:326`).
  - Timeout: baca 10 dtk, tulis 30 dtk (`:327`). **Baca di-retry maks 3× (backoff 500/1200 ms); tulis TIDAK PERNAH di-retry** (`maxCoba = 1`, `:328` — retry = baris duplikat, commit `155be10`). Duplikat dicegah lewat `clientRef` idempoten yang dibuat otomatis (`:323-324`).
  - Daftar aksi baca `READ_AKSI` (`:319`) menentukan klasifikasi timeout/retry — jangan diubah sepihak.
- **Mock:** `USE_MOCK = true` melewati fetch; `mockApi()` (`:237`) wajib 100% identik format **dan** pesan validasi respon backend sungguhan; mock in-memory (seed ulang tiap reload, tanpa localStorage).
- **Sinkronisasi wajib bila menambah aksi** (4 tempat): case di `mockApi()` FE ↔ `case` di `Code.gs` `handle_()` ↔ `READ_ACTIONS`/`ADMIN_ACTIONS`/`CREATE_ACTIONS` (`Code.gs` bagian KONFIG) ↔ `READ_AKSI` FE. Aksi tulis `CREATE_ACTIONS` wajib idempoten (`clientRef` 24 jam).
- Backend **tanpa cache** (tanpa CacheService) — baca selalu fresh dari Sheets; semua respon keluar via `out()` (ContentService JSON).

## 4. Design System & Skema
- Token warna di **`design.md`**; konfigurasi Tailwind via script tag. Jangan hardcode warna lain.
- **Tema TERANG:** background `#F2F2F2`, surface putih, teks hitam (syarat kontras `prd.md` §7), brand hijau `#008444`, nav aktif ungu `#9B72B0`.
- Hijau = pemasukan/sukses, Oranye `#F9A825`/Merah `#D32F2F` = pengeluaran/alarma — konsisten di seluruh layar.
- Skema tab & validasi: `prd.md` §6 (FR-01…FR-05): tab `Kamar`, `Penghuni`, `Transaksi` — jadikan `prd.md` satu-satunya sumber skema; kolom fisik ada di `HEADERS` (`Code.gs` bagian KONFIG) — **wajib sinkron dengan `prd.md` §6**.

## 5. Aturan Modifikasi Kode (Ketat)
1. **Strict scope:** eksekusi hanya baris/fungsi yang diminta; dilarang refactor file tak terkait.
2. **Append-only:** prioritaskan fungsi baru tanpa menimpa yang sudah stabil.
3. **Single file integrity:** jangan pecah `index.html`.
4. **Zero packages:** jangan instal/sarankan dependensi npm frontend.
5. **Konfirmasi:** perubahan struktur dasar wajib minta izin dulu.

## 6. Konvensi Lain
- **Format commit:** `{type}: {description}` dengan type `feat` | `fix` | `chore` | `docs`.
- **`.gitignore` sudah dihapus dari worktree** — jangan sekali-kali menambahkan `.clasprc.json`, `serviceAccount*.json`, `.env*` ke repo.
- Jangan push/deploy backend tanpa izin user — `clasp push` menyentuh project GAS live.
