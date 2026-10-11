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
      AUTH: 'tanism_auth_session'
    };

    this.initData();
  }

  initData() {
    if (!localStorage.getItem(this.STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(SEED_DATA.products));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CATEGORIES)) {
      localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(SEED_DATA.categories));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(this.STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_DATA.customers));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(SEED_DATA.orders));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.VOUCHERS)) {
      localStorage.setItem(this.STORAGE_KEYS.VOUCHERS, JSON.stringify(SEED_DATA.vouchers));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.TIPS)) {
      localStorage.setItem(this.STORAGE_KEYS.TIPS, JSON.stringify(SEED_DATA.tips));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.REVIEWS)) {
      localStorage.setItem(this.STORAGE_KEYS.REVIEWS, JSON.stringify(SEED_DATA.reviews));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.STOCK_LOGS)) {
      localStorage.setItem(this.STORAGE_KEYS.STOCK_LOGS, JSON.stringify(SEED_DATA.stockLogs));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.BANNERS)) {
      localStorage.setItem(this.STORAGE_KEYS.BANNERS, JSON.stringify(SEED_DATA.warehouseBanners));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.CART)) {
      localStorage.setItem(this.STORAGE_KEYS.CART, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.WISHLIST)) {
      localStorage.setItem(this.STORAGE_KEYS.WISHLIST, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.AUTH)) {
      // Default initial session: Customer
      const defaultAuth = {
        role: 'customer',
        id: 'CST-001',
        name: 'Budi Santoso',
        phone: '0812-3456-7890',
        email: 'budi.santoso@pertanian.id',
        kelompokTani: 'Poktan Makmur Jaya (Klaten)',
        address: 'Dusun Jetis RT 03/RW 02, Desa Ceper, Kec. Ceper, Kab. Klaten, Jawa Tengah 57465'
      };
      localStorage.setItem(this.STORAGE_KEYS.AUTH, JSON.stringify(defaultAuth));
    }
  }

  // --- Auth Methods ---
  getAuth() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.AUTH)) || null;
    } catch {
      return null;
    }
  }

  setAuth(user) {
    localStorage.setItem(this.STORAGE_KEYS.AUTH, JSON.stringify(user));
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
      address: cust.address
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
    localStorage.removeItem(this.STORAGE_KEYS.AUTH);
  }

  // --- Products ---
  getProducts() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.PRODUCTS) || '[]');
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  }

  saveProduct(product) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = { ...products[index], ...product };
    } else {
      products.unshift(product);
    }
    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return product;
  }

  deleteProduct(id) {
    let products = this.getProducts();
    products = products.filter(p => p.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  updateProductStock(productId, deltaQty, type = 'Penyesuaian', note = '') {
    const products = this.getProducts();
    const p = products.find(prod => prod.id === productId);
    if (!p) return false;

    p.stock = Math.max(0, p.stock + deltaQty);
    localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

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
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CATEGORIES) || '[]');
  }

  saveCategory(cat) {
    const cats = this.getCategories();
    const idx = cats.findIndex(c => c.id === cat.id);
    if (idx >= 0) {
      cats[idx] = cat;
    } else {
      cats.push(cat);
    }
    localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
    return cat;
  }

  deleteCategory(catId) {
    let cats = this.getCategories();
    cats = cats.filter(c => c.id !== catId);
    localStorage.setItem(this.STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  }

  // --- Customers ---
  getCustomers() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CUSTOMERS) || '[]');
  }

  getCustomerById(id) {
    return this.getCustomers().find(c => c.id === id);
  }

  saveCustomer(customer) {
    const custs = this.getCustomers();
    const idx = custs.findIndex(c => c.id === customer.id);
    if (idx >= 0) {
      custs[idx] = customer;
    } else {
      custs.push(customer);
    }
    localStorage.setItem(this.STORAGE_KEYS.CUSTOMERS, JSON.stringify(custs));
    return customer;
  }

  // --- Orders ---
  getOrders() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS) || '[]');
  }

  getOrderById(id) {
    return this.getOrders().find(o => o.id === id);
  }

  saveOrder(order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
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
    localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    return order;
  }

  // --- Stock Logs ---
  getStockLogs() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.STOCK_LOGS) || '[]');
  }

  addStockLog(log) {
    const logs = this.getStockLogs();
    logs.unshift(log);
    localStorage.setItem(this.STORAGE_KEYS.STOCK_LOGS, JSON.stringify(logs));
  }

  // --- Vouchers / Promo ---
  getVouchers() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.VOUCHERS) || '[]');
  }

  saveVoucher(v) {
    const vouchers = this.getVouchers();
    const idx = vouchers.findIndex(x => x.code.toUpperCase() === v.code.toUpperCase());
    if (idx >= 0) {
      vouchers[idx] = v;
    } else {
      vouchers.push(v);
    }
    localStorage.setItem(this.STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers));
    return v;
  }

  deleteVoucher(code) {
    let vouchers = this.getVouchers();
    vouchers = vouchers.filter(v => v.code !== code);
    localStorage.setItem(this.STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers));
  }

  // --- Content / Tips ---
  getTips() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.TIPS) || '[]');
  }

  getTipById(id) {
    return this.getTips().find(t => t.id === id);
  }

  saveTip(tip) {
    const tips = this.getTips();
    const idx = tips.findIndex(t => t.id === tip.id);
    if (idx >= 0) {
      tips[idx] = tip;
    } else {
      tips.unshift(tip);
    }
    localStorage.setItem(this.STORAGE_KEYS.TIPS, JSON.stringify(tips));
    return tip;
  }

  deleteTip(id) {
    let tips = this.getTips();
    tips = tips.filter(t => t.id !== id);
    localStorage.setItem(this.STORAGE_KEYS.TIPS, JSON.stringify(tips));
  }

  // --- Reviews ---
  getReviews() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.REVIEWS) || '[]');
  }

  addReview(review) {
    const reviews = this.getReviews();
    reviews.unshift(review);
    localStorage.setItem(this.STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));

    // Update product rating
    const products = this.getProducts();
    const product = products.find(p => p.id === review.productId);
    if (product) {
      const prodReviews = reviews.filter(r => r.productId === product.id);
      const totalStars = prodReviews.reduce((sum, r) => sum + Number(r.rating), 0);
      product.rating = Number((totalStars / prodReviews.length).toFixed(1));
      product.reviewCount = prodReviews.length;
      localStorage.setItem(this.STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }
    return review;
  }

  // --- Cart ---
  getCart() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.CART) || '[]');
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
    localStorage.setItem(this.STORAGE_KEYS.CART, JSON.stringify(cart));
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
    localStorage.setItem(this.STORAGE_KEYS.CART, JSON.stringify(cart));
    return cart;
  }

  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter(item => item.productId !== productId);
    localStorage.setItem(this.STORAGE_KEYS.CART, JSON.stringify(cart));
    return cart;
  }

  clearCart() {
    localStorage.setItem(this.STORAGE_KEYS.CART, JSON.stringify([]));
  }

  // --- Wishlist ---
  getWishlist() {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.WISHLIST) || '[]');
  }

  toggleWishlist(productId) {
    let wishlist = this.getWishlist();
    const index = wishlist.indexOf(productId);
    if (index >= 0) {
      wishlist.splice(index, 1);
    } else {
      wishlist.push(productId);
    }
    localStorage.setItem(this.STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
    return wishlist.includes(productId);
  }

  isWishlisted(productId) {
    return this.getWishlist().includes(productId);
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
    localStorage.clear();
    this.initData();
  }
}

// Global singleton instance
window.taniStore = new TaniStore();
