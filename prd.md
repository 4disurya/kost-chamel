# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## KOST CHAMEL GOWA

**STATUS: DRAFT SEMENTARA**

| | |
| --- | --- |
| **Nama Produk** | KOST CHAMEL GOWA |
| **Versi Dokumen** | v0.1 (Detailed PRD) |
| **Disusun oleh** | Senior Product Manager & Technical Architect |
| **Untuk** | Pemilik Produk / Klien |
| **Tanggal** | 25 September 2026 |
| **Tech Stack Terkunci** | Single HTML5 + Vue.js 3 CDN + Tailwind CSS CDN + Google Apps Script REST API + Google Sheets |

---

# 1. Problem Statements

Kondisi pengelolaan operasional Kost Chamel Gowa saat ini masih sangat bergantung pada metode konvensional, di mana pencatatan data penghuni, inventaris kamar, hingga arus kas (pemasukan dan pengeluaran) dilakukan secara manual melalui buku besar atau pesan teks WhatsApp yang tidak terstruktur. Status quo ini menciptakan fragmentasi data yang parah, di mana informasi mengenai jatuh tempo sewa atau ketersediaan kamar tidak dapat diakses secara real-time. Pemilik dan penjaga kost seringkali harus membongkar tumpukan catatan fisik atau melakukan scroll panjang pada riwayat chat hanya untuk memverifikasi satu transaksi pembayaran, yang pada akhirnya menghabiskan waktu produktif secara sia-sia.

Dampak negatif dari ketidakteraturan ini sangat signifikan terhadap kesehatan finansial dan efisiensi bisnis. Risiko kehilangan data akibat kerusakan fisik buku atau terhapusnya riwayat pesan menjadi ancaman nyata. Lebih jauh lagi, kesalahan manusia (human error) dalam penghitungan manual seringkali menyebabkan selisih kas yang sulit dilacak, keterlambatan penagihan sewa yang mengurangi cash flow, serta ketidakmampuan pemilik untuk memantau profitabilitas bersih secara akurat. Tanpa sistem yang terintegrasi, sulit bagi manajemen untuk menentukan apakah biaya operasional seperti perbaikan fasilitas dan tagihan utilitas masih berada dalam batas wajar dibandingkan dengan pendapatan yang diterima.

Solusi yang ditawarkan melalui pengembangan aplikasi KOST CHAMEL GOWA adalah sebuah platform manajemen berbasis mobile yang mengintegrasikan seluruh aspek operasional ke dalam satu basis data terpusat (Google Sheets). Aplikasi ini memungkinkan penjaga kost untuk melakukan input data penghuni, mencatat transaksi masuk, dan mendokumentasikan pengeluaran secara instan langsung dari smartphone mereka. Dengan otomatisasi kalkulasi, sistem akan secara mandiri menyajikan rekapitulasi keuangan dan status hunian tanpa perlu perhitungan manual. Pendekatan ini memastikan bahwa setiap rupiah yang masuk dan keluar tercatat dengan presisi tinggi dan dapat dipantau kapan saja.

Diferensiasi utama aplikasi ini terletak pada kesederhanaan penggunaan (usability) dan efisiensi biaya infrastruktur. Berbeda dengan perangkat lunak manajemen properti yang kompleks dan mahal, KOST CHAMEL GOWA dirancang khusus untuk kebutuhan skala menengah dengan antarmuka yang sangat intuitif bagi pengguna non-teknis. Penggunaan Google Apps Script sebagai backend memastikan biaya operasional server nol rupiah (zero-cost infrastructure) namun tetap memiliki reliabilitas tinggi. Fokus pada tampilan *mobile-only* memastikan pengalaman pengguna yang optimal di lapangan, memberikan kecepatan akses informasi yang tidak dimiliki oleh sistem pencatatan manual maupun spreadsheet konvensional yang tidak ramah perangkat mobile.

# 2. Goals & Success Metrics

