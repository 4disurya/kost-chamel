/**
 * KOST CHAMEL GOWA — Backend Google Apps Script (CLASP)
 *
 * SETUP:
 *   1. Buat Spreadsheet Google (kosong) -> salpan ID-nya dari URL ke SHEET_ID di bawah.
 *   2. Dari folder backend/: clasp login (sekali), lalu
 *      clasp create --type webapp --title "KOST CHAMEL GOWA" --scriptId <kosongkan?>  --rootDir .
 *      (atau clasp clone bila project sudah ada) -> isi .clasp.json dgn scriptId.
 *   3. Isi SHEET_ID, lalu clasp push.
 *   4. clasp update-deployment --deploymentId <DEV_DEPLOYMENT_ID>  -> uji endpoint Dev di FE (GAS_URL.dev).
 *   5. clasp update-deployment --deploymentId <PROD_DEPLOYMENT_ID> -> set GAS_URL.prod + GAS_ENV='prod'.
 *   DILARANG clasp create-deployment berulang (menimbulkan ID baru tiap kali).
 *
 * DEPLOYMENT ID (tetap — dipakai `clasp update-deployment -i ...`):
 *   DEV : AKfycbxlaj-2aJJ4rjDdaWw7nOVg28fFTbZeJFE3jFRnAr6TtvpCqZ4PX-8-tm1d9-cApiRA-Q
 *   PROD: AKfycbwCo3uXcIOj2Ug4p969luCuIuHK3GgxqM_9YlUhb2pFJTTvaDe0l-lmBcEgb80CjxW96A
 *   (scriptId: 1IWEY_wFCYd7yBGmemR_C7Jd-mGb37w0S1Fer6ESxo-JuA9Bvac5mTcBx)
 *
 * KONTRAK (identik dgn mock FE — public/index.html):
 *   POST body JSON: { action, payload, adminKey? }
 *   Respon     JSON: { success: true, data } | { success: false, message }
 *   GET        -> ping kesehatan endpoint.
 *   Aksi admin (wajib adminKey benar): addKamar, updateKamar, deleteKamar,
 *                                      addPenghuni, updatePenghuni.
 *   Aksi terbuka: listKamar, listPenghuni, listTransaksi, addTransaksi, ping.
 *   adminKey dikirim DI DALAM body (bukan header) agar tidak memicu preflight
 *   CORS yang ditolak endpoint Google Apps Script.
 */

/* ========================= KONFIG ========================= */
var APP_NAME = 'KOST CHAMEL GOWA'; // nama aplikasi = nama folder Drive & spreadsheet
var SHEET_ID = ''; // opsional: bisa juga diisi manual; otomatis diisi Script Properties oleh setup()
var TAB = { kamar: 'Kamar', penghuni: 'Penghuni', transaksi: 'Transaksi' };
var HEADERS = {
  Kamar: ['ID', 'No', 'Fasilitas', 'Harga', 'Status'],
  Penghuni: ['ID', 'Nama', 'NoHP', 'Tipe', 'TglMasuk', 'KamarID', 'StatusBayar', 'TglKeluar', 'Notes'],
  Transaksi: ['ID', 'Tipe', 'Nama', 'Jumlah', 'Tgl', 'Ket']
};
var ADMIN_ACTIONS = ['addKamar', 'updateKamar', 'deleteKamar', 'addPenghuni', 'updatePenghuni', 'setup', 'seedContoh'];
var READ_ACTIONS = ['ping', 'listKamar', 'listPenghuni', 'listTransaksi', 'loadSemua'];
// Aksi tulis yang wajib idempoten: pengiriman ulang dengan clientRef sama TIDAK membuat baris baru.
var CREATE_ACTIONS = ['addKamar', 'addPenghuni', 'addTransaksi'];

