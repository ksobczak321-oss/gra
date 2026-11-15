// A single coherent atlas for all resource cards. Coordinates are presentation
// only: product identity, prices and production routing live in the game model.
export const GOODS_ART_GRID = Object.freeze({ columns: 6, rows: 4 });
export const GOODS_ART_ATLAS = 'assets/harborlight-goods-v32.png';
const tiles = [
  ['wood', 'Drewno'], ['stone', 'Kamień'], ['grain', 'Zboże'], ['planks', 'Deski'], ['vegetables', 'Warzywa'], ['livestock', 'Żywiec'],
  ['rawMilk', 'Surowe mleko'], ['sourMilk', 'Kwaśne mleko'], ['fish', 'Ryby'], ['flour', 'Mąka'], ['pasteurizedMilk', 'Mleko pasteryzowane'], ['meat', 'Mięso'],
  ['leather', 'Skóry'], ['bread', 'Chleb'], ['cake', 'Ciasto'], ['cheese', 'Ser'], ['civilianClothes', 'Strój cywilny'], ['militaryClothes', 'Strój wojskowy'],
  ['professorRobes', 'Szata profesorska'], ['smokedFish', 'Ryba wędzona'], ['fishPreserves', 'Przetwory rybne'], ['bran', 'Otręby'], ['animalFeed', 'Pasza'], ['food', 'Dawna żywność']
];
export const GOODS_ART = Object.freeze(Object.fromEntries(tiles.map(([id, label], index) => [id, Object.freeze({
  label, column: index % GOODS_ART_GRID.columns, row: Math.floor(index / GOODS_ART_GRID.columns)
})])));

/** Keep the existing dock frame while fitting its square sprite without stretch. */
export function resourceGraphic(resource, { label } = {}) {
  const tile = Object.hasOwn(GOODS_ART, resource) ? GOODS_ART[resource] : null;
  const frame = document.createElement('span');
  frame.className = 'resource-dock-illustration goods-icon';
  frame.dataset.resourceIcon = String(resource);
  frame.setAttribute('role', 'img');
  frame.setAttribute('aria-label', label || tile?.label || 'Zasób');
  frame.setAttribute('data-i18n-ignore', '');
  const sprite = document.createElement('span');
  sprite.setAttribute('aria-hidden', 'true');
  if (tile) {
    sprite.className = 'goods-icon-sprite';
    sprite.style.backgroundPosition = `${100 * tile.column / (GOODS_ART_GRID.columns - 1)}% ${100 * tile.row / (GOODS_ART_GRID.rows - 1)}%`;
  } else {
    frame.dataset.resourceIconFallback = 'true';
    sprite.className = 'goods-icon-fallback';
    sprite.textContent = '?';
  }
  frame.append(sprite);
  return frame;
}