| Goal Statement | Measurable Metric (dengan angka spesifik) | Target Timeframe |
| --- | --- | --- |
| Digitalisasi 100% data penghuni dan kamar | Rasio data digital vs fisik mencapai 100:0 | 2 Minggu setelah peluncuran |
| Efisiensi waktu pencatatan transaksi | Penurunan waktu input data dari rata-rata 5 menit menjadi < 30 detik | 1 Bulan penggunaan |
| Akurasi laporan keuangan bulanan | Selisih kas antara sistem dan fisik adalah Rp 0 (Zero Discrepancy) | Setiap akhir bulan |
| Optimalisasi tingkat hunian (Occupancy Rate) | Identifikasi kamar kosong secara instan untuk meningkatkan okupansi hingga 95% | 3 Bulan penggunaan |
| Kecepatan akses informasi rekapitulasi | Waktu muat laporan rekapitulasi di bawah 3 detik pada jaringan 4G | Sejak hari pertama peluncuran |

# 3. Target Users

| Role Name | Description | Primary Needs | Pain Points | Most Used Features |
| --- | --- | --- | --- | --- |
| **Penjaga Kost** | Staf operasional yang berada di lokasi setiap hari. | Input data penghuni baru dengan cepat, mencatat pembayaran harian, dan melaporkan kerusakan. | Lupa mencatat transaksi, kesulitan mencari nomor WA penghuni, bingung menghitung sisa kembalian. | Form Input Penghuni, Catat Pemasukan, Daftar Kamar. |
| **Pemilik Kost** | Pemilik bisnis yang memantau dari jarak jauh. | Melihat total keuntungan bersih, memantau pengeluaran tak terduga, mengecek siapa yang menunggak. | Tidak tahu kondisi keuangan real-time, curiga adanya kebocoran dana, sulit memantau kinerja penjaga. | Dashboard Rekapitulasi, Laporan Pengeluaran, Filter Tunggakan. |

# 4. User Stories

| ID | User Story | Acceptance Criteria | Priority |
| --- | --- | --- | --- |
| **US-01** | Sebagai Penjaga, saya ingin melihat daftar kamar beserta fasilitasnya, sehingga saya bisa menjelaskan ke calon penghuni dengan akurat. | 1. Menampilkan nomor kamar, list fasilitas, dan harga sewa. 2. Ada indikator warna (Tersedia/Terisi). | MVP |
| **US-02** | Sebagai Penjaga, saya ingin mendaftarkan penghuni baru beserta nomor HP-nya, sehingga saya punya database kontak yang rapi. | 1. Form input nama, No HP (integrasi link WA), dan tanggal masuk. 2. Validasi nomor HP harus angka. | MVP |
| **US-03** | Sebagai Penjaga, saya ingin memilih tipe sewa (bulanan/tahunan), sehingga sistem bisa menghitung tanggal jatuh tempo secara otomatis. | 1. Dropdown pilihan durasi sewa. 2. Tersimpan dalam kolom kategori di database. | MVP |
| **US-04** | Sebagai Penjaga, saya ingin mencatat pemasukan sewa, sehingga saldo kas kost bertambah secara otomatis. | 1. Input jumlah bayar, tanggal, dan nama penyewa. 2. Notifikasi sukses setelah data tersimpan ke Google Sheets. | MVP |
| **US-05** | Sebagai Penjaga, saya ingin mencatat pengeluaran (listrik/air/perbaikan), sehingga pengeluaran kost terdokumentasi dengan jelas. | 1. Input kategori pengeluaran, jumlah, dan keterangan. 2. Tombol simpan yang responsif. | MVP |
| **US-06** | Sebagai Pemilik, saya ingin melihat total pemasukan dikurangi pengeluaran, sehingga saya tahu keuntungan bersih bulan ini. | 1. Tampilan Dashboard dengan angka "Sisa Saldo". 2. Kalkulasi otomatis dari seluruh entri transaksi. | MVP |
| **US-07** | Sebagai Pemilik, saya ingin melihat daftar penghuni yang belum bayar, sehingga saya bisa melakukan penagihan tepat waktu. | 1. Filter atau penanda khusus untuk status "Belum Bayar". 2. Tombol cepat untuk hubungi via WhatsApp. | MVP |
| **US-08** | Sebagai Pengguna, saya ingin mencari nomor HP penghuni dengan cepat, sehingga saya tidak perlu scroll manual. | 1. Search bar yang berfungsi secara real-time (filter as you type). 2. Menampilkan hasil yang relevan saja. | MVP |
| **US-09** | Sebagai Pengguna, saya ingin ada catatan khusus (notes) pada setiap penghuni, sehingga saya bisa mencatat perilaku atau janji bayar mereka. | 1. Field teks tambahan pada profil penghuni. 2. Bisa diupdate kapan saja. | MVP |
| **US-10** | Sebagai Pemilik, saya ingin melihat laporan bulanan yang simpel, sehingga saya tidak pusing membaca angka yang rumit. | 1. Grafik atau ringkasan teks per bulan. 2. Navigasi antar bulan yang mudah. | MVP |
| **US-11** | Sebagai Pengguna, saya ingin aplikasi terasa ringan di HP, sehingga tidak membebani memori perangkat. | 1. Ukuran file minimalis (Single HTML). 2. Tidak ada loading screen yang lama. | MVP |

