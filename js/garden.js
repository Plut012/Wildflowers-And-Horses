// garden.js — Garden (plot slot) logic: planting, watering, harvesting.
// In Phase 5, a "plot" is a land parcel containing an array of gardens.
// Each garden is the old "plot" object (plant state, flower, growth, etc.).

import { FLOWERS, PLOT_STATE, GRID_COLS, PERKS, STARTING_GARDENS } from './data.js';
import { isTamed, getPerkLevel } from './horses.js';

// ── Garden (individual flower slot) ──────────────────────────────────────────

function makeGarden(index) {
  return {
    index,
    state: PLOT_STATE.EMPTY,
    flowerId: null,
    plantedAt: 0,
    growTime: 0,
    waterTime: 0,
    stage: 0,
    autoPlow: 0,
  };
}

// Build a fresh set of gardens for a new plot
export function createGardens(count) {
  const gardens = [];
  for (let i = 0; i < count; i++) {
    gardens.push(makeGarden(i));
  }
  return gardens;
}

// Rebuild gardens from saved data, filling any gaps up to count
export function hydrateGardens(saved, count) {
  const gardens = [];
  for (let i = 0; i < count; i++) {
    if (saved && saved[i]) {
      gardens.push({ ...makeGarden(i), ...saved[i] });
    } else {
      gardens.push(makeGarden(i));
    }
  }
  return gardens;
}

// ── Farm-level plot (land parcel) ─────────────────────────────────────────────

export function createFarmPlot(id, gardenCount) {
  return {
    id,
    gardenCount: gardenCount || STARTING_GARDENS,
    gardens: createGardens(gardenCount || STARTING_GARDENS),
  };
}

// Rebuild a farm plot from saved data
export function hydrateFarmPlot(saved, id) {
  const gc = saved.gardenCount || STARTING_GARDENS;
  return {
    id: saved.id ?? id,
    gardenCount: gc,
    gardens: hydrateGardens(saved.gardens, gc),
  };
}

// ── Planting / watering / harvesting ─────────────────────────────────────────

export function plantSeed(garden, flowerId, state, now) {
  if (garden.state !== PLOT_STATE.EMPTY) return false;
  const seeds = state.inventory.seeds;
  if (!seeds[flowerId] || seeds[flowerId] < 1) return false;

  const flower = FLOWERS[flowerId];
  seeds[flowerId] -= 1;
  if (seeds[flowerId] <= 0) delete seeds[flowerId];

  garden.state    = PLOT_STATE.PLANTED;
  garden.flowerId = flowerId;
  garden.stage    = 0;
  garden.plantedAt = now;
  garden.growTime  = flower.growTime * 1000;
  garden.waterTime = flower.waterTime * 1000;
  return true;
}

export function waterPlot(garden, now) {
  if (garden.state !== PLOT_STATE.PLANTED) return false;
  garden.state = PLOT_STATE.WATERED;
  garden.plantedAt = now;
  return true;
}

export function harvestPlot(garden) {
  if (garden.state !== PLOT_STATE.READY) return null;
  const flowerId = garden.flowerId;
  garden.state    = PLOT_STATE.EMPTY;
  garden.flowerId = null;
  garden.stage    = 0;
  garden.plantedAt = 0;
  return flowerId;
}

// Harvest with all perk effects. Returns result object or null.
export function harvestPlotWithPerks(garden, gardens, horses) {
  const flowerId = harvestPlot(garden);
  if (!flowerId) return null;

  let count = 1;
  let bonusCoins = 0;
  let freeSeed = null;
  let autoPlowedIndices = [];

  if (horses) {
    if (isTamed(horses, 'goldenPalomino')) {
      const lvl = getPerkLevel(horses, 'goldenPalomino');
      if (Math.random() < PERKS.goldenPalomino.doubleChance(lvl)) count = 2;
    }

    if (isTamed(horses, 'frostPony')) {
      const lvl = getPerkLevel(horses, 'frostPony');
      if (Math.random() < PERKS.frostPony.seedDropChance(lvl)) freeSeed = flowerId;
    }

    if (isTamed(horses, 'shadowRunner')) {
      const lvl = getPerkLevel(horses, 'shadowRunner');
      const max = PERKS.shadowRunner.bonusCoinMax(lvl);
      bonusCoins = Math.floor(Math.random() * max) + 1;
    }

    if (isTamed(horses, 'chestnutMare')) {
      const lvl = getPerkLevel(horses, 'chestnutMare');
      const autoPlow = PERKS.chestnutMare.plotsPerHarvest(lvl);
      const empty = gardens.filter(g => g.index !== garden.index && g.state === PLOT_STATE.EMPTY);
      const n = Math.min(autoPlow, empty.length);
      for (let i = 0; i < n; i++) {
        empty[i].autoPlow = Date.now();
        autoPlowedIndices.push(empty[i].index);
      }
    }
  }

  return { flowerId, count, bonusCoins, freeSeed, autoPlowedIndices };
}

// Tick all gardens forward. horses used for Paint Horse grow speed.
export function tickGarden(gardens, now, horses) {
  let speedMult = 1;
  if (horses && isTamed(horses, 'paintHorse')) {
    const lvl = getPerkLevel(horses, 'paintHorse');
    speedMult = 1 - PERKS.paintHorse.growSpeedBonus(lvl);
    if (speedMult < 0.25) speedMult = 0.25;
  }

  for (const garden of gardens) {
    if (garden.state === PLOT_STATE.WATERED) {
      const elapsed = now - garden.plantedAt;
      const effectiveGrow = garden.growTime * speedMult;
      const progress = Math.min(1, elapsed / effectiveGrow);
      if (progress >= 1) {
        garden.stage = 2;
        garden.state = PLOT_STATE.READY;
      } else if (progress >= 0.45) {
        garden.stage = 1;
      } else {
        garden.stage = 0;
      }
    }
  }
}

// ── Hit testing ───────────────────────────────────────────────────────────────

// Get number of columns for a given garden count (always 5 cols)
export function gardenCols(count) {
  return Math.min(count, GRID_COLS);
}

export function gardenRows(count) {
  return Math.ceil(count / GRID_COLS);
}

// Get garden index from pixel coordinates given a layout
export function gardenAtPoint(x, y, layout) {
  const { originX, originY, plotW, plotH, gap, cols, rows } = layout;
  const col = Math.floor((x - originX) / (plotW + gap));
  const row = Math.floor((y - originY) / (plotH + gap));
  if (col < 0 || col >= cols || row < 0 || row >= rows) return -1;
  const idx = row * cols + col;
  return idx;
}

// Compute pixel rect for a garden given layout
export function plotRect(index, layout) {
  const { originX, originY, plotW, plotH, gap, cols } = layout;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: originX + col * (plotW + gap),
    y: originY + row * (plotH + gap),
    w: plotW,
    h: plotH,
  };
}
