// stable.js — Canvas-drawn full-screen stable overlay.
// Horizontal scroll through 8 horse stalls. Shows horse info, perk, and assignment.

import { HORSES, HORSE_LIST, FLOWERS, PERKS } from './data.js';
import { drawHorse } from './render.js';
import { isTamed, getPerkLevel, assignHorse, getAssignedHorses, getHorseAssignedPlot, plotHorseCapacity } from './horses.js';
import { saveGame } from './save.js';

// ── Module state ──────────────────────────────────────────────────────────────

let _canvas = null;
let _ctx    = null;
let _state  = null;
let _open   = false;
let _onSave = null;

// Current scroll position (in stall units, 0 = first stall)
let _stallOffset    = 0;    // fractional stall index (for smooth scroll)
let _stallOffsetTarget = 0; // target stall (integer)

// Touch tracking for swipe
let _touchStartX  = null;
let _touchStartOff = null;

// Which mode: 'stalls' | 'assign'
let _mode         = 'stalls';
let _assignHorseId = null;   // horse being assigned

// Button hit-areas (rebuilt each draw)
const _buttons = [];

// ── Public API ────────────────────────────────────────────────────────────────

export function initStable(canvas, state, onSave) {
  _canvas = canvas;
  _state  = state;
  _onSave = onSave;

  document.getElementById('stable-btn').addEventListener('click', openStable);

  // Touch events on canvas for swipe
  canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  _onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   _onTouchEnd,   { passive: false });
  canvas.addEventListener('click',      _onCanvasClick);
}

export function isStableOpen() { return _open; }

export function openStable() {
  _open  = true;
  _mode  = 'stalls';
  _assignHorseId = null;
  _stallOffsetTarget = 0;
  _stallOffset = 0;
}

export function closeStable() {
  _open = false;
  _mode = 'stalls';
  _assignHorseId = null;
}

// Called from main render loop when stable is open
export function renderStable(ctx, state, now) {
  _ctx   = ctx;
  _state = state;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Smooth scroll lerp
  _stallOffset += (_stallOffsetTarget - _stallOffset) * 0.18;

  // Clear button list
  _buttons.length = 0;

  if (_mode === 'assign') {
    _drawAssignView(ctx, W, H, now);
  } else {
    _drawStallsView(ctx, W, H, now);
  }
}

// ── Stalls View ───────────────────────────────────────────────────────────────

function _drawStallsView(ctx, W, H, now) {
  const horses = _state.horses;

  // Full-screen warm wooden stable background
  _drawBackground(ctx, W, H, now);

  // Title bar
  _drawTitleBar(ctx, W, H, 'Stable');

  // Close button
  _addButton(W - 80, 10, 70, 38, 'Close', closeStable, '#5D4037', '#FFD54F');

  // Navigation arrows
  const stallCount = HORSE_LIST.length; // 8
  const arrowY = H / 2;
  if (_stallOffsetTarget > 0) {
    _addButton(8, arrowY - 20, 36, 40, '<', () => { _stallOffsetTarget = Math.max(0, _stallOffsetTarget - 1); }, '#6D4C41', '#FFF8E1');
  }
  if (_stallOffsetTarget < stallCount - 1) {
    _addButton(W - 44, arrowY - 20, 36, 40, '>', () => { _stallOffsetTarget = Math.min(stallCount - 1, _stallOffsetTarget + 1); }, '#6D4C41', '#FFF8E1');
  }

  // Stall indicator dots
  _drawStallDots(ctx, W, H, stallCount);

  // Draw the current stall
  const stallW = Math.min(W - 100, 320);
  const stallX = W / 2 - stallW / 2;
  const stallY = 60;
  const stallH = H - stallY - 50;

  // Slide animation: offset is in stall-widths
  const slideX = (_stallOffsetTarget - _stallOffset) * (stallW + 20);

  for (let i = 0; i < stallCount; i++) {
    const relIdx = i - _stallOffsetTarget;
    const sx = stallX + relIdx * (stallW + 20) + slideX;
    // Only draw stalls that are visible
    if (sx + stallW < 0 || sx > W) continue;
    // Only add interactive buttons for the centered stall
    const isCentered = i === _stallOffsetTarget;
    _drawStall(ctx, i, sx, stallY, stallW, stallH, now, isCentered);
  }

  // Draw buttons on top
  _renderButtons(ctx);
}

