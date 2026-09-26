/**
 * KOST CHAMEL GOWA — Backend Google Apps Script (CLASP)
 * Sumber aturan: prd.md §6 (FR-01…FR-05) + kontrak FE (public/index.html: api() & mockApi()).
 *
 * PROVISIONING DB (sekali — sudah dijalankan otomatis 26 Sep 2026, tanpa editor/browser):
 *   1. Dari folder backend/: `clasp login` (sekali), lalu `clasp push`
 *      (bila output `Skipping push.` → `clasp push --force`).
 *      Jalankan setup LEWAT WEBAPP ITU SENDIRI:
 *        POST <URL /exec>  Content-Type: text/plain;charset=utf-8
 *        body {"action":"setup","adminKey":"kost_chamel"}
 *      hasil: folder "KOST CHAMEL GOWA" + spreadsheet di dalamnya + tab Kamar/Penghuni/
 *      Transaksi (beserta header) + Script Property SHEET_ID — idempoten (reuse bila sudah ada).
 *      Data contoh: body sama, action "seedContoh".
 *   CATATAN: `clasp run` / Execution API selalu 403 PERMISSION_DENIED (project GAS belum
 *      terikat GCP project) — jangan dipakai; semua eksekusi lewat webapp (POST action).
 *   2. Update deployment TETAP (bukan deploy baru):
 *        `clasp update-deployment --deploymentId <DEV_ID>`  -> uji FE dgn GAS_ENV='dev'
 *        `clasp update-deployment --deploymentId <PROD_ID>` -> set GAS_ENV='prod' di FE
 *   DILARANG `clasp deploy` / `clasp create-deployment` berulang — membuat ID baru tiap kali (spam).
 *      (Pengecualian sekali saja saat project baru dibuat.)
 *
 * DEPLOYMENT ID (tetap — URL FE di public/index.html:131-132 harus sinkron dgn ini):
 *   DEV : AKfycbxgvozgbfQL4qE8485mQ55zJ4Qn5kvIl69kl9LhRZaR2PGpsI5yFhb2FgaXiEBGaGZSoQ
 *   PROD: AKfycbyMb605zOjyWiU5xmC4eGxGwVfWRwVxw-zfYOc4biQqFLrPaKdFp9_7A7JApP-k6A3ljA
 *   (auto HEAD: AKfycbwJIijWQkblTxkSN_-lhKijjejgi2tXsIIAEHWIaNaP)
 *   scriptId: 16tTwGHefLBijjZAXPQSqhycZXmotHKt2TUQAc41TCuKwx8SwsTE2Z6mE
 *   (scriptId lama 1IWEY_... sudah dihapus dari Google — project dibuat ulang 26 Sep 2026)
 *
 * KONTRAK (wajib identik dengan mock FE — jangan diubah sepihak):
 *   POST body : { action, payload, adminKey?, clientRef? }
 *   Respon    : { success: true, data } | { success: false, message }
 *   GET       : ping kesehatan endpoint.
 *   adminKey DI DALAM body, bukan header (header memicu preflight CORS yang ditolak GAS).
 *   Aksi admin (wajib adminKey benar): addKamar, updateKamar, deleteKamar,
 *        addPenghuni, updatePenghuni, setup, seedContoh.
 *   Aksi baca (tanpa lock): ping, listKamar, listPenghuni, listTransaksi, loadSemua.
 *   Aksi tulis terbuka: addTransaksi.
 *   CREATE_ACTIONS wajib idempoten: clientRef sama dalam 24 jam tidak menulis baris baru.
 *   Semua respon keluar lewat out() (ContentService JSON) — tanpa CacheService.
 */