# 5. User Flow

### 5.1 Alur Utama: Mencatat Pemasukan Sewa (Happy Path)
1. **Action:** Pengguna membuka aplikasi dan memilih menu "Pemasukan".
2. **Description:** Sistem menampilkan form input pemasukan.
3. **Output:** Form kosong siap diisi.
4. **Decision Point:** Pengguna memilih nama penghuni dari dropdown. Jika nama tidak ada, pengguna harus ke menu "Tambah Penghuni" terlebih dahulu.
5. **Action:** Pengguna memasukkan jumlah uang dan tanggal bayar, lalu menekan tombol "Simpan".
6. **Description:** Aplikasi mengirim data ke Google Apps Script via POST request.
7. **Output:** Muncul notifikasi "Data Berhasil Disimpan" dan saldo di dashboard terupdate otomatis.

### 5.2 Alur Alternatif: Pengecekan Kamar Kosong
1. **Action:** Pengguna membuka menu "Daftar Kamar".
2. **Description:** Sistem melakukan fetch data status kamar dari Google Sheets.
3. **Output:** Daftar kartu (cards) kamar dengan label warna Hijau (Kosong) atau Merah (Terisi).
4. **Action:** Pengguna mengklik salah satu kamar kosong untuk melihat detail fasilitas.
5. **Output:** Modal/Pop-up muncul menampilkan detail fasilitas dan harga sewa.

# 6. Functional Requirements

| Feature ID | Feature Name | Detailed Description | Inputs | Outputs | Validation Rules | Data Structure (Sheets) |
| --- | --- | --- | --- | --- | --- | --- |
| **FR-01** | Manajemen Kamar | Mengelola data fisik kamar kost. | No Kamar, Fasilitas, Harga Sewa. | List Kamar & Status. | No Kamar unik. | Tab: `Kamar` (ID, No, Fasilitas, Harga, Status) |
| **FR-02** | Database Penghuni | Menyimpan profil lengkap penyewa. | Nama, No HP, Tipe Sewa, Tgl Masuk. | Profil Penghuni, Link WA. | No HP minimal 10 digit. | Tab: `Penghuni` (ID, Nama, NoHP, Tipe, TglMasuk, KamarID, StatusBayar, TglKeluar, Notes) |
| **FR-03** | Pencatatan Transaksi | Input uang masuk dan keluar. | Kategori, Jumlah, Tanggal, Keterangan. | Log Transaksi. | Jumlah harus > 0. | Tab: `Transaksi` (ID, Tipe, Nama, Jumlah, Tgl, Ket) |
| **FR-04** | Dashboard Finansial | Ringkasan saldo dan profit. | Data dari Tab Transaksi. | Total Masuk, Keluar, Saldo. | Kalkulasi otomatis. | Virtual Calculation |
| **FR-05** | Sistem Pencarian | Mencari data penghuni/kamar. | Keyword teks. | Hasil filter list. | Minimal 2 karakter. | Client-side filtering |

