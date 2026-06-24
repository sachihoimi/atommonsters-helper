/**
 * ATOMMONSTERS Helper - UI Controller
 */

import {
  classifyCompounds,
  extractAllElements,
  normalizeInventory,
  searchByElements,
} from './logic.js';

const LONG_PRESS_MS = 500;
const STORAGE_KEY = 'atommonsters_inventory';

let compounds = [];
let inventory = {};
let almostThreshold = 1;

// --- 初期化 ---

async function init() {
  const res = await fetch('./data/compounds.json');
  compounds = await res.json();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { inventory = JSON.parse(saved); } catch { inventory = {}; }
  }

  renderAtomButtons();
  renderResults();

  document.getElementById('threshold-select').addEventListener('change', (e) => {
    almostThreshold = Number(e.target.value);
    renderResults();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    renderReverseSearch(e.target.value.trim());
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    inventory = {};
    saveInventory();
    updateAllCounts();
    renderResults();
  });
}

// --- 原子ボタン描画 ---

function renderAtomButtons() {
  const container = document.getElementById('atom-buttons');
  container.innerHTML = '';
  const elements = extractAllElements(compounds);

  for (const el of elements) {
    const wrap = document.createElement('div');
    wrap.className = 'atom-cell';
    wrap.dataset.el = el;

    const btn = document.createElement('button');
    btn.className = 'atom-btn';
    btn.textContent = el;

    const countEl = document.createElement('span');
    countEl.className = 'atom-count';
    countEl.id = `count-${el}`;
    countEl.textContent = inventory[el] ?? 0;

    const minusBtn = document.createElement('button');
    minusBtn.className = 'atom-minus';
    minusBtn.textContent = '−';

    // タップで+1
    btn.addEventListener('click', () => changeCount(el, 1));

    // マイナスボタンで-1
    minusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      changeCount(el, -1);
    });

    // 長押しで0にリセット
    let pressTimer;
    btn.addEventListener('pointerdown', () => {
      pressTimer = setTimeout(() => {
        inventory[el] = 0;
        updateCount(el);
        renderResults();
        saveInventory();
      }, LONG_PRESS_MS);
    });
    btn.addEventListener('pointerup', () => clearTimeout(pressTimer));
    btn.addEventListener('pointerleave', () => clearTimeout(pressTimer));

    wrap.appendChild(btn);
    wrap.appendChild(countEl);
    wrap.appendChild(minusBtn);
    container.appendChild(wrap);
  }
}

function changeCount(el, delta) {
  inventory[el] = Math.max(0, (inventory[el] ?? 0) + delta);
  updateCount(el);
  renderResults();
  saveInventory();
}

function updateCount(el) {
  const el_ = document.getElementById(`count-${el}`);
  if (el_) {
    el_.textContent = inventory[el] ?? 0;
    el_.classList.toggle('has-count', (inventory[el] ?? 0) > 0);
  }
}

function updateAllCounts() {
  const elements = extractAllElements(compounds);
  for (const el of elements) updateCount(el);
}

// --- 結果描画 ---

function renderResults() {
  const norm = normalizeInventory(inventory);
  const { available, almostCraftable, unavailable } = classifyCompounds(
    compounds,
    norm,
    almostThreshold
  );

  renderSection('available-list', available, 'available');
  renderSection('almost-list', almostCraftable, 'almost');
  renderSection('unavailable-list', unavailable, 'unavailable');

  document.getElementById('available-count').textContent = available.length;
  document.getElementById('almost-count').textContent = almostCraftable.length;
}

function renderSection(containerId, items, mode) {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = '<li class="empty-msg">なし</li>';
    return;
  }
  container.innerHTML = items.map((c) => compoundCard(c, mode)).join('');
}

function compoundCard(c, mode) {
  const elementsStr = Object.entries(c.elements)
    .map(([el, n]) => `${el}×${n}`)
    .join(' ');

  let extraHtml = '';
  if (mode === 'almost' || mode === 'unavailable') {
    const missingStr = Object.entries(c.missing)
      .map(([el, n]) => `<span class="missing-el">${el}×${n}</span>`)
      .join(' ');
    extraHtml = `<div class="missing-info">不足: ${missingStr}</div>`;
  }

  return `
    <li class="compound-card ${mode}">
      <div class="compound-header">
        <span class="compound-name">${c.name}</span>
        <span class="compound-formula">${c.formula}</span>
      </div>
      <div class="compound-elements">${elementsStr}</div>
      ${extraHtml}
    </li>`;
}

// --- 逆引き検索 ---

function renderReverseSearch(query) {
  const resultEl = document.getElementById('reverse-results');
  if (!query) { resultEl.innerHTML = ''; return; }

  const elements = query.toUpperCase().split(/[\s,]+/).filter(Boolean);
  const found = searchByElements(elements, compounds, false);

  if (found.length === 0) {
    resultEl.innerHTML = '<li class="empty-msg">該当なし</li>';
    return;
  }
  resultEl.innerHTML = found.map((c) => compoundCard(c, 'search')).join('');
}

// --- 永続化 ---

function saveInventory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

// --- 起動 ---
init();