/* ========================= KONFIG ========================= */
const APP_NAME = 'KOST CHAMEL GOWA';
const SHEET_ID = ''; // opsional; default diisi setup() ke Script Properties
const TAB = { kamar: 'Kamar', penghuni: 'Penghuni', transaksi: 'Transaksi' };
const HEADERS = {
  Kamar: ['ID', 'No', 'Fasilitas', 'Harga', 'Status'],
  Penghuni: ['ID', 'Nama', 'NoHP', 'Tipe', 'TglMasuk', 'KamarID', 'StatusBayar', 'TglKeluar', 'Notes'],
  Transaksi: ['ID', 'Tipe', 'Nama', 'Jumlah', 'Tgl', 'Ket']
};
const ADMIN_ACTIONS = ['addKamar', 'updateKamar', 'deleteKamar', 'addPenghuni', 'updatePenghuni', 'setup', 'seedContoh'];
const READ_ACTIONS = ['ping', 'listKamar', 'listPenghuni', 'listTransaksi', 'loadSemua'];
const CREATE_ACTIONS = ['addKamar', 'addPenghuni', 'addTransaksi'];
const ADMIN_KEY_DEFAULT = 'kost_chamel'; // bisa dioverride lewat Script Property ADMIN_KEY

/* ========================= ENVELOPE & AUTH ========================= */
const ok = data => ({ success: true, data: data });
const fail = message => ({ success: false, message: message });
const out = payload =>
  ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
const kunciAdminOk_ = kunci => {
  const aktif = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return String(kunci || '') === (aktif || ADMIN_KEY_DEFAULT);
};

/* ========================= IDEMPOTENSI TULIS (clientRef) ========================= */
// FE membuat clientRef otomatis tiap aksi tulis; ref sama dalam 24 jam terakhir
// tidak menulis baris baru — hasil pertama (ID baris) dikembalikan sebagai sukses.
const REF_PROPS_KEY_ = 'REF_TERAKHIR';
const REF_MAKS_ = 100;
const REF_USIA_MS_ = 24 * 3600 * 1000;

function refDiterima_(ref) {
  if (!ref) return '';
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(REF_PROPS_KEY_);
    const map = raw ? JSON.parse(raw) : {};
    const e = map[String(ref)];
    if (!e || Date.now() - Number(e.t || 0) > REF_USIA_MS_) return '';
    return String(e.id || '');
  } catch (err) {
    return '';
  }
}

function catatRef_(ref, idHasil) {
  if (!ref) return;
  try {
    const sp = PropertiesService.getScriptProperties();
    const raw = sp.getProperty(REF_PROPS_KEY_);
    const map = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    map[String(ref)] = { id: String(idHasil || ''), t: now };
    let entri = Object.keys(map)
      .map(k => ({ k: k, id: map[k] && map[k].id, t: Number(map[k] && map[k].t || 0) }))
      .filter(e => now - e.t <= REF_USIA_MS_)
      .sort((a, b) => b.t - a.t)
      .slice(0, REF_MAKS_);
    const hasil = {};
    entri.forEach(e => { hasil[e.k] = { id: e.id, t: e.t }; });
    sp.setProperty(REF_PROPS_KEY_, JSON.stringify(hasil));
  } catch (err) { /* property penuh — idempotensi lemah, tulis tetap jalan */ }
}

function dataDariRef_(action, id) {
  const tab = action === 'addPenghuni' ? TAB.penghuni : (action === 'addTransaksi' ? TAB.transaksi : TAB.kamar);
  return baca_(tab).find(r => String(r.ID) === String(id)) || null;
}

/* ========================= SHEET HELPERS ========================= */
// Baca selalu fresh dari Spreadsheet — TANPA CacheService, supaya edit manual
// di spreadsheet langsung tercermin (FE auto-sync tiap 45 dtk).
function ss_() {
  const propId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const id = propId || SHEET_ID;
  if (id) return SpreadsheetApp.openById(id);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet belum siap — jalankan setup() dulu');
  return ss;
}

function sheet_(nama) {
  const ss = ss_();
  let sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.appendRow(HEADERS[nama]);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS[nama]);
  }
  return sh;
}

function headerOf_(sh) {
  const last = sh.getLastColumn();
  if (last < 1) return [];
  return sh.getRange(1, 1, 1, last).getValues()[0].map(v => String(v));
}

function tglISO_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).slice(0, 10);
}

