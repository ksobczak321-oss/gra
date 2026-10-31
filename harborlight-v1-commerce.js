// Optional storefront and rewarded-ad commands. Real money/provider receipts
// must be verified by a server. The browser can simulate only outside PROD.
import { MATERIAL_IDS, receiveMaterials, quoteInstantTransport, instantTransport, plannedLevel } from './harborlight-v1-logistics.js?v=frontend-v25-2';
import { quotePremiumBuilding } from './harborlight-v1-activities.js?v=frontend-v25-2';
import { engagementOfferStatus, completeEngagementOffer, claimInitialPremiumBonus } from './harborlight-v1-engagement.js?v=frontend-v25-2';

const DAY = 86400000;
const clock = state => Number.isFinite(state.worldTimeMs) ? state.worldTimeMs : Date.now();
const good = (message, details = {}) => ({ ok: true, message, ...details });
const bad = message => ({ ok: false, message });
const integer = n => Number.isSafeInteger(n) && n >= 0;
const object = n => n && typeof n === 'object' && !Array.isArray(n);
export const COIN_PACKAGES = Object.freeze([100,500,1000,2000,5000,10000,50000].map(grossGrosz => Object.freeze({ grossGrosz, coins: grossGrosz / 10 })));
export const COMMERCE_RULES = Object.freeze({ provider: 'Paynow', noAdsThresholdGrosz: 1999, noAdsWindowDays: 30, materialAdMinimum: 10, materialAdMaximum: 30, simulatedAdSeconds: 10 });
export const ACCOUNT_PROGRESS_FIELDS = Object.freeze(['commerce','loyalty','socialRewards','referrals','engagementSchedule','welcome']);
export function preserveAccountProgress(previous, next) {
  for(const field of ACCOUNT_PROGRESS_FIELDS) if(previous[field]!==undefined) next[field]=structuredClone(previous[field]);
  next.islandGeneration=previous.islandGeneration || 1;
  next.islandName=previous.islandName || '';
  if(previous.previewBuildStockVersion)next.previewBuildStockVersion=previous.previewBuildStockVersion;
  if(next.commerce){next.commerce.ad=null;for(const entry of next.commerce.checkouts || [])if(entry.status==='pending')entry.status='cancelled';}
  const offer=engagementOfferStatus(next);
  if(offer.pending && offer.started)completeEngagementOffer(next,{id:offer.id,choice:offer.choice});
  return next;
}

export function runtimeCapabilities(hostname = globalThis.location?.hostname || 'localhost') {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  const preprod = ['harborlight-dev.web.app', 'harborlight-dev.firebaseapp.com'].includes(hostname);
  const preview = hostname === 'ksobczak321-oss.github.io';
  return { environment: preprod ? 'preprod' : local || preview ? 'development' : 'production',
    simulatedAds: local || preprod || preview, simulatedPayments: local || preprod || preview };
}
function simulationAllowed(context = {}) {
  return context.devSimulation === true && context.environment !== 'production' && runtimeCapabilities().simulatedPayments;
}
export function normalizeCommerce(state, raw = state) {
  const saved = object(raw.commerce) ? raw.commerce : {};
  state.commerce = { version: 1, sequence: integer(saved.sequence) ? saved.sequence : 0,
    seed: (saved.seed >>> 0) || ((clock(state) >>> 0) ^ 0x7b193a21) || 1,
    receipts: (Array.isArray(saved.receipts) ? saved.receipts : []).filter(r => object(r) && typeof r.id === 'string' && integer(r.grossGrosz) && Number.isFinite(r.at)).map(r => ({ ...r })),
    checkouts: (Array.isArray(saved.checkouts) ? saved.checkouts : []).filter(c => object(c) && typeof c.id === 'string' && ['pending','complete','cancelled'].includes(c.status)).map(c => ({ ...c })),
    ad: object(saved.ad) && typeof saved.ad.nonce === 'string' ? { ...saved.ad } : null,
    adReceipts: [...new Set((Array.isArray(saved.adReceipts) ? saved.adReceipts : []).filter(x => typeof x === 'string'))],
    promoClaims: object(saved.promoClaims) ? { ...saved.promoClaims } : {} };
  return state.commerce;
}
function current(state) { return state.commerce || normalizeCommerce(state); }
function random(state, minimum, maximum) {
  const c = current(state); let x = c.seed >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5; c.seed = x >>> 0 || 1;
  return minimum + Math.floor(c.seed / 4294967296 * (maximum - minimum + 1));
}
export function commerceStatus(state) {
  const c = current(state), now = clock(state), simulated = runtimeCapabilities().simulatedPayments;
  const receipts = c.receipts.filter(r => !r.refunded && r.at <= now && r.at > now - 30 * DAY && (r.verified === true || simulated && r.simulated === true));
  const paidLast30DaysGrosz = receipts.reduce((sum, r) => sum + r.grossGrosz, 0);
  let remaining = paidLast30DaysGrosz, noAdsUntil = null;
  if (remaining >= 1999) for (const receipt of [...receipts].sort((a,b) => a.at-b.at)) {
    remaining -= receipt.grossGrosz;
    if (remaining < 1999) { noAdsUntil = receipt.at + 30 * DAY; break; }
  }
  return { provider: 'Paynow', noAds: paidLast30DaysGrosz >= 1999, paidLast30DaysGrosz, noAdsUntil,
    pendingCheckouts: c.checkouts.filter(x => x.status === 'pending'), simulationAvailable: simulated,
    ...runtimeCapabilities() };
}
export function nextCommerceEvent(state) {
  const now = clock(state), next = current(state).receipts.filter(r => !r.refunded && r.at + 30 * DAY > now).map(r => (r.at + 30 * DAY - now) / 1000);
  return next.length ? Math.min(...next) : Infinity;
}
export function advanceCommerce(state, _seconds) {
  const c=current(state);
  if(c.ad && clock(state)-c.ad.startedAt>=120000) {
    if(c.ad.purpose==='materials' && c.ad.offerId!=='initial-premium-bonus') completeEngagementOffer(state,{id:c.ad.offerId,choice:'ad'});
    c.ad=null;
  }
  commerceStatus(state);
}

