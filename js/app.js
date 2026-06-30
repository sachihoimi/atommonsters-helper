/**
 * ATOMMONSTERS Helper - UI Controller
 */

import {
  classifyCompounds,
  normalizeInventory,
  searchByElements,
  getMissingElements,
} from './logic.js';
import { initPeriodicPage } from './periodic.js';

const LONG_PRESS_MS = 500;
const STORAGE_KEY = 'atommonsters_inventory';
const PACK_KEY    = 'atommonsters_pack';
const GOTTEN_KEY  = 'atommonsters_gotten';
const THEME_KEY   = 'atommonsters_theme';

const THEMES      = ['space', 'candy', 'aqua', 'sunshine', 'berry'];
const THEME_EMOJI = { space: '🌌', candy: '🍭', aqua: '🌊', sunshine: '☀️', berry: '🍇' };
let activeTheme   = THEMES.includes(localStorage.getItem(THEME_KEY)) ? localStorage.getItem(THEME_KEY) : 'space';

function cycleTheme() {
  const idx = THEMES.indexOf(activeTheme);
  activeTheme = THEMES[(idx + 1) % THEMES.length];
  document.documentElement.dataset.theme = activeTheme;
  localStorage.setItem(THEME_KEY, activeTheme);
  document.getElementById('theme-btn').textContent = THEME_EMOJI[activeTheme];
}

const PACK_ATOMS = {
  basic:  { H: 10, He: 2, C: 6, N: 5, O: 8, Fe: 1 },
  green:  { Cl: 7, O: 4, Mg: 1, Ne: 1, Cu: 1, Na: 4, S: 3, Al: 2 },
  purple: { F: 8, K: 5, Be: 4, Ca: 3, Zn: 3, Ar: 2, Cu: 1 },
};

const PACK_LEVEL = { basic: 0, green: 1, purple: 2 };

let compounds       = [];
let atoms           = [];
let inventory       = {};
let gottenCompounds = [];
let activePack      = 'purple';
const almostThreshold = 99;
const MAX_SUMMON = 2;
let _lastAvailableRender = { items: [], msg: '', cls: '' };

// --- 初期化 ---

