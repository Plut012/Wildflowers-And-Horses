#!/usr/bin/env node
// generate-icons.js — Generates PWA icons (assets/icon-192.png, assets/icon-512.png)
// Uses the 'canvas' npm package if available, otherwise writes minimal valid PNGs.
//
// Run:  node generate-icons.js
//
// If canvas is not installed, this writes small valid placeholder PNG files
// that satisfy the PWA manifest. For a proper icon, open generate-icons.html
// in a browser and click the save buttons.

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Try to use canvas package for proper icons
let canvasAvailable = false;
try {
  require.resolve('canvas');
  canvasAvailable = true;
} catch (e) {}

if (canvasAvailable) {
  const { createCanvas } = require('canvas');
  generateWithCanvas(createCanvas, 192, path.join(assetsDir, 'icon-192.png'));
  generateWithCanvas(createCanvas, 512, path.join(assetsDir, 'icon-512.png'));
  console.log('Icons generated with canvas module.');
} else {
  // Write minimal valid 1x1 transparent PNG as placeholder
  // Proper icons should be generated via generate-icons.html
  writePlaceholderPNG(path.join(assetsDir, 'icon-192.png'), 192);
  writePlaceholderPNG(path.join(assetsDir, 'icon-512.png'), 512);
  console.log('Placeholder icons written. Open generate-icons.html in a browser for proper icons.');
}

function generateWithCanvas(createCanvas, size, outPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, size);
  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buf);
}