/* ========================= ENVELOPE & AUTH ========================= */
function ok(data) { return { success: true, data: data }; }
function fail(message) { return { success: false, message: message }; }
function out(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
function kunciAdminOk_(kunci) {
  var kunciAktif = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  return String(kunci || '') === (kunciAktif || 'kost_chamel');
}

/* ========================= IDEMPOTENSI TULIS (clientRef) ========================= */
// clientRef datang dari FE per pengiriman; ref yang sama dalam 24 jam terakhir
// tidak menulis ulang — hasil pertama (ID baris) dikembalikan sebagai sukses.
var REF_PROPS_KEY_ = 'REF_TERAKHIR';
var REF_MAKS_ = 100;
var REF_USIA_MS_ = 24 * 3600 * 1000;
function refDiterima_(ref) {
  if (!ref) return '';
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(REF_PROPS_KEY_);
    var map = raw ? JSON.parse(raw) : {};
    var e = map[String(ref)];
    if (!e || (Date.now() - Number(e.t || 0)) > REF_USIA_MS_) return '';
    return String(e.id || '');
  } catch (err) { return ''; }
}
function catatRef_(ref, idHasil) {
  if (!ref) return;
  try {
    var sp = PropertiesService.getScriptProperties();
    var raw = sp.getProperty(REF_PROPS_KEY_);
    var map = raw ? JSON.parse(raw) : {};
    var now = Date.now();
    map[String(ref)] = { id: String(idHasil || ''), t: now };
    var entri = [];
    Object.keys(map).forEach(function (k) {
      var e = map[k];
      if (e && (now - Number(e.t || 0)) <= REF_USIA_MS_) entri.push({ k: k, id: e.id, t: Number(e.t || 0) });
    });
    entri.sort(function (a, b) { return b.t - a.t; });
    entri = entri.slice(0, REF_MAKS_);
    var hasilMap = {};
    entri.forEach(function (en) { hasilMap[en.k] = { id: en.id, t: en.t }; });
    sp.setProperty(REF_PROPS_KEY_, JSON.stringify(hasilMap));
  } catch (err) { /* property penuh/gagal catat — idempotensi lemah, tulis tetap jalan */ }
}
function dataDariRef_(action, id) {
  var tab = action === 'addPenghuni' ? TAB.penghuni : (action === 'addTransaksi' ? TAB.transaksi : TAB.kamar);
  var rows = baca_(tab);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].ID) === String(id)) return rows[i];
  }
  return null;
}

/* ========================= SHEET HELPERS ========================= */
function ss_() {
  var propId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  var id = propId || SHEET_ID;
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet belum siap — jalankan setup() dulu (buat folder + spreadsheet otomatis)');
  return ss;
}
function sheet_(nama) {
  var ss = ss_();
  var sh = ss.getSheetByName(nama);
  if (!sh) {
    sh = ss.insertSheet(nama);
    sh.appendRow(HEADERS[nama]);
  } else if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS[nama]);
  }
  return sh;
}
function headerOf_(sh) {
  var last = sh.getLastColumn();
  if (last < 1) return [];
  return sh.getRange(1, 1, 1, last).getValues()[0].map(function (v) { return String(v); });
}
function tglISO_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(v == null ? '' : v).slice(0, 10);
}
function sel_(head, h, v) {
  if (h === 'Harga' || h === 'Jumlah') { var n = Number(v); return isNaN(n) ? 0 : n; }
  if (h === 'Tgl' || h === 'TglMasuk' || h === 'TglKeluar') return tglISO_(v);
  if (v instanceof Date) return tglISO_(v);
  return String(v == null ? '' : v);
}
/* Baca selalu fresh dari Spreadsheet — TANPA cache, supaya penambahan/edits/hapus
   langsung di spreadsheet langsung tercermin di aplikasi. */
function baca_(nama) {
  var sh = sheet_(nama);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var head = headerOf_(sh);
  var values = sh.getRange(1, 1, lastRow, head.length).getValues();
  var hasil = [];
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]).trim() === '') continue; // baris kosong / tanpa ID
    var o = {};
    for (var c = 0; c < head.length; c++) o[head[c]] = sel_(head, head[c], values[r][c]);
    hasil.push(o);
  }
  return hasil;
}
function cariBaris_(sh, id) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
function tulisSel_(sh, baris, obj) {
  var head = headerOf_(sh);
  var row = sh.getRange(baris, 1, 1, head.length).getValues()[0];
  for (var i = 0; i < head.length; i++) {
    if (obj[head[i]] !== undefined) row[i] = sel_(head, head[i], obj[head[i]]);
  }
  sh.getRange(baris, 1, 1, head.length).setValues([row]);
}
function tambahBaris_(nama, obj) {
  var sh = sheet_(nama);
  var head = headerOf_(sh);
  sh.appendRow(head.map(function (h) { return obj[h] === undefined ? '' : sel_(head, h, obj[h]); }));
}
function tambahBarisTerbaru_(nama, obj) {
  // parity dgn mock FE (unshift): entri terbaru disimpan di baris paling atas (setelah header)
  var sh = sheet_(nama);
  var head = headerOf_(sh);
  var row = head.map(function (h) { return obj[h] === undefined ? '' : sel_(head, h, obj[h]); });
  sh.insertRowBefore(2);
  sh.getRange(2, 1, 1, row.length).setValues([row]);
}