async function init() {
  const [compoundsRes, atomsRes] = await Promise.all([
    fetch('./data/compounds.json'),
    fetch('./data/atoms.json'),
  ]);
  compounds = await compoundsRes.json();
  atoms     = await atomsRes.json();

  const savedInv    = localStorage.getItem(STORAGE_KEY);
  const savedPack   = localStorage.getItem(PACK_KEY);
  const savedGotten = localStorage.getItem(GOTTEN_KEY);
  if (savedInv)    try { inventory = JSON.parse(savedInv); } catch { inventory = {}; }
  if (savedPack)   activePack = savedPack;
  if (savedGotten) try { gottenCompounds = JSON.parse(savedGotten); } catch { gottenCompounds = []; }

  // パック選択（デスクトップ select）
  const packSelect = document.getElementById('pack-select');
  packSelect.value = activePack;
  packSelect.addEventListener('change', () => {
    activePack = packSelect.value;
    localStorage.setItem(PACK_KEY, activePack);
    syncPackCheckboxes();
    renderAtomButtons();
    renderResults();
  });

  // パック選択（SP チェックボックス）
  function syncPackCheckboxes() {
    const green  = document.getElementById('sp-pack-green');
    const purple = document.getElementById('sp-pack-purple');
    if (!green || !purple) return;
    green.checked  = activePack === 'green'  || activePack === 'purple';
    purple.checked = activePack === 'purple';
  }
  function applyPackChange() {
    packSelect.value = activePack;
    localStorage.setItem(PACK_KEY, activePack);
    renderAtomButtons();
    renderResults();
  }
  document.getElementById('sp-pack-green').addEventListener('change', (e) => {
    if (e.target.checked) {
      activePack = 'green';
    } else {
      activePack = 'basic';
      document.getElementById('sp-pack-purple').checked = false;
    }
    applyPackChange();
  });
  document.getElementById('sp-pack-purple').addEventListener('change', (e) => {
    if (e.target.checked) {
      activePack = 'purple';
      document.getElementById('sp-pack-green').checked = true;
    } else {
      activePack = document.getElementById('sp-pack-green').checked ? 'green' : 'basic';
    }
    applyPackChange();
  });
  syncPackCheckboxes();

  // 逆引き
  document.getElementById('search-input').addEventListener('input', (e) => {
    renderReverseSearch(e.target.value.trim());
  });

  // ゲットする
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.get-btn');
    if (!btn) return;
    getCompound(btn.dataset.id);
    if (window.innerWidth < 640) closeAvailDrawer();
  });

  // 召喚リストモーダル
  const gottenModal  = document.getElementById('gotten-modal');
  const confirmModal = document.getElementById('confirm-modal');

  function openGottenModal() { renderGottenModal(); gottenModal.hidden = false; }
  function openConfirmModal() { confirmModal.hidden = false; }
  function doInit() {
    inventory = {};
    gottenCompounds = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(GOTTEN_KEY);
    updateAllCounts();
    renderResults();
    updateGottenBadge();
  }

  document.getElementById('gotten-btn').addEventListener('click', openGottenModal);
  document.getElementById('gotten-btn-sp').addEventListener('click', openGottenModal);
  document.getElementById('reset-btn-sp').addEventListener('click', () => document.getElementById('reset-btn').click());
  document.getElementById('modal-close').addEventListener('click', () => { gottenModal.hidden = true; });
  gottenModal.addEventListener('click', (e) => { if (e.target === gottenModal) gottenModal.hidden = true; });

  // 初期化確認
  document.getElementById('init-btn').addEventListener('click', openConfirmModal);
  document.getElementById('confirm-cancel').addEventListener('click', () => { confirmModal.hidden = true; });
  document.getElementById('confirm-ok').addEventListener('click', () => { confirmModal.hidden = true; doInit(); });
  confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) confirmModal.hidden = true; });

  // SP メニュー
  const menuBtn      = document.getElementById('menu-btn');
  const menuDropdown = document.getElementById('menu-dropdown');
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.hidden = !menuDropdown.hidden;
  });
  menuDropdown.addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) return;
    menuDropdown.hidden = true;
    if (item.dataset.action === 'init')   openConfirmModal();
    if (item.dataset.action === 'theme')  cycleTheme();
  });
  document.addEventListener('click', (e) => {
    if (!menuDropdown.hidden && !menuDropdown.contains(e.target) && e.target !== menuBtn) {
      menuDropdown.hidden = true;
    }
  });

  // リセット
  document.getElementById('reset-btn').addEventListener('click', () => {
    inventory = {};
    saveInventory();
    updateAllCounts();
    renderResults();
  });

  document.getElementById('theme-btn').addEventListener('click', cycleTheme);
  document.getElementById('theme-btn').textContent = THEME_EMOJI[activeTheme];

  // 化合物詳細モーダル
  const detailModal = document.getElementById('detail-modal');
  document.getElementById('detail-close').addEventListener('click', () => { detailModal.hidden = true; });
  detailModal.addEventListener('click', (e) => { if (e.target === detailModal) detailModal.hidden = true; });

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.compound-card');
    if (!card || e.target.closest('button')) return;
    const id = card.dataset.id;
    if (id) openDetailModal(id);
  });

  renderAtomButtons();
  renderResults();
  updateGottenBadge();

  // 周期表ページトグル
  const periodicPage = document.getElementById('periodic-page');
  const mainLayout   = document.querySelector('.main-layout');
  document.getElementById('periodic-toggle').addEventListener('click', () => {
    const show = periodicPage.hidden;
    periodicPage.hidden = !show;
    mainLayout.style.display = show ? 'none' : '';
    if (show) initPeriodicPage(atoms);
  });

  // スティッキーバッジ → ドロワー開閉
  const stickyBadge = document.getElementById('sticky-badge');
  const availDrawer  = document.getElementById('avail-drawer');

  // SP時: result-panel をドロワー内に移動
  if (window.innerWidth < 640) {
    const resultPanel  = document.querySelector('.result-panel');
    const drawerSheet  = document.getElementById('avail-drawer-sheet');
    if (resultPanel && drawerSheet) drawerSheet.appendChild(resultPanel);
  }

  function openAvailDrawer() {
    availDrawer.classList.remove('closing');
    availDrawer.classList.add('open');
  }
  function closeAvailDrawer() {
    availDrawer.classList.add('closing');
    availDrawer.addEventListener('transitionend', () => {
      availDrawer.classList.remove('open', 'closing');
    }, { once: true });
  }

  stickyBadge.addEventListener('click', openAvailDrawer);
  document.getElementById('avail-drawer-overlay').addEventListener('click', closeAvailDrawer);
}

const BADGE_LABELS = {
  empty:      'タップして！',
  available:  '取れるよ！',
  almost:     'めくれるよ！',
  bust:       'バトンタッチ',
  impossible: 'おしまい…',
};

