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

function createScreenshot(w, h, isMobile = false) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB (color type 2)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowSize = 1 + w * 3;
  const rawData = Buffer.alloc(rowSize * h);

  for (let y = 0; y < h; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;

    for (let x = 0; x < w; x++) {
      const p = rowOffset + 1 + x * 3;

      let r = 3;
      let g = 16;
      let b = 10;

      if (!isMobile) {
        // Desktop Layout
        // Left sidebar
        if (x < 240) {
          r = 4;
          g = 22;
          b = 14;
          if (x === 239) { r = 16; g = 185; b = 129; }
        } else {
          // Topbar
          if (y < 60) {
            r = 6;
            g = 33;
            b = 21;
            if (y === 59) { r = 16; g = 185; b = 129; }
          }
          // Hero Card
          else if (y >= 80 && y <= 160 && x >= 270 && x <= w - 40) {
            r = 6;
            g = 33;
            b = 21;
          }
          // 4 Metric cards
          else if (y >= 180 && y <= 270 && x >= 270 && x <= w - 40) {
            const cardW = (w - 270 - 40 - 45) / 4;
            const rx = (x - 270) % (cardW + 15);
            if (rx < cardW) {
              r = 9;
              g = 46;
              b = 30;
            }
          }
          // 2 Activity columns
          else if (y >= 290 && y <= h - 40 && x >= 270 && x <= w - 40) {
            const colW = (w - 270 - 40 - 20) / 2;
            const rx = (x - 270) % (colW + 20);
            if (rx < colW) {
              r = 6;
              g = 33;
              b = 21;
            }
          }
        }
      } else {
        // Mobile Layout
        // Topbar
        if (y < 60) {
          r = 6;
          g = 33;
          b = 21;
          if (y === 59) { r = 16; g = 185; b = 129; }
        }
        // Hero
        else if (y >= 75 && y <= 165 && x >= 20 && x <= w - 20) {
          r = 6;
          g = 33;
          b = 21;
        }
        // 4 KPI cards (2x2)
        else if (y >= 180 && y <= 350 && x >= 20 && x <= w - 20) {
          const cardW = (w - 40 - 15) / 2;
          const rx = (x - 20) % (cardW + 15);
          const ry = (y - 180) % 85;
          if (rx < cardW && ry < 75) {
            r = 9;
            g = 46;
            b = 30;
          }
        }
        // Activity cards stacked
        else if (y >= 370 && y <= h - 20 && x >= 20 && x <= w - 20) {
          const ry = (y - 370) % 260;
          if (ry < 240) {
            r = 6;
            g = 33;
            b = 21;
          }
        }
      }

      rawData[p] = r;
      rawData[p + 1] = g;
      rawData[p + 2] = b;
    }
  }

  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const desktopPng = createScreenshot(1280, 720, false);
fs.writeFileSync(path.join(outDir, 'desktop.png'), desktopPng);
console.log('Saved screenshots/desktop.png (size:', desktopPng.length, 'bytes)');

const mobilePng = createScreenshot(540, 960, true);
fs.writeFileSync(path.join(outDir, 'mobile.png'), mobilePng);
console.log('Saved screenshots/mobile.png (size:', mobilePng.length, 'bytes)');
