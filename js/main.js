// main.js — Boot, game loop, state init, input handling.

import { STARTING_COINS, STARTING_SEEDS, PLOT_STATE, FLOWERS, FLOWER_LIST, HORSES, PERKS,
         STARTING_GARDENS, MAX_GARDENS_PER_PLOT, GARDEN_BUY_COSTS, PLOT_BUY_COSTS } from './data.js';
import { hydrateFarmPlot, createFarmPlot, plantSeed, waterPlot,
         harvestPlotWithPerks, tickGarden, gardenAtPoint } from './garden.js';
import { render, computeLayout, triggerPlotAnim } from './render.js';
import { initMarket, isMarketOpen } from './market.js';
import { saveGame, loadGame, needsMigration } from './save.js';
import { defaultHorsesState, hydrateHorses, tickHorses, feedHorse } from './horses.js';
import { defaultJournalState, hydrateJournal, initJournal, initStable, isJournalOpen, isStableOpen, addJournalEntry } from './journal.js';

// ── State ──────────────────────────────────────────────────────────────────────

function defaultState() {
  return {
    inventory: {
      coins: STARTING_COINS,
      seeds: { ...STARTING_SEEDS },
      flowers: {},
    },
    farm: {
      plots: [createFarmPlot(0, STARTING_GARDENS)],
      activePlot: 0,
      viewMode: 'plot',  // 'plot' | 'farm'
    },
    horses:  defaultHorsesState(),
    journal: defaultJournalState(),
    time: {
      elapsed: 0,
      lastTick: null,
    },
    selectedFlower: null,
    totalPlaytime: 0,
  };
}

function mergeState(saved) {
  const base = defaultState();
  base._showTutorial = !saved;

  if (!saved) return base;

  if (saved.inventory) {
    base.inventory.coins   = saved.inventory.coins   ?? base.inventory.coins;
    base.inventory.seeds   = saved.inventory.seeds   ?? base.inventory.seeds;
    base.inventory.flowers = saved.inventory.flowers ?? base.inventory.flowers;
  }

  // Phase 5 multi-plot structure
  if (saved.farm && Array.isArray(saved.farm.plots)) {
    base.farm.plots      = saved.farm.plots.map((p, i) => hydrateFarmPlot(p, i));
    base.farm.activePlot = saved.farm.activePlot ?? 0;
    base.farm.viewMode   = saved.farm.viewMode   ?? 'plot';
  } else if (needsMigration(saved)) {
    // Migrate from Phase 1-4: garden.plots was a flat gardens array
    // Wrap it in a single farm plot
    const migratedGardens = saved.garden.plots;
    const gc = migratedGardens.length;
    const migratedPlot = hydrateFarmPlot({ id: 0, gardenCount: gc, gardens: migratedGardens }, 0);
    base.farm.plots = [migratedPlot];
    base.farm.activePlot = 0;
    base.farm.viewMode = 'plot';
  }

  base.horses  = hydrateHorses(saved.horses);
  base.journal = hydrateJournal(saved.journal);

  if (saved.time) {
    base.time.elapsed = saved.time.elapsed ?? 0;
  }

  base.totalPlaytime = saved.totalPlaytime ?? 0;
  return base;
}

// ── Init ───────────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas');
const ctx    = canvas.getContext('2d');
let state    = mergeState(loadGame());
let layout   = null;

function activePlotData() {
  return state.farm.plots[state.farm.activePlot];
}

function activeGardens() {
  const p = activePlotData();
  return p ? p.gardens : [];
}

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const gc = activePlotData() ? activePlotData().gardenCount : STARTING_GARDENS;
  layout = computeLayout(canvas.width, canvas.height, gc);
  updateBuyGardenBtn();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

initMarket(state, () => updateFlowerSelector());
initJournal(state);
initStable(state);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Floating text feedback ─────────────────────────────────────────────────────

const floatingTexts = [];