function updateStickyBadge(count, state = 'empty') {
  const badge = document.getElementById('sticky-badge');
  const label = document.getElementById('sticky-label');
  const el    = document.getElementById('sticky-count');
  if (label) label.textContent = BADGE_LABELS[state] ?? '';
  if (el) el.textContent = count;
  if (badge) {
    badge.className = `sticky-badge badge-${state}`;
  }
}

// --- デッキ残数 ---

function computeRemainingAtoms() {
  const maxInv = getMaxInventory();
  const consumed = {};
  for (const c of gottenCompounds) {
    for (const [el, n] of Object.entries(c.elements)) {
      consumed[el] = (consumed[el] ?? 0) + n;
    }
  }
  const remaining = {};
  for (const [el, max] of Object.entries(maxInv)) {
    remaining[el] = Math.max(0, max - (inventory[el] ?? 0) - (consumed[el] ?? 0));
  }
  return remaining;
}

function isPossibleWithRemaining(compound, inv, remaining) {
  return Object.entries(compound.elements).every(([el, needed]) =>
    (inv[el] ?? 0) + (remaining[el] ?? 0) >= needed
  );
}

// --- パックフィルタ ---

function isPackEnabled(pack) {
  return PACK_LEVEL[pack] <= PACK_LEVEL[activePack];
}

function getMaxInventory() {
  const max = {};
  for (const [pack, atoms] of Object.entries(PACK_ATOMS)) {
    if (isPackEnabled(pack)) {
      for (const [el, n] of Object.entries(atoms)) {
        max[el] = (max[el] ?? 0) + n;
      }
    }
  }
  return max;
}

function getSummonCount(id) {
  return gottenCompounds.filter(c => c.id === id).length;
}

function filteredCompounds() {
  return compounds
    .filter(c => isPackEnabled(c.pack))
    .map(c => {
      const count = getSummonCount(c.id);
      return { ...c, summonRemaining: MAX_SUMMON - count, exhausted: count >= MAX_SUMMON };
    });
}

function filteredAtoms() {
  const max = getMaxInventory();
  return atoms
    .filter(a => isPackEnabled(a.pack))
    .sort((a, b) => (max[b.symbol] ?? 0) - (max[a.symbol] ?? 0));
}

// --- 原子ボタン描画 ---

function renderAtomButtons() {
  const remaining = computeRemainingAtoms();
  const container = document.getElementById('atom-buttons');
  container.innerHTML = '';

  for (const atom of filteredAtoms()) {
    const { symbol } = atom;
    const wrap = document.createElement('div');
    wrap.className = 'atom-cell';
    wrap.dataset.el = symbol;

    const btn = document.createElement('button');
    btn.className = 'atom-btn';
    if ((inventory[symbol] ?? 0) > 0) btn.classList.add('has-count');
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
    btn.appendChild(countEl);

    const remEl = document.createElement('span');
    remEl.className = 'atom-remaining';
    remEl.id = `remaining-${symbol}`;
    const rem = remaining[symbol] ?? 0;
    remEl.textContent = `残り${rem}`;
    if (rem === 0) { remEl.classList.add('depleted'); btn.classList.add('no-remaining'); }
    btn.appendChild(remEl);

    const minusBtn = document.createElement('button');
    minusBtn.className = 'atom-minus';
    minusBtn.textContent = '− 1';

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
    wrap.appendChild(minusBtn);
    container.appendChild(wrap);
  }
}

function changeCount(el, delta) {
  if (delta > 0) {
    const remaining = computeRemainingAtoms();
    if ((remaining[el] ?? 0) === 0) return;
  }
  const max = getMaxInventory()[el] ?? 99;
  inventory[el] = Math.min(max, Math.max(0, (inventory[el] ?? 0) + delta));
  updateCount(el);
  renderResults();
  saveInventory();
}

function getCompound(compoundId) {
  const compound = compounds.find(c => c.id === compoundId);
  if (!compound) return;
  for (const [el, needed] of Object.entries(compound.elements)) {
    inventory[el] = Math.max(0, (inventory[el] ?? 0) - needed);
  }
  gottenCompounds.push(compound);
  saveInventory();
  localStorage.setItem(GOTTEN_KEY, JSON.stringify(gottenCompounds));
  updateAllCounts();
  renderResults();
  updateGottenBadge();
}

