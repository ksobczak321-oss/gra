// Exact canonical public model copies are verified by stage_backend_trade_rules.py.
// No browser runtime, credentials or simulation are part of this adapter.
import { GOODS, availableGoods, withdrawMilk, depositMilk, compactDietHistories } from './harborlight-v1-provisions.js';
import { warehouseCapacityForLevel } from './harborlight-v1-economy.js';

export const CURRENT_TRADE_RULES = Object.freeze({
  goods: GOODS, availableGoods, withdrawMilk, depositMilk,
  warehouseCapacityForLevel, compactDietHistories
});