export function quoteCheckout(state, action = {}, context = {}) {
  const kind = action.kind || 'coins';
  if (kind === 'coins') {
    const pack = COIN_PACKAGES.find(p => p.grossGrosz === (action.grossGrosz ?? 2000));
    return pack ? good('Coin package quote.', { kind, ...pack }) : bad('Choose an available coin package.');
  }
  if (kind === 'building') {
    const next = plannedLevel(state, action.building) + 1;
    if (!state.buildings?.[action.building] || next > (action.building === 'townhall' ? 100 : state.buildings.townhall.level)) return bad('Upgrade the Town Hall before buying this building level.');
    const quote = quotePremiumBuilding(state, action.building, { ...context, cashPurchase: true });
    return quote.ok ? { ...quote, kind, building: action.building, grossGrosz: Math.max(100, quote.coins * 10) } : quote;
  }
  if (kind === 'transport') {
    const quote = quoteInstantTransport(state, action);
    return quote.ok ? { ...quote, kind, grossGrosz: Math.max(100, quote.trips * 100), coins: quote.trips * 10 } : quote;
  }
  if (kind === 'blessing') {
    if (state.blessingRemaining > 0 || (state.paidBlessingCooldownRemaining || 0) > 0) return bad('Wait for the blessing and its paid cooldown to end.');
    const coins = 100 * (state.buildings?.chapel?.level || 0);
    return coins > 0 ? good('Blessing purchase quote.', { kind, coins, grossGrosz: coins * 10 }) : bad('Build the Chapel first.');
  }
  return bad('Choose a supported purchase.');
}