function _drawBackground(ctx, W, H, now) {
  // Dark warm wood background
  ctx.fillStyle = '#2A1A0E';
  ctx.fillRect(0, 0, W, H);

  // Warm amber overlay gradient (simulates hay/lantern glow)
  const grad = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, H * 0.8);
  grad.addColorStop(0, 'rgba(180,100,30,0.25)');
  grad.addColorStop(0.6, 'rgba(120,60,10,0.15)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Wooden plank texture (horizontal lines)
  ctx.fillStyle = 'rgba(255,200,100,0.04)';
  for (let y = 0; y < H; y += 18) {
    ctx.fillRect(0, y, W, 8);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 8; y < H; y += 18) {
    ctx.fillRect(0, y, W, 2);
  }

  // Lantern glow top-center
  const t = now / 1000;
  const flicker = 0.85 + 0.15 * Math.sin(t * 7.3);
  const lanternGrad = ctx.createRadialGradient(W / 2, 30, 5, W / 2, 30, 120);
  lanternGrad.addColorStop(0, `rgba(255,200,80,${0.28 * flicker})`);
  lanternGrad.addColorStop(1, 'rgba(255,150,30,0)');
  ctx.fillStyle = lanternGrad;
  ctx.fillRect(W / 2 - 120, 0, 240, 160);

  // Hay piles in bottom corners
  _drawHayPile(ctx, 16, H - 50, 60, 28, now);
  _drawHayPile(ctx, W - 76, H - 50, 60, 28, now);
}

function _drawHayPile(ctx, x, y, w, h, now) {
  // Simple hay pile: golden/yellow straw
  ctx.fillStyle = '#C8960A';
  ctx.fillRect(x, y + 8, w, h - 8);
  ctx.fillStyle = '#E0B020';
  ctx.fillRect(x + 4, y + 4, w - 8, 12);
  ctx.fillStyle = '#F0C830';
  ctx.fillRect(x + 8, y, w - 16, 10);
  // Straw strands
  ctx.fillStyle = '#D4A010';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 6 + i * 8, y + 2, 2, h - 4);
  }
}

function _drawTitleBar(ctx, W, H, title) {
  // Top bar with wood grain
  ctx.fillStyle = '#3A2010';
  ctx.fillRect(0, 0, W, 54);
  ctx.fillStyle = 'rgba(255,200,80,0.08)';
  ctx.fillRect(0, 0, W, 4);

  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, W / 2, 27);
  ctx.textAlign = 'left';
}

function _drawStallDots(ctx, W, H, count) {
  const dotY = H - 20;
  const dotSpacing = 14;
  const totalW = (count - 1) * dotSpacing;
  const startX = W / 2 - totalW / 2;

  for (let i = 0; i < count; i++) {
    ctx.fillStyle = i === _stallOffsetTarget ? '#FFD54F' : 'rgba(200,160,80,0.3)';
    const dx = startX + i * dotSpacing;
    ctx.fillRect(Math.round(dx) - 3, dotY - 3, 6, 6);
  }
}

