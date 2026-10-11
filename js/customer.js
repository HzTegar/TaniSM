/**
 * Tani.SM - Customer Portal Controller
 * Mengelola Beranda, Katalog, Detail Produk, Keranjang, Checkout,
 * Pesanan, Pelacakan, Wishlist, Ulasan, Tips, dan Profil Petani.
 */

// Gambar cadangan saat foto produk gagal dimuat (data URI, tanpa request jaringan).
const FALLBACK_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='300' height='300' fill='%232E7D32'/><text x='50%25' y='46%25' dominant-baseline='middle' text-anchor='middle' fill='%23FFFFFF' font-family='sans-serif' font-size='22' font-weight='bold'>Tani.SM</text><text x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' fill='%23A7F3D0' font-family='sans-serif' font-size='14'>Sarana Pertanian</text></svg>";

// --- Helper murni (tidak akses DOM/localStorage, aman dipanggil sesuka hati) ---

// Persentase diskon dari harga coret, 0 bila tidak ada diskon.
function discountPercent(product) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
}

// Estimasi poin yang didapat dari pembelian sebuah produk.
function estimatePoints(price, tierInfo, settings) {
  const ratio = Number(settings.pointsPerRupiah) || 10000;
  return Math.floor((price / ratio) * (tierInfo.pointsMultiplier || 1.0));
}

// Subtotal, berat total, dan jumlah item dari sekumpulan item keranjang.
function sumCart(cart) {
  let subtotal = 0;
  let totalWeight = 0;
  let count = 0;
  for (const item of cart) {
    subtotal += item.price * item.qty;
    totalWeight += (item.weightGram || 1000) * item.qty;
    count += item.qty;
  }
  return { subtotal, totalWeight, totalWeightKg: totalWeight / 1000, count };
}

// Nilai diskon dari voucher yang sudah diterapkan.
function calcVoucherDiscount(voucher, subtotal) {
  if (!voucher) return 0;
  if (voucher.discountFlat) return voucher.discountFlat;
  if (voucher.discountPercent) {
    let amount = (subtotal * voucher.discountPercent) / 100;
    if (voucher.maxDiscount && amount > voucher.maxDiscount) amount = voucher.maxDiscount;
    return amount;
  }
  return 0;
}

// Ongkos kirim: tarif dasar + Rp3.000 per kg tambahan.
function calcShipping(totalWeightGram, courierRate = 25000) {
  const rate = Number(courierRate) || 25000;
  const kg = Math.max(1, Math.ceil(totalWeightGram / 1000));
  return Math.max(rate, rate + (kg - 1) * 3000);
}

// Jumlah produk per halaman katalog. Cukup kecil agar render terasa instan,
// cukup besar supaya user jarang perlu scroll pagination.
const PAGE_SIZE = 12;

// Comparator sorting katalog (dipisah agar switch-case bersih di renderCatalog).
const catalogComparators = {
  related: () => 0,
  popular: (a, b) => b.soldCount - a.soldCount,
  'price-low': (a, b) => a.price - b.price,
  'price-high': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating
};

document.addEventListener('DOMContentLoaded', () => {
  CustomerApp.init();
});

