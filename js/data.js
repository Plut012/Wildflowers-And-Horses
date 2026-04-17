// data.js — All game balance numbers and definitions live here.
// Change values here to tune the game; never hardcode numbers elsewhere.

export const FLOWERS = {
  daisy: {
    id: 'daisy',
    name: 'Daisy',
    seedCost: 4,        // affordable early-game seed
    sellPrice: 8,
    growTime: 14,       // seconds to fully grow (slightly slower = more satisfying)
    waterTime: 6,       // seconds after watering before next stage
    stages: 3,          // seed → sprout → bloom
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
    seedCost: 9,
    sellPrice: 18,
    growTime: 28,
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
    seedCost: 14,
    sellPrice: 30,
    growTime: 50,
    waterTime: 22,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#66BB6A',
      bloom:  '#FFD600',
      center: '#5D4037',
    },
  },
  clover: {
    id: 'clover',
    name: 'Clover',
    seedCost: 7,
    sellPrice: 13,
    growTime: 20,
    waterTime: 9,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#4CAF50',
      bloom:  '#F48FB1',
      center: '#E53935',
    },
  },
  rosehip: {
    id: 'rosehip',
    name: 'Rosehip',
    seedCost: 12,
    sellPrice: 24,
    growTime: 38,
    waterTime: 17,
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
    seedCost: 17,
    sellPrice: 36,
    growTime: 60,
    waterTime: 26,
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
    sellPrice: 42,
    growTime: 75,
    waterTime: 32,
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
    seedCost: 28,       // slightly more accessible
    sellPrice: 70,      // very rewarding to grow
    growTime: 130,      // long but worth it
    waterTime: 55,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#80DEEA',
      bloom:  '#E1F5FE',
      center: '#7986CB',
    },
  },

  // ── Phase 7 new flowers ───────────────────────────────────────────────────
  thistle: {
    id: 'thistle',
    name: 'Thistle',
    seedCost: 16,
    sellPrice: 34,
    growTime: 55,
    waterTime: 24,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#7CB87A',
      bloom:  '#BA68C8',
      center: '#6A1B9A',
    },
  },
  peony: {
    id: 'peony',
    name: 'Peony',
    seedCost: 22,
    sellPrice: 48,
    growTime: 80,
    waterTime: 34,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#81C784',
      bloom:  '#F48FB1',
      center: '#AD1457',
    },
  },
  fern: {
    id: 'fern',
    name: 'Fern',
    seedCost: 18,
    sellPrice: 38,
    growTime: 65,
    waterTime: 28,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#4CAF50',
      bloom:  '#2E7D32',
      center: '#1B5E20',
    },
  },
  goldenrod: {
    id: 'goldenrod',
    name: 'Goldenrod',
    seedCost: 32,
    sellPrice: 68,
    growTime: 110,
    waterTime: 46,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#A5D6A7',
      bloom:  '#FFD600',
      center: '#F57F17',
    },
  },
  nightshade: {
    id: 'nightshade',
    name: 'Nightshade',
    seedCost: 38,
    sellPrice: 85,
    growTime: 150,
    waterTime: 64,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#4A4070',
      bloom:  '#7B1FA2',
      center: '#1A0030',
    },
  },
  sunrose: {
    id: 'sunrose',
    name: 'Sunrose',
    seedCost: 45,
    sellPrice: 100,
    growTime: 190,
    waterTime: 80,
    stages: 3,
    colors: {
      seed:   '#8B6914',
      sprout: '#FFF176',
      bloom:  '#FF6F00',
      center: '#FFD54F',
    },
  },
};

export const FLOWER_LIST = Object.values(FLOWERS);

// Starting conditions — enough to get going without frustration
export const STARTING_COINS = 40;
export const STARTING_SEEDS = { daisy: 4, clover: 2 };

// Grid layout — legacy constants kept for reference, dynamic layout now in render.js
export const GRID_COLS = 5;   // always 5 columns in a plot
export const GRID_ROWS = 1;   // starting rows (1 row = 5 gardens)
export const PLOT_COUNT = GRID_COLS * GRID_ROWS; // starting garden count per plot

// Multi-plot farm — Phase 5
export const STARTING_GARDENS = 5;    // gardens in first plot on new game
export const MAX_GARDENS_PER_PLOT = 25;

// Cost to buy more gardens within a plot (escalating by current count)
// gardens 5→10 costs 50, 10→15 costs 100, 15→20 costs 200, 20→25 costs 400
export const GARDEN_BUY_COSTS = [50, 100, 200, 400]; // index = (currentCount/5 - 1)

// Cost to buy new plots of land (escalating by plot index)
export const PLOT_BUY_COSTS = [500, 1500, 4000, 10000, 25000, 60000, 150000];

