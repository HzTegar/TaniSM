/**
 * Tani.SM - Admin Gudang Portal Controller
 * Modul: Dasbor, Pelanggan, Manajemen Produk, Barang Masuk, Barang Keluar,
 * Purchase Order (PO), Stock Opname, Pemesanan, Pembayaran,
 * Pengiriman, Promosi & Edukasi, dan Laporan (Siap Cetak).
 */

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});

const AdminApp = {
  activeView: 'dasbor',

  // Periode grafik Masuk/Keluar dashboard; dipersisten ke localStorage.
  _dashPeriod: (function () {
    try { return localStorage.getItem('tani_dash_period') || 'bulanan'; } catch (e) { return 'bulanan'; }
  })(),

  // Peta view -> method renderer (mengganti rangkaian if/if di switchView).
  VIEWS: {
    dasbor: 'renderDasbor',
    pelanggan: 'renderPelanggan',
    produk: 'renderProduk',
    barangmasuk: 'renderBarangMasuk',
    barangkeluar: 'renderBarangKeluar',
    stockcontrol: 'renderStockControl',
    penjualan: 'renderPenjualan',
    promoedu: 'renderPromoEdu',
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
      dasbor: 'Dashboard Pergudangan & Ringkasan Operasional',
      pelanggan: 'Manajemen Data Pelanggan & Kelompok Tani',
      produk: 'Manajemen Produk',
      barangmasuk: 'Manajemen Barang Masuk',
      barangkeluar: 'Manajemen Barang Keluar',
      stockcontrol: 'Stock Control - Purchase Order & Stock Opname',
      penjualan: 'Manajemen Penjualan — Pemesanan, Pembayaran & Pengiriman',
      promoedu: 'Promosi & Edukasi — Kupon Subsidi, Artikel Agronomi & Tips Tani',
      laporan: 'Laporan Resmi Gudang (Siap Cetak / Print PDF)'
    };
    if (titleEl && titles[viewName]) {
      titleEl.textContent = titles[viewName];
    }

    // Toggle view visibility
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    let target = document.getElementById(`admin-view-${viewName}`);
    // Compat view lama konten/promo -> promoedu (1 menu Promosi & Edukasi)
    if (!target && (viewName === 'konten' || viewName === 'promo' || viewName === 'editorial')) {
      target = document.getElementById('admin-view-promoedu');
      viewName = 'promoedu';
      this.activeView = 'promoedu';
    }
    // Compat view lama po/stockopname -> stockcontrol (1 menu Stock Control)
    if (!target && (viewName === 'po' || viewName === 'stockopname')) {
      target = document.getElementById('admin-view-stockcontrol');
      viewName = 'stockcontrol';
      this.activeView = 'stockcontrol';
      // Tampilkan tab yang sesuai dengan view lama.
      this._stockControlTab = viewName === 'po' ? 'po' : 'stockopname';
    }
    if (target) {
      target.classList.add('active');
    }

    // Call renderers — hanya saat view benar-benar perlu (belum pernah dirender,
    // ditandai dirty, atau dipaksa). Mencegah render ulang saat user
    // berpindah-pindah menu tanpa perubahan data.
    let renderKey = this.VIEWS[viewName] || this.VIEWS['promoedu'];
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
          tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 24px; color: #8BA498;">Tidak ada produk yang cocok dengan pencarian.</td></tr>';
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
  // Hitung metrik dashboard sekali, dipakai KPI + semua grafik agar
  // total grafik selalu sama dengan angka KPI (tanpa dummy / tanpa drift).
  _dashboardMetrics() {
    const orders = window.taniStore.getOrders();
    const products = window.taniStore.getProducts();
    const stockLogs = window.taniStore.getStockLogs ? window.taniStore.getStockLogs() : [];

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const expired = window.taniStore.getExpiredProducts ? window.taniStore.getExpiredProducts() : products.filter(p => window.taniStore.isProductExpired(p));
    const lowStock = window.taniStore.getLowStockProducts ? window.taniStore.getLowStockProducts() : products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.minStockWarning || 20));
    const nearExpiry = products.filter(p => !window.taniStore.isProductExpired(p) && window.taniStore.daysUntilExpiry(p) !== null && window.taniStore.daysUntilExpiry(p) <= 30);
    const totalSalesQty = orders.reduce((sum, o) => sum + ((o.items || []).reduce((ss, i) => ss + (Number(i.qty) || 0), 0)), 0);

    // Agregat mutasi dari stockLogs — hanya tipe Masuk / Keluar.
    let totalMasuk = 0, totalKeluar = 0;
    stockLogs.forEach(l => {
      if (l.type === 'Masuk') totalMasuk += Math.abs(Number(l.qty) || 0);
      else if (l.type === 'Keluar') totalKeluar += Math.abs(Number(l.qty) || 0);
    });

    // Status stok: Aman / Menipis / Habis via getProductStatus (expired+empty => Habis).
    const statusCounts = { Aman: 0, Menipis: 0, Habis: 0 };
    products.forEach(p => { statusCounts[this.stockStatusText(p)]++; });

    // Jumlah produk per kategori — jumlahnya selalu = totalProducts.
    const categoryCounts = {};
    products.forEach(p => {
      const c = this.productCategory(p);
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    });

    return { orders, products, stockLogs, totalProducts, totalStock, totalOrders, totalRevenue,
      expired, lowStock, nearExpiry, totalSalesQty, totalMasuk, totalKeluar, statusCounts, categoryCounts };
  },

  _fmtNum(n) {
    return (Number(n) || 0).toLocaleString('id-ID');
  },

  _parseLogDate(v) {
    // Terima "YYYY-MM-DD" atau "YYYY-MM-DD HH:mm" dari stockLogs.
    if (!v) return null;
    const d = new Date(String(v).replace(' ', 'T'));
    return isNaN(d.getTime()) ? null : d;
  },

  _monthLabel(d) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return m[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
  },

  setDashboardPeriod(period) {
    this._dashPeriod = period || 'bulanan';
    try { localStorage.setItem('tani_dash_period', this._dashPeriod); } catch (e) {}
    this.renderDasbor();
  },

  renderDasbor() {
    const m = this._dashboardMetrics();
    const { products, orders, expired, lowStock } = m;
    const totalProducts = m.totalProducts, totalStock = m.totalStock, totalOrders = m.totalOrders,
      totalRevenue = m.totalRevenue, totalSalesQty = m.totalSalesQty;

    if (document.getElementById('dash-metric-products')) document.getElementById('dash-metric-products').textContent = totalProducts;
    if (document.getElementById('dash-metric-stock')) document.getElementById('dash-metric-stock').textContent = totalStock;
    if (document.getElementById('dash-metric-orders')) document.getElementById('dash-metric-orders').textContent = totalOrders;
    if (document.getElementById('dash-metric-sales')) document.getElementById('dash-metric-sales').textContent = window.taniStore.formatRupiah(totalRevenue);
    if (document.getElementById('dash-metric-omzet')) document.getElementById('dash-metric-omzet').textContent = window.taniStore.formatRupiah(totalRevenue);
    if (document.getElementById('dash-kpi-sales-qty')) document.getElementById('dash-kpi-sales-qty').textContent = totalSalesQty + ' unit terjual';
    if (document.getElementById('dash-kpi-expired-count')) document.getElementById('dash-kpi-expired-count').textContent = expired.length + ' SKU kedaluwarsa terblokir';
    if (document.getElementById('dash-kpi-lowstock-count')) document.getElementById('dash-kpi-lowstock-count').textContent = lowStock.length + ' SKU stok menipis';

    const periodSel = document.getElementById('dash-period-select');
    if (periodSel) periodSel.value = this._dashPeriod || 'bulanan';
    this._renderDashboardChart(m);

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

    const dashRecentOrders = document.getElementById('dash-recent-orders-list');
    if (dashRecentOrders) {
      if (orders.length === 0) {
        dashRecentOrders.innerHTML = '<div class="empty-state-text">Belum ada pesanan.</div>';
      } else {
        const statusCount = {};
        orders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
        dashRecentOrders.innerHTML = Object.entries(statusCount).map(([st, cnt]) => {
          const last = [...orders].reverse().find(o => o.status === st);
          return `
            <div class="activity-item">
              <div class="activity-item-name"><span class="badge ${st === 'Selesai' ? 'badge-green' : 'badge-orange'}">${st}</span><span style="color:#8BA498; font-size:12px; margin-left:6px;">${cnt} pesanan</span></div>
              <div class="activity-item-price">${window.taniStore.formatRupiah(last ? last.total : 0)}</div>
            </div>`;
        }).join('') + '<div style="font-size:11px; color:#5E7D6F; margin-top:8px;">Total ' + totalOrders + ' pesanan • ' + window.taniStore.formatRupiah(totalRevenue) + '</div>';
        dashRecentOrders.innerHTML += orders.slice(0, 3).map(o => `<div class="activity-item"><div class="activity-item-name"><span style="font-weight:600;">${o.id}</span><span style="color:#8BA498; font-size:12px; margin-left:6px;">${o.customerName}</span></div><div class="activity-item-price">${window.taniStore.formatRupiah(o.total)}</div></div>`).join('');
      }
    }

    const warnEl = document.getElementById('dash-warning-list');
    if (warnEl) {
      let html = '';
      expired.forEach(p => { html += `<div class="warn-item warn-danger"><strong>KEDALUWARSA — DIBLOKIR:</strong> ${p.code || p.id} - ${p.name} (exp. ${p.expiryDate || '-'})</div>`; });
      lowStock.forEach(p => { html += `<div class="warn-item warn-warning"><strong>Stok menipis:</strong> ${p.code || p.id} - ${p.name} (sisa ${p.stock} ${String(p.unit).split(' ')[0]}, min ${p.minStockWarning || 20})</div>`; });
      nearExpiry.forEach(p => { const d = window.taniStore.daysUntilExpiry(p); html += `<div class="warn-item warn-warning"><strong>Mendekati kedaluwarsa:</strong> ${p.code || p.id} - ${p.name} (exp. ${p.expiryDate}, ${d} hari lagi)</div>`; });
      warnEl.innerHTML = html || '<div class="empty-state-text">Tidak ada peringatan. Semua stok aman & tidak kedaluwarsa.</div>';
    }
  },

  _renderDashboardChart(m) {
    const products = m.products, orders = m.orders, stockLogs = m.stockLogs;
    const fmt = (n) => this._fmtNum(n);
    const esc = (v) => window.taniStore.escapeHtml ? window.taniStore.escapeHtml(String(v || '')) : String(v || '');
    const emptyHtml = '<div class="empty-state-text">Belum ada data.</div>';

    // ---- 1. Stok Produk: bar per produk; jumlah bar = totalStock ----
    const stokEl = document.getElementById('dash-chart-stok-produk');
    if (stokEl) {
      const maxStock = Math.max(1, ...products.map(p => Number(p.stock) || 0));
      stokEl.innerHTML = products.length ? products.map(p => {
        const s = Number(p.stock) || 0;
        const status = this.stockStatusText(p);
        const color = status === 'Habis' ? '#EF4444' : status === 'Menipis' ? '#F59E0B' : '#10B981';
        return `<div class="bar-row" title="${esc(p.name)}: ${fmt(s)} ${esc(this.productUnit(p))} (${status})">
          <span class="bar-label">${esc(p.name)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(s / maxStock) * 100}%; background:${color};"></div></div>
          <span class="bar-val">${fmt(s)}</span>
        </div>`;
      }).join('') : emptyHtml;
    }

    // ---- 2. Masuk / Keluar: grouped bar dari stockLogs; bucket sesuai periode ----
    const mukelEl = document.getElementById('dash-chart-masuk-keluar');
    if (mukelEl) {
      const period = this._dashPeriod || 'bulanan';
      const buckets = [];
      const now = new Date();
      if (period === 'harian') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          buckets.push({ key: d.toISOString().slice(0, 10), label: d.getDate() + '/' + (d.getMonth() + 1), tanggal: d });
        }
      } else if (period === 'mingguan') {
        for (let i = 5; i >= 0; i--) {
          const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
          const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
          buckets.push({ key: start.toISOString().slice(0, 10) + '|' + end.toISOString().slice(0, 10),
            label: 'Mgg ' + (end.getDate()) + '/' + (end.getMonth() + 1), start, end });
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.push({ key: d.getFullYear() + '-' + d.getMonth(), label: this._monthLabel(d), year: d.getFullYear(), month: d.getMonth() });
        }
      }
      const masuk = buckets.map(() => 0), keluar = buckets.map(() => 0);
      stockLogs.forEach(l => {
        if (l.type !== 'Masuk' && l.type !== 'Keluar') return;
        const d = this._parseLogDate(l.date);
        if (!d) return;
        let idx = -1;
        if (period === 'harian') idx = buckets.findIndex(b => b.key === d.toISOString().slice(0, 10));
        else if (period === 'mingguan') idx = buckets.findIndex(b => d >= b.start && d <= b.end);
        else idx = buckets.findIndex(b => b.year === d.getFullYear() && b.month === d.getMonth());
        if (idx < 0) return;
        if (l.type === 'Masuk') masuk[idx] += Math.abs(Number(l.qty) || 0);
        else keluar[idx] += Math.abs(Number(l.qty) || 0);
      });
      const maxV = Math.max(1, ...masuk, ...keluar);
      mukelEl.innerHTML = `<div class="grouped-bars">
          ${buckets.map((b, i) => `<div class="grouped-col">
            <div class="grouped-bars-pair">
              <div class="grouped-bar grouped-bar--masuk" style="height:${Math.max(3, (masuk[i] / maxV) * 90)}px" title="Masuk ${b.label}: ${fmt(masuk[i])}"></div>
              <div class="grouped-bar grouped-bar--keluar" style="height:${Math.max(3, (keluar[i] / maxV) * 90)}px" title="Keluar ${b.label}: ${fmt(keluar[i])}"></div>
            </div>
            <div class="grouped-label">${esc(b.label)}</div>
          </div>`).join('')}
        </div>
        <div class="donut-legend"><span><i style="background:#10B981"></i>Masuk</span><span><i style="background:#F59E0B"></i>Keluar</span></div>`;
    }
    const elMasuk = document.getElementById('dash-total-masuk');
    if (elMasuk) elMasuk.textContent = fmt(m.totalMasuk);
    const elKeluar = document.getElementById('dash-total-keluar');
    if (elKeluar) elKeluar.textContent = fmt(m.totalKeluar);

    // ---- 3. Status Stok: donut Aman/Menipis/Habis; jumlah = totalProducts ----
    const statusEl = document.getElementById('dash-chart-status-stok');
    if (statusEl) {
      const items = [
        { label: 'Aman', n: m.statusCounts.Aman, color: '#10B981' },
        { label: 'Menipis', n: m.statusCounts.Menipis, color: '#F59E0B' },
        { label: 'Habis', n: m.statusCounts.Habis, color: '#EF4444' }
      ];
      const tot = m.totalProducts || 0;
      let acc = 0;
      const R = 15.9155;
      const segs = items.filter(i => i.n > 0).map(i => {
        const pct = tot ? (i.n / tot) * 100 : 0;
        const seg = `<circle r="${R}" cx="18" cy="18" fill="none" stroke="${i.color}" stroke-width="5"
          stroke-dasharray="${pct.toFixed(2)} ${(100 - pct).toFixed(2)}" stroke-dashoffset="${(25 - acc).toFixed(2)}" title="${i.label}: ${fmt(i.n)} produk (${pct.toFixed(1)}%)"></circle>`;
        acc += pct;
        return seg;
      }).join('');
      statusEl.innerHTML = tot ? `<div class="donut-wrap">
          <svg class="donut-svg" viewBox="0 0 36 36" role="img" aria-label="Distribusi status stok">${segs}</svg>
          <div class="donut-legend">
            ${items.map(i => `<span><i style="background:${i.color}"></i>${i.label}: <strong>${fmt(i.n)}</strong> (${tot ? ((i.n / tot) * 100).toFixed(1) : '0,0'}%)</span>`).join('')}
          </div></div>` : emptyHtml;
    }

    // ---- 4. Kategori Produk: jumlah produk per kategori; jumlah = totalProducts ----
    const katEl = document.getElementById('dash-chart-kategori');
    if (katEl) {
      const entries = Object.entries(m.categoryCounts).sort((a, b) => b[1] - a[1]);
      const maxC = Math.max(1, ...entries.map(e => e[1]));
      katEl.innerHTML = entries.length ? entries.map(([k, v]) =>
        `<div class="bar-row" title="${esc(k)}: ${fmt(v)} produk">
          <span class="bar-label">${esc(k)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(v / maxC) * 100}%; background:linear-gradient(90deg,#34D399,#10B981);"></div></div>
          <span class="bar-val">${fmt(v)}</span>
        </div>`).join('') : emptyHtml;
    }

    // ---- 5. Tren Persediaan: garis total stok 6 bulan terakhir ----
    // Titik akhir = stok kini; mundur per bulan dengan membalik mutasi logs
    // (Masuk di bulan M menaikkan stok untuk bulan M dst., Keluar sebaliknya).
    const trenEl = document.getElementById('dash-chart-tren');
    if (trenEl) {
      const now = new Date();
      const months = [];
      for (let i = 5; i >= 0; i--) months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
      const net = months.map(() => 0);
      stockLogs.forEach(l => {
        if (l.type !== 'Masuk' && l.type !== 'Keluar') return;
        const d = this._parseLogDate(l.date);
        if (!d) return;
        const idx = months.findIndex(b => b.getFullYear() === d.getFullYear() && b.getMonth() === d.getMonth());
        if (idx < 0) return;
        net[idx] += (l.type === 'Masuk' ? 1 : -1) * Math.abs(Number(l.qty) || 0);
      });
      const values = new Array(months.length);
      values[months.length - 1] = m.totalStock;
      for (let i = months.length - 1; i > 0; i--) values[i - 1] = values[i] - net[i];
      const labels = months.map(d => this._monthLabel(d));
      const w = 400, h = 140, pad = 12, maxV = Math.max(1, ...values);
      const pts = values.map((v, i) => ({
        x: pad + i * ((w - pad * 2) / (values.length - 1 || 1)),
        y: h - pad - (v / maxV) * (h - pad * 2), v, label: labels[i]
      }));
      const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
      trenEl.innerHTML = `<svg class="tren-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Tren total persediaan 6 bulan terakhir">
          <polyline points="${pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ')}" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linejoin="round"/>
          ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#10B981" stroke="#04160E" stroke-width="1.5"><title>${esc(p.label)}: ${fmt(p.v)} unit</title></circle>`).join('')}
        </svg>
        <div class="tren-labels">${pts.map(p => `<span>${esc(p.label)}: ${fmt(p.v)}</span>`).join('')}</div>`;
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

  // 6 kategori master resmi — kolom Kategori wajib salah satu dari ini.
  MASTER_CATEGORIES: [
    'Bibit & Benih',
    'Pupuk Tanaman',
    'Obat Hama & Penyakit',
    'Alat & Mesin Tani',
    'Media & Perlengkapan',
    'Hasil Panen Segar'
  ],

  // Helpers mapping produk: 1 kolom header = 1 field data, urutan tetap
  productCategory(p) {
    // Sumber tunggal: validasi/normalisasi ke 6 kategori master.
    // Prioritas: categoryId -> categoryName -> category. Nilai di luar
    // master dipetakan ulang, TIDAK perUPuk/Benih/etc bebas.
    const cats = window.taniStore.getCategories ? window.taniStore.getCategories() : [];
    const byId = (p.categoryId && cats.find(x => x.id === p.categoryId)) || null;
    const byName = p.categoryName || p.category;
    const candidate = (byId && byId.name) || byName;
    const normalized = this._normalizeCategory(candidate);
    if (normalized) return normalized;
    if (byId && this.MASTER_CATEGORIES.includes(byId.name)) return byId.name;
    if (p.categoryId && this._categoryIdToMaster && this._categoryIdToMaster[p.categoryId]) return this._categoryIdToMaster[p.categoryId];
    return byId ? byId.name : '-';
  },
  // Peta id master -> nama (sesuai SEED_DATA.categories)
  _categoryIdToMaster: {
    'cat-1': 'Bibit & Benih',
    'cat-2': 'Pupuk Tanaman',
    'cat-3': 'Obat Hama & Penyakit',
    'cat-4': 'Alat & Mesin Tani',
    'cat-5': 'Media & Perlengkapan',
    'cat-6': 'Hasil Panen Segar'
  },
  _normalizeCategory(name) {
    if (!name) return null;
    const low = String(name).trim().toLowerCase();
    const aliases = {
      'benih': 'Bibit & Benih', 'bibit': 'Bibit & Benih', 'bibit & benih': 'Bibit & Benih', 'benih & bibit': 'Bibit & Benih',
      'pupuk': 'Pupuk Tanaman', 'pupuk tanaman': 'Pupuk Tanaman',
      'obat': 'Obat Hama & Penyakit', 'obat hama': 'Obat Hama & Penyakit', 'obat hama & penyakit': 'Obat Hama & Penyakit', 'pestisida': 'Obat Hama & Penyakit', 'proteksi': 'Obat Hama & Penyakit',
      'alat': 'Alat & Mesin Tani', 'alat & mesin': 'Alat & Mesin Tani', 'alat & mesin tani': 'Alat & Mesin Tani', 'mesin tani': 'Alat & Mesin Tani', 'alat tani': 'Alat & Mesin Tani',
      'media': 'Media & Perlengkapan', 'media & perlengkapan': 'Media & Perlengkapan', 'perlengkapan': 'Media & Perlengkapan',
      'hasil panen': 'Hasil Panen Segar', 'hasil panen segar': 'Hasil Panen Segar', 'panen segar': 'Hasil Panen Segar'
    };
    if (aliases[low]) return aliases[low];
    const exact = this.MASTER_CATEGORIES.find(m => m.toLowerCase() === low);
    return exact || null;
  },
  productUnit(p) {
    // Satuan pendek sesuai contoh: Kg/Gram/Sachet/Botol/Sak — ambil dari field unit produk
    if (!p.unit) return '-';
    const u = String(p.unit).trim();
    const m = u.match(/\b(Kg|Gram|Sachet|Botol|Zak|Sak|Unit|Liter|Lembar|Pcs|Buah|Karung)\b/i);
    return m ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : u;
  },
  productFullUnit(p) {
    return p.unit || '-';
  },
  stockLine(p) {
    // "450 Sachet" — jumlah stok + satuan, satu field stock untuk kolom Jumlah Stok
    return p.stock + ' ' + this.productUnit(p);
  },
  formatExpiry(p) {
    // Selalu YYYY-MM-DD sesuai data expiryDate
    if (!p.expiryDate) return '-';
    const d = new Date(p.expiryDate);
    if (isNaN(d.getTime())) return String(p.expiryDate).slice(0, 10);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  },
  stockStatusText(p) {
    // Aman / Menipis / Habis berdasar stok vs batas minimum (PLAN: expired dihitung Habis agar grafik status = 3 kategori)
    const s = window.taniStore.getProductStatus(p);
    if (s.key === 'expired' || s.key === 'empty') return 'Habis';
    if (s.key === 'low' || s.key === 'nearing') {
      // Ada stok tapi di bawah minima => Menipis (expired sudah ditangani di atas)
      return (p.stock || 0) > 0 ? 'Menipis' : 'Habis';
    }
    return 'Aman';
  },
  stockCardHtml(p) {
    const c = window.taniStore.getStockCard ? window.taniStore.getStockCard(p.id) : { totalMasuk: 0, totalKeluar: 0, saldoAkhir: p.stock };
    // Saldo akhir harus akurat = stok saat ini
    const saldo = Number(p.stock) || 0;
    return `In: ${c.totalMasuk} | Out: ${c.totalKeluar}<br>Saldo: <strong style="color:#ECFDF5;">${saldo}</strong>`;
  },

  renderProduk() {
    const products = window.taniStore.getProducts();
    const tbody = document.getElementById('table-produk-tbody');
    if (!tbody) return;
    const esc = (v) => window.taniStore.escapeHtml ? window.taniStore.escapeHtml(String(v || '')) : String(v || '');
    tbody.innerHTML = products.map(p => {
      const status = window.taniStore.getProductStatus(p);
      const expired = status.key === 'expired';
      // Urutan <td> persis sama dengan <th> di admin.html (13 kolom)
      return `
        <tr style="${expired ? 'opacity:0.55; background:rgba(239,68,68,0.06);' : ''}">
          <td><img src="${p.image}" class="table-thumb" alt="${esc(p.name)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\'><rect width=\\'60\\' height=\\'60\\' fill=\\'%232E7D32\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' fill=\\'%23FFFFFF\\' font-family=\\'sans-serif\\' font-size=\\'10\\' font-weight=\\'bold\\'>Tani</text></svg>'"></td>
          <td><div style="font-weight:600; max-width:220px;">${esc(p.name)}</div></td>
          <td><span class="badge badge-gray">${esc(p.shelfLocation || '-')}</span></td>
          <td><span class="badge badge-green">${esc(this.productCategory(p))}</span></td>
          <td><strong>${window.taniStore.formatRupiah(p.price)}</strong></td>
          <td>${esc(this.productUnit(p))}</td>
          <td><strong>${esc(p.code || p.id)}</strong></td>
          <td><strong style="color:${expired ? '#F87171' : '#A3BDB0'};">${this.formatExpiry(p)}</strong></td>
          <td><strong>${esc(this.stockLine(p))}</strong></td>
          <td><span class="${status.badgeClass}">${this.stockStatusText(p)}</span></td>
          <td style="font-size:11px; color:#8BA498;">${this.stockCardHtml(p)}</td>
          <td>Min : <strong>${p.minStockWarning || 20}</strong></td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.openEditProductModal('${p.id}')">Edit</button>
              <button class="btn btn-secondary btn-sm" style="color:#DC2626;" onclick="AdminApp.deleteProductConfirm('${p.id}')">Hapus</button>
            </div>
          </td>
        </tr>`;
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

    const cCode = document.getElementById('form-product-code'); if (cCode) cCode.value = '';
    const cExp = document.getElementById('form-product-expiry'); if (cExp) cExp.value = '';
    const cMin = document.getElementById('form-product-min-stock'); if (cMin) cMin.value = '20';
    const cCatN = document.getElementById('form-product-cat-name');
    const catSelect = document.getElementById('form-product-cat');
    // Kategori WAJIB salah satu 6 master — dropdown tertutup, bukan teks bebas.
    if (cCatN) { cCatN.value = this.MASTER_CATEGORIES[0]; }
    if (catSelect) { catSelect.innerHTML = this.MASTER_CATEGORIES.map(name => `<option value="${name}">${name}</option>`).join(''); catSelect.value = this.MASTER_CATEGORIES[0]; }

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

    const cCode2 = document.getElementById('form-product-code'); if (cCode2) cCode2.value = p.code || p.id || '';
    const cExp2 = document.getElementById('form-product-expiry'); if (cExp2) cExp2.value = p.expiryDate || '';
    const cMin2 = document.getElementById('form-product-min-stock'); if (cMin2) cMin2.value = p.minStockWarning || 20;
    const cCatN2 = document.getElementById('form-product-cat-name');
    const catSelect = document.getElementById('form-product-cat');
    const currentCat = this.productCategory(p);
    if (cCatN2) cCatN2.value = currentCat;
    if (catSelect) { catSelect.innerHTML = this.MASTER_CATEGORIES.map(name => `<option value="${name}" ${name === currentCat ? 'selected' : ''}>${name}</option>`).join(''); catSelect.value = currentCat; }

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

    const codeVal = (document.getElementById('form-product-code') ? document.getElementById('form-product-code').value.trim() : '') || id;
    const expiryVal = document.getElementById('form-product-expiry') ? document.getElementById('form-product-expiry').value.trim() : '';
    const minStockVal = document.getElementById('form-product-min-stock') ? Number(document.getElementById('form-product-min-stock').value) : 20;
    const catNameVal = (document.getElementById('form-product-cat-name') ? document.getElementById('form-product-cat-name').value.trim() : '') || this.MASTER_CATEGORIES[0];
    // Validasi keras: kategori harus 6 master, sonst normalize fallback.
    const canonicalCat = this._normalizeCategory(catNameVal) || this.productCategory({ categoryId: document.getElementById('form-product-cat') ? document.getElementById('form-product-cat').value : '', categoryName: catNameVal }) || this.MASTER_CATEGORIES[0];
    const canonicalId = Object.keys(this._categoryIdToMaster).find(id => this._categoryIdToMaster[id] === canonicalCat) || 'cat-1';
    const memberPriceInput = document.getElementById('form-product-member-price');
    const memberPriceVal = memberPriceInput ? Number(memberPriceInput.value) : null;
    const tierEligibleCheck = document.getElementById('form-product-tier-eligible');

    const defaultImg = 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=600&q=80';
    const product = {
      id: id,
      name: name,
      categoryId: canonicalId,
      categoryName: canonicalCat,
      category: canonicalCat,
      code: codeVal,
      expiryDate: expiryVal || null,
      price: price,
      originalPrice: Number(document.getElementById('form-product-original-price').value) || null,
      memberPrice: (!isNaN(memberPriceVal) && memberPriceVal > 0) ? memberPriceVal : null,
      eligibleForTierDiscount: tierEligibleCheck ? tierEligibleCheck.checked : true,
      stock: stock,
      unit: document.getElementById('form-product-unit').value.trim() || 'Unit',
      minStockWarning: isNaN(minStockVal) || minStockVal <= 0 ? 20 : minStockVal,
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
  },

  deleteProductConfirm(id) {
    if (confirm('Yakin ingin menghapus produk ini dari master data gudang?')) {
      window.taniStore.deleteProduct(id);
      TaniAuth.showToast('Produk telah dihapus', 'info');
      this.invalidateAllViews();
      this.renderProduk();
    }
  },

  // ==========================================
  // 6. MANAJEMEN PENJUALAN — gabungan Pemesanan, Pembayaran,
  //    Pengiriman (tab terpisah, 1 menu, 1 tabel per tab)
  // ==========================================
  // Default tab aktif & filter status ringkas (disimpan persisten).
  _penjualanTab: 'pemesanan',
  _penjualanTabInit: false,
  _penjualanFilter: 'all',

  setPenjualanTab(tab) {
    this._penjualanTab = tab || 'pemesanan';
    try { localStorage.setItem('tani_penjualan_tab', this._penjualanTab); } catch (e) {}
    this.renderPenjualan();
  },

  setPenjualanFilter(filter) {
    this._penjualanFilter = filter || 'all';
    this.renderPenjualan();
  },

  renderPenjualan() {
    if (!this._penjualanTabInit) {
      try {
        const saved = localStorage.getItem('tani_penjualan_tab');
        if (saved === 'pemesanan' || saved === 'pembayaran' || saved === 'pengiriman') this._penjualanTab = saved;
      } catch (e) {}
      this._penjualanTabInit = true;
    }
    const tab = this._penjualanTab || 'pemesanan';
    // Sync tab header aktif
    document.querySelectorAll('.penjualan-tab').forEach(el => {
      const active = el.getAttribute('data-penjualan-tab') === tab;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    // Tampilkan tabel yang sesuai
    document.querySelectorAll('.penjualan-panel').forEach(p => {
      const on = p.getAttribute('data-penjualan-panel') === tab;
      p.classList.toggle('active', on);
      p.style.display = on ? 'block' : 'none';
    });
    const filterSel = document.getElementById('penjualan-filter-select');
    if (filterSel) filterSel.value = this._penjualanFilter || 'all';
    if (tab === 'pemesanan') this.renderPemesanan();
    else if (tab === 'pembayaran') this.renderPembayaran();
    else if (tab === 'pengiriman') this.renderPengiriman();
  },

  // Legacy wrappers agar tautan lama (onClick, laporan, dsb.) tetap jalan.
  renderPemesanan() {
    const filter = this._penjualanFilter;
    const ordersAll = window.taniStore.getOrders();
    const orders = filter === 'all' ? ordersAll : ordersAll.filter(o => {
      if (filter === 'belum-lunas') return o.paymentStatus !== 'Lunas';
      if (filter === 'lunas') return o.paymentStatus === 'Lunas';
      if (filter === 'diproses') return o.status === 'Diproses Gudang';
      if (filter === 'dikirim') return o.status === 'Dikirim';
      if (filter === 'selesai') return o.status === 'Selesai';
      if (filter === 'menunggu') return String(o.status || '').includes('Menunggu');
      return true;
    });
    const tbody = document.getElementById('table-pemesanan-tbody');
    if (!tbody) return;
    const emptyHtml = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#8BA498;">Belum ada pesanan.</td></tr>';
    tbody.innerHTML = orders.length ? orders.map(o => `
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
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewOrderInvoice('${o.id}')">Detail</button>
            <button class="btn btn-primary btn-sm" onclick="AdminApp.openOrderStatusModal('${o.id}')">Update Status</button>
            ${o.paymentStatus !== 'Lunas' ? `<button class="btn btn-secondary btn-sm" onclick="AdminApp.verifyPaymentConfirm('${o.id}')">Verifikasi Lunas</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('') : emptyHtml;
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
    this.invalidateView('penjualan');
    this.invalidateView('dasbor');
    this.renderPenjualan();
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
  // 7. PEMBAYARAN — sub-tab dari Manajemen Penjualan
  // ==========================================
  renderPembayaran() {
    const filter = this._penjualanFilter;
    const ordersAll = window.taniStore.getOrders();
    const orders = filter === 'all' ? ordersAll : ordersAll.filter(o => {
      if (filter === 'belum-lunas') return o.paymentStatus !== 'Lunas';
      if (filter === 'lunas') return o.paymentStatus === 'Lunas';
      if (filter === 'diproses') return o.status === 'Diproses Gudang';
      if (filter === 'dikirim') return o.status === 'Dikirim';
      if (filter === 'selesai') return o.status === 'Selesai';
      if (filter === 'menunggu') return String(o.status || '').includes('Menunggu');
      return true;
    });
    const tbody = document.getElementById('table-pembayaran-tbody');
    if (!tbody) return;
    const emptyHtml = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#8BA498;">Belum ada transaksi.</td></tr>';
    tbody.innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customerName}</td>
        <td>${o.paymentMethod}</td>
        <td><strong>${window.taniStore.formatRupiah(o.total)}</strong></td>
        <td><span class="badge ${o.paymentStatus === 'Lunas' ? 'badge-green' : 'badge-orange'}">${o.paymentStatus}</span></td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${o.paymentStatus !== 'Lunas' ? `
              <button class="btn btn-green btn-sm" onclick="AdminApp.verifyPaymentConfirm('${o.id}')">Verifikasi Lunas</button>
            ` : `
              <span style="color:#10B981; font-size:12px; font-weight:600;">✓ Terverifikasi</span>
            `}
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewOrderInvoice('${o.id}')">Detail</button>
          </div>
        </td>
      </tr>
    `).join('') : emptyHtml;
  },

  verifyPaymentConfirm(orderId) {
    if (confirm(`Verifikasi pembayaran pesanan ${orderId} sebagai LUNAS?`)) {
      window.taniStore.updateOrderStatus(orderId, 'Diproses Gudang', 'Pembayaran telah diverifikasi sah oleh Admin Keuangan Gudang.', 'Lunas');
      TaniAuth.showToast(`Pesanan ${orderId} telah diverifikasi Lunas!`, 'success');
      this.invalidateView('penjualan');
      this.invalidateView('dasbor');
      this.renderPenjualan();
      this.renderDasbor();
    }
  },

  // ==========================================
  // 8. PENGIRIMAN — sub-tab dari Manajemen Penjualan
  // ==========================================
  renderPengiriman() {
    const filter = this._penjualanFilter;
    const ordersAll = window.taniStore.getOrders();
    const orders = filter === 'all' ? ordersAll : ordersAll.filter(o => {
      if (filter === 'belum-lunas') return o.paymentStatus !== 'Lunas';
      if (filter === 'lunas') return o.paymentStatus === 'Lunas';
      if (filter === 'diproses') return o.status === 'Diproses Gudang';
      if (filter === 'dikirim') return o.status === 'Dikirim';
      if (filter === 'selesai') return o.status === 'Selesai';
      if (filter === 'menunggu') return String(o.status || '').includes('Menunggu');
      return true;
    });
    const tbody = document.getElementById('table-pengiriman-tbody');
    if (!tbody) return;
    const emptyHtml = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#8BA498;">Belum ada pengiriman.</td></tr>';
    tbody.innerHTML = orders.length ? orders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td>${o.customerName}</td>
        <td><span class="badge badge-gray">${o.courier}</span></td>
        <td><strong style="color:#2E7D32;">${o.trackingNo}</strong></td>
        <td><span class="badge ${o.status === 'Selesai' ? 'badge-green' : 'badge-blue'}">${o.status}</span></td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.openUpdateResiModal('${o.id}')">Input Resi / Checkpoint</button>
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewOrderInvoice('${o.id}')">Detail</button>
          </div>
        </td>
      </tr>
    `).join('') : emptyHtml;
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
      this.invalidateView('penjualan');
      this.renderPenjualan();
    }
  },

  // ==========================================
  // 9. PROMO & EDUKASI — gabungan Konten & Promo
  //    (tab terpisah di dalam 1 fitur, tanpa inline display:none
  //     agar tab benar-benar bisa dibuka)
  // ==========================================
  _promoEduTab: 'promo',
  _promoEduTabInit: false,

  setPromoEduTab(tab) {
    this._promoEduTab = tab || 'promo';
    try { localStorage.setItem('tani_promoedu_tab', this._promoEduTab); } catch (e) {}
    this.renderPromoEdu();
  },

  renderPromoEdu() {
    if (!this._promoEduTabInit) {
      try {
        const saved = localStorage.getItem('tani_promoedu_tab');
        if (saved === 'promo' || saved === 'edukasi') this._promoEduTab = saved;
      } catch (e) {}
      this._promoEduTabInit = true;
    }
    const tab = this._promoEduTab || 'promo';
    document.querySelectorAll('.penjualan-tab[data-promoedu-tab]').forEach(el => {
      const active = el.getAttribute('data-promoedu-tab') === tab;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.penjualan-panel[data-promoedu-panel]').forEach(p => {
      const on = p.getAttribute('data-promoedu-panel') === tab;
      p.classList.toggle('active', on);
      p.style.display = on ? 'block' : 'none';
    });
    if (tab === 'edukasi') this.renderKonten();
    else this.renderPromo();
  },

  // ==========================================
  // 9a. KONTEN / EDUKASI (sub-tab dari Promo & Edukasi)
  // ==========================================
  renderKonten() {
    const tips = window.taniStore.getTips();
    const tbody = document.getElementById('table-konten-tips-tbody');
    if (!tbody) return;
    const emptyHtml = '<tr><td colspan="6" style="text-align:center; padding:24px; color:#8BA498;">Belum ada artikel.</td></tr>';
    tbody.innerHTML = tips.length ? tips.map(t => `
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
    `).join('') : emptyHtml;
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
    this.invalidateView('promoedu');
    this.renderPromoEdu();
  },

  deleteTipConfirm(id) {
    if (confirm('Hapus artikel tips ini?')) {
      window.taniStore.deleteTip(id);
      TaniAuth.showToast('Artikel telah dihapus', 'info');
      this.invalidateView('promoedu');
      this.renderPromoEdu();
    }
  },

  // ==========================================
  // 10. PROMO (sub-tab dari Promo & Edukasi)
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
    this.invalidateView('promoedu');
    this.renderPromoEdu();
  },

  togglePromoActive(code) {
    const vouchers = window.taniStore.getVouchers();
    const v = vouchers.find(x => x.code === code);
    if (v) {
      v.active = !v.active;
      window.taniStore.saveVoucher(v);
      this.invalidateView('promoedu');
      this.renderPromoEdu();
    }
  },

  // ==========================================
  // 11. LAPORAN (PASTIKAN BISA DICETAK) — 8 laporan sesuai judul
  // ==========================================
  renderLaporan() {
    const reportType = document.getElementById('report-type-select') ? document.getElementById('report-type-select').value : 'stok';
    const period = document.getElementById('report-period-select') ? document.getElementById('report-period-select').value : 'all';

    const orders = window.taniStore.getOrders();
    const products = window.taniStore.getProducts();
    const barangMasuk = window.taniStore.getBarangMasuk ? window.taniStore.getBarangMasuk() : [];
    const barangKeluar = window.taniStore.getBarangKeluar ? window.taniStore.getBarangKeluar() : [];
    const pos = window.taniStore.getPurchaseOrders ? window.taniStore.getPurchaseOrders() : [];
    const opnames = window.taniStore.getStockOpnames ? window.taniStore.getStockOpnames() : [];

    const container = document.getElementById('report-document-container');
    if (!container) return;

    const printDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const kop = (title, sub) => `
      <div class="report-header-kop">
        <div class="kop-left"><h2>PT TANI SEJATI MANDIRI (Tani.SM)</h2><p>${sub}<br>NPWP: 81.992.341.2-524.000 | Alamat Gudang: Kawasan Agro Industri Delanggu, Klaten, Jawa Tengah</p></div>
        <div class="kop-right"><strong>${title}</strong><br>Periode: <strong>${period === 'all' ? 'Semua Periode Transaksi' : 'Bulan Berjalan 2026'}</strong><br>Dicetak: ${printDate}</div>
      </div>`;
    const chips = (arr) => `<div class="report-summary-chips">${arr.map(c => `<div class="chip-item"><div class="chip-label">${c[0]}</div><div class="chip-val" ${c[2] ? 'style="color:' + c[2] + '"' : ''}>${c[1]}</div></div>`).join('')}</div>`;
    const sign = (a, b) => `<div class="report-signatures"><div class="sign-col">${a[0]}<div class="sign-line">${a[1]}</div>${a[2]}</div><div class="sign-col">${b[0]}<div class="sign-line">${b[1]}</div>${b[2]}</div></div>`;

    if (reportType === 'stok') {
      const totalVal = products.reduce((s, p) => s + (p.price * p.stock), 0);
      const totalUnits = products.reduce((s, p) => s + p.stock, 0);
      container.innerHTML = `<div class="print-document">${kop('LAPORAN STOK BARANG', 'Sentra Logistik Pergudangan Pertanian & Saprotan Nasional — Posisi Stok Terkini')}
        ${chips([['Total Nilai Valuasi Stok', window.taniStore.formatRupiah(totalVal), '#2E7D32'], ['Total Varian', products.length + ' SKU Aktif'], ['Total Unit', totalUnits + ' Satuan'], ['Kondisi', 'Layak Siap Kirim', '#10B981']])}
        <table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>Kode Barang</th><th>Nama Barang</th><th>Lokasi Rak / Gudang</th><th class="text-center">Stok</th><th class="text-right">Harga Satuan</th><th class="text-right">Total Valuasi</th></tr></thead>
        <tbody>${products.map((p, i) => `<tr><td class="text-center">${i + 1}</td><td><strong>${p.code || p.id}</strong></td><td>${p.name} (${p.unit})</td><td>${p.shelfLocation || 'Gudang Pusat'}</td><td class="text-center"><strong>${p.stock}</strong></td><td class="text-right">${window.taniStore.formatRupiah(p.price)}</td><td class="text-right"><strong>${window.taniStore.formatRupiah(p.price * p.stock)}</strong></td></tr>`).join('')}
        <tr style="background:#F3F4F6; font-weight:700;"><td colspan="6" class="text-right">TOTAL NILAI ASET INVENTARIS:</td><td class="text-right" style="color:#2E7D32; font-size:13px;">${window.taniStore.formatRupiah(totalVal)}</td></tr></tbody></table>
        ${sign(['Penanggung Jawab Stock Opname,','Wahyu Triadi','Supervisor Gudang Fisik'], ['Mengetahui,','Joko Purnomo','Kepala Gudang Tani.SM'])}
      </div>`;
    } else if (reportType === 'masuk') {
      const totalQty = barangMasuk.reduce((s, e) => s + (e.jumlahMasuk || 0), 0);
      container.innerHTML = `<div class="print-document">${kop('LAPORAN BARANG MASUK', 'Penerimaan Barang dari Supplier / Pabrik ke Gudang')}
        ${chips([['Total Transaksi Masuk', barangMasuk.length + ' Nota'], ['Total Unit Masuk', totalQty + ' Satuan'], ['Supplier Terdaftar', new Set(barangMasuk.map(e => e.supplier)).size + ' Supplier'], ['Status', 'Tercatat', '#10B981']])}
        <table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>Tanggal Datang</th><th>Kode Barang</th><th class="text-center">Jumlah Masuk</th><th>Satuan</th><th class="text-right">Harga Satuan</th><th>Pemasok / Supplier</th></tr></thead>
        <tbody>${barangMasuk.map((e, i) => `<tr><td class="text-center">${i + 1}</td><td>${e.tanggalDatang}</td><td><strong>${e.kodeBarang}</strong> ${e.namaBarang || ''}</td><td class="text-center">${e.jumlahMasuk}</td><td>${e.satuan}</td><td class="text-right">${window.taniStore.formatRupiah(e.hargaSatuan)}</td><td>${e.supplier}</td></tr>`).join('') || '<tr><td colspan="7" style="text-align:center; padding:20px;">Belum ada transaksi barang masuk.</td></tr>'}</tbody></table>
        ${sign(['Dibuat Oleh,','Joko Purnomo','Kepala Gudang'], ['Mengetahui,','Ir. Bambang Trihartono','Direktur Operasional'])}
      </div>`;
    } else if (reportType === 'keluar') {
      const totalQty = barangKeluar.reduce((s, e) => s + (e.jumlahKeluar || 0), 0);
      container.innerHTML = `<div class="print-document">${kop('LAPORAN BARANG KELUAR', 'Pengeluaran Barang dari Gudang')}
        ${chips([['Total Transaksi Keluar', barangKeluar.length + ' Nota'], ['Total Unit Keluar', totalQty + ' Satuan'], ['Nilai Pengeluaran', window.taniStore.formatRupiah(barangKeluar.reduce((s, e) => s + (e.harga || 0) * e.jumlahKeluar, 0)), '#F59E0B'], ['Status', 'Tercatat', '#10B981']])}
        <table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>Tanggal Keluar</th><th>Kode Barang</th><th class="text-center">Jumlah Keluar</th><th>Satuan</th><th class="text-right">Harga</th><th>Keperluan / Penerima</th></tr></thead>
        <tbody>${barangKeluar.map((e, i) => `<tr><td class="text-center">${i + 1}</td><td>${e.tanggalKeluar}</td><td><strong>${e.kodeBarang}</strong> ${e.namaBarang || ''}</td><td class="text-center">${e.jumlahKeluar}</td><td>${e.satuan}</td><td class="text-right">${window.taniStore.formatRupiah(e.harga)}</td><td>${e.catatan || '-'}</td></tr>`).join('') || '<tr><td colspan="7" style="text-align:center; padding:20px;">Belum ada transaksi barang keluar.</td></tr>'}</tbody></table>
        ${sign(['Dibuat Oleh,','Joko Purnomo','Kepala Gudang'], ['Mengetahui,','Ir. Bambang Trihartono','Direktur Operasional'])}
      </div>`;
    } else if (reportType === 'pembelian') {
      container.innerHTML = `<div class="print-document">${kop('LAPORAN PEMBELIAN (PURCHASE ORDER)', 'Ringkasan Pembelian ke Supplier')}
        ${chips([['Total PO', pos.length + ' Dokumen'], ['Total Nilai PO', window.taniStore.formatRupiah(pos.reduce((s, p) => s + ((p.ringkasan || {}).totalKeseluruhan || 0), 0)), '#2E7D32'], ['PO Selesai Diterima', pos.filter(p => p.status === 'Selesai diterima' || p.status === 'Selesai').length + ' PO'], ['PO Berjalan', pos.filter(p => p.status !== 'Selesai diterima' && p.status !== 'Selesai' && p.status !== 'Dibatalkan').length + ' PO']])}
        <table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>Nomor PO</th><th>Supplier</th><th class="text-center">Total Barang</th><th class="text-right">Total Pembelian</th><th>Status</th></tr></thead>
        <tbody>${pos.map((p, i) => { const r = p.ringkasan || {}; return `<tr><td class="text-center">${i + 1}</td><td><strong>${p.id}</strong><br><span style="font-size:11px;">${p.tanggalPembuatan}</span></td><td>${p.supplier}</td><td class="text-center">${r.totalJumlah || 0}</td><td class="text-right"><strong>${window.taniStore.formatRupiah(r.totalKeseluruhan || 0)}</strong></td><td>${p.status}</td></tr>`; }).join('') || '<tr><td colspan="6" style="text-align:center; padding:20px;">Belum ada PO.</td></tr>'}</tbody></table>
        ${sign(['Dibuat Oleh,','Joko Purnomo','Kepala Gudang'], ['Menyetujui,','Ir. Bambang Trihartono','Direktur Operasional'])}
      </div>`;
    } else if (reportType === 'penjualan') {
      const totalSales = orders.reduce((s, o) => s + o.total, 0);
      const totalItems = orders.reduce((s, o) => s + (o.items || []).reduce((a, i) => a + i.qty, 0), 0);
      container.innerHTML = `<div class="print-document">${kop('LAPORAN PENJUALAN', 'Rekapitulasi Penjualan ke Petani / Pelanggan')}
        ${chips([['Total Penjualan', window.taniStore.formatRupiah(totalSales), '#F59E0B'], ['Total Pesanan', orders.length + ' Pesanan'], ['Unit Terjual', totalItems + ' Unit'], ['Status', 'Tercatat', '#10B981']])}
        <table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>No. Pesanan</th><th>Tanggal</th><th>Petani / Pelanggan</th><th>Rincian Barang</th><th class="text-right">Total</th></tr></thead>
        <tbody>${orders.map((o, i) => `<tr><td class="text-center">${i + 1}</td><td><strong>${o.id}</strong></td><td>${o.date}</td><td>${o.customerName}</td><td>${(o.items || []).map(it => `${it.name} (${it.qty})`).join(', ')}</td><td class="text-right"><strong>${window.taniStore.formatRupiah(o.total)}</strong></td></tr>`).join('')}
        <tr style="background:#F3F4F6; font-weight:700;"><td colspan="5" class="text-right">TOTAL PENJUALAN:</td><td class="text-right" style="color:#F59E0B;">${window.taniStore.formatRupiah(totalSales)}</td></tr></tbody></table>
        ${sign(['Dibuat Oleh,','Joko Purnomo','Kepala Gudang'], ['Menyetujui,','Ir. Bambang Trihartono','Direktur Operasional'])}
      </div>`;
    } else if (reportType === 'opname') {
      container.innerHTML = `<div class="print-document">${kop('LAPORAN STOCK OPNAME', 'Hasil Pemeriksaan Fisik Gudang')}
        ${chips([['Total Dokumen Opname', opnames.length + ' Dokumen'], ['SKU Diperiksa', opnames.reduce((s, o) => s + (o.items || []).length, 0) + ' SKU'], ['Disetujui', opnames.filter(o => o.status === 'Disetujui').length + ' Dokumen'], ['Menunggu Persetujuan', opnames.filter(o => o.status !== 'Disetujui').length + ' Dokumen']])}
        ${opnames.map(op => `<h3 style="font-size:13px; margin:18px 0 8px;">${op.id} — ${op.tanggalPemeriksaan} — ${op.petugas} — ${op.lokasi} (${op.status})</h3><table class="print-table"><thead><tr><th>Kode Barang</th><th>Nama Barang</th><th class="text-center">Stok Sistem</th><th class="text-center">Stok Fisik</th><th class="text-center">Selisih</th><th>Hasil</th></tr></thead><tbody>${(op.items || []).map(it => { const h = it.selisih === 0 ? 'Sesuai' : (it.selisih < 0 ? 'Selisih minus' : 'Selisih plus'); return `<tr><td>${it.kodeBarang}</td><td>${it.namaBarang}</td><td class="text-center">${it.stokSistem}</td><td class="text-center">${it.stokFisik}</td><td class="text-center">${it.selisih > 0 ? '+' + it.selisih : it.selisih}</td><td>${h}</td></tr>`; }).join('')}</tbody></table>`).join('') || '<p>Belum ada data opname.</p>'}
        ${sign(['Penanggung Jawab Opname,','Wahyu Triadi','Supervisor Gudang'], ['Mengetahui,','Joko Purnomo','Kepala Gudang'])}
      </div>`;
    } else if (reportType === 'pembayaran') {
      const totalTagihan = orders.reduce((s, o) => s + o.total, 0);
      const lunas = orders.filter(o => o.paymentStatus === 'Lunas');
      container.innerHTML = `<div class="print-document">${kop('LAPORAN PEMBAYARAN', 'Verifikasi Pembayaran Petani / Pelanggan')}
        ${chips([['Total Tagihan', window.taniStore.formatRupiah(totalTagihan), '#F59E0B'], ['Sudah Lunas', lunas.length + ' Pesanan'], ['Nilai Lunas', window.taniStore.formatRupiah(lunas.reduce((s, o) => s + o.total, 0)), '#2E7D32'], ['Perlu Verifikasi', (orders.length - lunas.length) + ' Pesanan']])}
        <table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>No. Pesanan</th><th>Pembayar</th><th>Metode</th><th class="text-right">Jumlah Tagihan</th><th>Status</th></tr></thead>
        <tbody>${orders.map((o, i) => `<tr><td class="text-center">${i + 1}</td><td><strong>${o.id}</strong></td><td>${o.customerName}</td><td>${o.paymentMethod}</td><td class="text-right"><strong>${window.taniStore.formatRupiah(o.total)}</strong></td><td>${o.paymentStatus}</td></tr>`).join('')}</tbody></table>
        ${sign(['Dibuat Oleh,','Joko Purnomo','Kepala Gudang'], ['Mengetahui,','Ir. Bambang Trihartono','Direktur Operasional'])}
      </div>`;
    } else if (reportType === 'kedaluwarsa') {
      const exp = window.taniStore.getExpiredProducts();
      const near = products.filter(p => !window.taniStore.isProductExpired(p) && window.taniStore.daysUntilExpiry(p) !== null && window.taniStore.daysUntilExpiry(p) <= 90);
      const allWarn = [...exp.map(p => ({ p, st: 'KEDALUWARSA - DIBLOKIR' })), ...near.map(p => ({ p, st: 'Mendekati (' + window.taniStore.daysUntilExpiry(p) + ' hari lagi)' }))];
      container.innerHTML = `<div class="print-document">${kop('LAPORAN BARANG KEDALUWARSA', 'Peringatan Kedaluwarsa & Barang Terblokir Otomatis')}
        ${chips([['Sudah Kedaluwarsa', exp.length + ' SKU', '#EF4444'], ['Mendekati (≤90 hari)', near.length + ' SKU', '#F59E0B'], ['Total Nilai Terblokir', window.taniStore.formatRupiah(exp.reduce((s, p) => s + p.price * p.stock, 0)), '#EF4444'], ['Sistem', 'Blokir Otomatis', '#10B981']])}
        ${allWarn.length ? `<table class="print-table"><thead><tr><th style="width:40px;" class="text-center">No</th><th>Kode</th><th>Nama Barang</th><th class="text-center">Kadaluarsa</th><th class="text-center">Stok</th><th>Status</th></tr></thead><tbody>${allWarn.map((x, i) => `<tr><td class="text-center">${i + 1}</td><td><strong>${x.p.code || x.p.id}</strong></td><td>${x.p.name}</td><td class="text-center">${x.p.expiryDate || '-'}</td><td class="text-center">${x.p.stock}</td><td><strong>${x.st}</strong></td></tr>`).join('')}</tbody></table>` : '<p style="text-align:center; padding:24px;">Tidak ada barang kedaluwarsa.</p>'}
        ${sign(['Dibuat Oleh,','Joko Purnomo','Kepala Gudang'], ['Mengetahui,','Ir. Bambang Trihartono','Direktur Operasional'])}
      </div>`;
    } else {
      const totalSales = orders.reduce((s, o) => s + o.total, 0);
      container.innerHTML = `<div class="print-document">${kop('LAPORAN PENJUALAN', 'Rekapitulasi Penjualan')}${chips([['Total Penjualan', window.taniStore.formatRupiah(totalSales), '#F59E0B'], ['Total Pesanan', orders.length + ' Pesanan']])}</div>`;
    }
  },

  printReport() {
    window.print();
  },

  // ==========================================
  // 4. BARANG MASUK
  // ==========================================
  renderBarangMasuk() {
    const list = window.taniStore.getBarangMasuk() || [];
    const tbody = document.getElementById('table-barangmasuk-tbody');
    if (!tbody) return;
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#8BA498;">Belum ada transaksi barang masuk.</td></tr>'; return; }
    tbody.innerHTML = list.map(e => `
      <tr>
        <td>${e.tanggalDatang}<div style="font-size:11px; color:#8BA498;">${e.pencatat ? 'Oleh ' + e.pencatat : ''}</div></td>
        <td><strong>${e.kodeBarang}</strong><div style="font-size:11px; color:#8BA498;">${e.namaBarang || ''}</div></td>
        <td><strong>${e.jumlahMasuk}</strong></td>
        <td>${e.satuan}</td>
        <td>${window.taniStore.formatRupiah(e.hargaSatuan)}</td>
        <td>${e.supplier}</td>
        <td><button class="btn btn-secondary btn-sm" style="color:#DC2626;" onclick="AdminApp.deleteBarangMasukConfirm('${e.id}')">Hapus</button></td>
      </tr>`).join('');
  },

  openAddBarangMasukModal() {
    const modal = document.getElementById('modal-add-barangmasuk');
    if (!modal) return;
    const products = window.taniStore.getProducts();
    const sel = document.getElementById('form-bm-produk');
    if (sel) sel.innerHTML = products.map(p => `<option value="${p.id}" data-unit="${p.unit}" data-price="${p.price}">${p.code || p.id} - ${p.name} (${p.categoryName || p.category || ''})</option>`).join('');
    if (document.getElementById('form-bm-tanggal')) document.getElementById('form-bm-tanggal').value = window.taniStore.getCurrentDateTime().replace(' ', 'T');
    if (document.getElementById('form-bm-jumlah')) document.getElementById('form-bm-jumlah').value = '';
    if (document.getElementById('form-bm-supplier')) document.getElementById('form-bm-supplier').value = '';
    if (sel && sel.options[0]) { document.getElementById('form-bm-harga').value = sel.options[0].getAttribute('data-price') || ''; this._bmSync(); }
    modal.classList.add('active');
  },

  _bmSync() {
    const sel = document.getElementById('form-bm-produk');
    if (!sel || !sel.value) return;
    const p = window.taniStore.getProductById(sel.value);
    if (!p) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('form-bm-kode', p.code || p.id);
    set('form-bm-kategori', this.productCategory(p));
    set('form-bm-stok-saat-ini', this.stockLine(p));
    set('form-bm-satuan', this.productFullUnit(p));
    if (document.getElementById('form-bm-harga') && !document.getElementById('form-bm-harga').value) set('form-bm-harga', p.price);
    const expiryEl = document.getElementById('form-bm-expiry'); if (expiryEl && !expiryEl.value) expiryEl.value = this.formatExpiry(p) === '-' ? '' : this.formatExpiry(p);
    const rakEl = document.getElementById('form-bm-rak'); if (rakEl && !rakEl.value) rakEl.value = p.shelfLocation || '';
  },

  saveBarangMasukForm() {
    const pid = document.getElementById('form-bm-produk').value;
    const p = window.taniStore.getProductById(pid);
    const jumlah = Number(document.getElementById('form-bm-jumlah').value);
    const harga = Number(document.getElementById('form-bm-harga').value);
    const tanggalRaw = document.getElementById('form-bm-tanggal').value || window.taniStore.getCurrentDateTime();
    const tanggal = tanggalRaw.includes(' ') ? tanggalRaw : tanggalRaw.replace('T', ' ');
    const supplier = (document.getElementById('form-bm-supplier').value || '').trim();
    const poNo = document.getElementById('form-bm-po') ? document.getElementById('form-bm-po').value.trim() : '';
    const batch = document.getElementById('form-bm-batch') ? document.getElementById('form-bm-batch').value.trim() : '';
    const keterangan = document.getElementById('form-bm-ket') ? document.getElementById('form-bm-ket').value.trim() : '';
    const expiry = document.getElementById('form-bm-expiry') ? document.getElementById('form-bm-expiry').value : '';
    const rak = document.getElementById('form-bm-rak') ? document.getElementById('form-bm-rak').value.trim() : '';
    const auth = window.taniStore.getAuth();
    if (!p || !(jumlah > 0) || !(harga >= 0) || !supplier) { TaniAuth.showToast('Lengkapi pilih produk, jumlah, harga & supplier', 'error'); return; }
    if (expiry) {
      const prods = window.taniStore.getProducts();
      const idx = prods.findIndex(x => x.id === p.id);
      if (idx >= 0) { prods[idx].expiryDate = expiry; window.taniStore.writeKey(window.taniStore.STORAGE_KEYS.PRODUCTS, prods); }
    }
    const entry = {
      id: 'BM-' + Date.now(),
      nomorTransaksi: 'BM-' + Date.now(),
      tanggalDatang: tanggal,
      kodeBarang: p.code || p.id,
      productId: p.id,
      namaBarang: p.name,
      kategori: this.productCategory(p),
      stokSebelum: p.stock,
      jumlahMasuk: jumlah, satuan: this.productFullUnit(p), hargaSatuan: harga, supplier,
      nomorPO: poNo, batchLot: batch, expiryDate: expiry, lokasiRak: rak || p.shelfLocation || '',
      keterangan, pencatat: auth ? auth.name : 'Admin'
    };
    window.taniStore.saveBarangMasuk(entry);
    window.taniStore.updateProductStock(p.id, jumlah, 'Masuk', 'Barang masuk dari ' + supplier + (poNo ? ' (' + poNo + ')' : '') + (keterangan ? ' - ' + keterangan : ''));
    if (poNo) this._syncPOFromBarangMasuk(poNo, p.id, jumlah);
    const after = window.taniStore.getProductById(p.id);
    this.closeAllModals();
    let msg = 'Barang masuk tercatat. Stok ' + (p.code || p.id) + ' sekarang ' + after.stock + '.';
    if (after.stock <= (after.minStockWarning || 20)) msg += ' Peringatan: stok di bawah batas minimum (' + (after.minStockWarning || 20) + ').';
    TaniAuth.showToast(msg, 'success');
    this.invalidateAllViews(); this.renderBarangMasuk();
    if (this.renderProduk) this.renderProduk();
    if (this.renderDasbor) this.renderDasbor();
    if (this.renderPO) this.renderPO();
  },

  _syncPOFromBarangMasuk(poId, productId, qty) {
    try {
      const po = window.taniStore.getPurchaseOrderById(poId);
      if (!po) return;
      if (!po.received) po.received = {};
      po.received[productId] = (po.received[productId] || 0) + qty;
      const totalOrdered = (po.items || []).reduce((s, it) => s + (it.jumlah || 0), 0);
      const totalReceived = Object.values(po.received).reduce((s, v) => s + v, 0);
      if (totalReceived >= totalOrdered) po.status = 'Selesai diterima';
      else if (totalReceived > 0) po.status = 'Sebagian diterima';
      window.taniStore.savePurchaseOrder(po);
    } catch (e) { }
  },

  deleteBarangMasukConfirm(id) {
    if (confirm('Hapus catatan barang masuk ini? Stok tidak dikurangi kembali.')) { window.taniStore.deleteBarangMasuk(id); TaniAuth.showToast('Catatan dihapus', 'info'); this.invalidateView('barangmasuk'); this.renderBarangMasuk(); }
  },

  // ==========================================
  // 5. BARANG KELUAR
  // ==========================================
  renderBarangKeluar() {
    const list = window.taniStore.getBarangKeluar() || [];
    const tbody = document.getElementById('table-barangkeluar-tbody');
    if (!tbody) return;
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:#8BA498;">Belum ada transaksi barang keluar.</td></tr>'; return; }
    tbody.innerHTML = list.map(e => `
      <tr>
        <td>${e.tanggalKeluar}<div style="font-size:11px; color:#8BA498;">${e.pencatat ? 'oleh ' + e.pencatat : ''}</div></td>
        <td><strong>${e.kodeBarang}</strong><div style="font-size:11px; color:#8BA498;">${e.namaBarang || ''}</div></td>
        <td><strong>${e.jumlahKeluar}</strong> <span style="font-size:11px; color:#8BA498;">${e.satuan}</span></td>
        <td>${window.taniStore.formatRupiah(e.harga)}</td>
        <td>${e.catatan || '-'}</td>
        <td><button class="btn btn-secondary btn-sm" style="color:#DC2626;" onclick="AdminApp.deleteBarangKeluarConfirm('${e.id}')">Hapus</button></td>
      </tr>`).join('');
  },

  openAddBarangKeluarModal() {
    const modal = document.getElementById('modal-add-barangkeluar');
    if (!modal) return;
    const products = window.taniStore.getProducts().filter(p => !window.taniStore.isProductExpired(p) && (p.stock || 0) > 0);
    const sel = document.getElementById('form-bk-produk');
    if (sel) sel.innerHTML = products.map(p => `<option value="${p.id}" data-unit="${p.unit}" data-price="${p.price}">${p.code || p.id} - ${p.name} (sisa ${p.stock})</option>`).join('') || '<option value="">Tidak ada stok tersedia (non-expired)</option>';
    if (document.getElementById('form-bk-tanggal')) document.getElementById('form-bk-tanggal').value = window.taniStore.getCurrentDateTime().replace(' ', 'T');
    if (document.getElementById('form-bk-jumlah')) document.getElementById('form-bk-jumlah').value = '';
    if (document.getElementById('form-bk-catatan')) document.getElementById('form-bk-catatan').value = '';
    if (sel && sel.options[0]) { document.getElementById('form-bk-harga').value = sel.options[0].getAttribute('data-price') || ''; this._bkSync(); }
    modal.classList.add('active');
  },

  _bkSync() {
    const sel = document.getElementById('form-bk-produk');
    if (!sel || !sel.value) return;
    const p = window.taniStore.getProductById(sel.value);
    if (!p) return;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('form-bk-kode', p.code || p.id);
    set('form-bk-stok-tersedia', this.stockLine(p));
    set('form-bk-satuan', this.productFullUnit(p));
    const rakEl = document.getElementById('form-bk-rak'); if (rakEl && !rakEl.value) rakEl.value = p.shelfLocation || '';
  },

  saveBarangKeluarForm() {
    const pid = document.getElementById('form-bk-produk').value;
    const p = window.taniStore.getProductById(pid);
    if (!p) { TaniAuth.showToast('Pilih barang terlebih dahulu', 'error'); return; }
    if (window.taniStore.isProductExpired(p)) { TaniAuth.showToast('Barang KEDALUWARSA — diblokir sistem, tidak bisa dikeluarkan', 'error'); return; }
    const jumlah = Number(document.getElementById('form-bk-jumlah').value);
    const harga = Number(document.getElementById('form-bk-harga').value);
    const tanggalRaw = document.getElementById('form-bk-tanggal').value || window.taniStore.getCurrentDateTime();
    const tanggal = tanggalRaw.includes(' ') ? tanggalRaw : tanggalRaw.replace('T', ' ');
    const keperluan = document.getElementById('form-bk-keperluan') ? document.getElementById('form-bk-keperluan').value.trim() : '';
    const penerima = document.getElementById('form-bk-penerima') ? document.getElementById('form-bk-penerima').value.trim() : '';
    const rak = document.getElementById('form-bk-rak') ? document.getElementById('form-bk-rak').value.trim() : (p.shelfLocation || '');
    const catatan = document.getElementById('form-bk-catatan') ? document.getElementById('form-bk-catatan').value.trim() : '';
    if (!(jumlah > 0)) { TaniAuth.showToast('Jumlah keluar harus lebih dari 0', 'error'); return; }
    if (jumlah > (p.stock || 0)) { TaniAuth.showToast('Transaksi ditolak: jumlah keluar (' + jumlah + ') melebihi stok tersedia (' + p.stock + ')', 'error'); return; }
    const auth = window.taniStore.getAuth();
    const entry = {
      id: 'BK-' + Date.now(), nomorTransaksi: 'BK-' + Date.now(), tanggalKeluar: tanggal,
      kodeBarang: p.code || p.id, productId: p.id, namaBarang: p.name,
      stokSebelum: p.stock, jumlahKeluar: jumlah, satuan: this.productFullUnit(p),
      harga: isNaN(harga) ? p.price : harga,
      keperluan, penerima, lokasiRak: rak,
      catatan: (keperluan ? keperluan + ' — ' : '') + (penerima ? 'Penerima: ' + penerima + '. ' : '') + catatan,
      pencatat: auth ? auth.name : 'Admin'
    };
    window.taniStore.saveBarangKeluar(entry);
    window.taniStore.updateProductStock(p.id, -jumlah, 'Keluar', entry.catatan || 'Barang keluar manual');
    const after = window.taniStore.getProductById(p.id);
    this.closeAllModals();
    let msg = 'Barang keluar tercatat. Stok ' + (p.code || p.id) + ' sekarang ' + after.stock + '.';
    if (after.stock <= (after.minStockWarning || 20)) msg += ' PERINGATAN: stok mencapai batas minimum (' + (after.minStockWarning || 20) + '). Segera restok!';
    TaniAuth.showToast(msg, after.stock <= (after.minStockWarning || 20) ? 'error' : 'success');
    this.invalidateAllViews(); this.renderBarangKeluar();
    if (this.renderProduk) this.renderProduk();
    if (this.renderDasbor) this.renderDasbor();
  },

  deleteBarangKeluarConfirm(id) {
    if (confirm('Hapus catatan barang keluar ini? Stok tidak dikembalikan.')) { window.taniStore.deleteBarangKeluar(id); TaniAuth.showToast('Catatan dihapus', 'info'); this.invalidateView('barangkeluar'); this.renderBarangKeluar(); }
  },

  // ==========================================
  // 6. STOCK CONTROL — gabungan Purchase Order & Stock Opname
  //    (tab terpisah di dalam 1 fitur, tanpa inline display:none
  //     agar tab benar-benar bisa dibuka)
  // ==========================================
  _stockControlTab: 'po',
  _stockControlTabInit: false,

  setStockControlTab(tab) {
    this._stockControlTab = tab || 'po';
    try { localStorage.setItem('tani_stockcontrol_tab', this._stockControlTab); } catch (e) {}
    this.renderStockControl();
  },

  renderStockControl() {
    if (!this._stockControlTabInit) {
      try {
        const saved = localStorage.getItem('tani_stockcontrol_tab');
        if (saved === 'po' || saved === 'stockopname') this._stockControlTab = saved;
      } catch (e) {}
      this._stockControlTabInit = true;
    }
    const tab = this._stockControlTab || 'po';
    document.querySelectorAll('.penjualan-tab[data-stockcontrol-tab]').forEach(el => {
      const active = el.getAttribute('data-stockcontrol-tab') === tab;
      el.classList.toggle('active', active);
      el.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.penjualan-panel[data-stockcontrol-panel]').forEach(p => {
      const on = p.getAttribute('data-stockcontrol-panel') === tab;
      p.classList.toggle('active', on);
      p.style.display = on ? 'block' : 'none';
    });
    if (tab === 'stockopname') this.renderStockOpname();
    else this.renderPO();
  },

  // ==========================================
  // 6a. PURCHASE ORDER (PO) — sub-tab dari Stock Control
  // ==========================================
  renderPO() {
    const list = window.taniStore.getPurchaseOrders() || [];
    const tbody = document.getElementById('table-po-tbody');
    if (!tbody) return;
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#8BA498;">Belum ada Purchase Order.</td></tr>'; return; }
    tbody.innerHTML = list.map(po => {
      const r = po.ringkasan || {};
      const received = po.received || {};
      const detail = (po.items || []).map(it => `${it.kodeBarang} x${it.jumlah} (${((received[it.productId || it.kodeBarang] || 0) + '/' + it.jumlah)})`).join(', ');
      return `
        <tr>
          <td><strong>${po.id}</strong><div style="font-size:11px; color:#8BA498;">${po.tanggalPembuatan}</div></td>
          <td>${po.supplier}<div style="font-size:11px; color:#8BA498;">${po.teleponSupplier || ''}</div></td>
          <td style="font-size:12px;">${detail}</td>
          <td><strong>${window.taniStore.formatRupiah(r.totalKeseluruhan || 0)}</strong></td>
          <td>${po.tanggalKirimDirencanakan || '-'}</td>
          <td><span class="badge ${po.status === 'Selesai diterima' || po.status === 'Selesai' ? 'badge-green' : (po.status === 'Dibatalkan' ? 'badge-red' : 'badge-orange')}">${po.status}</span></td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewPODetail('${po.id}')">Detail</button>
              ${['Draft','Dipesan'].includes(po.status) ? `<button class="btn btn-primary btn-sm" onclick="AdminApp.orderPO('${po.id}')">Proses Pesan</button>` : ''}
              ${po.status === 'Dipesan' || po.status === 'Sebagian diterima' ? `<button class="btn btn-secondary btn-sm" onclick="AdminApp.receivePOGoods('${po.id}')">Terima Barang</button>` : ''}
              ${!['Selesai diterima','Selesai','Dibatalkan'].includes(po.status) ? `<button class="btn btn-secondary btn-sm" onclick="AdminApp.cancelPO('${po.id}')">Batalkan</button>` : ''}
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewPODetail('${po.id}'); setTimeout(() => window.print(), 300)">Cetak PO</button>
              <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewPODetail('${po.id}'); setTimeout(() => window.print(), 300)">Unduh PDF</button>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  openAddPOModal() {
    const modal = document.getElementById('modal-add-po');
    if (!modal) return;
    if (document.getElementById('form-po-id')) document.getElementById('form-po-id').value = '';
    if (document.getElementById('form-po-tanggal')) document.getElementById('form-po-tanggal').value = new Date().toISOString().slice(0, 10);
    if (document.getElementById('form-po-supplier')) document.getElementById('form-po-supplier').value = '';
    if (document.getElementById('form-po-alamat')) document.getElementById('form-po-alamat').value = '';
    if (document.getElementById('form-po-telepon')) document.getElementById('form-po-telepon').value = '';
    if (document.getElementById('form-po-kirim')) document.getElementById('form-po-kirim').value = '';
    const rows = document.getElementById('po-detail-rows'); if (rows) rows.innerHTML = '';
    this.addPODetailRow();
    if (document.getElementById('form-po-diskon')) document.getElementById('form-po-diskon').value = 0;
    if (document.getElementById('form-po-pajak')) document.getElementById('form-po-pajak').value = 0;
    if (document.getElementById('form-po-ongkir')) document.getElementById('form-po-ongkir').value = 0;
    if (document.getElementById('po-summary-box')) document.getElementById('po-summary-box').innerHTML = 'Belum ada rincian.';
    modal.classList.add('active');
  },

  addPODetailRow() {
    const wrap = document.getElementById('po-detail-rows');
    if (!wrap) return;
    const products = window.taniStore.getProducts();
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns: 1.6fr 0.7fr 0.6fr 0.8fr 0.8fr auto; gap:8px; margin-bottom:8px; align-items:center;';
    row.innerHTML = `
      <select class="form-select po-prod" style="font-size:12px;">${products.map(p => `<option value="${p.id}" data-unit="${p.unit}" data-price="${p.price}">${p.code || p.id} - ${p.name} (${p.categoryName || p.category || ''})</option>`).join('')}</select>
      <input type="number" class="form-input po-jumlah" min="1" value="1" style="font-size:12px;" oninput="AdminApp.recalcPO()">
      <input type="text" class="form-input po-satuan" readonly style="font-size:12px;" value="">
      <input type="number" class="form-input po-harga" min="0" value="0" style="font-size:12px;" oninput="AdminApp.recalcPO()">
      <span class="po-subtotal" style="font-size:12px;">Rp 0</span>
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('div').remove(); AdminApp.recalcPO()">✕</button>`;
    wrap.appendChild(row);
    const sel = row.querySelector('.po-prod');
    sel.addEventListener('change', () => {
      row.querySelector('.po-satuan').value = sel.options[sel.selectedIndex].getAttribute('data-unit') || '';
      row.querySelector('.po-harga').value = sel.options[sel.selectedIndex].getAttribute('data-price') || 0;
      this.recalcPO();
    });
    sel.dispatchEvent(new Event('change'));
  },

  recalcPO() {
    let totalQty = 0, totalHarga = 0;
    document.querySelectorAll('#po-detail-rows > div').forEach(row => {
      const qty = Number(row.querySelector('.po-jumlah').value) || 0;
      const harga = Number(row.querySelector('.po-harga').value) || 0;
      const sub = qty * harga;
      row.querySelector('.po-subtotal').textContent = 'Rp ' + sub.toLocaleString('id-ID');
      totalQty += qty; totalHarga += sub;
    });
    const diskon = Number(document.getElementById('form-po-diskon') ? document.getElementById('form-po-diskon').value : 0) || 0;
    const pajak = Number(document.getElementById('form-po-pajak') ? document.getElementById('form-po-pajak').value : 0) || 0;
    const ongkir = Number(document.getElementById('form-po-ongkir') ? document.getElementById('form-po-ongkir').value : 0) || 0;
    const total = Math.max(0, totalHarga - diskon + pajak + ongkir);
    const box = document.getElementById('po-summary-box');
    if (box) box.innerHTML = `<div style="font-size:12px; color:#8BA498;">Total jumlah: ${totalQty} | Total harga: ${window.taniStore.formatRupiah(totalHarga)}<br>Diskon: -${window.taniStore.formatRupiah(diskon)} | Pajak: +${window.taniStore.formatRupiah(pajak)} | Ongkir: +${window.taniStore.formatRupiah(ongkir)}<br><strong style="color:#34D399;">Total pembayaran: ${window.taniStore.formatRupiah(total)}</strong></div>`;
    return { totalQty, totalHarga, diskon, pajak, ongkir, total };
  },

  savePOForm(status = 'Draft') {
    const supplier = (document.getElementById('form-po-supplier').value || '').trim();
    if (!supplier) { TaniAuth.showToast('Nama supplier wajib diisi', 'error'); return; }
    const items = [];
    document.querySelectorAll('#po-detail-rows > div').forEach(row => {
      const sel = row.querySelector('.po-prod');
      const pid = sel.value;
      const p = window.taniStore.getProductById(pid);
      const qty = Number(row.querySelector('.po-jumlah').value) || 0;
      const harga = Number(row.querySelector('.po-harga').value) || 0;
      if (p && qty > 0) items.push({ kodeBarang: p.code || p.id, productId: p.id, namaBarang: p.name, kategori: p.categoryName || p.category || '', jumlah: qty, satuan: p.unit, hargaSatuan: harga, subtotal: qty * harga });
    });
    if (items.length === 0) { TaniAuth.showToast('Tambahkan minimal 1 barang', 'error'); return; }
    const rec = this.recalcPO();
    const existingId = document.getElementById('form-po-id').value;
    const id = existingId || ('PO-' + new Date().toISOString().slice(0,10).replaceAll('-','') + '-' + String(Date.now()).slice(-4));
    const po = {
      id, tanggalPembuatan: document.getElementById('form-po-tanggal').value || new Date().toISOString().slice(0,10),
      supplier, alamatSupplier: document.getElementById('form-po-alamat').value.trim(), teleponSupplier: document.getElementById('form-po-telepon').value.trim(),
      tanggalKirimDirencanakan: document.getElementById('form-po-kirim').value || '', status,
      items, ringkasan: { totalJumlah: rec.totalQty, totalHarga: rec.totalHarga, diskon: rec.diskon, pajak: rec.pajak, biayaKirim: rec.ongkir, totalKeseluruhan: rec.total }
    };
    window.taniStore.savePurchaseOrder(po);
    this.closeAllModals();
    TaniAuth.showToast('PO ' + id + ' (' + status + ') disimpan. Stok BELUM bertambah — hanya via Barang Masuk.', 'success');
    this.invalidateView('stockcontrol'); this.renderStockControl();
  },

  viewPODetail(id) {
    const po = window.taniStore.getPurchaseOrderById(id);
    if (!po) return;
    const modal = document.getElementById('modal-po-detail');
    const content = document.getElementById('modal-po-detail-content');
    if (!modal || !content) return;
    const r = po.ringkasan || {};
    content.innerHTML = `
      <div class="print-document" style="border:none; box-shadow:none; padding:4px;">
        <div class="report-header-kop"><div class="kop-left"><h2>PT TANI SEJATI MANDIRI (Tani.SM)</h2><p>Gudang Pusat Klaten, Jawa Tengah</p></div><div class="kop-right"><strong>PURCHASE ORDER</strong><br>No: ${po.id}<br>Status: ${po.status}</div></div>
        <div class="report-meta-box"><div><strong>Supplier:</strong><br>${po.supplier}<br>${po.alamatSupplier || ''}<br>${po.teleponSupplier || ''}</div><div><strong>Tanggal PO:</strong> ${po.tanggalPembuatan}<br><strong>Rencana Kirim:</strong> ${po.tanggalKirimDirencanakan || '-'}</div></div>
        <table class="print-table"><thead><tr><th>Kode</th><th>Nama Barang</th><th>Kategori</th><th>Jumlah</th><th>Satuan</th><th>Harga Satuan</th><th>Subtotal</th></tr></thead>
        <tbody>${(po.items || []).map(it => `<tr><td>${it.kodeBarang}</td><td>${it.namaBarang}</td><td>${it.kategori}</td><td class="text-center">${it.jumlah}</td><td>${it.satuan}</td><td class="text-right">${window.taniStore.formatRupiah(it.hargaSatuan)}</td><td class="text-right">${window.taniStore.formatRupiah(it.subtotal)}</td></tr>`).join('')}
        <tr><td colspan="6" class="text-right">Total harga:</td><td class="text-right">${window.taniStore.formatRupiah(r.totalHarga || 0)}</td></tr>
        <tr><td colspan="6" class="text-right">Diskon:</td><td class="text-right">-${window.taniStore.formatRupiah(r.diskon || 0)}</td></tr>
        <tr><td colspan="6" class="text-right">Pajak:</td><td class="text-right">${window.taniStore.formatRupiah(r.pajak || 0)}</td></tr>
        <tr><td colspan="6" class="text-right">Biaya pengiriman:</td><td class="text-right">${window.taniStore.formatRupiah(r.biayaKirim || 0)}</td></tr>
        <tr style="background:#F3F4F6; font-weight:700;"><td colspan="6" class="text-right">TOTAL PEMBAYARAN:</td><td class="text-right">${window.taniStore.formatRupiah(r.totalKeseluruhan || 0)}</td></tr></tbody></table>
        <div class="report-signatures"><div class="sign-col">Dibuat Oleh,<div class="sign-line">Joko Purnomo</div>Admin Gudang</div><div class="sign-col">Disetujui Oleh,<div class="sign-line">Ir. Bambang Trihartono</div>Direktur Operasional</div></div>
      </div>`;
    modal.classList.add('active');
  },

  orderPO(id) {
    const po = window.taniStore.getPurchaseOrderById(id);
    if (!po) return;
    po.status = 'Dipesan';
    window.taniStore.savePurchaseOrder(po);
    TaniAuth.showToast('PO ' + id + ' diproses (Dipesan). Stok belum bertambah.', 'info');
    this.invalidateView('stockcontrol'); this.renderStockControl();
  },
  cancelPO(id) {
    if (!confirm('Batalkan PO ' + id + '?')) return;
    const po = window.taniStore.getPurchaseOrderById(id);
    if (!po) return;
    po.status = 'Dibatalkan';
    window.taniStore.savePurchaseOrder(po);
    TaniAuth.showToast('PO dibatalkan', 'info');
    this.invalidateView('stockcontrol'); this.renderStockControl();
  },
  receivePOGoods(id) {
    const po = window.taniStore.getPurchaseOrderById(id);
    if (!po) return;
    // Penerimaan barang: masukkan ke Barang Masuk (di sini stok baru bertambah)
    (po.items || []).forEach(it => {
      const pid = it.productId || it.kodeBarang;
      const p = window.taniStore.getProductById(pid);
      if (!p) return;
      const entry = { id: 'BM-' + Date.now() + '-' + pid, tanggalDatang: window.taniStore.getCurrentDateTime(), kodeBarang: p.code || p.id, productId: p.id, namaBarang: p.name, jumlahMasuk: it.jumlah, satuan: it.satuan, hargaSatuan: it.hargaSatuan, supplier: po.supplier, nomorPO: po.id, pencatat: 'Penerimaan PO' };
      window.taniStore.saveBarangMasuk(entry);
      window.taniStore.updateProductStock(p.id, it.jumlah, 'Masuk', 'Penerimaan ' + po.id + ' dari ' + po.supplier);
    });
    po.status = 'Selesai diterima';
    window.taniStore.savePurchaseOrder(po);
    TaniAuth.showToast('Penerimaan PO tercatat via Barang Masuk. Stok diperbarui.', 'success');
    this.invalidateAllViews(); this.renderPO();
    if (this.renderProduk) this.renderProduk();
  },

  // ==========================================
  // 6b. STOCK OPNAME — sub-tab dari Stock Control
  //     (stok hanya berubah setelah finalisasi)
  // ==========================================
  renderStockOpname() {
    const list = window.taniStore.getStockOpnames() || [];
    const tbody = document.getElementById('table-stockopname-tbody');
    if (!tbody) return;
    if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#8BA498;">Belum ada dokumen stock opname.</td></tr>'; return; }
    tbody.innerHTML = list.map(op => `
      <tr>
        <td><strong>${op.id}</strong><div style="font-size:11px; color:#8BA498;">${op.tanggalPemeriksaan}</div></td>
        <td>${op.petugas}</td>
        <td>${op.lokasi}</td>
        <td>${op.keterangan || '-'}</td>
        <td><span class="badge ${op.status === 'Disetujui' ? 'badge-green' : 'badge-orange'}">${op.status}</span></td>
        <td>${(op.items || []).length} SKU</td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewOpnameDetail('${op.id}')">Detail</button>
            ${op.status === 'Diajukan' || op.status === 'Menunggu Persetujuan' ? `<button class="btn btn-primary btn-sm" onclick="AdminApp.approveOpname('${op.id}')">Finalisasi & Penyesuaian</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="AdminApp.viewOpnameDetail('${op.id}'); setTimeout(()=>window.print(),300)">Cetak Laporan</button>
          </div>
        </td>
      </tr>`).join('');
  },

  startOpname() { this.openAddOpnameModal(); },

  openAddOpnameModal() {
    const modal = document.getElementById('modal-add-opname');
    if (!modal) return;
    if (document.getElementById('form-op-id')) document.getElementById('form-op-id').value = '';
    if (document.getElementById('form-op-tanggal')) document.getElementById('form-op-tanggal').value = new Date().toISOString().slice(0, 10);
    if (document.getElementById('form-op-petugas')) document.getElementById('form-op-petugas').value = '';
    if (document.getElementById('form-op-gudang')) document.getElementById('form-op-gudang').value = 'Gudang Pusat Tani.SM';
    if (document.getElementById('form-op-rak')) document.getElementById('form-op-rak').value = '';
    if (document.getElementById('form-op-kategori')) document.getElementById('form-op-kategori').value = '';
    if (document.getElementById('form-op-keterangan')) document.getElementById('form-op-keterangan').value = '';
    const rows = document.getElementById('opname-rows'); if (rows) rows.innerHTML = '';
    this.addOpnameRow();
    modal.classList.add('active');
  },

  addOpnameRow() {
    const wrap = document.getElementById('opname-rows');
    if (!wrap) return;
    const gudang = document.getElementById('form-op-gudang') ? document.getElementById('form-op-gudang').value : '';
    const rak = document.getElementById('form-op-rak') ? document.getElementById('form-op-rak').value : '';
    const kat = document.getElementById('form-op-kategori') ? document.getElementById('form-op-kategori').value : '';
    let products = window.taniStore.getProducts();
    if (rak) products = products.filter(p => (p.shelfLocation || '').toLowerCase().includes(rak.toLowerCase()));
    if (kat) products = products.filter(p => (p.categoryName || p.category || '').toLowerCase() === kat.toLowerCase());
    if (products.length === 0) products = window.taniStore.getProducts();
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns: 1.6fr 0.7fr 0.7fr 0.7fr 1fr auto; gap:8px; margin-bottom:8px; align-items:center;';
    row.innerHTML = `
      <select class="form-select op-prod" style="font-size:12px;">${products.map(p => `<option value="${p.id}" data-stock="${p.stock}">${p.code || p.id} - ${p.name}</option>`).join('')}</select>
      <input type="number" class="form-input op-sistem" readonly style="font-size:12px;" value="">
      <input type="number" class="form-input op-fisik" min="0" value="" placeholder="Fisik" style="font-size:12px;" oninput="AdminApp.recalcOpnameRow(this)">
      <input type="number" class="form-input op-selisih" readonly style="font-size:12px;" value="">
      <span class="op-hasil" style="font-size:11px;">-</span>
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('div').remove()">✕</button>`;
    wrap.appendChild(row);
    const sel = row.querySelector('.op-prod');
    sel.addEventListener('change', () => { row.querySelector('.op-sistem').value = sel.options[sel.selectedIndex].getAttribute('data-stock') || ''; this.recalcOpnameRow(row.querySelector('.op-fisik')); });
    sel.dispatchEvent(new Event('change'));
  },

  recalcOpnameRow(inputEl) {
    const row = inputEl.closest('div');
    const sistem = Number(row.querySelector('.op-sistem').value) || 0;
    const fisikRaw = row.querySelector('.op-fisik').value;
    if (fisikRaw === '' || fisikRaw === null) { row.querySelector('.op-selisih').value = ''; row.querySelector('.op-hasil').textContent = '-'; return; }
    const fisik = Number(fisikRaw) || 0;
    const selisih = fisik - sistem;
    row.querySelector('.op-selisih').value = (selisih > 0 ? '+' : '') + selisih;
    row.querySelector('.op-hasil').textContent = selisih === 0 ? 'Sesuai' : (selisih < 0 ? 'Selisih minus (kurang)' : 'Selisih plus (lebih)');
  },

  saveOpname(status = 'Diajukan') {
    const petugas = (document.getElementById('form-op-petugas').value || '').trim();
    if (!petugas) { TaniAuth.showToast('Nama petugas wajib diisi', 'error'); return; }
    const gudang = document.getElementById('form-op-gudang') ? document.getElementById('form-op-gudang').value.trim() : '';
    const rak = document.getElementById('form-op-rak') ? document.getElementById('form-op-rak').value.trim() : '';
    const kategori = document.getElementById('form-op-kategori') ? document.getElementById('form-op-kategori').value.trim() : '';
    const lokasi = [gudang, rak ? 'Rak ' + rak : '', kategori ? 'Kategori: ' + kategori : ''].filter(Boolean).join(' | ');
    const items = [];
    document.querySelectorAll('#opname-rows > div').forEach(row => {
      const sel = row.querySelector('.op-prod');
      const pid = sel.value;
      const p = window.taniStore.getProductById(pid);
      const sistem = Number(row.querySelector('.op-sistem').value) || 0;
      const fisikRaw = row.querySelector('.op-fisik').value;
      if (!p || fisikRaw === '') return;
      const fisik = Number(fisikRaw) || 0;
      items.push({ kodeBarang: p.code || p.id, productId: p.id, namaBarang: p.name, stokSistem: sistem, stokFisik: fisik, selisih: fisik - sistem });
    });
    if (items.length === 0) { TaniAuth.showToast('Tambahkan minimal 1 barang dengan stok fisik', 'error'); return; }
    // STOK TIDAK DIUBAH di sini — hanya disimpan. Penyesuaian terjadi di approveOpname.
    const existingId = document.getElementById('form-op-id').value;
    const id = existingId || ('OP-' + new Date().toISOString().slice(0,10).replaceAll('-','') + '-' + String(Date.now()).slice(-4));
    const op = { id, tanggalPemeriksaan: document.getElementById('form-op-tanggal').value || new Date().toISOString().slice(0,10), petugas, lokasi: lokasi || '-', keterangan: document.getElementById('form-op-keterangan').value.trim(), status, items };
    window.taniStore.saveStockOpname(op);
    this.closeAllModals();
    TaniAuth.showToast('Pemeriksaan ' + id + ' disimpan (' + status + '). Stok belum berubah sampai difinalisasi.', 'success');
    this.invalidateView('stockcontrol'); this.renderStockControl();
  },

  viewOpnameDetail(id) {
    const op = window.taniStore.getStockOpnameById(id);
    if (!op) return;
    const modal = document.getElementById('modal-opname-detail');
    const content = document.getElementById('modal-opname-detail-content');
    if (!modal || !content) return;
    const kurang = op.items.filter(i => i.selisih < 0).length, lebih = op.items.filter(i => i.selisih > 0).length, sesuai = op.items.filter(i => i.selisih === 0).length;
    content.innerHTML = `
      <div class="print-document" style="border:none; box-shadow:none; padding:4px;">
        <div class="report-header-kop"><div class="kop-left"><h2>PT TANI SEJATI MANDIRI (Tani.SM)</h2><p>Laporan Stock Opname Gudang</p></div><div class="kop-right"><strong>STOCK OPNAME</strong><br>No: ${op.id}<br>Status: ${op.status}</div></div>
        <div class="report-meta-box"><div><strong>Tanggal:</strong> ${op.tanggalPemeriksaan}<br><strong>Petugas:</strong> ${op.petugas}</div><div><strong>Lokasi:</strong> ${op.lokasi}<br><strong>Keterangan:</strong> ${op.keterangan || '-'}</div></div>
        <div style="font-size:12px; margin-bottom:12px;">Ringkasan: <strong>${sesuai} Sesuai</strong> • <strong>${kurang} Selisih minus</strong> • <strong>${lebih} Selisih plus</strong></div>
        <table class="print-table"><thead><tr><th>Kode Barang</th><th>Nama Barang</th><th>Stok Sistem</th><th>Stok Fisik</th><th>Selisih</th><th>Hasil</th></tr></thead>
        <tbody>${(op.items || []).map(it => { const h = it.selisih === 0 ? 'Sesuai' : (it.selisih < 0 ? 'Selisih minus' : 'Selisih plus'); return `<tr><td>${it.kodeBarang}</td><td>${it.namaBarang}</td><td class="text-center">${it.stokSistem}</td><td class="text-center">${it.stokFisik}</td><td class="text-center">${it.selisih > 0 ? '+' + it.selisih : it.selisih}</td><td>${h}</td></tr>`; }).join('')}</tbody></table>
        <div class="report-signatures"><div class="sign-col">Petugas Pemeriksa,<div class="sign-line">${op.petugas}</div></div><div class="sign-col">Admin / Atasan,<div class="sign-line">Joko Purnomo</div>Kepala Gudang</div></div>
      </div>`;
    modal.classList.add('active');
  },

  approveOpname(id) {
    const op = window.taniStore.getStockOpnameById(id);
    if (!op) return;
    const kurang = op.items.filter(i => i.selisih < 0).length, lebih = op.items.filter(i => i.selisih > 0).length, sesuai = op.items.filter(i => i.selisih === 0).length;
    if (!confirm(`Finalisasi penyesuaian stok?\nSesuai: ${sesuai} • Selisih minus: ${kurang} • Selisih plus: ${lebih}\n\nStok sistem akan disamakan dengan stok fisik.`)) return;
    (op.items || []).forEach(it => {
      const pid = it.productId || it.kodeBarang;
      const p = window.taniStore.getProductById(pid);
      if (!p) return;
      if (window.taniStore.isProductExpired(p)) return;
      const delta = (Number(it.stokFisik) || 0) - (Number(p.stock) || 0);
      if (delta !== 0) window.taniStore.updateProductStock(p.id, delta, 'Penyesuaian', 'Stock opname ' + op.id + ' oleh ' + op.petugas);
    });
    op.status = 'Disetujui';
    window.taniStore.saveStockOpname(op);
    TaniAuth.showToast('Penyesuaian stok disetujui. Stok sistem diperbarui.', 'success');
    this.invalidateAllViews(); this.renderStockOpname();
    if (this.renderProduk) this.renderProduk();
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
};

window.AdminApp = AdminApp;