# 7. Non-Functional Requirements

### UX/Design
*   **Mobile First:** Antarmuka dioptimalkan untuk jempol tangan (touch-friendly).
*   **Contrast:** Menggunakan warna kontras tinggi (Teks hitam di background putih/abu terang) untuk keterbacaan di bawah sinar matahari.
*   **Feedback:** Setiap tombol harus memiliki efek visual saat ditekan (active state).
*   **Simplicity:** Maksimal 3 klik untuk mencapai fitur utama (Pemasukan/Pengeluaran).
*   **Typography:** Menggunakan font sans-serif sistem yang bersih dan ukuran minimal 16px untuk input.
*   **Consistency:** Warna Hijau untuk Pemasukan dan Merah untuk Pengeluaran di seluruh layar.

### Performance
*   **Load Time:** Aplikasi harus terbuka dalam < 2 detik.
*   **API Response:** Proses simpan data ke Google Sheets maksimal 5 detik (tergantung koneksi).
*   **Lightweight:** Total ukuran file HTML (termasuk CSS/JS inline jika memungkinkan) di bawah 1MB.

### Security
*   **Access Control:** Menu login Admin dengan password (`kost_chamel`) untuk mengedit Kamar/Penghuni/Tunggakan dan membuka Laporan; penegakan sesungguhnya wajib diulang di backend Google Apps Script (API key/header) karena password di SPA mudah dilihat.
*   **Data Integrity:** Validasi tipe data di sisi client sebelum dikirim ke server.
*   **Privacy:** Nomor HP penghuni tidak ditampilkan secara penuh di layar utama (masking) jika diperlukan.

### Compatibility
*   **Browser:** Kompatibel dengan Chrome Mobile dan Safari (iOS).
*   **OS:** Android 8+ dan iOS 12+.

### Technical Constraints
*   **GAS Limit:** Google Apps Script memiliki limit eksekusi 6 menit per request dan limit kuota harian.
*   **Concurrency:** Google Sheets tidak didesain untuk ribuan transaksi per detik (hanya cocok untuk penggunaan internal kost).
*   **Offline Mode:** Tidak mendukung input offline; membutuhkan koneksi internet aktif.

# 8. Scope

## 8.1 In Scope (MVP)
| Feature | Description | Reason for Priority |
| --- | --- | --- |
| CRUD Penghuni & Kamar | Tambah, lihat, dan edit data dasar. | Fondasi utama aplikasi. |
| Pencatatan Keuangan | Input pemasukan dan pengeluaran harian. | Menyelesaikan masalah utama "catatan berantakan". |
| Dashboard Saldo | Tampilan sisa uang setelah dipotong biaya. | Kebutuhan mendesak pemilik untuk pantau profit. |
| Integrasi WhatsApp | Tombol klik-untuk-chat ke nomor penghuni. | Memudahkan komunikasi penagihan. |

## 8.2 Out of Scope (Phase 2)
| Feature | Description | Reason for Delay |
| --- | --- | --- |
| Upload Foto Kuitansi | Simpan foto bukti bayar ke Google Drive. | Membutuhkan penanganan file yang lebih kompleks. |
| Notifikasi Otomatis | Kirim WA otomatis saat jatuh tempo. | Membutuhkan third-party API berbayar (seperti Fonnte/Wablas). |
| Multi-user Role | Level akses berbeda antara Penjaga & Pemilik. | Fokus saat ini adalah fungsionalitas input data. |
| Export PDF/Excel | Cetak laporan formal bulanan. | Bisa dilakukan langsung dari Google Sheets untuk sementara. |