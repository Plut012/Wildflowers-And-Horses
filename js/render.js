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
  const plotW = Math.floor((gardenW - gap * (GRID_COLS + 1)) / GRID_COLS);
  const plotH = Math.floor((gardenH - gap * (GRID_ROWS + 1)) / GRID_ROWS);

  const totalGridW = GRID_COLS * plotW + (GRID_COLS + 1) * gap;
  const totalGridH = GRID_ROWS * plotH + (GRID_ROWS + 1) * gap;

  const originX = Math.floor((canvasW - totalGridW) / 2) + gap;
  const originY = gardenTop + Math.floor((gardenH - totalGridH) / 2) + gap;

  return { originX, originY, plotW, plotH, gap, uiBarH, gardenTop };
}

export function render(ctx, state, layout, now) {
  const { canvas } = ctx;
  const W = canvas.width;
  const H = canvas.height;
  const nf = nightFactor(state.time.elapsed);
  const pal = blendPalette(nf);
  const { uiBarH, gardenTop } = layout;

  // Sky
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, W, H);

  // Sun or Moon
  drawCelestialBody(ctx, W, H, nf, state.time.elapsed);

  // Ground strip
  ctx.fillStyle = pal.ground;
  ctx.fillRect(0, gardenTop - 6, W, H - gardenTop + 6);

  // Fence line (above the garden, below the sky)
  drawFence(ctx, W, gardenTop, pal);

  // Grass tufts along top of ground
  drawGrassTufts(ctx, W, gardenTop, pal.grass, nf);

  // Plot grid
  drawPlots(ctx, state.garden.plots, layout, pal, state.horses);

  // Wild horse visitor (drawn between fence and plots)
  if (state.horses && state.horses.wild) {
    drawWildHorse(ctx, state.horses.wild, W, gardenTop, state.time.elapsed, now);
  }

  // Bottom HUD bar
  drawHUD(ctx, W, H, uiBarH, state.inventory, pal, nf);

  // Selected flower indicator (above HUD)
  drawSelectedFlower(ctx, W, H, uiBarH, state.selectedFlower, pal);

  // Fireflies at night
  if (nf > 0.3) {
    drawFireflies(ctx, W, H, gardenTop, nf, now);
  }
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
    // Glow
    const grad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 28);
    grad.addColorStop(0, '#FFF9C4');
    grad.addColorStop(0.4, '#FFD54F');
    grad.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF9C4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (nf > 0.2) {
    // Moon
    const moonX = W * 0.75;
    const moonY = H * 0.12;
    const alpha = Math.min(1, nf * 1.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#E8E0D0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 10, 0, Math.PI * 2);
    ctx.fill();
    // Crescent shadow
    ctx.fillStyle = PALETTE.skyNight;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.arc(moonX + 5, moonY - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    // Stars
    ctx.fillStyle = '#FFF9E6';
    const stars = [[0.15, 0.06], [0.3, 0.03], [0.55, 0.08], [0.85, 0.04],
                   [0.05, 0.10], [0.45, 0.12], [0.65, 0.05], [0.9, 0.09]];
    for (const [sx, sy] of stars) {
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillRect(Math.round(sx * ctx.canvas.width) - 1, Math.round(sy * ctx.canvas.height) - 1, 2, 2);
    }
    ctx.restore();
  }
}

function drawGrassTufts(ctx, W, y, color, nf) {
  ctx.fillStyle = color;
  const spacing = Math.round(W / 18);
  for (let i = 0; i < W; i += spacing) {
    // Simple pixel tuft: 3 rectangles
    ctx.fillRect(i,     y - 5, 2, 5);
    ctx.fillRect(i + 3, y - 8, 2, 8);
    ctx.fillRect(i + 6, y - 4, 2, 4);
  }
  // Fill solid ground below tufts
  ctx.fillStyle = color;
  ctx.fillRect(0, y, W, 3);
}

function drawPlots(ctx, plots, layout, pal, horses) {
  const hasPalomino = horses && isTamed(horses, 'goldenPalomino');
  const hasPaint = horses && isTamed(horses, 'paintHorse');
  for (let i = 0; i < plots.length; i++) {
    const plot = plots[i];
    const rect = plotRect(i, layout);
    drawSinglePlot(ctx, plot, rect, pal, hasPalomino, hasPaint);
  }
}

function drawSinglePlot(ctx, plot, rect, pal, hasPalomino, hasPaint) {
  const { x, y, w, h } = rect;

  // Plot border (slightly darker than soil)
  ctx.fillStyle = pal.plotSoil;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  // Soil fill
  ctx.fillStyle = (plot.state === PLOT_STATE.EMPTY) ? pal.plotEmpty : pal.plotSoil;
  ctx.fillRect(x, y, w, h);

  // Soil texture dots
  if (plot.state !== PLOT_STATE.EMPTY) {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let dx = 4; dx < w - 2; dx += 7) {
      for (let dy = 4; dy < h - 2; dy += 7) {
        ctx.fillRect(x + dx, y + dy, 2, 2);
      }
    }
  }

  // Watering shimmer
  if (plot.state === PLOT_STATE.WATERED || plot.state === PLOT_STATE.READY) {
    ctx.fillStyle = 'rgba(100,180,255,0.12)';
    ctx.fillRect(x, y, w, h);
  }

  // Paint Horse — growing faster tint (green shimmer on watered plots)
  if (hasPaint && plot.state === PLOT_STATE.WATERED) {
    const t = Date.now() / 700;
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.06 * Math.sin(t + plot.index * 0.7);
    ctx.fillStyle = '#80FF80';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Plant
  if (plot.flowerId && plot.state !== PLOT_STATE.EMPTY) {
    drawPlant(ctx, plot, x, y, w, h);
  }

  // "Needs water" indicator
  if (plot.state === PLOT_STATE.PLANTED) {
    ctx.fillStyle = '#90CAF9';
    ctx.fillRect(x + w - 7, y + 2, 5, 3);
    ctx.fillRect(x + w - 6, y + 5, 3, 2);
    ctx.fillRect(x + w - 5, y + 7, 1, 2);
  }

  // Ready to harvest sparkle
  if (plot.state === PLOT_STATE.READY) {
    const t = Date.now() / 400;
    ctx.fillStyle = PALETTE.coinGold;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t + plot.index);
    ctx.fillRect(x + 2, y + 2, 3, 3);
    ctx.fillRect(x + w - 5, y + 2, 3, 3);
    ctx.globalAlpha = 1;
  }

  // Golden Palomino — double-harvest glow on ready plots
  if (hasPalomino && plot.state === PLOT_STATE.READY) {
    const t = Date.now() / 350;
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t + plot.index * 1.3);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  // Chestnut Mare — auto-plow sparkle on recently auto-plowed empty plots
  if (plot.autoPlow && plot.state === PLOT_STATE.EMPTY) {
    const age = Date.now() - plot.autoPlow;
    if (age < 1800) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - age / 1800) * 0.7;
      ctx.fillStyle = '#FFF8C0';
      ctx.fillRect(x, y, w, h);
      // Small sparkle dots
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

function drawPlant(ctx, plot, x, y, w, h) {
  const flower = FLOWERS[plot.flowerId];
  if (!flower) return;

  const cx = x + Math.floor(w / 2);
  const baseY = y + h - 4;

  if (plot.stage === 0) {
    // Seed mound
    ctx.fillStyle = flower.colors.seed;
    ctx.fillRect(cx - 3, baseY - 4, 6, 4);
    ctx.fillRect(cx - 2, baseY - 6, 4, 2);
  } else if (plot.stage === 1) {
    // Sprout: stem + tiny leaf
    const stemH = Math.round(h * 0.35);
    ctx.fillStyle = flower.colors.sprout;
    ctx.fillRect(cx - 1, baseY - stemH, 2, stemH);
    // Left leaf
    ctx.fillRect(cx - 5, baseY - stemH + 4, 4, 3);
    // Right leaf
    ctx.fillRect(cx + 2, baseY - stemH + 8, 4, 3);
  } else {
    // Full bloom
    const stemH = Math.round(h * 0.45);
    // Stem
    ctx.fillStyle = flower.colors.sprout;
    ctx.fillRect(cx - 1, baseY - stemH, 2, stemH);
    // Leaves
    ctx.fillRect(cx - 6, baseY - stemH + 5, 5, 3);
    ctx.fillRect(cx + 2, baseY - stemH + 10, 5, 3);
    // Petals
    const r = Math.max(4, Math.round(w * 0.22));
    const bTop = baseY - stemH - r * 2;
    ctx.fillStyle = flower.colors.bloom;
    // 4 petal directions
    ctx.fillRect(cx - 1 - r, bTop + r, r, r > 6 ? 5 : 4);   // left
    ctx.fillRect(cx + 2,     bTop + r, r, r > 6 ? 5 : 4);   // right
    ctx.fillRect(cx - 2,     bTop,     r > 6 ? 5 : 4, r);   // top
    ctx.fillRect(cx - 2,     bTop + r * 2 - 2, r > 6 ? 5 : 4, r); // bottom
    // Diagonal petals (slightly smaller)
    const dr = Math.round(r * 0.7);
    ctx.fillRect(cx - 1 - dr, bTop + dr - 3, dr, dr > 4 ? 4 : 3);
    ctx.fillRect(cx + 2,      bTop + dr - 3, dr, dr > 4 ? 4 : 3);
    ctx.fillRect(cx - 1 - dr, bTop + r + 2,  dr, dr > 4 ? 4 : 3);
    ctx.fillRect(cx + 2,      bTop + r + 2,  dr, dr > 4 ? 4 : 3);
    // Center
    ctx.fillStyle = flower.colors.center;
    ctx.fillRect(cx - 3, bTop + r - 3, 6, 6);
  }
}

function drawHUD(ctx, W, H, barH, inventory, pal, nf) {
  const barY = H - barH;

  // Bar background
  ctx.fillStyle = pal.uiBar;
  ctx.fillRect(0, barY, W, barH);

  // Top border line
  ctx.fillStyle = nf > 0.5 ? '#4A6080' : '#A08060';
  ctx.fillRect(0, barY, W, 2);

  // Coin icon (golden square)
  const coinX = 12;
  const coinY = barY + Math.round(barH * 0.25);
  const coinS = Math.round(barH * 0.4);
  ctx.fillStyle = PALETTE.coinGold;
  ctx.fillRect(coinX, coinY, coinS, coinS);
  ctx.fillStyle = '#F9A825';
  ctx.fillRect(coinX + 2, coinY + 2, coinS - 4, coinS - 4);

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
      ctx.fillStyle = pal.text;
      ctx.fillText(`${flower.name[0]}:${qty}`, rx, barY + barH / 2);
      rx -= 52;
    }
    ctx.textAlign = 'left';
  }
}