function showFloatingText(gardenIndex, text, color) {
  if (!layout) return;
  const { originX, originY, plotW, plotH, gap, cols } = layout;
  const col = gardenIndex % cols;
  const row = Math.floor(gardenIndex / cols);
  const px = originX + col * (plotW + gap) + plotW / 2;
  const py = originY + row * (plotH + gap) + plotH / 2;
  const autoColor = text.startsWith('+') && text.includes('coins') ? '#FFD54F'
                  : text.includes('seed') ? '#A5D6A7'
                  : null;
  floatingTexts.push({ text, x: px, y: py, life: 1.0, color: color || autoColor || '#FFF8E1' });
}

function drawFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= dt * 1.2;
    if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
    const age = 1.0 - ft.life;
    ft.y -= (2.5 - age * 1.5);
    ctx.save();
    const scale = ft.life > 0.85 ? (1 + (1 - ft.life) * 2) : 1;
    ctx.globalAlpha  = Math.min(1, ft.life * 1.5);
    ctx.font         = `bold ${Math.round(14 * scale)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle  = 'rgba(0,0,0,0.65)';
    ctx.lineWidth    = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color || '#FFF8E1';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// ── Game Loop ──────────────────────────────────────────────────────────────────

function tick(now) {
  if (state.time.lastTick === null) state.time.lastTick = now;
  const dtMs = Math.min(now - state.time.lastTick, 2000);
  state.time.lastTick = now;

  const dt = dtMs / 1000;
  state.time.elapsed  += dt;
  state.totalPlaytime += dt;

  // Tick all plots' gardens (not just active — plants grow in background too)
  for (const plot of state.farm.plots) {
    tickGarden(plot.gardens, Date.now(), state.horses);
  }

  tickHorses(state.horses, state.time.elapsed, state.inventory);
  render(ctx, state, layout, now);
  drawFloatingTexts(dt);
  drawHorseFloatingTexts(dt);

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

// ── Input ──────────────────────────────────────────────────────────────────────

function handleTap(clientX, clientY) {
  if (isMarketOpen() || isJournalOpen() || isStableOpen()) return;

  if (state.horses.wild && !state.horses.wild.fed) {
    openFeedPicker();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width  / rect.width);
  const y = (clientY - rect.top)  * (canvas.height / rect.height);

  if (state.farm.viewMode === 'farm') {
    handleFarmViewTap(x, y);
    return;
  }

  const gardenIdx = gardenAtPoint(x, y, layout);
  if (gardenIdx === -1) return;

  const gardens = activeGardens();
  if (!gardens[gardenIdx]) return;
  handleGardenTap(gardens[gardenIdx]);
}

function handleFarmViewTap(x, y) {
  const plots = state.farm.plots;
  const totalTiles = plots.length + 1;

  const W = canvas.width;
  const H = canvas.height;
  const uiBarH = layout.uiBarH;
  const gardenTop = layout.gardenTop;

  const cols = Math.min(3, totalTiles);
  const rows = Math.ceil(totalTiles / cols);
  const pad = 16;
  const gap = 12;
  const areaTop = gardenTop + 8;
  const areaBottom = H - uiBarH - 8;
  const areaW = W - pad * 2;
  const areaH = areaBottom - areaTop;
  const tileW = Math.floor((areaW - gap * (cols - 1)) / cols);
  const tileH = Math.floor((areaH - gap * (rows - 1)) / rows);
  const totalGridW = cols * tileW + gap * (cols - 1);
  const startX = pad + Math.floor((areaW - totalGridW) / 2);

  for (let i = 0; i < totalTiles; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tx = startX + col * (tileW + gap);
    const ty = areaTop + row * (tileH + gap);

    if (x >= tx && x < tx + tileW && y >= ty && y < ty + tileH) {
      if (i < plots.length) {
        // Zoom into this plot
        state.farm.activePlot = i;
        zoomIn();
      } else {
        // Buy new plot
        tryBuyPlot();
      }
      return;
    }
  }
}

function handleGardenTap(garden) {
  const now = Date.now();
  const gardens = activeGardens();

  if (garden.state === PLOT_STATE.READY) {
    const harvestFlowerId = garden.flowerId;
    const harvestIndex = garden.index;
    triggerPlotAnim(harvestIndex, 'harvest', { flowerId: harvestFlowerId });
    const result = harvestPlotWithPerks(garden, gardens, state.horses);
    if (result) {
      const { flowerId, count, bonusCoins, freeSeed, autoPlowedIndices } = result;
      state.inventory.flowers[flowerId] = (state.inventory.flowers[flowerId] || 0) + count;
      if (freeSeed) {
        state.inventory.seeds[freeSeed] = (state.inventory.seeds[freeSeed] || 0) + 1;
        showFloatingText(garden.index, `+1 ${FLOWERS[freeSeed].name} seed!`);
      }
      if (bonusCoins > 0) {
        state.inventory.coins += bonusCoins;
        showFloatingText(garden.index, `+${bonusCoins} coins!`);
      }
      if (autoPlowedIndices.length > 0) {
        for (const idx of autoPlowedIndices) {
          showFloatingText(idx, 'Auto-plowed!');
        }
      }
      const harvestLabel = count > 1 ? `+${count} ${FLOWERS[flowerId].name}!` : `+1 ${FLOWERS[flowerId].name}`;
      saveGame(state);
      updateFlowerSelector();
      showFloatingText(garden.index, harvestLabel);
      state._showTutorial = false;
    }
    return;
  }

  if (garden.state === PLOT_STATE.WATERED) {
    showFloatingText(garden.index, 'Growing...');
    return;
  }

  if (garden.state === PLOT_STATE.PLANTED) {
    if (waterPlot(garden, now)) {
      saveGame(state);
      showFloatingText(garden.index, 'Watered!');
    }
    return;
  }

  // EMPTY — plant
  if (!state.selectedFlower) {
    const available = Object.keys(state.inventory.seeds).filter(id => state.inventory.seeds[id] > 0);
    if (available.length === 0) {
      showFloatingText(garden.index, 'Buy seeds!');
      return;
    }
    state.selectedFlower = available[0];
    updateFlowerSelector();
  }

  if (plantSeed(garden, state.selectedFlower, state, now)) {
    triggerPlotAnim(garden.index, 'plant');
    state._showTutorial = false;
    saveGame(state);
    updateFlowerSelector();
    showFloatingText(garden.index, 'Planted!');
    if (!(state.inventory.seeds[state.selectedFlower] > 0)) {
      state.selectedFlower = null;
      updateFlowerSelector();
    }
  } else {
    const available = Object.keys(state.inventory.seeds).filter(id => state.inventory.seeds[id] > 0);
    if (available.length === 0) {
      showFloatingText(garden.index, 'Buy seeds!');
    } else {
      state.selectedFlower = available[0];
      updateFlowerSelector();
    }
  }
}

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  handleTap(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('click', (e) => {
  handleTap(e.clientX, e.clientY);
});

// ── Zoom mechanic ─────────────────────────────────────────────────────────────

function zoomOut() {
  state.farm.viewMode = 'farm';
  // Hide flower selector in farm view
  const sel = document.getElementById('flower-selector');
  if (sel) sel.style.display = 'none';
  const buyBtn = document.getElementById('buy-garden-btn');
  if (buyBtn) buyBtn.style.display = 'none';
  // Swap zoom button icon
  const zoomBtn = document.getElementById('zoom-btn');
  if (zoomBtn) zoomBtn.textContent = 'Plot';
  saveGame(state);
}

function zoomIn() {
  state.farm.viewMode = 'plot';
  const sel = document.getElementById('flower-selector');
  if (sel) sel.style.display = '';
  // Recompute layout for the new active plot's garden count
  const gc = activePlotData() ? activePlotData().gardenCount : STARTING_GARDENS;
  layout = computeLayout(canvas.width, canvas.height, gc);
  updateBuyGardenBtn();
  const zoomBtn = document.getElementById('zoom-btn');
  if (zoomBtn) zoomBtn.textContent = 'Farm';
  updatePlotLabel();
  saveGame(state);
}

function updatePlotLabel() {
  const label = document.getElementById('plot-label');
  if (label) {
    const idx = state.farm.activePlot;
    label.textContent = state.farm.plots.length > 1 ? `Plot ${idx + 1}` : '';
  }
}

document.getElementById('zoom-btn').addEventListener('click', () => {
  if (state.farm.viewMode === 'plot') {
    zoomOut();
  } else {
    zoomIn();
  }
});

// Initialize zoom state on load
if (state.farm.viewMode === 'farm') {
  zoomOut();
} else {
  zoomIn();
}

// ── Buy Garden button ─────────────────────────────────────────────────────────

function updateBuyGardenBtn() {
  const btn = document.getElementById('buy-garden-btn');
  if (!btn) return;
  if (state.farm.viewMode !== 'plot') {
    btn.style.display = 'none';
    return;
  }
  const plot = activePlotData();
  if (!plot) { btn.style.display = 'none'; return; }

  const gc = plot.gardenCount;
  if (gc >= MAX_GARDENS_PER_PLOT) {
    btn.style.display = 'none';
    return;
  }

  const costIdx = Math.floor(gc / 5) - 1;
  const cost = GARDEN_BUY_COSTS[Math.min(costIdx, GARDEN_BUY_COSTS.length - 1)];
  btn.style.display = '';
  btn.textContent = `+Garden ${cost}c`;
  btn.disabled = state.inventory.coins < cost;
}

document.getElementById('buy-garden-btn').addEventListener('click', () => {
  const plot = activePlotData();
  if (!plot) return;

  const gc = plot.gardenCount;
  if (gc >= MAX_GARDENS_PER_PLOT) return;

  const costIdx = Math.floor(gc / 5) - 1;
  const cost = GARDEN_BUY_COSTS[Math.min(costIdx, GARDEN_BUY_COSTS.length - 1)];
  if (state.inventory.coins < cost) return;

  state.inventory.coins -= cost;

  // Add 5 more gardens
  const newCount = gc + 5;
  plot.gardenCount = newCount;
  // Append new garden slots
  for (let i = gc; i < newCount; i++) {
    plot.gardens.push({ index: i, state: PLOT_STATE.EMPTY, flowerId: null,
      plantedAt: 0, growTime: 0, waterTime: 0, stage: 0, autoPlow: 0 });
  }

  // Recompute layout for new garden count
  layout = computeLayout(canvas.width, canvas.height, newCount);
  updateBuyGardenBtn();
  saveGame(state);
});

function tryBuyPlot() {
  const plotCount = state.farm.plots.length;
  const cost = PLOT_BUY_COSTS[Math.min(plotCount - 1, PLOT_BUY_COSTS.length - 1)];
  if (state.inventory.coins < cost) {
    // Flash a message — use center of screen
    floatingTexts.push({
      text: `Need ${cost}c`,
      x: canvas.width / 2,
      y: canvas.height / 2,
      life: 1.0,
      color: '#FFAB91',
    });
    return;
  }

  state.inventory.coins -= cost;
  const newPlot = createFarmPlot(plotCount, STARTING_GARDENS);
  state.farm.plots.push(newPlot);
  saveGame(state);
}

// ── Flower selector (HTML overlay) ────────────────────────────────────────────

function updateFlowerSelector() {
  const bar = document.getElementById('flower-selector');
  if (!bar) return;

  bar.innerHTML = '';
  let hasSeeds = false;

  for (const flower of FLOWER_LIST) {
    const qty = state.inventory.seeds[flower.id] || 0;
    if (qty === 0) continue;
    hasSeeds = true;

    const btn = document.createElement('button');
    btn.className = 'seed-btn' + (state.selectedFlower === flower.id ? ' active' : '');
    btn.innerHTML = `<span class="seed-dot" style="background:${flower.colors.bloom}"></span>${flower.name} ×${qty}`;
    btn.addEventListener('click', () => {
      state.selectedFlower = state.selectedFlower === flower.id ? null : flower.id;
      updateFlowerSelector();
    });
    bar.appendChild(btn);
  }

  if (state.selectedFlower && !(state.inventory.seeds[state.selectedFlower] > 0)) {
    state.selectedFlower = null;
  }
  updateBuyGardenBtn();
}

updateFlowerSelector();
updatePlotLabel();

// ── Feed picker (HTML overlay) ─────────────────────────────────────────────────

function openFeedPicker() {
  const overlay = document.getElementById('feed-overlay');
  if (!overlay) return;

  const wild = state.horses.wild;
  const isTamedVisitor = wild && state.horses.tamed.some(t => t.horseId === wild.horseId);

  const hint = document.querySelector('#feed-panel .feed-hint');
  if (hint && wild) {
    const horse = HORSES[wild.horseId];
    if (isTamedVisitor && horse) {
      const lvl = state.horses.perkLevels[wild.horseId] || 1;
      const perkDef = PERKS[wild.horseId];
      const favFlower = FLOWERS[horse.favoriteFlower];
      hint.textContent = perkDef
        ? `Feed ${favFlower ? favFlower.name : '?'} to level up ${perkDef.name} (Lv.${lvl})`
        : `${horse.name} is visiting — feed its favorite to level up!`;
    } else {
      hint.textContent = 'Which flower will you offer?';
    }
  }

  const flowers = FLOWER_LIST.filter(f => (state.inventory.flowers[f.id] || 0) > 0);
  const list = document.getElementById('feed-flower-list');
  list.innerHTML = '';

  if (flowers.length === 0) {
    list.innerHTML = '<p class="feed-empty">No flowers in inventory. Harvest some first!</p>';
  } else {
    for (const flower of flowers) {
      const qty = state.inventory.flowers[flower.id];
      const btn = document.createElement('button');
      btn.className = 'feed-btn';
      btn.innerHTML =
        `<span class="seed-dot" style="background:${flower.colors.bloom}"></span>` +
        `${flower.name} <span class="feed-qty">×${qty}</span>`;
      btn.addEventListener('click', () => {
        closeFeedPicker();
        doFeedHorse(flower.id);
      });
      list.appendChild(btn);
    }
  }

  overlay.classList.remove('hidden');
}

function closeFeedPicker() {
  document.getElementById('feed-overlay').classList.add('hidden');
}

document.getElementById('feed-close').addEventListener('click', closeFeedPicker);
document.getElementById('feed-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('feed-overlay')) closeFeedPicker();
});

function doFeedHorse(flowerId) {
  if (!state.inventory.flowers[flowerId] || state.inventory.flowers[flowerId] < 1) return;

  const horseId = state.horses.wild ? state.horses.wild.horseId : null;

  state.inventory.flowers[flowerId] -= 1;
  if (state.inventory.flowers[flowerId] <= 0) delete state.inventory.flowers[flowerId];

  const result = feedHorse(state.horses, flowerId, state.time.elapsed);
  if (!result) return;

  if (horseId) {
    addJournalEntry(state.journal, horseId, flowerId, result.success);
  }

  saveGame(state);

  if (result.tamed) {
    showHorseFloating(`${result.horseName} is tamed!`, true);
  } else if (result.leveledUp) {
    showHorseFloating(`${result.perkName} Lv.${result.newLevel}!`, true);
  } else if (result.success) {
    showHorseFloating(`${result.horseName} liked it!`, true);
  } else {
    showHorseFloating(`${result.horseName} wanders off...`, false);
  }
}

// ── Horse floating text ────────────────────────────────────────────────────────

const horseFloatingTexts = [];

function showHorseFloating(text, positive) {
  if (!layout) return;
  horseFloatingTexts.push({
    text,
    x: canvas.width * 0.72,
    y: layout.gardenTop - 10,
    life: 1.0,
    positive,
  });
}

function drawHorseFloatingTexts(dt) {
  for (let i = horseFloatingTexts.length - 1; i >= 0; i--) {
    const ft = horseFloatingTexts[i];
    ft.life -= dt * 0.55;
    if (ft.life <= 0) { horseFloatingTexts.splice(i, 1); continue; }
    ft.y -= 0.7 + (1 - ft.life) * 0.3;
    ctx.save();
    const scale = ft.life > 0.88 ? (1 + (1 - ft.life) * 1.5) : 1;
    ctx.globalAlpha  = Math.min(1, ft.life * 1.4);
    ctx.font         = `bold ${Math.round(15 * scale)}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle  = 'rgba(0,0,0,0.7)';
    ctx.lineWidth    = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle    = ft.positive ? '#C8F0A0' : '#F0D090';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}
