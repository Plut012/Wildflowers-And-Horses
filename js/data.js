// data.js — All game balance numbers and definitions live here.
// Change values here to tune the game; never hardcode numbers elsewhere.

export const FLOWERS = {
  daisy: {
    id: 'daisy',
    name: 'Daisy',
    seedCost: 5,
    sellPrice: 8,
    growTime: 12,      // seconds to fully grow
    waterTime: 6,      // seconds after watering before next stage
    stages: 3,         // seed → sprout → bloom
    colors: {
      seed:   '#8B6914',
      sprout: '#6aaa4a',
      bloom:  '#FFFDE7',
      center: '#FFD54F',
    },
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    seedCost: 10,
    sellPrice: 18,
    growTime: 25,
    waterTime: 12,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#81C784',
      bloom:  '#CE93D8',
      center: '#9C27B0',
    },
  },
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    seedCost: 15,
    sellPrice: 30,
    growTime: 45,
    waterTime: 20,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#66BB6A',
      bloom:  '#FFD600',
      center: '#6D4C41',
    },
  },
  clover: {
    id: 'clover',
    name: 'Clover',
    seedCost: 8,
    sellPrice: 12,
    growTime: 18,
    waterTime: 9,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#4CAF50',
      bloom:  '#EF9A9A',
      center: '#E53935',
    },
  },
  rosehip: {
    id: 'rosehip',
    name: 'Rosehip',
    seedCost: 12,
    sellPrice: 22,
    growTime: 35,
    waterTime: 16,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#81C784',
      bloom:  '#EF5350',
      center: '#880E4F',
    },
  },
  bluebell: {
    id: 'bluebell',
    name: 'Bluebell',
    seedCost: 18,
    sellPrice: 35,
    growTime: 55,
    waterTime: 25,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#66BB6A',
      bloom:  '#7986CB',
      center: '#283593',
    },
  },
  marigold: {
    id: 'marigold',
    name: 'Marigold',
    seedCost: 20,
    sellPrice: 40,
    growTime: 70,
    waterTime: 30,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#66BB6A',
      bloom:  '#FF8F00',
      center: '#BF360C',
    },
  },
  moonpetal: {
    id: 'moonpetal',
    name: 'Moonpetal',
    seedCost: 30,
    sellPrice: 65,
    growTime: 120,
    waterTime: 50,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#80DEEA',
      bloom:  '#E1F5FE',
      center: '#7986CB',
    },
  },
};

export const FLOWER_LIST = Object.values(FLOWERS);

// Starting conditions
export const STARTING_COINS = 30;
export const STARTING_SEEDS = { daisy: 3 };

// Grid layout
export const GRID_COLS = 4;
export const GRID_ROWS = 3;
export const PLOT_COUNT = GRID_COLS * GRID_ROWS;

// Day/night cycle
export const DAY_DURATION   = 180; // seconds for one full day→night→day cycle
export const NIGHT_FRACTION = 0.4; // fraction of cycle spent in night

// Palette — warm earth tones
export const PALETTE = {
  // Day
  skyDay:     '#F5E6D0',
  groundDay:  '#C8A96E',
  plotEmpty:  '#A0785A',
  plotSoil:   '#7B5033',
  grassDay:   '#8DB85A',
  uiBarDay:   '#8B7355',
  textDay:    '#3E2723',

  // Night overrides (blended in by render.js)
  skyNight:   '#1A2340',
  groundNight:'#2C3E50',
  grassNight: '#1B5E20',
  uiBarNight: '#1A2340',
  textNight:  '#E8D5B0',

  // UI
  coinGold:   '#FFD54F',
  btnBg:      '#6D4C41',
  btnText:    '#FFF8E1',
  btnHover:   '#5D4037',
  overlay:    'rgba(20,16,12,0.72)',
  panelBg:    '#3E2723',
  panelBorder:'#8D6E63',
};

// Plot states
export const PLOT_STATE = {
  EMPTY:     'empty',
  PLANTED:   'planted',   // seed in ground, needs water
  WATERED:   'watered',   // growing
  READY:     'ready',     // ready to harvest
};

// ── Horse definitions ─────────────────────────────────────────────────────────
// favoriteFlower: the flower that raises trust (+1)
// trustThreshold: feeds of the right flower to tame
// colors: body and mane hex colors for canvas rendering

