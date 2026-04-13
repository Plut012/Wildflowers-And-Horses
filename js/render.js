// render.js — Canvas drawing: farm, plots, flowers, horses, day/night.

import { PALETTE, PLOT_STATE, GRID_COLS, GRID_ROWS, DAY_DURATION, NIGHT_FRACTION, FLOWERS, HORSES } from './data.js';
import { plotRect } from './garden.js';
import { isTamed, getPerkLevel } from './horses.js';

// Lerp between two hex colours
function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

// Returns 0 (full day) → 1 (full night) based on cycle position
export function nightFactor(elapsed) {
  const cycle = (elapsed % DAY_DURATION) / DAY_DURATION; // 0..1
  // Night is the middle portion: 0.3 → 0.7 of the cycle
  const nightStart = 0.5 - NIGHT_FRACTION / 2;
  const nightEnd   = 0.5 + NIGHT_FRACTION / 2;
  const transWidth = 0.1; // fade in/out width

  if (cycle < nightStart - transWidth) return 0;
  if (cycle < nightStart) return (cycle - (nightStart - transWidth)) / transWidth;
  if (cycle < nightEnd)   return 1;
  if (cycle < nightEnd + transWidth) return 1 - (cycle - nightEnd) / transWidth;
  return 0;
}

function blendPalette(nf) {
  return {
    sky:     lerpColor(PALETTE.skyDay,     PALETTE.skyNight,     nf),
    ground:  lerpColor(PALETTE.groundDay,  PALETTE.groundNight,  nf),
    grass:   lerpColor(PALETTE.grassDay,   PALETTE.grassNight,   nf),
    plotEmpty: lerpColor(PALETTE.plotEmpty, '#4A3728',            nf),
    plotSoil:  lerpColor(PALETTE.plotSoil,  '#2C1A0E',            nf),
    uiBar:   lerpColor(PALETTE.uiBarDay,   PALETTE.uiBarNight,   nf),
    text:    lerpColor(PALETTE.textDay,    PALETTE.textNight,    nf),
  };
}

// Compute the grid layout for current canvas size
export function computeLayout(canvasW, canvasH) {
  const uiBarH = Math.round(canvasH * 0.12);
  const gardenTop    = Math.round(canvasH * 0.18);
  const gardenBottom = canvasH - uiBarH - 8;
  const gardenH = gardenBottom - gardenTop;
  const gardenW = canvasW;

  const gap   = Math.max(4, Math.round(canvasW * 0.025));
  const plotW = Math.floor((gardenW - gap * (GRID_COLS + 1)) / GRID_COLS * 0.8);
  const plotH = Math.floor((gardenH - gap * (GRID_ROWS + 1)) / GRID_ROWS * 0.6);

  const totalGridW = GRID_COLS * plotW + (GRID_COLS + 1) * gap;
  const totalGridH = GRID_ROWS * plotH + (GRID_ROWS + 1) * gap;

  const originX = Math.floor((canvasW - totalGridW) / 2) + gap;
  const originY = gardenTop + Math.floor((gardenH - totalGridH) / 2) + gap;

  return { originX, originY, plotW, plotH, gap, uiBarH, gardenTop };
}

// ── Plot animation state (module-level, lightweight) ─────────────────────────
// Stores per-plot animation timestamps for planting/harvest
const _plotAnims = {};   // { [index]: { type, startMs } }

export function triggerPlotAnim(index, type, extra) {
  _plotAnims[index] = { type, startMs: Date.now(), ...extra };
}

export function render(ctx, state, layout, now) {
  const { canvas } = ctx;
  const W = canvas.width;
  const H = canvas.height;
  const nf = nightFactor(state.time.elapsed);
  const pal = blendPalette(nf);
  const { uiBarH, gardenTop } = layout;

  // Sky gradient
  drawSky(ctx, W, H, pal.sky, nf);

  // Sun or Moon
  drawCelestialBody(ctx, W, H, nf, state.time.elapsed);

  // Ground strip
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, gardenTop - 6, W, H - gardenTop + 6);

  // Meadow wildflowers in the background grass strip
  drawMeadowFlowers(ctx, W, gardenTop, pal, nf, now);

  // Fence line (above the garden, below the sky)
  drawFence(ctx, W, gardenTop, pal, nf);

  // Campfire at night
  if (nf > 0.15) {
    drawCampfire(ctx, W, gardenTop, nf, now);
  }

  // Grass tufts along top of ground
  drawGrassTufts(ctx, W, gardenTop, pal.grass, nf);

  // Plot grid
  drawPlots(ctx, state.garden.plots, layout, pal, state.horses, now);

  // Wild horse visitor (drawn between fence and plots)
  if (state.horses && state.horses.wild) {
    drawWildHorse(ctx, state.horses.wild, W, gardenTop, state.time.elapsed, now);
  }

  // Bottom HUD bar
  drawHUD(ctx, W, H, uiBarH, state.inventory, pal, nf);

  // Selected flower indicator (above HUD)
  drawSelectedFlower(ctx, W, H, uiBarH, state.selectedFlower, pal);

  // Tutorial hint (first play — shown via state flag set externally)
  if (state._showTutorial) {
    drawTutorialHint(ctx, W, H, uiBarH, gardenTop, layout, now);
  }

  // Fireflies at night
  if (nf > 0.3) {
    drawFireflies(ctx, W, H, gardenTop, nf, now);
  }
}

function drawSky(ctx, W, H, skyColor, nf) {
  if (nf > 0.05) {
    // Night: gradient from deep blue at top to slightly lighter at horizon
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.2);
    grad.addColorStop(0, lerpColor('#0D1628', '#1A2340', nf));
    grad.addColorStop(1, skyColor);
    ctx.fillStyle = grad;
  } else {
    // Day: warm gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.2);
    grad.addColorStop(0, '#E8D4B0');
    grad.addColorStop(1, skyColor);
    ctx.fillStyle = grad;
  }
  ctx.fillRect(0, 0, W, H);
}

