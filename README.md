# Tani.SM - Pasar Sarana Pertanian & Sistem Gudang Modern

Platform marketplace dan pergudangan pertanian nusantara yang terinspirasi dari tata letak e-commerce Shopee namun disesuaikan khusus untuk komoditas dan saprotan (sarana produksi pertanian).

Dibuat menggunakan kombinasi murni **HTML5 + CSS3 + Vanilla JavaScript** yang ringan, cepat, tanpa ketergantungan library pihak ketiga yang membengkak (*no AI-slop*), dan mengutamakan fungsi serta kemudahan pembacaan data bagi petani maupun staf pergudangan.

---

## 🔐 Logika Hak Akses (Role-Based Access Control)

Sesuai aturan keamanan otorisasi:
1. **Login menggunakan Email Admin (`admin.gudang@tanism.id`)**:
   - **Bisa Mengakses Halaman Customer (`index.html`)**: Admin memiliki hak akses penuh (*super user*), dapat meninjau katalog barang, memantau tampilan dari sudut pandang pembeli, dan kembali ke panel gudang kapan saja melalui bilah atas.
   - **Bisa Mengakses Halaman Admin Gudang (`admin.html`)**: Memiliki akses tak terbatas ke seluruh 11 modul pergudangan.
2. **Login menggunakan Email Customer (`budi.santoso@pertanian.id`, dll.)**:
   - **Hanya Bisa Mengakses Halaman Customer (`index.html`)**.
   - **TIDAK BISA Mengakses Halaman Admin Gudang (`admin.html`)**:
     - Jika mencoba membuka URL `admin.html` secara langsung, sistem secara otomatis memblokir rendering dan melempar kembali ke `index.html` dengan modal peringatan **"Akses Ditolak"**.
     - Jika mengklik tombol beralih ke Admin di bilah atas, sistem mencegatnya dan memunculkan pop-up larangan akses.
     - Jika mencoba login di halaman `login-admin.html` menggunakan email petani, validasi form akan menolak dengan pesan error otorisasi.

---

## 🌾 Struktur Portal & Halaman Login Terpisah

Sistem login kini dipisahkan secara penuh baik dari segi **URL**, **tampilan antarmuka**, maupun **logika validasi form**:

### 1. Halaman Login Petani / Customer (`login-customer.html`)
* **URL**: [login-customer.html](file:///c:/Users/LENOVO/Documents/Tani.SM/login-customer.html)
* **Tampilan**: Bernuansa e-commerce Shopee pertanian (oranye `#EE4D2D` & hijau subur `#2E7D32`), tata letak split-hero dengan informasi jaminan keaslian benih dan subsidi kargo, form ramah pengguna, tombol lihat/sembunyikan sandi, dan kotak 1-klik akun demo petani.
* **Form Validation**:
  - Validasi real-time saat berpindah kolom (*blur*) dan saat mengetik ulang (*input*).
  - Pengecekan format email standar atau nomor handphone Indonesia (10–13 digit).
  - Pengecekan panjang kata sandi minimal 6 karakter.
  - Tampilan visual error dengan bingkai merah pada input dan teks instruksi merah di bawah kolom.
  - Banner peringatan merah jika kredensial tidak cocok dan banner hijau saat login berhasil.

### 2. Halaman Login Admin Gudang (`login-admin.html`)
* **URL**: [login-admin.html](file:///c:/Users/LENOVO/Documents/Tani.SM/login-admin.html)
* **Tampilan**: Bernuansa profesional sistem pergudangan enterprise (*Warehouse Management System* - WMS) dengan warna *Dark Slate* (`#0F172A`, `#1E293B`) dan aksen hijau emerald (`#10B981`), badge keamanan otorisasi terenkripsi, serta dropdown pilihan pusat pergudangan (Klaten, Kediri, Brebes, Boyolali).
* **Form Validation**:
  - Validasi otentikasi ketat bagi petugas pergudangan resmi.
  - Validasi ID petugas / email gudang dan kata sandi minimal 6 karakter.
  - Umpan balik visual gelap dengan bingkai merah terang dan banner penolakan akses jika otorisasi tidak sah.
  - Tombol muat kredensial cepat untuk Kepala Gudang (Pak Joko).

### 3. Portal Gateway Selector (`login.html`)
* **URL**: [login.html](file:///c:/Users/LENOVO/Documents/Tani.SM/login.html)
* Halaman pemilih awal yang menampilkan dua kartu akses utama yang mengarahkan ke `login-customer.html` atau `login-admin.html`.
- **Dasbor / Beranda**: Banner musim tanam rendeng, navigasi cepat kategori, *Flash Sale* diskon saprotan dengan countdown timer, serta rekomendasi produk terlaris.
- **Katalog Pertanian**: Filter multi-dimensi (kategori benih/pupuk/alat/obat, rentang harga, rating bintang), penyortiran harga/terlaris, dan pencarian langsung (*live search*).
- **Detail Produk**: Foto produk beresolusi tinggi yang sesuai, spesifikasi bahan aktif, dosis anjuran pakai di lahan, sisa stok gudang fisik, lokasi rak, ulasan pembeli, dan aksi masukkan keranjang / beli sekarang.
- **Keranjang Belanja**: Pemilihan barang dengan centang, pengatur kuantitas (+/-), perhitungan total berat kargo, input kupon subsidi (`PANENRAYA`, `SUBSIDIPUPUK`, `GRATISONGKIR`).
- **Checkout**: Alamat pengiriman lahan/kebun, pemilihan kargo khusus muatan karung (J&T Cargo Pertanian, SiCepat Cargo Muatan, Armada Pick-up Mandiri), opsi pembayaran (Transfer Mandiri VA, BRI, QRIS Pertanian, COD Tani).
- **Pesanan Saya**: Riwayat pesanan dengan filter status (*Semua, Menunggu Pembayaran, Diproses Gudang, Sedang Dikirim, Selesai*).
- **Pelacakan Resi**: Timeline status pengiriman logistik bertahap dengan riwayat checkpoint dan nomor resi kargo riil.
- **Wishlist**: Menyimpan benih unggul atau mesin tani untuk persiapan musim tanam mendatang.
- **Ulasan Produk**: Form pemberian rating bintang 1–5 dan ulasan pengalaman hasil di lahan, beserta daftar ulasan dari sesama rekan petani.
- **Tips Pertanian**: Rubrik edukasi agronomi praktis (pengendalian hama wereng, dosis pemupukan cabai, pembuatan pupuk organik EM4, perawatan tangki sprayer).
- **Profil Customer**: Informasi petani, kelompok tani (Poktan), luas lahan garapan, komoditas utama, dan form ubah data profil.

### 2. Portal Admin Gudang (`admin.html`)
- **1. Dasbor Pergudangan**: Metrik KPI omzet penjualan, jumlah pesanan menunggu diproses, peringatan stok kritis, dan pengiriman aktif.
- **2. Pelanggan**: Master data petani & kelompok tani terdaftar, no telepon, komoditas utama, luas lahan, dan total belanja.
- **3. Master Produk**: Tambah, edit, dan hapus barang pertanian (harga, foto, bahan aktif, stok, satuan kemasan, lokasi rak).
- **4. Kategori**: Master data kategori komoditas dan saprotan.
- **5. Kontrol Stok**: Monitoring stok fisik gudang, indikator stok aman/menipis/habis, mutasi masuk (penerimaan pabrik) & mutasi keluar dengan catatan referensi, serta log riwayat mutasi (*audit trail*).
- **6. Pemesanan**: Pemantauan pesanan masuk, alokasi barang, cetak surat jalan / invoice pengiriman, dan pembaruan status pesanan.
- **7. Pembayaran**: Verifikasi pembayaran transfer bank dan QRIS dengan 1-klik approval.
- **8. Pengiriman**: Pengelolaan ekspedisi kargo, pembaruan nomor resi kargo, dan update riwayat checkpoint perjalanan logistik.
- **9. Konten**: Pengelolaan banner promosi gudang dan penulisan artikel edukasi tips pertanian.
- **10. Promo**: Pembuatan dan pengaturan kupon subsidi pertanian, persentase diskon, kuota pemakaian, dan minimal belanja.
- **11. Laporan (Bisa Dicetak / Print PDF)**:
  - Tersedia 2 jenis laporan: **Laporan Rekapitulasi Penjualan & Pendapatan** dan **Laporan Stock Opname Fisik & Valuasi Aset Gudang**.
  - Dilengkapi Kop Surat Resmi (*PT Tani Sinergi Mandiri*), ringkasan statistik transaksi, tabel rapi berstandar akuntansi gudang, dan kolom tanda tangan pengesahan (Kepala Gudang & Direktur Operasional).
  - Menggunakan stylesheet cetak khusus (`css/print.css`) yang secara otomatis menyembunyikan sidebar, tombol, dan navigasi saat tombol **"Cetak Laporan / Simpan PDF"** ditekan atau saat fungsi cetak browser (`Ctrl+P`) dipanggil.

---

## 🚀 Cara Menjalankan & Membuka

Cukup buka salah satu file berikut di browser (Google Chrome, Microsoft Edge, Mozilla Firefox, dll.):

1. **Halaman Login Dua Portal**: Buka file `login.html` (terdapat tombol demo 1-klik untuk langsung mencoba).
2. **Halaman Customer / Petani**: Buka file `index.html`.
3. **Halaman Admin Gudang**: Buka file `admin.html`.

*(Tersedia bilah pintas di bagian paling atas setiap halaman untuk beralih instan antara mode Customer dan Admin Gudang tanpa perlu bolak-balik login).*

---

## 📂 Struktur Berkas

```
Tani.SM/
├── index.html        # Portal Customer / Petani (Beranda, Katalog, Keranjang, Tracking, Tips, dll.)
├── admin.html        # Portal Admin Gudang (11 Modul Manajemen Pergudangan)
├── login.html        # Halaman Login Dua Portal
├── css/
│   ├── common.css    # Palet warna, tipografi, tombol, formulir, dan modal
│   ├── customer.css  # Tampilan e-commerce Shopee pertanian, filter, dan timeline
│   ├── admin.css     # Tata letak panel gudang, metrik KPI, dan tabel data
│   └── print.css     # Format resmi cetak A4 untuk Laporan dan Surat Jalan
└── js/
    ├── data.js       # Data awal produk, kategori, pelanggan, pesanan, dan artikel tips
    ├── store.js      # Sinkronisasi data lokal (localStorage) terintegrasi antar-portal
    ├── auth.js       # Manajemen sesi pengguna dan notifikasi
    ├── customer.js   # Logika interaktif portal Customer
    └── admin.js      # Logika interaktif portal Admin Gudang & trigger cetak laporan
```

---

## 📦 Kredensial Demo Cepat

- **Customer / Petani**:
  - Akun: Budi Santoso (Petani Padi Klaten) / Haji Suryanto (VIP Brebes)
  - Akses instan tersedia melalui tombol di `login.html`.
- **Admin Gudang**:
  - Petugas: Pak Joko Purnomo (Kepala Gudang Distribusi Pusat)
  - Akses instan tersedia melalui tombol di `login.html`.
