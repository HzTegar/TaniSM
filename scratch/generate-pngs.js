const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}   

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function createPng(size, maskable = false) {
  const w = size;
  const h = size;
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 6; // RGBA (color type 6)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + w * 4;
  const rawData = Buffer.alloc(rowSize * h);

  const cx = w / 2;
  const cy = h / 2;
  const cornerRadius = maskable ? 0 : w * 0.22;

  for (let y = 0; y < h; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter none

    for (let x = 0; x < w; x++) {
      const p = rowOffset + 1 + x * 4;

      // Rounded rectangle test
      let inside = true;
      if (!maskable) {
        let dx = 0;
        let dy = 0;
        if (x < cornerRadius) dx = cornerRadius - x;
        else if (x > w - cornerRadius) dx = x - (w - cornerRadius);
        if (y < cornerRadius) dy = cornerRadius - y;
        else if (y > h - cornerRadius) dy = y - (h - cornerRadius);
        if (dx > 0 && dy > 0 && (dx * dx + dy * dy > cornerRadius * cornerRadius)) {
          inside = false;
        }
      }

      if (!inside) {
        rawData[p] = 0;
        rawData[p + 1] = 0;
        rawData[p + 2] = 0;
        rawData[p + 3] = 0;
        continue;
      }

      // Base background gradient: Deep emerald #092E1E to #020B07
      const t = (x + y) / (w + h);
      let r = Math.round(9 * (1 - t) + 2 * t);
      let g = Math.round(46 * (1 - t) + 11 * t);
      let b = Math.round(30 * (1 - t) + 7 * t);
      let a = 255;

      // Distance from center
      const dist = Math.sqrt((x - cx) * (x - cy) + (y - cy) * (y - cy));

      // Border glow
      const borderDist = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (borderDist < 6) {
        r = Math.min(255, r + 16);
        g = Math.min(255, g + 80);
        b = Math.min(255, b + 50);
      }

      // Outer ring
      const ring1 = Math.abs(dist - w * 0.38);
      if (ring1 < 2) {
        g = Math.min(255, g + 40);
      }

      // Center Leaf Shape (Math representation of sprout)
      // normalized coordinates: nx (-1 to 1), ny (-1 to 1)
      const nx = (x - cx) / (w * 0.28);
      const ny = (y - cy * 0.95) / (h * 0.32);

      // Main leaf 1 (teardrop tilted left)
      const d1x = nx * 0.8 + ny * 0.5;
      const d1y = -nx * 0.5 + ny * 0.8;
      const leaf1 = (d1x * d1x) / 0.35 + Math.pow(d1y + 0.3, 2) / 0.8;

      // Leaf 2 (sprout right)
      const d2x = nx * 0.8 - ny * 0.4;
      const d2y = nx * 0.4 + ny * 0.8;
      const leaf2 = (d2x * d2x) / 0.25 + Math.pow(d2y + 0.2, 2) / 0.6;

      // Base soil ellipse
      const soilY = (y - cy * 1.35) / (h * 0.08);
      const soilX = (x - cx) / (w * 0.32);
      const soil = soilX * soilX + soilY * soilY;

      if (soil < 1.0) {
        r = 16;
        g = 185;
        b = 129;
      } else if (leaf1 < 0.6 || leaf2 < 0.4) {
        // Neon green gradient (#10B981 to #34D399)
        const lt = Math.max(0, Math.min(1, (ny + 1) / 2));
        r = Math.round(5 * lt + 52 * (1 - lt));
        g = Math.round(150 * lt + 211 * (1 - lt));
        b = Math.round(105 * lt + 153 * (1 - lt));
      } else if (dist < w * 0.22) {
        // Inner ambient glow
        const glowFactor = (1 - dist / (w * 0.22)) * 0.25;
        g = Math.min(255, Math.round(g + 185 * glowFactor));
        r = Math.min(255, Math.round(r + 16 * glowFactor));
        b = Math.min(255, Math.round(b + 129 * glowFactor));
      }

      rawData[p] = r;
      rawData[p + 1] = g;
      rawData[p + 2] = b;
      rawData[p + 3] = a;
    }
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const png192 = createPng(192);
fs.writeFileSync(path.join(outDir, 'icon-192.png'), png192);
console.log('Saved icons/icon-192.png (size:', png192.length, 'bytes)');

const png512 = createPng(512);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512);
console.log('Saved icons/icon-512.png (size:', png512.length, 'bytes)');

const pngMaskable = createPng(512, true);
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), pngMaskable);
console.log('Saved icons/icon-maskable-512.png (size:', pngMaskable.length, 'bytes)');