// Horse assignment capacity: 1 horse slot per this many gardens
export const GARDENS_PER_HORSE_SLOT = 5;

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

  // ── Phase 7 legendary horses ──────────────────────────────────────────────
  stormStallion: {
    id: 'stormStallion',
    name: 'Storm Stallion',
    favoriteFlower: 'thistle',
    trustThreshold: 12,
    colors: { body: '#3A4A6A', mane: '#1A2848', eye: '#A0C0FF', nose: '#2A3858' },
  },
  harvestQueen: {
    id: 'harvestQueen',
    name: 'Harvest Queen',
    favoriteFlower: 'peony',
    trustThreshold: 14,
    colors: { body: '#8B5E2A', mane: '#C8940A', eye: '#5A3010', nose: '#7A4E1A' },
  },
  meadowSpirit: {
    id: 'meadowSpirit',
    name: 'Meadow Spirit',
    favoriteFlower: 'fern',
    trustThreshold: 16,
    colors: { body: '#5A8A3A', mane: '#3A6A1A', eye: '#1A4A0A', nose: '#4A7828' },
  },
  goldenHerd: {
    id: 'goldenHerd',
    name: 'Golden Herd',
    favoriteFlower: 'goldenrod',
    trustThreshold: 18,
    colors: { body: '#D4A832', mane: '#FFE066', eye: '#5A3800', nose: '#B89020' },
  },
  phantomMare: {
    id: 'phantomMare',
    name: 'Phantom Mare',
    favoriteFlower: 'nightshade',
    trustThreshold: 20,
    colors: { body: '#1A0830', mane: '#3A1060', eye: '#C060FF', nose: '#120620' },
  },
  sunChariot: {
    id: 'sunChariot',
    name: 'Sun Chariot',
    favoriteFlower: 'sunrose',
    trustThreshold: 25,
    colors: { body: '#E8A030', mane: '#FFF0A0', eye: '#3A1800', nose: '#C88020' },
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

  // ── Phase 7 legendary perks ───────────────────────────────────────────────
  stormStallion: {
    name: 'Tempest Water',
    description: (lvl) => `Auto-waters plots every ${Math.max(10, 30 - (lvl - 1) * 3)}s`,
    // Interval in seconds between auto-water events
    autoWaterInterval: (lvl) => Math.max(10, 30 - (lvl - 1) * 3),
  },
  harvestQueen: {
    name: 'Royal Harvest',
    description: (lvl) => `Auto-harvests ready plots every ${Math.max(15, 45 - (lvl - 1) * 4)}s`,
    // Interval in seconds between auto-harvest events
    autoHarvestInterval: (lvl) => Math.max(15, 45 - (lvl - 1) * 4),
  },
  meadowSpirit: {
    name: 'Regrowth',
    description: (lvl) => `${Math.min(15 + (lvl - 1) * 5, 90)}% chance to auto-replant on harvest`,
    // Probability of free auto-replant after harvest
    regrowthChance: (lvl) => Math.min((15 + (lvl - 1) * 5) / 100, 0.90),
  },
  goldenHerd: {
    name: 'Herd Wealth',
    description: (lvl) => `+${(0.5 * lvl).toFixed(1)} coins/sec per tamed horse`,
    // Coins per second per tamed horse
    coinsPerSecPerHorse: (lvl) => 0.5 * lvl,
  },
  phantomMare: {
    name: 'Phantom Boost',
    description: (lvl) => `Doubles other horses\' perk levels on this plot`,
    // This perk doubles effective level of other horses on same plot (lvl scales nothing extra)
    boostMultiplier: () => 2,
  },
  sunChariot: {
    name: 'Eternal Day',
    description: (lvl) => `Flowers sell for +${50 + (lvl - 1) * 10}% more during daytime`,
    // Bonus sell multiplier during daytime (added to 1.0 base)
    daySellBonus: (lvl) => (50 + (lvl - 1) * 10) / 100,
  },
};

export const HORSE_LIST = Object.values(HORSES);

// Golden Herd passive coin accumulation — fractional coins per tick
// Actual coin rate = coinsPerSecPerHorse * tamedHorseCount
// Stored in state.horses._goldenHerdAccum

// Horse visit balance
export const HORSE_VISIT_MIN_INTERVAL = 45;   // seconds between visits minimum
export const HORSE_VISIT_MAX_INTERVAL = 90;   // seconds between visits maximum
export const HORSE_VISIT_DURATION     = 30;   // seconds a horse lingers if not fed
export const HORSE_REACT_DURATION     = 2.2;  // seconds the +/- reaction shows