function drawIcon(ctx, size) {
  const s = size / 192; // scale factor relative to 192px design

  // Background — warm earth
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, 0, size, size);

  // Inner rounded rect background
  const pad = size * 0.06;
  ctx.fillStyle = '#C8A96E';
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.18);
  ctx.fill();

  // Sky area (top third)
  ctx.fillStyle = '#F5E6D0';
  roundRect(ctx, pad, pad, size - pad * 2, size * 0.45, size * 0.18);
  ctx.fill();

  // Sun
  const sunX = size * 0.72;
  const sunY = size * 0.22;
  const sunR = size * 0.08;
  const grad = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 1.8);
  grad.addColorStop(0, '#FFF9C4');
  grad.addColorStop(0.4, '#FFD54F');
  grad.addColorStop(1, 'rgba(255,213,79,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF9C4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Ground strip
  ctx.fillStyle = '#8DB85A';
  ctx.fillRect(pad, size * 0.52, size - pad * 2, size * 0.06);
  ctx.fillStyle = '#C8A96E';
  ctx.fillRect(pad, size * 0.58, size - pad * 2, size * 0.36);

  // Fence
  const fenceY = size * 0.5;
  ctx.fillStyle = '#A07820';
  ctx.fillRect(pad, fenceY, size - pad * 2, size * 0.025);
  ctx.fillRect(pad, fenceY + size * 0.06, size - pad * 2, size * 0.025);
  ctx.fillStyle = '#8B6914';
  for (let x = pad; x < size - pad; x += size * 0.1) {
    ctx.fillRect(x, fenceY - size * 0.02, size * 0.03, size * 0.12);
  }

  // Three flowers in foreground
  const flowers = [
    { x: 0.28, col: '#FFFDE7', cen: '#FFD54F' }, // daisy
    { x: 0.50, col: '#CE93D8', cen: '#9C27B0' }, // lavender
    { x: 0.72, col: '#FFD600', cen: '#5D4037' }, // sunflower
  ];
  for (const { x, col, cen } of flowers) {
    const fx = size * x;
    const fy = size * 0.7;
    const r = size * 0.06;
    // Stem
    ctx.fillStyle = '#6aaa4a';
    ctx.fillRect(fx - size * 0.01, fy - r * 4, size * 0.02, r * 4);
    // Petals
    ctx.fillStyle = col;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = fx + Math.cos(a) * r;
      const py = fy - r * 2.5 + Math.sin(a) * r;
      ctx.fillRect(px - r * 0.4, py - r * 0.4, r * 0.8, r * 0.8);
    }
    // Center
    ctx.fillStyle = cen;
    ctx.fillRect(fx - r * 0.5, fy - r * 2.5 - r * 0.5, r, r);
  }

  // Horse silhouette (right side, peeking over fence)
  const hx = size * 0.78;
  const hy = size * 0.48;
  const hs = size * 0.003;
  ctx.fillStyle = '#8B3A2A';
  // Body
  ctx.fillRect(hx - hs * 20, hy - hs * 10, hs * 22, hs * 10);
  // Neck
  ctx.fillRect(hx, hy - hs * 18, hs * 6, hs * 10);
  // Head
  ctx.fillRect(hx - hs * 1, hy - hs * 24, hs * 10, hs * 8);
  // Ear
  ctx.fillRect(hx + hs * 1, hy - hs * 28, hs * 3, hs * 5);
  // Eye
  ctx.fillStyle = '#2C1810';
  ctx.fillRect(hx + hs * 3, hy - hs * 22, hs * 2, hs * 2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Write a minimal valid PNG with a warm brown fill
// PNG structure: signature + IHDR + IDAT + IEND
function writePlaceholderPNG(filePath, size) {
  // We write a 1x1 pixel PNG with the brand color, which is valid
  // and satisfies the manifest without being ugly as a home screen icon
  const buf = buildSolidPNG(size, 0x8B, 0x73, 0x55, 0xFF);
  fs.writeFileSync(filePath, buf);
}

function buildSolidPNG(size, r, g, b, a) {
  // Build a proper PNG. We'll write a simple size×size solid color PNG.
  // PNG spec: use minimum deflate (uncompressed blocks) for simplicity.

  function adler32(data) {
    let s1 = 1, s2 = 0;
    for (let i = 0; i < data.length; i++) {
      s1 = (s1 + data[i]) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    return (s2 << 16) | s1;
  }

  function crc32(buf, start, len) {
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })());
    let crc = 0xFFFFFFFF;
    for (let i = start; i < start + len; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function u32be(v) {
    return [(v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF];
  }

  function chunk(type, data) {
    const typeBytes = type.split('').map(c => c.charCodeAt(0));
    const len = u32be(data.length);
    const crcInput = [...typeBytes, ...data];
    const crcVal = u32be(crc32(new Uint8Array(crcInput), 0, crcInput.length));
    return [...len, ...typeBytes, ...data, ...crcVal];
  }

  // IHDR: width, height, bit depth=8, color type=2 (RGB), compress=0, filter=0, interlace=0
  const ihdr = [
    ...u32be(size), ...u32be(size),
    8, 2, 0, 0, 0
  ];

  // Raw image data: for each row, filter byte (0=None) + pixels
  // For large images, build compressed IDAT using zlib uncompressed blocks
  const rowSize = size * 3; // RGB
  const rawSize = size * (1 + rowSize); // filter + pixels per row

  const raw = new Uint8Array(rawSize);
  for (let y = 0; y < size; y++) {
    const off = y * (1 + rowSize);
    raw[off] = 0; // filter type None
    for (let x = 0; x < size; x++) {
      raw[off + 1 + x * 3 + 0] = r;
      raw[off + 1 + x * 3 + 1] = g;
      raw[off + 1 + x * 3 + 2] = b;
    }
  }

  // Zlib wrapper around uncompressed deflate blocks
  // Max deflate block size is 65535 bytes
  const BLOCK_MAX = 65535;
  const blocks = [];
  for (let i = 0; i < raw.length; i += BLOCK_MAX) {
    const end = Math.min(i + BLOCK_MAX, raw.length);
    const isLast = end >= raw.length ? 1 : 0;
    const len = end - i;
    const nlen = (~len) & 0xFFFF;
    blocks.push(
      isLast,
      len & 0xFF, (len >> 8) & 0xFF,
      nlen & 0xFF, (nlen >> 8) & 0xFF,
      ...raw.slice(i, end)
    );
  }

  const adler = adler32(raw);
  const zlib = [
    0x78, 0x01,  // zlib header (deflate, no dict, low compression)
    ...blocks,
    ...u32be(adler),
  ];

  const idat = zlib;

  const png = [
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    ...chunk('IHDR', ihdr),
    ...chunk('IDAT', idat),
    ...chunk('IEND', []),
  ];

  return Buffer.from(png);
}
