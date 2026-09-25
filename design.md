```markdown
---
design_system:
  colors:
    primary: "#008444" # Hijau Tua (Header & Brand)
    secondary: "#28A745" # Hijau Terang (Progress/Success)
    accent_orange: "#F9A825" # Oranye (Pengeluaran)
    accent_purple: "#9B72B0" # Ungu (Active Nav State)
    background: "#F2F2F2" # Abu-abu sangat muda (App Background)
    surface: "#FFFFFF" # Putih (Cards/Panels)
    text_primary: "#000000" # Hitam (Judul/Value Utama)
    text_secondary: "#666666" # Abu-abu (Sub-label/Keterangan)
    text_tertiary: "#9E9E9E" # Abu-abu Muda (Placeholder/Dates)
    danger: "#D32F2F" # Merah (Progress rendah/Alert)
  typography:
    font_family: "Sans-serif (Inter/Roboto style)"
    scales:
      h1: "24px/bold" # "Aplikasi Kasir" (External)
      h2: "18px/bold" # "Rp. 228,000"
      body_bold: "14px/bold" # Nama Toko, Judul Menu
      body_reg: "12px/regular" # Email, Sub-menu
      caption: "10px/regular" # Tanggal, Persentase
  spacing:
    base: "4px"
    container_padding: "16px"
    item_gap: "12px"
  radius:
    sm: "4px" # Progress bar
    md: "12px" # Menu Icons
    lg: "20px" # Main Cards
    full: "999px" # Active Nav Indicator
  shadows:
    soft: "0px 4px 10px rgba(0, 0, 0, 0.05)"
---

## 🔬 Design Audit
*   **Style:** Clean, Modern, Utility-focused.
*   **Mood:** Profesional, Terpercaya, Terorganisir.
*   **Screen Type:** Mobile Application (Android/iOS Dashboard).
*   **Visual Hierarchy:** Menggunakan kontras warna hijau pada header untuk memfokuskan identitas brand, diikuti oleh kartu ringkasan (Summary Card) sebagai pusat data utama.

## 🎨 Color Palette & Design Tokens
*   **Brand Colors:** Dominasi Hijau (`#008444`) memberikan kesan finansial yang stabil.
*   **Status Colors:** Penggunaan warna fungsional pada teks "Pengeluaran" (Oranye) dan "Modal Harian" (Hijau) untuk diferensiasi cepat.
*   **Navigation:** Warna Ungu (`#9B72B0`) digunakan secara spesifik hanya untuk indikator aktif pada navigasi bawah.

## 🧩 Components Detected
1.  **Status Bar:** Jam (10:30), Signal, WiFi, Battery.
2.  **Header Profile:** Avatar (placeholder), Teks Nama Toko, Teks Email.
3.  **Brand Logo:** Logo "mamo" dengan kotak warna-warni (Merah, Kuning, Hijau).
4.  **Summary Card:** Kartu putih dengan shadow halus berisi total omset dan rincian modal/pengeluaran.
5.  **Icon Grid Menu:** 8 buah tombol menu (4 kolom x 2 baris) dengan ikon ilustratif dan label di bawahnya.
6.  **Progress Card:** List item yang berisi:
    *   Judul (Nama Toko)
    *   Rentang Tanggal
    *   Progress Bar (Linear)
    *   Label Rasio (Rp vs Rp)
    *   Label Persentase (%)
7.  **Bottom Navigation Bar:** 3 Tab (Beranda, Printer, Akun) dengan indikator lingkaran pada status aktif.

## ⚛️ Atomic Design Specification

### Atoms
*   **Icons:** Ikon berwarna (flat illustration style) untuk menu; Ikon outline/solid untuk bottom nav.
*   **Typography:** Label "Rp.", Angka nominal, Persentase.
*   **Shapes:** Lingkaran ungu (active state), Garis progress bar.

### Molecules
*   **Menu Item:** Gabungan ikon ilustrasi + teks label (contoh: Ikon Keranjang + "Kelola Stok").
*   **Data Point:** Label "Pengeluaran" + Value "Rp 20,000".
*   **Nav Item:** Ikon + Label teks di bawahnya.

### Organisms
*   **Top Dashboard:** Header profile + Logo mamo.
*   **Financial Summary:** Kartu putih "Omset Hari Ini".
*   **Main Navigation Grid:** Kumpulan 8 menu utama di tengah layar.
*   **Target Tracker:** Section "Target Omsset Penjualan" yang berisi daftar progress bar.

## 📐 Layout & Viewport Composition
*   **Structure:** Vertical Scroll Layout.
*   **Header Height:** ~20% dari tinggi layar (Background Hijau).
*   **Main Content:** Terbagi menjadi 3 section utama (Summary, Grid Menu, Target List).
*   **Grid System:** 4-Column grid untuk menu navigasi utama.
*   **Margins:** Safe area margin kiri-kanan sebesar 16px.
*   **Floating Effect:** Summary card diletakkan sedikit overlap antara header hijau dan body abu-abu untuk menciptakan kedalaman (elevation).
```