// Normalisasi nilai sel -> tipe yang dipakai FE (angka utk Harga/Jumlah, ISO utk tanggal)
function sel_(h, v) {
  if (h === 'Harga' || h === 'Jumlah') {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  if (h === 'Tgl' || h === 'TglMasuk' || h === 'TglKeluar') return tglISO_(v);
  if (v instanceof Date) return tglISO_(v);
  return String(v == null ? '' : v);
}

function objDariBaris_(head, row) {
  const o = {};
  for (let i = 0; i < head.length; i++) o[head[i]] = sel_(head[i], row[i]);
  return o;
}

function baca_(nama) {
  const sh = sheet_(nama);
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const head = headerOf_(sh);
  const values = sh.getRange(1, 1, lastRow, head.length).getValues();
  const hasil = [];
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][0]).trim() === '') continue; // baris kosong / tanpa ID
    hasil.push(objDariBaris_(head, values[r]));
  }
  return hasil;
}

function bacaById_(nama, id) {
  return baca_(nama).find(r => String(r.ID) === String(id)) || null;
}

function cariBaris_(sh, id) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

// Tulis sebagian (hanya kolom yang ada di patch & di HEADERS) -> kembalikan objek kanonik.
function perbaruiBaris_(nama, id, patch) {
  const sh = sheet_(nama);
  const baris = cariBaris_(sh, id);
  if (baris < 2) return null;
  const head = headerOf_(sh);
  const row = sh.getRange(baris, 1, 1, head.length).getValues()[0];
  for (let i = 0; i < head.length; i++) {
    if (patch[head[i]] !== undefined) row[i] = sel_(head[i], patch[head[i]]);
  }
  sh.getRange(baris, 1, 1, head.length).setValues([row]);
  return objDariBaris_(head, row);
}

// Tambah baris baru -> kembalikan objek kanonik (identik dgn mock FE).
// keAwal=true: sisipkan di baris 2 (parity mock: transaksi terbaru di urutan paling atas).
function tambahBaris_(nama, obj, keAwal) {
  const sh = sheet_(nama);
  const head = headerOf_(sh);
  const row = head.map(h => (obj[h] === undefined ? '' : sel_(h, obj[h])));
  if (keAwal) {
    sh.insertRowBefore(2);
    sh.getRange(2, 1, 1, row.length).setValues([row]);
  } else {
    sh.appendRow(row);
  }
  return objDariBaris_(head, row);
}

function hapusBaris_(nama, id) {
  const sh = sheet_(nama);
  const baris = cariBaris_(sh, id);
  if (baris < 2) return null;
  const head = headerOf_(sh);
  const obj = objDariBaris_(head, sh.getRange(baris, 1, 1, head.length).getValues()[0]);
  sh.deleteRow(baris);
  return obj;
}

/* ========================= SETUP & SEED (idempoten) ========================= */
function setup_() {
  const props = PropertiesService.getScriptProperties();

  let folder = null;
  const folders = DriveApp.getFoldersByName(APP_NAME);
  if (folders.hasNext()) folder = folders.next();
  else folder = DriveApp.createFolder(APP_NAME);

  let ss = null;
  let reused = false;
  const idProp = props.getProperty('SHEET_ID');
  if (idProp) {
    try {
      ss = SpreadsheetApp.openById(idProp);
      reused = true;
    } catch (err) {
      props.deleteProperty('SHEET_ID');
      ss = null;
    }
  }
  if (!ss) {
    const files = folder.getFilesByName(APP_NAME);
    while (files.hasNext()) {
      const fx = files.next();
      if (fx.getMimeType() === MimeType.SPREADSHEET) {
        ss = SpreadsheetApp.open(fx.getId());
        reused = true;
        break;
      }
    }
  }
  if (!ss) ss = SpreadsheetApp.create(APP_NAME);

  DriveApp.getFileById(ss.getId()).moveTo(folder);
  try { DriveApp.getFileById(ScriptApp.getScriptId()).moveTo(folder); } catch (errScript) { /* non-kritis */ }

  props.setProperty('SHEET_ID', ss.getId());
  sheet_(TAB.kamar);
  sheet_(TAB.penghuni);
  sheet_(TAB.transaksi);

  return ok({
    reused: reused,
    folderName: folder.getName(),
    folderUrl: folder.getUrl(),
    spreadsheetUrl: ss.getUrl()
  });
}