function drawCelestialBody(ctx, W, H, nf, elapsed) {
  const cycle = (elapsed % DAY_DURATION) / DAY_DURATION;
  // Sun arcs from left to right during day
  const sunAngle = cycle * Math.PI;
  const sunX = W * 0.15 + Math.cos(Math.PI - sunAngle) * W * 0.4 + W * 0.35;
  const sunY = H * 0.25 - Math.sin(sunAngle) * H * 0.2;

  if (nf < 0.8) {
    // Sun
    const alpha = 1 - nf;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Outer warm glow
    const grad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 36);
    grad.addColorStop(0, '#FFF9C4');
    grad.addColorStop(0.35, '#FFD54F');
    grad.addColorStop(0.7, 'rgba(255,200,50,0.3)');
    grad.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 36, 0, Math.PI * 2);
    ctx.fill();
    // Sun disc
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 10, 0, Math.PI * 2);
    ctx.fill();
    // Sun rays (pixel-art style)
    ctx.fillStyle = '#FFE082';
    ctx.globalAlpha = alpha * 0.5;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + elapsed * 0.3;
      const rx = sunX + Math.cos(angle) * 16;
      const ry = sunY + Math.sin(angle) * 16;
      ctx.fillRect(Math.round(rx) - 1, Math.round(ry) - 1, 3, 3);
    }
    ctx.restore();
  }

  if (nf > 0.2) {
    // Moon
    const moonX = W * 0.75;
    const moonY = H * 0.12;
    const alpha = Math.min(1, nf * 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    // Moon glow
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 6, moonX, moonY, 24);
    moonGrad.addColorStop(0, 'rgba(232,224,200,0.4)');
    moonGrad.addColorStop(1, 'rgba(232,224,200,0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 24, 0, Math.PI * 2);
    ctx.fill();
    // Moon disc
    ctx.fillStyle = '#E8E0D0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 10, 0, Math.PI * 2);
    ctx.fill();
    // Crescent shadow
    ctx.fillStyle = lerpColor('#0D1628', '#1A2340', nf);
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.arc(moonX + 5, moonY - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    // Stars — small pixel squares that twinkle
    const starPositions = [
      [0.12, 0.05], [0.28, 0.03], [0.42, 0.07], [0.55, 0.09], [0.68, 0.04],
      [0.82, 0.06], [0.06, 0.10], [0.20, 0.11], [0.35, 0.13], [0.50, 0.14],
      [0.62, 0.11], [0.88, 0.08], [0.95, 0.05], [0.15, 0.15], [0.72, 0.14],
    ];
    for (const [sx, sy] of starPositions) {
      const twinkle = 0.5 + 0.5 * Math.sin(elapsed * 2 + sx * 20 + sy * 30);
      ctx.globalAlpha = alpha * twinkle * 0.85;
      ctx.fillStyle = '#FFF9E6';
      const sw = sx < 0.3 ? 2 : 1;
      ctx.fillRect(
        Math.round(sx * ctx.canvas.width) - 1,
        Math.round(sy * ctx.canvas.height) - 1,
        sw, sw
      );
    }
    ctx.restore();
  }
}

function drawMeadowFlowers(ctx, W, gardenTop, pal, nf, now) {
  // Tiny wildflowers scattered in the sky/ground transition strip
  const meadowY = gardenTop - 10;
  const t = now / 1000;
  // Fixed seed positions for consistent placement
  const positions = [
    { x: 0.08, col: '#FFFDE7' }, { x: 0.18, col: '#CE93D8' },
    { x: 0.27, col: '#FFD600' }, { x: 0.38, col: '#EF9A9A' },
    { x: 0.48, col: '#7986CB' }, { x: 0.57, col: '#FF8F00' },
    { x: 0.67, col: '#CE93D8' }, { x: 0.78, col: '#FFFDE7' },
    { x: 0.87, col: '#E1F5FE' }, { x: 0.93, col: '#FFD600' },
  ];
  ctx.save();
  ctx.globalAlpha = nf > 0.5 ? 0.35 : 0.6;
  for (const { x, col } of positions) {
    const px = Math.round(x * W);
    const bob = Math.sin(t * 1.2 + x * 10) * 1.5;
    const py = meadowY + bob;
    ctx.fillStyle = pal.grass;
    ctx.fillRect(px, py, 2, 5); // tiny stem
    ctx.fillStyle = col;
    ctx.fillRect(px - 2, py - 3, 2, 2);
    ctx.fillRect(px + 2, py - 3, 2, 2);
    ctx.fillRect(px, py - 5, 2, 2);
    ctx.fillRect(px, py - 1, 2, 2);
    ctx.fillStyle = '#FFD54F';
    ctx.fillRect(px, py - 3, 2, 2); // center
  }
  ctx.restore();
}

function drawGrassTufts(ctx, W, y, color, nf) {
  ctx.fillStyle = color;
  const spacing = Math.round(W / 18);
  for (let i = 0; i < W; i += spacing) {
    // 3-pixel tuft: varying heights for natural look
    ctx.fillRect(i,     y - 5, 2, 5);
    ctx.fillRect(i + 3, y - 8, 2, 8);
    ctx.fillRect(i + 6, y - 4, 2, 4);
    // Extra variation in alternate tufts
    if ((i / spacing) % 2 === 0) {
      ctx.fillRect(i - 2, y - 3, 2, 3);
    }
  }
  // Fill solid ground below tufts
  ctx.fillStyle = color;
  ctx.fillRect(0, y, W, 3);
}

// ── Fence ─────────────────────────────────────────────────────────────────────

function drawFence(ctx, W, gardenTop, pal, nf) {
  const fenceY = gardenTop - 24;
  const postColor  = nf > 0.5 ? '#6B5010' : '#8B6914';
  const railColor  = nf > 0.5 ? '#7A6012' : '#A07820';
  const shadowColor = 'rgba(0,0,0,0.2)';

  // Shadow under fence
  ctx.fillStyle = shadowColor;
  ctx.fillRect(0, fenceY + 22, W, 3);

  // Two horizontal rails with wood-grain detail
  ctx.fillStyle = railColor;
  ctx.fillRect(0, fenceY + 4, W, 4);
  ctx.fillRect(0, fenceY + 14, W, 4);

  // Rail top highlight
  ctx.fillStyle = nf > 0.5 ? '#8B7020' : '#C09030';
  ctx.fillRect(0, fenceY + 4, W, 1);
  ctx.fillRect(0, fenceY + 14, W, 1);

  // Vertical posts every ~40px with rounded tops
  ctx.fillStyle = postColor;
  const spacing = 40;
  for (let x = 0; x < W; x += spacing) {
    ctx.fillRect(x, fenceY, 6, 22);
    // Post cap (slightly wider)
    ctx.fillRect(x - 1, fenceY, 8, 3);
    // Subtle highlight on post
    ctx.fillStyle = nf > 0.5 ? '#7A5C14' : '#9E7A1A';
    ctx.fillRect(x, fenceY, 2, 22);
    ctx.fillStyle = postColor;
  }
}

// ── Campfire ──────────────────────────────────────────────────────────────────

function drawCampfire(ctx, W, gardenTop, nf, now) {
  const fenceY = gardenTop - 24;
  const cx = Math.round(W * 0.18);
  const cy = fenceY + 2;
  const t = now / 1000;
  const alpha = Math.min(1, (nf - 0.15) / 0.35);

  ctx.save();
  ctx.globalAlpha = alpha;

  // Ground glow (orange-tinted circle)
  const glowR = 28 + 4 * Math.sin(t * 3);
  const glow = ctx.createRadialGradient(cx, cy + 4, 2, cx, cy + 4, glowR);
  glow.addColorStop(0, 'rgba(255,140,40,0.35)');
  glow.addColorStop(0.5, 'rgba(255,100,20,0.15)');
  glow.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - glowR, cy + 4 - glowR, glowR * 2, glowR * 2);

  // Log base (two crossed logs)
  ctx.fillStyle = '#5C3A1A';
  ctx.fillRect(cx - 7, cy + 4, 14, 3);  // horizontal log
  ctx.save();
  ctx.translate(cx, cy + 5);
  ctx.rotate(0.4);
  ctx.fillRect(-7, -1, 14, 3);
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy + 5);
  ctx.rotate(-0.4);
  ctx.fillRect(-7, -1, 14, 3);
  ctx.restore();

  // Embers (small glowing dots)
  ctx.fillStyle = '#FF6020';
  ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(t * 5));
  ctx.fillRect(cx - 3, cy + 3, 2, 2);
  ctx.fillRect(cx + 2, cy + 4, 2, 2);

  // Flames — layered from back to front
  const flicker1 = Math.sin(t * 7.3) * 2;
  const flicker2 = Math.sin(t * 5.1 + 1) * 1.5;

  // Outer flame (orange)
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = '#FF6020';
  ctx.fillRect(cx - 5, cy - 5 + flicker1, 3, 8);
  ctx.fillRect(cx + 3, cy - 4 + flicker2, 3, 7);
  ctx.fillRect(cx - 2, cy - 8 + flicker1 * 0.7, 5, 10);

  // Middle flame (yellow-orange)
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = '#FFAA30';
  ctx.fillRect(cx - 3, cy - 4 + flicker2, 3, 7);
  ctx.fillRect(cx + 1, cy - 3 + flicker1, 3, 6);
  ctx.fillRect(cx - 1, cy - 7 + flicker2 * 0.8, 4, 8);

  // Inner flame (bright yellow)
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFE060';
  ctx.fillRect(cx - 1, cy - 5 + flicker1 * 0.5, 3, 6);
  ctx.fillRect(cx, cy - 8 + flicker2 * 0.5, 2, 5);

  // Sparks floating up
  for (let i = 0; i < 3; i++) {
    const sparkT = (t * 1.2 + i * 0.7) % 2.0;
    if (sparkT < 1.5) {
      const sx = cx + Math.sin(t * 4 + i * 2) * 5;
      const sy = cy - 8 - sparkT * 12;
      ctx.globalAlpha = alpha * (1 - sparkT / 1.5) * 0.8;
      ctx.fillStyle = '#FFD060';
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
  }

  ctx.restore();
}

