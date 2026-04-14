// journal.js — Horse Whisper Journal: log what you've tried per horse.

import { HORSES, HORSE_LIST, FLOWERS } from './data.js';

let _state = null;

export function defaultJournalState() {
  return { entries: [] };
}

export function hydrateJournal(saved) {
  const base = defaultJournalState();
  if (!saved) return base;
  base.entries = saved.entries ?? [];
  return base;
}

export function initJournal(state) {
  _state = state;

  document.getElementById('journal-btn').addEventListener('click', openJournal);
  document.getElementById('journal-close').addEventListener('click', closeJournal);
  document.getElementById('journal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('journal-overlay')) closeJournal();
  });
}

export function openJournal() {
  renderJournalUI();
  document.getElementById('journal-overlay').classList.remove('hidden');
}

export function closeJournal() {
  document.getElementById('journal-overlay').classList.add('hidden');
}

export function isJournalOpen() {
  return !document.getElementById('journal-overlay').classList.contains('hidden');
}

// Record a feed attempt in the journal
export function addJournalEntry(journal, horseId, flowerId, liked) {
  // Avoid duplicate entries for the exact same (horse, flower, result)
  const exists = journal.entries.some(
    e => e.horseId === horseId && e.flowerId === flowerId && e.liked === liked
  );
  if (!exists) {
    journal.entries.push({ horseId, flowerId, liked, ts: Date.now() });
  }
}

function renderJournalUI() {
  const el = document.getElementById('journal-entries');
  if (!el) return;

  const journal = _state.journal;

  if (journal.entries.length === 0) {
    el.innerHTML = '<p class="journal-empty">No entries yet. Feed a visiting horse to start discovering their favorites.</p>';
    return;
  }

  // Group entries by horse
  const byHorse = {};
  for (const entry of journal.entries) {
    if (!byHorse[entry.horseId]) byHorse[entry.horseId] = [];
    byHorse[entry.horseId].push(entry);
  }

  el.innerHTML = '';
  for (const horse of HORSE_LIST) {
    const entries = byHorse[horse.id];
    if (!entries) continue;

    const section = document.createElement('div');
    section.className = 'journal-horse';

    const tamedEntry = _state.horses.tamed.find(t => t.horseId === horse.id);
    const trust = _state.horses.trust[horse.id] || 0;
    const trustStr = tamedEntry
      ? 'Tamed'
      : `Trust: ${trust}/${HORSES[horse.id].trustThreshold}`;

    section.innerHTML = `<div class="journal-horse-header">
      <span class="journal-horse-dot" style="background:${horse.colors.body}"></span>
      <span class="journal-horse-name">${horse.name}</span>
      <span class="journal-trust">${trustStr}</span>
    </div>`;

    const list = document.createElement('div');
    list.className = 'journal-flower-list';

    for (const entry of entries) {
      const flower = FLOWERS[entry.flowerId];
      if (!flower) continue;
      const item = document.createElement('div');
      item.className = 'journal-flower-entry ' + (entry.liked ? 'liked' : 'disliked');
      item.innerHTML =
        `<span class="jf-dot" style="background:${flower.colors.bloom}"></span>` +
        `<span class="jf-name">${flower.name}</span>` +
        `<span class="jf-result">${entry.liked ? 'Loved it' : 'Turned away'}</span>`;
      list.appendChild(item);
    }

    section.appendChild(list);
    el.appendChild(section);
  }
}

// (Stable is now canvas-rendered in stable.js — journal.js handles only the journal)