/* ========================= SETUP OTOMATIS (Drive) ========================= */
// Idempoten: aman dipanggil berulang. Membuat folder "KOST CHAMEL GOWA" di My Drive,
// membuat spreadsheet dgn nama sama di dalamnya, memindahkan file script ke folder tsb,
// membuat 3 tab + header, lalu menyimpan SHEET_ID ke Script Properties.
function setup_() {
  var props = PropertiesService.getScriptProperties();

  // 1. folder (pakai yg sudah ada bila nama sama)
  var folder = null;
  var folders = DriveApp.getFoldersByName(APP_NAME);
  if (folders.hasNext()) folder = folders.next();
  else folder = DriveApp.createFolder(APP_NAME);

  // 2. spreadsheet: property -> file existing di folder -> buat baru
  var ss = null;
  var reused = false;
  var idProp = props.getProperty('SHEET_ID');
  if (idProp) {
    try { ss = SpreadsheetApp.openById(idProp); reused = true; }
    catch (err) { props.deleteProperty('SHEET_ID'); ss = null; }
  }
  if (!ss) {
    var files = folder.getFilesByName(APP_NAME);
    while (files.hasNext()) {
      var fx = files.next();
      if (fx.getMimeType() === MimeType.SPREADSHEET) { ss = SpreadsheetApp.open(fx.getId()); reused = true; break; }
    }
  }
  if (!ss) ss = SpreadsheetApp.create(APP_NAME);

  // 3. pindahkan spreadsheet + file script ini ke folder
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  try { DriveApp.getFileById(ScriptApp.getScriptId()).moveTo(folder); } catch (errScript) { /* non-kritis */ }

  // 4. simpan id -> tab & header (sheet_ auto-create bila belum ada)
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

// Data contoh (identik SEED mock FE) — hanya mengisi bila tab Penghuni masih kosong.
function seedContoh_() {
  if (baca_(TAB.penghuni).length > 0) return fail('Sheet sudah berisi — seedContoh dibatalkan');
  var kamar = [
    ['K1', 'A1', 'Kipas angin, Kasur, Lemari, Jendela', 900000, 'Terisi'],
    ['K2', 'A2', 'Kipas angin, Kasur, Lemari', 850000, 'Terisi'],
    ['K3', 'A3', 'AC, Kasur, Lemari, Kamar mandi dalam', 1250000, 'Terisi'],
    ['K4', 'A4', 'Kipas angin, Kasur, Lemari', 850000, 'Kosong'],
    ['K5', 'B1', 'Kipas angin, Kasur, Lemari, Balkon', 1000000, 'Terisi'],
    ['K6', 'B2', 'Kipas angin, Kasur, Lemari', 850000, 'Terisi'],
    ['K7', 'B3', 'AC, Kasur, Lemari, Water heater', 1300000, 'Kosong'],
    ['K8', 'B4', 'Kipas angin, Kasur, Lemari', 850000, 'Kosong']
  ];
  var penghuni = [
    ['P1', 'Andi Saputra', '081234567890', 'Bulanan', '2026-03-01', 'K1', 'Sudah Bayar', '', 'Bayar selalu tepat waktu.'],
    ['P2', 'Siti Rahma', '081298765432', 'Tahunan', '2025-09-01', 'K2', 'Sudah Bayar', '', 'Sewa tahunan lunas.'],
    ['P3', 'Budi Santoso', '085711223344', 'Bulanan', '2026-01-15', 'K3', 'Belum Bayar', '', 'Janji bayar akhir bulan.'],
    ['P4', 'Dewi Lestari', '081355667788', 'Bulanan', '2026-06-01', 'K5', 'Sudah Bayar', '', ''],
    ['P5', 'Rizky Pratama', '082144556677', 'Bulanan', '2026-08-01', 'K6', 'Belum Bayar', '', 'Mahasiswa baru, minta tempo 5 hari.'],
    ['P6', 'Hendra Wijaya', '081399988877', 'Bulanan', '2025-11-01', 'K4', 'Sudah Bayar', '2026-05-20', 'Pindah, kontrak selesai.']
  ];
  var transaksi = [
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
  var shK = sheet_(TAB.kamar); kamar.forEach(function (r) { shK.appendRow(r); });
  var shP = sheet_(TAB.penghuni); penghuni.forEach(function (r) { shP.appendRow(r); });
  var shT = sheet_(TAB.transaksi); transaksi.forEach(function (r) { shT.appendRow(r); });
  return ok({ kamar: kamar.length, penghuni: penghuni.length, transaksi: transaksi.length });
}

/* ========================= ROUTER & AKSI ========================= */
function handle_(action, p) {
  p = p || {};
  switch (action) {
    case 'ping':
      return ok({ app: 'KOST CHAMEL GOWA', status: 'online' });

    case 'listKamar':
      return ok(baca_(TAB.kamar));

    case 'addKamar': {
      var no = String(p.No || '').trim();
      if (!no) return fail('No kamar wajib diisi');
      if (baca_(TAB.kamar).some(function (k) { return k.No === no; })) return fail('No kamar sudah dipakai');
      var kamar = {
        ID: 'K' + Date.now(), No: no, Fasilitas: p.Fasilitas || '',
        Harga: Number(p.Harga) || 0, Status: p.Status || 'Kosong'
      };
      tambahBaris_(TAB.kamar, kamar);
      return ok(kamar);
    }

    case 'updateKamar': {
      var rows = baca_(TAB.kamar);
      var i = rows.findIndex(function (k) { return String(k.ID) === String(p.ID); });
      if (i < 0) return fail('Kamar tidak ditemukan');
      if (p.No !== undefined) {
        var no2 = String(p.No || '').trim();
        if (!no2) return fail('No kamar wajib diisi');
        if (rows.some(function (k, idx) { return idx !== i && k.No === no2; })) return fail('No kamar sudah dipakai');
        p = Object.assign({}, p, { No: no2 });
      }
      var sh = sheet_(TAB.kamar);
      var baris = cariBaris_(sh, p.ID);
      if (baris < 2) return fail('Kamar tidak ditemukan');
      tulisSel_(sh, baris, p);
      return ok(Object.assign({}, rows[i], p));
    }

    case 'deleteKamar': {
      var rows2 = baca_(TAB.kamar);
      var i2 = rows2.findIndex(function (k) { return String(k.ID) === String(p.ID); });
      if (i2 < 0) return fail('Kamar tidak ditemukan');
      var dihuni = baca_(TAB.penghuni).some(function (pp) {
        return String(pp.KamarID) === String(p.ID) && !pp.TglKeluar;
      });
      if (dihuni) return fail('Kamar masih dihuni penghuni — pindahkan/tandai keluar dulu');
      var sh2 = sheet_(TAB.kamar);
      var baris2 = cariBaris_(sh2, p.ID);
      if (baris2 < 2) return fail('Kamar tidak ditemukan');
      sh2.deleteRow(baris2);
      return ok(rows2[i2]);
    }

    case 'listPenghuni':
      return ok(baca_(TAB.penghuni));

    case 'addPenghuni': {
      var nama = String(p.Nama || '').trim();
      if (!nama) return fail('Nama wajib diisi');
      var hp = String(p.NoHP || '').replace(/\D/g, '');
      if (hp.length < 10) return fail('No HP minimal 10 digit angka');
      if (!p.TglMasuk) return fail('Tanggal masuk wajib diisi');
      var penghuni = {
        ID: 'P' + Date.now(), Nama: nama, NoHP: hp, Tipe: p.Tipe || 'Bulanan',
        TglMasuk: String(p.TglMasuk).slice(0, 10), KamarID: p.KamarID || '',
        StatusBayar: 'Belum Bayar', Notes: p.Notes || ''
      };
      tambahBaris_(TAB.penghuni, penghuni);
      if (penghuni.KamarID) {
        var k = baca_(TAB.kamar).find(function (kk) { return String(kk.ID) === String(penghuni.KamarID); });
        if (k) {
          var shK = sheet_(TAB.kamar);
          var barisK = cariBaris_(shK, k.ID);
          if (barisK >= 2) tulisSel_(shK, barisK, { Status: 'Terisi' });
        }
      }
      return ok(penghuni);
    }

    case 'updatePenghuni': {
      var rows3 = baca_(TAB.penghuni);
      var i3 = rows3.findIndex(function (pp) { return String(pp.ID) === String(p.ID); });
      if (i3 < 0) return fail('Penghuni tidak ditemukan');
      var shP = sheet_(TAB.penghuni);
      var barisP = cariBaris_(shP, p.ID);
      if (barisP < 2) return fail('Penghuni tidak ditemukan');
      tulisSel_(shP, barisP, p);
      return ok(Object.assign({}, rows3[i3], p));
    }

    case 'listTransaksi':
      return ok(baca_(TAB.transaksi));

    case 'loadSemua':
      return ok({
        kamar: baca_(TAB.kamar),
        penghuni: baca_(TAB.penghuni),
        transaksi: baca_(TAB.transaksi)
      });

    case 'addTransaksi': {
      if (!(Number(p.Jumlah) > 0)) return fail('Jumlah harus lebih dari Rp 0');
      if (!p.Tgl) return fail('Tanggal wajib diisi');
      if (p.Tipe === 'Masuk' && !p.Nama) return fail('Pilih nama penghuni');
      var trx = {
        ID: 'T' + Date.now(), Tipe: p.Tipe, Nama: p.Nama || '-',
        Jumlah: Number(p.Jumlah), Tgl: String(p.Tgl).slice(0, 10), Ket: p.Ket || ''
      };
      tambahBarisTerbaru_(TAB.transaksi, trx);
      if (trx.Tipe === 'Masuk') {
        var cocok = baca_(TAB.penghuni).find(function (pp) { return pp.Nama === trx.Nama; });
        if (cocok) {
          var shPe = sheet_(TAB.penghuni);
          var barisPe = cariBaris_(shPe, cocok.ID);
          if (barisPe >= 2) tulisSel_(shPe, barisPe, { StatusBayar: 'Sudah Bayar' });
        }
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
// wrapper publik untuk dropdown editor Apps Script / clasp run:
function setup() { return setup_(); }
function seedContoh() { return seedContoh_(); }

function doGet(e) {
  return out(ok({ app: 'KOST CHAMEL GOWA', status: 'online' }));
}

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (parseErr) { body = {}; }
    var action = String(body.action || '');
    if (!action) return out(fail('Aksi tidak ditemukan'));
    if (ADMIN_ACTIONS.indexOf(action) >= 0 && !kunciAdminOk_(body.adminKey)) {
      return out(fail('Akses ditolak: silakan login sebagai admin'));
    }

    if (READ_ACTIONS.indexOf(action) >= 0) return out(handle_(action, body.payload));

    var lock = LockService.getScriptLock();
    try { lock.waitLock(15000); } catch (lockErr) { return out(fail('Server sedang sibuk, coba lagi')); }
    try {
      var ref = body.payload && body.payload.clientRef;
      var perluCekRef = ref && CREATE_ACTIONS.indexOf(action) >= 0;
      if (perluCekRef) {
        var idLama = refDiterima_(ref);
        if (idLama) {
          var dataLama = dataDariRef_(action, idLama);
          if (dataLama) return out(ok(dataLama));
        }
      }
      var hasil = handle_(action, body.payload);
      if (perluCekRef && hasil && hasil.success) catatRef_(ref, hasil.data && hasil.data.ID);
      return out(hasil);
    }
    finally { lock.releaseLock(); }
  } catch (err) {
    return out(fail('Kesalahan server: ' + (err && err.message || err)));
  }
}