function drawPlots(ctx, plots, layout, pal, horses, now) {
  const hasPalomino = horses && isTamed(horses, 'goldenPalomino');
  const hasPaint = horses && isTamed(horses, 'paintHorse');
  for (let i = 0; i < plots.length; i++) {
    const plot = plots[i];
    const rect = plotRect(i, layout);
    drawSinglePlot(ctx, plot, rect, pal, hasPalomino, hasPaint, now);
  }
}

function drawSinglePlot(ctx, plot, rect, pal, hasPalomino, hasPaint, now) {
  const { x, y, w, h } = rect;

  // Plot border (slightly darker than soil)
  ctx.fillStyle = pal.plotSoil;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  // Soil fill
  ctx.fillStyle = (plot.state === PLOT_STATE.EMPTY) ? pal.plotEmpty : pal.plotSoil;
  ctx.fillRect(x, y, w, h);

  // Soil texture dots — more naturalistic pattern
  if (plot.state !== PLOT_STATE.EMPTY) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    // Diagonal texture
    for (let dx = 3; dx < w - 2; dx += 6) {
      for (let dy = 3; dy < h - 2; dy += 6) {
        ctx.fillRect(x + dx, y + dy, 2, 1);
      }
    }
    // Lighter highlights
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let dx = 6; dx < w - 2; dx += 9) {
      for (let dy = 6; dy < h - 2; dy += 9) {
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  // Watering shimmer
  if (plot.state === PLOT_STATE.WATERED || plot.state === PLOT_STATE.READY) {
    ctx.fillStyle = 'rgba(100,180,255,0.10)';
    ctx.fillRect(x, y, w, h);
  }

  // Paint Horse — growing faster tint (green shimmer on watered plots)
  if (hasPaint && plot.state === PLOT_STATE.WATERED) {
    const t = now / 700;
    ctx.save();
    ctx.globalAlpha = 0.08 + 0.06 * Math.sin(t + plot.index * 0.7);
    ctx.fillStyle = '#80FF80';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Plant — with grow animation
  if (plot.flowerId && plot.state !== PLOT_STATE.EMPTY) {
    drawPlant(ctx, plot, x, y, w, h, now);
  }

  // Planting animation (seed drops in)
  const plantAnim = _plotAnims[plot.index];
  if (plantAnim && plantAnim.type === 'plant') {
    const age = now - plantAnim.startMs;
    if (age < 500) {
      const progress = age / 500;
      const dropY = y + h * 0.3 * (1 - progress); // seed drops down
      ctx.save();
      ctx.globalAlpha = 1 - progress * 0.5;
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(Math.round(x + w / 2 - 2), Math.round(dropY), 4, 4);
      ctx.restore();
    } else {
      delete _plotAnims[plot.index];
    }
  }

  // Harvest burst animation
  if (plantAnim && plantAnim.type === 'harvest') {
    const age = now - plantAnim.startMs;
    if (age < 650) {
      const progress = age / 650;
      const flower = FLOWERS[plantAnim.flowerId] || {};
      const bloomColor = flower.colors ? flower.colors.bloom : '#FFD54F';
      const centerColor = flower.colors ? flower.colors.center : '#FFA000';
      ctx.save();
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = progress * w * 0.65;
        const px = x + w / 2 + Math.cos(angle) * dist;
        const py = y + h / 2 + Math.sin(angle) * dist;
        ctx.globalAlpha = (1 - progress) * 0.9;
        ctx.fillStyle = i % 2 === 0 ? bloomColor : centerColor;
        const ps = 3 + Math.round((1 - progress) * 2);
        ctx.fillRect(Math.round(px) - Math.floor(ps/2), Math.round(py) - Math.floor(ps/2), ps, ps);
      }
      ctx.restore();
    } else {
      delete _plotAnims[plot.index];
    }
  }

  // "Needs water" indicator — animated drip
  if (plot.state === PLOT_STATE.PLANTED) {
    const t = now / 400;
    const drip = Math.sin(t) > 0 ? 1 : 0;
    ctx.fillStyle = '#90CAF9';
    ctx.fillRect(x + w - 7, y + 2, 5, 3);
    ctx.fillRect(x + w - 6, y + 5, 3, 2);
    ctx.fillRect(x + w - 5, y + 7 + drip, 1, 2);
  }

  // Ready to harvest sparkle — more distinct sparkle cross
  if (plot.state === PLOT_STATE.READY) {
    const t = now / 400;
    const pulse = 0.5 + 0.5 * Math.sin(t + plot.index);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.coinGold;
    // Cross sparkle
    ctx.fillRect(x + 2, y + 4, 1, 3);  // vertical
    ctx.fillRect(x + 1, y + 5, 3, 1);  // horizontal
    ctx.fillRect(x + w - 4, y + 4, 1, 3);
    ctx.fillRect(x + w - 5, y + 5, 3, 1);
    ctx.restore();
  }

  // Golden Palomino — double-harvest glow on ready plots
  if (hasPalomino && plot.state === PLOT_STATE.READY) {
    const t = now / 350;
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.10 * Math.sin(t + plot.index * 1.3);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Chestnut Mare — auto-plow sparkle on recently auto-plowed empty plots
  if (plot.autoPlow && plot.state === PLOT_STATE.EMPTY) {
    const age = now - plot.autoPlow;
    if (age < 1800) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 1800) * 0.7;
      ctx.fillStyle = '#FFF8C0';
      ctx.fillRect(x, y, w, h);
      // Small sparkle cross
      ctx.fillStyle = '#FFD54F';
      ctx.globalAlpha = Math.max(0, 1 - age / 1800);
      ctx.fillRect(x + Math.floor(w / 2) - 1, y + 2, 2, 2);
      ctx.fillRect(x + 2, y + Math.floor(h / 2) - 1, 2, 2);
      ctx.fillRect(x + w - 4, y + Math.floor(h / 2) - 1, 2, 2);
      ctx.restore();
    } else {
      plot.autoPlow = 0; // clear after animation
    }
  }
}

