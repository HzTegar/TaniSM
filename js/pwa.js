/**
 * TaniSM - PWA Registration & Install Controller (Desktop & Mobile)
 * Handles Service Worker lifecycle, offline caching, beforeinstallprompt,
 * desktop installation, and iOS Add-to-Home-Screen guide.
 */

(function () {
  let deferredPrompt = null;
  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // Mark body if already running as installed app
  if (isStandalone) {
    document.documentElement.classList.add('pwa-standalone');
  }

  // Auto-reload HANYA saat service worker lama digantikan oleh yang baru.
  // Saat aplikasi baru pertama dipasang, hadController === false sehingga
  // halaman tidak dimuat ulang (tidak ada yang perlu disegarkan).
  const hadControllerAtStart = !!navigator.serviceWorker?.controller;
  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (!hadControllerAtStart || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  // 1. Register Service Worker
  //
  // Di localhost Service Worker DIMATIKAN dengan sengaja: kalau aktif, setiap
  // edit file lokal akan dilayani dari cache dan perubahan tidak langsung terlihat.
  // Untuk menguji perilaku install sungguhan, buka lewat HTTPS / domain asli.
  const isLocalDev = ['localhost', '127.0.0.1', '::1', ''].includes(location.hostname);

  function applyUpdate(reg) {
    const waitingWorker = reg.waiting || reg.installing;
    if (waitingWorker) {
      waitingWorker.postMessage({ action: 'skipWaiting' });
      return;
    }
    // Fallback: trigger skipWaiting via registration
    if (reg.waiting) {
      reg.waiting.postMessage({ action: 'skipWaiting' });
    }
  }

  function showUpdatePrompt(reg) {
    // Hindari duplikasi prompt
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.className = 'no-print';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      background: linear-gradient(135deg, rgba(6, 33, 21, 0.98), rgba(3, 16, 10, 0.98));
      border: 1px solid rgba(16, 185, 129, 0.55);
      border-radius: 14px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.85), 0 0 28px rgba(16, 185, 129, 0.28);
      backdrop-filter: blur(16px);
      max-width: calc(100vw - 32px);
      font-family: inherit;
      animation: pwaUpdateSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    banner.innerHTML = `
      <style>
        @keyframes pwaUpdateSlideUp {
          from { transform: translateX(-50%) translateY(60px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      </style>
      <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
          <path d="M12 16V4M12 4L6 10M12 4L18 10M4 20H20" stroke="#10B981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div style="min-width:0;">
          <div style="font-weight: 800; font-size: 13px; color: #FFFFFF;">Versi baru TaniSM tersedia</div>
          <div style="font-size: 11.5px; color: #8BA498; margin-top: 1px;">Perbarui untuk mendapatkan perbaikan & fitur terbaru.</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
        <button id="pwa-update-later" style="background: transparent; border: 1px solid rgba(139, 164, 152, 0.5); color: #A7F3D0; border-radius: 9px; font-weight: 700; font-size: 12px; padding: 7px 10px; cursor: pointer;">Nanti</button>
        <button id="pwa-update-now" style="background: #10B981; color: #04160E; border: none; border-radius: 9px; font-weight: 900; font-size: 12px; padding: 7px 12px; cursor: pointer; box-shadow: 0 0 14px rgba(16, 185, 129, 0.45);">Perbarui Sekarang</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-update-now').addEventListener('click', () => {
      banner.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; padding: 4px 6px;">
          <div style="width:16px; height:16px; border:2px solid rgba(16,185,129,0.4); border-top-color:#10B981; border-radius:50%; animation: pwaSpin 0.8s linear infinite;"></div>
          <div style="font-weight:700; font-size:12.5px; color:#ECFDF5;">Memperbarui...</div>
        </div>
        <style>@keyframes pwaSpin { to { transform: rotate(360deg); } }</style>
      `;
      applyUpdate(reg);
    });

    document.getElementById('pwa-update-later').addEventListener('click', () => {
      banner.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      banner.style.opacity = '0';
      banner.style.transform = 'translateX(-50%) translateY(30px)';
      setTimeout(() => banner.remove(), 260);
    });
  }

  if ('serviceWorker' in navigator && !isLocalDev) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker terdaftar dengan scope:', reg.scope);

          // Jika ada SW yang menunggu (mis. update terdeteksi sebelum reload)
          if (reg.waiting && navigator.serviceWorker.controller) {
            showUpdatePrompt(reg);
          }

          // Ada service worker baru yang terpasang -> menunggu aktifasi.
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showUpdatePrompt(reg);
                }
                // Jika tidak ada controller (first install), biarkan flow normal tanpa prompt paksa
              });
            }
          });

          // Cek update secara berkala saat tab tetap terbuka
          setInterval(() => {
            reg.update().catch(() => {});
          }, 60 * 60 * 1000);
        })
        .catch((err) => {
          console.warn('[PWA] Pendaftaran Service Worker gagal:', err);
        });
    });
  } else if (isLocalDev) {
    // Bersihkan SW & cache leftover dari sesi sebelumnya supaya file lokal
    // benar-benar dibaca langsung dari disk.
    navigator.serviceWorker?.getRegistrations?.().then((regs) => regs.forEach((r) => r.unregister()));
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    console.log('[PWA] Mode pengembangan: Service Worker dimatikan agar perubahan langsung terlihat.');
  }

  // 2. Capture beforeinstallprompt (Desktop Chrome/Edge & Android Chrome)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] beforeinstallprompt siap untuk instalasi desktop & mobile');
    updateInstallButtons(true);
    renderInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Aplikasi TaniSM berhasil diinstal!');
    deferredPrompt = null;
    hideInstallBanner();
    updateInstallButtons(false);
    showToast('Aplikasi TaniSM berhasil terpasang di perangkat Anda!', 'success');
  });

  // 3. Online/Offline Network Status
  window.addEventListener('online', () => {
    showToast('Koneksi internet kembali aktif.', 'success');
  });

  window.addEventListener('offline', () => {
    showToast('Mode Offline aktif: Anda tetap dapat melihat katalog dan data yang tersimpan.', 'info');
  });

  function showToast(message, type = 'info') {
    if (window.TaniAuth && typeof window.TaniAuth.showToast === 'function') {
      window.TaniAuth.showToast(message, type);
    }
  }

  /**
   * Sembunyikan tombol install bila memang tidak bisa dipakai:
   * - sudah terinstall (standalone)
   * - browser tidak mendukung prompt instalasi (mis. Firefox, Safari non-iOS)
   *
   * Di iOS tetap ditampilkan karena memang ada langkah manual (Share > Add to Home Screen).
   */
  function updateInstallButtons(canInstall) {
    const show = !isStandalone && (canInstall || isIos);
    document.querySelectorAll('.btn-pwa-install, #pwa-install-header-btn').forEach((btn) => {
      btn.style.display = show ? 'inline-flex' : 'none';
    });
  }

  // Floating Install Banner
  function renderInstallBanner() {
    if (isStandalone || document.getElementById('pwa-install-banner') || !deferredPrompt) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'no-print';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      background: linear-gradient(135deg, rgba(6, 33, 21, 0.98), rgba(3, 16, 10, 0.98));
      border: 1px solid rgba(16, 185, 129, 0.45);
      border-radius: 16px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.8), 0 0 25px rgba(16, 185, 129, 0.25);
      backdrop-filter: blur(16px);
      max-width: 400px;
      font-family: inherit;
      animation: pwaSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    banner.innerHTML = `
      <style>
        @keyframes pwaSlideUp {
          from { transform: translateY(60px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      </style>
      <img src="icons/icon-192.png" alt="TaniSM" style="width: 46px; height: 46px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3); flex-shrink: 0;">
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 700; font-size: 13.5px; color: #FFFFFF; letter-spacing: 0.3px;">Pasang TaniSM di Perangkat</div>
        <div style="font-size: 11.5px; color: #8BA498; margin-top: 2px; line-height: 1.35;">Buka instan tanpa browser, bekerja offline, dan lebih ringan di Desktop & HP.</div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        <button id="pwa-btn-dismiss" title="Tutup" style="background: transparent; border: none; color: #8BA498; font-size: 20px; cursor: pointer; padding: 4px; line-height: 1;">&times;</button>
        <button id="pwa-btn-install" style="background: #10B981; color: #04160E; border: none; border-radius: 8px; font-weight: 800; font-size: 12px; padding: 8px 14px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);">Pasang</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('pwa-btn-install').addEventListener('click', () => {
      window.triggerPwaInstall();
    });

    document.getElementById('pwa-btn-dismiss').addEventListener('click', () => {
      hideInstallBanner();
    });
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(30px)';
      setTimeout(() => banner.remove(), 260);
    }
  }

  // iOS Instruction Modal
  function showIosInstallModal() {
    if (document.getElementById('modal-ios-install')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-ios-install';
    modal.className = 'modal-overlay active no-print';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    `;

    modal.innerHTML = `
      <div style="background: #062115; border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 18px; max-width: 420px; width: 100%; padding: 24px; color: #ECFDF5; font-family: inherit; box-shadow: 0 20px 40px rgba(0,0,0,0.9);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #10B981;">Pasang di iPhone / iPad</h3>
          <span style="font-size: 22px; cursor: pointer; color: #8BA498;" onclick="document.getElementById('modal-ios-install').remove()">&times;</span>
        </div>
        <p style="font-size: 13px; color: #A7F3D0; margin-bottom: 16px; line-height: 1.5;">
          Perangkat iOS (Safari) memerlukan pemasangan manual:
        </p>
        <ol style="font-size: 13px; color: #ECFDF5; padding-left: 20px; margin-bottom: 20px; line-height: 1.8;">
          <li>Ketuk ikon <strong>Bagikan / Share</strong> (<span style="font-size: 16px;">⎋</span>) di bilah bawah browser Safari.</li>
          <li>Gulir ke bawah dan pilih opsi <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong> (<span style="font-size: 16px;">⊞</span>).</li>
          <li>Ketuk <strong>"Tambah" (Add)</strong> di pojok kanan atas.</li>
        </ol>
        <button style="width: 100%; background: #10B981; color: #04160E; border: none; border-radius: 10px; padding: 10px; font-weight: 800; font-size: 13px; cursor: pointer;" onclick="document.getElementById('modal-ios-install').remove()">Mengerti</button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Global Trigger (callable from any button)
  window.triggerPwaInstall = function () {
    if (isStandalone) {
      showToast('Aplikasi TaniSM sudah terpasang dan aktif di perangkat Anda.', 'info');
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] Pengguna menyetujui instalasi TaniSM');
        }
        deferredPrompt = null;
        hideInstallBanner();
      });
    } else if (isIos) {
      showIosInstallModal();
    } else {
      // Desktop / Browser without prompt available yet
      showToast('Untuk memasang di Desktop: Klik ikon "Install / Pasang" di bilah alamat (URL bar) browser Anda atau menu browser (⋮) > "Install TaniSM".', 'info');
    }
  };

  // Run on page load.
  // Mulai dalam keadaan tersembunyi: tombol baru muncul setelah browser
  // benar-benar memberi tahu aplikasi bisa di-install (beforeinstallprompt).
  window.addEventListener('DOMContentLoaded', () => {
    updateInstallButtons(isIos);
  });
})();
