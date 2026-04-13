// main.js — Boot, game loop, state init, input handling.

import { STARTING_COINS, STARTING_SEEDS, PLOT_COUNT, PLOT_STATE, FLOWERS, FLOWER_LIST, HORSES, PERKS } from './data.js';
import { createPlots, hydrateGarden, plantSeed, waterPlot, harvestPlotWithPerks, tickGarden, plotAtPoint } from './garden.js';
import { render, computeLayout } from './render.js';
import { initMarket, isMarketOpen } from './market.js';
import { saveGame, loadGame } from './save.js';
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
    garden: {
      plots: createPlots(),
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
  if (!saved) return base;

  if (saved.inventory) {
    base.inventory.coins   = saved.inventory.coins   ?? base.inventory.coins;
    base.inventory.seeds   = saved.inventory.seeds   ?? base.inventory.seeds;
    base.inventory.flowers = saved.inventory.flowers ?? base.inventory.flowers;
  }

  if (saved.garden && saved.garden.plots) {
    base.garden.plots = hydrateGarden(saved.garden.plots, PLOT_COUNT);
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

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  layout = computeLayout(canvas.width, canvas.height);
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

function showFloatingText(plotIndex, text) {
  if (!layout) return;
  const { originX, originY, plotW, plotH, gap } = layout;
  const col = plotIndex % 4;
  const row = Math.floor(plotIndex / 4);
  const px = originX + col * (plotW + gap) + plotW / 2;
  const py = originY + row * (plotH + gap) + plotH / 2;
  floatingTexts.push({ text, x: px, y: py, life: 1.0 });
}

function drawFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y    -= 1.2;
    ft.life -= dt * 1.4;
    if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha  = Math.max(0, ft.life);
    ctx.font         = 'bold 14px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle  = 'rgba(0,0,0,0.65)';
    ctx.lineWidth    = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = '#FFF8E1';
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

  tickGarden(state.garden.plots, now, state.horses);
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

  // If a wild horse is visiting and not yet fed, any tap opens the feed picker
  if (state.horses.wild && !state.horses.wild.fed) {
    openFeedPicker();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width  / rect.width);
  const y = (clientY - rect.top)  * (canvas.height / rect.height);

  const plotIdx = plotAtPoint(x, y, layout);
  if (plotIdx === -1) return;

  handlePlotTap(state.garden.plots[plotIdx]);
}

function handlePlotTap(plot) {
  const now = Date.now();

  if (plot.state === PLOT_STATE.READY) {
    const result = harvestPlotWithPerks(plot, state.garden.plots, state.horses);
    if (result) {
      const { flowerId, count, bonusCoins, freeSeed, autoPlowedIndices } = result;
      state.inventory.flowers[flowerId] = (state.inventory.flowers[flowerId] || 0) + count;
      if (freeSeed) {
        state.inventory.seeds[freeSeed] = (state.inventory.seeds[freeSeed] || 0) + 1;
        showFloatingText(plot.index, `+1 ${FLOWERS[freeSeed].name} seed!`);
      }
      if (bonusCoins > 0) {
        state.inventory.coins += bonusCoins;
        showFloatingText(plot.index, `+${bonusCoins} coins!`);
      }
      if (autoPlowedIndices.length > 0) {
        for (const idx of autoPlowedIndices) {
          showFloatingText(idx, 'Auto-plowed!');
        }
      }
      const harvestLabel = count > 1 ? `+${count} ${FLOWERS[flowerId].name}!` : `+1 ${FLOWERS[flowerId].name}`;
      saveGame(state);
      updateFlowerSelector();
      showFloatingText(plot.index, harvestLabel);
    }
    return;
  }

  if (plot.state === PLOT_STATE.WATERED) {
    showFloatingText(plot.index, 'Growing...');
    return;
  }

  if (plot.state === PLOT_STATE.PLANTED) {
    if (waterPlot(plot, now)) {
      saveGame(state);
      showFloatingText(plot.index, 'Watered!');
    }
    return;
  }

  // EMPTY — plant
  if (!state.selectedFlower) {
    const available = Object.keys(state.inventory.seeds).filter(id => state.inventory.seeds[id] > 0);
    if (available.length === 0) {
      showFloatingText(plot.index, 'Buy seeds!');
      return;
    }
    state.selectedFlower = available[0];
    updateFlowerSelector();
  }

  if (plantSeed(plot, state.selectedFlower, state, now)) {
    saveGame(state);
    updateFlowerSelector();
    showFloatingText(plot.index, 'Planted!');
    if (!(state.inventory.seeds[state.selectedFlower] > 0)) {
      state.selectedFlower = null;
      updateFlowerSelector();
    }
  } else {
    // Out of selected seed — switch
    const available = Object.keys(state.inventory.seeds).filter(id => state.inventory.seeds[id] > 0);
    if (available.length === 0) {
      showFloatingText(plot.index, 'Buy seeds!');
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

  // Deselect if seed gone
  if (state.selectedFlower && !(state.inventory.seeds[state.selectedFlower] > 0)) {
    state.selectedFlower = null;
  }
}

updateFlowerSelector();

// ── Feed picker (HTML overlay) ─────────────────────────────────────────────────
// Appears when a horse is visiting. If already tamed, feeding its fav flower levels up its perk.

function openFeedPicker() {
  const overlay = document.getElementById('feed-overlay');
  if (!overlay) return;

  const wild = state.horses.wild;
  const isTamedVisitor = wild && state.horses.tamed.some(t => t.horseId === wild.horseId);

  // Update the feed panel hint
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

  // Capture horseId before feeding mutates the wild state
  const horseId = state.horses.wild ? state.horses.wild.horseId : null;

  // Consume one flower from inventory
  state.inventory.flowers[flowerId] -= 1;
  if (state.inventory.flowers[flowerId] <= 0) delete state.inventory.flowers[flowerId];

  const result = feedHorse(state.horses, flowerId, state.time.elapsed);
  if (!result) return;

  // Record journal entry
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
    ft.y    -= 0.9;
    ft.life -= dt * 0.6;
    if (ft.life <= 0) { horseFloatingTexts.splice(i, 1); continue; }
    ctx.save();
    ctx.globalAlpha  = Math.max(0, ft.life);
    ctx.font         = 'bold 15px monospace';
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
