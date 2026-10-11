/**
 * Tani.SM - Agricultural Marketplace Seed Data
 * Data terstruktur dan realistis tanpa AI slop
 */

const SEED_DATA = {
  categories: [
    { id: 'cat-1', name: 'Bibit & Benih', slug: 'bibit-benih', desc: 'Benih unggul bersertifikat untuk padi, hortikultura, dan palawija' },
    { id: 'cat-2', name: 'Pupuk Tanaman', slug: 'pupuk-tanaman', desc: 'Pupuk organik, NPK majemuk, hayati, dan pembenah tanah' },
    { id: 'cat-3', name: 'Obat Hama & Penyakit', slug: 'obat-hama', desc: 'Insektisida, fungisida, herbisida, dan biopestisida ramah lingkungan' },
    { id: 'cat-4', name: 'Alat & Mesin Tani', slug: 'alat-mesin', desc: 'Sprayer, pompa alkon, gunting pangkas, dan peralatan budidaya' },
    { id: 'cat-5', name: 'Media & Perlengkapan', slug: 'media-perlengkapan', desc: 'Plastik mulsa, tray semai, cocopeat, polybag, dan paranet' },
    { id: 'cat-6', name: 'Hasil Panen Segar', slug: 'hasil-panen', desc: 'Hasil panen langsung dari petani mitra Tani.SM' }
  ],

  products: [
    {
      id: 'PRD-001',
      name: 'Benih Padi Unggul Ciherang Super (Label Biru Bersertifikat)',
      categoryId: 'cat-1',
      price: 95000,
      originalPrice: 115000,
      stock: 450,
      unit: 'Karung 5 Kg',
      minStockWarning: 50,
      soldCount: 1420,
      rating: 4.9,
      reviewCount: 388,
      badge: 'Mitra Tani',
      location: 'Gudang Klaten, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Kemurnian 99.2% | Daya Berkecambah 92%',
      weightGram: 5000,
      shelfLocation: 'Rak A-01 (Lantai 1)',
      description: 'Benih padi varietas Ciherang label biru resmi Balai Pengawasan dan Sertifikasi Benih (BPSB). Umur tanaman 115-125 hari setelah semai. Anakan produktif 14-17 batang. Tahan terhadap wereng coklat biotipe 2 dan tahan hawar daun bakteri (HDB) strain III dan IV. Potensi hasil mencapai 8.5 ton/ha gabah kering giling.',
      usageGuide: 'Kebutuhan benih 20-25 kg per hektar. Rendam benih dalam air garam ringan selama 24 jam sebelum disemai.'
    },
    {
      id: 'PRD-002',
      name: 'Benih Cabai Rawit Hiyung Original Super Pedas',
      categoryId: 'cat-1',
      price: 38000,
      originalPrice: 48000,
      stock: 320,
      unit: 'Sachet 10 Gram (~1.800 biji)',
      minStockWarning: 40,
      soldCount: 980,
      rating: 4.8,
      reviewCount: 215,
      badge: 'Terlaris',
      location: 'Gudang Kediri, Jawa Timur',
      image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Daya Kecambah 88% | Kemurnian 98%',
      weightGram: 30,
      shelfLocation: 'Rak A-04 (Lantai 1)',
      description: 'Cabai rawit lokal terpedas khas Tapin Kalimantan Selatan dengan tingkat kepedasan mencapai 94.500 ppm capsaicin (17x lipat cabai rawit biasa). Buah lebat, tangkai kokoh, sangat adaptif di dataran rendah hingga menengah, serta tahan simpan hingga 10 hari pasca panen.',
      usageGuide: 'Semai pada tray semai dengan media arang sekam + cocopeat halus (1:1). Pindah tanam setelah 25 hari atau berdaun 4 helai.'
    },
    {
      id: 'PRD-003',
      name: 'Pupuk NPK Mutiara 16-16-16 Granul Biru Original YaraMila',
      categoryId: 'cat-2',
      price: 185000,
      originalPrice: 205000,
      stock: 620,
      unit: 'Zak 5 Kg (Repack Pabrik Segel)',
      minStockWarning: 80,
      soldCount: 3100,
      rating: 5.0,
      reviewCount: 840,
      badge: 'Official',
      location: 'Gudang Klaten, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80',
      activeIngredient: '16% N Total, 16% P2O5, 16% K2O, 0.5% MgO, 6% CaO',
      weightGram: 5000,
      shelfLocation: 'Palet B-02 (Zona Kimia)',
      description: 'Pupuk majemuk lengkap prill biru standar industri pertanian internasional. Mengandung nitrogen dalam bentuk Nitrat-N (cepat serap) dan Amonium-N (tersedia bertahap). Menjamin pertumbuhan vegetatif serempak, memperkuat perakaran, dan meningkatkan bobot panen.',
      usageGuide: 'Aplikasi tabur atau kocor. Untuk kocor: larutkan 2-3 sendok makan NPK ke dalam 10 liter air, siramkan 200ml per lubang tanam tiap 7-10 hari sekali.'
    },
    {
      id: 'PRD-004',
      name: 'Pupuk Hayati Cair EM4 Pertanian Kemasan Segel Pabrik 1 Liter',
      categoryId: 'cat-2',
      price: 26500,
      originalPrice: 32000,
      stock: 410,
      unit: 'Botol 1.000 ml',
      minStockWarning: 60,
      soldCount: 2450,
      rating: 4.9,
      reviewCount: 672,
      badge: 'Organik',
      location: 'Gudang Boyolali, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Lactobacillus casei, Saccharomyces cerevisiae, Bakteri Fotosintetik',
      weightGram: 1150,
      shelfLocation: 'Rak B-08 (Zona Cair)',
      description: 'Kultur mikroorganisme aktif untuk mempercepat proses dekomposisi bahan organik menjadi humus kaya hara. Sangat efektif untuk pembuatan kompos kohe sapi/kambing, bokashi, serta menyehatkan ekosistem mikroba tanah yang rusak akibat pemupukan kimia berlebih.',
      usageGuide: 'Larutkan 10-20 ml EM4 + 10 ml molase/gula merah ke dalam 1 liter air bersih, semprotkan merata ke tumpukan bahan kompos tiap lapisan.'
    },
    {
      id: 'PRD-005',
      name: 'Sprayer Elektrik Tanika 16 Liter Aki Kering Dual Fungsi Manual',
      categoryId: 'cat-4',
      price: 485000,
      originalPrice: 575000,
      stock: 45,
      unit: '1 Unit Lengkap + Aksesori Spuyer',
      minStockWarning: 10,
      soldCount: 295,
      rating: 4.8,
      reviewCount: 94,
      badge: 'Garansi 6 Bln',
      location: 'Gudang Solo, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Baterai 12V 8Ah | Tekanan 0.4 - 0.45 Mpa',
      weightGram: 6200,
      shelfLocation: 'Rak E-01 (Mesin & Alat)',
      description: 'Tangki semprot punggung kapasitas 16 liter dengan dual mode (elektrik baterai dan tuas pompa manual cadangan). Baterai awet tahan hingga 18-20 tangki semprot per full charge. Dilengkapi regulator putar pengatur tekanan semprot dan 4 variasi spuyer (kabut, sebar, kipas).',
      usageGuide: 'Lakukan pengisian baterai pertama kali selama 8 jam sebelum pemakaian pertama. Bilas tangki dengan air bersih setelah penyemprotan pestisida.'
    },
    {
      id: 'PRD-006',
      name: 'Fungisida Kontak Antracol 70 WP Bayer Protektif Daun & Buah',
      categoryId: 'cat-3',
      price: 64000,
      originalPrice: 75000,
      stock: 190,
      unit: 'Bungkus 250 Gram',
      minStockWarning: 30,
      soldCount: 1120,
      rating: 4.9,
      reviewCount: 310,
      badge: 'Mitra Tani',
      location: 'Gudang Klaten, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Propineb 70% + Zinc (Seng)',
      weightGram: 290,
      shelfLocation: 'Lemari C-02 (Pestisida Padat)',
      description: 'Fungisida kontak berspektrum luas berbentuk tepung putih yang dapat disuspensikan dalam air. Efektif mengendalikan penyakit bercak daun, antraknosa (patek), busuk daun Phytophthora, dan karat daun pada tanaman cabai, tomat, bawang merah, dan kentang. Tambahan Zinc membantu tanaman tetap hijau sehat.',
      usageGuide: 'Dosis anjuran 1.5 - 2 gram per liter air. Semprotkan saat pagi atau sore hari dengan interval 5-7 hari sekali.'
    },
    {
      id: 'PRD-007',
      name: 'Benih Jagung Hibrida NK 212 Raja Panen Tahan Kekeringan',
      categoryId: 'cat-1',
      price: 135000,
      originalPrice: 155000,
      stock: 280,
      unit: 'Kantong 1 Kg',
      minStockWarning: 40,
      soldCount: 860,
      rating: 4.8,
      reviewCount: 190,
      badge: 'Grosir',
      location: 'Gudang Kediri, Jawa Timur',
      image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Kemurnian 99.0% | Daya Tumbuh 85%',
      weightGram: 1050,
      shelfLocation: 'Rak A-02 (Lantai 1)',
      description: 'Benih jagung pakan hibrida berdaya hasil tinggi dari Syngenta. Batang kokoh tidak mudah roboh, tongkol terisi penuh hingga ujung (janggel kecil), serta adaptif ditanam di lahan tadah hujan maupun lahan sawah irigasi.',
      usageGuide: 'Jarak tanam rekomendasi 75 x 20 cm, 1 biji per lubang. Kebutuhan benih sekitar 15-18 kg per hektar.'
    },
    {
      id: 'PRD-008',
      name: 'Insektisida Biologis Ekstrak Mimba (Neem Oil) Pengusir Kutu Kebul',
      categoryId: 'cat-3',
      price: 49000,
      originalPrice: 58000,
      stock: 140,
      unit: 'Botol 500 ml',
      minStockWarning: 25,
      soldCount: 540,
      rating: 4.7,
      reviewCount: 124,
      badge: 'Organik',
      location: 'Gudang Boyolali, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Azadirachtin 0.3% EC Alami',
      weightGram: 580,
      shelfLocation: 'Rak B-09 (Zona Cair)',
      description: 'Pestisida nabati ramah lingkungan yang aman dari residu berbahaya. Bekerja sebagai repellent (penolak), antifeedant (penghambat nafsu makan), dan perusak siklus metamorfosis hama penghisap seperti trips, kutu kebul, tungau, dan ulat grayak.',
      usageGuide: 'Kocok dahulu sebelum digunakan. Dosis 3-5 ml per liter air, tambahkan sedikit perata/perekat alami. Semprot bagian bawah daun.'
    },
    {
      id: 'PRD-009',
      name: 'Plastik Mulsa Hitam Perak (MHP) Lebar 120 cm Panjang 500 Meter',
      categoryId: 'cat-5',
      price: 365000,
      originalPrice: 410000,
      stock: 35,
      unit: '1 Roll Utuh (Berat ~18 Kg)',
      minStockWarning: 8,
      soldCount: 175,
      rating: 4.9,
      reviewCount: 52,
      badge: 'Grosir',
      location: 'Gudang Klaten, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Plastik PE Original Grade A Tebal 0.35 Mikron',
      weightGram: 18000,
      shelfLocation: 'Palet D-01 (Kargo Berat)',
      description: 'Mulsa pertanian dua sisi hitam-perak premium anti-UV. Sisi perak menghadap ke atas memantulkan sinar matahari untuk menghalau trips/kutu dan menjaga suhu bedengan, sisi hitam ke bawah efektif menekan pertumbuhan gulma dan menjaga kelembaban pupuk dasar.',
      usageGuide: 'Pasang pada bedengan saat matahari terik agar plastik memuai kencang dan rapi saat dipasak bambu.'
    },
    {
      id: 'PRD-010',
      name: 'Gunting Dahan & Ranting Pruning Baja SK-5 Super Tajam Ergonomis',
      categoryId: 'cat-4',
      price: 52000,
      originalPrice: 65000,
      stock: 85,
      unit: '1 Pcs (Include Sarung Blister)',
      minStockWarning: 15,
      soldCount: 420,
      rating: 4.8,
      reviewCount: 96,
      badge: 'Pilihan Petani',
      location: 'Gudang Solo, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1617576683096-00fc8eecb3af?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Mata Pisau Baja SK-5 Jepang Tahan Karat',
      weightGram: 260,
      shelfLocation: 'Rak E-03 (Alat Tangan)',
      description: 'Gunting pangkas dahan buah dan tanaman hias dengan per pegas lembut dan kunci pengaman satu jempol. Mampu memotong ranting berkayu hingga diameter 20 mm dengan bekas potongan rapi tanpa merusak kambium dahan.',
      usageGuide: 'Bersihkan getah tanaman setelah selesai penggunaan dan beri sedikit minyak pelumas pada baut poros penahan.'
    },
    {
      id: 'PRD-011',
      name: 'Pupuk Kascing Organik Murni 100% Cacing Tanah Fermentasi Matang',
      categoryId: 'cat-2',
      price: 22000,
      originalPrice: 28000,
      stock: 500,
      unit: 'Karung 5 Kg',
      minStockWarning: 50,
      soldCount: 1650,
      rating: 4.9,
      reviewCount: 430,
      badge: 'Organik',
      location: 'Gudang Boyolali, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Bahan Organik >25% | C/N Rasio 12-15 | pH 6.8',
      weightGram: 5000,
      shelfLocation: 'Palet B-05 (Gudang Terbuka)',
      description: 'Bekas cacing (kascing) hasil biokonversi cacing Lumbricus rubellus. Kaya hormon auksin, giberelin, dan sitokinin alami yang merangsang perakaran cepat serta memperbaiki aerasi dan kapasitas tukar kation (KTK) tanah yang padat.',
      usageGuide: 'Campurkan kascing dengan tanah kebun atau media pot dengan perbandingan 1:2 untuk media tanam ideal sayuran daun.'
    },
    {
      id: 'PRD-012',
      name: 'Tray Semai Bibit 128 Lubang Tebal Awet Tidak Mudah Pecah',
      categoryId: 'cat-5',
      price: 8500,
      originalPrice: 12000,
      stock: 1200,
      unit: '1 Lembar (128 Cell)',
      minStockWarning: 150,
      soldCount: 5200,
      rating: 4.9,
      reviewCount: 920,
      badge: 'Grosir',
      location: 'Gudang Klaten, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Plastik Polistirena (PS) Hitam Tebal 0.9 mm',
      weightGram: 140,
      shelfLocation: 'Rak D-04 (Perlengkapan)',
      description: 'Baki semai pembibitan cabai, tomat, terong, melon, dan sayuran daun. Memiliki lubang drainase bawah presisi mencegah busuk akar. Mempermudah proses pindah tanam tanpa merusak perakaran muda.',
      usageGuide: 'Isi tiap lubang dengan campuran media semai halus, buat lubang sedalam 0.5 cm, masukkan 1 butir benih lalu tutup tipis.'
    },
    {
      id: 'PRD-013',
      name: 'Bawang Merah Asli Brebes Varietas Bima Brebes Kualitas Super',
      categoryId: 'cat-6',
      price: 34000,
      originalPrice: 42000,
      stock: 220,
      unit: 'Jaring 1 Kg (Kering Rogol Siap Simpan)',
      minStockWarning: 30,
      soldCount: 880,
      rating: 4.8,
      reviewCount: 260,
      badge: 'Panen Baru',
      location: 'Gudang Brebes, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1563865436874-9aef32095fad?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Kadar Air Rendah, Umbi Merah Padat & Harum',
      weightGram: 1000,
      shelfLocation: 'Ruang Sejuk Panen F-01',
      description: 'Bawang merah panen segar petani mitra Paguyuban Tani Brebes. Umbi padat, warna merah menyala, aroma tajam khas masakan nusantara, dan kadar air sudah dianginkan kering sehingga tahan disimpan hingga 1.5 bulan di suhu ruang berangin.',
      usageGuide: 'Simpan di wadah anyaman bambu atau gantung di tempat yang memiliki sirkulasi udara lancar dan tidak terkena sinar matahari langsung.'
    },
    {
      id: 'PRD-014',
      name: 'Melon Golden Aroma Hidroponik Grade A Manis Renyah Brix 14+',
      categoryId: 'cat-6',
      price: 28000,
      originalPrice: 35000,
      stock: 90,
      unit: '1 Buah (~1.3 - 1.5 Kg)',
      minStockWarning: 15,
      soldCount: 310,
      rating: 5.0,
      reviewCount: 110,
      badge: 'Panen Baru',
      location: 'Gudang Boyolali, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Tingkat Kemanisan 13 - 15 Brix Teruji Refraktometer',
      weightGram: 1400,
      shelfLocation: 'Ruang Sejuk Panen F-03',
      description: 'Melon golden kulit kuning mulus daging renyah oranye keemasan hasil budidaya greenhouse hidroponik bebas pestisida kimia berlebih. Dipanen tepat di kematangan fisiologis sempurna untuk menjamin rasa manis alami yang legit dan harum segar.',
      usageGuide: 'Dapat langsung dinikmati atau didinginkan terlebih dahulu di kulkas untuk sensasi kesegaran maksimal.'
    },
    {
      id: 'PRD-015',
      name: 'Cangkul Baja Tempa Pandai Besi Tradisional Anti Lengket Tanah',
      categoryId: 'cat-4',
      price: 88000,
      originalPrice: 110000,
      stock: 70,
      unit: '1 Mata Cangkul (Baja Tempa Siap Gagang)',
      minStockWarning: 12,
      soldCount: 460,
      rating: 4.8,
      reviewCount: 135,
      badge: 'Pilihan Petani',
      location: 'Gudang Klaten, Jawa Tengah',
      image: 'https://images.unsplash.com/photo-1589051039485-d4150df45ca2?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Baja Rel Kereta Tempa Sepuhan Oli Tua',
      weightGram: 1800,
      shelfLocation: 'Rak E-05 (Alat Tangan)',
      description: 'Mata cangkul pertanian tebal tempaan pandai besi Klaten berpengalaman. Ujung tajam tidak gampang sompal kena batu, bidang cangkul melengkung presisi sehingga tanah mudah lepas saat dibalik di sawah basah maupun ladang kering.',
      usageGuide: 'Pasang gagang kayu doran dari kayu jati atau sonokeling keras dengan pasak baji yang kencang.'
    },
    {
      id: 'PRD-016',
      name: 'Benih Tomat Servo F1 Tahan Virus Gemini & Layu Bakteri',
      categoryId: 'cat-1',
      price: 89000,
      originalPrice: 105000,
      stock: 160,
      unit: 'Kemasan Asli Cap Panah Merah (1.750 Biji)',
      minStockWarning: 20,
      soldCount: 780,
      rating: 4.9,
      reviewCount: 220,
      badge: 'Mitra Tani',
      location: 'Gudang Kediri, Jawa Timur',
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      activeIngredient: 'Benih Hibrida Tahan Gemini Virus & Bakteri Ralstonia',
      weightGram: 50,
      shelfLocation: 'Rak A-03 (Lantai 1)',
      description: 'Tomat hibrida tipe indeterminate untuk dataran rendah sampai menengah. Buah keras bulat lonjong dengan bobot 60-70 gram/buah. Toleran terhadap iklim panas dan sangat diminati pasar sayur tradisional karena daya simpan transportasi jarak jauh yang prima.',
      usageGuide: 'Pemberian pupuk kalsium tinggi saat fase pembungaan untuk mencegah penyakit busuk pantat buah (blossom end rot).'
    }
  ],

  customers: [
    {
      id: 'CST-001',
      name: 'Budi Santoso',
      phone: '0812-3456-7890',
      email: 'budi.santoso@pertanian.id',
      kelompokTani: 'Poktan Makmur Jaya (Klaten)',
      address: 'Dusun Jetis RT 03/RW 02, Desa Ceper, Kec. Ceper, Kab. Klaten, Jawa Tengah 57465',
      lahanHa: 1.5,
      komoditasUtama: 'Padi & Cabai Rawit',
      totalOrders: 6,
      totalSpent: 1240000,
      status: 'Aktif'
    },
    {
      id: 'CST-002',
      name: 'Siti Aminah',
      phone: '0857-1122-3344',
      email: 'siti.aminah@hidroponik.id',
      kelompokTani: 'Komunitas Hidroponik Solo Raya',
      address: 'Jl. Slamet Riyadi No. 142, Kerten, Kec. Laweyan, Kota Surakarta, Jawa Tengah 57143',
      lahanHa: 0.3,
      komoditasUtama: 'Melon Golden & Sayur Hidroponik',
      totalOrders: 8,
      totalSpent: 890000,
      status: 'Aktif'
    },
    {
      id: 'CST-003',
      name: 'Haji Suryanto',
      phone: '0813-8899-0011',
      email: 'h.suryanto.brebes@gmail.com',
      kelompokTani: 'Gapoktan Bawang Mulya Brebes',
      address: 'Desa Larangan RT 01/RW 04, Kec. Larangan, Kab. Brebes, Jawa Tengah 52262',
      lahanHa: 3.2,
      komoditasUtama: 'Bawang Merah & Jagung',
      totalOrders: 11,
      totalSpent: 4750000,
      status: 'VIP'
    },
    {
      id: 'CST-004',
      name: 'Wayan Sudarma',
      phone: '0821-4455-6677',
      email: 'wayan.sudarma@tani.bali.id',
      kelompokTani: 'Subak Anyar Tabanan',
      address: 'Banjar Tengah, Desa Baturiti, Kec. Baturiti, Kab. Tabanan, Bali 82191',
      lahanHa: 2.0,
      komoditasUtama: 'Hortikultura & Sayuran Dataran Tinggi',
      totalOrders: 4,
      totalSpent: 920000,
      status: 'Aktif'
    }
  ],

  orders: [
    {
      id: 'ORD-20261001-001',
      customerId: 'CST-001',
      customerName: 'Budi Santoso',
      phone: '0812-3456-7890',
      shippingAddress: 'Dusun Jetis RT 03/RW 02, Desa Ceper, Kec. Ceper, Kab. Klaten, Jawa Tengah 57465',
      date: '2026-10-01 09:15',
      status: 'Diproses Gudang',
      paymentMethod: 'Transfer Mandiri (Virtual Account)',
      paymentStatus: 'Lunas',
      courier: 'J&T Cargo Pertanian',
      trackingNo: 'JTC-ID-882910394',
      subtotal: 375000,
      shippingCost: 35000,
      discount: 30000,
      total: 380000,
      items: [
        { productId: 'PRD-001', name: 'Benih Padi Unggul Ciherang Super', price: 95000, qty: 2, unit: 'Karung 5 Kg' },
        { productId: 'PRD-003', name: 'Pupuk NPK Mutiara 16-16-16 Granul', price: 185000, qty: 1, unit: 'Zak 5 Kg' }
      ],
      warehouseNotes: 'Barang sudah dipacking karung goni + bubble wrap rapi. Menunggu jemput armada cargo.',
      trackingHistory: [
        { time: '2026-10-01 09:20', text: 'Pembayaran terverifikasi otomatis via VA Mandiri.' },
        { time: '2026-10-01 10:45', text: 'Surat Jalan Gudang & Label Resi dicetak oleh Admin Gudang Klaten.' },
        { time: '2026-10-01 13:10', text: 'Pesanan telah dipacking dan ditempatkan di Zona Siap Angkut (Palet B-02).' }
      ]
    },
    {
      id: 'ORD-20261001-002',
      customerId: 'CST-003',
      customerName: 'Haji Suryanto',
      phone: '0813-8899-0011',
      shippingAddress: 'Desa Larangan RT 01/RW 04, Kec. Larangan, Kab. Brebes, Jawa Tengah 52262',
      date: '2026-10-01 11:30',
      status: 'Dikirim',
      paymentMethod: 'Transfer BRI Otomatis',
      paymentStatus: 'Lunas',
      courier: 'SiCepat Cargo Muatan',
      trackingNo: 'SCP-TANI-9940129',
      subtotal: 1098000,
      shippingCost: 65000,
      discount: 50000,
      total: 1113000,
      items: [
        { productId: 'PRD-005', name: 'Sprayer Elektrik Tanika 16 Liter', price: 485000, qty: 2, unit: '1 Unit' },
        { productId: 'PRD-006', name: 'Fungisida Kontak Antracol 70 WP', price: 64000, qty: 2, unit: 'Bungkus 250 Gram' }
      ],
      warehouseNotes: 'Mesin telah dicek tes hidup pompa sebelum masuk kardus.',
      trackingHistory: [
        { time: '2026-10-01 11:35', text: 'Pembayaran BRI diverifikasi.' },
        { time: '2026-10-01 14:00', text: 'Pengecekan kelengkapan nozzle & unit baterai sprayer selesai.' },
        { time: '2026-10-01 16:30', text: 'Paket diserahkan ke kurir SiCepat Cargo di Hub Solo Surakarta.' },
        { time: '2026-10-02 04:15', text: 'Paket tiba di Hub Sortir Brebes Barat. Siap diantar ke alamat kebun.' }
      ]
    },
    {
      id: 'ORD-20261002-003',
      customerId: 'CST-002',
      customerName: 'Siti Aminah',
      phone: '0857-1122-3344',
      shippingAddress: 'Jl. Slamet Riyadi No. 142, Kerten, Kec. Laweyan, Kota Surakarta, Jawa Tengah 57143',
      date: '2026-10-02 14:20',
      status: 'Selesai',
      paymentMethod: 'QRIS Pertanian Nasional',
      paymentStatus: 'Lunas',
      courier: 'Kurir Lokal Tani Mandiri',
      trackingNo: 'TL-SOLO-00431',
      subtotal: 111000,
      shippingCost: 15000,
      discount: 15000,
      total: 111000,
      items: [
        { productId: 'PRD-004', name: 'Pupuk Hayati Cair EM4 1 Liter', price: 26500, qty: 2, unit: 'Botol 1.000 ml' },
        { productId: 'PRD-012', name: 'Tray Semai Bibit 128 Lubang', price: 8500, qty: 4, unit: '1 Lembar' },
        { productId: 'PRD-011', name: 'Pupuk Kascing Organik Murni 5kg', price: 22000, qty: 1, unit: 'Karung 5 Kg' }
      ],
      warehouseNotes: 'Pengantaran armada pickup rute Solo kota.',
      trackingHistory: [
        { time: '2026-10-02 14:21', text: 'Pembayaran QRIS berhasil diproses.' },
        { time: '2026-10-02 15:10', text: 'Barang dimuat ke armada pickup Tani Mandiri.' },
        { time: '2026-10-02 17:30', text: 'Pesanan telah diterima oleh Ibu Siti Aminah di greenhouse.' }
      ]
    },
    {
      id: 'ORD-20261003-004',
      customerId: 'CST-001',
      customerName: 'Budi Santoso',
      phone: '0812-3456-7890',
      shippingAddress: 'Dusun Jetis RT 03/RW 02, Desa Ceper, Kec. Ceper, Kab. Klaten, Jawa Tengah 57465',
      date: '2026-10-03 08:45',
      status: 'Menunggu Verifikasi Pembayaran',
      paymentMethod: 'Transfer Manual BRI (Bukti Terlampir)',
      paymentStatus: 'Perlu Verifikasi',
      courier: 'J&T Cargo Pertanian',
      trackingNo: 'Menunggu Pengiriman',
      subtotal: 417000,
      shippingCost: 35000,
      discount: 25000,
      total: 427000,
      items: [
        { productId: 'PRD-009', name: 'Plastik Mulsa Hitam Perak 120cm', price: 365000, qty: 1, unit: '1 Roll Utuh' },
        { productId: 'PRD-010', name: 'Gunting Dahan Baja SK-5', price: 52000, qty: 1, unit: '1 Pcs' }
      ],
      warehouseNotes: 'Cek rekening koran BRI jam 09.00 sebelum klik verifikasi.',
      trackingHistory: [
        { time: '2026-10-03 08:45', text: 'Pesanan dibuat. Bukti transfer Rp427.000 diupload pelanggan.' }
      ]
    }
  ],

  vouchers: [
    { code: 'PANENRAYA', name: 'Kupon Musim Panen Raya', discountPercent: 15, maxDiscount: 40000, minSpend: 150000, quota: 150, used: 64, active: true },
    { code: 'SUBSIDIPUPUK', name: 'Potongan Khusus Pupuk & Nutrisi', discountFlat: 30000, minSpend: 200000, quota: 200, used: 112, active: true },
    { code: 'GRATISONGKIR', name: 'Subsidi Ongkir Kargo Seluruh Jawa', discountFlat: 25000, minSpend: 100000, quota: 500, used: 387, active: true },
    { code: 'BIBITUNGGUL', name: 'Cashback Benih Bersertifikat 10%', discountPercent: 10, maxDiscount: 25000, minSpend: 80000, quota: 100, used: 41, active: true }
  ],

  tips: [
    {
      id: 'tip-1',
      title: 'Strategi Jitu Mengendalikan Hama Wereng Batang Coklat (WBC) Pada Padi',
      category: 'Perlindungan Tanaman',
      author: 'Ir. Agus Supriyanto (Penyuluh Pertanian Tani.SM)',
      date: '28 September 2026',
      readTime: '4 menit baca',
      summary: 'Wereng cokelat bisa menggagalkan panen dalam hitungan hari bila terlambat dideteksi. Kenali gejala hopperburn dan langkah rotasi bahan aktif.',
      content: `
        <p>Wereng Batang Coklat (Nilaparvata lugens) merupakan salah satu hama paling merugikan bagi petani padi. Gejala serangan awal ditandai dengan daun tanaman padi menguning cepat menyerupai terbakar yang dikenal dengan istilah <em>hopperburn</em>.</p>
        <p><strong>Langkah Penanganan Terpadu:</strong></p>
        <ol>
          <li><strong>Pengeringan Lahan Berkala:</strong> Hindari genangan air terus-menerus. Wereng menyukai kelembaban tinggi di pangkal batang padi.</li>
          <li><strong>Gunakan Varietas Tahan:</strong> Tanam bibit bersertifikat yang memiliki ketahanan genetik seperti Ciherang atau Inpari 32.</li>
          <li><strong>Rotasi Bahan Aktif:</strong> Jangan menyemprot insektisida berbahan aktif sama secara berulang untuk menghindari resistensi hama. Gunakan biopestisida pada fase awal vegetatif.</li>
        </ol>
      `
    },
    {
      id: 'tip-2',
      title: 'Panduan Dosis Pemupukan Berimbang Tanaman Cabai Rawit di Lahan Kering',
      category: 'Nutrisi & Kesuburan',
      author: 'Tim Agronomi Tani.SM',
      date: '20 September 2026',
      readTime: '5 menit baca',
      summary: 'Rahasia tanaman cabai tetap berbuah lebat meski di musim kemarau dengan rasio pemupukan NPK dan kalsium yang tepat.',
      content: `
        <p>Cabai membutuhkan nutrisi yang bertahap dan teratur. Kesalahan umum petani adalah memberikan pupuk urea berlebih di awal masa tanam yang memicu tanaman rimbun daun namun rentan serangan jamur patek.</p>
        <p><strong>Jadwal Rekomendasi Pemupukan:</strong></p>
        <ul>
          <li><strong>Fase Dasar:</strong> Taburkan kompos kascing matang 200 gr + NPK Mutiara 10 gr per lubang sebelum ditutup mulsa hitam perak.</li>
          <li><strong>Fase Vegetatif (14 - 35 HST):</strong> Kocor NPK 16-16-16 dosis 3 gram per liter air setiap 7 hari sekali.</li>
          <li><strong>Fase Generatif (35 HST ke atas):</strong> Tambahkan pupuk kalium tinggi dan kalsium nitrat untuk menguatkan tangkai bunga agar tidak rontok.</li>
        </ul>
      `
    },
    {
      id: 'tip-3',
      title: 'Cara Membuat Pupuk Kompos Organik Super Cepat Menggunakan Dekomposer EM4',
      category: 'Organik & Biologi',
      author: 'Subakti Tani Mandiri',
      date: '15 September 2026',
      readTime: '3 menit baca',
      summary: 'Mengubah kotoran kandang dan jerami sisa panen menjadi kompos gembur beraroma tanah dalam tempo 14-21 hari.',
      content: `
        <p>Fermentasi alami kohe (kotoran hewan) seringkali memakan waktu berbulan-bulan dan menimbulkan panas tinggi jika belum matang sempurna. Dengan dekomposer EM4 aktif, proses bisa dipersingkat menjadi 2 minggu.</p>
        <p><strong>Tahapan Pembuatan:</strong></p>
        <ol>
          <li>Siapkan 500 kg kohe sapi/kambing kering dan 100 kg jerami cincang.</li>
          <li>Campurkan 1 botol EM4 Pertanian + 1 liter tetes tebu / larutan gula merah ke dalam 50 liter air bersih.</li>
          <li>Siramkan larutan tersebut ke tumpukan bahan hingga kelembaban mencapai sekitar 40-50% (bila digenggam basah tapi tidak menetes).</li>
          <li>Tutup dengan terpal gelap dan lakukan pembalikan setiap 4 hari sekali untuk sirkulasi oksigen.</li>
        </ol>
      `
    },
    {
      id: 'tip-4',
      title: 'Perawatan Berkala Sprayer Elektrik Agar Aki Tidak Cepat Soak',
      category: 'Alat & Mekanisasi',
      author: 'Teknisi Gudang Tani.SM',
      date: '10 September 2026',
      readTime: '3 menit baca',
      summary: 'Tips sederhana menjaga tangki semprot elektrik Anda tetap prima selama bertahun-tahun di musim semprot intensif.',
      content: `
        <p>Aki kering tipe lead-acid pada sprayer elektrik membutuhkan perhatian khusus. Kebanyakan kerusakan pompa bukan karena motor rusak, melainkan karena aki dibiarkan kosong dalam jangka waktu lama.</p>
        <p><strong>Tips Pemeliharaan:</strong></p>
        <ul>
          <li>Jangan biarkan baterai kosong total setelah penyemprotan. Segera charge setelah digunakan.</li>
          <li>Bila sprayer tidak dipakai selama musim jeda tanam, lakukan pengisian daya minimal 1 bulan sekali selama 3 jam.</li>
          <li>Selalu bilas tangki dengan air bersih mengalir setelah menyemprot bahan kimia suspensi (tepung WP) agar nozzle dan membran pompa tidak mampet kerak kapur.</li>
        </ul>
      `
    }
  ],

  reviews: [
    {
      id: 'REV-001',
      productId: 'PRD-001',
      customerName: 'Haji Bambang - Sragen',
      rating: 5,
      date: '2026-09-29',
      comment: 'Benih Ciherang bersertifikat asli. Daya tumbuh sangat serempak, hari ke-3 di pesemaian sudah mulai hijau rata. Pengemasan karung aman dilapis plastik kedap.'
    },
    {
      id: 'REV-002',
      productId: 'PRD-003',
      customerName: 'Karyono - Boyolali',
      rating: 5,
      date: '2026-09-25',
      comment: 'NPK YaraMila biru asli butiran padat tidak gampang hancur lembek. Dipakai kocor ke cabai daun langsung tebal mengkilap. Pengiriman kargo cepat.'
    },
    {
      id: 'REV-003',
      productId: 'PRD-005',
      customerName: 'Supriatna - Wonogiri',
      rating: 4,
      date: '2026-09-20',
      comment: 'Sprayer Tanika mantap, sekali cas sanggup semprot 16 tangki lahan 1 hektar beres. Semburan kabutnya halus merata. Sayang tali ransel agak tipis sedikit tapi fungsinya top.'
    }
  ],

  stockLogs: [
    { id: 'LOG-001', date: '2026-10-01 08:30', productId: 'PRD-001', productName: 'Benih Padi Ciherang Super', type: 'Masuk', qty: 200, balance: 450, note: 'Penerimaan PO #BPSB-991 dari Balai Benih Sukamandi' },
    { id: 'LOG-002', date: '2026-10-01 09:20', productId: 'PRD-001', productName: 'Benih Padi Ciherang Super', type: 'Keluar', qty: 2, balance: 448, note: 'Alokasi pesanan ORD-20261001-001' },
    { id: 'LOG-003', date: '2026-10-01 10:00', productId: 'PRD-003', productName: 'Pupuk NPK Mutiara 16-16-16', type: 'Masuk', qty: 300, balance: 620, note: 'Kedatangan truk kontainer distributor Yara' },
    { id: 'LOG-004', date: '2026-10-01 11:35', productId: 'PRD-005', productName: 'Sprayer Elektrik Tanika 16L', type: 'Keluar', qty: 2, balance: 45, note: 'Alokasi pesanan ORD-20261001-002' },
    { id: 'LOG-005', date: '2026-10-02 16:00', productId: 'PRD-009', productName: 'Plastik Mulsa Hitam Perak', type: 'Penyesuaian', qty: -1, balance: 35, note: 'Stock opname akhir pekan: 1 roll dipakai uji ketebalan lab' }
  ],

  warehouseBanners: [
    {
      id: 'ban-1',
      title: 'Musim Tanam Rendeng 2026 Telah Tiba!',
      subtitle: 'Siapkan Benih Unggul Bersertifikat & Pupuk Berkualitas di Gudang Tani.SM',
      tag: 'Subsidi Tani',
      bgGradient: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
      btnText: 'Lihat Katalog Benih',
      catTarget: 'cat-1'
    },
    {
      id: 'ban-2',
      title: 'Diskon Kargo Spesial Alat & Mesin Tani',
      subtitle: 'Potongan Ongkir s.d Rp50.000 untuk Wilayah Jawa & Bali Setiap Pembelian Sprayer',
      tag: 'Kargo Murah',
      bgGradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 100%)',
      btnText: 'Cek Alat Pertanian',
      catTarget: 'cat-4'
    }
  ]
};
