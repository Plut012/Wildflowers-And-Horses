// market.js — Buy seeds, sell flowers. HTML overlay logic.

import { FLOWERS, FLOWER_LIST, PALETTE, PERKS } from './data.js';
import { saveGame } from './save.js';
import { isTamed, getPerkLevel, getAssignedHorses } from './horses.js';
import { nightFactor } from './render.js';

let _state = null;
let _onUpdate = null;

export function initMarket(state, onUpdate) {
  _state = state;
  _onUpdate = onUpdate;

  document.getElementById('market-btn').addEventListener('click', openMarket);
  document.getElementById('market-close').addEventListener('click', closeMarket);
  document.getElementById('market-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('market-overlay')) closeMarket();
  });

  buildMarketUI();
}

export function openMarket() {
  refreshMarketUI();
  document.getElementById('market-overlay').classList.remove('hidden');
}

export function closeMarket() {
  document.getElementById('market-overlay').classList.add('hidden');
}

export function isMarketOpen() {
  return !document.getElementById('market-overlay').classList.contains('hidden');
}

function buildMarketUI() {
  const seedsEl = document.getElementById('market-seeds');
  const sellEl  = document.getElementById('market-sell');

  // Seed buy section
  seedsEl.innerHTML = '';
  for (const flower of FLOWER_LIST) {
    const row = document.createElement('div');
    row.className = 'market-row';
    row.innerHTML = `
      <span class="market-flower-dot" style="background:${flower.colors.bloom}"></span>
      <span class="market-name">${flower.name}</span>
      <span class="market-cost">${flower.seedCost}c</span>
      <button class="market-buy-btn" data-id="${flower.id}" data-cost="${flower.seedCost}">
        Buy Seed
      </button>
    `;
    seedsEl.appendChild(row);
  }

  // Sell flowers section
  sellEl.innerHTML = '';
  for (const flower of FLOWER_LIST) {
    const row = document.createElement('div');
    row.className = 'market-row';
    row.id = `sell-row-${flower.id}`;
    row.innerHTML = `
      <span class="market-flower-dot" style="background:${flower.colors.bloom}"></span>
      <span class="market-name">${flower.name}</span>
      <span class="market-price">${flower.sellPrice}c each</span>
      <span class="market-qty" id="qty-${flower.id}">×0</span>
      <button class="market-sell-btn" data-id="${flower.id}" data-price="${flower.sellPrice}">
        Sell All
      </button>
    `;
    sellEl.appendChild(row);
  }

  // Wire up buy buttons
  seedsEl.querySelectorAll('.market-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const cost = parseInt(btn.dataset.cost);
      buySeed(id, cost);
    });
  });

  // Wire up sell buttons
  sellEl.querySelectorAll('.market-sell-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.id;
      const price = parseInt(btn.dataset.price);
      sellFlowers(id, price);
    });
  });
}

function refreshMarketUI() {
  // Update coin display inside market
  const coinEl = document.getElementById('market-coins');
  if (coinEl) coinEl.textContent = `Coins: ${_state.inventory.coins}`;

  // Update sell quantities
  for (const flower of FLOWER_LIST) {
    const qty = _state.inventory.flowers[flower.id] || 0;
    const qtyEl = document.getElementById(`qty-${flower.id}`);
    if (qtyEl) qtyEl.textContent = `×${qty}`;

    const btn = document.querySelector(`.market-sell-btn[data-id="${flower.id}"]`);
    if (btn) btn.disabled = qty === 0;
  }

  // Update buy button affordability
  document.querySelectorAll('.market-buy-btn').forEach(btn => {
    const cost = parseInt(btn.dataset.cost);
    btn.disabled = _state.inventory.coins < cost;
  });
}

function buySeed(flowerId, cost) {
  if (_state.inventory.coins < cost) return;
  _state.inventory.coins -= cost;
  _state.inventory.seeds[flowerId] = (_state.inventory.seeds[flowerId] || 0) + 1;
  saveGame(_state);
  refreshMarketUI();
  _onUpdate();
}

function sellFlowers(flowerId, price) {
  const qty = _state.inventory.flowers[flowerId] || 0;
  if (qty === 0) return;

  const horses = _state.horses;
  let perFlower = price;

  // Get horses assigned to the active plot for per-plot perk application
  const activePlotIdx = _state.farm ? _state.farm.activePlot : 0;
  const assignedIds = getAssignedHorses(horses, activePlotIdx);

  function hasHorse(id) {
    return assignedIds.includes(id) && isTamed(horses, id);
  }

  // Appaloosa — sell bonus
  if (hasHorse('appaloosa')) {
    const lvl = getPerkLevel(horses, 'appaloosa');
    perFlower = Math.floor(perFlower * (1 + PERKS.appaloosa.sellBonus(lvl)));
  }

  // Black Stallion — night bonus (flat per flower)
  const nf = nightFactor(_state.time.elapsed);
  const isNight = nf > 0.5;
  if (isNight && hasHorse('blackStallion')) {
    const lvl = getPerkLevel(horses, 'blackStallion');
    perFlower += PERKS.blackStallion.nightBonus(lvl);
  }

  let total = qty * perFlower;

  // Starlight Unicorn — global multiplier
  if (hasHorse('starlightUnicorn')) {
    const lvl = getPerkLevel(horses, 'starlightUnicorn');
    total = Math.floor(total * PERKS.starlightUnicorn.globalMultiplier(lvl));
  }

  _state.inventory.coins += total;
  delete _state.inventory.flowers[flowerId];
  saveGame(_state);
  refreshMarketUI();
  _onUpdate();
}