// ── Flower drawing — distinct per type ────────────────────────────────────────

function drawPlant(ctx, plot, x, y, w, h, now) {
  const flower = FLOWERS[plot.flowerId];
  if (!flower) return;

  const cx = x + Math.floor(w / 2);
  const baseY = y + h - 4;

  // For growing stage, compute a scale factor (smooth 0→1 for stage transitions)
  let growScale = 1.0;
  if (plot.state === PLOT_STATE.WATERED && plot.stage < 2) {
    // Subtle scaling: seed=small, sprout=medium, full bloom=full
    growScale = plot.stage === 0 ? 0.6 : 0.8;
  }

  if (plot.stage === 0) {
    drawSeedMound(ctx, flower, cx, baseY, growScale);
  } else if (plot.stage === 1) {
    drawSprout(ctx, flower, cx, baseY, w, h, growScale);
  } else {
    drawBloom(ctx, flower, cx, baseY, w, h, now, plot.index);
  }
}

function drawSeedMound(ctx, flower, cx, baseY, scale) {
  ctx.fillStyle = flower.colors.seed;
  ctx.fillRect(cx - 3, baseY - 4, 6, 4);
  ctx.fillRect(cx - 2, baseY - 6, 4, 2);
  // Tiny highlight on seed
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(cx - 1, baseY - 6, 2, 1);
}

function drawSprout(ctx, flower, cx, baseY, w, h, scale) {
  const stemH = Math.round(h * 0.3 * scale + h * 0.05);
  const stemX = cx - 1;

  // Stem
  ctx.fillStyle = flower.colors.sprout;
  ctx.fillRect(stemX, baseY - stemH, 2, stemH);

  // Leaves — slightly larger for variety
  const leafW = 4;
  ctx.fillRect(stemX - leafW, baseY - stemH + Math.round(stemH * 0.4), leafW, 2);
  ctx.fillRect(stemX + 2, baseY - stemH + Math.round(stemH * 0.65), leafW, 2);

  // Tiny bud top
  ctx.fillStyle = flower.colors.bloom;
  ctx.fillRect(stemX, baseY - stemH - 2, 2, 2);
}

function drawBloom(ctx, flower, cx, baseY, w, h, now, plotIndex) {
  const stemH = Math.round(h * 0.44);
  const r = Math.max(4, Math.round(w * 0.21));
  const bTop = baseY - stemH - r * 2;

  // Gentle wind bob
  const bob = Math.sin(now / 1800 + plotIndex * 0.8) * 0.8;
  const bx = cx + Math.round(bob);

  // Stem
  ctx.fillStyle = flower.colors.sprout;
  ctx.fillRect(bx - 1, baseY - stemH, 2, stemH);

  // Leaves
  ctx.fillRect(bx - 6, baseY - stemH + 5, 5, 2);
  ctx.fillRect(bx + 2, baseY - stemH + 10, 5, 2);

  // Draw flower type-specific bloom
  switch (flower.id) {
    case 'daisy':       drawDaisy(ctx, flower, bx, bTop, r); break;
    case 'lavender':    drawLavender(ctx, flower, bx, bTop, r, stemH, baseY, now, plotIndex); break;
    case 'sunflower':   drawSunflower(ctx, flower, bx, bTop, r); break;
    case 'clover':      drawClover(ctx, flower, bx, bTop, r); break;
    case 'rosehip':     drawRosehip(ctx, flower, bx, bTop, r); break;
    case 'bluebell':    drawBluebellFlower(ctx, flower, bx, bTop, r); break;
    case 'marigold':    drawMarigold(ctx, flower, bx, bTop, r); break;
    case 'moonpetal':   drawMoonpetal(ctx, flower, bx, bTop, r, now, plotIndex); break;
    default:            drawGenericFlower(ctx, flower, bx, bTop, r); break;
  }
}

// Daisy: white/cream petals arranged evenly around a yellow center
function drawDaisy(ctx, flower, cx, bTop, r) {
  const cy = bTop + r;
  // 8 oval petals
  ctx.fillStyle = flower.colors.bloom;
  const petalOffsets = [
    [0, -r - 2, 4, r],     // top
    [r + 1, -r + 2, r, 4], // right
    [0, 2, 4, r],           // bottom
    [-r - 1, -r + 2, r, 4],// left
    [-r, -r - 1, r, r > 6 ? 4 : 3],  // top-left
    [2, -r - 1, r, r > 6 ? 4 : 3],   // top-right
    [-r, 2, r, r > 6 ? 4 : 3],       // bottom-left
    [2, 2, r, r > 6 ? 4 : 3],        // bottom-right
  ];
  for (const [ox, oy, pw, ph] of petalOffsets) {
    ctx.fillRect(cx + ox - 2, cy + oy, pw, ph);
  }
  // Yellow center
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
  ctx.fillStyle = '#FFF176';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

// Lavender: tall spike with many small purple dots
function drawLavender(ctx, flower, cx, bTop, r, stemH, baseY, now, plotIndex) {
  const spikeTop = bTop + r;
  // Extra tall stem for lavender
  ctx.fillStyle = flower.colors.sprout;
  ctx.fillRect(cx - 1, spikeTop, 2, r * 3);
  // Tiny flower buds along spike
  const budCount = 5;
  for (let i = 0; i < budCount; i++) {
    const by2 = spikeTop + i * (r * 3 / budCount);
    const side = i % 2 === 0 ? -4 : 3;
    ctx.fillStyle = flower.colors.bloom;
    ctx.fillRect(cx + side, by2, 3, 3);
    // Tiny stalk to bud
    ctx.fillStyle = flower.colors.sprout;
    ctx.fillRect(cx, by2 + 1, side < 0 ? side + 1 : side, 1);
  }
  // Top bud cluster
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 2, spikeTop - 3, 4, 4);
}

