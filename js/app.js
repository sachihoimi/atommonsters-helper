/**
 * ATOMMONSTERS Helper - UI Controller
 */

import {
  classifyCompounds,
  normalizeInventory,
  searchByElements,
} from './logic.js';

const LONG_PRESS_MS = 500;
const STORAGE_KEY = 'atommonsters_inventory';
const PACK_KEY    = 'atommonsters_pack';

const PACK_LEVEL = { basic: 0, green: 1, purple: 2 };

let compounds = [];
let atoms     = [];
let inventory = {};
let activePack   = 'purple';
let almostThreshold = 1;

// --- 初期化 ---

async function init() {
  const [compoundsRes, atomsRes] = await Promise.all([
    fetch('./data/compounds.json'),
    fetch('./data/atoms.json'),
  ]);
  compounds = await compoundsRes.json();
  atoms     = await atomsRes.json();

  const savedInv  = localStorage.getItem(STORAGE_KEY);
  const savedPack = localStorage.getItem(PACK_KEY);
  if (savedInv)  try { inventory = JSON.parse(savedInv); } catch { inventory = {}; }
  if (savedPack) activePack = savedPack;

  // パック選択タブ
  document.querySelectorAll('.pack-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pack === activePack);
    btn.addEventListener('click', () => {
      activePack = btn.dataset.pack;
      localStorage.setItem(PACK_KEY, activePack);
      document.querySelectorAll('.pack-tab').forEach(b =>
        b.classList.toggle('active', b.dataset.pack === activePack)
      );
      renderAtomButtons();
      renderResults();
    });
  });

  // しきい値
  document.getElementById('threshold-select').addEventListener('change', (e) => {
    almostThreshold = Number(e.target.value);
    renderResults();
  });

  // 逆引き
  document.getElementById('search-input').addEventListener('input', (e) => {
    renderReverseSearch(e.target.value.trim());
  });

  // リセット
  document.getElementById('reset-btn').addEventListener('click', () => {
    inventory = {};
    saveInventory();
    updateAllCounts();
    renderResults();
  });

  renderAtomButtons();
  renderResults();
}

// --- パックフィルタ ---

function isPackEnabled(pack) {
  return PACK_LEVEL[pack] <= PACK_LEVEL[activePack];
}

function filteredCompounds() {
  return compounds.filter(c => isPackEnabled(c.pack));
}

function filteredAtoms() {
  return atoms.filter(a => isPackEnabled(a.pack));
}

// --- 原子ボタン描画 ---

function renderAtomButtons() {
  const container = document.getElementById('atom-buttons');
  container.innerHTML = '';

  for (const atom of filteredAtoms()) {
    const { symbol } = atom;
    const wrap = document.createElement('div');
    wrap.className = 'atom-cell';
    wrap.dataset.el = symbol;

    const btn = document.createElement('button');
    btn.className = 'atom-btn';
    btn.title = atom.name;

    if (atom.image) {
      const img = document.createElement('img');
      img.src = atom.image;
      img.alt = symbol;
      img.className = 'atom-img';
      btn.appendChild(img);
    }
    const label = document.createElement('span');
    label.className = 'atom-label';
    label.textContent = symbol;
    btn.appendChild(label);

    const countEl = document.createElement('span');
    countEl.className = 'atom-count';
    countEl.id = `count-${symbol}`;
    countEl.textContent = inventory[symbol] ?? 0;
    if ((inventory[symbol] ?? 0) > 0) countEl.classList.add('has-count');

    const minusBtn = document.createElement('button');
    minusBtn.className = 'atom-minus';
    minusBtn.textContent = '−';

    btn.addEventListener('click', () => changeCount(symbol, 1));
    minusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      changeCount(symbol, -1);
    });

    // 長押しで0にリセット
    let pressTimer;
    btn.addEventListener('pointerdown', () => {
      pressTimer = setTimeout(() => {
        inventory[symbol] = 0;
        updateCount(symbol);
        renderResults();
        saveInventory();
      }, LONG_PRESS_MS);
    });
    btn.addEventListener('pointerup',    () => clearTimeout(pressTimer));
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
  for (const atom of atoms) updateCount(atom.symbol);
}

// --- 結果描画 ---

function renderResults() {
  const norm = normalizeInventory(inventory);
  const visible = filteredCompounds();
  const { available, almostCraftable, unavailable } = classifyCompounds(
    visible, norm, almostThreshold
  );

  renderSection('available-list', available, 'available');
  renderSection('almost-list', almostCraftable, 'almost');
  renderSection('unavailable-list', unavailable, 'unavailable');

  document.getElementById('available-count').textContent = available.length;
  document.getElementById('almost-count').textContent   = almostCraftable.length;

  // 合計得点
  const totalPoints = available.reduce((s, c) => s + c.points, 0);
  const potentialPoints = [...available, ...almostCraftable].reduce((s, c) => s + c.points, 0);
  document.getElementById('total-points').textContent     = totalPoints;
  document.getElementById('potential-points').textContent = potentialPoints;
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
  const packBadge = `<span class="pack-badge pack-${c.pack}">${c.pack}</span>`;
  const todoMark  = c.todo ? '<span class="todo-mark">?</span>' : '';

  const imgHtml = c.image
    ? `<img src="${c.image}" alt="${c.name}" class="compound-img" loading="lazy" />`
    : `<div class="compound-img no-img">?</div>`;

  const elementsStr = Object.entries(c.elements)
    .map(([el, n]) => `${el}×${n}`)
    .join(' ');

  let extraHtml = '';
  if (mode === 'almost' || mode === 'unavailable') {
    const missingStr = Object.entries(c.missing)
      .map(([el, n]) => `<span class="missing-el">${el}×${n}</span>`)
      .join('');
    extraHtml = `<div class="missing-info">不足: ${missingStr}</div>`;
  }

  return `
    <li class="compound-card ${mode}">
      ${imgHtml}
      <div class="compound-body">
        <div class="compound-header">
          <span class="compound-name">${c.name}${todoMark}</span>
          <span class="compound-pts">${c.points}pt</span>
        </div>
        <div class="compound-sub">
          <span class="compound-formula">${c.formula}</span>
          ${packBadge}
        </div>
        <div class="compound-elements">${elementsStr}</div>
        ${extraHtml}
      </div>
    </li>`;
}

// --- 逆引き検索 ---

function renderReverseSearch(query) {
  const resultEl = document.getElementById('reverse-results');
  if (!query) { resultEl.innerHTML = ''; return; }

  const elements = query.toUpperCase().split(/[\s,、]+/).filter(Boolean);
  const found = searchByElements(elements, filteredCompounds(), false);

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