// Data contoh identik dgn SEED mock FE (public/index.html) — hanya mengisi bila Penghuni kosong.
function seedContoh_() {
  if (baca_(TAB.penghuni).length > 0) return fail('Sheet sudah berisi — seedContoh dibatalkan');
  const kamar = [
    ['K1', 'A1', 'Kipas angin, Kasur, Lemari, Jendela', 900000, 'Terisi'],
    ['K2', 'A2', 'Kipas angin, Kasur, Lemari', 850000, 'Terisi'],
    ['K3', 'A3', 'AC, Kasur, Lemari, Kamar mandi dalam', 1250000, 'Terisi'],
    ['K4', 'A4', 'Kipas angin, Kasur, Lemari', 850000, 'Kosong'],
    ['K5', 'B1', 'Kipas angin, Kasur, Lemari, Balkon', 1000000, 'Terisi'],
    ['K6', 'B2', 'Kipas angin, Kasur, Lemari', 850000, 'Terisi'],
    ['K7', 'B3', 'AC, Kasur, Lemari, Water heater', 1300000, 'Kosong'],
    ['K8', 'B4', 'Kipas angin, Kasur, Lemari', 850000, 'Kosong']
  ];
  const penghuni = [
    ['P1', 'Andi Saputra', '081234567890', 'Bulanan', '2026-03-01', 'K1', 'Sudah Bayar', '', 'Bayar selalu tepat waktu.'],
    ['P2', 'Siti Rahma', '081298765432', 'Tahunan', '2025-09-01', 'K2', 'Sudah Bayar', '', 'Sewa tahunan lunas.'],
    ['P3', 'Budi Santoso', '085711223344', 'Bulanan', '2026-01-15', 'K3', 'Belum Bayar', '', 'Janji bayar akhir bulan.'],
    ['P4', 'Dewi Lestari', '081355667788', 'Bulanan', '2026-06-01', 'K5', 'Sudah Bayar', '', ''],
    ['P5', 'Rizky Pratama', '082144556677', 'Bulanan', '2026-08-01', 'K6', 'Belum Bayar', '', 'Mahasiswa baru, minta tempo 5 hari.'],
    ['P6', 'Hendra Wijaya', '081399988877', 'Bulanan', '2025-11-01', 'K4', 'Sudah Bayar', '2026-05-20', 'Pindah, kontrak selesai.']
  ];
  const transaksi = [
    ['T1', 'Masuk', 'Andi Saputra', 900000, '2026-08-01', 'Sewa bulanan'],
    ['T2', 'Masuk', 'Budi Santoso', 1250000, '2026-08-01', 'Sewa bulanan'],
    ['T3', 'Masuk', 'Dewi Lestari', 1000000, '2026-08-01', 'Sewa bulanan'],
    ['T4', 'Masuk', 'Siti Rahma', 10200000, '2026-08-01', 'Sewa tahunan 12 bulan'],
    ['T5', 'Masuk', 'Rizky Pratama', 850000, '2026-08-01', 'Sewa bulanan'],
    ['T6', 'Keluar', 'Listrik', 410000, '2026-08-05', 'Tagihan listrik Agustus'],
    ['T7', 'Keluar', 'Kebersihan', 100000, '2026-08-20', 'Honor bersih-bersih'],
    ['T8', 'Masuk', 'Andi Saputra', 900000, '2026-09-01', 'Sewa bulanan'],
    ['T9', 'Masuk', 'Dewi Lestari', 1000000, '2026-09-02', 'Sewa bulanan'],
    ['T10', 'Keluar', 'Listrik', 430000, '2026-09-05', 'Tagihan listrik September'],
    ['T11', 'Keluar', 'Air', 150000, '2026-09-10', 'Air bersih'],
    ['T12', 'Keluar', 'Perbaikan', 220000, '2026-09-12', 'Ganti kran A2']
  ];
  kamar.forEach(r => tambahBaris_(TAB.kamar, {
    ID: r[0], No: r[1], Fasilitas: r[2], Harga: r[3], Status: r[4]
  }));
  penghuni.forEach(r => tambahBaris_(TAB.penghuni, {
    ID: r[0], Nama: r[1], NoHP: r[2], Tipe: r[3], TglMasuk: r[4],
    KamarID: r[5], StatusBayar: r[6], TglKeluar: r[7], Notes: r[8]
  }));
  transaksi.forEach(r => tambahBaris_(TAB.transaksi, {
    ID: r[0], Tipe: r[1], Nama: r[2], Jumlah: r[3], Tgl: r[4], Ket: r[5]
  })); // append biasa — urutan seed identik mock; sisipan baris baru (keAwal) hanya utk transaksi runtime
  return ok({ kamar: kamar.length, penghuni: penghuni.length, transaksi: transaksi.length });
}