// Sunflower: big circular head with ray petals and dark center
function drawSunflower(ctx, flower, cx, bTop, r) {
  const cy = bTop + r;
  const bigR = r + 3;
  // Ray petals (8 wide petals)
  ctx.fillStyle = flower.colors.bloom;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(angle) * (bigR));
    const py = Math.round(cy + Math.sin(angle) * (bigR));
    ctx.fillRect(px - 2, py - 2, 5, 5);
  }
  // Between-petal smaller petals
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8 + 1 / 16) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(angle) * (bigR - 2));
    const py = Math.round(cy + Math.sin(angle) * (bigR - 2));
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  // Dark brown center (large, distinctive)
  ctx.fillStyle = flower.colors.center;
  const cr = Math.max(4, r - 1);
  ctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
  // Center seeds pattern
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(cx - 2, cy - 2, 2, 2);
  ctx.fillRect(cx + 1, cy - 2, 2, 2);
  ctx.fillRect(cx - 2, cy + 1, 2, 2);
  ctx.fillRect(cx + 1, cy + 1, 2, 2);
}

// Clover: three-lobed round pink/red head
function drawClover(ctx, flower, cx, bTop, r) {
  const cy = bTop + r + 2;
  // Three lobes
  ctx.fillStyle = flower.colors.bloom;
  ctx.fillRect(cx - 3, cy - r - 2, 6, 6);     // top lobe
  ctx.fillRect(cx - r - 1, cy, 5, 5);           // left lobe
  ctx.fillRect(cx + r - 3, cy, 5, 5);           // right lobe
  // Lobe dots
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 1, cy - r, 2, 2);
  ctx.fillRect(cx - r + 1, cy + 1, 2, 2);
  ctx.fillRect(cx + r - 2, cy + 1, 2, 2);
  // Small round center
  ctx.fillStyle = '#FF6060';
  ctx.fillRect(cx - 2, cy - 1, 4, 4);
}

// Rosehip: 5-petal rose-like flower with warm red petals
function drawRosehip(ctx, flower, cx, bTop, r) {
  const cy = bTop + r;
  // 5 petals arranged like a rose
  const petalSize = Math.max(4, r - 1);
  ctx.fillStyle = flower.colors.bloom;
  // Outer petals (5 positions)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.round(cx + Math.cos(angle) * (r - 1));
    const py = Math.round(cy + Math.sin(angle) * (r - 1));
    ctx.fillRect(px - 3, py - 3, 6, 6);
  }
  // Inner ring (darker)
  ctx.fillStyle = '#C0384A';
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(angle) * Math.floor(r * 0.5));
    const py = Math.round(cy + Math.sin(angle) * Math.floor(r * 0.5));
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }
  // Center (dark pink)
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 2, cy - 2, 5, 5);
  ctx.fillStyle = '#FFB0C0';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

// Bluebell: drooping bell-shaped flowers hanging from stem
function drawBluebellFlower(ctx, flower, cx, bTop, r) {
  // Multiple hanging bells
  const bellY = bTop + r;
  const bells = [
    { ox: -r, angle: -0.3 },
    { ox: 0,  angle: 0 },
    { ox: r,  angle: 0.3 },
  ];
  for (const { ox, angle } of bells) {
    const bx = cx + ox;
    const by = bellY;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle * 0.4);
    // Bell shape: narrow top, wide bottom
    ctx.fillStyle = flower.colors.bloom;
    ctx.fillRect(-3, 0, 6, 3);   // top of bell
    ctx.fillRect(-4, 3, 8, 4);   // middle
    ctx.fillRect(-3, 7, 6, 2);   // base
    // Inner highlight
    ctx.fillStyle = '#9FA8DA';
    ctx.fillRect(-1, 1, 2, 6);
    // Stamen dot
    ctx.fillStyle = flower.colors.center;
    ctx.fillRect(-1, 9, 2, 2);
    ctx.restore();
    // Thin stalk to bell
    ctx.fillStyle = flower.colors.sprout;
    ctx.fillRect(bx, bTop + 1, 1, r - 1);
  }
}

// Marigold: dense many-petaled orange/gold flower
function drawMarigold(ctx, flower, cx, bTop, r) {
  const cy = bTop + r;
  // Dense layered petals — draw in rings
  // Outer ring (8 petals)
  ctx.fillStyle = flower.colors.bloom;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(angle) * r);
    const py = Math.round(cy + Math.sin(angle) * r);
    ctx.fillRect(px - 3, py - 3, 6, 6);
  }
  // Middle ring
  ctx.fillStyle = '#FFA000';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8 + 0.5 / 8) * Math.PI * 2;
    const pr = Math.round(r * 0.6);
    const px = Math.round(cx + Math.cos(angle) * pr);
    const py = Math.round(cy + Math.sin(angle) * pr);
    ctx.fillRect(px - 2, py - 2, 5, 5);
  }
  // Dense center
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 3, cy - 3, 7, 7);
  // Center highlight
  ctx.fillStyle = '#FF6D00';
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
}

// Moonpetal: glowing pale blue/white with shimmer — magical appearance
function drawMoonpetal(ctx, flower, cx, bTop, r, now, plotIndex) {
  const cy = bTop + r;
  const t = now / 1000;

  // Outer glow effect
  const shimmer = 0.3 + 0.2 * Math.sin(t * 2 + plotIndex);
  ctx.save();
  ctx.globalAlpha = shimmer;
  const glowGrad = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 5);
  glowGrad.addColorStop(0, 'rgba(200,220,255,0.6)');
  glowGrad.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(cx - r - 6, cy - r - 6, (r + 6) * 2, (r + 6) * 2);
  ctx.restore();

  // 6 elongated teardrop petals
  ctx.fillStyle = flower.colors.bloom;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const px = Math.round(cx + Math.cos(angle) * r);
    const py = Math.round(cy + Math.sin(angle) * r);
    ctx.fillRect(px - 3, py - 3, 6, 6);
  }
  // Inner petals (offset 30°)
  ctx.fillStyle = '#B3D4F0';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6 + 0.5 / 6) * Math.PI * 2;
    const pr = Math.round(r * 0.6);
    const px = Math.round(cx + Math.cos(angle) * pr);
    const py = Math.round(cy + Math.sin(angle) * pr);
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }
  // Center (glowing indigo)
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
  // Shimmer sparkle
  const sparkAlpha = 0.6 + 0.4 * Math.sin(t * 3 + plotIndex * 1.7);
  ctx.save();
  ctx.globalAlpha = sparkAlpha;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - 1, cy - 3, 2, 1);
  ctx.fillRect(cx - 3, cy - 1, 1, 2);
  ctx.fillRect(cx + 2, cy - 1, 1, 2);
  ctx.restore();
}

function drawGenericFlower(ctx, flower, cx, bTop, r) {
  const cy = bTop + r;
  ctx.fillStyle = flower.colors.bloom;
  ctx.fillRect(cx - 1 - r, cy + r - 2, r, r > 6 ? 5 : 4);
  ctx.fillRect(cx + 2,     cy + r - 2, r, r > 6 ? 5 : 4);
  ctx.fillRect(cx - 2,     bTop,       r > 6 ? 5 : 4, r);
  ctx.fillRect(cx - 2,     cy + r * 2 - 2, r > 6 ? 5 : 4, r);
  ctx.fillStyle = flower.colors.center;
  ctx.fillRect(cx - 3, cy - 3, 6, 6);
}

