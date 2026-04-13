// horses.js — Wild horse visits, trust, taming, stable state.

import {
  HORSES, HORSE_LIST,
  HORSE_VISIT_MIN_INTERVAL, HORSE_VISIT_MAX_INTERVAL,
  HORSE_VISIT_DURATION,
  PERKS,
} from './data.js';

// ── Default state factory ─────────────────────────────────────────────────────

export function defaultHorsesState() {
  return {
    wild: null,            // currently visiting horse or null
    tamed: [],             // array of { horseId, trust }
    trust: {},             // { horseId: trustCount } accumulated across visits
    perkLevels: {},        // { horseId: level } — level 1 on tame, increments each feed
    nextVisitAt: 0,        // game-time elapsed seconds when next visit is allowed
  };
}

// Hydrate saved horse state, filling any missing fields
export function hydrateHorses(saved) {
  const base = defaultHorsesState();
  if (!saved) return base;
  base.wild        = saved.wild        ?? null;
  base.tamed       = saved.tamed       ?? [];
  base.trust        = saved.trust       ?? {};
  base.perkLevels  = saved.perkLevels  ?? {};
  base.nextVisitAt = saved.nextVisitAt ?? 0;
  return base;
}

// ── Visit logic ───────────────────────────────────────────────────────────────

// Called once per tick. elapsed = state.time.elapsed (seconds).
// inventory = state.inventory so we can weight by flowers on hand.
export function tickHorses(horsesState, elapsed, inventory) {
  const wild = horsesState.wild;

  // Expire current visitor if its time is up
  if (wild && elapsed > wild.expiresAt) {
    horsesState.wild = null;
    scheduleNextVisit(horsesState, elapsed);
    return;
  }

  // Spawn a new visitor if it's time and no one is here
  if (!wild && elapsed >= horsesState.nextVisitAt) {
    const horse = pickVisitor(horsesState, inventory);
    if (horse) {
      horsesState.wild = {
        horseId:   horse.id,
        arrivedAt: elapsed,
        expiresAt: elapsed + HORSE_VISIT_DURATION,
        fed:       false,
        reacting:  null,   // null | 'happy' | 'shy'
        reactEnd:  0,
      };
    } else {
      // No eligible horse right now — try again shortly
      horsesState.nextVisitAt = elapsed + 15;
    }
  }
}

function scheduleNextVisit(horsesState, elapsed) {
  const delay = HORSE_VISIT_MIN_INTERVAL +
    Math.random() * (HORSE_VISIT_MAX_INTERVAL - HORSE_VISIT_MIN_INTERVAL);
  horsesState.nextVisitAt = elapsed + delay;
}

// Pick a visiting horse weighted toward flowers in inventory.
// Tamed horses can also revisit so the player can level up their perks.
// Untamed horses have higher weight than tamed ones so discovery stays fun.
function pickVisitor(horsesState, inventory) {
  const tamedIds = new Set(horsesState.tamed.map(t => t.horseId));
  const untamed = HORSE_LIST.filter(h => !tamedIds.has(h.id));
  const tamed   = HORSE_LIST.filter(h =>  tamedIds.has(h.id));

  // If there are still untamed horses, 70% chance to pick from them
  let pool;
  if (untamed.length > 0 && Math.random() < 0.7) {
    pool = untamed;
  } else if (tamed.length > 0) {
    pool = tamed;
  } else {
    pool = untamed;
  }

  if (pool.length === 0) return null;

  // Weight: horses whose favorite flower is in inventory get 3x weight
  const weights = pool.map(h => {
    const qty = inventory.flowers[h.favoriteFlower] || 0;
    return qty > 0 ? 3 : 1;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// ── Feeding ───────────────────────────────────────────────────────────────────

// Returns { success, tamed, leveledUp, newLevel, horseName, perkName } or null.
// If the horse is already tamed and the player feeds it its favorite flower,
// the perk levels up instead of the normal trust mechanic.
export function feedHorse(horsesState, flowerId, elapsed) {
  const wild = horsesState.wild;
  if (!wild || wild.fed) return null;

  const horse = HORSES[wild.horseId];
  const liked = horse.favoriteFlower === flowerId;

  wild.fed = true;

  // Check if this horse is already tamed
  const alreadyTamed = horsesState.tamed.some(t => t.horseId === horse.id);

  if (alreadyTamed) {
    if (liked) {
      // Level up the perk
      const current = horsesState.perkLevels[horse.id] || 1;
      const newLevel = current + 1;
      horsesState.perkLevels[horse.id] = newLevel;
      wild.reacting = 'happy';
      wild.reactEnd = elapsed + 2.2;
      wild.expiresAt = elapsed + 2.5;
      const perkName = PERKS[horse.id] ? PERKS[horse.id].name : '';
      return { success: true, tamed: false, leveledUp: true, newLevel, horseName: horse.name, perkName };
    } else {
      // Wrong flower, wanders off
      wild.reacting = 'shy';
      wild.reactEnd = elapsed + 1.8;
      wild.expiresAt = elapsed + 1.8;
      return { success: false, tamed: false, leveledUp: false, horseName: horse.name };
    }
  }

  if (liked) {
    horsesState.trust[horse.id] = (horsesState.trust[horse.id] || 0) + 1;
    wild.reacting = 'happy';
    wild.reactEnd = elapsed + 2.2;

    const trust = horsesState.trust[horse.id];
    if (trust >= horse.trustThreshold) {
      // Tamed! Perk starts at level 1.
      horsesState.tamed.push({ horseId: horse.id, trust });
      horsesState.perkLevels[horse.id] = 1;
      wild.expiresAt = elapsed + 2.5;
      return { success: true, tamed: true, leveledUp: false, horseName: horse.name };
    }
    wild.expiresAt = elapsed + 2.5;
    return { success: true, tamed: false, leveledUp: false, horseName: horse.name };
  } else {
    // Wrong flower — horse wanders off gently
    wild.reacting = 'shy';
    wild.reactEnd = elapsed + 1.8;
    wild.expiresAt = elapsed + 1.8;
    return { success: false, tamed: false, leveledUp: false, horseName: horse.name };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getWildHorse(horsesState) {
  return horsesState.wild;
}

export function getTamedHorses(horsesState) {
  return horsesState.tamed;
}

export function getTrust(horsesState, horseId) {
  return horsesState.trust[horseId] || 0;
}

export function getPerkLevel(horsesState, horseId) {
  return horsesState.perkLevels[horseId] || 0;
}

// Returns true if the given horse is tamed
export function isTamed(horsesState, horseId) {
  return horsesState.tamed.some(t => t.horseId === horseId);
}
