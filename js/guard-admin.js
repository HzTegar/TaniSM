/**
 * Tani.SM - Admin Access Guard
 *
 * Dipisah dari admin.html agar bisa dimuat dengan `defer`.
 * Script inline di <head> berjalan SEBELUM file `defer` dieksekusi,
 * sehingga TaniAuth belum terdefinisi bila guard diletakkan di sana.
 *
 * Dijalankan setelah js/auth.js (urutan script defer dijamin browser).
 */
(function guardAdminPage() {
  if (typeof TaniAuth === 'undefined' || !TaniAuth.requireAdminAccess()) {
    // Sembunyikan konten tanpa document.write() (deprecated & berbahaya bila
    // dipanggil setelah halaman selesai diparse).
    document.documentElement.classList.add('access-denied-pending');
  }
})();