function drawHUD(ctx, W, H, barH, inventory, pal, nf) {
  const barY = H - barH;

  // Bar background with slight gradient feel
  ctx.fillStyle = pal.uiBar;
  ctx.fillRect(0, barY, W, barH);

  // Top border line
  ctx.fillStyle = nf > 0.5 ? '#4A6080' : '#A08060';
  ctx.fillRect(0, barY, W, 2);

  // Coin icon — slightly stylized
  const coinX = 12;
  const coinY = barY + Math.round(barH * 0.25);
  const coinS = Math.round(barH * 0.42);
  ctx.fillStyle = PALETTE.coinGold;
  ctx.fillRect(coinX, coinY, coinS, coinS);
  ctx.fillStyle = '#F9A825';
  ctx.fillRect(coinX + 2, coinY + 2, coinS - 4, coinS - 4);
  // Coin shine
  ctx.fillStyle = '#FFF176';
  ctx.fillRect(coinX + 2, coinY + 2, 3, 2);

  // Coin count
  ctx.fillStyle = pal.text;
  ctx.font = `bold ${Math.round(barH * 0.42)}px monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText(`${inventory.coins}`, coinX + coinS + 6, barY + barH / 2);

  // Seed counts (right side)
  const seedEntries = Object.entries(inventory.seeds);
  if (seedEntries.length > 0) {
    let rx = W - 10;
    ctx.font = `${Math.round(barH * 0.35)}px monospace`;
    ctx.textAlign = 'right';
    for (const [id, qty] of seedEntries.reverse()) {
      const flower = FLOWERS[id];
      if (!flower) continue;
      // Seed color dot
      ctx.fillStyle = flower.colors.bloom;
      ctx.fillRect(rx - 4, barY + barH / 2 - 5, 6, 6);
      ctx.fillStyle = pal.text;
      ctx.fillText(`${qty}`, rx - 8, barY + barH / 2);
      rx -= 40;
    }
    ctx.textAlign = 'left';
  }
}

function drawSelectedFlower(ctx, W, H, barH, selectedId, pal) {
  if (!selectedId) {
    return; // No prompt here — it's in the HTML flower selector bar now
  }

  const flower = FLOWERS[selectedId];
  if (!flower) return;

  const y = H - barH - 26;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, y, W, 26);

  // Flower color dot
  ctx.fillStyle = flower.colors.bloom;
  ctx.fillRect(10, y + 8, 10, 10);

  ctx.fillStyle = pal.text;
  ctx.font = 'bold 14px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${flower.name} — tap empty plot to plant`, 28, y + 13);
}

// ── Tutorial hint ─────────────────────────────────────────────────────────────

function drawTutorialHint(ctx, W, H, barH, gardenTop, layout, now) {
  const { originX, originY, plotW, plotH } = layout;
  // Point at first plot
  const plotCx = originX + plotW / 2;
  const plotCy = originY + plotH / 2;

  // Pulsing arrow above first plot
  const pulse = 0.7 + 0.3 * Math.sin(now / 500);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#FFD54F';
  // Arrow body pointing down
  ctx.fillRect(Math.round(plotCx) - 2, Math.round(plotCy) - 28, 4, 14);
  // Arrow head
  ctx.fillRect(Math.round(plotCx) - 5, Math.round(plotCy) - 16, 10, 4);
  ctx.fillRect(Math.round(plotCx) - 3, Math.round(plotCy) - 12, 6, 3);

  // Hint text pill background
  const text = 'Tap a plot to plant!';
  ctx.font = 'bold 13px monospace';
  const tw = ctx.measureText(text).width;
  const pw = tw + 20;
  const ph = 22;
  const px = Math.round(plotCx - pw / 2);
  const py = Math.round(plotCy) - 55;
  ctx.globalAlpha = pulse * 0.9;
  ctx.fillStyle = '#3E2723';
  roundRect(ctx, px, py, pw, ph, 6);
  ctx.fill();
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#FFD54F';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, Math.round(plotCx), py + ph / 2);
  ctx.textAlign = 'left';
  ctx.restore();
}

// ── Horse rendering ───────────────────────────────────────────────────────────
// Each horse has distinct visual character via markings, body shape, and size.

function drawHorse(ctx, horseId, colors, cx, groundY, scale, facing, anim) {
  const s = scale;
  const fl = facing === 'left' ? -1 : 1;

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(groundY));
  ctx.scale(fl, 1);

  // Leg animation
  const legBob = Math.sin(anim * 4) * s * 0.8;
  const bodyBob = Math.sin(anim * 4) * s * 0.3;

  // Per-horse body shape variation
  const shape = HORSE_SHAPES[horseId] || HORSE_SHAPES.default;

  // ── Legs ──
  ctx.fillStyle = colors.body;
  ctx.fillRect(-s * 7, -s * 8 + legBob,       s * shape.legW, s * 8);
  ctx.fillRect(-s * 3, -s * 8 - legBob,       s * shape.legW, s * 8);
  ctx.fillRect( s * 2, -s * 8 - legBob * 0.5, s * shape.legW, s * 8);
  ctx.fillRect( s * 6, -s * 8 + legBob * 0.5, s * shape.legW, s * 8);

  // Hooves — distinct per horse
  ctx.fillStyle = shape.hoofColor || colors.mane;
  ctx.fillRect(-s * 7, -s * 1 + legBob,       s * shape.legW, s * 2);
  ctx.fillRect(-s * 3, -s * 1 - legBob,       s * shape.legW, s * 2);
  ctx.fillRect( s * 2, -s * 1 - legBob * 0.5, s * shape.legW, s * 2);
  ctx.fillRect( s * 6, -s * 1 + legBob * 0.5, s * shape.legW, s * 2);

  // ── Body ──
  ctx.fillStyle = colors.body;
  ctx.fillRect(-s * shape.bodyLeft, -s * shape.bodyTop + bodyBob, s * shape.bodyW, s * shape.bodyH);

  // ── Markings (spots, stripe, blanket, etc.) ──
  if (shape.markings) {
    shape.markings(ctx, s, bodyBob, colors);
  }

  // ── Neck ──
  ctx.fillStyle = colors.body;
  ctx.fillRect(s * shape.neckX, -s * shape.neckTop + bodyBob, s * shape.neckW, s * shape.neckH);

  // ── Head ──
  ctx.fillRect(s * shape.headX, -s * shape.headTop + bodyBob, s * shape.headW, s * shape.headH);

  // ── Nose ──
  ctx.fillStyle = colors.nose;
  ctx.fillRect(s * shape.noseX, -s * shape.noseTop + bodyBob, s * shape.noseW, s * shape.noseH);

  // ── Eye ──
  ctx.fillStyle = colors.eye;
  ctx.fillRect(s * shape.eyeX, -s * shape.eyeTop + bodyBob, s * 2, s * 2);
  // Eye highlight
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(s * shape.eyeX + s, -s * shape.eyeTop + bodyBob, s, s);

  // ── Nostril ──
  ctx.fillStyle = colors.nose;
  ctx.fillRect(s * 13, -s * 24 + bodyBob, s * 2, s * 2);

  // ── Ear ──
  ctx.fillStyle = colors.body;
  ctx.fillRect(s * 7, -s * 32 + bodyBob, s * 3, s * 4);
  ctx.fillStyle = colors.mane;
  ctx.fillRect(s * 8, -s * 31 + bodyBob, s * 1, s * 2);

  // ── Mane ──
  ctx.fillStyle = colors.mane;
  ctx.fillRect(s * 6, -s * 30 + bodyBob, s * shape.maneW, s * 7);
  ctx.fillRect(s * 5, -s * 26 + bodyBob, s * shape.maneW, s * 4);
  // Mane wisp
  ctx.fillRect(s * shape.neckX - 1, -s * (shape.neckTop - 2) + bodyBob, s * 2, s * shape.neckH);

  // ── Tail ──
  ctx.fillStyle = colors.mane;
  const tailWag = Math.sin(anim * 2.5) * s * 2;
  ctx.fillRect(-s * 10, -s * 18 + bodyBob, s * shape.tailW, s * 12 + tailWag);
  ctx.fillRect(-s * 12, -s * 10 + bodyBob + tailWag, s * shape.tailW, s * 6);

  ctx.restore();
}

