/**
 * ATOMMONSTERS Helper - Core Logic
 * 化合物検索・合成判定ロジック
 */

/**
 * 所持原子で化合物が作成可能か判定する
 * @param {Object} compound - 化合物データ
 * @param {Object} inventory - 所持原子 { "H": 3, "O": 2, ... }
 * @returns {boolean}
 */
export function canCraft(compound, inventory) {
  return Object.entries(compound.elements).every(
    ([el, needed]) => (inventory[el] ?? 0) >= needed
  );
}

/**
 * 化合物を作るのに不足している原子数の合計を返す
 * @param {Object} compound
 * @param {Object} inventory
 * @returns {number} 不足原子数の合計（0なら作成可能）
 */
export function shortageCount(compound, inventory) {
  return Object.entries(compound.elements).reduce((total, [el, needed]) => {
    const have = inventory[el] ?? 0;
    return total + Math.max(0, needed - have);
  }, 0);
}

/**
 * 不足している原子とその個数を返す
 * @param {Object} compound
 * @param {Object} inventory
 * @returns {Object} { "H": 1, "O": 2 } など（不足なければ空オブジェクト）
 */
export function getMissingElements(compound, inventory) {
  const missing = {};
  for (const [el, needed] of Object.entries(compound.elements)) {
    const have = inventory[el] ?? 0;
    if (have < needed) {
      missing[el] = needed - have;
    }
  }
  return missing;
}

/**
 * あとN個以下の不足で作れる化合物か判定する
 * @param {Object} compound
 * @param {Object} inventory
 * @param {number} threshold - 許容不足数（デフォルト1）
 * @returns {boolean}
 */
export function isAlmostCraftable(compound, inventory, threshold = 1) {
  const shortage = shortageCount(compound, inventory);
  return shortage > 0 && shortage <= threshold;
}

/**
 * 作成可能な化合物一覧を返す
 * @param {Array} compounds - 全化合物データ
 * @param {Object} inventory
 * @returns {Array} 作成可能な化合物の配列
 */
export function getAvailableCompounds(compounds, inventory) {
  return compounds.filter((c) => canCraft(c, inventory));
}

/**
 * 作成不可能な化合物を不足数でソートして返す（不足が少ない順）
 * @param {Array} compounds
 * @param {Object} inventory
 * @returns {Array} { ...compound, shortage, missing } の配列
 */
export function getUnavailableCompounds(compounds, inventory) {
  return compounds
    .filter((c) => !canCraft(c, inventory))
    .map((c) => ({
      ...c,
      shortage: shortageCount(c, inventory),
      missing: getMissingElements(c, inventory),
    }))
    .sort((a, b) => a.shortage - b.shortage);
}

/**
 * あと1個（またはN個）で作れる化合物を返す
 * @param {Array} compounds
 * @param {Object} inventory
 * @param {number} threshold
 * @returns {Array} { ...compound, shortage, missing } の配列
 */
export function getAlmostCraftable(compounds, inventory, threshold = 1) {
  return compounds
    .filter((c) => isAlmostCraftable(c, inventory, threshold))
    .map((c) => ({
      ...c,
      shortage: shortageCount(c, inventory),
      missing: getMissingElements(c, inventory),
    }))
    .sort((a, b) => a.shortage - b.shortage);
}

/**
 * 特定の元素を含む化合物を逆引きする
 * @param {string|string[]} elements - 元素記号または配列
 * @param {Array} compounds
 * @param {boolean} matchAll - trueなら全要素を含むもの、falseならいずれかを含むもの
 * @returns {Array}
 */
export function searchByElements(elements, compounds, matchAll = false) {
  const targets = Array.isArray(elements) ? elements : [elements];
  if (matchAll) {
    return compounds.filter((c) =>
      targets.every((el) => el in c.elements)
    );
  }
  return compounds.filter((c) =>
    targets.some((el) => el in c.elements)
  );
}

/**
 * 現在のインベントリから全分類結果を一括取得する
 * @param {Array} compounds
 * @param {Object} inventory
 * @param {number} almostThreshold
 * @returns {{ available, almostCraftable, unavailable }}
 */
export function classifyCompounds(compounds, inventory, almostThreshold = 1) {
  const available = [];
  const almostCraftable = [];
  const unavailable = [];

  for (const c of compounds) {
    const shortage = shortageCount(c, inventory);
    if (shortage === 0) {
      available.push(c);
    } else if (shortage <= almostThreshold) {
      almostCraftable.push({
        ...c,
        shortage,
        missing: getMissingElements(c, inventory),
      });
    } else {
      unavailable.push({
        ...c,
        shortage,
        missing: getMissingElements(c, inventory),
      });
    }
  }

  unavailable.sort((a, b) => a.shortage - b.shortage);
  almostCraftable.sort((a, b) => a.shortage - b.shortage);

  return { available, almostCraftable, unavailable };
}

/**
 * インベントリの検証・正規化（負の値を0に、非整数を整数に）
 * @param {Object} inventory
 * @returns {Object}
 */
export function normalizeInventory(inventory) {
  const result = {};
  for (const [el, count] of Object.entries(inventory)) {
    const val = Math.max(0, Math.floor(Number(count) || 0));
    if (val > 0) result[el] = val;
  }
  return result;
}

/**
 * 化合物データから使用されている全元素一覧を抽出する
 * @param {Array} compounds
 * @returns {string[]} ソート済み元素記号の配列
 */
export function extractAllElements(compounds) {
  const elementSet = new Set();
  for (const c of compounds) {
    for (const el of Object.keys(c.elements)) {
      elementSet.add(el);
    }
  }
  return [...elementSet].sort();
}