/* ========================= AKSI (validasi identik mock FE) ========================= */
function handle_(action, p) {
  p = p || {};
  switch (action) {
    case 'ping':
      return ok({ app: APP_NAME, status: 'online' });

    case 'listKamar':
      return ok(baca_(TAB.kamar));

    case 'listPenghuni':
      return ok(baca_(TAB.penghuni));

    case 'listTransaksi':
      return ok(baca_(TAB.transaksi));

    case 'loadSemua':
      return ok({
        kamar: baca_(TAB.kamar),
        penghuni: baca_(TAB.penghuni),
        transaksi: baca_(TAB.transaksi)
      });

    case 'addKamar': {
      const no = String(p.No || '').trim();
      if (!no) return fail('No kamar wajib diisi');
      if (baca_(TAB.kamar).some(k => k.No === no)) return fail('No kamar sudah dipakai');
      const kamar = tambahBaris_(TAB.kamar, {
        ID: 'K' + Date.now(),
        No: no,
        Fasilitas: p.Fasilitas || '',
        Harga: Number(p.Harga) || 0,
        Status: p.Status || 'Kosong'
      });
      return ok(kamar);
    }

    case 'updateKamar': {
      const rows = baca_(TAB.kamar);
      const i = rows.findIndex(k => String(k.ID) === String(p.ID));
      if (i < 0) return fail('Kamar tidak ditemukan');
      const patch = Object.assign({}, p);
      if (patch.No !== undefined) {
        const no2 = String(patch.No || '').trim();
        if (!no2) return fail('No kamar wajib diisi');
        if (rows.some((k, idx) => idx !== i && k.No === no2)) return fail('No kamar sudah dipakai');
        patch.No = no2;
      }
      const updated = perbaruiBaris_(TAB.kamar, p.ID, patch);
      return updated ? ok(updated) : fail('Kamar tidak ditemukan');
    }

    case 'deleteKamar': {
      const rows = baca_(TAB.kamar);
      if (!rows.some(k => String(k.ID) === String(p.ID))) return fail('Kamar tidak ditemukan');
      const dihuni = baca_(TAB.penghuni).some(pp =>
        String(pp.KamarID) === String(p.ID) && !pp.TglKeluar);
      if (dihuni) return fail('Kamar masih dihuni penghuni — pindahkan/tandai keluar dulu');
      const removed = hapusBaris_(TAB.kamar, p.ID);
      return removed ? ok(removed) : fail('Kamar tidak ditemukan');
    }

    case 'addPenghuni': {
      const nama = String(p.Nama || '').trim();
      if (!nama) return fail('Nama wajib diisi');
      const hp = String(p.NoHP || '').replace(/\D/g, '');
      if (hp.length < 10) return fail('No HP minimal 10 digit angka');
      if (!p.TglMasuk) return fail('Tanggal masuk wajib diisi');
      const penghuni = tambahBaris_(TAB.penghuni, {
        ID: 'P' + Date.now(),
        Nama: nama,
        NoHP: hp,
        Tipe: p.Tipe || 'Bulanan',
        TglMasuk: String(p.TglMasuk).slice(0, 10),
        KamarID: p.KamarID || '',
        StatusBayar: 'Belum Bayar',
        TglKeluar: '',
        Notes: p.Notes || ''
      });
      if (penghuni.KamarID && bacaById_(TAB.kamar, penghuni.KamarID)) {
        perbaruiBaris_(TAB.kamar, penghuni.KamarID, { Status: 'Terisi' });
      }
      return ok(penghuni);
    }

    case 'updatePenghuni': {
      const updated = perbaruiBaris_(TAB.penghuni, p.ID, p);
      return updated ? ok(updated) : fail('Penghuni tidak ditemukan');
    }

    case 'addTransaksi': {
      if (!(Number(p.Jumlah) > 0)) return fail('Jumlah harus lebih dari Rp 0');
      if (!p.Tgl) return fail('Tanggal wajib diisi');
      if (p.Tipe === 'Masuk' && !p.Nama) return fail('Pilih nama penghuni');
      const trx = tambahBaris_(TAB.transaksi, {
        ID: 'T' + Date.now(),
        Tipe: p.Tipe || 'Keluar',
        Nama: p.Nama || '-',
        Jumlah: Number(p.Jumlah),
        Tgl: String(p.Tgl).slice(0, 10),
        Ket: p.Ket || ''
      }, true); // sisipkan di urutan paling atas — parity mock (unshift)
      if (trx.Tipe === 'Masuk') {
        const cocok = baca_(TAB.penghuni).find(pp => pp.Nama === trx.Nama);
        if (cocok) perbaruiBaris_(TAB.penghuni, cocok.ID, { StatusBayar: 'Sudah Bayar' });
      }
      return ok(trx);
    }

    case 'setup':
      return setup_();

    case 'seedContoh':
      return seedContoh_();

    default:
      return fail('Aksi tidak dikenal: ' + action);
  }
}