// Per-horse shape definitions — body proportions and markings
const HORSE_SHAPES = {
  default: {
    legW: 3, bodyLeft: 9, bodyTop: 18, bodyW: 20, bodyH: 10,
    neckX: 7, neckTop: 24, neckW: 5, neckH: 8,
    headX: 6, headTop: 30, headW: 9, headH: 7,
    noseX: 12, noseTop: 27, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 28,
    maneW: 3, tailW: 3, hoofColor: null,
    markings: null,
  },
  // Chestnut Mare — compact body, lighter legs
  chestnutMare: {
    legW: 3, bodyLeft: 9, bodyTop: 17, bodyW: 19, bodyH: 10,
    neckX: 7, neckTop: 23, neckW: 5, neckH: 8,
    headX: 6, headTop: 29, headW: 9, headH: 7,
    noseX: 12, noseTop: 26, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 27,
    maneW: 3, tailW: 3, hoofColor: '#C09060',
    markings: (ctx, s, bb, c) => {
      // White blaze on face
      ctx.fillStyle = '#F0E0D0';
      ctx.fillRect(s * 9, -s * 28 + bb, s * 2, s * 5);
    },
  },
  // Appaloosa — distinctive spotted coat
  appaloosa: {
    legW: 3, bodyLeft: 9, bodyTop: 18, bodyW: 20, bodyH: 10,
    neckX: 7, neckTop: 24, neckW: 5, neckH: 8,
    headX: 6, headTop: 30, headW: 9, headH: 7,
    noseX: 12, noseTop: 27, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 28,
    maneW: 3, tailW: 3, hoofColor: '#B8A080',
    markings: (ctx, s, bb, c) => {
      // Spots on hindquarters
      ctx.fillStyle = '#A89060';
      ctx.fillRect(-s * 7, -s * 17 + bb, s * 4, s * 4);
      ctx.fillRect(-s * 3, -s * 14 + bb, s * 3, s * 3);
      ctx.fillRect(-s * 6, -s * 12 + bb, s * 3, s * 3);
      ctx.fillRect( s * 0, -s * 16 + bb, s * 3, s * 3);
    },
  },
  // Paint Horse — large pinto patches
  paintHorse: {
    legW: 3, bodyLeft: 9, bodyTop: 18, bodyW: 20, bodyH: 10,
    neckX: 7, neckTop: 24, neckW: 5, neckH: 8,
    headX: 6, headTop: 30, headW: 9, headH: 7,
    noseX: 12, noseTop: 27, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 28,
    maneW: 4, tailW: 3, hoofColor: '#8B6914',
    markings: (ctx, s, bb, c) => {
      // Large brown patch on body
      ctx.fillStyle = '#8B5A2A';
      ctx.fillRect(-s * 2, -s * 18 + bb, s * 8, s * 7);
      ctx.fillRect(-s * 4, -s * 16 + bb, s * 4, s * 5);
      // White patch on face
      ctx.fillStyle = '#F8F0E0';
      ctx.fillRect(s * 7, -s * 30 + bb, s * 4, s * 6);
    },
  },
  // Golden Palomino — elegant long neck, flowing mane
  goldenPalomino: {
    legW: 3, bodyLeft: 9, bodyTop: 19, bodyW: 19, bodyH: 9,
    neckX: 7, neckTop: 26, neckW: 5, neckH: 10,
    headX: 6, headTop: 32, headW: 9, headH: 7,
    noseX: 12, noseTop: 29, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 30,
    maneW: 4, tailW: 4, hoofColor: '#C8A030',
    markings: (ctx, s, bb, c) => {
      // Lighter belly
      ctx.fillStyle = '#E0C060';
      ctx.fillRect(-s * 4, -s * 10 + bb, s * 10, s * 3);
    },
  },
  // Black Stallion — sleek, muscular, longer body
  blackStallion: {
    legW: 3, bodyLeft: 10, bodyTop: 19, bodyW: 21, bodyH: 10,
    neckX: 7, neckTop: 25, neckW: 6, neckH: 9,
    headX: 6, headTop: 31, headW: 10, headH: 7,
    noseX: 12, noseTop: 28, noseW: 5, noseH: 4,
    eyeX: 8, eyeTop: 29,
    maneW: 3, tailW: 4, hoofColor: '#0A0804',
    markings: (ctx, s, bb, c) => {
      // Single white star on forehead
      ctx.fillStyle = '#D0C0B0';
      ctx.fillRect(s * 9, -s * 30 + bb, s * 3, s * 3);
    },
  },
  // Frost Pony — small and round, fluffy
  frostPony: {
    legW: 3, bodyLeft: 8, bodyTop: 17, bodyW: 18, bodyH: 11,
    neckX: 7, neckTop: 23, neckW: 5, neckH: 7,
    headX: 5, headTop: 28, headW: 10, headH: 8,
    noseX: 12, noseTop: 25, noseW: 4, noseH: 5,
    eyeX: 7, eyeTop: 26,
    maneW: 4, tailW: 5, hoofColor: '#A8C0D8',
    markings: (ctx, s, bb, c) => {
      // Icy blue tinge on shoulders
      ctx.fillStyle = 'rgba(180,210,240,0.4)';
      ctx.fillRect( s * 2, -s * 18 + bb, s * 8, s * 6);
    },
  },
  // Shadow Runner — dark purple, lean, slightly taller
  shadowRunner: {
    legW: 3, bodyLeft: 9, bodyTop: 19, bodyW: 19, bodyH: 9,
    neckX: 7, neckTop: 25, neckW: 5, neckH: 9,
    headX: 6, headTop: 31, headW: 9, headH: 7,
    noseX: 12, noseTop: 28, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 29,
    maneW: 3, tailW: 3, hoofColor: '#1A1228',
    markings: (ctx, s, bb, c) => {
      // Subtle purple shimmer stripe
      ctx.fillStyle = 'rgba(140,80,180,0.25)';
      ctx.fillRect(-s * 2, -s * 19 + bb, s * 12, s * 4);
    },
  },
  // Starlight Unicorn — graceful, larger head, sparkly
  starlightUnicorn: {
    legW: 3, bodyLeft: 9, bodyTop: 18, bodyW: 20, bodyH: 10,
    neckX: 7, neckTop: 25, neckW: 5, neckH: 9,
    headX: 6, headTop: 31, headW: 9, headH: 7,
    noseX: 12, noseTop: 28, noseW: 4, noseH: 4,
    eyeX: 8, eyeTop: 29,
    maneW: 5, tailW: 5, hoofColor: '#C8A8F0',
    markings: (ctx, s, bb, c) => {
      // Shimmering star pattern on body
      ctx.fillStyle = 'rgba(200,168,255,0.3)';
      ctx.fillRect(-s * 3, -s * 19 + bb, s * 15, s * 8);
      // Star dots
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(-s * 1, -s * 17 + bb, s * 2, s * 2);
      ctx.fillRect( s * 4, -s * 15 + bb, s * 2, s * 2);
      ctx.fillRect( s * 1, -s * 12 + bb, s * 2, s * 2);
    },
  },
};