function updateGottenBadge() {
  const n = gottenCompounds.length;
  for (const id of ['gotten-count', 'menu-gotten-count', 'gotten-count-sp']) {
    const el = document.getElementById(id);
    if (el) { el.textContent = n; el.classList.toggle('hidden', n === 0); }
  }
}

function renderGottenModal() {
  // 消費原子を集計
  const consumed = {};
  for (const c of gottenCompounds) {
    for (const [el, n] of Object.entries(c.elements)) {
      consumed[el] = (consumed[el] ?? 0) + n;
    }
  }

  const consumedEl = document.getElementById('consumed-atoms');
  if (Object.keys(consumed).length === 0) {
    consumedEl.innerHTML = '<p class="consumed-empty">まだなし</p>';
  } else {
    consumedEl.innerHTML =
      '<p class="consumed-label">消費した原子</p>' +
      '<div class="consumed-list">' +
      Object.entries(consumed).map(([el, n]) =>
        `<span class="consumed-atom">${el}<small>×${n}</small></span>`
      ).join('') +
      '</div>';
  }

  const listEl = document.getElementById('gotten-list');
  if (gottenCompounds.length === 0) {
    listEl.innerHTML = '<li class="empty-msg">まだなし 🧪</li>';
  } else {
    listEl.innerHTML = gottenCompounds.map(c => compoundCard(c, 'gotten')).join('');
  }
}

function updateCount(el) {
  const n = inventory[el] ?? 0;
  const countEl = document.getElementById(`count-${el}`);
  if (countEl) {
    countEl.textContent = n;
    countEl.classList.toggle('has-count', n > 0);
  }
  const cell = document.querySelector(`.atom-cell[data-el="${el}"]`);
  cell?.querySelector('.atom-btn')?.classList.toggle('has-count', n > 0);
}

function updateAllCounts() {
  for (const atom of atoms) updateCount(atom.symbol);
}

function updateAllRemaining() {
  const remaining = computeRemainingAtoms();
  for (const atom of filteredAtoms()) {
    const remEl = document.getElementById(`remaining-${atom.symbol}`);
    const rem = remaining[atom.symbol] ?? 0;
    if (remEl) {
      remEl.textContent = `残り${rem}`;
      remEl.classList.toggle('depleted', rem === 0);
    }
    const cell = document.querySelector(`.atom-cell[data-el="${atom.symbol}"]`);
    cell?.querySelector('.atom-btn')?.classList.toggle('no-remaining', rem === 0);
  }
}

// --- 結果描画 ---

function renderResults() {
  const norm = normalizeInventory(inventory);
  const visible = filteredCompounds();
  const exhausted = visible.filter(c => c.exhausted);
  const active    = visible.filter(c => !c.exhausted);
  const { available, almostCraftable, unavailable } = classifyCompounds(
    active, norm, almostThreshold
  );
  const allUnavailable = unavailable;
  const allAvailable = [
    ...available,
    ...exhausted.map(c => ({ ...c, shortage: 0, missing: {} })),
  ];

  const remaining = computeRemainingAtoms();
  updateAllRemaining();

  const markImpossible = (list) => list.map(c => c.exhausted ? c : ({
    ...c,
    impossible: !isPossibleWithRemaining(c, norm, remaining),
  }));

  const hasInventory = Object.values(inventory).some(n => n > 0);
  const isBust = hasInventory && allAvailable.length === 0 &&
    almostCraftable.every(c => !isPossibleWithRemaining(c, norm, remaining));
  const allImpossible = active.length > 0 &&
    active.every(c => !isPossibleWithRemaining(c, norm, remaining));

  let availableMsg, availableClass;
  if (allImpossible) {
    availableMsg  = 'もう作れる化合物はないよ…<br>ゲームおしまい！';
    availableClass = 'bust';
  } else if (!hasInventory) {
    availableMsg  = '原子を選んでね';
    availableClass = '';
  } else if (isBust) {
    availableMsg  = 'ざんねん！次のひとにバトンタッチ 🙈';
    availableClass = 'bust';
  } else if (available.length === 0) {
    availableMsg  = 'まだないよ！⚡ もう1枚めくってみて';
    availableClass = '';
  } else {
    availableMsg  = '';
    availableClass = '';
  }

  const sectionAvailable = document.getElementById('section-available');
  sectionAvailable.classList.toggle('section-can-take', available.length > 0);
  sectionAvailable.classList.toggle('section-bust', isBust);

  const markedAvailable = markImpossible(allAvailable);
  renderSection('available-list',   markedAvailable, 'available', availableMsg, availableClass);
  renderSection('almost-list',      markImpossible(almostCraftable), 'almost');
  renderSection('unavailable-list', markImpossible(allUnavailable), 'unavailable');

  document.getElementById('available-count').textContent = available.length;
  document.getElementById('almost-count').textContent   = almostCraftable.length;
  const badgeState = !hasInventory   ? 'empty'
    : allImpossible                  ? 'impossible'
    : isBust                         ? 'bust'
    : available.length > 0           ? 'available'
    : almostCraftable.length > 0     ? 'almost'
    :                                  'empty';
  updateStickyBadge(available.length, badgeState);
}