export const HORSES = {
  chestnutMare: {
    id: 'chestnutMare',
    name: 'Chestnut Mare',
    favoriteFlower: 'daisy',
    trustThreshold: 4,
    colors: { body: '#8B3A2A', mane: '#5C1F10', eye: '#2C1810', nose: '#7A2E1E' },
  },
  appaloosa: {
    id: 'appaloosa',
    name: 'Appaloosa',
    favoriteFlower: 'clover',
    trustThreshold: 5,
    colors: { body: '#D4B896', mane: '#5C4A32', eye: '#2C1810', nose: '#C4A882' },
  },
  paintHorse: {
    id: 'paintHorse',
    name: 'Paint Horse',
    favoriteFlower: 'rosehip',
    trustThreshold: 6,
    colors: { body: '#E8D5B0', mane: '#3E2210', eye: '#2C1810', nose: '#D4C09A' },
  },
  goldenPalomino: {
    id: 'goldenPalomino',
    name: 'Golden Palomino',
    favoriteFlower: 'lavender',
    trustThreshold: 7,
    colors: { body: '#D4A832', mane: '#F5E0A0', eye: '#2C1810', nose: '#C09828' },
  },
  blackStallion: {
    id: 'blackStallion',
    name: 'Black Stallion',
    favoriteFlower: 'bluebell',
    trustThreshold: 8,
    colors: { body: '#1A1208', mane: '#0A0804', eye: '#4A3020', nose: '#120C04' },
  },
  frostPony: {
    id: 'frostPony',
    name: 'Frost Pony',
    favoriteFlower: 'sunflower',
    trustThreshold: 9,
    colors: { body: '#D8E8F0', mane: '#B0C8DC', eye: '#3A5060', nose: '#C4D8E8' },
  },
  shadowRunner: {
    id: 'shadowRunner',
    name: 'Shadow Runner',
    favoriteFlower: 'marigold',
    trustThreshold: 10,
    colors: { body: '#2A2038', mane: '#1A1228', eye: '#8060A0', nose: '#1E1830' },
  },
  starlightUnicorn: {
    id: 'starlightUnicorn',
    name: 'Starlight Unicorn',
    favoriteFlower: 'moonpetal',
    trustThreshold: 14,
    colors: { body: '#EEE8FF', mane: '#C8A8F0', eye: '#6040A8', nose: '#DDD4F8' },
  },
};

// ── Horse perk definitions ────────────────────────────────────────────────────
// Each tamed horse has a passive perk that levels up when fed its favorite flower.
// Level 0 means just tamed (perk is active at level 1 immediately on tame).
// Scaling: level N means (base + perLevelBonus * N).

export const PERKS = {
  chestnutMare: {
    name: 'Auto-Plow',
    description: (lvl) => `Auto-plows ${lvl} plot${lvl > 1 ? 's' : ''} on harvest`,
    // Number of plots auto-plowed after each harvest
    plotsPerHarvest: (lvl) => lvl,
  },
  appaloosa: {
    name: 'Market Eye',
    description: (lvl) => `Flowers sell for +${lvl * 5}% more`,
    // Percentage bonus on top of base sell price
    sellBonus: (lvl) => lvl * 0.05,
  },
  goldenPalomino: {
    name: 'Golden Touch',
    description: (lvl) => `${Math.min(lvl * 4, 80)}% chance to double harvest`,
    // Probability of doubling a harvest (capped at 80%)
    doubleChance: (lvl) => Math.min(lvl * 0.04, 0.80),
  },
  paintHorse: {
    name: 'Swift Growth',
    description: (lvl) => `Flowers grow ${Math.min(lvl * 3, 75)}% faster`,
    // Fraction by which grow time is reduced (capped at 75%)
    growSpeedBonus: (lvl) => Math.min(lvl * 0.03, 0.75),
  },
  blackStallion: {
    name: 'Night Bounty',
    description: (lvl) => `+${lvl * 3} bonus coins per flower sold at night`,
    // Flat coin bonus per flower when selling at night
    nightBonus: (lvl) => lvl * 3,
  },
  frostPony: {
    name: 'Frost Seeds',
    description: (lvl) => `${Math.min(lvl * 6, 90)}% chance for a free seed on harvest`,
    // Probability of getting a free seed of the same type on harvest
    seedDropChance: (lvl) => Math.min(lvl * 0.06, 0.90),
  },
  shadowRunner: {
    name: 'Hidden Coins',
    description: (lvl) => `Harvests reveal 1–${lvl * 4} bonus coins`,
    // Max random bonus coins added on harvest (uniform 1..max)
    bonusCoinMax: (lvl) => lvl * 4,
  },
  starlightUnicorn: {
    name: 'Star Blessing',
    description: (lvl) => `All coins ×${(1 + lvl * 0.1).toFixed(1)}`,
    // Global coin multiplier applied at market sell time
    globalMultiplier: (lvl) => 1 + lvl * 0.1,
  },
};

export const HORSE_LIST = Object.values(HORSES);

// Horse visit balance
export const HORSE_VISIT_MIN_INTERVAL = 45;   // seconds between visits minimum
export const HORSE_VISIT_MAX_INTERVAL = 90;   // seconds between visits maximum
export const HORSE_VISIT_DURATION     = 30;   // seconds a horse lingers if not fed
export const HORSE_REACT_DURATION     = 2.2;  // seconds the +/- reaction shows
