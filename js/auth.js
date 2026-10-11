/**
 * Tani.SM - Authentication & Permission Guard
 * Aturan Hak Akses:
 * - Akun ADMIN: Bisa mengakses halaman Customer (index.html) DAN halaman Admin (admin.html).
 * - Akun CUSTOMER: Hanya bisa mengakses halaman Customer (index.html), TIDAK BISA mengakses halaman Admin (admin.html).
 */

const TaniAuth = {
  getCurrentUser() {
    return window.taniStore.getAuth();
  },

  isLoggedIn() {
    return !!this.getCurrentUser();
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role === 'admin';
  },

  isCustomer() {
    const user = this.getCurrentUser();
    return user && user.role === 'customer';
  },

  /**
   * Guard untuk admin.html
   * Mencegah akun Customer masuk ke panel admin
   */
  requireAdminAccess() {
    const user = this.getCurrentUser();

    // 1. Belum login sama sekali
    if (!user) {
      window.location.href = 'login-admin.html';
      return false;
    }

    // 2. Login sebagai Customer -> BLOKIR AKSES!
    if (user.role === 'customer') {
      sessionStorage.setItem('access_denied_reason', 'customer_blocked');
      sessionStorage.setItem('access_denied_user', user.name || 'Petani');
      window.location.href = 'index.html?blocked=admin';
      return false;
    }

    // 3. Login sebagai Admin -> Diberi izin
    return true;
  },

  /**
   * Guard untuk index.html
   * Baik Admin maupun Customer diizinkan membuka halaman Customer
   */
  checkCustomerAccess() {
    const user = this.getCurrentUser();
    return true;
  },

  /**
   * Dicegat saat akun customer mengklik link ke admin di index.html
   */
  attemptAdminAccess(event) {
    if (event) event.preventDefault();
    const user = this.getCurrentUser();

    if (user && user.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      // Tampilkan modal / alert penolakan izin akses
      this.showAccessDeniedModal();
    }
  },

  showAccessDeniedModal() {
    let modal = document.getElementById('modal-access-denied');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-access-denied';
      modal.className = 'modal-overlay active';
      modal.innerHTML = `
        <div class="modal-box" style="max-width: 520px; border-top: 5px solid #DC2626;">
          <div class="modal-header">
            <h3 class="modal-title" style="color: #DC2626; display: flex; align-items: center; gap: 8px;">
              <span>🚫</span> Akses Panel Admin Ditolak
            </h3>
            <span class="modal-close" onclick="document.getElementById('modal-access-denied').classList.remove('active')">&times;</span>
          </div>
          <div class="modal-body" style="font-size: 13px; line-height: 1.6; color: #374151;">
            <p style="margin-bottom: 12px;">
              <strong>Perhatian Hak Akses:</strong> Anda saat ini sedang login menggunakan akun <strong>Customer / Petani</strong> (${this.getCurrentUser() ? this.getCurrentUser().name : 'Petani'}).
            </p>
            <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; padding: 12px; border-radius: 4px; color: #991B1B; margin-bottom: 14px;">
              <strong>Aturan Keamanan Sistem:</strong> Akun Customer <u>tidak memiliki izin akses</u> untuk membuka halaman Admin Gudang (stok fisik, omzet, verifikasi pembayaran, & laporan).
            </div>
            <p style="color: #6B7280; font-size: 12px;">
              Jika Anda merupakan staf atau kepala gudang resmi yang berwenang, silakan keluar dari akun petani dan masuk melalui halaman <strong>Login Admin Gudang</strong>.
            </p>
          </div>
          <div class="modal-footer" style="gap: 8px;">
            <button class="btn btn-secondary" onclick="document.getElementById('modal-access-denied').classList.remove('active')">
              Tetap di Halaman Petani
            </button>
            <a href="login-admin.html" class="btn" style="background-color: #1F2937; color: #FFFFFF;">
              Login sebagai Admin Gudang &rarr;
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.classList.add('active');
    }
  },

  logout(role = 'customer') {
    if (window.taniStore && typeof window.taniStore.logout === 'function') {
      window.taniStore.logout();
    } else {
      localStorage.removeItem('tani_auth_session');
    }
    if (role === 'admin') {
      window.location.href = 'login-admin.html';
    } else {
      window.location.href = 'login-customer.html';
    }
  },

  logoutAndRedirect(role = 'customer') {
    this.logout(role);
  },

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
};

window.TaniAuth = TaniAuth;