function renderSection(containerId, items, mode, emptyMsg = 'なし', emptyClass = '') {
  const container = document.getElementById(containerId);
  if (items.length === 0) {
    container.innerHTML = `<li class="empty-msg ${emptyClass}">${emptyMsg}</li>`;
    return;
  }
  container.innerHTML = items.map((c) => compoundCard(c, mode)).join('');
}

function compoundCard(c, mode) {
  if (c.exhausted) mode = 'unavailable';
  const isImpossible = c.impossible === true;
  const packBadge = `<span class="pack-badge pack-${c.pack}">${c.pack}</span>`;
  const todoMark  = c.todo ? '<span class="todo-mark">?</span>' : '';

  const imgHtml = c.image
    ? `<img src="${c.image}" alt="${c.name}" class="compound-img" loading="lazy" />`
    : `<div class="compound-img no-img">?</div>`;

  const summonTag = (c.summonRemaining !== undefined && c.summonRemaining < MAX_SUMMON)
    ? `<span class="summon-remaining">残り${c.summonRemaining}体</span>`
    : '';

  let extraHtml = '';
  if (mode === 'almost' || mode === 'unavailable') {
    const missingStr = Object.entries(c.missing)
      .flatMap(([el, n]) => Array(n).fill(`<span class="missing-el">${el}</span>`))
      .join('');
    extraHtml = `<div class="missing-info"><span class="missing-label">足りない:</span>${missingStr}</div>`;
  }

  const getBtn = (!c.exhausted && mode === 'available' && !isImpossible)
    ? `<button class="get-btn" data-id="${c.id}">召喚する</button>`
    : '';

  const impossibleClass = isImpossible ? ' impossible' : '';

  return `
    <li class="compound-card ${mode}${impossibleClass}" data-id="${c.id}">
      ${imgHtml}
      <div class="compound-body">
        <span class="compound-name">${c.name}${todoMark}</span>
        <div class="compound-sub">
          <span class="compound-formula">${c.formula}</span>
          ${packBadge}
          ${summonTag}
        </div>
        ${getBtn}
        ${extraHtml}
      </div>
      <span class="compound-pts">${c.points}pt</span>
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

// --- 化合物詳細モーダル ---

function openDetailModal(compoundId) {
  const compound = compounds.find(c => c.id === compoundId);
  if (!compound) return;

  const imgHtml = compound.image
    ? `<img src="${compound.image}" alt="${compound.name}" class="detail-img" />`
    : `<div class="detail-img no-img">?</div>`;

  const missing = getMissingElements(compound, normalizeInventory(inventory));
  const missingEntries = Object.entries(missing);
  const elementsHtml = missingEntries.length === 0
    ? '<span class="detail-craftable">揃ってる！</span>'
    : missingEntries.flatMap(([el, n]) => Array(n).fill(`<span class="missing-el">${el}</span>`)).join('');

  const summonCount = getSummonCount(compoundId);
  const remaining = MAX_SUMMON - summonCount;
  const summonHtml = summonCount > 0
    ? `<p class="detail-summon-remaining">残り${remaining}体召喚可能</p>`
    : '';

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-content-inner">
      <div class="detail-img-wrap">${imgHtml}</div>
      <div class="detail-info">
        <h2 class="detail-name">${compound.name}</h2>
        ${compound.reading ? `<p class="detail-reading">${compound.reading}</p>` : ''}
        <p class="detail-formula">${compound.formula}</p>
        <div class="detail-divider"></div>
        <div class="detail-pts-row">
          <span class="detail-pts">${compound.points}</span>
          <span class="detail-pts-label">pt</span>
        </div>
        <div class="missing-info detail-elements">
          <span class="missing-label">足りない:</span>
          ${elementsHtml}
        </div>
        ${summonHtml}
      </div>
    </div>
  `;

  document.getElementById('detail-modal').hidden = false;
}

// --- 永続化 ---

function saveInventory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
}

// --- 起動 ---
init();
