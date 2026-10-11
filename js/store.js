/**
 * Tani.SM - Local Storage Persistence Engine & State Management
 */

class TaniStore {
  constructor() {
    this.STORAGE_KEYS = {
      PRODUCTS: 'tanism_products',
      CATEGORIES: 'tanism_categories',
      CUSTOMERS: 'tanism_customers',
      ORDERS: 'tanism_orders',
      VOUCHERS: 'tanism_vouchers',
      TIPS: 'tanism_tips',
      REVIEWS: 'tanism_reviews',
      STOCK_LOGS: 'tanism_stock_logs',
      BANNERS: 'tanism_banners',
      CART: 'tanism_cart',
      WISHLIST: 'tanism_wishlist',
      AUTH: 'tanism_auth_session',
      MEMBER_SETTINGS: 'tanism_member_settings'
    };

    // Cache in-memory: menghindari JSON.parse localStorage berulang di setiap render.
    this._cache = new Map();
    // Index produk by-id agar getProductById() O(1), bukan scan seluruh array.
    this._productIndex = null;

    this.initData();
  }

  // --- Cache Layer (semua akses localStorage HARUS lewat sini) ---
  readKey(key, fallback = null) {
    if (this._cache.has(key)) return this._cache.get(key);
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return fallback;
    }
    let value = fallback;
    if (raw !== null) {
      try {
        value = JSON.parse(raw);
      } catch {
        value = fallback;
      }
    }
    this._cache.set(key, value);
    return value;
  }

  writeKey(key, value) {
    this._cache.set(key, value);
    // Data produk & pengaturan member memengaruhi isi object tier.
    if (key === this.STORAGE_KEYS.PRODUCTS) {
      this._productIndex = null;
      this._clearTierCache();
    }
    if (key === this.STORAGE_KEYS.MEMBER_SETTINGS) {
      this._clearTierCache();
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('[TaniStore] Gagal menyimpan', key, err);
    }
    return value;
  }

  removeKey(key) {
    this._cache.delete(key);
    if (key === this.STORAGE_KEYS.PRODUCTS) {
      this._productIndex = null;
      this._clearTierCache();
    }
    localStorage.removeItem(key);
  }

  // Dipakai saat data berubah dari luar (mis. reset dari halaman admin).
  invalidate(key = null) {
    if (key) {
      this._cache.delete(key);
      if (key === this.STORAGE_KEYS.PRODUCTS) this._productIndex = null;
    } else {
      this._cache.clear();
      this._productIndex = null;
    }
  }

  // Seed hanya jalan bila key benar-benar belum pernah tersimpan.
  seedIfMissing(key, seedValue) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(seedValue));
    }
    this._cache.set(key, this.readKey(key));
  }

  initData() {
    this.seedIfMissing(this.STORAGE_KEYS.PRODUCTS, SEED_DATA.products);
    this.seedIfMissing(this.STORAGE_KEYS.CATEGORIES, SEED_DATA.categories);
    this.seedIfMissing(this.STORAGE_KEYS.CUSTOMERS, SEED_DATA.customers);
    this.seedIfMissing(this.STORAGE_KEYS.MEMBER_SETTINGS, SEED_DATA.memberSettings);
    this.seedIfMissing(this.STORAGE_KEYS.ORDERS, SEED_DATA.orders);
    this.seedIfMissing(this.STORAGE_KEYS.VOUCHERS, SEED_DATA.vouchers);
    this.seedIfMissing(this.STORAGE_KEYS.TIPS, SEED_DATA.tips);
    this.seedIfMissing(this.STORAGE_KEYS.REVIEWS, SEED_DATA.reviews);
    this.seedIfMissing(this.STORAGE_KEYS.STOCK_LOGS, SEED_DATA.stockLogs);
    this.seedIfMissing(this.STORAGE_KEYS.BANNERS, SEED_DATA.warehouseBanners);
    this.seedIfMissing(this.STORAGE_KEYS.CART, []);
    this.seedIfMissing(this.STORAGE_KEYS.WISHLIST, []);

    if (localStorage.getItem(this.STORAGE_KEYS.AUTH) === null) {
      // Default initial session: Customer
      const defaultAuth = {
        role: 'customer',
        id: 'CST-001',
        name: 'Budi Santoso',
        phone: '0812-3456-7890',
        email: 'budi.santoso@pertanian.id',
        kelompokTani: 'Poktan Makmur Jaya (Klaten)',
        address: 'Dusun Jetis RT 03/RW 02, Desa Ceper, Kec. Ceper, Kab. Klaten, Jawa Tengah 57465',
        tier: 'silver',
        points: 124
      };
      localStorage.setItem(this.STORAGE_KEYS.AUTH, JSON.stringify(defaultAuth));
    }

    this.ensureCustomerMembershipData();
  }

  ensureCustomerMembershipData() {
    const custs = this.getCustomers();
    let updated = false;
    custs.forEach(c => {
      if (!c.tier) {
        c.tier = (c.totalSpent >= 5000000) ? 'platinum' : ((c.totalSpent >= 1500000) ? 'gold' : 'silver');
        c.points = c.points || Math.floor((c.totalSpent || 0) / 10000);
        c.periodSpent = c.periodSpent || c.totalSpent || 0;
        updated = true;
      }
    });
    if (updated) {
      this.writeKey(this.STORAGE_KEYS.CUSTOMERS, custs);
    }
  }

  // --- Auth Methods ---
  getAuth() {
    const auth = this.readKey(this.STORAGE_KEYS.AUTH, null);
    if (!auth) return null;
    if (auth.role === 'customer' && auth.id) {
      const freshCust = this.getCustomerById(auth.id);
      if (freshCust) {
        auth.tier = freshCust.tier || 'silver';
        auth.points = freshCust.points || 0;
      }
    }
    return auth;
  }

  setAuth(user) {
    return this.writeKey(this.STORAGE_KEYS.AUTH, user);
  }

  loginAsCustomer(customerData = null) {
    const cust = customerData || this.getCustomers()[0];
    const session = {
      role: 'customer',
      id: cust.id,
      name: cust.name,
      phone: cust.phone,
      email: cust.email,
      kelompokTani: cust.kelompokTani,
      address: cust.address,
      tier: cust.tier || 'silver',
      points: cust.points || 0
    };
    this.setAuth(session);
    return session;
  }

  loginAsAdmin(adminData = null) {
    const session = {
      role: 'admin',
      id: 'ADM-GUDANG-01',
      name: 'Pak Joko Purnomo',
      title: 'Kepala Gudang Distribusi',
      warehouseLocation: 'Gudang Pusat Tani.SM - Klaten',
      email: 'admin.gudang@tanism.id'
    };
    this.setAuth(session);
    return session;
  }

  logout() {
    this.removeKey(this.STORAGE_KEYS.AUTH);
  }

  // --- Products ---
  getProducts() {
    return this.readKey(this.STORAGE_KEYS.PRODUCTS, []);
  }

  // Map index rebuilt lazily, otomatis invalidasi setiap kali produk ditulis.
  getProductMap() {
    if (!this._productIndex) {
      this._productIndex = new Map(this.getProducts().map(p => [p.id, p]));
    }
    return this._productIndex;
  }

  getProductById(id) {
    return this.getProductMap().get(id) || null;
  }

  saveProduct(product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...products[index], ...product };
    } else {
      products.unshift(product);
    }
    this.writeKey(this.STORAGE_KEYS.PRODUCTS, products);
    return product;
  }

  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.writeKey(this.STORAGE_KEYS.PRODUCTS, products);
  }

  updateProductStock(productId, deltaQty, type = 'Penyesuaian', note = '') {
    const products = this.getProducts();
    const p = products.find(prod => prod.id === productId);
    if (!p) return false;

    p.stock = Math.max(0, p.stock + deltaQty);
    this.writeKey(this.STORAGE_KEYS.PRODUCTS, products);

    // Log the change
    this.addStockLog({
      id: 'LOG-' + Date.now(),
      date: this.getCurrentDateTime(),
      productId: p.id,
      productName: p.name,
      type: type,
      qty: Math.abs(deltaQty),
      balance: p.stock,
      note: note || `Penyesuaian stok manual (${deltaQty > 0 ? '+' : ''}${deltaQty})`
    });

    return p;
  }

  // --- Categories ---
  getCategories() {
    return this.readKey(this.STORAGE_KEYS.CATEGORIES, []);
  }

  saveCategory(cat) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === cat.id);
    if (idx >= 0) {
      cats[idx] = cat;
    } else {
      cats.push(cat);
    }
    this.writeKey(this.STORAGE_KEYS.CATEGORIES, cats);
    return cat;
  }

  deleteCategory(catId) {
    this.writeKey(this.STORAGE_KEYS.CATEGORIES, this.getCategories().filter(c => c.id !== catId));
  }

  // --- Customers ---
  getCustomers() {
    return this.readKey(this.STORAGE_KEYS.CUSTOMERS, []);
  }

  getCustomerById(id) {
    return this.getCustomers().find(c => c.id === id) || null;
  }

  saveCustomer(customer) {
    const custs = this.getCustomers();
    const idx = custs.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      custs[idx] = customer;
    } else {
      custs.push(customer);
    }
    this.writeKey(this.STORAGE_KEYS.CUSTOMERS, custs);
    return customer;
  }

  // --- Orders ---
  getOrders() {
    return this.readKey(this.STORAGE_KEYS.ORDERS, []);
  }

  getOrderById(id) {
    return this.getOrders().find(o => o.id === id) || null;
  }

  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    this.writeKey(this.STORAGE_KEYS.ORDERS, orders);
    return order;
  }

  updateOrderStatus(orderId, newStatus, trackingNote = '', paymentStatus = null) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = newStatus;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }
    if (trackingNote) {
      if (!order.trackingHistory) order.trackingHistory = [];
      order.trackingHistory.push({
        time: this.getCurrentDateTime(),
        text: trackingNote
      });
    }
    this.writeKey(this.STORAGE_KEYS.ORDERS, orders);
    return order;
  }

  // --- Stock Logs ---
  getStockLogs() {
    return this.readKey(this.STORAGE_KEYS.STOCK_LOGS, []);
  }

  addStockLog(log) {
    const logs = this.getStockLogs();
    logs.unshift(log);
    this.writeKey(this.STORAGE_KEYS.STOCK_LOGS, logs);
  }

  // --- Vouchers / Promo ---
  getVouchers() {
    return this.readKey(this.STORAGE_KEYS.VOUCHERS, []);
  }

  saveVoucher(v) {
    const vouchers = this.getVouchers();
    const idx = vouchers.findIndex(x => x.code.toUpperCase() === v.code.toUpperCase());
    if (idx >= 0) {
      vouchers[idx] = v;
    } else {
      vouchers.push(v);
    }
    this.writeKey(this.STORAGE_KEYS.VOUCHERS, vouchers);
    return v;
  }

  deleteVoucher(code) {
    this.writeKey(this.STORAGE_KEYS.VOUCHERS, this.getVouchers().filter(v => v.code !== code));
  }

  // --- Content / Tips ---
  getTips() {
    return this.readKey(this.STORAGE_KEYS.TIPS, []);
  }

  getTipById(id) {
    return this.getTips().find(t => t.id === id) || null;
  }

  saveTip(tip) {
    const tips = this.getTips();
    const idx = tips.findIndex(t => t.id === tip.id);
    if (idx >= 0) {
      tips[idx] = tip;
    } else {
      tips.unshift(tip);
    }
    this.writeKey(this.STORAGE_KEYS.TIPS, tips);
    return tip;
  }

  deleteTip(id) {
    this.writeKey(this.STORAGE_KEYS.TIPS, this.getTips().filter(t => t.id !== id));
  }

  // --- Reviews ---
  getReviews() {
    return this.readKey(this.STORAGE_KEYS.REVIEWS, []);
  }

  addReview(review) {
    const reviews = this.getReviews();
    reviews.unshift(review);
    this.writeKey(this.STORAGE_KEYS.REVIEWS, reviews);

    // Update product rating
    const products = this.getProducts();
    const product = products.find(p => p.id === review.productId);
    if (product) {
      const prodReviews = reviews.filter(r => r.productId === product.id);
      const totalStars = prodReviews.reduce((sum, r) => sum + Number(r.rating), 0);
      product.rating = Number((totalStars / prodReviews.length).toFixed(1));
      product.reviewCount = prodReviews.length;
      this.writeKey(this.STORAGE_KEYS.PRODUCTS, products);
    }
    return review;
  }

  // --- Cart ---
  getCart() {
    return this.readKey(this.STORAGE_KEYS.CART, []);
  }

  saveCart(cart) {
    return this.writeKey(this.STORAGE_KEYS.CART, cart);
  }

  addToCart(productId, qty = 1) {
    const cart = this.getCart();
    const product = this.getProductById(productId);
    if (!product) return cart;

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
      existing.qty = Math.min(product.stock, existing.qty + qty);
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        image: product.image,
        weightGram: product.weightGram || 1000,
        qty: Math.min(product.stock, qty),
        selected: true
      });
    }
    this.writeKey(this.STORAGE_KEYS.CART, cart);
    return cart;
  }

  updateCartQty(productId, qty) {
    let cart = this.getCart();
    const product = this.getProductById(productId);
    const maxStock = product ? product.stock : 999;

    if (qty <= 0) {
      cart = cart.filter(item => item.productId !== productId);
    } else {
      const item = cart.find(i => i.productId === productId);
      if (item) {
        item.qty = Math.min(maxStock, qty);
      }
    }
    this.writeKey(this.STORAGE_KEYS.CART, cart);
    return cart;
  }

  removeFromCart(productId) {
    const cart = this.getCart().filter(item => item.productId !== productId);
    this.writeKey(this.STORAGE_KEYS.CART, cart);
    return cart;
  }

  clearCart() {
    this.writeKey(this.STORAGE_KEYS.CART, []);
  }

  // --- Wishlist ---
  getWishlist() {
    return this.readKey(this.STORAGE_KEYS.WISHLIST, []);
  }

  toggleWishlist(productId) {
    const wishlist = this.getWishlist();
    const index = wishlist.indexOf(productId);
    if (index >= 0) {
      wishlist.splice(index, 1);
    } else {
      wishlist.push(productId);
    }
    this.writeKey(this.STORAGE_KEYS.WISHLIST, wishlist);
    return wishlist.includes(productId);
  }

  isWishlisted(productId) {
    return this.getWishlist().includes(productId);
  }

  // --- Member & Loyalty Engine ---
  getMemberSettings() {
    const stored = this.readKey(this.STORAGE_KEYS.MEMBER_SETTINGS, null);
    return stored ? { ...SEED_DATA.memberSettings, ...stored } : { ...SEED_DATA.memberSettings };
  }

  saveMemberSettings(newSettings) {
    const updated = { ...this.getMemberSettings(), ...newSettings };
    this.writeKey(this.STORAGE_KEYS.MEMBER_SETTINGS, updated);
    return updated;
  }

  getTierInfo(tierKey = 'silver') {
    const key = (tierKey || 'silver').toLowerCase();
    // Memoized: object tier ini hefty & dipanggil berulang (satu kali per kartu produk).
    if (this._tierCache && this._tierCache.key === key) {
      return this._tierCache.value;
    }

    const settings = this.getMemberSettings();
    const bonusProduct = this.getProductById(settings.freeProductId) || {
      id: settings.freeProductId,
      name: 'Tray Semai Bibit 128 Lubang Tebal',
      price: 8500,
      unit: '1 Pcs'
    };

    const tiers = {
      silver: {
        key: 'silver',
        name: 'SILVER',
        badge: '🥈',
        color: '#94A3B8',
        bgGradient: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
        textColor: '#E2E8F0',
        minSpend: 0,
        nextTier: 'gold',
        nextMinSpend: settings.goldMinSpend,
        pointsMultiplier: Number(settings.pointsMultiplierSilver) || 1.0,
        discountPercent: 0,
        hasMemberPrice: true,
        priorityService: false,
        freeProductEligible: false,
        perks: [
          'Harga khusus member pada produk tertentu',
          'Mendapat informasi promo dan produk terbaru',
          'Dapat mengumpulkan poin belanja (1x)',
          'Mendapat promo kupon khusus member'
        ]
      },
      gold: {
        key: 'gold',
        name: 'GOLD',
        badge: '🥇',
        color: '#F59E0B',
        bgGradient: 'linear-gradient(135deg, #B45309 0%, #78350F 100%)',
        textColor: '#FEF3C7',
        minSpend: settings.goldMinSpend,
        nextTier: 'platinum',
        nextMinSpend: settings.platinumMinSpend,
        pointsMultiplier: Number(settings.pointsMultiplierGold) || 1.5,
        discountPercent: Number(settings.goldDiscountPercent) || 5,
        hasMemberPrice: true,
        priorityService: false,
        earlyPromoAccess: true,
        freeProductEligible: false,
        perks: [
          'Semua benefit Silver',
          `Diskon khusus Gold ${settings.goldDiscountPercent}% pada produk yang memenuhi syarat`,
          `Mendapat poin ${settings.pointsMultiplierGold}x lebih banyak dibanding Silver`,
          'Mendapat promo eksklusif Gold',
          'Mendapat informasi promo lebih awal'
        ]
      },
      platinum: {
        key: 'platinum',
        name: 'PLATINUM',
        badge: '💎',
        color: '#38BDF8',
        bgGradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
        textColor: '#E0F2FE',
        minSpend: settings.platinumMinSpend,
        nextTier: null,
        nextMinSpend: null,
        pointsMultiplier: Number(settings.pointsMultiplierPlatinum) || 2.0,
        discountPercent: Number(settings.platinumDiscountPercent) || 10,
        hasMemberPrice: true,
        priorityService: true,
        earlyPromoAccess: true,
        freeProductEligible: true,
        freeProductMinSpend: settings.freeProductMinSpend,
        bonusProduct: bonusProduct,
        freeProductQty: settings.freeProductQty || 1,
        perks: [
          'Semua benefit Gold',
          `Diskon lebih besar ${settings.platinumDiscountPercent}% pada produk yang memenuhi syarat`,
          `Mendapat poin paling banyak (${settings.pointsMultiplierPlatinum}x)`,
          'Prioritas pelayanan pengemasan & pengiriman cepat',
          'Mendapat promo eksklusif Platinum',
          `Berkesempatan mendapatkan bonus free product: ${bonusProduct.name} (Min. Transaksi ${this.formatRupiah(settings.freeProductMinSpend)})`
        ]
      }
    };

    const value = tiers[key] || tiers.silver;
    this._tierCache = { key, value };
    return value;
  }

  // Cache di invalidate setiap kali produk atau pengaturan member berubah.
  _clearTierCache() {
    this._tierCache = null;
  }

  // Menghitung total transaksi pelanggan dalam periode evaluasi tertentu (default 90 hari)
  calculateCustomerPeriodSpend(customerId, periodDays = null) {
    const settings = this.getMemberSettings();
    const days = periodDays || settings.evaluationPeriodDays || 90;
    const orders = this.getOrders().filter(o => o.customerId === customerId && o.status !== 'Dibatalkan');
    
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    let total = 0;
    orders.forEach(o => {
      const orderDate = new Date(o.date ? o.date.replace(' ', 'T') : now);
      if (!isNaN(orderDate.getTime())) {
        if (orderDate >= cutoffDate) {
          total += Number(o.total || 0);
        }
      } else {
        total += Number(o.total || 0);
      }
    });

    if (total === 0) {
      const cust = this.getCustomerById(customerId);
      if (cust && cust.periodSpent) {
        total = Number(cust.periodSpent);
      }
    }

    return total;
  }

  // Evaluasi kenaikan/penurunan level berdasarkan aktivitas transaksi dalam periode evaluasi
  evaluateCustomerTier(customerId) {
    const cust = this.getCustomerById(customerId);
    if (!cust) return null;

    const settings = this.getMemberSettings();
    const periodSpend = this.calculateCustomerPeriodSpend(customerId, settings.evaluationPeriodDays);
    const oldTier = cust.tier || 'silver';

    let newTier = 'silver';
    if (periodSpend >= Number(settings.platinumMinSpend)) {
      newTier = 'platinum';
    } else if (periodSpend >= Number(settings.goldMinSpend)) {
      newTier = 'gold';
    }

    cust.periodSpent = periodSpend;
    cust.tier = newTier;
    cust.lastEvaluated = this.getCurrentDateTime();
    this.saveCustomer(cust);

    // If active session belongs to this customer, update session
    const auth = this.getAuth();
    if (auth && auth.id === customerId) {
      auth.tier = newTier;
      auth.points = cust.points || 0;
      this.setAuth(auth);
    }

    return {
      customerId,
      customerName: cust.name,
      periodSpend,
      oldTier,
      newTier,
      isChanged: oldTier !== newTier,
      isUpgraded: (oldTier === 'silver' && (newTier === 'gold' || newTier === 'platinum')) || (oldTier === 'gold' && newTier === 'platinum')
    };
  }

  // Evaluasi berkala seluruh pelanggan
  evaluateAllCustomers() {
    const customers = this.getCustomers();
    const results = [];
    customers.forEach(c => {
      const res = this.evaluateCustomerTier(c.id);
      if (res) results.push(res);
    });
    return results;
  }

  // Hitung benefit member untuk keranjang/checkout
  calculateOrderMemberBenefits(customerId, cartItems, subtotal) {
    const cust = this.getCustomerById(customerId);
    const tierKey = cust ? (cust.tier || 'silver') : 'silver';
    const tierInfo = this.getTierInfo(tierKey);
    const settings = this.getMemberSettings();

    // 1. Potongan Diskon Persentase Tier Member (Gold / Platinum)
    let tierDiscount = 0;
    if (tierInfo.discountPercent > 0) {
      let eligibleSubtotal = 0;
      cartItems.forEach(item => {
        const prod = this.getProductById(item.productId);
        if (!prod || prod.eligibleForTierDiscount !== false) {
          eligibleSubtotal += (item.price * item.qty);
        }
      });
      tierDiscount = Math.round((eligibleSubtotal * tierInfo.discountPercent) / 100);
      // Batas maksimum diskon agar sistem tidak merugikan perusahaan / masuk akal
      const maxCap = Number(settings.maxDiscountCap) || 150000;
      if (tierDiscount > maxCap) {
        tierDiscount = maxCap;
      }
    }

    // 2. Bonus Free Product Platinum (HANYA jika Platinum dan belanja >= freeProductMinSpend)
    let freeBonusProduct = null;
    let isFreeBonusEligible = false;
    if (tierInfo.freeProductEligible && subtotal >= Number(settings.freeProductMinSpend)) {
      isFreeBonusEligible = true;
      const bonusProd = this.getProductById(settings.freeProductId) || tierInfo.bonusProduct;
      if (bonusProd) {
        freeBonusProduct = {
          productId: bonusProd.id,
          name: bonusProd.name,
          unit: bonusProd.unit || '1 Pcs',
          qty: 1, // Dibatasi 1 unit per transaksi yang memenuhi syarat, TIDAK gratis tanpa batas!
          price: 0,
          originalPrice: bonusProd.price || 0,
          isFreeGift: true,
          label: 'Bonus Spesial Platinum (1x Gratis)'
        };
      }
    }

    // 3. Poin Belanja yang didapatkan
    const pointsRatio = Number(settings.pointsPerRupiah) || 10000;
    const basePoints = Math.floor(subtotal / pointsRatio);
    const pointsEarned = Math.floor(basePoints * (tierInfo.pointsMultiplier || 1.0));

    return {
      tierKey,
      tierInfo,
      tierDiscount,
      isFreeBonusEligible,
      freeBonusProduct,
      pointsEarned,
      currentPoints: cust ? (cust.points || 0) : 0
    };
  }

  addCustomerPoints(customerId, points) {
    const cust = this.getCustomerById(customerId);
    if (!cust) return 0;
    cust.points = (cust.points || 0) + Number(points);
    this.saveCustomer(cust);
    return cust.points;
  }

  // Filter pesanan milik customer tertentu
  getOrdersByCustomer(customerId) {
    return this.getOrders().filter(o => o.customerId === customerId);
  }

  // --- Utilities ---
  formatRupiah(number) {
    if (isNaN(number)) return 'Rp 0';
    return 'Rp ' + Number(number).toLocaleString('id-ID');
  }

  getCurrentDateTime() {
    const d = new Date();
    const pad = n => (n < 10 ? '0' + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  resetAllData() {
    this.invalidate();
    localStorage.clear();
    this.initData();
  }
}

// Global singleton instance
window.taniStore = new TaniStore();