/* ========================= ENTRY POINT GAS ========================= */
// wrapper publik untuk dropdown editor Apps Script / `clasp run`:
function setup() { return setup_(); }
function seedContoh() { return seedContoh_(); }

function doGet() {
  return out(ok({ app: APP_NAME, status: 'online' }));
}

function doPost(e) {
  try {
    let body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (parseErr) { body = {}; }
    const action = String(body.action || '');
    if (!action) return out(fail('Aksi tidak ditemukan'));
    if (ADMIN_ACTIONS.indexOf(action) >= 0 && !kunciAdminOk_(body.adminKey)) {
      return out(fail('Akses ditolak: silakan login sebagai admin'));
    }

    const payload = Object.assign({}, body.payload || {});

    // Aksi baca: langsung, tanpa lock (FE mengklasifikasikan dengan READ_AKSI yang sama)
    if (READ_ACTIONS.indexOf(action) >= 0) return out(handle_(action, payload));

    // Aksi tulis: satu per satu lewat lock + idempotensi clientRef (tanpa retry dari FE)
    const lock = LockService.getScriptLock();
    try { lock.waitLock(15000); } catch (lockErr) { return out(fail('Server sedang sibuk, coba lagi')); }
    try {
      const ref = payload.clientRef;
      delete payload.clientRef; // jangan bocorkan ke kolom/respon
      const perluCekRef = ref && CREATE_ACTIONS.indexOf(action) >= 0;
      if (perluCekRef) {
        const idLama = refDiterima_(ref);
        if (idLama) {
          const dataLama = dataDariRef_(action, idLama);
          if (dataLama) return out(ok(dataLama));
        }
      }
      const hasil = handle_(action, payload);
      if (perluCekRef && hasil && hasil.success) catatRef_(ref, hasil.data && hasil.data.ID);
      return out(hasil);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return out(fail('Kesalahan server: ' + ((err && err.message) || err)));
  }
}
