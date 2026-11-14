// Physical central stock includes pledged goods until their carrier picks up.
// The provisions module is a pure leaf; this import introduces no state cycle.
import { MATERIAL_IDS as DEVELOPMENT_MATERIALS, foodReservePlan, quoteConstructionFood, withdrawMilk } from './harborlight-v1-provisions.js?v=frontend-v32-2';
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
export const inventoryMaterialIds = state => state?.ruleset === 32 ? DEVELOPMENT_MATERIALS : MATERIALS;
const amount = value => Number.isFinite(value) ? Math.max(0, value) : 0;
export const BONUS_INVENTORY_VERSION = 1;

// resources is the full spendable balance. Reward goods have their own origin
// ledger: they can exceed ordinary warehouse capacity without occupying the
// places reserved for production and trade deliveries.
export const bonusStock = (state, resource) => inventoryMaterialIds(state).includes(resource) ?
  Math.min(amount(state.resources?.[resource]), amount(state.bonusMaterials?.[resource])) : 0;
export const ordinaryStock = (state, resource) => Math.max(0, amount(state.resources?.[resource]) - bonusStock(state, resource));
export const ordinaryWarehouseUsed = state => inventoryMaterialIds(state).reduce((sum, resource) => sum + ordinaryStock(state, resource), 0);

export function normalizeBonusMaterials(state, raw = state) {
  const saved = { ...(raw.bonusMaterials || {}) };
  state.bonusMaterials = Object.fromEntries(inventoryMaterialIds(state).map(resource =>
    [resource, Math.min(amount(state.resources?.[resource]), amount(saved[resource]))]));
  state.bonusInventoryVersion = BONUS_INVENTORY_VERSION;
}

export function materialReward(state, values = {}) {
  if(state.ruleset!==32||!amount(values.food))return values;
  const converted={...values,flour:Math.floor(amount(values.flour))+Math.floor(amount(values.food))};delete converted.food;return converted;
}
export function grantBonusMaterials(state, values = {}, options = {}) {
  if(options.preserveLegacyFood!==true)values=materialReward(state,values);
  normalizeBonusMaterials(state);
  const materials = inventoryMaterialIds(state);
  const additions = Object.fromEntries(materials.map(resource => [resource, Math.floor(amount(values[resource]))]));
  if (materials.some(resource => amount(state.resources?.[resource]) + additions[resource] > Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('The material reward exceeds the supported inventory balance.');
  }
  if(state.ruleset===32&&options.preserveLegacyFood!==true) {
    state.pendingDeliveries||={};
    if(materials.some(resource=>amount(state.pendingDeliveries[resource])+additions[resource]>Number.MAX_SAFE_INTEGER))throw new RangeError('The pending material reward exceeds the supported inventory balance.');
    for(const resource of materials)state.pendingDeliveries[resource]=amount(state.pendingDeliveries[resource])+additions[resource];
    return additions;
  }
  state.resources ||= {};
  for (const resource of materials) {
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
  if (inventoryMaterialIds(state).includes(resource)) {
    normalizeBonusMaterials(state);
    state.bonusMaterials[resource] -= Math.min(used, state.bonusMaterials[resource]);
  }
  if(state.ruleset === 32 && resource === 'rawMilk')withdrawMilk(state,used);
  else state.resources[resource] -= used;
  return used;
}

export function quoteMaterialSpend(state, values = {}, options = {}) {
  if(!values||typeof values!=='object'||Array.isArray(values))return {ok:false,message:'Nieprawidłowy koszt.'};
  const physical={...values},entries=Object.entries(values);
  if(entries.some(([id,n])=>!Number.isFinite(n)||n<0||id!=='coins'&&!inventoryMaterialIds(state).includes(id)))return {ok:false,message:'Nieprawidłowy koszt.'};
  if(state.ruleset === 32 && (values.food || 0)>0 && options.physicalFood !== true && !values.foodQuote) {
    delete physical.food;
    if(Object.entries(physical).some(([id,n])=>n>(id==='coins'?amount(state.resources?.coins):centralAvailable(state,id))+1e-8))return {ok:false,message:'Brakuje towarów ponad chronioną rezerwę.'};
    const quote=quoteConstructionFood(state,values.food,null,{available:id=>Math.max(0,centralUnreserved(state,id)-(physical[id]||0))});
    if(!quote.ok)return quote;for(const[id,n]of Object.entries(quote.materials))physical[id]=(physical[id]||0)+n;
  }
  const costs=Object.entries(physical);
  if(costs.some(([id,n])=>n>amount(state.resources?.[id])+1e-8||state.ruleset===32&&id!=='coins'&&n>centralAvailable(state,id)+1e-8))return {ok:false,message:'Brakuje towarów ponad chronioną rezerwę.'};
  return {ok:true,materials:physical};
}
export function spendMaterials(state, values = {}, options = {}) {
  const quote=quoteMaterialSpend(state,values,options);if(!quote.ok)return false;
  const entries = Object.entries(quote.materials);
  for (const [resource, value] of entries) consumeMaterial(state, resource, value);
  return true;
}
export function centralReserved(state, resource) {
  if (!inventoryMaterialIds(state).includes(resource)) return 0;
  const projects = (state.constructionProjects || []).reduce((sum, project) => sum + amount(project.reservedMaterials?.[resource]), 0);
  const market = (state.market?.orders || []).filter(order => order.resource === resource).reduce((sum, order) => sum + amount(order.amount), 0);
  const port = (state.dock?.orders || []).filter(order => order.direction === 'sell' && order.resource === resource && order.reservationVersion === 9 && !['expired', 'complete'].includes(order.stage)).reduce((sum, order) => sum + amount(order.remainingToPort), 0);
  return projects + market + port;
}
// Meals may consume the protected reserve, but never a pledged construction or
// trade delivery. All other v32 consumers use centralAvailable.
export const centralUnreserved = (state, resource) => Math.max(0, amount(state.resources?.[resource]) - centralReserved(state, resource));
export function centralAvailable(state, resource) {
  const free = centralUnreserved(state,resource);
  if(state.ruleset !== 32)return free;
  const reserve = foodReservePlan(state,{available:id=>centralUnreserved(state,id)}).materials;
  return Math.max(0,free-(reserve[resource]||0));
}
