// save.js — localStorage persistence for the single game state object.
// Saved fields: inventory, farm, horses, journal, time, totalPlaytime.
// Phase 5: saves farm.plots[] nested structure.
// Migration: detects old Phase 1-4 saves (garden.plots flat array) and converts.

const SAVE_KEY = 'pony-pastures-save';
let saveTimer = null;

export function saveGame(state) {
  // Debounce: don't thrash localStorage on every tap
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const toSave = {
        inventory:     state.inventory,
        farm: {
          plots:       state.farm.plots,
          activePlot:  state.farm.activePlot,
          viewMode:    state.farm.viewMode,
        },
        horses: {
          wild:        null,
          tamed:       state.horses.tamed,
          trust:       state.horses.trust,
          perkLevels:  state.horses.perkLevels,
          nextVisitAt: state.horses.nextVisitAt,
          assignedTo:  state.horses.assignedTo,
        },
        journal:       state.journal,
        time:          state.time,
        totalPlaytime: state.totalPlaytime,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  }, 800);
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Load failed, starting fresh:', e);
    return null;
  }
}

// Detect old Phase 1-4 save format (has garden.plots flat array instead of farm.plots)
// Returns true if save needs migration
export function needsMigration(saved) {
  return saved && saved.garden && Array.isArray(saved.garden.plots) && !saved.farm;
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
