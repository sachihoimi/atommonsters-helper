/**
 * logic.js のユニットテスト（Node.js で直接実行可能）
 * 実行: node --experimental-vm-modules js/logic.test.js
 * または: node js/logic.test.js  (ESM import は --input-type=module で)
 */

import {
  canCraft,
  shortageCount,
  getMissingElements,
  isAlmostCraftable,
  getAvailableCompounds,
  getUnavailableCompounds,
  getAlmostCraftable,
  classifyCompounds,
  normalizeInventory,
  extractAllElements,
  searchByElements,
} from './logic.js';

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

const WATER = { id: 'water', name: '水', formula: 'H2O', elements: { H: 2, O: 1 } };
const CO2   = { id: 'co2',   name: '二酸化炭素', formula: 'CO2', elements: { C: 1, O: 2 } };
const NH3   = { id: 'nh3',   name: 'アンモニア', formula: 'NH3', elements: { N: 1, H: 3 } };
const GLUCOSE = { id: 'glucose', name: 'グルコース', formula: 'C6H12O6', elements: { C: 6, H: 12, O: 6 } };
const ALL = [WATER, CO2, NH3, GLUCOSE];

console.log('\n--- canCraft ---');
assert('H:2 O:1 → water OK', canCraft(WATER, { H: 2, O: 1 }), true);
assert('H:3 O:1 → water OK (余剰OK)', canCraft(WATER, { H: 3, O: 1 }), true);
assert('H:1 O:1 → water NG', canCraft(WATER, { H: 1, O: 1 }), false);
assert('空 inventory → water NG', canCraft(WATER, {}), false);

console.log('\n--- shortageCount ---');
assert('H:1 O:1 で water → 不足1', shortageCount(WATER, { H: 1, O: 1 }), 1);
assert('H:0 O:0 で water → 不足3', shortageCount(WATER, {}), 3);
assert('H:2 O:1 で water → 不足0', shortageCount(WATER, { H: 2, O: 1 }), 0);

console.log('\n--- getMissingElements ---');
assert('H:1 O:1 で water → {H:1}', getMissingElements(WATER, { H: 1, O: 1 }), { H: 1 });
assert('全不足で water → {H:2, O:1}', getMissingElements(WATER, {}), { H: 2, O: 1 });
assert('充足で water → {}', getMissingElements(WATER, { H: 2, O: 1 }), {});

console.log('\n--- isAlmostCraftable ---');
assert('H:1 O:1 で water (threshold=1) → true', isAlmostCraftable(WATER, { H: 1, O: 1 }, 1), true);
assert('H:0 O:1 で water (threshold=1) → false (不足2)', isAlmostCraftable(WATER, { O: 1 }, 1), false);
assert('充足で water → false', isAlmostCraftable(WATER, { H: 2, O: 1 }, 1), false);

console.log('\n--- classifyCompounds ---');
{
  const inv = { H: 2, O: 2 }; // waterとCO2が作れる（C不足でCO2はNG, NH3もNG）
  // water: H:2 O:1 → OK
  // CO2: C:1 O:2 → NG (C不足1)
  // NH3: N:1 H:3 → NG (H不足1, N不足1) → shortage=2
  // glucose → NG (C不足6 H不足10 O不足4) → shortage=20
  const result = classifyCompounds(ALL, inv, 1);
  assert('available: [water]', result.available.map(c => c.id), ['water']);
  assert('almost: [co2]', result.almostCraftable.map(c => c.id), ['co2']);
  assert('unavailable first: nh3', result.unavailable[0].id, 'nh3');
}

console.log('\n--- searchByElements ---');
assert('H を含む化合物', searchByElements('H', ALL).map(c => c.id), ['water', 'nh3', 'glucose']);
assert('[C, N] いずれか含む', searchByElements(['C', 'N'], ALL, false).map(c => c.id), ['co2', 'nh3', 'glucose']);
assert('[C, O] 両方含む', searchByElements(['C', 'O'], ALL, true).map(c => c.id), ['co2', 'glucose']);

console.log('\n--- normalizeInventory ---');
assert('負数を0に', normalizeInventory({ H: -1, O: 2 }), { O: 2 });
assert('小数を整数に', normalizeInventory({ H: 2.9, O: 1.1 }), { H: 2, O: 1 });
assert('0は除外', normalizeInventory({ H: 0, O: 1 }), { O: 1 });

console.log('\n--- extractAllElements ---');
{
  const els = extractAllElements([WATER, CO2]);
  assert('H,O,C を含む', els.includes('H') && els.includes('O') && els.includes('C'), true);
}

console.log(`\n結果: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
