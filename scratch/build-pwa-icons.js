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

function encodePng(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + w * 4;
  const rawData = Buffer.alloc(rowSize * h);

  for (let y = 0; y < h; y++) {
    const rawOffset = y * rowSize;
    rawData[rawOffset] = 0; // Filter 0
    const rgbaOffset = y * w * 4;
    rgba.copy(rawData, rawOffset + 1, rgbaOffset, rgbaOffset + w * 4);
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function decodePng(buf) {
  let pos = 8;
  let w = buf.readUInt32BE(16);
  let h = buf.readUInt32BE(20);
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = w * 4;
  const pixels = Buffer.alloc(stride * h);
  let srcPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[srcPos++];
    const prevRowOffset = (y - 1) * stride;
    const curRowOffset = y * stride;
    for (let x = 0; x < stride; x++) {
      const bpp = 4;
      const left = x >= bpp ? pixels[curRowOffset + x - bpp] : 0;
      const up = y > 0 ? pixels[prevRowOffset + x] : 0;
      const upLeft = (y > 0 && x >= bpp) ? pixels[prevRowOffset + x - bpp] : 0;
      const cur = raw[srcPos++];
      let val = 0;
      if (filter === 0) val = cur;
      else if (filter === 1) val = (cur + left) & 0xFF;
      else if (filter === 2) val = (cur + up) & 0xFF;
      else if (filter === 3) val = (cur + Math.floor((left + up) / 2)) & 0xFF;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        let pr = 0;
        if (pa <= pb && pa <= pc) pr = left;
        else if (pb <= pc) pr = up;
        else pr = upLeft;
        val = (cur + pr) & 0xFF;
      }
      pixels[curRowOffset + x] = val;
    }
  }
  return { w, h, pixels };
}

// Bilinear scale
function resizeImage(src, targetW, targetH, bgR = 0, bgG = 0, bgB = 0, bgA = 0, paddingFactor = 1.0) {
  const dest = Buffer.alloc(targetW * targetH * 4);

  // Fill background
  for (let i = 0; i < targetW * targetH; i++) {
    dest[i * 4] = bgR;
    dest[i * 4 + 1] = bgG;
    dest[i * 4 + 2] = bgB;
    dest[i * 4 + 3] = bgA;
  }

  const effectiveW = targetW * paddingFactor;
  const effectiveH = targetH * paddingFactor;
  const offsetX = (targetW - effectiveW) / 2;
  const offsetY = (targetH - effectiveH) / 2;

  const scaleX = src.w / effectiveW;
  const scaleY = src.h / effectiveH;

  for (let y = 0; y < targetH; y++) {
    const srcY = (y - offsetY) * scaleY;
    if (srcY < 0 || srcY >= src.h - 1) continue;

    const y0 = Math.floor(srcY);
    const y1 = Math.min(y0 + 1, src.h - 1);
    const dy = srcY - y0;

    for (let x = 0; x < targetW; x++) {
      const srcX = (x - offsetX) * scaleX;
      if (srcX < 0 || srcX >= src.w - 1) continue;

      const x0 = Math.floor(srcX);
      const x1 = Math.min(x0 + 1, src.w - 1);
      const dx = srcX - x0;

      // 4 corners
      const idx00 = (y0 * src.w + x0) * 4;
      const idx10 = (y0 * src.w + x1) * 4;
      const idx01 = (y1 * src.w + x0) * 4;
      const idx11 = (y1 * src.w + x1) * 4;

      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;

      const destIdx = (y * targetW + x) * 4;

      const a = src.pixels[idx00 + 3] * w00 + src.pixels[idx10 + 3] * w10 + src.pixels[idx01 + 3] * w01 + src.pixels[idx11 + 3] * w11;
      const alphaNorm = a / 255;

      if (alphaNorm > 0.001) {
        const r = src.pixels[idx00] * w00 + src.pixels[idx10] * w10 + src.pixels[idx01] * w01 + src.pixels[idx11] * w11;
        const g = src.pixels[idx00 + 1] * w00 + src.pixels[idx10 + 1] * w10 + src.pixels[idx01 + 1] * w01 + src.pixels[idx11 + 1] * w11;
        const b = src.pixels[idx00 + 2] * w00 + src.pixels[idx10 + 2] * w10 + src.pixels[idx01 + 2] * w01 + src.pixels[idx11 + 2] * w11;

        if (bgA === 0) {
          dest[destIdx] = Math.round(r);
          dest[destIdx + 1] = Math.round(g);
          dest[destIdx + 2] = Math.round(b);
          dest[destIdx + 3] = Math.round(a);
        } else {
          // Blend over background
          dest[destIdx] = Math.round(r * alphaNorm + bgR * (1 - alphaNorm));
          dest[destIdx + 1] = Math.round(g * alphaNorm + bgG * (1 - alphaNorm));
          dest[destIdx + 2] = Math.round(b * alphaNorm + bgB * (1 - alphaNorm));
          dest[destIdx + 3] = 255;
        }
      }
    }
  }

  return dest;
}

const srcFile = path.join(__dirname, '..', 'img', 'logo-tani.png');
const fileBuf = fs.readFileSync(srcFile);
const decoded = decodePng(fileBuf);
console.log('Source loaded:', decoded.w, 'x', decoded.h);

const outDir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. icon-512.png (Transparent background, centered 512x512)
const rgba512 = resizeImage(decoded, 512, 512, 0, 0, 0, 0, 0.94);
const png512 = encodePng(512, 512, rgba512);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), png512);
console.log('Saved icons/icon-512.png');

// 2. icon-192.png (Transparent background, 192x192)
const rgba192 = resizeImage(decoded, 192, 192, 0, 0, 0, 0, 0.94);
const png192 = encodePng(192, 192, rgba192);
fs.writeFileSync(path.join(outDir, 'icon-192.png'), png192);
console.log('Saved icons/icon-192.png');

// 3. icon-maskable-512.png (Dark Emerald bg #04160E, safe zone padding 0.78)
const rgbaMaskable = resizeImage(decoded, 512, 512, 4, 22, 14, 255, 0.78);
const pngMaskable = encodePng(512, 512, rgbaMaskable);
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), pngMaskable);
console.log('Saved icons/icon-maskable-512.png');

// 4. apple-touch-icon.png (180x180, Dark Emerald bg #04160E, padding 0.85)
const rgbaApple = resizeImage(decoded, 180, 180, 4, 22, 14, 255, 0.85);
const pngApple = encodePng(180, 180, rgbaApple);
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), pngApple);
console.log('Saved icons/apple-touch-icon.png');

// 5. icon.svg (Embed the exact base64 data URI of the user logo)
const b64 = fileBuf.toString('base64');
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <image href="data:image/png;base64,${b64}" width="500" height="500" />
</svg>`;
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent);
console.log('Saved icons/icon.svg');