function _drawStall(ctx, horseIdx, x, y, w, h, now, interactive) {
  const horse = HORSE_LIST[horseIdx];
  if (!horse) return;

  const horses = _state.horses;
  const tamed = isTamed(horses, horse.id);

  // Stall background — wooden pen
  ctx.fillStyle = '#4A2A10';
  ctx.fillRect(x, y, w, h);

  // Stall border (wood posts)
  ctx.fillStyle = '#6A3A18';
  ctx.fillRect(x,         y, 6, h);
  ctx.fillRect(x + w - 6, y, 6, h);
  ctx.fillRect(x,         y, w, 6);
  ctx.fillRect(x,         y + h - 6, w, 6);

  // Rail highlight
  ctx.fillStyle = '#8A5A28';
  ctx.fillRect(x + 1, y + 1, w - 2, 2);

  // Hay on floor
  ctx.fillStyle = '#8A6A20';
  for (let hx = x + 12; hx < x + w - 10; hx += 8) {
    ctx.fillRect(hx, y + h - 20, 4, 12);
    ctx.fillRect(hx + 2, y + h - 24, 2, 6);
  }
  ctx.fillStyle = '#A07820';
  ctx.fillRect(x + 6, y + h - 16, w - 12, 10);

  if (tamed) {
    _drawTamedStall(ctx, horse, horses, x, y, w, h, now, interactive);
  } else {
    _drawEmptyStall(ctx, horse, x, y, w, h, now);
  }
}

function _drawEmptyStall(ctx, horse, x, y, w, h, now) {
  // Mystery silhouette — dark grey horse shape
  const cx = x + w / 2;
  const groundY = y + h - 28;
  const scale = Math.min(2.2, w / 60);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#404040';
  // Draw a simple blocky horse silhouette
  ctx.fillRect(cx - scale * 10, groundY - scale * 20, scale * 20, scale * 12); // body
  ctx.fillRect(cx + scale * 5,  groundY - scale * 28, scale * 6,  scale * 10); // neck+head
  ctx.fillRect(cx - scale * 8,  groundY - scale * 8,  scale * 3,  scale * 8);  // back legs
  ctx.fillRect(cx + scale * 2,  groundY - scale * 8,  scale * 3,  scale * 8);  // front legs
  ctx.restore();

  // "???" text
  ctx.fillStyle = '#8D6E63';
  ctx.font = `bold ${Math.floor(w * 0.12)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('???', cx, y + h * 0.38);

  // Horse name hint (blurred/hidden)
  ctx.fillStyle = 'rgba(141,110,99,0.4)';
  ctx.font = `${Math.floor(w * 0.07)}px monospace`;
  ctx.fillText('Undiscovered', cx, y + h * 0.52);
  ctx.textAlign = 'left';
}

function _drawTamedStall(ctx, horse, horses, x, y, w, h, now, interactive) {
  const cx = x + w / 2;
  const groundY = y + h - 28;
  const scale = Math.min(2.2, w / 60);
  const anim = now / 1000;

  // Draw the horse using shared render function
  const facing = Math.sin(now / 3000 + horse.id.charCodeAt(0)) > 0 ? 'right' : 'left';
  ctx.save();
  drawHorse(ctx, horse.id, horse.colors, cx, groundY, scale, facing, anim);
  if (horse.id === 'starlightUnicorn') {
    _drawUnicornHornLocal(ctx, horse.colors, cx, groundY, scale, facing, anim);
  }
  ctx.restore();

  // Horse name
  ctx.fillStyle = '#FFD54F';
  ctx.font = `bold ${Math.min(15, Math.floor(w * 0.065))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(horse.name, cx, y + 10);

  // Perk info
  const perkDef = PERKS[horse.id];
  const perkLevel = getPerkLevel(horses, horse.id);
  if (perkDef) {
    const perkY = y + 30;
    ctx.fillStyle = '#C8A050';
    ctx.font = `bold ${Math.min(12, Math.floor(w * 0.055))}px monospace`;
    ctx.fillText(`${perkDef.name}  Lv.${perkLevel}`, cx, perkY);

    ctx.fillStyle = '#A5D6A7';
    ctx.font = `${Math.min(10, Math.floor(w * 0.048))}px monospace`;
    const descLines = _wrapText(perkDef.description(perkLevel), w - 24, `${Math.min(10, Math.floor(w * 0.048))}px monospace`);
    for (let i = 0; i < descLines.length; i++) {
      ctx.fillText(descLines[i], cx, perkY + 16 + i * 13);
    }
  }

  // Assignment info
  const assignedPlot = getHorseAssignedPlot(horses, horse.id);
  const assignY = y + h - 68;

  if (assignedPlot !== null) {
    ctx.fillStyle = '#A5D6A7';
    ctx.font = `${Math.min(11, Math.floor(w * 0.05))}px monospace`;
    ctx.fillText(`On Plot ${assignedPlot + 1}`, cx, assignY);

    if (interactive) {
      // Unassign button
      _addButton(x + w / 2 - 44, assignY + 14, 88, 30, 'Unassign', () => {
        assignHorse(_state.horses, horse.id, null);
        saveGame(_state);
      }, '#6D3A2A', '#FFAB91');
    }
  } else {
    if (interactive) {
      // Assign button
      _addButton(x + w / 2 - 44, assignY + 6, 88, 30, 'Assign', () => {
        _assignHorseId = horse.id;
        _mode = 'assign';
      }, '#2A5010', '#A5D6A7');
    }
  }

  ctx.textAlign = 'left';
}

// Minimal unicorn horn for stall use (mirrors render.js version)
function _drawUnicornHornLocal(ctx, colors, cx, groundY, scale, facing, anim) {
  const s = scale;
  const fl = facing === 'left' ? -1 : 1;
  const bodyBob = Math.sin(anim * 4) * s * 0.3;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(groundY));
  ctx.scale(fl, 1);
  ctx.fillStyle = '#E8D8FF';
  ctx.fillRect(s * 9,  -s * 36 + bodyBob, s * 2, s * 5);
  ctx.fillRect(s * 10, -s * 38 + bodyBob, s * 1, s * 3);
  ctx.fillRect(s * 10, -s * 40 + bodyBob, s * 1, s * 2);
  ctx.fillStyle = '#B090E8';
  ctx.fillRect(s * 9, -s * 37 + bodyBob, s * 1, s * 1);
  ctx.fillRect(s * 10, -s * 39 + bodyBob, s * 1, s * 1);
  ctx.restore();
}