function drawSelectedFlower(ctx, W, H, barH, selectedId, pal) {
  if (!selectedId) {
    // Prompt
    const y = H - barH - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y, W, 22);
    ctx.fillStyle = pal.text;
    ctx.font = '13px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('Tap a plot  |  Open Market to buy seeds', W / 2, y + 11);
    ctx.textAlign = 'left';
    return;
  }

  const flower = FLOWERS[selectedId];
  if (!flower) return;

  const y = H - barH - 26;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, y, W, 26);

  // Dot
  ctx.fillStyle = flower.colors.bloom;
  ctx.fillRect(10, y + 8, 10, 10);

  ctx.fillStyle = pal.text;
  ctx.font = 'bold 14px monospace';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${flower.name} selected — tap empty plot to plant`, 28, y + 13);
}

// ── Fence ─────────────────────────────────────────────────────────────────────

function drawFence(ctx, W, gardenTop, pal) {
  const fenceY = gardenTop - 24;
  const postColor  = '#8B6914';
  const railColor  = '#A07820';

  // Two horizontal rails
  ctx.fillStyle = railColor;
  ctx.fillRect(0, fenceY + 4, W, 4);
  ctx.fillRect(0, fenceY + 14, W, 4);

  // Vertical posts every ~40px
  ctx.fillStyle = postColor;
  const spacing = 40;
  for (let x = 0; x < W; x += spacing) {
    ctx.fillRect(x, fenceY, 6, 22);
  }
}

// ── Horse rendering ───────────────────────────────────────────────────────────

// Draw a pixel-art horse at position (cx, groundY).
// facing: 'left' | 'right'
function drawHorse(ctx, colors, cx, groundY, scale, facing, anim) {
  const s = scale;
  const fl = facing === 'left' ? -1 : 1;

  ctx.save();
  ctx.translate(Math.round(cx), Math.round(groundY));
  ctx.scale(fl, 1);

  // Legs (4 simple rectangles, slight animation bob)
  const legBob = Math.sin(anim * 4) * s * 0.8;
  ctx.fillStyle = colors.body;
  // back legs
  ctx.fillRect(-s * 7, -s * 8 + legBob,      s * 3, s * 8);
  ctx.fillRect(-s * 3, -s * 8 - legBob,      s * 3, s * 8);
  // front legs
  ctx.fillRect( s * 2, -s * 8 - legBob * 0.5, s * 3, s * 8);
  ctx.fillRect( s * 6, -s * 8 + legBob * 0.5, s * 3, s * 8);

  // Hooves
  ctx.fillStyle = colors.mane;
  ctx.fillRect(-s * 7, -s * 1 + legBob,       s * 3, s * 2);
  ctx.fillRect(-s * 3, -s * 1 - legBob,       s * 3, s * 2);
  ctx.fillRect( s * 2, -s * 1 - legBob * 0.5, s * 3, s * 2);
  ctx.fillRect( s * 6, -s * 1 + legBob * 0.5, s * 3, s * 2);

  // Body
  ctx.fillStyle = colors.body;
  const bodyBob = Math.sin(anim * 4) * s * 0.3;
  ctx.fillRect(-s * 9, -s * 18 + bodyBob, s * 20, s * 10);

  // Neck
  ctx.fillRect(s * 7, -s * 24 + bodyBob, s * 5, s * 8);

  // Head
  ctx.fillRect(s * 6, -s * 30 + bodyBob, s * 9, s * 7);

  // Nose/snout extension
  ctx.fillStyle = colors.nose;
  ctx.fillRect(s * 12, -s * 27 + bodyBob, s * 4, s * 4);

  // Eye
  ctx.fillStyle = colors.eye;
  ctx.fillRect(s * 8, -s * 28 + bodyBob, s * 2, s * 2);

  // Nostril
  ctx.fillStyle = colors.nose;
  ctx.fillRect(s * 13, -s * 24 + bodyBob, s * 2, s * 2);

  // Ear
  ctx.fillStyle = colors.body;
  ctx.fillRect(s * 7, -s * 32 + bodyBob, s * 3, s * 4);
  ctx.fillStyle = colors.mane;
  ctx.fillRect(s * 8, -s * 31 + bodyBob, s * 1, s * 2);

  // Mane
  ctx.fillStyle = colors.mane;
  ctx.fillRect(s * 6, -s * 30 + bodyBob, s * 3, s * 7);
  ctx.fillRect(s * 5, -s * 26 + bodyBob, s * 3, s * 4);

  // Tail
  ctx.fillStyle = colors.mane;
  const tailWag = Math.sin(anim * 2.5) * s * 2;
  ctx.fillRect(-s * 10, -s * 18 + bodyBob, s * 3, s * 12 + tailWag);
  ctx.fillRect(-s * 12, -s * 10 + bodyBob + tailWag, s * 3, s * 6);

  ctx.restore();
}

// Draw the unicorn horn on top of drawHorse
function drawUnicornHorn(ctx, colors, cx, groundY, scale, facing, bodyBob) {
  const s = scale;
  const fl = facing === 'left' ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(groundY));
  ctx.scale(fl, 1);
  // Horn (above ear position)
  ctx.fillStyle = '#D4C8FF';
  ctx.fillRect(s * 9,  -s * 36 + bodyBob, s * 2, s * 5);
  ctx.fillRect(s * 10, -s * 38 + bodyBob, s * 1, s * 3);
  // Horn shimmer
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(s * 9,  -s * 36 + bodyBob, s * 1, s * 2);
  ctx.restore();
}

function drawWildHorse(ctx, wild, W, gardenTop, elapsed, now) {
  const horse = HORSES[wild.horseId];
  if (!horse) return;

  // Horse lives just in front of the fence, above the garden plots
  const fenceY  = gardenTop - 24;
  const groundY = fenceY + 20;  // hooves sit just below fence top rail

  // Gentle arrival animation: slide in from the right
  const age = elapsed - wild.arrivedAt;
  const slideIn = Math.min(1, age / 1.2);  // 1.2 s slide
  const targetX = W * 0.72;
  const startX  = W + 60;
  const cx = startX + (targetX - startX) * easeOut(slideIn);

  const scale = Math.max(1.2, W / 200);  // scale up on larger screens
  const anim  = elapsed;
  const facing = 'left';

  const bodyBob = Math.sin(anim * 4) * scale * 0.3;

  drawHorse(ctx, horse.colors, cx, groundY, scale, facing, anim);

  if (horse.id === 'starlightUnicorn') {
    drawUnicornHorn(ctx, horse.colors, cx, groundY, scale, facing, bodyBob);
  }

  // Reaction bubble
  if (wild.reacting && elapsed < wild.reactEnd) {
    const bubbleAlpha = Math.min(1, (wild.reactEnd - elapsed) / 0.5);
    const label = wild.reacting === 'happy' ? '+ trust' : '...';
    const bx = cx - scale * 8;
    const by = groundY - scale * 38;
    ctx.save();
    ctx.globalAlpha = bubbleAlpha;
    ctx.fillStyle = wild.reacting === 'happy' ? '#C8F0A0' : '#F0C8A0';
    ctx.strokeStyle = wild.reacting === 'happy' ? '#4A8020' : '#8B5010';
    ctx.lineWidth = 2;
    const bw = 60, bh = 22;
    roundRect(ctx, bx - bw / 2, by - bh, bw, bh, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = wild.reacting === 'happy' ? '#2A5010' : '#5C2A00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, by - bh / 2);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // "Tap to feed" hint — only shown if not yet fed
  if (!wild.fed) {
    const hintAlpha = Math.min(1, age * 2) * (0.7 + 0.3 * Math.sin(now / 600));
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const hintW = 148, hintH = 20;
    const hintX = cx - hintW / 2 - scale * 4;
    const hintY = groundY - scale * 46;
    roundRect(ctx, hintX, hintY, hintW, hintH, 5);
    ctx.fill();
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

// ── Persistent firefly state (module-level, fine for cosmetic fx) ─────────────
const _fireflies = [];
function initFireflies(W, H, groundY) {
  for (let i = 0; i < 12; i++) {
    _fireflies.push({
      x: Math.random() * W,
      y: groundY + Math.random() * (H - groundY) * 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.5,
      dir: Math.random() * Math.PI * 2,
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
    ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
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
