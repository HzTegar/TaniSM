/**
 * Tani.SM - Development Server
 *
 * Jalankan:  node dev-server.js
 * Buka:      http://localhost:8080
 *
 * Mengatasi 3 sumber masalah "perubahan tidak muncul" saat ngoding:
 *
 *  1. Salah folder  -> folder proyek dipatok di __dirname, bukan folder tempat
 *                      perintah `serve` dijalankan.
 *  2. Browser cache-> header no-store/no-cache dikirim untuk semua file, jadi
 *                      browser tidak pernah menyajikan versi lama dari cache HTTP.
 *  3. Service Worker -> header di atas membuat Service Worker lama otomatis
 *                      tidak berlaku, dan tetap ada perintah untuk membersihkannya.
 *
 * Catatan: Service Worker sengaja TIDAK dipakai di localhost. Untuk menguji
 * perilaku instalasi sungguhan, deploy ke HTTPS dulu.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
};

// Header yang membuat browser & service worker TIDAK boleh menyimpan cache.
const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
  } catch {
    res.writeHead(400, NO_CACHE);
    return res.end('Bad Request');
  }

  if (pathname === '/') pathname = '/index.html';

  // Cegah path traversal: hasil resolve HARUS masih di dalam ROOT.
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, NO_CACHE);
    return res.end('403 Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { ...NO_CACHE, 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`404 - tidak ditemukan: ${pathname}`);
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    // sw.js & manifest.json sengaja tidak boleh di-cache agar browser
    // selalu mengecek apakah ada versi baru.
    const noStoreSW = path.basename(filePath) === 'sw.js' || path.basename(filePath) === 'manifest.json';

    res.writeHead(200, {
      ...NO_CACHE,
      'Content-Type': type,
      'Content-Length': data.length,
      ...(noStoreSW ? { 'Service-Worker-Allowed': '/' } : {}),
    });

    res.end(req.method === 'HEAD' ? undefined : data);
  });
});

// Halaman bantuan untuk reset cache & service worker dari browser.
const RESET_HTML = `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<title>Reset Cache - Tani.SM</title>
<style>
 body{font-family:system-ui,sans-serif;max-width:620px;margin:60px auto;padding:0 20px;line-height:1.7}
 button{font-size:15px;padding:12px 20px;margin-right:8px;cursor:pointer;border-radius:6px;border:1px solid #888;background:#f2f2f2}
 code{background:#eee;padding:2px 6px;border-radius:3px}
 .ok{color:#0a7a34;font-weight:600}
</style></head><body>
<h1>Reset Cache &amp; Service Worker</h1>
<p>Jalankan ini <strong>satu kali</strong> setelah memperbarui kode, lalu tutup
tab yang membuka aplikasi TANIHUB.</p>
<p><button onclick="resetAll()">Bersihkan Sekarang</button></p>
<div id="out"></div>
<script>
async function resetAll(){
  const out = document.getElementById('out');
  const log = [];
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
      log.push('Service Worker dilepas: ' + regs.length);
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      log.push('Cache dihapus: ' + keys.length + ' (' + keys.join(', ') + ')');
    }
    out.innerHTML = '<p class="ok">' + log.join('<br>') + '</p>' +
      '<p>Sekarang tutup SEMUA tab aplikasi TANIHUB, lalu buka lagi.</p>';
  } catch (e) {
    out.textContent = 'Gagal: ' + e;
  }
}
</script>
</body></html>`;

server.on('request', (req, res) => {
  if (req.url === '/__reset__') {
    res.writeHead(200, { ...NO_CACHE, 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(RESET_HTML);
  }
});

server.listen(PORT, () => {
  const indexPath = path.join(ROOT, 'index.html');
  const size = fs.existsSync(indexPath) ? fs.statSync(indexPath).size : 0;
  const mtime = fs.existsSync(indexPath) ? fs.statSync(indexPath).mtime.toLocaleString('id-ID') : '-';

  console.log('');
  console.log('  Tani.SM - Development Server');
  console.log('  -------------------------------------------');
  console.log('  Buka di browser : http://localhost:' + PORT);
  console.log('  Folder served   : ' + ROOT);
  console.log('  index.html      : ' + size + ' bytes, diubah ' + mtime);
  console.log('  Reset cache     : http://localhost:' + PORT + '/__reset__');
  console.log('  Cache           : dimatikan (no-store) + Service Worker nonaktif');
  console.log('  -------------------------------------------');
  console.log('  Ctrl+C untuk menghentikan.');
  console.log('');
});

// Beri tahu kalau port sudah dipakai, supaya jelas bukan error kode.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('  Port ' + PORT + ' SEDANG DIPAKAI proses lain.');
    console.error('  Server kamu yang lama masih jalan - itu sebabnya perubahan tidak muncul.');
    console.error('');
    console.error('  Cari prosesnya lalu matikan:');
    console.error('    Get-NetTCPConnection -LocalPort ' + PORT + ' -State Listen |');
    console.error('      Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }');
    console.error('');
    console.error('  Atau pakai port lain:  $env:PORT=8081; node dev-server.js');
    console.error('');
    process.exit(1);
  }
  throw err;
});