// ── Assign View ───────────────────────────────────────────────────────────────

function _drawAssignView(ctx, W, H, now) {
  const horses = _state.horses;
  const horse = HORSES[_assignHorseId];
  if (!horse) { _mode = 'stalls'; return; }

  _drawBackground(ctx, W, H, now);
  _drawTitleBar(ctx, W, H, `Assign ${horse.name}`);

  _addButton(W - 80, 10, 70, 38, 'Back', () => { _mode = 'stalls'; }, '#5D4037', '#FFD54F');

  const plots = _state.farm.plots;

  ctx.fillStyle = '#BCAAA4';
  ctx.font = '13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Choose a plot to assign this horse to:', W / 2, 64);

  const tileW = Math.min(200, (W - 48) / Math.min(3, plots.length));
  const tileH = 90;
  const gap   = 10;
  const cols  = Math.min(3, plots.length);
  const totalW = cols * tileW + (cols - 1) * gap;
  const startX = Math.round((W - totalW) / 2);
  const startY = 92;

  for (let i = 0; i < plots.length; i++) {
    const plot = plots[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = startX + col * (tileW + gap);
    const ty = startY + row * (tileH + gap);

    const capacity = plotHorseCapacity(plot.gardenCount);
    const currentAssigned = getAssignedHorses(horses, i);
    const isFull = currentAssigned.length >= capacity;
    const isCurrentPlot = getHorseAssignedPlot(horses, _assignHorseId) === i;

    const bg = isCurrentPlot ? '#2A5010' : (isFull ? '#2A1A1A' : '#3A2010');
    const border = isCurrentPlot ? '#A5D6A7' : (isFull ? '#5A3A2A' : '#8D6E63');

    ctx.fillStyle = bg;
    ctx.fillRect(tx, ty, tileW, tileH);
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tileW, tileH);

    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Plot ${i + 1}`, tx + tileW / 2, ty + 8);

    ctx.fillStyle = '#BCAAA4';
    ctx.font = '11px monospace';
    ctx.fillText(`${plot.gardenCount} gardens`, tx + tileW / 2, ty + 26);
    ctx.fillText(`${currentAssigned.length}/${capacity} horses`, tx + tileW / 2, ty + 40);

    if (isCurrentPlot) {
      ctx.fillStyle = '#A5D6A7';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('Assigned here', tx + tileW / 2, ty + 55);
    } else if (!isFull) {
      _addButton(tx + tileW / 2 - 36, ty + tileH - 30, 72, 24, 'Assign Here', () => {
        // Remove from previous plot if any
        assignHorse(_state.horses, _assignHorseId, i);
        saveGame(_state);
        _mode = 'stalls';
      }, '#2A5A10', '#A5D6A7');
    } else {
      ctx.fillStyle = '#8D6E63';
      ctx.font = '10px monospace';
      ctx.fillText('Plot full', tx + tileW / 2, ty + 58);
    }
  }

  ctx.textAlign = 'left';
  _renderButtons(ctx);
}

// ── Button system ─────────────────────────────────────────────────────────────

function _addButton(x, y, w, h, label, onClick, bg, fg) {
  _buttons.push({ x, y, w, h, label, onClick, bg: bg || '#6D4C41', fg: fg || '#FFF8E1' });
}

function _renderButtons(ctx) {
  for (const btn of _buttons) {
    ctx.fillStyle = btn.bg;
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = btn.fg;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
    ctx.fillStyle = btn.fg;
    ctx.font = `bold ${Math.min(12, Math.floor(btn.h * 0.45))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.textAlign = 'left';
  }
}

