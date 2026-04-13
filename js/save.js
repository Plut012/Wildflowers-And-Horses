// save.js — localStorage persistence for the single game state object.
// Saved fields: inventory, garden, horses, journal, time, totalPlaytime.

const SAVE_KEY = 'pony-pastures-save';
let saveTimer = null;

export function saveGame(state) {
  // Debounce: don't thrash localStorage on every tap
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      // Exclude transient wild visitor reaction state — re-spawn on load is fine
      const toSave = {
        inventory:     state.inventory,
        garden:        state.garden,
        horses: {
          wild:        null,    // don't persist a visiting horse mid-visit
          tamed:       state.horses.tamed,
          trust:       state.horses.trust,
          perkLevels:  state.horses.perkLevels,
          nextVisitAt: state.horses.nextVisitAt,
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

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}
