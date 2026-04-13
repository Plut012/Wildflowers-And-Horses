// garden.js — Plot grid: planting, watering, harvesting.

import { FLOWERS, PLOT_COUNT, PLOT_STATE, GRID_COLS, GRID_ROWS, PERKS } from './data.js';
import { isTamed, getPerkLevel } from './horses.js';

// Build a fresh set of empty plots
export function createPlots() {
  const plots = [];
  for (let i = 0; i < PLOT_COUNT; i++) {
    plots.push(makePlot(i));
  }
  return plots;
}

function makePlot(index) {
  return {
    index,
    state: PLOT_STATE.EMPTY,
    flowerId: null,
    plantedAt: 0,    // timestamp when watered (ms)
    growTime: 0,     // total grow time in ms
    waterTime: 0,    // ms until next stage after watering
    stage: 0,        // 0=seed, 1=sprout, 2=bloom (ready)
    autoPlow: 0,     // timestamp of last auto-plow sparkle (0=inactive)
  };
}

// Rebuild plots from saved data, filling any gaps
export function hydrateGarden(saved, count) {
  const plots = [];
  for (let i = 0; i < count; i++) {
    if (saved && saved[i]) {
      plots.push({ ...makePlot(i), ...saved[i] });
    } else {
      plots.push(makePlot(i));
    }
  }
  return plots;
}

// Attempt to plant a seed in a plot. Returns true if successful.
export function plantSeed(plot, flowerId, state, now) {
  if (plot.state !== PLOT_STATE.EMPTY) return false;
  const seeds = state.inventory.seeds;
  if (!seeds[flowerId] || seeds[flowerId] < 1) return false;

  const flower = FLOWERS[flowerId];
  seeds[flowerId] -= 1;
  if (seeds[flowerId] <= 0) delete seeds[flowerId];

  plot.state    = PLOT_STATE.PLANTED;
  plot.flowerId = flowerId;
  plot.stage    = 0;
  plot.plantedAt = now;
  plot.growTime  = flower.growTime * 1000;
  plot.waterTime = flower.waterTime * 1000;
  return true;
}

// Water a planted (unwatered) plot. Returns true if successful.
export function waterPlot(plot, now) {
  if (plot.state !== PLOT_STATE.PLANTED) return false;
  plot.state = PLOT_STATE.WATERED;
  plot.plantedAt = now;
  return true;
}

// Harvest a ready plot. Returns the flower id or null.
export function harvestPlot(plot) {
  if (plot.state !== PLOT_STATE.READY) return null;
  const flowerId = plot.flowerId;

  // Reset
  plot.state    = PLOT_STATE.EMPTY;
  plot.flowerId = null;
  plot.stage    = 0;
  plot.plantedAt = 0;

  return flowerId;
}

// Harvest with perk effects applied.
// Returns { flowerId, count, bonusCoins, freeSeed, autoPlowedIndices }
// count: 1 normally, 2 if Golden Palomino double triggers
// bonusCoins: Shadow Runner bonus coins (0 if not tamed)
// freeSeed: flower id of free seed (null if Frost Pony didn't trigger)
// autoPlowedIndices: plot indices sparkled by Chestnut Mare auto-plow
export function harvestPlotWithPerks(plot, plots, horses) {
  const flowerId = harvestPlot(plot);
  if (!flowerId) return null;

  let count = 1;
  let bonusCoins = 0;
  let freeSeed = null;
  let autoPlowedIndices = [];

  if (horses) {
    // Golden Palomino — chance to double harvest
    if (isTamed(horses, 'goldenPalomino')) {
      const lvl = getPerkLevel(horses, 'goldenPalomino');
      if (Math.random() < PERKS.goldenPalomino.doubleChance(lvl)) {
        count = 2;
      }
    }

    // Frost Pony — chance for free seed
    if (isTamed(horses, 'frostPony')) {
      const lvl = getPerkLevel(horses, 'frostPony');
      if (Math.random() < PERKS.frostPony.seedDropChance(lvl)) {
        freeSeed = flowerId;
      }
    }

    // Shadow Runner — bonus coins
    if (isTamed(horses, 'shadowRunner')) {
      const lvl = getPerkLevel(horses, 'shadowRunner');
      const max = PERKS.shadowRunner.bonusCoinMax(lvl);
      bonusCoins = Math.floor(Math.random() * max) + 1;
    }

    // Chestnut Mare — auto-plow empty-adjacent plots (up to perk level count)
    if (isTamed(horses, 'chestnutMare')) {
      const lvl = getPerkLevel(horses, 'chestnutMare');
      const autoPlow = PERKS.chestnutMare.plotsPerHarvest(lvl);
      // Mark sparkle on auto-plowed plots (they're already empty or become empty)
      // We mark harvested-adjacent empty plots for visual sparkle
      const emptyPlots = plots.filter(p => p.index !== plot.index && p.state === PLOT_STATE.EMPTY);
      const count2 = Math.min(autoPlow, emptyPlots.length);
      for (let i = 0; i < count2; i++) {
        emptyPlots[i].autoPlow = Date.now(); // timestamp for sparkle effect
        autoPlowedIndices.push(emptyPlots[i].index);
      }
    }
  }

  return { flowerId, count, bonusCoins, freeSeed, autoPlowedIndices };
}

// Tick all plots forward. Called each frame with current timestamp.
// horses = state.horses, used to apply Paint Horse grow-speed perk.
export function tickGarden(plots, now, horses) {
  // Paint Horse: reduce effective grow time
  let speedMult = 1;
  if (horses && isTamed(horses, 'paintHorse')) {
    const lvl = getPerkLevel(horses, 'paintHorse');
    speedMult = 1 - PERKS.paintHorse.growSpeedBonus(lvl);
    if (speedMult < 0.25) speedMult = 0.25; // floor at 25% of original time
  }

  for (const plot of plots) {
    if (plot.state === PLOT_STATE.WATERED) {
      const elapsed = now - plot.plantedAt;
      const effectiveGrow = plot.growTime * speedMult;
      const progress = Math.min(1, elapsed / effectiveGrow);
      if (progress >= 1) {
        plot.stage = 2;
        plot.state = PLOT_STATE.READY;
      } else if (progress >= 0.45) {
        plot.stage = 1;
      } else {
        plot.stage = 0;
      }
    }
  }
}

// Get plot index from pixel coordinates
export function plotAtPoint(x, y, layout) {
  const { originX, originY, plotW, plotH, gap } = layout;
  const col = Math.floor((x - originX) / (plotW + gap));
  const row = Math.floor((y - originY) / (plotH + gap));
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return -1;
  return row * GRID_COLS + col;
}

// Compute pixel rect for a plot given a layout descriptor
export function plotRect(index, layout) {
  const { originX, originY, plotW, plotH, gap } = layout;
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    x: originX + col * (plotW + gap),
    y: originY + row * (plotH + gap),
    w: plotW,
    h: plotH,
  };
}