export function commerceAction(state, action, context = {}) {
  const type = action?.type;
  if (!['startCheckout','completeCheckout','cancelCheckout','beginRewardedAd','completeRewardedAd','cancelRewardedAd','redeemPromoCode'].includes(type)) return null;
  const c = current(state);
  if (type === 'startCheckout') {
    const quote = quoteCheckout(state, action, context);
    if (!quote.ok) return quote;
    if (!simulationAllowed(context)) return bad('Real payments are not enabled. No money was charged.');
    const id = `dev-checkout-${++c.sequence}`;
    const checkout = { id, status: 'pending', createdAt: clock(state), quote,
      action: Object.fromEntries(Object.entries(action).filter(([k]) => !['type','receipt','verified'].includes(k))) };
    c.checkouts.push(checkout);
    return good('DEV payment simulation. No money will be charged.', { checkoutId: id, checkout, quote, simulated: true });
  }
  if (type === 'cancelCheckout') {
    const entry = c.checkouts.find(x => x.id === action.checkoutId);
    if (!entry || entry.status !== 'pending') return bad('This checkout is no longer pending.');
    entry.status = 'cancelled'; return good('Checkout cancelled. No money was charged.');
  }
  if (type === 'completeCheckout') {
    if (!simulationAllowed(context)) return bad('A verified server payment is required. No purchase was granted.');
    const entry = c.checkouts.find(x => x.id === action.checkoutId);
    if (!entry || entry.status !== 'pending') return bad('This checkout was already completed or cancelled.');
    // Revalidate availability at settlement; no success receipt for an invalid purchase.
    const quote = quoteCheckout(state, entry.action, context);
    if (!quote.ok || quote.grossGrosz !== entry.quote.grossGrosz) return bad('The purchase changed. Start a new checkout.');
    let result;
    if (quote.kind === 'coins') {
      if (!Number.isSafeInteger(state.resources.coins + quote.coins)) return bad('The balance cannot hold this package.');
      state.resources.coins += quote.coins; result = good('Coin package granted.');
    } else if (quote.kind === 'building') {
      result = context.requestUpgrade?.({ building: entry.action.building, cost: quote.cost, paidMaterials: true, paidCoins: true, skipTransport: true, premiumService: true });
    } else if (quote.kind === 'transport') result = instantTransport(state, entry.action);
    else result = context.activateBlessing?.(`payment-${entry.id}`);
    if (!result?.ok) return result || bad('The purchase cannot be delivered.');
    entry.status = 'complete'; entry.completedAt = clock(state);
    c.receipts.push({ id: entry.id, at: clock(state), grossGrosz: quote.grossGrosz, provider: 'Paynow', simulated: true, verified: false, kind: quote.kind });
    return good('DEV payment completed. No money was charged.', { checkoutId: entry.id, simulated: true, delivered: result });
  }
  if (type === 'beginRewardedAd') {
    if (!['materials','blessing'].includes(action.purpose)) return bad('Choose a supported ad reward.');
    if (c.ad) return bad('Finish or cancel the current reward first.');
    const noFilm = commerceStatus(state).noAds;
    if (action.purpose === 'materials') {
      const offer = engagementOfferStatus(state);
      const initialBonus = action.offerId === 'initial-premium-bonus' && noFilm && offer.initialBonusAvailable;
      if (!initialBonus && !(offer.pending && offer.id === action.offerId && offer.started && offer.choice === 'ad')) return bad('A current reward invitation is required.');
    }
    if (!noFilm && !simulationAllowed(context) && context.adProviderAvailable !== true) return bad('The advertisement provider is not configured. No reward was granted.');
    if (action.purpose === 'blessing' && (state.blessingRemaining > 0 || state.paidBlessingCooldownRemaining > 0)) return bad('Wait for the blessing and its paid cooldown to end.');
    const reward = action.purpose === 'materials' ? Object.fromEntries(MATERIAL_IDS.map(id => [id, random(state,10,30)])) : null;
    const nonce = `reward-${++c.sequence}`;
    c.ad = { nonce, purpose: action.purpose, offerId: action.offerId || null, startedAt: clock(state), noFilm, reward };
    return good(noFilm ? 'Your standard reward is available without an ad.' : 'Start the rewarded ad.', { nonce, noFilm, reward, simulated: !noFilm && simulationAllowed(context) });
  }
  if (type === 'cancelRewardedAd') {
    if (!c.ad || c.ad.nonce !== action.nonce) return bad('This ad is no longer active.');
    if (c.ad.purpose === 'materials' && c.ad.offerId !== 'initial-premium-bonus') completeEngagementOffer(state, { id: c.ad.offerId, choice: 'ad' });
    c.ad = null; return good('Ad skipped. No reward was granted.');
  }
  if (type === 'completeRewardedAd') {
    const ad = c.ad;
    if (!ad || ad.nonce !== action.nonce) return bad('This ad is no longer active.');
    if (typeof action.receiptId !== 'string' || !action.receiptId || c.adReceipts.includes(action.receiptId)) return bad('The reward receipt was already used or is invalid.');
    if (!ad.noFilm && !(context.rewardedAdVerified === true && (simulationAllowed(context) || context.verifiedProvider === true))) return bad('The ad provider has not confirmed the reward.');
    if (ad.purpose === 'materials') {
      const offer = engagementOfferStatus(state);
      if (ad.offerId === 'initial-premium-bonus' ? !offer.initialBonusAvailable : !(offer.pending && offer.id === ad.offerId && offer.started && offer.choice === 'ad')) return bad('This reward invitation has already ended.');
    }
    let result;
    if (ad.purpose === 'blessing') result = context.activateBlessing?.(action.receiptId);
    else { receiveMaterials(state, ad.reward); result = good('Material reward received.', { reward: ad.reward }); }
    if (!result?.ok) return result || bad('This reward cannot be delivered.');
    if (ad.purpose === 'materials') {
      if (ad.offerId === 'initial-premium-bonus') claimInitialPremiumBonus(state);
      else completeEngagementOffer(state, { id: ad.offerId, choice: 'ad' });
    }
    c.adReceipts.push(action.receiptId); c.ad = null;
    return good('Reward received.', { ...result, purpose: ad.purpose, offerId: ad.offerId });
  }
  // Global first-N limits are settled by the account service, never a browser counter.
  if (type === 'redeemPromoCode') {
    const code = String(action.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,64}$/.test(code)) return bad('Enter a valid promotional code.');
    if (c.promoClaims[code]) return bad('This code was already redeemed by this account.');
    const receipt = context.verifiedPromoReceipt;
    if (!object(receipt) || receipt.code !== code || typeof receipt.id !== 'string' || !object(receipt.reward)) return bad('Code redemption requires confirmation from the server.');
    const coins = receipt.reward.coins || 0;
    if (!integer(coins) || !Number.isSafeInteger(state.resources.coins + coins) || MATERIAL_IDS.some(id => !integer(receipt.reward[id] || 0))) return bad('The promotional reward is invalid.');
    receiveMaterials(state, receipt.reward); state.resources.coins += coins;
    c.promoClaims[code] = receipt.id;
    return good('Promotional code redeemed.', { reward: receipt.reward });
  }
  return null;
}