function _hitButton(x, y) {
  for (const btn of _buttons) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.onClick();
      return true;
    }
  }
  return false;
}

// ── Touch / click handling ─────────────────────────────────────────────────────

function _canvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] || e.changedTouches[0] : e;
  return {
    x: (touch.clientX - rect.left) * (canvas.width  / rect.width),
    y: (touch.clientY - rect.top)  * (canvas.height / rect.height),
  };
}

function _onTouchStart(e) {
  if (!_open) return;
  e.preventDefault();
  const { x, y } = _canvasCoords(e, _canvas);
  _touchStartX   = x;
  _touchStartOff = _stallOffsetTarget;
}

function _onTouchMove(e) {
  if (!_open || _touchStartX === null || _mode !== 'stalls') return;
  e.preventDefault();
  const { x } = _canvasCoords(e, _canvas);
  const dx = x - _touchStartX;
  const W  = _canvas.width;
  const stallW = Math.min(W - 100, 320);
  // Drag changes target fractionally; snapping happens on touchend
  const delta = -dx / (stallW + 20);
  const newTarget = Math.round(Math.max(0, Math.min(HORSE_LIST.length - 1, _touchStartOff + delta)));
  _stallOffsetTarget = newTarget;
}

function _onTouchEnd(e) {
  if (!_open) return;
  e.preventDefault();
  if (_touchStartX !== null) {
    const { x, y } = _canvasCoords(e, _canvas);
    const dx = Math.abs(x - _touchStartX);
    // If it was a tap (small horizontal movement), treat as click
    if (dx < 12) {
      _hitButton(x, y);
    }
    _touchStartX = null;
  }
}

function _onCanvasClick(e) {
  if (!_open) return;
  const { x, y } = _canvasCoords(e, _canvas);
  _hitButton(x, y);
}

// ── Text wrapping utility ─────────────────────────────────────────────────────

function _wrapText(text, maxWidth, font) {
  // Approximate character width for monospace
  const approxCharW = parseInt(font) * 0.62;
  const maxChars = Math.floor(maxWidth / approxCharW);
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