const CustomerApp = {
  activeView: 'dasbor',
  currentCategoryFilter: 'all',
  currentSort: 'related',
  currentPage: 1,
  priceMin: null,
  priceMax: null,
  ratingFilter: null,
  searchQuery: '',
  appliedVoucher: null,

  // Peta view -> method renderer. Dipakai switchView() supaya tidak perlu
  // rantai if/if dan mudah ditambah view baru.
  VIEWS: {
    dasbor: 'renderDasbor',
    catalog: 'renderCatalog',
    cart: 'renderCart',
    checkout: 'renderCheckout',
    orders: 'renderOrders',
    tracking: 'renderTracking',
    wishlist: 'renderWishlist',
    reviews: 'renderReviews',
    tips: 'renderTips',
    profile: 'renderProfile'
  },

  // View yang data-nya berubah dan wajib di-render ulang walau belum pindah view.
  dirtyViews: new Set(),

  // View yang sudah pernah di-render. Mencegah render ulang saat user
  // pindah ke view lain lalu kembali tanpa ada perubahan data.
  renderedViews: {},

  init() {
    this.bindEvents();
    this.renderHeaderUserInfo();
    this.updateCartBadge();

    // Check URL parameters for direct view, product, or blocked admin attempt
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    const productId = urlParams.get('product');
    const isBlocked = urlParams.get('blocked');

    if (isBlocked === 'admin') {
      setTimeout(() => {
        TaniAuth.showAccessDeniedModal();
        TaniAuth.showToast('Akses Ditolak: Akun Petani tidak memiliki izin membuka halaman Admin Gudang.', 'error');
      }, 300);
    }

    // Hanya render view yang benar-benar dibuka. Semua view lain
    // ditunda sampai pertama kali dinavigasi (lazy render).
    this.switchView(view || 'dasbor', { force: true });

    if (productId) {
      this.openProductDetail(productId);
    }
  },

  // Tandai view perlu di-render ulang (dipanggil setelah data berubah).
  invalidateView(viewName) {
    if (viewName) {
      this.dirtyViews.add(viewName);
    } else {
      this.dirtyViews.clear();
    }
  },

  // Bersihkan cache render untuk semua view (dipakai setelah mutasi data besar,
  // mis. checkout berhasil / admin mengubah produk).
  invalidateAllViews() {
    this.dirtyViews = new Set(Object.keys(this.VIEWS));
  },

  toggleMobileSidebar(force) {
    const sidebar = document.querySelector('.customer-sidebar') || document.getElementById('customer-sidebar');
    const backdrop = document.getElementById('customer-sidebar-backdrop');
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

  bindEvents() {
    // Nav bar tab switching (supports .customer-nav-item and legacy .nav-item)
    document.querySelectorAll('.customer-nav-item, .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Header search form if present
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('search-input') || document.getElementById('customer-search-input');
        if (input) {
          this.searchQuery = input.value.trim().toLowerCase();
          this.currentPage = 1;
          this.switchView('catalog', { force: true });
        }
      });
    }

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

  // Debounce: kolom pencarian memicu oninput tiap ketikan. Menunda render
  // 250ms supaya tidak render ulang katalog untuk setiap huruf.
  handleGlobalSearch(e) {
    const q = (e.target.value || '').toLowerCase().trim();
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => this._runSearch(q), 250);
  },

  _runSearch(q) {
    this.searchQuery = q;

    if (this.activeView === 'dasbor') {
      if (!q) {
        this.renderDasbor();
        return;
      }
      const products = window.taniStore.getProducts();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description && p.description.toLowerCase().includes(q))
      );
      const listEl = document.getElementById('cust-recent-products-list');
      if (listEl) {
        if (filtered.length === 0) {
          listEl.innerHTML = '<div class="empty-state-text">Produk tidak ditemukan.</div>';
        } else {
          listEl.innerHTML = filtered.map(p => `
            <div class="activity-item" onclick="CustomerApp.openProductDetail('${p.id}')" style="cursor: pointer;">
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
      const catalogInput = document.getElementById('catalog-search-input');
      if (catalogInput) catalogInput.value = q;
      this.currentPage = 1;
      // switchView sudah menangani render; tidak perlu renderCatalog() dua kali.
      this.switchView('catalog', { force: true });
    }
  },

  switchView(viewName, opts = {}) {
    if (viewName === 'logout') {
      if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
        TaniAuth.logout('customer');
      }
      return;
    }

    if (viewName === 'home') {
      viewName = 'dasbor';
    }

    const isSameView = this.activeView === viewName;
    this.activeView = viewName;
    this.toggleMobileSidebar(false);

    // Update active nav link
    document.querySelectorAll('.customer-nav-item, .nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    // Hide all views and show active view
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
      if (!isSameView || opts.force) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Render hanya bila: pertama kali dibuka, data ditandai dirty, atau dipaksa.
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

  renderHeaderUserInfo() {
    const auth = window.taniStore.getAuth();
    const nameEl = document.getElementById('customer-top-user-name');
    const roleEl = document.getElementById('customer-top-user-role');
    const userDisplay = document.getElementById('header-user-display');
    const roleTagDisplay = document.getElementById('role-tag-display');
    const actionLinks = document.getElementById('role-action-links');
    const tierBadge = document.getElementById('customer-tier-badge');
    const pointsBadge = document.getElementById('customer-points-badge');

    if (nameEl) nameEl.textContent = auth ? auth.name || 'customer' : 'customer';
    if (roleEl) roleEl.textContent = auth && auth.role === 'admin' ? 'Admin Gudang' : (auth && auth.kelompokTani ? `Petani (${auth.kelompokTani})` : 'Customer');

    if (auth) {
      const tierInfo = window.taniStore.getTierInfo(auth.tier || 'silver');
      if (tierBadge) {
        tierBadge.textContent = `${tierInfo.badge} ${tierInfo.name}`;
        tierBadge.className = `member-tier-pill tier-${tierInfo.key}`;
      }
      if (pointsBadge) {
        pointsBadge.textContent = `• ${(auth.points || 0).toLocaleString('id-ID')} Poin`;
      }

      if (auth.role === 'admin') {
        // Admin viewing customer portal (Allowed!)
        if (roleTagDisplay) {
          roleTagDisplay.textContent = 'Admin Gudang (Akses Penuh)';
          roleTagDisplay.style.backgroundColor = '#065F46';
          roleTagDisplay.style.color = '#A7F3D0';
        }
        if (userDisplay) {
          userDisplay.innerHTML = `<strong>${auth.name}</strong> (${auth.title || 'Kepala Gudang'}) - <em>Mode Akses Bebas</em>`;
        }
        if (actionLinks) {
          actionLinks.innerHTML = `
            <a href="admin.html" style="background:#10B981; color:#064E3B; padding:3px 10px; border-radius:3px; font-weight:800; text-decoration:none;">&larr; Kembali ke Panel Admin Gudang</a>
            <span style="color: #4B5563; margin: 0 6px;">|</span>
            <a href="javascript:void(0)" onclick="CustomerApp.switchView('logout')" style="color: #F87171;">Keluar</a>
          `;
        }
      } else {
        // Customer viewing customer portal (Allowed!)
        if (roleTagDisplay) {
          roleTagDisplay.textContent = `Member ${tierInfo.name} ${tierInfo.badge}`;
          roleTagDisplay.style.backgroundColor = '#062817';
          roleTagDisplay.style.color = tierInfo.color || '#34D399';
        }
        if (userDisplay) {
          userDisplay.innerHTML = `${auth.name} ${auth.kelompokTani ? `(${auth.kelompokTani})` : ''} • <strong style="color:#34D399;">${(auth.points || 0).toLocaleString('id-ID')} Poin</strong>`;
        }
        if (actionLinks) {
          actionLinks.innerHTML = `
            <a href="javascript:void(0)" onclick="CustomerApp.openMemberBenefitsModal()" style="color: #34D399; margin-right: 12px; font-weight: 600;">💎 Benefit Member</a>
            <a href="javascript:void(0)" onclick="CustomerApp.switchView('logout')" style="color: #F87171;">Keluar / Ganti Akun</a>
          `;
        }
      }
    }
  },

  updateCartBadge() {
    const cart = window.taniStore.getCart();
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(b => {
      b.textContent = totalQty;
    });
  },

  // ==========================================
  // 1. DASBOR (SESUAI GAMBAR REFERENSI PELANGGAN)
  // ==========================================
  renderDasbor() {
    const orders = window.taniStore.getOrders();
    const products = window.taniStore.getProducts();

    // 4 KPI Metrics sesuai gambar referensi
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const elProducts = document.getElementById('cust-metric-products');
    const elStock = document.getElementById('cust-metric-stock');
    const elOrders = document.getElementById('cust-metric-orders');
    const elSales = document.getElementById('cust-metric-sales');

    if (elProducts) elProducts.textContent = totalProducts;
    if (elStock) elStock.textContent = totalStock;
    if (elOrders) elOrders.textContent = totalOrders;
    if (elSales) elSales.textContent = window.taniStore.formatRupiah(totalSales);

    // Render Member Card in Dasbor
    const auth = window.taniStore.getAuth();
    if (auth && auth.role === 'customer') {
      const tierInfo = window.taniStore.getTierInfo(auth.tier || 'silver');
      const settings = window.taniStore.getMemberSettings();
      const periodSpend = window.taniStore.calculateCustomerPeriodSpend(auth.id, settings.evaluationPeriodDays);

      const tierBadgeEl = document.getElementById('cust-card-tier-badge');
      const tierNameEl = document.getElementById('cust-card-tier-name');
      const pointsEl = document.getElementById('cust-card-points');
      const progressTextEl = document.getElementById('cust-card-progress-text');
      const periodSpendEl = document.getElementById('cust-card-period-spend');
      const progressBarEl = document.getElementById('cust-card-progress-bar');
      const perksPreviewEl = document.getElementById('cust-card-perks-preview');

      if (tierBadgeEl) tierBadgeEl.textContent = tierInfo.badge;
      if (tierNameEl) tierNameEl.textContent = `MEMBER ${tierInfo.name}`;
      if (pointsEl) pointsEl.textContent = `${(auth.points || 0).toLocaleString('id-ID')} Poin`;
      if (periodSpendEl) periodSpendEl.textContent = `Aktivitas ${settings.evaluationPeriodDays || 90} Hari: ${window.taniStore.formatRupiah(periodSpend)}`;

      let progressPct = 100;
      if (tierInfo.key === 'silver') {
        const needed = Math.max(0, Number(settings.goldMinSpend) - periodSpend);
        if (needed > 0) {
          if (progressTextEl) progressTextEl.textContent = `Belanja ${window.taniStore.formatRupiah(needed)} lagi untuk naik ke Gold 🥇`;
          progressPct = Math.min(100, Math.round((periodSpend / Number(settings.goldMinSpend)) * 100));
        } else {
          if (progressTextEl) progressTextEl.textContent = `Target Gold terpenuhi! Level akan naik saat evaluasi berkala 🥇`;
          progressPct = 100;
        }
      } else if (tierInfo.key === 'gold') {
        const needed = Math.max(0, Number(settings.platinumMinSpend) - periodSpend);
        if (needed > 0) {
          if (progressTextEl) progressTextEl.textContent = `Belanja ${window.taniStore.formatRupiah(needed)} lagi untuk naik ke Platinum 💎`;
          progressPct = Math.min(100, Math.round((periodSpend / Number(settings.platinumMinSpend)) * 100));
        } else {
          if (progressTextEl) progressTextEl.textContent = `Target Platinum terpenuhi! Level akan naik saat evaluasi berkala 💎`;
          progressPct = 100;
        }
      } else if (tierInfo.key === 'platinum') {
        if (progressTextEl) progressTextEl.textContent = `💎 Level Tertinggi Tercapai! Nikmati semua benefit prioritas & bonus produk.`;
        progressPct = 100;
      }

      if (progressBarEl) progressBarEl.style.width = `${progressPct}%`;
      if (perksPreviewEl) {
        perksPreviewEl.innerHTML = tierInfo.perks.slice(0, 3).map(p => `
          <span class="perk-chip">✓ ${p}</span>
        `).join('');
      }
    }

    // Kolom 1: Produk Terbaru
    const recentProductsEl = document.getElementById('cust-recent-products-list');
    if (recentProductsEl) {
      recentProductsEl.innerHTML = products.slice(0, 5).map(p => `
        <div class="activity-item" onclick="CustomerApp.openProductDetail('${p.id}')" style="cursor: pointer;">
          <div class="activity-item-name">
            ${p.image ? `<img src="${p.image}" class="activity-item-thumb" alt="${p.name}" onerror="this.style.display='none'">` : ''}
            <span style="font-weight: 500;">${p.name}</span>
          </div>
          <div class="activity-item-price">${window.taniStore.formatRupiah(p.price)}</div>
        </div>
      `).join('');
    }

    // Kolom 2: Pesanan Terbaru
    const recentOrdersEl = document.getElementById('cust-recent-orders-list');
    if (recentOrdersEl) {
      if (orders.length === 0) {
        recentOrdersEl.innerHTML = '<div class="empty-state-text">Belum ada pesanan.</div>';
      } else {
        recentOrdersEl.innerHTML = orders.slice(0, 5).map(o => `
          <div class="activity-item" onclick="CustomerApp.openTrackingForOrder('${o.id}')" style="cursor: pointer;">
            <div class="activity-item-name">
              <span style="font-weight: 600;">${o.id}</span>
              <span style="color: #8BA498; font-size: 12px; margin-left: 6px;">${o.date ? new Date(o.date).toLocaleDateString('id-ID') : '-'}</span>
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

  renderHome() {
    this.renderDasbor();
  },

  filterByCategory(catId) {
    this.currentCategoryFilter = catId;
    this.currentPage = 1;
    this.switchView('catalog', { force: true });
  },

  // ==========================================
  // 2. KATALOG PRODUK
  // ==========================================
  renderCatalog() {
    const products = window.taniStore.getProducts();
    const categories = window.taniStore.getCategories();

    // Render Category Sidebar Filter
    const catSidebar = document.getElementById('catalog-cat-filters');
    if (catSidebar) {
      catSidebar.innerHTML = `
        <label class="filter-option">
          <input type="radio" name="cat-filter" value="all" ${this.currentCategoryFilter === 'all' ? 'checked' : ''} onchange="CustomerApp.setCatalogCat('all')">
          <span>Semua Kategori</span>
        </label>
        ${categories.map(c => `
          <label class="filter-option">
            <input type="radio" name="cat-filter" value="${c.id}" ${this.currentCategoryFilter === c.id ? 'checked' : ''} onchange="CustomerApp.setCatalogCat('${c.id}')">
            <span>${c.name}</span>
          </label>
        `).join('')}
      `;
    }

    // Filtering + Sorting
    const filtered = products
      .filter(p => this._matchProduct(p))
      .sort(catalogComparators[this.currentSort] || catalogComparators.related);

    // Pagination: render sebagian produk per halaman agar DOM tidak membengkak
    // dan navigasi antar halaman terasa ringan.
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    this.currentPage = Math.min(Math.max(1, this.currentPage || 1), totalPages);
    const startIdx = (this.currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    const container = document.getElementById('catalog-products-grid');
    const countLabel = document.getElementById('catalog-result-count');
    if (countLabel) {
      countLabel.textContent = filtered.length > PAGE_SIZE
        ? `Menampilkan ${startIdx + 1}-${startIdx + pageItems.length} dari ${filtered.length} produk pertanian pilihan`
        : `Menampilkan ${filtered.length} produk pertanian pilihan`;
    }

    if (container) {
      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="catalog-empty">
            <p class="catalog-empty-title">Tidak ditemukan sarana pertanian yang sesuai filter.</p>
            <p class="catalog-empty-desc">Coba gunakan kata kunci lain seperti benih, pupuk, sprayer, atau reset filter harga.</p>
            <button class="btn btn-secondary btn-sm catalog-empty-reset" onclick="CustomerApp.resetCatalogFilters()">Reset Semua Filter</button>
          </div>
        `;
      } else {
        // Satu context dipakai seluruh kartu di halaman ini (lihat _buildCardContext).
        const ctx = this._buildCardContext();
        container.innerHTML = pageItems.map(p => this.createProductCardHtml(p, ctx)).join('');
      }
    }

    this._renderCatalogPagination(filtered.length, totalPages);
  },

  _renderCatalogPagination(totalItems, totalPages) {
    const pager = document.getElementById('catalog-pagination');
    if (!pager) return;
    if (totalPages <= 1) {
      pager.innerHTML = '';
      return;
    }

    const cur = this.currentPage;
    const btn = (label, page, opts = {}) => `
      <button class="page-btn ${opts.active ? 'active' : ''}" ${opts.disabled ? 'disabled' : ''}
              onclick="CustomerApp.goToCatalogPage(${page})">${label}</button>
    `;

    // Tampilkan maksimal 5 nomor halaman di sekitar halaman aktif.
    const span = 2;
    const from = Math.max(1, cur - span);
    const to = Math.min(totalPages, cur + span);
    const pages = [btn('‹', cur - 1, { disabled: cur === 1 })];
    if (from > 1) pages.push(btn('1', 1));
    if (from > 2) pages.push('<span class="page-gap">…</span>');
    for (let p = from; p <= to; p++) pages.push(btn(p, p, { active: p === cur }));
    if (to < totalPages - 1) pages.push('<span class="page-gap">…</span>');
    if (to < totalPages) pages.push(btn(totalPages, totalPages));
    pages.push(btn('›', cur + 1, { disabled: cur === totalPages }));

    pager.innerHTML = `
      <span class="page-info">Halaman ${cur} dari ${totalPages} · ${totalItems} produk</span>
      <div class="page-controls">${pages.join('')}</div>
    `;
  },

  goToCatalogPage(page) {
    this.currentPage = page;
    this.renderCatalog();
    const main = document.querySelector('.customer-main') || document.getElementById('view-catalog');
    if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // Predicate filter katalog (dipisah agar ringkas & mudah diuji).
  _matchProduct(p) {
    if (this.currentCategoryFilter !== 'all' && p.categoryId !== this.currentCategoryFilter) return false;
    if (this.priceMin !== null && p.price < this.priceMin) return false;
    if (this.priceMax !== null && p.price > this.priceMax) return false;
    if (this.ratingFilter !== null && p.rating < this.ratingFilter) return false;

    if (this.searchQuery) {
      const q = this.searchQuery;
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description && p.description.toLowerCase().includes(q);
      const matchIng = p.activeIngredient && p.activeIngredient.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchIng) return false;
    }
    return true;
  },

  setCatalogCat(catId) {
    this.currentCategoryFilter = catId;
    this.currentPage = 1;
    this.renderCatalog();
  },

  setSort(sortType) {
    this.currentSort = sortType;
    this.currentPage = 1;
    document.querySelectorAll('.sort-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-sort') === sortType);
    });
    this.renderCatalog();
  },

  applyPriceFilter() {
    const minInput = document.getElementById('filter-price-min');
    const maxInput = document.getElementById('filter-price-max');
    this.priceMin = minInput && minInput.value ? Number(minInput.value) : null;
    this.priceMax = maxInput && maxInput.value ? Number(maxInput.value) : null;
    this.currentPage = 1;
    this.renderCatalog();
  },

  applyRatingFilter(minRating) {
    this.ratingFilter = minRating;
    this.currentPage = 1;
    this.renderCatalog();
  },

  resetCatalogFilters() {
    this.currentCategoryFilter = 'all';
    this.searchQuery = '';
    this.priceMin = null;
    this.priceMax = null;
    this.ratingFilter = null;
    this.currentSort = 'related';
    this.currentPage = 1;

    const sInput = document.getElementById('search-input');
    if (sInput) sInput.value = '';
    const minInput = document.getElementById('filter-price-min');
    if (minInput) minInput.value = '';
    const maxInput = document.getElementById('filter-price-max');
    if (maxInput) maxInput.value = '';

    this.renderCatalog();
  },

  // Helper card generator.
  // `ctx` (opsional) berisi nilai yang sama untuk seluruh kartu dalam satu render,
  // supaya tidak dihitung ulang berkali-kali.
  createProductCardHtml(product, ctx = null) {
    const cache = ctx || this._buildCardContext();

    const discPercent = discountPercent(product);

    let badgeClass = 'badge-orange';
    if (product.badge === 'Organik') badgeClass = 'badge-green';
    if (product.badge === 'Official') badgeClass = 'badge-blue';

    const isBonusProduct = (cache.settings.freeProductId === product.id);
    const estPoints = estimatePoints(product.price, cache.tierInfo, cache.settings);

    return `
      <div class="product-card" onclick="CustomerApp.openProductDetail('${product.id}')">
        <div class="product-card-image-wrap">
          <img src="${product.image}" alt="${product.name}" class="product-card-image" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_IMAGE}'">
          ${product.badge ? `<span class="badge ${badgeClass} product-card-badge">${product.badge}</span>` : ''}
          ${isBonusProduct ? `<span class="badge product-card-bonus-badge">🎁 Bonus Platinum</span>` : ''}
          ${discPercent > 0 ? `<span class="badge badge-orange product-card-disc-badge">-${discPercent}%</span>` : ''}
        </div>
        <div class="product-card-body">
          <h4 class="product-card-title">${product.name}</h4>
          <div class="product-card-unit">${product.unit}</div>
          <div class="product-card-price-row">
            <span class="product-card-price">${window.taniStore.formatRupiah(product.price)}</span>
            ${product.originalPrice && product.originalPrice > product.price ? `<span class="product-card-strike">${window.taniStore.formatRupiah(product.originalPrice)}</span>` : ''}
          </div>
          ${product.memberPrice ? `
            <div class="product-card-member-price">
              🏷️ Member: ${window.taniStore.formatRupiah(product.memberPrice)}
            </div>
          ` : ''}
          <div class="product-card-meta">
            <span class="product-card-rating">★ ${product.rating} (${product.soldCount} terjual)</span>
            <span class="product-card-points">+${estPoints} Poin</span>
          </div>
        </div>
      </div>
    `;
  },

  // Nilai bersama untuk seluruh kartu produk dalam satu siklus render.
  _buildCardContext() {
    const auth = window.taniStore.getAuth();
    return {
      tierInfo: window.taniStore.getTierInfo(auth ? auth.tier : 'silver'),
      settings: window.taniStore.getMemberSettings(),
      wishlist: new Set(window.taniStore.getWishlist())
    };
  },

  // ==========================================
  // DETAIL PRODUK (MODAL)
  // ==========================================
  openProductDetail(productId) {
    const product = window.taniStore.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('modal-product-detail');
    if (!modal) return;

    const modalContent = document.getElementById('modal-detail-content');
    const isWished = window.taniStore.isWishlisted(product.id);
    const discPercent = discountPercent(product);

    const cache = this._buildCardContext();
    const tierInfo = cache.tierInfo;
    const settings = cache.settings;
    const estPoints = estimatePoints(product.price, tierInfo, settings);
    const isBonusProduct = (settings.freeProductId === product.id);

    const reviews = window.taniStore.getReviews().filter(r => r.productId === product.id);

    modalContent.innerHTML = `
      <div class="detail-grid">
        <div>
          <div class="detail-img-box">
            <img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_IMAGE}'">
          </div>
          <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-secondary btn-sm" onclick="CustomerApp.toggleWishlist('${product.id}')">
              ${isWished ? '❤️ Disimpan di Wishlist' : '🤍 Tambah ke Wishlist'}
            </button>
            <span style="font-size: 11px; color: #6B7280;">ID: ${product.id}</span>
          </div>
        </div>

        <div>
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
            ${product.badge ? `<span class="badge badge-green">${product.badge}</span>` : ''}
            ${isBonusProduct ? `<span class="badge badge-blue">🎁 Bonus Gratis Platinum (Min. Rp500rb)</span>` : ''}
            <span style="font-size:12px; color:#4B5563;">Gudang: <strong>${product.location}</strong></span>
          </div>

          <h2 class="detail-title">${product.name}</h2>

          <div class="detail-rating-row">
            <span style="color:#D97706; font-weight:700;">★ ${product.rating}</span>
            <span style="color:#6B7280;">|</span>
            <span><strong>${product.reviewCount}</strong> Ulasan Petani</span>
            <span style="color:#6B7280;">|</span>
            <span><strong>${product.soldCount}</strong> Terjual</span>
            <span style="color:#6B7280;">|</span>
            <span style="color:#10B981; font-weight:700;">+${estPoints} Poin Member</span>
          </div>

          <div class="detail-price-box">
            <span class="detail-price">${window.taniStore.formatRupiah(product.price)}</span>
            ${product.originalPrice ? `<span class="detail-strike">${window.taniStore.formatRupiah(product.originalPrice)}</span>` : ''}
            ${discPercent > 0 ? `<span class="badge badge-orange">Diskon ${discPercent}%</span>` : ''}
          </div>

          <!-- Member Special Price / Tier Discount Notice -->
          <div style="margin-bottom: 14px; padding: 10px 12px; border-radius: 6px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); font-size: 12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color: #047857; font-weight:700;">Benefit Keanggotaan Member:</span>
              <span class="badge-tier-pill">${tierInfo.badge} ${tierInfo.name}</span>
            </div>
            ${product.memberPrice ? `
              <div style="margin-top: 4px; color: #065F46;">
                🏷️ Harga Khusus Member: <strong>${window.taniStore.formatRupiah(product.memberPrice)}</strong>
              </div>
            ` : ''}
            <div style="margin-top: 4px; color: #065F46;">
              ✨ Tier ${tierInfo.name}: ${tierInfo.discountPercent > 0 ? `Diskon tambahan ${tierInfo.discountPercent}% saat checkout` : 'Kumpulkan poin belanja'} • Multiplier poin ${tierInfo.pointsMultiplier}x.
            </div>
          </div>

          <table class="detail-specs-table">
            <tr>
              <td>Isi / Kemasan:</td>
              <td><strong>${product.unit}</strong></td>
            </tr>
            <tr>
              <td>Bahan Aktif / Spek:</td>
              <td>${product.activeIngredient || '-'}</td>
            </tr>
            <tr>
              <td>Berat Pengiriman:</td>
              <td>${(product.weightGram / 1000).toFixed(2)} Kg</td>
            </tr>
            <tr>
              <td>Sisa Stok Gudang:</td>
              <td><span style="color:${product.stock < 20 ? '#DC2626' : '#15803D'}; font-weight:700;">${product.stock} ${product.unit.split(' ')[0]}</span> (Siap Kirim)</td>
            </tr>
            <tr>
              <td>Lokasi Penyimpanan:</td>
              <td>${product.shelfLocation || 'Gudang Pusat Tani.SM'}</td>
            </tr>
          </table>

          <div style="margin-bottom: 18px; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px;">
            <div style="font-weight: 600; font-size: 13px; color: #1E293B; margin-bottom: 4px;">Deskripsi & Anjuran Penggunaan:</div>
            <div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 8px;">${product.description}</div>
            ${product.usageGuide ? `<div style="font-size: 12px; color: #15803D; background: #DCFCE7; padding: 6px 10px; border-radius: 2px;"><strong>Petunjuk Dosis:</strong> ${product.usageGuide}</div>` : ''}
          </div>

          <div class="detail-qty-row">
            <span style="font-weight: 500;">Jumlah Pesan:</span>
            <div class="qty-counter">
              <button class="qty-btn" onclick="CustomerApp.adjustDetailQty(-1)">-</button>
              <input type="number" id="detail-qty-input" class="qty-input" value="1" min="1" max="${product.stock}">
              <button class="qty-btn" onclick="CustomerApp.adjustDetailQty(1, ${product.stock})">+</button>
            </div>
            <span style="font-size: 12px; color: #6B7280;">(Maks: ${product.stock})</span>
          </div>

          <div class="detail-actions">
            <button class="btn btn-outline-orange btn-lg" onclick="CustomerApp.addToCartFromDetail('${product.id}', false)">
              Masukkan Keranjang
            </button>
            <button class="btn btn-primary btn-lg" onclick="CustomerApp.addToCartFromDetail('${product.id}', true)">
              Beli Sekarang
            </button>
          </div>

          <!-- Product Reviews Section inside Detail -->
          <div style="margin-top: 28px; border-top: 1px solid #E5E7EB; padding-top: 18px;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">Ulasan Pembeli Produk Ini (${reviews.length})</h4>
            ${reviews.length === 0 ? '<p style="font-size:12px; color:#9CA3AF;">Belum ada ulasan untuk barang ini. Jadilah yang pertama memberikan ulasan!</p>' : `
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${reviews.map(r => `
                  <div style="background:#F9FAFB; padding:10px 12px; border-radius:4px; font-size:12px; border:1px solid #E5E7EB;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                      <strong>${r.customerName}</strong>
                      <span style="color:#D97706;">${'★'.repeat(r.rating)}</span>
                    </div>
                    <div style="color:#4B5563;">${r.comment}</div>
                    <div style="font-size:10px; color:#9CA3AF; margin-top:4px;">${r.date}</div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  adjustDetailQty(delta, maxStock = 999) {
    const input = document.getElementById('detail-qty-input');
    if (!input) return;
    let val = parseInt(input.value) || 1;
    val += delta;
    if (val < 1) val = 1;
    if (val > maxStock) val = maxStock;
    input.value = val;
  },

  addToCartFromDetail(productId, directCheckout = false) {
    const input = document.getElementById('detail-qty-input');
    const qty = input ? parseInt(input.value) || 1 : 1;

    window.taniStore.addToCart(productId, qty);
    this.updateCartBadge();
    this.invalidateView('cart');
    this.closeAllModals();

    if (directCheckout) {
      this.switchView('checkout');
    } else {
      TaniAuth.showToast(`Berhasil menambahkan ${qty} item ke keranjang belanja`, 'success');
    }
  },

  // ==========================================
  // 3. KERANJANG BELANJA (CART)
  // ==========================================
  renderCart() {
    const auth = window.taniStore.getAuth();
    const cart = window.taniStore.getCart();
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const totalEl = document.getElementById('cart-total-val');
    const discountEl = document.getElementById('cart-discount-val');
    const weightEl = document.getElementById('cart-weight-val');

    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div style="padding: 48px; text-align: center;">
          <p style="font-weight: 600; font-size: 16px; color: #4B5563;">Keranjang belanja pertanian Anda masih kosong.</p>
          <p style="font-size: 13px; color: #9CA3AF; margin-top: 6px;">Pilih benih bersertifikat, pupuk, atau alat tanam berkualitas dari katalog kami.</p>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="CustomerApp.switchView('catalog')">Buka Katalog Sekarang</button>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = 'Rp 0';
      if (discountEl) discountEl.textContent = 'Rp 0';
      if (totalEl) totalEl.textContent = 'Rp 0';
      if (weightEl) weightEl.textContent = '0 Kg';
      return;
    }

    const selectedCart = cart.filter(item => item.selected !== false);
    // Subtotal & berat hanya dari item yang dicentang.
    const { subtotal, totalWeight } = sumCart(selectedCart);

    const rowsHtml = cart.map(item => {
      const lineTotal = item.price * item.qty;

      return `
        <tr>
          <td style="width: 40px; text-align: center;">
            <input type="checkbox" ${item.selected !== false ? 'checked' : ''} onchange="CustomerApp.toggleCartItemSelect('${item.productId}', this.checked)">
          </td>
          <td>
            <div class="cart-product-cell">
              <img src="${item.image}" alt="${item.name}" class="cart-thumb">
              <div>
                <a href="javascript:void(0)" onclick="CustomerApp.openProductDetail('${item.productId}')" style="font-weight:600; color:#1F2937;">${item.name}</a>
                <div style="font-size:12px; color:#6B7280; margin-top:2px;">Satuan: ${item.unit} (${((item.weightGram || 1000) / 1000).toFixed(1)} Kg/unit)</div>
              </div>
            </div>
          </td>
          <td>${window.taniStore.formatRupiah(item.price)}</td>
          <td>
            <div class="qty-counter">
              <button class="qty-btn" onclick="CustomerApp.updateCartQty('${item.productId}', ${item.qty - 1})">-</button>
              <input type="text" class="qty-input" value="${item.qty}" readonly>
              <button class="qty-btn" onclick="CustomerApp.updateCartQty('${item.productId}', ${item.qty + 1})">+</button>
            </div>
          </td>
          <td style="font-weight:700; color:var(--primary-orange);">${window.taniStore.formatRupiah(lineTotal)}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="CustomerApp.removeFromCart('${item.productId}')" style="color:#DC2626;">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');

    // Member Benefits calculation
    const memberBenefits = auth ? window.taniStore.calculateOrderMemberBenefits(auth.id, selectedCart, subtotal) : null;
    const settings = window.taniStore.getMemberSettings();

    // Member Alert Banner
    let memberBannerHtml = '';
    if (memberBenefits) {
      const tInfo = memberBenefits.tierInfo;
      if (tInfo.key === 'platinum') {
        if (memberBenefits.isFreeBonusEligible && memberBenefits.freeBonusProduct) {
          memberBannerHtml = `
            <div style="background: rgba(2, 132, 199, 0.12); border: 1px solid #0284C7; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong style="color: #0284C7;">💎 Benefit Eksklusif Platinum Aktif!</strong>
                <div style="font-size: 12px; color: #38BDF8; margin-top: 2px;">
                  Selamat! Anda berhak mendapatkan <strong>1x Bonus Free Product: ${memberBenefits.freeBonusProduct.name}</strong> (Gratis Rp0) karena belanja &ge; ${window.taniStore.formatRupiah(settings.freeProductMinSpend)}.
                </div>
              </div>
              <span class="badge" style="background:#0284C7; color:#FFF; font-size:11px;">1 Unit Gratis Terklaim</span>
            </div>
          `;
        } else {
          const needed = Math.max(0, Number(settings.freeProductMinSpend) - subtotal);
          memberBannerHtml = `
            <div style="background: rgba(2, 132, 199, 0.08); border: 1px dashed rgba(2, 132, 199, 0.4); border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #0284C7; display: flex; justify-content: space-between; align-items: center;">
              <span>💎 <strong>Member Platinum:</strong> Tambah belanja <strong>${window.taniStore.formatRupiah(needed)}</strong> lagi untuk klaim bonus free product (${memberBenefits.tierInfo.bonusProduct.name}).</span>
              <a href="javascript:void(0)" onclick="CustomerApp.openMemberBenefitsModal()" style="color:#38BDF8; font-weight:600;">Lihat Detail &rarr;</a>
            </div>
          `;
        }
      } else if (tInfo.key === 'gold') {
        memberBannerHtml = `
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #D97706; display: flex; justify-content: space-between; align-items: center;">
            <span>🥇 <strong>Member Gold:</strong> Diskon khusus ${tInfo.discountPercent}% otomatis aktif untuk produk yang memenuhi syarat (Maks cap ${window.taniStore.formatRupiah(settings.maxDiscountCap)}). Multiplier Poin ${tInfo.pointsMultiplier}x.</span>
            <span style="font-weight: 700;">Hemat ${window.taniStore.formatRupiah(memberBenefits.tierDiscount)}</span>
          </div>
        `;
      } else {
        memberBannerHtml = `
          <div style="background: rgba(148, 163, 184, 0.1); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px; color: #94A3B8; display: flex; justify-content: space-between; align-items: center;">
            <span>🥈 <strong>Member Silver:</strong> Kumpulkan transaksi untuk naik ke level Gold 🥇 (Diskon 5% + Poin 1.5x).</span>
            <a href="javascript:void(0)" onclick="CustomerApp.openMemberBenefitsModal()" style="color:#34D399; text-decoration:underline;">Lihat Benefit Semua Level &rarr;</a>
          </div>
        `;
      }
    }

    container.innerHTML = `
      ${memberBannerHtml}
      <table class="cart-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">
              <input type="checkbox" id="cart-check-all" checked onchange="CustomerApp.toggleCartAll(this.checked)">
            </th>
            <th>Barang Pertanian</th>
            <th>Harga Satuan</th>
            <th>Jumlah</th>
            <th>Total Harga</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    // Apply Voucher Calculation
    const voucherDiscount = calcVoucherDiscount(this.appliedVoucher, subtotal);

    const tierDiscount = memberBenefits ? memberBenefits.tierDiscount : 0;
    const finalTotal = Math.max(0, subtotal - voucherDiscount - tierDiscount);

    if (subtotalEl) subtotalEl.textContent = window.taniStore.formatRupiah(subtotal);
    if (discountEl) {
      let discText = '- ' + window.taniStore.formatRupiah(voucherDiscount);
      if (tierDiscount > 0) {
        discText += ` (Kupon) + - ${window.taniStore.formatRupiah(tierDiscount)} (${memberBenefits.tierInfo.badge} Diskon Member)`;
      }
      discountEl.textContent = discText;
    }
    if (totalEl) totalEl.textContent = window.taniStore.formatRupiah(finalTotal);

    if (weightEl) {
      weightEl.textContent = `${(totalWeight / 1000).toFixed(2)} Kg`;
    }
  },

  updateCartQty(productId, newQty) {
    window.taniStore.updateCartQty(productId, newQty);
    this.updateCartBadge();
    this.invalidateView('cart');
    this.invalidateView('checkout');
    if (this.activeView === 'cart') this.renderCart();
  },

  removeFromCart(productId) {
    window.taniStore.removeFromCart(productId);
    this.updateCartBadge();
    this.invalidateView('cart');
    this.invalidateView('checkout');
    if (this.activeView === 'cart') this.renderCart();
    TaniAuth.showToast('Item berhasil dihapus dari keranjang', 'info');
  },

  toggleCartItemSelect(productId, isSelected) {
    const cart = window.taniStore.getCart();
    const item = cart.find(i => i.productId === productId);
    if (item) {
      item.selected = isSelected;
      window.taniStore.saveCart(cart);
      this.invalidateView('checkout');
      this.renderCart();
    }
  },

  toggleCartAll(isSelected) {
    const cart = window.taniStore.getCart();
    cart.forEach(item => item.selected = isSelected);
    window.taniStore.saveCart(cart);
    this.invalidateView('checkout');
    this.renderCart();
  },

  applyVoucherCode() {
    const input = document.getElementById('voucher-code-input');
    if (!input) return;
    const code = input.value.trim().toUpperCase();
    if (!code) {
      TaniAuth.showToast('Masukkan kode kupon voucher pertanian', 'error');
      return;
    }

    const vouchers = window.taniStore.getVouchers();
    const found = vouchers.find(v => v.code.toUpperCase() === code && v.active);

    if (!found) {
      TaniAuth.showToast(`Kupon "${code}" tidak valid atau kuota telah habis`, 'error');
      return;
    }

    this.appliedVoucher = found;
    TaniAuth.showToast(`Kupon ${found.code} (${found.name}) berhasil diterapkan!`, 'success');
    this.invalidateView('checkout');
    this.renderCart();
  },

  // ==========================================
  // 4. CHECKOUT
  // ==========================================
  renderCheckout() {
    const auth = window.taniStore.getAuth();
    const cart = window.taniStore.getCart().filter(item => item.selected !== false);

    if (cart.length === 0) {
      TaniAuth.showToast('Pilih setidaknya satu barang untuk dicheckout', 'error');
      this.switchView('cart');
      return;
    }

    // Populate Address
    const addrField = document.getElementById('checkout-address-text');
    const nameField = document.getElementById('checkout-customer-name');
    const phoneField = document.getElementById('checkout-customer-phone');

    if (addrField && auth) addrField.value = auth.address || 'Dusun Jetis, Ceper, Klaten';
    if (nameField && auth) nameField.value = auth.name || 'Budi Santoso';
    if (phoneField && auth) phoneField.value = auth.phone || '0812-3456-7890';

    const { subtotal, totalWeight } = sumCart(cart);

    const memberBenefits = auth ? window.taniStore.calculateOrderMemberBenefits(auth.id, cart, subtotal) : null;

    // Populate Item Summary
    const itemsContainer = document.getElementById('checkout-items-list');
    if (itemsContainer) {
      let itemsListHtml = cart.map(item => {
        const itemTotal = item.price * item.qty;
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #E5E7EB; font-size:13px;">
            <div style="display:flex; gap:10px; align-items:center;">
              <img src="${item.image}" style="width:40px; height:40px; object-fit:cover; border-radius:2px;">
              <div>
                <div style="font-weight:600;">${item.name}</div>
                <div style="font-size:11px; color:#6B7280;">${item.qty} x ${window.taniStore.formatRupiah(item.price)} (${item.unit})</div>
              </div>
            </div>
            <div style="font-weight:700;">${window.taniStore.formatRupiah(itemTotal)}</div>
          </div>
        `;
      }).join('');

      // If Platinum bonus product eligible, display it in the list!
      if (memberBenefits && memberBenefits.isFreeBonusEligible && memberBenefits.freeBonusProduct) {
        itemsListHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #E5E7EB; font-size:13px; background: rgba(2, 132, 199, 0.08); padding-left: 8px; padding-right: 8px; border-radius: 4px; margin-top: 4px;">
            <div style="display:flex; gap:10px; align-items:center;">
              <span style="font-size: 20px;">🎁</span>
              <div>
                <div style="font-weight:700; color: #0284C7;">[BONUS PLATINUM] ${memberBenefits.freeBonusProduct.name}</div>
                <div style="font-size:11px; color:#38BDF8;">1 x ${memberBenefits.freeBonusProduct.unit} (Syarat min. transaksi terpenuhi)</div>
              </div>
            </div>
            <div style="font-weight:800; color:#10B981;">GRATIS (Rp 0)</div>
          </div>
        `;
      }

      itemsContainer.innerHTML = itemsListHtml;
    }

    // Shipping calculation
    const courierSelect = document.querySelector('input[name="checkout-courier"]:checked');
    const courierRate = courierSelect ? Number(courierSelect.getAttribute('data-rate') || 25000) : 25000;
    const shippingCost = calcShipping(totalWeight, courierRate);

    // Voucher
    const voucherDiscount = calcVoucherDiscount(this.appliedVoucher, subtotal);

    const tierDiscount = memberBenefits ? memberBenefits.tierDiscount : 0;
    const totalDiscount = voucherDiscount + tierDiscount;
    const grandTotal = Math.max(0, subtotal + shippingCost - totalDiscount);

    const subtotalEl = document.getElementById('checkout-subtotal-val');
    const shippingEl = document.getElementById('checkout-shipping-val');
    const discountEl = document.getElementById('checkout-discount-val');
    const totalEl = document.getElementById('checkout-total-val') || document.getElementById('checkout-grand-total-val');

    if (subtotalEl) subtotalEl.textContent = window.taniStore.formatRupiah(subtotal);
    if (shippingEl) shippingEl.textContent = window.taniStore.formatRupiah(shippingCost);
    if (discountEl) {
      let discLabel = '- ' + window.taniStore.formatRupiah(voucherDiscount);
      if (tierDiscount > 0) {
        discLabel += ` (Kupon) + - ${window.taniStore.formatRupiah(tierDiscount)} (${memberBenefits.tierInfo.badge} Diskon ${memberBenefits.tierInfo.name})`;
      }
      discountEl.textContent = discLabel;
    }
    if (totalEl) totalEl.textContent = window.taniStore.formatRupiah(grandTotal);
  },

  updateCheckoutCalculations() {
    this.renderCheckout();
  },

  submitOrder() {
    const auth = window.taniStore.getAuth();
    const cart = window.taniStore.getCart().filter(item => item.selected !== false);
    if (cart.length === 0) return;

    const name = document.getElementById('checkout-customer-name').value.trim();
    const phone = document.getElementById('checkout-customer-phone').value.trim();
    const address = document.getElementById('checkout-address-text').value.trim();
    const courierRadio = document.querySelector('input[name="checkout-courier"]:checked');
    const paymentRadio = document.querySelector('input[name="checkout-payment"]:checked');

    if (!address || !phone) {
      TaniAuth.showToast('Mohon lengkapi alamat pengiriman kebun dan nomor telepon', 'error');
      return;
    }

    const courierName = courierRadio ? courierRadio.value : 'J&T Cargo Pertanian';
    const paymentMethod = paymentRadio ? paymentRadio.value : 'Transfer Mandiri (Virtual Account)';

    // Compute totals
    const { subtotal, totalWeight } = sumCart(cart);

    const memberBenefits = auth ? window.taniStore.calculateOrderMemberBenefits(auth.id, cart, subtotal) : null;

    const courierRate = courierRadio ? Number(courierRadio.getAttribute('data-rate') || 25000) : 25000;
    const shippingCost = calcShipping(totalWeight, courierRate);
    const voucherDiscount = calcVoucherDiscount(this.appliedVoucher, subtotal);

    const tierDiscount = memberBenefits ? memberBenefits.tierDiscount : 0;
    const grandTotal = Math.max(0, subtotal + shippingCost - voucherDiscount - tierDiscount);
    const orderId = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    const trackingNo = 'TANI-' + Math.floor(10000000 + Math.random() * 90000000);

    // Build order items
    const orderItems = cart.map(c => ({
      productId: c.productId,
      name: c.name,
      price: c.price,
      qty: c.qty,
      unit: c.unit
    }));

    // Attach Platinum bonus gift if eligible
    if (memberBenefits && memberBenefits.isFreeBonusEligible && memberBenefits.freeBonusProduct) {
      orderItems.push({
        productId: memberBenefits.freeBonusProduct.productId,
        name: `[BONUS PLATINUM] ${memberBenefits.freeBonusProduct.name}`,
        price: 0,
        qty: 1,
        unit: memberBenefits.freeBonusProduct.unit,
        isFreeGift: true
      });
    }

    // Create Order Record
    const newOrder = {
      id: orderId,
      customerId: auth ? auth.id : 'CST-001',
      customerName: name,
      phone: phone,
      shippingAddress: address,
      date: window.taniStore.getCurrentDateTime(),
      status: paymentMethod.includes('COD') ? 'Diproses Gudang' : 'Menunggu Konfirmasi Gudang',
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod.includes('COD') ? 'Bayar di Tempat (COD)' : 'Menunggu Verifikasi',
      courier: courierName,
      trackingNo: trackingNo,
      subtotal: subtotal,
      shippingCost: shippingCost,
      discount: voucherDiscount,
      tierDiscount: tierDiscount,
      memberTier: memberBenefits ? memberBenefits.tierKey : 'silver',
      pointsEarned: memberBenefits ? memberBenefits.pointsEarned : 0,
      total: grandTotal,
      items: orderItems,
      warehouseNotes: memberBenefits && memberBenefits.tierInfo && memberBenefits.tierInfo.priorityService
        ? '⚡ PRIORITAS PLATINUM: Kemas cepat & utamakan pengiriman kebun mitra VIP.'
        : 'Pesanan baru dari web Tani.SM. Siapkan packing aman tahan guncangan.',
      trackingHistory: [
        { time: window.taniStore.getCurrentDateTime(), text: `Pesanan dibuat via web Tani.SM dengan metode ${paymentMethod}.` },
        { time: window.taniStore.getCurrentDateTime(), text: `Nomor resi ${trackingNo} terdaftar pada sistem logistik ${courierName}.` }
      ]
    };

    // Save order
    window.taniStore.saveOrder(newOrder);

    // Deduct Stock and log
    cart.forEach(item => {
      window.taniStore.updateProductStock(item.productId, -item.qty, 'Keluar', `Alokasi pesanan ${orderId}`);
    });

    // Add customer points & evaluate tier promotion
    if (auth && auth.id) {
      const earnedPts = memberBenefits ? memberBenefits.pointsEarned : 0;
      window.taniStore.addCustomerPoints(auth.id, earnedPts);
      const evalResult = window.taniStore.evaluateCustomerTier(auth.id);
      if (evalResult && evalResult.isUpgraded) {
        setTimeout(() => {
          TaniAuth.showToast(`🎉 Luar Biasa! Level Anda telah naik menjadi Member ${evalResult.newTier.toUpperCase()}!`, 'success');
        }, 1200);
      }
    }

    // Clear cart & voucher
    window.taniStore.clearCart();
    this.appliedVoucher = null;
    this.updateCartBadge();
    this.renderHeaderUserInfo();
    this.invalidateAllViews();

    TaniAuth.showToast(`Pesanan ${orderId} berhasil dibuat! Segera diproses oleh Admin Gudang.`, 'success');
    this.openTrackingForOrder(orderId);
  },

  // ==========================================
  // 5. PESANAN SAYA
  // ==========================================
  renderOrders(statusFilter = 'all') {
    const auth = window.taniStore.getAuth();
    const allOrders = window.taniStore.getOrders();
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    // Filter to current customer's orders if logged in as customer
    let orders = (auth && auth.role === 'customer')
      ? allOrders.filter(o => o.customerId === auth.id || o.customerName === auth.name)
      : allOrders;

    // Filter by status tab if applicable
    let filtered = orders;
    if (statusFilter !== 'all') {
      filtered = orders.filter(o => {
        if (statusFilter === 'unpaid') return o.paymentStatus === 'Menunggu Verifikasi' || o.status.includes('Menunggu');
        if (statusFilter === 'processing') return o.status === 'Diproses Gudang';
        if (statusFilter === 'shipping') return o.status === 'Dikirim';
        if (statusFilter === 'completed') return o.status === 'Selesai';
        return true;
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="background:#FFF; padding:40px; text-align:center; border:1px solid #E5E7EB; border-radius:4px;">
          <p style="font-weight:600; color:#4B5563;">Tidak ada riwayat pesanan.</p>
          <button class="btn btn-primary" style="margin-top:12px;" onclick="CustomerApp.switchView('catalog')">Mulai Belanja Sarana Tani</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(order => {
      let statusBadge = 'badge-orange';
      if (order.status === 'Selesai') statusBadge = 'badge-green';
      if (order.status === 'Dikirim') statusBadge = 'badge-blue';

      const tierBadgeHtml = order.memberTier ? `
        <span class="member-tier-pill tier-${order.memberTier}" style="font-size:10px; padding:2px 8px;">
          ${order.memberTier.toUpperCase()}
        </span>
      ` : '';

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <strong>No. Pesanan: ${order.id}</strong>
              ${tierBadgeHtml}
              <span style="color:#6B7280; font-size:12px;">(${order.date})</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${statusBadge}">${order.status}</span>
              <span class="badge badge-gray">${order.courier}</span>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            ${(order.items || []).map(item => `
              <div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px dashed #F1F5F9;">
                <div>
                  <strong>${item.name}</strong>
                  ${item.isFreeGift ? '<span class="badge" style="background:#0284C7; color:#FFF; font-size:10px; margin-left:6px;">Bonus Free</span>' : ''}
                  <span style="color:#6B7280;"> x ${item.qty} (${item.unit || 'unit'})</span>
                </div>
                <div>${item.price > 0 ? window.taniStore.formatRupiah(item.price * item.qty) : '<span style="color:#10B981; font-weight:700;">Gratis</span>'}</div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid #E5E7EB; flex-wrap:wrap; gap:12px;">
            <div>
              <div style="font-size:12px; color:#6B7280;">Metode Bayar: <strong>${order.paymentMethod}</strong> (${order.paymentStatus})</div>
              <div style="font-size:12px; color:#1F2937; margin-top:2px;">Resi Kargo: <strong style="color:#059669;">${order.trackingNo}</strong></div>
              ${order.pointsEarned ? `<div style="font-size:11px; color:#10B981; font-weight:600; margin-top:2px;">+${order.pointsEarned} Poin Didapat</div>` : ''}
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px; color:#6B7280;">Total Tagihan: </span>
              <span class="font-price" style="font-size:18px;">${window.taniStore.formatRupiah(order.total)}</span>
              <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm" onclick="CustomerApp.openCustomerInvoice('${order.id}')">📄 Cetak Resi & Nota</button>
                <button class="btn btn-primary btn-sm" onclick="CustomerApp.openTrackingForOrder('${order.id}')">🚚 Lacak Barang Pesanan</button>
                ${order.items && order.items[0] && !order.items[0].isFreeGift ? `<button class="btn btn-outline-orange btn-sm" onclick="CustomerApp.openReviewModal('${order.items[0].productId}', '${order.items[0].name}')">Beri Ulasan</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  filterOrderStatus(tabEl, status) {
    document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
    tabEl.classList.add('active');
    this.renderOrders(status);
  },

  // ==========================================
  // 6. PELACAKAN RESI OTOMATIS
  // ==========================================
  renderTracking(targetOrder = null) {
    const auth = window.taniStore.getAuth();
    const allOrders = window.taniStore.getOrders();
    const userOrders = (auth && auth.role === 'customer')
      ? allOrders.filter(o => o.customerId === auth.id || o.customerName === auth.name)
      : allOrders;

    const tabsContainer = document.getElementById('customer-tracking-tabs');
    const resultContainer = document.getElementById('tracking-result-container');
    const wrapSelector = document.getElementById('customer-tracking-selector-wrap');

    if (!resultContainer) return;

    if (userOrders.length === 0) {
      if (wrapSelector) wrapSelector.style.display = 'none';
      resultContainer.innerHTML = `
        <div style="background: #04160E; border: 1px solid var(--cust-border-subtle); border-radius: 8px; padding: 48px; text-align: center;">
          <div style="font-size: 36px; margin-bottom: 12px;">🚚</div>
          <h3 style="color: #ECFDF5; font-size: 16px; font-weight: 700; margin-bottom: 8px;">Belum Ada Pesanan yang Dilacak</h3>
          <p style="color: #8BA498; font-size: 13px; max-width: 440px; margin: 0 auto 16px auto;">
            Anda belum memiliki pesanan aktif. Setelah memesan benih, pupuk, atau sarana tani, sistem akan otomatis melacak barang pesanan Anda di sini tanpa perlu input manual.
          </p>
          <button class="btn btn-primary" onclick="CustomerApp.switchView('catalog')">Mulai Belanja Sarana Tani</button>
        </div>
      `;
      return;
    }

    if (wrapSelector) wrapSelector.style.display = 'block';

    // Determine active order
    let activeOrder = null;
    if (targetOrder) {
      if (typeof targetOrder === 'string') {
        activeOrder = userOrders.find(o => o.id === targetOrder) || allOrders.find(o => o.id === targetOrder);
      } else {
        activeOrder = targetOrder;
      }
    }
    if (!activeOrder) {
      activeOrder = userOrders[0];
    }

    // Render Order Tabs
    if (tabsContainer) {
      tabsContainer.innerHTML = userOrders.map(o => {
        const isActive = o.id === activeOrder.id;
        const mainItemName = o.items && o.items[0] ? o.items[0].name : 'Pesanan Pertanian';
        const itemExtra = o.items && o.items.length > 1 ? ` (+${o.items.length - 1} barang)` : '';
        const statusBadgeClass = o.status === 'Selesai' ? 'badge-green' : (o.status === 'Dikirim' ? 'badge-blue' : 'badge-orange');

        return `
          <button type="button" class="tracking-order-tab ${isActive ? 'active' : ''}" onclick="CustomerApp.openTrackingForOrder('${o.id}')">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-weight:700; font-size:13px; color:${isActive ? '#34D399' : '#ECFDF5'};">${o.id}</span>
              <span class="badge ${statusBadgeClass}" style="font-size:10px;">${o.status}</span>
            </div>
            <div style="font-size:12px; color:${isActive ? '#ECFDF5' : '#8BA498'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-align:left;">
              ${mainItemName}${itemExtra}
            </div>
            <div style="font-size:11px; color:#5E7D6F; margin-top:4px; text-align:left;">
              Resi: <strong>${o.trackingNo}</strong> • ${o.courier}
            </div>
          </button>
        `;
      }).join('');
    }

    // Render Tracking Result Details
    this.displayTrackingDetails(activeOrder);
  },

  openTrackingForOrder(orderId) {
    const order = window.taniStore.getOrderById(orderId);
    if (!order) {
      TaniAuth.showToast('Pesanan tidak ditemukan', 'error');
      return;
    }
    this.switchView('tracking', { force: true });
    this.renderTracking(order);
  },

  searchTrackingManual() {
    const input = document.getElementById('tracking-input');
    if (!input) return;
    const query = input.value.trim().toUpperCase();
    if (!query) {
      TaniAuth.showToast('Masukkan nomor resi atau ID pesanan', 'error');
      return;
    }

    const allOrders = window.taniStore.getOrders();
    const found = allOrders.find(o => 
      (o.trackingNo && o.trackingNo.toUpperCase() === query) || 
      (o.id && o.id.toUpperCase() === query)
    );

    if (!found) {
      TaniAuth.showToast(`Nomor resi/pesanan "${query}" tidak ditemukan dalam sistem gudang.`, 'error');
      return;
    }

    this.renderTracking(found);
    TaniAuth.showToast(`Menampilkan pelacakan untuk ${found.id}`, 'success');
  },

  displayTrackingDetails(order) {
    const resultContainer = document.getElementById('tracking-result-container');
    if (!resultContainer || !order) return;

    const isStep1Done = true;
    const isStep2Done = order.status !== 'Menunggu Pembayaran' && order.status !== 'Menunggu Verifikasi';
    const isStep3Done = order.status === 'Dikirim' || order.status === 'Selesai';
    const isStep4Done = order.status === 'Selesai';

    const steps = [
      { num: 1, label: 'Pesanan Dibuat', sub: 'Terdaftar di Web Tani.SM', done: isStep1Done },
      { num: 2, label: 'Dipacking di Gudang', sub: 'Pengecekan Kualitas & Muatan', done: isStep2Done },
      { num: 3, label: 'Kargo Berangkat', sub: 'Dalam Perjalanan Logistik', done: isStep3Done },
      { num: 4, label: 'Tiba di Lahan / Kebun', sub: 'Diterima Petani Pemesan', done: isStep4Done }
    ];

    resultContainer.innerHTML = `
      <div class="tracking-result-card" style="background: #04160E; border: 1px solid var(--cust-border-subtle); border-radius: 12px; padding: 24px;">
        <!-- Top header info -->
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(16, 185, 129, 0.2); padding-bottom:16px; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <h3 style="font-size:18px; font-weight:800; color:#ECFDF5; margin:0;">
                Resi Kargo: <span style="color:#34D399;">${order.trackingNo}</span>
              </h3>
              <span class="badge ${order.status === 'Selesai' ? 'badge-green' : 'badge-orange'}">${order.status}</span>
            </div>
            <p style="font-size:12px; color:#8BA498; margin:4px 0 0 0;">
              Ekspedisi: <strong style="color:#ECFDF5;">${order.courier}</strong> • No. Pesanan: <strong style="color:#34D399;">${order.id}</strong> • Tanggal: ${order.date}
            </p>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="CustomerApp.openCustomerInvoice('${order.id}')" style="display:flex; align-items:center; gap:6px;">
              <span>📄</span> Cetak Resi & Nota
            </button>
          </div>
        </div>

        <!-- Daftar Barang yang Dipesan & Sedang Dilacak -->
        <div style="background: rgba(6, 40, 23, 0.5); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px; padding: 14px; margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 700; color: #34D399; margin-bottom: 10px;">
            📦 Rincian Barang yang Sedang Dikirim:
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${(order.items || []).map(item => `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 6px 0; border-bottom: 1px dashed rgba(16, 185, 129, 0.1);">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="color: #34D399;">🌱</span>
                  <div>
                    <strong style="color: #ECFDF5;">${item.name}</strong>
                    ${item.isFreeGift ? '<span class="badge" style="background:#0284C7; color:#FFF; font-size:9px; margin-left:6px;">🎁 Hadiah Gratis Platinum</span>' : ''}
                    <span style="color: #8BA498; font-size: 12px;"> (${item.qty} ${item.unit || 'unit'})</span>
                  </div>
                </div>
                <div style="color: #ECFDF5; font-weight: 600;">
                  ${item.price > 0 ? window.taniStore.formatRupiah(item.price * item.qty) : '<span style="color:#10B981;">Gratis Rp0</span>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 4 Step Tracker Progress Bar -->
        <div style="margin-bottom: 28px;">
          <div style="font-size: 13px; font-weight: 700; color: #ECFDF5; margin-bottom: 12px;">Status Tahapan Pengiriman:</div>
          <div class="tracking-steps-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
            ${steps.map(s => `
              <div style="padding: 12px; border-radius: 8px; background: ${s.done ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)'}; border: 1px solid ${s.done ? '#10B981' : 'rgba(255, 255, 255, 0.08)'}; text-align: left;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="display: inline-flex; width: 20px; height: 20px; border-radius: 50%; background: ${s.done ? '#10B981' : '#374151'}; color: #FFF; font-size: 11px; font-weight: 800; align-items: center; justify-content: center;">
                    ${s.done ? '✓' : s.num}
                  </span>
                  <span style="font-weight: 700; font-size: 12px; color: ${s.done ? '#34D399' : '#8BA498'};">Tahap ${s.num}</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #ECFDF5;">${s.label}</div>
                <div style="font-size: 11px; color: #8BA498; margin-top: 2px;">${s.sub}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Timeline Logistik -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 13px; font-weight: 700; color: #ECFDF5; margin-bottom: 12px;">Riwayat Posisi & Checkpoint Logistik:</div>
          <div class="timeline" style="border-left: 2px solid rgba(16, 185, 129, 0.3); margin-left: 10px; padding-left: 18px; display: flex; flex-direction: column; gap: 14px;">
            ${(order.trackingHistory || []).map((h, i) => `
              <div style="position: relative;">
                <div style="position: absolute; left: -25px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: ${i === order.trackingHistory.length - 1 ? '#34D399' : '#059669'}; border: 2px solid #04160E;"></div>
                <div style="font-size: 11px; color: #34D399; font-weight: 700;">${h.time}</div>
                <div style="font-size: 13px; color: #ECFDF5; margin-top: 2px;">${h.text}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Destinasi Pengiriman -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--cust-border-subtle); border-radius: 8px; padding: 14px; font-size: 12px; color: #8BA498;">
          <strong style="color: #ECFDF5;">Alamat Pengiriman Lahan Petani:</strong><br>
          ${order.shippingAddress}<br>
          <span style="color: #34D399; font-weight: 600;">Kontak Penerima: ${order.customerName} (${order.phone})</span>
        </div>
      </div>
    `;
  },

  openCustomerInvoice(orderId) {
    const order = window.taniStore.getOrderById(orderId);
    if (!order) {
      TaniAuth.showToast('Data pesanan tidak ditemukan', 'error');
      return;
    }

    this.currentInvoiceOrderId = order.id;
    const modal = document.getElementById('modal-customer-invoice');
    const content = document.getElementById('modal-customer-invoice-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="print-invoice-sheet" style="background:#FFF; color:#111827; padding:24px; border-radius:4px; font-family:sans-serif;">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #10B981; padding-bottom:14px; margin-bottom:16px;">
          <div>
            <h2 style="margin:0; color:#065F46; font-size:20px; font-weight:800;">TANI.SM LOGISTIK PERTANIAN</h2>
            <p style="margin:4px 0 0 0; font-size:12px; color:#4B5563;">Distribusi Benih Bersertifikat, Pupuk, & Sarana Produksi Tani</p>
            <p style="margin:2px 0 0 0; font-size:11px; color:#6B7280;">Gudang Pusat: Jl. Raya Solo-Yogya KM 24, Ceper, Klaten | WA: 0812-3456-7890</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:14px; font-weight:800; color:#111827;">RESI & SURAT JALAN</div>
            <div style="font-size:12px; color:#059669; font-weight:700;">${order.trackingNo}</div>
            <div style="font-size:11px; color:#6B7280; margin-top:2px;">No. Pesanan: ${order.id}</div>
          </div>
        </div>

        <!-- Meta 2 Kolom: Pengirim & Penerima -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; font-size:12px; background:#F9FAFB; padding:12px; border-radius:4px;">
          <div>
            <div style="font-weight:700; color:#374151; margin-bottom:4px;">PENGIRIM:</div>
            <div>Gudang Logistik Tani.SM (Staff: Pak Joko Purnomo)</div>
            <div>Ekspedisi: <strong>${order.courier}</strong></div>
            <div>Tanggal Kirim: ${order.date}</div>
          </div>
          <div>
            <div style="font-weight:700; color:#374151; margin-bottom:4px;">PENERIMA / PEMESAN:</div>
            <div><strong>${order.customerName}</strong> (${order.phone})</div>
            <div>Tujuan Lahan: ${order.shippingAddress}</div>
            <div>Status: <span class="badge ${order.status === 'Selesai' ? 'badge-green' : 'badge-orange'}" style="font-size:11px;">${order.status}</span></div>
          </div>
        </div>

        <!-- Tabel Barang -->
        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:16px;">
          <thead>
            <tr style="background:#E5E7EB; color:#111827; text-align:left;">
              <th style="padding:8px; border:1px solid #D1D5DB; width:30px; text-align:center;">No</th>
              <th style="padding:8px; border:1px solid #D1D5DB;">Nama Barang Pertanian</th>
              <th style="padding:8px; border:1px solid #D1D5DB; text-align:center;">Jumlah</th>
              <th style="padding:8px; border:1px solid #D1D5DB; text-align:right;">Harga Satuan</th>
              <th style="padding:8px; border:1px solid #D1D5DB; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((it, idx) => `
              <tr>
                <td style="padding:8px; border:1px solid #D1D5DB; text-align:center;">${idx + 1}</td>
                <td style="padding:8px; border:1px solid #D1D5DB;">
                  <strong>${it.name}</strong>
                  ${it.isFreeGift ? '<span style="color:#0284C7; font-weight:700; margin-left:4px;">(Bonus Free Product Platinum)</span>' : ''}
                </td>
                <td style="padding:8px; border:1px solid #D1D5DB; text-align:center;">${it.qty} ${it.unit || ''}</td>
                <td style="padding:8px; border:1px solid #D1D5DB; text-align:right;">${it.price > 0 ? window.taniStore.formatRupiah(it.price) : 'Rp 0'}</td>
                <td style="padding:8px; border:1px solid #D1D5DB; text-align:right; font-weight:600;">${it.price > 0 ? window.taniStore.formatRupiah(it.price * it.qty) : 'Gratis'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Ringkasan Pembayaran & Resi -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; font-size:12px;">
          <div style="max-width:320px;">
            <div>Metode Pembayaran: <strong>${order.paymentMethod}</strong></div>
            <div>Status Bayar: <strong>${order.paymentStatus}</strong></div>
            ${order.memberTier ? `<div style="margin-top:4px; color:#059669; font-weight:700;">★ Member Tier: ${order.memberTier.toUpperCase()}</div>` : ''}
            ${order.pointsEarned ? `<div style="color:#059669;">★ Poin Belanja Diterima: +${order.pointsEarned} Poin</div>` : ''}
            <div style="margin-top:8px; font-size:11px; color:#6B7280; font-style:italic;">
              Catatan: Periksa keutuhan karung dan segel sebelum kurir meninggalkan lahan Anda.
            </div>
          </div>
          <div style="width:260px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Subtotal:</span>
              <span>${window.taniStore.formatRupiah(order.subtotal || order.total)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <span>Ongkos Kirim:</span>
              <span>${window.taniStore.formatRupiah(order.shippingCost || 0)}</span>
            </div>
            ${order.discount ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#DC2626;">
                <span>Diskon Kupon:</span>
                <span>- ${window.taniStore.formatRupiah(order.discount)}</span>
              </div>
            ` : ''}
            ${order.tierDiscount ? `
              <div style="display:flex; justify-content:space-between; margin-bottom:4px; color:#059669;">
                <span>Diskon Member ${order.memberTier ? order.memberTier.toUpperCase() : ''}:</span>
                <span>- ${window.taniStore.formatRupiah(order.tierDiscount)}</span>
              </div>
            ` : ''}
            <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid #D1D5DB; font-weight:800; font-size:14px; color:#065F46;">
              <span>Total Pembayaran:</span>
              <span>${window.taniStore.formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>

        <!-- Tanda Tangan -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; border-top:1px dashed #D1D5DB; padding-top:16px; margin-top:16px; font-size:11px; text-align:center;">
          <div>
            <div>Staff Pergudangan Tani.SM</div>
            <div style="height:48px;"></div>
            <div>( _____________________ )</div>
          </div>
          <div>
            <div>Petani Penerima / Mitra</div>
            <div style="height:48px;"></div>
            <div>( <strong>${order.customerName}</strong> )</div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  trackOrderFromInvoice() {
    this.closeAllModals();
    if (this.currentInvoiceOrderId) {
      this.openTrackingForOrder(this.currentInvoiceOrderId);
      TaniAuth.showToast(`Otomatis melacak barang pesanan ${this.currentInvoiceOrderId}`, 'info');
    } else {
      this.switchView('tracking');
    }
  },

  openMemberBenefitsModal() {
    const auth = window.taniStore.getAuth();
    const settings = window.taniStore.getMemberSettings();
    const currentTier = auth ? (auth.tier || 'silver') : 'silver';
    const bonusProduct = window.taniStore.getProductById(settings.freeProductId) || { name: 'Tray Semai Bibit 128 Lubang' };

    const modal = document.getElementById('modal-member-benefits');
    const content = document.getElementById('modal-member-benefits-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <!-- Header notice -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 14px; font-size: 13px; color: #ECFDF5;">
          Level Anda saat ini: <span class="badge-tier-pill tier-${currentTier}">MEMBER ${currentTier.toUpperCase()}</span>
          • Evaluasi berkala dihitung setiap <strong>${settings.evaluationPeriodDays} hari</strong> berdasarkan total transaksi Anda.
        </div>

        <!-- 3 Tier Cards Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
          <!-- 1. SILVER -->
          <div style="background: #04160E; border: ${currentTier === 'silver' ? '2px solid #94A3B8' : '1px solid rgba(255, 255, 255, 0.1)'}; border-radius: 10px; padding: 18px; position:relative;">
            ${currentTier === 'silver' ? '<span class="badge badge-green" style="position:absolute; top:12px; right:12px;">Level Anda</span>' : ''}
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="font-size:26px;">🥈</span>
              <h4 style="margin:0; color:#CBD5E1; font-size:16px; font-weight:800;">1. SILVER</h4>
            </div>
            <div style="font-size:11px; color:#8BA498; margin-bottom:12px;">Syarat: Member Baru (Akumulasi Rp 0)</div>
            <div style="font-size:12px; font-weight:700; color:#34D399; margin-bottom:8px;">Benefit:</div>
            <ul style="margin:0; padding-left:18px; font-size:12px; color:#E2E8F0; line-height:1.6;">
              <li>Harga khusus member pada produk tertentu</li>
              <li>Mendapat informasi promo dan produk terbaru</li>
              <li>Dapat mengumpulkan poin belanja (${settings.pointsMultiplierSilver}x)</li>
              <li>Mendapat kupon promo khusus member</li>
            </ul>
          </div>

          <!-- 2. GOLD -->
          <div style="background: #04160E; border: ${currentTier === 'gold' ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)'}; border-radius: 10px; padding: 18px; position:relative;">
            ${currentTier === 'gold' ? '<span class="badge badge-green" style="position:absolute; top:12px; right:12px;">Level Anda</span>' : ''}
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="font-size:26px;">🥇</span>
              <h4 style="margin:0; color:#FBBF24; font-size:16px; font-weight:800;">2. GOLD</h4>
            </div>
            <div style="font-size:11px; color:#8BA498; margin-bottom:12px;">
              Syarat: Akumulasi belanja <strong>${window.taniStore.formatRupiah(settings.goldMinSpend)}</strong> dlm ${settings.evaluationPeriodDays} hari
            </div>
            <div style="font-size:12px; font-weight:700; color:#34D399; margin-bottom:8px;">Benefit:</div>
            <ul style="margin:0; padding-left:18px; font-size:12px; color:#FEF3C7; line-height:1.6;">
              <li><strong>Semua benefit Silver</strong></li>
              <li>Diskon khusus Gold <strong>${settings.goldDiscountPercent}%</strong> pada produk yang memenuhi syarat</li>
              <li>Poin <strong>${settings.pointsMultiplierGold}x lebih banyak</strong> dibanding Silver</li>
              <li>Mendapat kupon promo eksklusif Gold</li>
              <li>Mendapat informasi promo lebih awal</li>
            </ul>
          </div>

          <!-- 3. PLATINUM -->
          <div style="background: #04160E; border: ${currentTier === 'platinum' ? '2px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)'}; border-radius: 10px; padding: 18px; position:relative;">
            ${currentTier === 'platinum' ? '<span class="badge badge-green" style="position:absolute; top:12px; right:12px;">Level Anda</span>' : ''}
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
              <span style="font-size:26px;">💎</span>
              <h4 style="margin:0; color:#38BDF8; font-size:16px; font-weight:800;">3. PLATINUM</h4>
            </div>
            <div style="font-size:11px; color:#8BA498; margin-bottom:12px;">
              Syarat: Akumulasi belanja <strong>${window.taniStore.formatRupiah(settings.platinumMinSpend)}</strong> dlm ${settings.evaluationPeriodDays} hari
            </div>
            <div style="font-size:12px; font-weight:700; color:#34D399; margin-bottom:8px;">Benefit:</div>
            <ul style="margin:0; padding-left:18px; font-size:12px; color:#E0F2FE; line-height:1.6;">
              <li><strong>Semua benefit Gold</strong></li>
              <li>Diskon lebih besar <strong>${settings.platinumDiscountPercent}%</strong> pada produk yang memenuhi syarat</li>
              <li>Poin <strong>paling banyak (${settings.pointsMultiplierPlatinum}x)</strong></li>
              <li>Prioritas pelayanan & pengemasan cepat</li>
              <li>Mendapat promo eksklusif Platinum</li>
              <li>
                <strong>Bonus Free Product:</strong> 1 unit <em>${bonusProduct.name}</em> (Khusus belanja min. ${window.taniStore.formatRupiah(settings.freeProductMinSpend)})
              </li>
            </ul>
          </div>
        </div>

        <!-- Catatan Penting & Transparansi Aturan -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--cust-border-subtle); border-radius: 8px; padding: 14px; font-size: 12px; color: #8BA498; line-height: 1.6;">
          <strong style="color:#ECFDF5;">📌 Ketentuan & Sistem Evaluasi Berkala:</strong>
          <ul style="margin:6px 0 0 0; padding-left:18px;">
            <li>Level member otomatis dievaluasi secara berkala berdasarkan aktivitas transaksi dalam periode <strong>${settings.evaluationPeriodDays} hari</strong> terakhir.</li>
            <li>Diskon member tier dilindungi batas maksimum (cap Rp ${Number(settings.maxDiscountCap).toLocaleString('id-ID')}) untuk menjaga kewajaran sistem usaha.</li>
            <li>Bonus free product Platinum hanya diberikan 1 unit per transaksi yang memenuhi batas minimum belanja dan berlaku untuk produk promo yang ditentukan admin (tidak gratis tanpa batas).</li>
            <li>Benefit level yang lebih tinggi mencakup seluruh benefit level sebelumnya.</li>
          </ul>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  // ==========================================
  // 7. WISHLIST
  // ==========================================
  renderWishlist() {
    const wishlistIds = window.taniStore.getWishlist();
    const container = document.getElementById('wishlist-products-grid') || document.getElementById('wishlist-grid');
    if (!container) return;

    if (wishlistIds.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #04160E; border: 1px solid var(--cust-border-subtle); border-radius: 8px;">
          <p style="font-weight: 600; font-size: 15px; color: #ECFDF5;">Belum ada sarana tani yang Anda simpan di Wishlist.</p>
          <p style="font-size: 13px; color: #8BA498; margin-top: 6px;">Simpan benih atau alat impian untuk persiapan musim tanam berikutnya.</p>
          <button class="btn btn-primary" style="margin-top: 14px;" onclick="CustomerApp.switchView('catalog')">Eksplor Katalog</button>
        </div>
      `;
      return;
    }

    const products = wishlistIds.map(id => window.taniStore.getProductById(id)).filter(Boolean);
    container.innerHTML = products.map(p => this.createProductCardHtml(p)).join('');
  },

  toggleWishlist(productId) {
    const isNowWished = window.taniStore.toggleWishlist(productId);
    TaniAuth.showToast(isNowWished ? 'Produk disimpan ke Wishlist' : 'Produk dihapus dari Wishlist', 'info');

    this.invalidateView('wishlist');

    const modal = document.getElementById('modal-product-detail');
    if (modal && modal.classList.contains('active')) {
      this.openProductDetail(productId);
    }
    if (this.activeView === 'wishlist') {
      this.renderWishlist();
    }
  },

  // ==========================================
  // 8. ULASAN & RATING
  // ==========================================
  renderReviews() {
    const reviews = window.taniStore.getReviews();
    const container = document.getElementById('reviews-list-container');
    if (!container) return;

    container.innerHTML = reviews.map(r => {
      const product = window.taniStore.getProductById(r.productId);
      return `
        <div style="background: #04160E; border: 1px solid var(--cust-border-subtle); border-radius: 8px; padding: 18px; margin-bottom: 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <strong style="color: #ECFDF5;">${r.customerName}</strong>
              <div style="font-size:12px; color:#34D399; font-weight:600;">Produk: ${product ? product.name : 'Sarana Pertanian'}</div>
            </div>
            <div style="text-align:right;">
              <span style="color:#D97706; font-size:15px; font-weight:700;">${'★'.repeat(r.rating)}</span>
              <div style="font-size:11px; color:#8BA498; margin-top:2px;">${r.date}</div>
            </div>
          </div>
          <p style="font-size:13px; color:#D1FAE5; line-height:1.5; margin:0;">"${r.comment}"</p>
        </div>
      `;
    }).join('');
  },

  openAddReviewModal(productId = null) {
    const modal = document.getElementById('modal-add-review');
    if (!modal) return;
    const select = document.getElementById('review-product-select');
    if (select) {
      const products = window.taniStore.getProducts();
      select.innerHTML = products.map(p => `
        <option value="${p.id}" ${productId === p.id ? 'selected' : ''}>${p.name}</option>
      `).join('');
    }
    const commentInput = document.getElementById('review-comment-input');
    if (commentInput) commentInput.value = '';
    modal.classList.add('active');
  },

  submitReview() {
    const auth = window.taniStore.getAuth();
    const select = document.getElementById('review-product-select');
    const ratingSelect = document.getElementById('review-rating-select');
    const commentInput = document.getElementById('review-comment-input');
    const prodId = select ? select.value : '';
    const rating = ratingSelect ? parseInt(ratingSelect.value) || 5 : 5;
    const comment = commentInput ? commentInput.value.trim() : '';

    if (!prodId) {
      TaniAuth.showToast('Pilih produk pertanian yang ingin diulas', 'error');
      return;
    }
    if (!comment) {
      TaniAuth.showToast('Mohon tulis testimoni pengalaman Anda', 'error');
      return;
    }

    const review = {
      id: 'REV-' + Date.now(),
      productId: prodId,
      customerName: auth ? auth.name : 'Petani Mitra',
      rating: rating,
      date: new Date().toISOString().slice(0, 10),
      comment: comment
    };

    window.taniStore.addReview(review);
    this.closeAllModals();
    TaniAuth.showToast('Ulasan berhasil dikirim!', 'success');
    this.invalidateView('reviews');
    this.invalidateView('dasbor');
    this.renderReviews();
  },

  openReviewModal(productId, productName) {
    this.openAddReviewModal(productId);
  },

  submitReviewForm() {
    this.submitReview();
  },

  // ==========================================
  // 9. EDUKASI PERTANIAN
  // ==========================================
  renderTips() {
    const tips = window.taniStore.getTips();
    const container = document.getElementById('tips-grid-container');
    if (!container) return;

    container.innerHTML = tips.map(tip => `
      <div class="tip-card" onclick="CustomerApp.openTipModal('${tip.id}')">
        <span class="tip-badge">${tip.category}</span>
        <h3 class="tip-title">${tip.title}</h3>
        <p class="tip-summary">${tip.summary}</p>
        <div class="tip-meta">
          <span>Oleh: ${tip.author}</span>
          <span>${tip.readTime}</span>
        </div>
      </div>
    `).join('');
  },

  openTipModal(tipId) {
    const tip = window.taniStore.getTipById(tipId);
    if (!tip) return;

    const modal = document.getElementById('modal-tip-detail');
    if (!modal) return;

    document.getElementById('modal-tip-title').textContent = tip.title;
    document.getElementById('modal-tip-body').innerHTML = `
      <div style="font-size:12px; color:#8BA498; margin-bottom:12px;">${tip.category} • Oleh: ${tip.author} • ${tip.date} • ${tip.readTime}</div>
      <div style="font-size:13px; color:#ECFDF5; line-height:1.7;">${tip.content}</div>
    `;
    modal.classList.add('active');
  },

  // ==========================================
  // 10. PROFIL PETANI & KEANGGOTAAN
  // ==========================================
  renderProfile() {
    const auth = window.taniStore.getAuth();
    if (!auth) return;

    const cust = window.taniStore.getCustomerById(auth.id) || auth;
    const tierInfo = window.taniStore.getTierInfo(cust.tier || 'silver');
    const settings = window.taniStore.getMemberSettings();
    const periodSpend = window.taniStore.calculateCustomerPeriodSpend(cust.id, settings.evaluationPeriodDays);

    const tierIconEl = document.getElementById('profile-tier-icon');
    const tierNameEl = document.getElementById('profile-tier-name');
    const pointsEl = document.getElementById('profile-points-display');
    const perksEl = document.getElementById('profile-member-perks-summary');
    const periodSpendEl = document.getElementById('profile-period-spend-info');

    if (tierIconEl) tierIconEl.textContent = tierInfo.badge;
    if (tierNameEl) tierNameEl.textContent = `MEMBER ${tierInfo.name}`;
    if (pointsEl) pointsEl.textContent = `${(cust.points || 0).toLocaleString('id-ID')} Poin`;
    if (periodSpendEl) periodSpendEl.textContent = `Total Transaksi ${settings.evaluationPeriodDays || 90} Hari Terakhir: ${window.taniStore.formatRupiah(periodSpend)}`;

    if (perksEl) {
      perksEl.innerHTML = `
        <div style="font-weight:600; color:#34D399; margin-bottom:4px;">Keuntungan Aktif Tingkat ${tierInfo.name}:</div>
        <ul style="margin:0; padding-left:18px;">
          ${tierInfo.perks.map(p => `<li>${p}</li>`).join('')}
        </ul>
      `;
    }

    // Form inputs for editing
    const nameInput = document.getElementById('prof-name') || document.getElementById('input-profile-name');
    const phoneInput = document.getElementById('prof-phone') || document.getElementById('input-profile-phone');
    const emailInput = document.getElementById('prof-email') || document.getElementById('input-profile-email');
    const poktanInput = document.getElementById('prof-poktan') || document.getElementById('input-profile-poktan');
    const lahanInput = document.getElementById('prof-lahan') || document.getElementById('input-profile-lahan');
    const komoditasInput = document.getElementById('prof-komoditas') || document.getElementById('input-profile-komoditas');
    const addressInput = document.getElementById('prof-address') || document.getElementById('input-profile-address');

    if (nameInput) nameInput.value = cust.name || '';
    if (phoneInput) phoneInput.value = cust.phone || '';
    if (emailInput) emailInput.value = cust.email || '';
    if (poktanInput) poktanInput.value = cust.kelompokTani || '';
    if (lahanInput) lahanInput.value = cust.lahanHa || 1.0;
    if (komoditasInput) komoditasInput.value = cust.komoditasUtama || '';
    if (addressInput) addressInput.value = cust.address || '';
  },

  saveProfile(event) {
    if (event && event.preventDefault) event.preventDefault();
    const auth = window.taniStore.getAuth();
    if (!auth) return;

    const nameInput = document.getElementById('prof-name') || document.getElementById('input-profile-name');
    const phoneInput = document.getElementById('prof-phone') || document.getElementById('input-profile-phone');
    const emailInput = document.getElementById('prof-email') || document.getElementById('input-profile-email');
    const poktanInput = document.getElementById('prof-poktan') || document.getElementById('input-profile-poktan');
    const lahanInput = document.getElementById('prof-lahan') || document.getElementById('input-profile-lahan');
    const komoditasInput = document.getElementById('prof-komoditas') || document.getElementById('input-profile-komoditas');
    const addressInput = document.getElementById('prof-address') || document.getElementById('input-profile-address');

    const updated = {
      ...auth,
      name: nameInput ? nameInput.value.trim() : auth.name,
      phone: phoneInput ? phoneInput.value.trim() : auth.phone,
      email: emailInput ? emailInput.value.trim() : (auth.email || ''),
      kelompokTani: poktanInput ? poktanInput.value.trim() : (auth.kelompokTani || ''),
      lahanHa: lahanInput ? parseFloat(lahanInput.value) || 1 : (auth.lahanHa || 1),
      komoditasUtama: komoditasInput ? komoditasInput.value.trim() : (auth.komoditasUtama || ''),
      address: addressInput ? addressInput.value.trim() : (auth.address || '')
    };

    window.taniStore.setAuth(updated);
    window.taniStore.saveCustomer(updated);
    this.renderHeaderUserInfo();
    this.invalidateView('profile');
    this.invalidateView('dasbor');
    this.renderProfile();
    TaniAuth.showToast('Data profil petani & keanggotaan berhasil diperbarui!', 'success');
  },

  saveProfileData() {
    this.saveProfile();
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
};

window.CustomerApp = CustomerApp;