// Draw the unicorn horn on top of drawHorse
function drawUnicornHorn(ctx, colors, cx, groundY, scale, facing, anim) {
  const s = scale;
  const fl = facing === 'left' ? -1 : 1;
  const bodyBob = Math.sin(anim * 4) * s * 0.3;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(groundY));
  ctx.scale(fl, 1);
  // Horn — spiraled appearance with color
  ctx.fillStyle = '#E8D8FF';
  ctx.fillRect(s * 9,  -s * 36 + bodyBob, s * 2, s * 5);
  ctx.fillRect(s * 10, -s * 38 + bodyBob, s * 1, s * 3);
  ctx.fillRect(s * 10, -s * 40 + bodyBob, s * 1, s * 2);
  // Horn spiral stripe
  ctx.fillStyle = '#B090E8';
  ctx.fillRect(s * 9, -s * 37 + bodyBob, s * 1, s * 1);
  ctx.fillRect(s * 10, -s * 39 + bodyBob, s * 1, s * 1);
  // Horn shimmer
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(s * 9,  -s * 36 + bodyBob, s * 1, s * 3);
  // Sparkle around horn
  const sparkT = anim * 2;
  ctx.fillStyle = 'rgba(220,200,255,0.8)';
  ctx.fillRect(
    s * 8 + Math.round(Math.cos(sparkT) * s * 3),
    -s * 38 + bodyBob + Math.round(Math.sin(sparkT) * s * 2),
    s, s
  );
  ctx.restore();
}

function drawWildHorse(ctx, wild, W, gardenTop, elapsed, now) {
  const horse = HORSES[wild.horseId];
  if (!horse) return;

  const fenceY  = gardenTop - 24;
  const groundY = fenceY + 20;

  // Gentle arrival animation: slide in from the right
  const age = elapsed - wild.arrivedAt;
  const slideIn = Math.min(1, age / 1.2);
  const targetX = W * 0.72;
  const startX  = W + 60;
  const cx = startX + (targetX - startX) * easeOut(slideIn);

  const scale = Math.max(1.6, W / 150);
  const anim  = elapsed;
  const facing = 'left';

  const bodyBob = Math.sin(anim * 4) * scale * 0.3;

  drawHorse(ctx, horse.id, horse.colors, cx, groundY, scale, facing, anim);

  if (horse.id === 'starlightUnicorn') {
    drawUnicornHorn(ctx, horse.colors, cx, groundY, scale, facing, anim);
  }

  // Reaction bubble
  if (wild.reacting && elapsed < wild.reactEnd) {
    const bubbleAlpha = Math.min(1, (wild.reactEnd - elapsed) / 0.5);
    const isHappy = wild.reacting === 'happy';
    const label = isHappy ? '+ trust' : '...';
    const bx = cx - scale * 8;
    const by = groundY - scale * 40;
    ctx.save();
    ctx.globalAlpha = bubbleAlpha;

    // Bounce effect on happy reaction
    const bounce = isHappy ? Math.abs(Math.sin((wild.reactEnd - elapsed) * 5)) * 4 : 0;
    const byOffset = by - bounce;

    ctx.fillStyle = isHappy ? '#C8F0A0' : '#F0C8A0';
    ctx.strokeStyle = isHappy ? '#4A8020' : '#8B5010';
    ctx.lineWidth = 2;
    const bw = 60, bh = 22;
    roundRect(ctx, bx - bw / 2, byOffset - bh, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    // Tail triangle
    ctx.fillStyle = isHappy ? '#C8F0A0' : '#F0C8A0';
    ctx.beginPath();
    ctx.moveTo(bx - 4, byOffset);
    ctx.lineTo(bx + 4, byOffset);
    ctx.lineTo(bx, byOffset + 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isHappy ? '#2A5010' : '#5C2A00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, byOffset - bh / 2);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // "Tap to feed" hint — only shown if not yet fed
  if (!wild.fed) {
    const hintAlpha = Math.min(1, age * 2) * (0.7 + 0.3 * Math.sin(now / 600));
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const hintW = 148, hintH = 20;
    const hintX = cx - hintW / 2 - scale * 4;
    const hintY = groundY - scale * 48;
    roundRect(ctx, hintX, hintY, hintW, hintH, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,100,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#FFF8E1';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tap to feed a flower', hintX + hintW / 2, hintY + hintH / 2);
    ctx.textAlign = 'left';
    ctx.restore();
  }
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
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

// ── Persistent firefly state ──────────────────────────────────────────────────
const _fireflies = [];
function initFireflies(W, H, groundY) {
  for (let i = 0; i < 14; i++) {
    _fireflies.push({
      x: Math.random() * W,
      y: groundY + Math.random() * (H - groundY) * 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      dir: Math.random() * Math.PI * 2,
      size: Math.random() < 0.3 ? 3 : 2,
    });
  }
}

function drawFireflies(ctx, W, H, groundY, nf, now) {
  if (_fireflies.length === 0) initFireflies(W, H, groundY);
  const alpha = Math.min(1, (nf - 0.3) / 0.4);
  const t = now / 1000;
  ctx.save();
  for (const f of _fireflies) {
    const flicker = 0.4 + 0.6 * Math.sin(t * f.speed * 3 + f.phase);
    ctx.globalAlpha = alpha * flicker * 0.85;
    ctx.fillStyle = '#FFFF99';
    ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
    // Tiny glow for larger fireflies
    if (f.size === 3) {
      ctx.globalAlpha = alpha * flicker * 0.25;
      ctx.fillStyle = '#FFFFCC';
      ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 5, 5);
    }
  }
  ctx.restore();

  // Drift fireflies slowly
  for (const f of _fireflies) {
    f.x += Math.cos(f.dir) * 0.3;
    f.y += Math.sin(f.dir) * 0.15;
    f.dir += (Math.random() - 0.5) * 0.1;
    // Wrap
    if (f.x < 0) f.x = W;
    if (f.x > W) f.x = 0;
    if (f.y < groundY) f.y = groundY;
    if (f.y > H * 0.85) f.y = groundY + Math.random() * 40;
  }
}
