/**
 * Tani.SM - Customer Portal Controller
 * Mengelola Beranda, Katalog, Detail Produk, Keranjang, Checkout,
 * Pesanan, Pelacakan, Wishlist, Ulasan, Tips, dan Profil Petani.
 */

document.addEventListener('DOMContentLoaded', () => {
  CustomerApp.init();
});

const CustomerApp = {
  activeView: 'dasbor',
  currentCategoryFilter: 'all',
  currentSort: 'related',
  priceMin: null,
  priceMax: null,
  ratingFilter: null,
  searchQuery: '',
  appliedVoucher: null,

  init() {
    this.bindEvents();
    this.renderHeaderUserInfo();
    this.updateCartBadge();
    this.renderDasbor();
    this.renderCatalog();
    this.renderTips();

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

    if (view) {
      this.switchView(view);
    } else {
      this.switchView('dasbor');
    }

    if (productId) {
      this.openProductDetail(productId);
    }
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
          this.searchQuery = input.value.trim();
          this.switchView('catalog');
          this.renderCatalog();
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

  handleGlobalSearch(e) {
    const q = (e.target.value || '').toLowerCase().trim();
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
      if (this.activeView !== 'catalog') {
        this.switchView('catalog');
      }
      this.renderCatalog();
    }
  },

  switchView(viewName) {
    if (viewName === 'logout') {
      if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
        if (window.taniStore && typeof window.taniStore.logout === 'function') {
          window.taniStore.logout();
        } else {
          localStorage.removeItem('tani_auth_session');
        }
        if (window.TaniAuth && typeof window.TaniAuth.logout === 'function') {
          window.TaniAuth.logout('customer');
        } else {
          window.location.href = 'login-customer.html';
        }
      }
      return;
    }

    if (viewName === 'home') {
      viewName = 'dasbor';
    }

    this.activeView = viewName;
    this.toggleMobileSidebar(false);

    // Update active nav link
    document.querySelectorAll('.customer-nav-item, .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Hide all views and show active view
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Refresh view-specific data
    if (viewName === 'dasbor') this.renderDasbor();
    if (viewName === 'catalog') this.renderCatalog();
    if (viewName === 'cart') this.renderCart();
    if (viewName === 'checkout') this.renderCheckout();
    if (viewName === 'orders') this.renderOrders();
    if (viewName === 'tracking') this.renderTracking();
    if (viewName === 'wishlist') this.renderWishlist();
    if (viewName === 'reviews') this.renderReviews();
    if (viewName === 'tips') this.renderTips();
    if (viewName === 'profile') this.renderProfile();
  },

  renderHeaderUserInfo() {
    const auth = window.taniStore.getAuth();
    const nameEl = document.getElementById('customer-top-user-name');
    const roleEl = document.getElementById('customer-top-user-role');
    const userDisplay = document.getElementById('header-user-display');
    const roleTagDisplay = document.getElementById('role-tag-display');
    const actionLinks = document.getElementById('role-action-links');

    if (nameEl) nameEl.textContent = auth ? auth.name || 'customer' : 'customer';
    if (roleEl) roleEl.textContent = auth && auth.role === 'admin' ? 'Admin Gudang' : (auth && auth.kelompokTani ? `Petani (${auth.kelompokTani})` : 'Customer');

    if (auth) {
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
          roleTagDisplay.textContent = 'Customer / Petani';
          roleTagDisplay.style.backgroundColor = '#374151';
          roleTagDisplay.style.color = '#F3F4F6';
        }
        if (userDisplay) {
          userDisplay.textContent = auth.name + (auth.kelompokTani ? ` (${auth.kelompokTani})` : '');
        }
        if (actionLinks) {
          actionLinks.innerHTML = `
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
    this.switchView('catalog');
    this.renderCatalog();
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

    // Filtering
    let filtered = products.filter(p => {
      // Category
      if (this.currentCategoryFilter !== 'all' && p.categoryId !== this.currentCategoryFilter) {
        return false;
      }
      // Search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description && p.description.toLowerCase().includes(q);
        const matchIng = p.activeIngredient && p.activeIngredient.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchIng) return false;
      }
      // Price range
      if (this.priceMin !== null && p.price < this.priceMin) return false;
      if (this.priceMax !== null && p.price > this.priceMax) return false;
      // Rating
      if (this.ratingFilter !== null && p.rating < this.ratingFilter) return false;
      return true;
    });

    // Sorting
    if (this.currentSort === 'popular') {
      filtered.sort((a, b) => b.soldCount - a.soldCount);
    } else if (this.currentSort === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (this.currentSort === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (this.currentSort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    // Render Results
    const container = document.getElementById('catalog-products-grid');
    const countLabel = document.getElementById('catalog-result-count');
    if (countLabel) {
      countLabel.textContent = `Menampilkan ${filtered.length} produk pertanian pilihan`;
    }

    if (container) {
      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #FFF; border: 1px solid #E5E7EB; border-radius: 4px;">
            <p style="font-weight: 600; font-size: 15px; color: #4B5563;">Tidak ditemukan sarana pertanian yang sesuai filter.</p>
            <p style="font-size: 13px; color: #9CA3AF; margin-top: 6px;">Coba gunakan kata kunci lain seperti benih, pupuk, sprayer, atau reset filter harga.</p>
            <button class="btn btn-secondary btn-sm" style="margin-top: 14px;" onclick="CustomerApp.resetCatalogFilters()">Reset Semua Filter</button>
          </div>
        `;
      } else {
        container.innerHTML = filtered.map(p => this.createProductCardHtml(p)).join('');
      }
    }
  },

  setCatalogCat(catId) {
    this.currentCategoryFilter = catId;
    this.renderCatalog();
  },

  setSort(sortType) {
    this.currentSort = sortType;
    document.querySelectorAll('.sort-btn').forEach(b => {
      if (b.getAttribute('data-sort') === sortType) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
    this.renderCatalog();
  },

  applyPriceFilter() {
    const minInput = document.getElementById('filter-price-min');
    const maxInput = document.getElementById('filter-price-max');
    this.priceMin = minInput.value ? Number(minInput.value) : null;
    this.priceMax = maxInput.value ? Number(maxInput.value) : null;
    this.renderCatalog();
  },

  applyRatingFilter(minRating) {
    this.ratingFilter = minRating;
    this.renderCatalog();
  },

  resetCatalogFilters() {
    this.currentCategoryFilter = 'all';
    this.searchQuery = '';
    this.priceMin = null;
    this.priceMax = null;
    this.ratingFilter = null;
    this.currentSort = 'related';

    const sInput = document.getElementById('search-input');
    if (sInput) sInput.value = '';
    const minInput = document.getElementById('filter-price-min');
    if (minInput) minInput.value = '';
    const maxInput = document.getElementById('filter-price-max');
    if (maxInput) maxInput.value = '';

    this.renderCatalog();
  },

  // Helper card generator
  createProductCardHtml(product, isFlash = false) {
    const isWished = window.taniStore.isWishlisted(product.id);
    const discPercent = product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

    let badgeClass = 'badge-orange';
    if (product.badge === 'Organik') badgeClass = 'badge-green';
    if (product.badge === 'Official') badgeClass = 'badge-blue';

    const fallbackImg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'><rect width='300' height='300' fill='%232E7D32'/><text x='50%' y='46%' dominant-baseline='middle' text-anchor='middle' fill='%23FFFFFF' font-family='sans-serif' font-size='22' font-weight='bold'>Tani.SM</text><text x='50%' y='60%' dominant-baseline='middle' text-anchor='middle' fill='%23A7F3D0' font-family='sans-serif' font-size='14'>Sarana Pertanian</text></svg>";
    return `
      <div class="product-card" onclick="CustomerApp.openProductDetail('${product.id}')">
        <div class="product-card-image-wrap">
          <img src="${product.image}" alt="${product.name}" class="product-card-image" loading="lazy" onerror="this.src='${fallbackImg}'">
          ${product.badge ? `<span class="badge ${badgeClass} product-card-badge">${product.badge}</span>` : ''}
          ${discPercent > 0 ? `<span class="badge badge-orange" style="position:absolute; top:8px; right:8px;">-${discPercent}%</span>` : ''}
        </div>
        <div class="product-card-body">
          <h4 class="product-card-title">${product.name}</h4>
          <div class="product-card-unit">${product.unit}</div>
          <div class="product-card-price-row">
            <span class="product-card-price">${window.taniStore.formatRupiah(product.price)}</span>
            ${product.originalPrice && product.originalPrice > product.price ? `<span class="product-card-strike">${window.taniStore.formatRupiah(product.originalPrice)}</span>` : ''}
          </div>
          <div class="product-card-meta">
            <span>Rating: ${product.rating} ★ (${product.soldCount} terjual)</span>
            <span class="product-card-location">${product.location.split(',')[0]}</span>
          </div>
        </div>
      </div>
    `;
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
    const discPercent = product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

    const reviews = window.taniStore.getReviews().filter(r => r.productId === product.id);

    modalContent.innerHTML = `
      <div class="detail-grid">
        <div>
          <div class="detail-img-box">
            <img src="${product.image}" alt="${product.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\' viewBox=\'0 0 300 300\'><rect width=\'300\' height=\'300\' fill=\'%232E7D32\'/><text x=\'50%\' y=\'46%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23FFFFFF\' font-family=\'sans-serif\' font-size=\'22\' font-weight=\'bold\'>Tani.SM</text><text x=\'50%\' y=\'60%\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23A7F3D0\' font-family=\'sans-serif\' font-size=\'14\'>Sarana Pertanian</text></svg>'">
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
            <span style="font-size:12px; color:#4B5563;">Gudang: <strong>${product.location}</strong></span>
          </div>

          <h2 class="detail-title">${product.name}</h2>

          <div class="detail-rating-row">
            <span style="color:#D97706; font-weight:700;">★ ${product.rating}</span>
            <span style="color:#6B7280;">|</span>
            <span><strong>${product.reviewCount}</strong> Ulasan Petani</span>
            <span style="color:#6B7280;">|</span>
            <span><strong>${product.soldCount}</strong> Terjual</span>
          </div>

          <div class="detail-price-box">
            <span class="detail-price">${window.taniStore.formatRupiah(product.price)}</span>
            ${product.originalPrice ? `<span class="detail-strike">${window.taniStore.formatRupiah(product.originalPrice)}</span>` : ''}
            ${discPercent > 0 ? `<span class="badge badge-orange">Diskon ${discPercent}%</span>` : ''}
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
    const cart = window.taniStore.getCart();
    const container = document.getElementById('cart-items-container');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const totalEl = document.getElementById('cart-total-val');
    const discountEl = document.getElementById('cart-discount-val');

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
      return;
    }

    let subtotal = 0;
    let totalWeight = 0;

    const rowsHtml = cart.map(item => {
      const lineTotal = item.price * item.qty;
      if (item.selected !== false) {
        subtotal += lineTotal;
        totalWeight += (item.weightGram || 1000) * item.qty;
      }

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

    container.innerHTML = `
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
    let discount = 0;
    if (this.appliedVoucher) {
      if (this.appliedVoucher.discountFlat) {
        discount = this.appliedVoucher.discountFlat;
      } else if (this.appliedVoucher.discountPercent) {
        discount = (subtotal * this.appliedVoucher.discountPercent) / 100;
        if (this.appliedVoucher.maxDiscount && discount > this.appliedVoucher.maxDiscount) {
          discount = this.appliedVoucher.maxDiscount;
        }
      }
    }

    const finalTotal = Math.max(0, subtotal - discount);

    if (subtotalEl) subtotalEl.textContent = window.taniStore.formatRupiah(subtotal);
    if (discountEl) discountEl.textContent = '- ' + window.taniStore.formatRupiah(discount);
    if (totalEl) totalEl.textContent = window.taniStore.formatRupiah(finalTotal);

    const weightEl = document.getElementById('cart-weight-val');
    if (weightEl) {
      weightEl.textContent = `${(totalWeight / 1000).toFixed(2)} Kg`;
    }
  },

  updateCartQty(productId, newQty) {
    window.taniStore.updateCartQty(productId, newQty);
    this.updateCartBadge();
    this.renderCart();
  },

  removeFromCart(productId) {
    window.taniStore.removeFromCart(productId);
    this.updateCartBadge();
    this.renderCart();
    TaniAuth.showToast('Item berhasil dihapus dari keranjang', 'info');
  },

  toggleCartItemSelect(productId, isSelected) {
    const cart = window.taniStore.getCart();
    const item = cart.find(i => i.productId === productId);
    if (item) {
      item.selected = isSelected;
      localStorage.setItem(window.taniStore.STORAGE_KEYS.CART, JSON.stringify(cart));
      this.renderCart();
    }
  },

  toggleCartAll(isSelected) {
    const cart = window.taniStore.getCart();
    cart.forEach(item => item.selected = isSelected);
    localStorage.setItem(window.taniStore.STORAGE_KEYS.CART, JSON.stringify(cart));
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

    // Populate Item Summary
    const itemsContainer = document.getElementById('checkout-items-list');
    let subtotal = 0;
    let totalWeight = 0;

    if (itemsContainer) {
      itemsContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;
        totalWeight += (item.weightGram || 1000) * item.qty;

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
    }

    // Calculate shipping based on weight & selected courier
    const courierSelect = document.querySelector('input[name="checkout-courier"]:checked');
    const courierRate = courierSelect ? Number(courierSelect.getAttribute('data-rate') || 25000) : 25000;
    const kg = Math.ceil(totalWeight / 1000);
    const shippingCost = Math.max(courierRate, courierRate + (kg - 1) * 3000);

    // Voucher
    let discount = 0;
    if (this.appliedVoucher) {
      if (this.appliedVoucher.discountFlat) {
        discount = this.appliedVoucher.discountFlat;
      } else if (this.appliedVoucher.discountPercent) {
        discount = (subtotal * this.appliedVoucher.discountPercent) / 100;
        if (this.appliedVoucher.maxDiscount && discount > this.appliedVoucher.maxDiscount) {
          discount = this.appliedVoucher.maxDiscount;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal + shippingCost - discount);

    document.getElementById('checkout-subtotal-val').textContent = window.taniStore.formatRupiah(subtotal);
    document.getElementById('checkout-shipping-val').textContent = window.taniStore.formatRupiah(shippingCost);
    document.getElementById('checkout-discount-val').textContent = '- ' + window.taniStore.formatRupiah(discount);
    document.getElementById('checkout-grand-total-val').textContent = window.taniStore.formatRupiah(grandTotal);
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
    let subtotal = 0;
    let totalWeight = 0;
    cart.forEach(i => {
      subtotal += i.price * i.qty;
      totalWeight += (i.weightGram || 1000) * i.qty;
    });

    const courierRate = courierRadio ? Number(courierRadio.getAttribute('data-rate') || 25000) : 25000;
    const kg = Math.ceil(totalWeight / 1000);
    const shippingCost = Math.max(courierRate, courierRate + (kg - 1) * 3000);

    let discount = 0;
    if (this.appliedVoucher) {
      if (this.appliedVoucher.discountFlat) {
        discount = this.appliedVoucher.discountFlat;
      } else if (this.appliedVoucher.discountPercent) {
        discount = (subtotal * this.appliedVoucher.discountPercent) / 100;
        if (this.appliedVoucher.maxDiscount && discount > this.appliedVoucher.maxDiscount) {
          discount = this.appliedVoucher.maxDiscount;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal + shippingCost - discount);
    const orderId = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);

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
      trackingNo: 'TANI-' + Math.floor(10000000 + Math.random() * 90000000),
      subtotal: subtotal,
      shippingCost: shippingCost,
      discount: discount,
      total: grandTotal,
      items: cart.map(c => ({
        productId: c.productId,
        name: c.name,
        price: c.price,
        qty: c.qty,
        unit: c.unit
      })),
      warehouseNotes: 'Pesanan baru dari web Tani.SM. Siapkan packing aman tahan guncangan.',
      trackingHistory: [
        { time: window.taniStore.getCurrentDateTime(), text: `Pesanan dibuat via web Tani.SM dengan metode ${paymentMethod}.` }
      ]
    };

    // Save order
    window.taniStore.saveOrder(newOrder);

    // Deduct Stock and log
    cart.forEach(item => {
      window.taniStore.updateProductStock(item.productId, -item.qty, 'Keluar', `Alokasi pesanan ${orderId}`);
    });

    // Clear cart & voucher
    window.taniStore.clearCart();
    this.appliedVoucher = null;
    this.updateCartBadge();

    TaniAuth.showToast(`Pesanan ${orderId} berhasil dibuat! Segera diproses oleh Admin Gudang.`, 'success');
    this.switchView('orders');
  },

  // ==========================================
  // 5. PESANAN SAYA
  // ==========================================
  renderOrders(statusFilter = 'all') {
    const orders = window.taniStore.getOrders();
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    // Filter by status tab
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
          <p style="font-weight:600; color:#4B5563;">Tidak ada pesanan di kategori status ini.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(order => {
      let statusBadge = 'badge-orange';
      if (order.status === 'Selesai') statusBadge = 'badge-green';
      if (order.status === 'Dikirim') statusBadge = 'badge-blue';

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <strong>No. Pesanan: ${order.id}</strong>
              <span style="color:#6B7280; margin-left:8px; font-size:12px;">(${order.date})</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge ${statusBadge}">${order.status}</span>
              <span class="badge badge-gray">${order.courier}</span>
            </div>
          </div>

          <div style="margin-bottom:14px;">
            ${order.items.map(item => `
              <div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0;">
                <div>
                  <strong>${item.name}</strong>
                  <span style="color:#6B7280;"> x ${item.qty} (${item.unit})</span>
                </div>
                <div>${window.taniStore.formatRupiah(item.price * item.qty)}</div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid #E5E7EB;">
            <div>
              <span style="font-size:12px; color:#6B7280;">Metode Bayar: <strong>${order.paymentMethod}</strong> (${order.paymentStatus})</span>
              <div style="font-size:12px; color:#1F2937; margin-top:2px;">Resi Kargo: <strong>${order.trackingNo}</strong></div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:12px; color:#6B7280;">Total Belanja: </span>
              <span class="font-price" style="font-size:18px;">${window.taniStore.formatRupiah(order.total)}</span>
              <div style="margin-top:8px; display:flex; gap:8px; justify-content:flex-end;">
                <button class="btn btn-secondary btn-sm" onclick="CustomerApp.openTrackingForOrder('${order.id}')">Lacak Resi</button>
                <button class="btn btn-outline-orange btn-sm" onclick="CustomerApp.openReviewModal('${order.items[0].productId}', '${order.items[0].name}')">Beri Ulasan</button>
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
  // 6. PELACAKAN RESI
  // ==========================================
  renderTracking(targetOrder = null) {
    const orders = window.taniStore.getOrders();
    const selector = document.getElementById('tracking-order-select');

    if (selector && orders.length > 0) {
      selector.innerHTML = orders.map(o => `
        <option value="${o.id}" ${targetOrder && targetOrder.id === o.id ? 'selected' : ''}>
          ${o.id} - ${o.items[0] ? o.items[0].name.substring(0, 30) : 'Pesanan'} (${o.status})
        </option>
      `).join('');
    }

    const orderToTrack = targetOrder || (orders.length > 0 ? orders[0] : null);
    this.displayTrackingDetails(orderToTrack);
  },

  onTrackingSelectChange() {
    const selector = document.getElementById('tracking-order-select');
    if (!selector) return;
    const order = window.taniStore.getOrderById(selector.value);
    this.displayTrackingDetails(order);
  },

  openTrackingForOrder(orderId) {
    const order = window.taniStore.getOrderById(orderId);
    this.switchView('tracking');
    this.renderTracking(order);
  },

  displayTrackingDetails(order) {
    const detailsContainer = document.getElementById('tracking-result-box');
    if (!detailsContainer) return;

    if (!order) {
      detailsContainer.innerHTML = '<p style="padding:20px; color:#6B7280;">Pilih nomor pesanan untuk melacak posisi logistik sarana pertanian Anda.</p>';
      return;
    }

    const steps = [
      { key: 'Dibuat', label: 'Pesanan Dibuat', done: true },
      { key: 'Diproses', label: 'Dipacking di Gudang', done: order.status !== 'Menunggu Pembayaran' },
      { key: 'Dikirim', label: 'Kargo Berangkat', done: order.status === 'Dikirim' || order.status === 'Selesai' },
      { key: 'Selesai', label: 'Tiba di Lahan / Penerima', done: order.status === 'Selesai' }
    ];

    detailsContainer.innerHTML = `
      <div style="background:#FFF; border:1px solid #E5E7EB; border-radius:4px; padding:20px; margin-top:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #E5E7EB; padding-bottom:14px; margin-bottom:16px;">
          <div>
            <h3 style="font-size:16px; font-weight:700;">No. Resi: <span style="color:#2E7D32;">${order.trackingNo}</span></h3>
            <p style="font-size:12px; color:#6B7280; margin-top:2px;">Ekspedisi: <strong>${order.courier}</strong> | No. Pesanan: ${order.id}</p>
          </div>
          <div>
            <span class="badge ${order.status === 'Selesai' ? 'badge-green' : 'badge-orange'}" style="font-size:12px; padding:4px 8px;">${order.status}</span>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:24px; text-align:center;">
          ${steps.map((s, idx) => `
            <div style="padding:8px; border-radius:4px; background:${s.done ? '#E8F5E9' : '#F3F4F6'}; border:1px solid ${s.done ? '#A7F3D0' : '#E5E7EB'};">
              <div style="font-size:11px; font-weight:700; color:${s.done ? '#1B5E20' : '#6B7280'};">Tahap ${idx + 1}</div>
              <div style="font-size:12px; font-weight:600; color:${s.done ? '#1B5E20' : '#374151'}; margin-top:2px;">${s.label}</div>
            </div>
          `).join('')}
        </div>

        <h4 style="font-size:14px; font-weight:700; margin-bottom:12px;">Histori Perjalanan Paket Pertanian:</h4>
        <div class="timeline">
          ${(order.trackingHistory || []).map((h, i) => `
            <div class="timeline-item ${i === (order.trackingHistory.length - 1) ? 'active' : ''}">
              <div class="timeline-dot"></div>
              <div class="timeline-time">${h.time}</div>
              <div class="timeline-text">${h.text}</div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:20px; padding:12px; background:#F9FAFB; border-radius:4px; font-size:12px; color:#4B5563;">
          <strong>Alamat Tujuan:</strong> ${order.shippingAddress} (Penerima: ${order.customerName} - ${order.phone})
        </div>
      </div>
    `;
  },

  // ==========================================
  // 7. WISHLIST
  // ==========================================
  renderWishlist() {
    const wishlistIds = window.taniStore.getWishlist();
    const container = document.getElementById('wishlist-grid');
    if (!container) return;

    if (wishlistIds.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: #FFF; border: 1px solid #E5E7EB; border-radius: 4px;">
          <p style="font-weight: 600; font-size: 15px; color: #4B5563;">Belum ada sarana tani yang Anda simpan di Wishlist.</p>
          <p style="font-size: 13px; color: #9CA3AF; margin-top: 6px;">Simpan benih atau alat impian untuk persiapan musim tanam berikutnya.</p>
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

    // Re-render modal if open
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
        <div style="background:#FFF; border:1px solid #E5E7EB; border-radius:4px; padding:18px; margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <strong>${r.customerName}</strong>
              <div style="font-size:12px; color:#2E7D32; font-weight:600;">Produk: ${product ? product.name : 'Sarana Pertanian'}</div>
            </div>
            <div style="text-align:right;">
              <span style="color:#D97706; font-size:15px; font-weight:700;">${'★'.repeat(r.rating)}</span>
              <div style="font-size:11px; color:#9CA3AF; margin-top:2px;">${r.date}</div>
            </div>
          </div>
          <p style="font-size:13px; color:#374151; line-height:1.5;">"${r.comment}"</p>
        </div>
      `;
    }).join('');
  },

  openReviewModal(productId, productName) {
    const modal = document.getElementById('modal-review');
    if (!modal) return;

    document.getElementById('review-product-id').value = productId;
    document.getElementById('review-product-name').textContent = productName;
    document.getElementById('review-comment').value = '';
    modal.classList.add('active');
  },

  submitReviewForm() {
    const auth = window.taniStore.getAuth();
    const prodId = document.getElementById('review-product-id').value;
    const rating = parseInt(document.getElementById('review-rating-select').value) || 5;
    const comment = document.getElementById('review-comment').value.trim();

    if (!comment) {
      TaniAuth.showToast('Mohon tulis ulasan pengalaman penggunaan produk di lahan Anda', 'error');
      return;
    }

    const review = {
      id: 'REV-' + Date.now(),
      productId: prodId,
      customerName: auth ? auth.name : 'Petani Tani.SM',
      rating: rating,
      date: new Date().toISOString().slice(0, 10),
      comment: comment
    };

    window.taniStore.addReview(review);
    this.closeAllModals();
    TaniAuth.showToast('Terima kasih! Ulasan Anda sangat berharga bagi sesama petani.', 'success');
    this.renderReviews();
  },

  // ==========================================
  // 9. TIPS PERTANIAN
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

    document.getElementById('tip-modal-title').textContent = tip.title;
    document.getElementById('tip-modal-meta').textContent = `${tip.category} • Oleh: ${tip.author} • ${tip.date} • ${tip.readTime}`;
    document.getElementById('tip-modal-body').innerHTML = tip.content;
    modal.classList.add('active');
  },

  // ==========================================
  // 10. PROFIL CUSTOMER
  // ==========================================
  renderProfile() {
    const auth = window.taniStore.getAuth();
    if (!auth) return;

    const cust = window.taniStore.getCustomerById(auth.id) || auth;

    document.getElementById('profile-name').textContent = cust.name;
    document.getElementById('profile-poktan').textContent = cust.kelompokTani || 'Petani Mandiri';
    document.getElementById('profile-phone').textContent = cust.phone || '-';
    document.getElementById('profile-email').textContent = cust.email || '-';
    document.getElementById('profile-address').textContent = cust.address || '-';
    document.getElementById('profile-lahan').textContent = (cust.lahanHa || 1.2) + ' Hektar';
    document.getElementById('profile-komoditas').textContent = cust.komoditasUtama || 'Padi & Hortikultura';

    // Form inputs for editing
    document.getElementById('input-profile-name').value = cust.name || '';
    document.getElementById('input-profile-poktan').value = cust.kelompokTani || '';
    document.getElementById('input-profile-phone').value = cust.phone || '';
    document.getElementById('input-profile-address').value = cust.address || '';
    document.getElementById('input-profile-komoditas').value = cust.komoditasUtama || '';
  },

  saveProfileData() {
    const auth = window.taniStore.getAuth();
    if (!auth) return;

    const updated = {
      ...auth,
      name: document.getElementById('input-profile-name').value.trim(),
      kelompokTani: document.getElementById('input-profile-poktan').value.trim(),
      phone: document.getElementById('input-profile-phone').value.trim(),
      address: document.getElementById('input-profile-address').value.trim(),
      komoditasUtama: document.getElementById('input-profile-komoditas').value.trim()
    };

    window.taniStore.setAuth(updated);
    window.taniStore.saveCustomer(updated);
    this.renderHeaderUserInfo();
    this.renderProfile();
    TaniAuth.showToast('Data profil petani berhasil diperbarui!', 'success');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
};

window.CustomerApp = CustomerApp;
