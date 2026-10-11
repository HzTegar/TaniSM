/**
 * Tani.SM - Admin Gudang Portal Controller
 * Mengelola 11 modul: Dasbor, Pelanggan, Produk, Kategori, Stok, Pemesanan,
 * Pembayaran, Pengiriman, Konten, Promo, dan Laporan (Siap Cetak).
 */

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});

const AdminApp = {
  activeView: 'dasbor',

  // Peta view -> method renderer (mengganti rangkaian if/if di switchView).
  VIEWS: {
    dasbor: 'renderDasbor',
    pelanggan: 'renderPelanggan',
    produk: 'renderProduk',
    kategori: 'renderKategori',
    stok: 'renderStok',
    pemesanan: 'renderPemesanan',
    pembayaran: 'renderPembayaran',
    pengiriman: 'renderPengiriman',
    konten: 'renderKonten',
    promo: 'renderPromo',
    laporan: 'renderLaporan'
  },

  // View yang wajib di-render ulang setelah data berubah.
  dirtyViews: new Set(),

  // View yang sudah pernah di-render (lazy render).
  renderedViews: {},

  init() {
    this.bindEvents();
    this.renderHeaderUserInfo();
    this.switchView('dasbor', { force: true });
  },

  bindEvents() {
    // Sidebar nav switching
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Modal Close
    document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeAllModals();
        }
      });
    });
  },

  toggleMobileSidebar(force) {
    const sidebar = document.querySelector('.admin-sidebar');
    const backdrop = document.getElementById('admin-sidebar-backdrop');
    if (!sidebar || !backdrop) return;
    const isOpen = force !== undefined ? force : !sidebar.classList.contains('mobile-open');
    if (isOpen) {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('active');
    } else {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    }
  },

  logout() {
    if (confirm('Apakah Anda yakin ingin keluar dari Panel Admin?')) {
      if (window.taniStore && typeof window.taniStore.logout === 'function') {
        window.taniStore.logout();
      } else {
        localStorage.removeItem('tani_auth_session');
      }
      if (window.TaniAuth && typeof window.TaniAuth.logout === 'function') {
        window.TaniAuth.logout('admin');
      } else {
        window.location.href = 'login-admin.html';
      }
    }
  },

  switchView(viewName, opts = {}) {
    if (viewName === 'logout') {
      this.logout();
      return;
    }
    this.activeView = viewName;
    this.toggleMobileSidebar(false);

    // Update active nav link
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update title
    const titleEl = document.getElementById('admin-page-title');
    const titles = {
      dasbor: 'Dasbor Pergudangan & Ringkasan Operasional',
      pelanggan: 'Manajemen Data Pelanggan & Kelompok Tani',
      produk: 'Master Data Produk & Sarana Pertanian',
      kategori: 'Manajemen Kategori Komoditas & Sarana',
      stok: 'Kontrol Stok Gudang & Mutasi Masuk/Keluar',
      pemesanan: 'Daftar Pemesanan & Alokasi Barang',
      pembayaran: 'Verifikasi Pembayaran & Rekening Koran',
      pengiriman: 'Logistik, Ekspedisi Kargo & Resi',
      konten: 'Kelola Banner & Rubrik Edukasi Tips Tani',
      promo: 'Manajemen Promo & Kupon Subsidi',
      laporan: 'Laporan Resmi Gudang (Siap Cetak / Print PDF)'
    };
    if (titleEl && titles[viewName]) {
      titleEl.textContent = titles[viewName];
    }

    // Toggle view visibility
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`admin-view-${viewName}`);
    if (target) {
      target.classList.add('active');
    }

    // Call renderers — hanya saat view benar-benar perlu (belum pernah dirender,
    // ditandai dirty, atau dipaksa). Mencegah render ulang saat user
    // berpindah-pindah menu tanpa perubahan data.
    const renderKey = this.VIEWS[viewName];
    if (renderKey) {
      const needsRender = opts.force || this.dirtyViews.has(viewName) || this.renderedViews[viewName] !== true;
      if (needsRender) {
        this.renderedViews[viewName] = true;
        this.dirtyViews.delete(viewName);
        this[renderKey]();
      }
    }
  },

  // Tandai view perlu di-render ulang setelah data berubah.
  invalidateView(viewName) {
    if (viewName) {
      this.dirtyViews.add(viewName);
    } else {
      this.dirtyViews.clear();
    }
  },

  invalidateAllViews() {
    this.dirtyViews = new Set(Object.keys(this.VIEWS));
  },

  renderHeaderUserInfo() {
    const auth = window.taniStore ? window.taniStore.getAuth() : null;
    const nameTop = document.getElementById('admin-top-user-name');
    const nameSide = document.getElementById('admin-sidebar-user-name');
    const displayName = (auth && auth.name) ? auth.name : 'admin';
    if (nameTop) nameTop.textContent = displayName;
    if (nameSide) nameSide.textContent = displayName;
  },

  // Debounce: input memicu oninput tiap ketikan.
  handleGlobalSearch(e) {
    const q = (e.target.value || '').toLowerCase().trim();
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this._runSearch(q), 250);
  },

  _runSearch(q) {
    if (!q) {
      if (this.activeView === 'dasbor') {
        this.renderDasbor();
      } else if (this.activeView === 'produk') {
        this.renderProduk();
      }
      return;
    }

    if (this.activeView === 'dasbor') {
      const products = window.taniStore.getProducts();
      const filtered = products.filter(p => p.name.toLowerCase().includes(q));
      const listEl = document.getElementById('dash-recent-products-list');
      if (listEl) {
        if (filtered.length === 0) {
          listEl.innerHTML = '<div class="empty-state-text">Produk tidak ditemukan.</div>';
        } else {
          listEl.innerHTML = filtered.map(p => `
            <div class="activity-item">
              <div class="activity-item-name">
                ${p.image ? `<img src="${p.image}" class="activity-item-thumb" alt="${p.name}" onerror="this.style.display='none'">` : ''}
                <span style="font-weight: 500;">${p.name}</span>
              </div>
              <div class="activity-item-price">${window.taniStore.formatRupiah(p.price)}</div>
            </div>
          `).join('');
        }
      }
    } else {
      if (this.activeView !== 'produk') {
        this.switchView('produk');
      }
      const products = window.taniStore.getProducts();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.shelfLocation && p.shelfLocation.toLowerCase().includes(q))
      );
      const categories = window.taniStore.getCategories();
      const tbody = document.getElementById('table-produk-tbody');
      if (tbody) {
        if (filtered.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color: #8BA498;">Tidak ada produk yang cocok dengan pencarian.</td></tr>';
        } else {
          tbody.innerHTML = filtered.map(p => {
            const cat = categories.find(c => c.id === p.categoryId);
            let stockBadge = '<span class="stock-badge-safe">Aman</span>';
            if (p.stock === 0) stockBadge = '<span class="stock-badge-empty">Habis</span>';
            else if (p.stock <= (p.minStockWarning || 20)) stockBadge = '<span class="stock-badge-low">Menipis</span>';

            return `
              <tr>
                <td>
                  <img src="${p.image}" class="table-thumb" alt="${p.name}">
                </td>
                <td>
                  <div style="font-weight:600; max-width:280px;">${p.name}</div>
                  <div style="font-size:11px; color:#8BA498;">ID: ${p.id} | Rak: ${p.shelfLocation || '-'}</div>
                </td>
                <td><span class="badge badge-green">${cat ? cat.name : '-'}</span></td>
                <td>
                  <div><strong>${window.taniStore.formatRupiah(p.price)}</strong></div>
                  <div style="font-size:11px; color:#8BA498;">Satuan: ${p.unit}</div>
                </td>
                <td>
                  <strong>${p.stock}</strong> (${stockBadge})
                </td>
                <td>${p.soldCount} terjual</td>
                <td>
                  <div style="display:flex; gap:6px;">
                    <button class="btn btn-secondary btn-sm" onclick="AdminApp.openEditProductModal('${p.id}')">Edit</button>
                    <button class="btn btn-secondary btn-sm" style="color:#F87171;" onclick="AdminApp.deleteProductConfirm('${p.id}')">Hapus</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }
    }
  },

  // ==========================================
  // 1. DASBOR
  // ==========================================
  renderDasbor() {
    const orders = window.taniStore.getOrders();
    const products = window.taniStore.getProducts();

    // 4 KPI Metrics sesuai gambar referensi
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const elProducts = document.getElementById('dash-metric-products');
    const elStock = document.getElementById('dash-metric-stock');
    const elOrders = document.getElementById('dash-metric-orders');
    const elSales = document.getElementById('dash-metric-sales');

    if (elProducts) elProducts.textContent = totalProducts;
    if (elStock) elStock.textContent = totalStock;
    if (elOrders) elOrders.textContent = totalOrders;
    if (elSales) elSales.textContent = window.taniStore.formatRupiah(totalRevenue);

    // Kompatibilitas dengan elemen omzet lama bila ada
    const oldOmzet = document.getElementById('dash-metric-omzet');
    if (oldOmzet) oldOmzet.textContent = window.taniStore.formatRupiah(totalRevenue);

    // Kolom 1: Produk Terbaru
    const dashRecentProducts = document.getElementById('dash-recent-products-list');
    if (dashRecentProducts) {
      dashRecentProducts.innerHTML = products.slice(0, 5).map(p => `
        <div class="activity-item">
          <div class="activity-item-name">
            ${p.image ? `<img src="${p.image}" class="activity-item-thumb" alt="${p.name}" onerror="this.style.display='none'">` : ''}
            <span style="font-weight: 500;">${p.name}</span>
          </div>
          <div class="activity-item-price">${window.taniStore.formatRupiah(p.price)}</div>
        </div>
      `).join('');
    }

    // Kolom 2: Pesanan Terbaru
    const dashRecentOrders = document.getElementById('dash-recent-orders-list');
    if (dashRecentOrders) {
      if (orders.length === 0) {
        dashRecentOrders.innerHTML = '<div class="empty-state-text">Belum ada pesanan.</div>';
      } else {
        dashRecentOrders.innerHTML = orders.slice(0, 5).map(o => `
          <div class="activity-item">
            <div class="activity-item-name">
              <span style="font-weight: 600;">${o.id}</span>
              <span style="color: #8BA498; font-size: 12px; margin-left: 6px;">${o.customerName}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${o.status === 'Selesai' ? 'badge-green' : 'badge-orange'}">${o.status}</span>
              <span class="activity-item-price">${window.taniStore.formatRupiah(o.total)}</span>
            </div>
          </div>
        `).join('');
      }
    }
  },

  // ==========================================
  // 2. PELANGGAN & MEMBER
  // ==========================================
  renderPelanggan() {
    const customers = window.taniStore.getCustomers();
    const settings = window.taniStore.getMemberSettings();
    const tbody = document.getElementById('table-pelanggan-tbody');
    if (!tbody) return;

    tbody.innerHTML = customers.map(c => {
      const tierInfo = window.taniStore.getTierInfo(c.tier || 'silver');
      const periodSpend = window.taniStore.calculateCustomerPeriodSpend(c.id, settings.evaluationPeriodDays);

      return `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>
            <div style="font-weight:600;">${c.name}</div>
            <div style="font-size:11px; color:#8BA498;">${c.kelompokTani || 'Petani Mandiri'}</div>
          </td>
          <td>
            <span class="member-tier-pill tier-${tierInfo.key}">${tierInfo.badge} ${tierInfo.name}</span>
          </td>
          <td>
            <strong style="color:#34D399;">${(c.points || 0).toLocaleString('id-ID')} Poin</strong>
          </td>
          <td>${window.taniStore.formatRupiah(c.totalSpent || 0)}</td>
          <td>
            <strong style="color:#ECFDF5;">${window.taniStore.formatRupiah(periodSpend)}</strong>
            <div style="font-size:10px; color:#5E7D6F;">Periode ${settings.evaluationPeriodDays} Hari</div>
          </td>
          <td>${c.phone}</td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.openEditMemberModal('${c.id}')" title="Ubah level member dan saldo poin">
                Kelola Member
              </button>
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.editCustomerModal('${c.id}')">
                Edit Profil
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  runPeriodicEvaluation() {
    const results = window.taniStore.evaluateAllCustomers();
    const changed = results.filter(r => r.isChanged);
    const upgraded = results.filter(r => r.isUpgraded);
    this.invalidateAllViews();
    this.renderPelanggan();
    TaniAuth.showToast(`Evaluasi berkala selesai! Total ${results.length} pelanggan dievaluasi, ${upgraded.length} naik level, total ${changed.length} penyesuaian tier.`, 'success');
  },

  toggleMemberSettingsCard() {
    const card = document.getElementById('admin-member-settings-card');
    if (!card) return;
    const isHidden = card.style.display === 'none' || !card.style.display;
    if (isHidden) {
      card.style.display = 'block';
      this.renderMemberSettingsForm();
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      card.style.display = 'none';
    }
  },

  renderMemberSettingsForm() {
    const settings = window.taniStore.getMemberSettings();
    const products = window.taniStore.getProducts();

    const gSpend = document.getElementById('setting-gold-min-spend');
    const pSpend = document.getElementById('setting-platinum-min-spend');
    const eDays = document.getElementById('setting-eval-days');
    const gDisc = document.getElementById('setting-gold-disc');
    const pDisc = document.getElementById('setting-platinum-disc');
    const mCap = document.getElementById('setting-max-disc-cap');
    const pSilver = document.getElementById('setting-point-mult-silver');
    const pGold = document.getElementById('setting-point-mult-gold');
    const pPlat = document.getElementById('setting-point-mult-platinum');
    const fSpend = document.getElementById('setting-free-min-spend');
    const fProd = document.getElementById('setting-free-product-id');

    if (gSpend) gSpend.value = settings.goldMinSpend;
    if (pSpend) pSpend.value = settings.platinumMinSpend;
    if (eDays) eDays.value = settings.evaluationPeriodDays;
    if (gDisc) gDisc.value = settings.goldDiscountPercent;
    if (pDisc) pDisc.value = settings.platinumDiscountPercent;
    if (mCap) mCap.value = settings.maxDiscountCap;
    if (pSilver) pSilver.value = settings.pointsMultiplierSilver;
    if (pGold) pGold.value = settings.pointsMultiplierGold;
    if (pPlat) pPlat.value = settings.pointsMultiplierPlatinum;
    if (fSpend) fSpend.value = settings.freeProductMinSpend;

    if (fProd) {
      fProd.innerHTML = products.map(p => `
        <option value="${p.id}" ${p.id === settings.freeProductId ? 'selected' : ''}>
          ${p.name} - Normal: ${window.taniStore.formatRupiah(p.price)}
        </option>
      `).join('');
    }
  },

  saveMemberSettingsForm(event) {
    if (event && event.preventDefault) event.preventDefault();

    const updated = {
      goldMinSpend: Number(document.getElementById('setting-gold-min-spend').value) || 1500000,
      platinumMinSpend: Number(document.getElementById('setting-platinum-min-spend').value) || 5000000,
      evaluationPeriodDays: Number(document.getElementById('setting-eval-days').value) || 90,
      goldDiscountPercent: parseFloat(document.getElementById('setting-gold-disc').value) || 5,
      platinumDiscountPercent: parseFloat(document.getElementById('setting-platinum-disc').value) || 10,
      maxDiscountCap: Number(document.getElementById('setting-max-disc-cap').value) || 150000,
      pointsMultiplierSilver: parseFloat(document.getElementById('setting-point-mult-silver').value) || 1.0,
      pointsMultiplierGold: parseFloat(document.getElementById('setting-point-mult-gold').value) || 1.5,
      pointsMultiplierPlatinum: parseFloat(document.getElementById('setting-point-mult-platinum').value) || 2.0,
      freeProductMinSpend: Number(document.getElementById('setting-free-min-spend').value) || 500000,
      freeProductId: document.getElementById('setting-free-product-id').value,
      freeProductQty: 1
    };

    window.taniStore.saveMemberSettings(updated);
    TaniAuth.showToast('Aturan level member & benefit berhasil diperbarui!', 'success');
    this.invalidateAllViews();
    this.renderPelanggan();
  },

  resetMemberSettingsDefault() {
    if (confirm('Kembalikan aturan level member ke pengaturan bawaan awal?')) {
      window.taniStore.saveMemberSettings(SEED_DATA.memberSettings);
      this.renderMemberSettingsForm();
      this.invalidateAllViews();
      this.renderPelanggan();
      TaniAuth.showToast('Pengaturan aturan member telah direset ke default', 'info');
    }
  },

  openEditMemberModal(custId) {
    const cust = window.taniStore.getCustomerById(custId);
    if (!cust) return;

    const modal = document.getElementById('modal-edit-member');
    if (!modal) return;

    document.getElementById('edit-member-cust-id').value = cust.id;
    document.getElementById('edit-member-cust-name').textContent = `${cust.name} (${cust.id})`;
    document.getElementById('edit-member-total-spent').textContent = window.taniStore.formatRupiah(cust.totalSpent || 0);

    const select = document.getElementById('edit-member-tier-select');
    if (select) select.value = cust.tier || 'silver';

    const pointsInput = document.getElementById('edit-member-points-input');
    if (pointsInput) pointsInput.value = cust.points || 0;

    const notes = document.getElementById('edit-member-notes');
    if (notes) notes.value = '';

    modal.classList.add('active');
  },

  saveEditMember() {
    const custId = document.getElementById('edit-member-cust-id').value;
    const cust = window.taniStore.getCustomerById(custId);
    if (!cust) return;

    const newTier = document.getElementById('edit-member-tier-select').value;
    const newPoints = parseInt(document.getElementById('edit-member-points-input').value) || 0;

    cust.tier = newTier;
    cust.points = newPoints;
    cust.lastManualEdit = window.taniStore.getCurrentDateTime();

    window.taniStore.saveCustomer(cust);

    // If active session belongs to this customer, update session as well
    const auth = window.taniStore.getAuth();
    if (auth && auth.id === cust.id) {
      auth.tier = newTier;
      auth.points = newPoints;
      window.taniStore.setAuth(auth);
    }

    this.closeAllModals();
    TaniAuth.showToast(`Level & Poin ${cust.name} berhasil diperbarui menjadi ${newTier.toUpperCase()}!`, 'success');
    this.invalidateAllViews();
    this.renderPelanggan();
  },

  openAddCustomerModal() {
    const modal = document.getElementById('modal-add-customer');
    if (!modal) return;
    document.getElementById('form-customer-id').value = '';
    document.getElementById('form-customer-name').value = '';
    document.getElementById('form-customer-phone').value = '';
    document.getElementById('form-customer-poktan').value = '';
    document.getElementById('form-customer-address').value = '';
    document.getElementById('form-customer-lahan').value = '';
    document.getElementById('form-customer-komoditas').value = '';
    modal.classList.add('active');
  },

  editCustomerModal(id) {
    const cust = window.taniStore.getCustomerById(id);
    if (!cust) return;

    const modal = document.getElementById('modal-add-customer');
    if (!modal) return;

    document.getElementById('form-customer-id').value = cust.id;
    document.getElementById('form-customer-name').value = cust.name;
    document.getElementById('form-customer-phone').value = cust.phone;
    document.getElementById('form-customer-poktan').value = cust.kelompokTani || '';
    document.getElementById('form-customer-address').value = cust.address || '';
    document.getElementById('form-customer-lahan').value = cust.lahanHa || 1;
    document.getElementById('form-customer-komoditas').value = cust.komoditasUtama || '';
    modal.classList.add('active');
  },

  saveCustomerForm() {
    const id = document.getElementById('form-customer-id').value || ('CST-' + Math.floor(100 + Math.random() * 900));
    const name = document.getElementById('form-customer-name').value.trim();
    const phone = document.getElementById('form-customer-phone').value.trim();

    if (!name || !phone) {
      TaniAuth.showToast('Nama dan No. HP wajib diisi', 'error');
      return;
    }

    const customer = {
      id: id,
      name: name,
      phone: phone,
      kelompokTani: document.getElementById('form-customer-poktan').value.trim(),
      address: document.getElementById('form-customer-address').value.trim(),
      lahanHa: parseFloat(document.getElementById('form-customer-lahan').value) || 1,
      komoditasUtama: document.getElementById('form-customer-komoditas').value.trim(),
      status: 'Aktif'
    };

    window.taniStore.saveCustomer(customer);
    this.closeAllModals();
    TaniAuth.showToast('Data pelanggan tani berhasil disimpan', 'success');
    this.invalidateAllViews();
    this.renderPelanggan();
  },

  // ==========================================
  // 3. PRODUK
  // ==========================================
  renderProduk() {
    const products = window.taniStore.getProducts();
    const categories = window.taniStore.getCategories();
    const tbody = document.getElementById('table-produk-tbody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => {
      const cat = categories.find(c => c.id === p.categoryId);
      let stockBadge = '<span class="stock-badge-safe">Aman</span>';
      if (p.stock === 0) stockBadge = '<span class="stock-badge-empty">Habis</span>';
      else if (p.stock <= (p.minStockWarning || 20)) stockBadge = '<span class="stock-badge-low">Menipis</span>';

      return `
        <tr>
          <td>
            <img src="${p.image}" class="table-thumb" alt="${p.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\' viewBox=\'0 0 60 60\'><rect width=\'60\' height=\'60\' fill=\'%232E7D32\'/><text x=\'50%\' y=\'50%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-family=\'sans-serif\' font-size=\'10\' font-weight=\'bold\'>Tani</text></svg>'">
          </td>
          <td>
            <div style="font-weight:600; max-width:280px;">${p.name}</div>
            <div style="font-size:11px; color:#6B7280;">ID: ${p.id} | Rak: ${p.shelfLocation || '-'}</div>
          </td>
          <td><span class="badge badge-gray">${cat ? cat.name : '-'}</span></td>
          <td>
            <div><strong>${window.taniStore.formatRupiah(p.price)}</strong></div>
            <div style="font-size:11px; color:#6B7280;">Satuan: ${p.unit}</div>
          </td>
          <td>
            <strong>${p.stock}</strong> (${stockBadge})
          </td>
          <td>${p.soldCount} terjual</td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.openEditProductModal('${p.id}')">Edit</button>
              <button class="btn btn-secondary btn-sm" style="color:#DC2626;" onclick="AdminApp.deleteProductConfirm('${p.id}')">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddProductModal() {
    const modal = document.getElementById('modal-add-product');
    if (!modal) return;

    document.getElementById('product-modal-title').textContent = 'Tambah Produk Sarana Tani Baru';
    document.getElementById('form-product-id').value = '';
    document.getElementById('form-product-name').value = '';
    document.getElementById('form-product-price').value = '';
    document.getElementById('form-product-original-price').value = '';
    document.getElementById('form-product-stock').value = '';
    document.getElementById('form-product-unit').value = '';
    document.getElementById('form-product-weight').value = '1000';
    document.getElementById('form-product-shelf').value = '';
    document.getElementById('form-product-active-ing').value = '';
    document.getElementById('form-product-desc').value = '';
    document.getElementById('form-product-image').value = '';
    const fileInput = document.getElementById('form-product-image-file');
    if (fileInput) fileInput.value = '';
    const fileLabel = document.getElementById('form-product-image-filename');
    if (fileLabel) fileLabel.textContent = 'Belum ada file dipilih';
    const previewImg = document.getElementById('form-product-image-preview');
    if (previewImg) { previewImg.src = ''; previewImg.style.display = 'none'; }

    // Member price and tier eligibility fields
    const memberPriceInput = document.getElementById('form-product-member-price');
    if (memberPriceInput) memberPriceInput.value = '';
    const tierEligibleCheck = document.getElementById('form-product-tier-eligible');
    if (tierEligibleCheck) tierEligibleCheck.checked = true;

    // Populate category dropdown
    const catSelect = document.getElementById('form-product-cat');
    const categories = window.taniStore.getCategories();
    catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    modal.classList.add('active');
  },

  openEditProductModal(id) {
    const p = window.taniStore.getProductById(id);
    if (!p) return;

    const modal = document.getElementById('modal-add-product');
    if (!modal) return;

    document.getElementById('product-modal-title').textContent = 'Edit Data Produk Pertanian';
    document.getElementById('form-product-id').value = p.id;
    document.getElementById('form-product-name').value = p.name;
    document.getElementById('form-product-price').value = p.price;
    document.getElementById('form-product-original-price').value = p.originalPrice || '';
    document.getElementById('form-product-stock').value = p.stock;
    document.getElementById('form-product-unit').value = p.unit;
    document.getElementById('form-product-weight').value = p.weightGram || 1000;
    document.getElementById('form-product-shelf').value = p.shelfLocation || '';
    document.getElementById('form-product-active-ing').value = p.activeIngredient || '';
    document.getElementById('form-product-desc').value = p.description || '';
    document.getElementById('form-product-image').value = p.image || '';

    const memberPriceInput = document.getElementById('form-product-member-price');
    if (memberPriceInput) memberPriceInput.value = p.memberPrice || '';
    const tierEligibleCheck = document.getElementById('form-product-tier-eligible');
    if (tierEligibleCheck) tierEligibleCheck.checked = p.eligibleForTierDiscount !== false;

    const fileInput2 = document.getElementById('form-product-image-file');
    if (fileInput2) fileInput2.value = '';
    const fileLabel2 = document.getElementById('form-product-image-filename');
    if (fileLabel2) fileLabel2.textContent = 'Belum ada file dipilih';
    const previewImg2 = document.getElementById('form-product-image-preview');
    if (previewImg2) {
      if (p.image) { previewImg2.src = p.image; previewImg2.style.display = 'block'; }
      else { previewImg2.src = ''; previewImg2.style.display = 'none'; }
    }

    const catSelect = document.getElementById('form-product-cat');
    const categories = window.taniStore.getCategories();
    catSelect.innerHTML = categories.map(c => `
      <option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${c.name}</option>
    `).join('');

    modal.classList.add('active');
  },

  handleProductImageFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      TaniAuth.showToast('File yang dipilih harus berupa gambar', 'error');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('form-product-image').value = e.target.result;
      const fileLabel = document.getElementById('form-product-image-filename');
      if (fileLabel) fileLabel.textContent = file.name;
      const previewImg = document.getElementById('form-product-image-preview');
      if (previewImg) { previewImg.src = e.target.result; previewImg.style.display = 'block'; }
      TaniAuth.showToast(`Gambar "${file.name}" berhasil dimuat`, 'success');
    };
    reader.onerror = () => {
      TaniAuth.showToast('Gagal membaca file gambar', 'error');
    };
    reader.readAsDataURL(file);
  },

  saveProductForm() {
    const id = document.getElementById('form-product-id').value || ('PRD-' + Math.floor(100 + Math.random() * 900));
    const name = document.getElementById('form-product-name').value.trim();
    const price = Number(document.getElementById('form-product-price').value);
    const stock = Number(document.getElementById('form-product-stock').value);

    if (!name || isNaN(price) || isNaN(stock)) {
      TaniAuth.showToast('Nama produk, harga, dan stok wajib diisi secara valid', 'error');
      return;
    }

    const memberPriceInput = document.getElementById('form-product-member-price');
    const memberPriceVal = memberPriceInput ? Number(memberPriceInput.value) : null;
    const tierEligibleCheck = document.getElementById('form-product-tier-eligible');

    const defaultImg = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80';
    const product = {
      id: id,
      name: name,
      categoryId: document.getElementById('form-product-cat').value,
      price: price,
      originalPrice: Number(document.getElementById('form-product-original-price').value) || null,
      memberPrice: (!isNaN(memberPriceVal) && memberPriceVal > 0) ? memberPriceVal : null,
      eligibleForTierDiscount: tierEligibleCheck ? tierEligibleCheck.checked : true,
      stock: stock,
      unit: document.getElementById('form-product-unit').value.trim() || 'Unit',
      minStockWarning: 20,
      soldCount: 0,
      rating: 5.0,
      reviewCount: 0,
      badge: 'Mitra Tani',
      location: 'Gudang Pusat Tani.SM',
      image: document.getElementById('form-product-image').value.trim() || defaultImg,
      activeIngredient: document.getElementById('form-product-active-ing').value.trim(),
      weightGram: Number(document.getElementById('form-product-weight').value) || 1000,
      shelfLocation: document.getElementById('form-product-shelf').value.trim() || 'Rak A-01',
      description: document.getElementById('form-product-desc').value.trim() || 'Spesifikasi produk resmi Tani.SM'
    };

    window.taniStore.saveProduct(product);
    this.closeAllModals();
    TaniAuth.showToast(`Produk "${product.name}" berhasil disimpan ke sistem inventaris`, 'success');
    this.invalidateAllViews();
    this.renderProduk();
    this.renderStok();
  },

  deleteProductConfirm(id) {
    if (confirm('Yakin ingin menghapus produk ini dari master data gudang?')) {
      window.taniStore.deleteProduct(id);
      TaniAuth.showToast('Produk telah dihapus', 'info');
      this.invalidateAllViews();
      this.renderProduk();
      this.renderStok();
    }
  },

  // ==========================================
  // 4. KATEGORI
  // ==========================================
  renderKategori() {
    const categories = window.taniStore.getCategories();
    const products = window.taniStore.getProducts();
    const tbody = document.getElementById('table-kategori-tbody');
    if (!tbody) return;

    tbody.innerHTML = categories.map(c => {
      const prodCount = products.filter(p => p.categoryId === c.id).length;
      return `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td><strong style="color:#2E7D32;">${c.name}</strong></td>
          <td>${c.desc}</td>
          <td><strong>${prodCount}</strong> Produk</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.editKategoriModal('${c.id}')">Edit</button>
            <button class="btn btn-secondary btn-sm" style="color:#DC2626;" onclick="AdminApp.deleteKategoriConfirm('${c.id}')">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddKategoriModal() {
    const modal = document.getElementById('modal-add-kategori');
    if (!modal) return;
    document.getElementById('form-kategori-id').value = '';
    document.getElementById('form-kategori-name').value = '';
    document.getElementById('form-kategori-desc').value = '';
    modal.classList.add('active');
  },

  editKategoriModal(id) {
    const cat = window.taniStore.getCategories().find(c => c.id === id);
    if (!cat) return;

    const modal = document.getElementById('modal-add-kategori');
    if (!modal) return;
    document.getElementById('form-kategori-id').value = cat.id;
    document.getElementById('form-kategori-name').value = cat.name;
    document.getElementById('form-kategori-desc').value = cat.desc;
    modal.classList.add('active');
  },

  saveKategoriForm() {
    const id = document.getElementById('form-kategori-id').value || ('cat-' + Date.now());
    const name = document.getElementById('form-kategori-name').value.trim();
    const desc = document.getElementById('form-kategori-desc').value.trim();

    if (!name) {
      TaniAuth.showToast('Nama kategori wajib diisi', 'error');
      return;
    }

    const cat = { id, name, slug: name.toLowerCase().replace(/\s+/g, '-'), desc };
    window.taniStore.saveCategory(cat);
    this.closeAllModals();
    TaniAuth.showToast('Kategori berhasil disimpan', 'success');
    this.invalidateView('kategori');
    this.invalidateView('produk');
    this.renderKategori();
  },

  deleteKategoriConfirm(id) {
    if (confirm('Hapus kategori ini?')) {
      window.taniStore.deleteCategory(id);
      TaniAuth.showToast('Kategori telah dihapus', 'info');
      this.invalidateView('kategori');
      this.renderKategori();
    }
  },

  // ==========================================
  // 5. STOK GUDANG
  // ==========================================
  renderStok() {
    const products = window.taniStore.getProducts();
    const stockLogs = window.taniStore.getStockLogs();

    // Table of current stocks
    const tbody = document.getElementById('table-stok-tbody');
    if (tbody) {
      tbody.innerHTML = products.map(p => {
        let statusBadge = '<span class="stock-badge-safe">Stok Cukup</span>';
        if (p.stock === 0) statusBadge = '<span class="stock-badge-empty">Kosong / Kritis</span>';
        else if (p.stock <= (p.minStockWarning || 20)) statusBadge = '<span class="stock-badge-low">Perlu Restok Segera</span>';

        return `
          <tr>
            <td><strong>${p.id}</strong></td>
            <td><strong>${p.name}</strong></td>
            <td><span class="badge badge-gray">${p.shelfLocation || 'Gudang Utama'}</span></td>
            <td><strong>${p.stock}</strong> ${p.unit.split(' ')[0]}</td>
            <td>Min: ${p.minStockWarning || 20}</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.openStockAdjustModal('${p.id}')">Sesuaikan / Mutasi</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Table of stock audit logs
    const logTbody = document.getElementById('table-stok-logs-tbody');
    if (logTbody) {
      logTbody.innerHTML = stockLogs.slice(0, 10).map(l => `
        <tr>
          <td>${l.date}</td>
          <td><strong>${l.productName}</strong></td>
          <td><span class="badge ${l.type === 'Masuk' ? 'badge-green' : (l.type === 'Keluar' ? 'badge-orange' : 'badge-blue')}">${l.type}</span></td>
          <td>${l.qty}</td>
          <td><strong>${l.balance}</strong></td>
          <td>${l.note}</td>
        </tr>
      `).join('');
    }
  },

  openStockAdjustModal(productId) {
    const p = window.taniStore.getProductById(productId);
    if (!p) return;

    const modal = document.getElementById('modal-stock-adjust');
    if (!modal) return;

    document.getElementById('stock-adjust-prod-id').value = p.id;
    document.getElementById('stock-adjust-prod-name').textContent = p.name;
    document.getElementById('stock-adjust-current').textContent = `${p.stock} ${p.unit}`;
    document.getElementById('stock-adjust-qty').value = '';
    document.getElementById('stock-adjust-note').value = '';

    modal.classList.add('active');
  },

  submitStockAdjust() {
    const prodId = document.getElementById('stock-adjust-prod-id').value;
    const type = document.getElementById('stock-adjust-type').value; // 'Masuk' or 'Keluar'
    const qty = parseInt(document.getElementById('stock-adjust-qty').value) || 0;
    const note = document.getElementById('stock-adjust-note').value.trim();

    if (qty <= 0) {
      TaniAuth.showToast('Jumlah perubahan stok harus lebih dari 0', 'error');
      return;
    }

    const delta = type === 'Masuk' ? qty : -qty;
    window.taniStore.updateProductStock(prodId, delta, type, note || `Mutasi ${type} oleh Admin Gudang`);

    this.closeAllModals();
    TaniAuth.showToast(`Stok berhasil disesuaikan (${delta > 0 ? '+' : ''}${delta})`, 'success');
    this.invalidateView('stok');
    this.invalidateView('dasbor');
    this.invalidateView('produk');
    this.renderStok();
    this.renderDasbor();
  },

  // ==========================================
  // 6. PEMESANAN (ORDERS)
  // ==========================================
  renderPemesanan() {
    const orders = window.taniStore.getOrders();
    const tbody = document.getElementById('table-pemesanan-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>
          <div style="font-weight:600;">${o.customerName}</div>
          <div style="font-size:11px; color:#6B7280;">${o.phone}</div>
        </td>
        <td>${o.date}</td>
        <td><strong>${window.taniStore.formatRupiah(o.total)}</strong></td>
        <td><span class="badge ${o.paymentStatus === 'Lunas' ? 'badge-green' : 'badge-orange'}">${o.paymentStatus}</span></td>
        <td><span class="badge ${o.status === 'Selesai' ? 'badge-green' : 'badge-blue'}">${o.status}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewOrderInvoice('${o.id}')">Detail</button>
            <button class="btn btn-primary btn-sm" onclick="AdminApp.openOrderStatusModal('${o.id}')">Update Status</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openOrderStatusModal(orderId) {
    const order = window.taniStore.getOrderById(orderId);
    if (!order) return;

    const modal = document.getElementById('modal-order-status');
    if (!modal) return;

    document.getElementById('order-status-id').value = order.id;
    document.getElementById('order-status-display').textContent = `${order.id} - ${order.customerName}`;
    document.getElementById('order-status-select').value = order.status;
    document.getElementById('order-status-note').value = '';

    modal.classList.add('active');
  },

  saveOrderStatus() {
    const orderId = document.getElementById('order-status-id').value;
    const newStatus = document.getElementById('order-status-select').value;
    const note = document.getElementById('order-status-note').value.trim();

    window.taniStore.updateOrderStatus(orderId, newStatus, note || `Status diperbarui menjadi ${newStatus}`);
    this.closeAllModals();
    TaniAuth.showToast(`Status pesanan ${orderId} berhasil diubah ke ${newStatus}`, 'success');
    this.invalidateView('pemesanan');
    this.invalidateView('dasbor');
    this.invalidateView('pengiriman');
    this.renderPemesanan();
    this.renderDasbor();
  },

  viewOrderInvoice(orderId) {
    const order = window.taniStore.getOrderById(orderId);
    if (!order) return;

    this.currentInvoiceOrderId = order.id;
    const modal = document.getElementById('modal-invoice');
    if (!modal) return;

    const content = document.getElementById('modal-invoice-content');
    content.innerHTML = `
      <div class="print-document" style="border:none; box-shadow:none; padding:10px;">
        <div class="report-header-kop">
          <div class="kop-left">
            <h2>Tani.SM Warehouse Distribution Hub</h2>
            <p>Pusat Distribusi Saprotan & Kargo Hasil Bumi Nasional<br>
            Jl. Raya Pertanian Km. 14, Delanggu, Klaten, Jawa Tengah | Telp: (0272) 883-9901</p>
          </div>
          <div class="kop-right">
            <strong>SURAT JALAN & INVOICE</strong><br>
            No: ${order.id}<br>
            Tanggal: ${order.date}
          </div>
        </div>

        <div class="report-meta-box">
          <div>
            <strong>Tujuan Pengiriman:</strong><br>
            ${order.customerName} (${order.phone})<br>
            ${order.shippingAddress}
          </div>
          <div>
            <strong>Informasi Logistik:</strong><br>
            Kurir: ${order.courier}<br>
            No. Resi: <strong>${order.trackingNo}</strong><br>
            Status Bayar: <strong>${order.paymentStatus}</strong> (${order.paymentMethod})
          </div>
        </div>

        <table class="print-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama Komoditas / Sarana Pertanian</th>
              <th class="text-center">Kuantitas</th>
              <th class="text-right">Harga Satuan</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td><strong>${item.name}</strong> (${item.unit}) ${item.isFreeGift ? '<span class="badge" style="background:#0284C7; color:#FFF; font-size:10px;">🎁 Bonus Platinum</span>' : ''}</td>
                <td class="text-center">${item.qty}</td>
                <td class="text-right">${item.price > 0 ? window.taniStore.formatRupiah(item.price) : 'Rp 0'}</td>
                <td class="text-right">${item.price > 0 ? window.taniStore.formatRupiah(item.price * item.qty) : 'Gratis Rp0'}</td>
              </tr>
            `).join('')}
            <tr>
              <td colspan="4" class="text-right"><strong>Subtotal Barang:</strong></td>
              <td class="text-right">${window.taniStore.formatRupiah(order.subtotal || order.total)}</td>
            </tr>
            <tr>
              <td colspan="4" class="text-right"><strong>Ongkos Kargo Pengiriman:</strong></td>
              <td class="text-right">${window.taniStore.formatRupiah(order.shippingCost || 0)}</td>
            </tr>
            ${order.discount ? `
              <tr>
                <td colspan="4" class="text-right"><strong>Potongan Kupon Subsidi:</strong></td>
                <td class="text-right" style="color:#DC2626;">- ${window.taniStore.formatRupiah(order.discount)}</td>
              </tr>
            ` : ''}
            ${order.tierDiscount ? `
              <tr>
                <td colspan="4" class="text-right"><strong>Diskon Member ${order.memberTier ? order.memberTier.toUpperCase() : ''}:</strong></td>
                <td class="text-right" style="color:#10B981;">- ${window.taniStore.formatRupiah(order.tierDiscount)}</td>
              </tr>
            ` : ''}
            <tr style="background:#F9FAFB; font-weight:700;">
              <td colspan="4" class="text-right">TOTAL TAGIHAN:</td>
              <td class="text-right" style="color:var(--primary-orange); font-size:14px;">${window.taniStore.formatRupiah(order.total)}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size:11px; color:#4B5563; margin-bottom:20px;">
          <em>Catatan Gudang: ${order.warehouseNotes || 'Pastikan kemasan tidak rusak dan segel pabrik utuh saat serah terima.'}</em>
        </div>

        <div class="report-signatures">
          <div class="sign-col">
            Petugas Gudang Pengirim,
            <div class="sign-line">Joko Purnomo</div>
            Staff Logistik
          </div>
          <div class="sign-col">
            Penerima / Petani,
            <div class="sign-line">${order.customerName}</div>
            Kelompok Tani
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  trackOrderFromInvoice() {
    this.closeAllModals();
    if (this.currentInvoiceOrderId) {
      this.switchView('pengiriman');
      this.openUpdateResiModal(this.currentInvoiceOrderId);
      TaniAuth.showToast(`Membuka pengiriman & logistik untuk pesanan ${this.currentInvoiceOrderId}`, 'info');
    }
  },

  // ==========================================
  // 7. PEMBAYARAN
  // ==========================================
  renderPembayaran() {
    const orders = window.taniStore.getOrders();
    const tbody = document.getElementById('table-pembayaran-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customerName}</td>
        <td>${o.paymentMethod}</td>
        <td><strong>${window.taniStore.formatRupiah(o.total)}</strong></td>
        <td><span class="badge ${o.paymentStatus === 'Lunas' ? 'badge-green' : 'badge-orange'}">${o.paymentStatus}</span></td>
        <td>
          ${o.paymentStatus !== 'Lunas' ? `
            <button class="btn btn-green btn-sm" onclick="AdminApp.verifyPaymentConfirm('${o.id}')">Verifikasi Lunas</button>
          ` : `
            <span style="color:#10B981; font-size:12px; font-weight:600;">✓ Terverifikasi</span>
          `}
        </td>
      </tr>
    `).join('');
  },

  verifyPaymentConfirm(orderId) {
    if (confirm(`Verifikasi pembayaran pesanan ${orderId} sebagai LUNAS?`)) {
      window.taniStore.updateOrderStatus(orderId, 'Diproses Gudang', 'Pembayaran telah diverifikasi sah oleh Admin Keuangan Gudang.', 'Lunas');
      TaniAuth.showToast(`Pesanan ${orderId} telah diverifikasi Lunas!`, 'success');
      this.invalidateView('pembayaran');
      this.invalidateView('pemesanan');
      this.invalidateView('dasbor');
      this.renderPembayaran();
      this.renderDasbor();
      this.renderPemesanan();
    }
  },

  // ==========================================
  // 8. PENGIRIMAN
  // ==========================================
  renderPengiriman() {
    const orders = window.taniStore.getOrders();
    const tbody = document.getElementById('table-pengiriman-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customerName}</td>
        <td><span class="badge badge-gray">${o.courier}</span></td>
        <td><strong style="color:#2E7D32;">${o.trackingNo}</strong></td>
        <td><span class="badge ${o.status === 'Selesai' ? 'badge-green' : 'badge-blue'}">${o.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="AdminApp.openUpdateResiModal('${o.id}')">Input Resi / Checkpoint</button>
        </td>
      </tr>
    `).join('');
  },

  openUpdateResiModal(orderId) {
    const order = window.taniStore.getOrderById(orderId);
    if (!order) return;

    const modal = document.getElementById('modal-update-resi');
    if (!modal) return;

    document.getElementById('resi-order-id').value = order.id;
    document.getElementById('resi-order-display').textContent = `${order.id} - ${order.customerName}`;
    document.getElementById('resi-number-input').value = order.trackingNo || '';
    document.getElementById('resi-status-note').value = '';

    modal.classList.add('active');
  },

  saveResiUpdate() {
    const orderId = document.getElementById('resi-order-id').value;
    const trackingNo = document.getElementById('resi-number-input').value.trim();
    const checkpoint = document.getElementById('resi-status-note').value.trim();

    const order = window.taniStore.getOrderById(orderId);
    if (order) {
      if (trackingNo) order.trackingNo = trackingNo;
      if (order.status !== 'Selesai') order.status = 'Dikirim';
      if (!order.trackingHistory) order.trackingHistory = [];
      if (checkpoint) {
        order.trackingHistory.push({
          time: window.taniStore.getCurrentDateTime(),
          text: checkpoint
        });
      }
      window.taniStore.saveOrder(order);
      this.closeAllModals();
      TaniAuth.showToast(`Nomor resi & logistik untuk ${orderId} berhasil diperbarui`, 'success');
      this.invalidateView('pengiriman');
      this.invalidateView('pemesanan');
      this.renderPengiriman();
    }
  },

  // ==========================================
  // 9. KONTEN
  // ==========================================
  renderKonten() {
    const tips = window.taniStore.getTips();
    const tbody = document.getElementById('table-konten-tips-tbody');
    if (!tbody) return;

    tbody.innerHTML = tips.map(t => `
      <tr>
        <td><strong>${t.id}</strong></td>
        <td><strong>${t.title}</strong></td>
        <td><span class="badge badge-green">${t.category}</span></td>
        <td>${t.author}</td>
        <td>${t.date}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="AdminApp.editTipModal('${t.id}')">Edit</button>
          <button class="btn btn-secondary btn-sm" style="color:#DC2626;" onclick="AdminApp.deleteTipConfirm('${t.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  },

  openAddTipModal() {
    const modal = document.getElementById('modal-add-tip');
    if (!modal) return;
    document.getElementById('form-tip-id').value = '';
    document.getElementById('form-tip-title').value = '';
    document.getElementById('form-tip-category').value = 'Budidaya & Agronomi';
    document.getElementById('form-tip-author').value = 'Tim Agronomi Gudang Tani.SM';
    document.getElementById('form-tip-summary').value = '';
    document.getElementById('form-tip-content').value = '';
    modal.classList.add('active');
  },

  editTipModal(id) {
    const tip = window.taniStore.getTipById(id);
    if (!tip) return;

    const modal = document.getElementById('modal-add-tip');
    if (!modal) return;
    document.getElementById('form-tip-id').value = tip.id;
    document.getElementById('form-tip-title').value = tip.title;
    document.getElementById('form-tip-category').value = tip.category;
    document.getElementById('form-tip-author').value = tip.author;
    document.getElementById('form-tip-summary').value = tip.summary;
    document.getElementById('form-tip-content').value = tip.content;
    modal.classList.add('active');
  },

  saveTipForm() {
    const id = document.getElementById('form-tip-id').value || ('tip-' + Date.now());
    const title = document.getElementById('form-tip-title').value.trim();
    const content = document.getElementById('form-tip-content').value.trim();

    if (!title || !content) {
      TaniAuth.showToast('Judul artikel dan isi tips wajib diisi', 'error');
      return;
    }

    const tip = {
      id: id,
      title: title,
      category: document.getElementById('form-tip-category').value,
      author: document.getElementById('form-tip-author').value.trim(),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      readTime: '4 menit baca',
      summary: document.getElementById('form-tip-summary').value.trim(),
      content: content
    };

    window.taniStore.saveTip(tip);
    this.closeAllModals();
    TaniAuth.showToast('Artikel edukasi tips tani berhasil disimpan!', 'success');
    this.invalidateView('konten');
    this.renderKonten();
  },

  deleteTipConfirm(id) {
    if (confirm('Hapus artikel tips ini?')) {
      window.taniStore.deleteTip(id);
      TaniAuth.showToast('Artikel telah dihapus', 'info');
      this.invalidateView('konten');
      this.renderKonten();
    }
  },

  // ==========================================
  // 10. PROMO
  // ==========================================
  renderPromo() {
    const vouchers = window.taniStore.getVouchers();
    const tbody = document.getElementById('table-promo-tbody');
    if (!tbody) return;

    tbody.innerHTML = vouchers.map(v => `
      <tr>
        <td><strong style="color:var(--primary-orange);">${v.code}</strong></td>
        <td>${v.name}</td>
        <td>${v.discountPercent ? `${v.discountPercent}%` : window.taniStore.formatRupiah(v.discountFlat)}</td>
        <td>${window.taniStore.formatRupiah(v.minSpend)}</td>
        <td>${v.used} / ${v.quota}</td>
        <td><span class="badge ${v.active ? 'badge-green' : 'badge-gray'}">${v.active ? 'Aktif' : 'Non-aktif'}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="AdminApp.togglePromoActive('${v.code}')">
            ${v.active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </td>
      </tr>
    `).join('');
  },

  openAddPromoModal() {
    const modal = document.getElementById('modal-add-promo');
    if (!modal) return;
    document.getElementById('form-promo-code').value = '';
    document.getElementById('form-promo-name').value = '';
    document.getElementById('form-promo-disc').value = '10';
    document.getElementById('form-promo-min').value = '100000';
    document.getElementById('form-promo-quota').value = '100';
    modal.classList.add('active');
  },

  savePromoForm() {
    const code = document.getElementById('form-promo-code').value.trim().toUpperCase();
    const name = document.getElementById('form-promo-name').value.trim();
    const disc = parseInt(document.getElementById('form-promo-disc').value) || 10;
    const min = parseInt(document.getElementById('form-promo-min').value) || 50000;
    const quota = parseInt(document.getElementById('form-promo-quota').value) || 50;

    if (!code || !name) {
      TaniAuth.showToast('Kode kupon dan nama promo wajib diisi', 'error');
      return;
    }

    const voucher = {
      code: code,
      name: name,
      discountPercent: disc,
      minSpend: min,
      quota: quota,
      used: 0,
      active: true
    };

    window.taniStore.saveVoucher(voucher);
    this.closeAllModals();
    TaniAuth.showToast(`Kupon diskon ${code} berhasil dibuat!`, 'success');
    this.invalidateView('promo');
    this.renderPromo();
  },

  togglePromoActive(code) {
    const vouchers = window.taniStore.getVouchers();
    const v = vouchers.find(x => x.code === code);
    if (v) {
      v.active = !v.active;
      window.taniStore.saveVoucher(v);
      this.invalidateView('promo');
      this.renderPromo();
    }
  },

  // ==========================================
  // 11. LAPORAN (PASTIKAN BISA DICETAK)
  // ==========================================
  renderLaporan() {
    const reportType = document.getElementById('report-type-select') ? document.getElementById('report-type-select').value : 'sales';
    const period = document.getElementById('report-period-select') ? document.getElementById('report-period-select').value : 'all';

    const orders = window.taniStore.getOrders();
    const products = window.taniStore.getProducts();

    const container = document.getElementById('report-document-container');
    if (!container) return;

    const printDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    if (reportType === 'sales') {
      const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
      const totalItems = orders.reduce((sum, o) => sum + o.items.reduce((isum, item) => isum + item.qty, 0), 0);

      container.innerHTML = `
        <div class="print-document">
          <div class="report-header-kop">
            <div class="kop-left">
              <h2>PT TANI SINERGI MANDIRI (Tani.SM)</h2>
              <p>Sentra Logistik Pergudangan Pertanian & Saprotan Nasional<br>
              NPWP: 81.992.341.2-524.000 | Izin Usaha Perdagangan Kementan No. 2026/TANI-DIST/09<br>
              Alamat Gudang: Kawasan Agro Industri Delanggu, Klaten, Jawa Tengah | Email: logistik@tanism.id</p>
            </div>
            <div class="kop-right">
              <strong>LAPORAN REKAPITULASI PENJUALAN</strong><br>
              Periode: <strong>${period === 'all' ? 'Semua Periode Transaksi' : 'Bulan Berjalan 2026'}</strong><br>
              Dicetak: ${printDate}
            </div>
          </div>

          <div class="report-summary-chips">
            <div class="chip-item">
              <div class="chip-label">Total Omzet Penjualan</div>
              <div class="chip-val" style="color:var(--primary-orange);">${window.taniStore.formatRupiah(totalSales)}</div>
            </div>
            <div class="chip-item">
              <div class="chip-label">Total Volume Transaksi</div>
              <div class="chip-val">${orders.length} Pesanan</div>
            </div>
            <div class="chip-item">
              <div class="chip-label">Komoditas / Saprotan Terjual</div>
              <div class="chip-val">${totalItems} Unit / Karung</div>
            </div>
            <div class="chip-item">
              <div class="chip-label">Status Penyelesaian</div>
              <div class="chip-val" style="color:#10B981;">100% Tercatat</div>
            </div>
          </div>

          <table class="print-table">
            <thead>
              <tr>
                <th style="width:40px;" class="text-center">No</th>
                <th>No. Pesanan</th>
                <th>Tanggal</th>
                <th>Nama Petani / Kelompok Tani</th>
                <th>Rincian Barang</th>
                <th>Metode Bayar</th>
                <th class="text-right">Total Transaksi</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map((o, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${o.id}</strong></td>
                  <td>${o.date}</td>
                  <td>${o.customerName}</td>
                  <td>${o.items.map(i => `${i.name} (${i.qty})`).join(', ')}</td>
                  <td>${o.paymentMethod}</td>
                  <td class="text-right"><strong>${window.taniStore.formatRupiah(o.total)}</strong></td>
                </tr>
              `).join('')}
              <tr style="background:#F3F4F6; font-weight:700;">
                <td colspan="6" class="text-right">TOTAL PENDAPATAN OPERASIONAL:</td>
                <td class="text-right" style="color:var(--primary-orange); font-size:13px;">${window.taniStore.formatRupiah(totalSales)}</td>
              </tr>
            </tbody>
          </table>

          <div class="report-signatures">
            <div class="sign-col">
              Dibuat & Diverifikasi Oleh,
              <div class="sign-line">Joko Purnomo</div>
              Kepala Gudang Tani.SM
            </div>
            <div class="sign-col">
              Mengetahui & Menyetujui,
              <div class="sign-line">Ir. Bambang Trihartono, M.Agr</div>
              Direktur Operasional & Logistik
            </div>
          </div>
        </div>
      `;
    } else {
      // Stock valuation report
      const totalStockValuation = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
      const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);

      container.innerHTML = `
        <div class="print-document">
          <div class="report-header-kop">
            <div class="kop-left">
              <h2>PT TANI SINERGI MANDIRI (Tani.SM)</h2>
              <p>Sentra Logistik Pergudangan Pertanian & Saprotan Nasional<br>
              Sistem Pengawasan Mutu & Inventaris Fisik Gudang</p>
            </div>
            <div class="kop-right">
              <strong>LAPORAN STOCK OPNAME & VALUASI ASET GUDANG</strong><br>
              Posisi Fisik Per: <strong>${printDate}</strong>
            </div>
          </div>

          <div class="report-summary-chips">
            <div class="chip-item">
              <div class="chip-label">Total Nilai Valuasi Stok</div>
              <div class="chip-val" style="color:#2E7D32;">${window.taniStore.formatRupiah(totalStockValuation)}</div>
            </div>
            <div class="chip-item">
              <div class="chip-label">Total Varian Komoditas</div>
              <div class="chip-val">${products.length} SKU Aktif</div>
            </div>
            <div class="chip-item">
              <div class="chip-label">Total Unit Fisik Tersedia</div>
              <div class="chip-val">${totalStockUnits} Satuan</div>
            </div>
            <div class="chip-item">
              <div class="chip-label">Kondisi Fisik</div>
              <div class="chip-val" style="color:#10B981;">Layak Siap Kirim</div>
            </div>
          </div>

          <table class="print-table">
            <thead>
              <tr>
                <th style="width:40px;" class="text-center">No</th>
                <th>ID SKU</th>
                <th>Nama Produk Pertanian</th>
                <th>Lokasi Rak / Palet</th>
                <th class="text-center">Stok Fisik</th>
                <th class="text-right">Harga Satuan</th>
                <th class="text-right">Total Valuasi Nilai</th>
              </tr>
            </thead>
            <tbody>
              ${products.map((p, idx) => `
                <tr>
                  <td class="text-center">${idx + 1}</td>
                  <td><strong>${p.id}</strong></td>
                  <td>${p.name} (${p.unit})</td>
                  <td>${p.shelfLocation || 'Gudang Pusat'}</td>
                  <td class="text-center"><strong>${p.stock}</strong></td>
                  <td class="text-right">${window.taniStore.formatRupiah(p.price)}</td>
                  <td class="text-right"><strong>${window.taniStore.formatRupiah(p.price * p.stock)}</strong></td>
                </tr>
              `).join('')}
              <tr style="background:#F3F4F6; font-weight:700;">
                <td colspan="6" class="text-right">TOTAL NILAI ASET INVENTARIS:</td>
                <td class="text-right" style="color:#2E7D32; font-size:13px;">${window.taniStore.formatRupiah(totalStockValuation)}</td>
              </tr>
            </tbody>
          </table>

          <div class="report-signatures">
            <div class="sign-col">
              Penanggung Jawab Stock Opname,
              <div class="sign-line">Wahyu Triadi</div>
              Supervisor Gudang Fisik
            </div>
            <div class="sign-col">
              Mengetahui,
              <div class="sign-line">Joko Purnomo</div>
              Kepala Gudang Tani.SM
            </div>
          </div>
        </div>
      `;
    }
  },

  printReport() {
    window.print();
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
};

window.AdminApp = AdminApp;
