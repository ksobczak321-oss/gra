// Physical central stock includes pledged goods until their carrier picks up.
// No imports: residents, logistics and commands share the same availability.
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const amount = value => Number.isFinite(value) ? Math.max(0, value) : 0;
export const BONUS_INVENTORY_VERSION = 1;

// resources is the full spendable balance. Reward goods have their own origin
// ledger: they can exceed ordinary warehouse capacity without occupying the
// places reserved for production and trade deliveries.
export const bonusStock = (state, resource) => MATERIALS.includes(resource) ?
  Math.min(amount(state.resources?.[resource]), amount(state.bonusMaterials?.[resource])) : 0;
export const ordinaryStock = (state, resource) => Math.max(0, amount(state.resources?.[resource]) - bonusStock(state, resource));
export const ordinaryWarehouseUsed = state => MATERIALS.reduce((sum, resource) => sum + ordinaryStock(state, resource), 0);

export function normalizeBonusMaterials(state, raw = state) {
  const saved = { ...(raw.bonusMaterials || {}) };
  state.bonusMaterials = Object.fromEntries(MATERIALS.map(resource =>
    [resource, Math.min(amount(state.resources?.[resource]), amount(saved[resource]))]));
  state.bonusInventoryVersion = BONUS_INVENTORY_VERSION;
}

export function grantBonusMaterials(state, values = {}) {
  normalizeBonusMaterials(state);
  const additions = Object.fromEntries(MATERIALS.map(resource => [resource, Math.floor(amount(values[resource]))]));
  if (MATERIALS.some(resource => amount(state.resources?.[resource]) + additions[resource] > Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('The material reward exceeds the supported inventory balance.');
  }
  state.resources ||= {};
  for (const resource of MATERIALS) {
    state.resources[resource] = amount(state.resources[resource]) + additions[resource];
    state.bonusMaterials[resource] += additions[resource];
  }
  return additions;
}

// Callers validate free/reserved availability for their own operation. This
// primitive also serves physical pickup of goods already pledged to a project.
// Fractional Food is supported for meals; integer commands validate separately.
export function consumeMaterial(state, resource, requested) {
  const used = Math.min(amount(requested), amount(state.resources?.[resource]));
  if (!(used > 0)) return 0;
  if (MATERIALS.includes(resource)) {
    normalizeBonusMaterials(state);
    state.bonusMaterials[resource] -= Math.min(used, state.bonusMaterials[resource]);
  }
  state.resources[resource] -= used;
  return used;
}

export function spendMaterials(state, values = {}) {
  const entries = Object.entries(values);
  if (entries.some(([resource, value]) => !Number.isFinite(value) || value < 0 || value > amount(state.resources?.[resource]))) return false;
  for (const [resource, value] of entries) consumeMaterial(state, resource, value);
  return true;
}
export function centralReserved(state, resource) {
  if (!MATERIALS.includes(resource)) return 0;
  const projects = (state.constructionProjects || []).reduce((sum, project) => sum + amount(project.reservedMaterials?.[resource]), 0);
  const market = (state.market?.orders || []).filter(order => order.resource === resource).reduce((sum, order) => sum + amount(order.amount), 0);
  const port = (state.dock?.orders || []).filter(order => order.direction === 'sell' && order.resource === resource && order.reservationVersion === 9 && !['expired', 'complete'].includes(order.stage)).reduce((sum, order) => sum + amount(order.remainingToPort), 0);
  return projects + market + port;
}
// Meals may eat the protected Food reserve; player spending applies that
// separate reserve in logistics.availableGoods instead.
export const centralAvailable = (state, resource) => Math.max(0, amount(state.resources?.[resource]) - centralReserved(state, resource));
