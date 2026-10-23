// Physical central stock includes pledged goods until their carrier picks up.
// No imports: residents, logistics and commands share the same availability.
const MATERIALS = ['wood', 'stone', 'grain', 'food', 'planks'];
const amount = value => Number.isFinite(value) ? Math.max(0, value) : 0;
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
