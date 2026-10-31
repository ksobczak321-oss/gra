// The development adapter is intentionally ephemeral. Real eligibility comes
// only from the authenticated server ledger, never from this browser model.
const DAY = 86400000, HOUR = 3600000;
const monthAt = at => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit' }).formatToParts(new Date(at)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}`;
};
const fail = code => { throw Object.assign(new Error(code), { code }); };
const defaultWorld = (state, id) => id === 'island-1' ? state : state.archipelago?.version === 2 ? state.archipelago.islands?.[id] : id === 'island-2' ? state.archipelago?.secondIsland : null;
const totalCoins = state => Number(state.resources.coins) + (state.archipelago?.version === 2 ? Object.values(state.archipelago.islands || {}) : state.archipelago?.secondIsland ? [state.archipelago.secondIsland] : []).reduce((sum, world) => sum + Number(world.resources.coins), 0);
export const charityHappinessBonus = (state, at = state.worldTimeMs ?? state.lastSimulatedAt ?? Date.now()) => state.charityReward?.happinessPoints === 20 && state.charityReward.expiresAt > at ? 20 : 0;
export const charityPortIlluminated = (state, at) => charityHappinessBonus(state, at) > 0;

export function createCharityPreviewAdapter({ environment, getState, getWorld = (id) => defaultWorld(getState(), id), onMutation = () => {}, now = () => Date.now() } = {}) {
  if (environment !== 'development' || typeof getState !== 'function') throw new TypeError('An explicit ephemeral DEV preview is required.');
  let known = totalCoins(getState()), qualified = 0, last = null, lastRewardAt = null, serial = 0;
  const donations = [], funds = new Map();
  function sync() {
    const balance = totalCoins(getState());
    qualified = Math.max(0, Math.min(qualified, balance, qualified + Math.min(0, balance - known)));
    known = balance;
  }
  function fund(month) {
    if (!funds.has(month)) funds.set(month, { budgetCents: 5000, usedCents: 0, transferredCents: 0 });
    return funds.get(month);
  }
  function world(id) { const selected = getWorld(id); if (!selected?.resources) fail('charity-invalid-island'); return selected; }
  async function status() {
    sync(); const at = now(), month = monthAt(at), pool = fund(month), available = pool.budgetCents - pool.usedCents;
    return { mode: 'simulation', month, qualifiedCoins: qualified, unqualifiedCoins: Math.max(0, known - qualified),
      campaign: { organization: 'Cel demonstracyjny DEV', goal: 'Test przepływu — żadne pieniądze nie są przekazywane.', mode: 'simulation', active: true,
        budgetCents: pool.budgetCents, availableCents: available, transferredCents: pool.transferredCents },
      eligible: qualified >= 1000 && available >= 100 && (!last || last.month !== month && at - last.at >= 30 * DAY),
      monthUsed: last?.month === month, nextDonationAt: last ? last.at + 30 * DAY : null, donations: structuredClone(donations),
      rules: { coins: 1000, operatorCents: 100, happinessPoints: 20, happinessHours: 6, spendOrder: 'qualified-first' } };
  }
  async function creditTestCoins({ islandId = 'island-1' } = {}) {
    sync(); const selected = world(islandId); selected.resources.coins += 1000; qualified += 1000; known += 1000;
    await onMutation({ kind: 'test-credit', islandId, amount: 1000, mode: 'simulation' }); return status();
  }
  async function donate({ requestId, islandId = 'island-1' }) {
    sync(); const previous = donations.find(value => value.requestId === requestId);
    if (previous) { if (previous.islandId !== islandId) fail('charity-request-reused'); return { donation: structuredClone(previous), alreadyApplied: true }; }
    const current = await status(); if (!current.eligible) fail(current.monthUsed ? 'charity-account-limit' : qualified < 1000 ? 'charity-insufficient-qualified-coins' : 'charity-fund-exhausted');
    // Recheck after the asynchronous read. Two open panels must not reserve
    // twice from the same preview wallet or bypass its account limit.
    const concurrent = donations.find(value => value.requestId === requestId);
    if (concurrent) { if (concurrent.islandId !== islandId) fail('charity-request-reused'); return { donation: structuredClone(concurrent), alreadyApplied: true }; }
    sync();
    if (last && (last.month === current.month || now() - last.at < 30 * DAY)) fail('charity-account-limit');
    if (qualified < 1000) fail('charity-insufficient-qualified-coins');
    if (fund(current.month).budgetCents - fund(current.month).usedCents < 100) fail('charity-fund-exhausted');
    const selected = world(islandId); if (selected.resources.coins < 1000) fail('charity-insufficient-island-coins');
    selected.resources.coins -= 1000; qualified -= 1000; known -= 1000;
    const donation = { id: `dev-charity-${++serial}`, requestId, islandId, month: current.month, mode: 'simulation', status: 'reserved', reservedAt: now(), reward: null };
    fund(current.month).usedCents += 100; last = { month: current.month, at: donation.reservedAt }; donations.push(donation);
    await onMutation({ kind: 'donation', islandId, amount: -1000, mode: 'simulation' }); return { donation: structuredClone(donation), alreadyApplied: false };
  }
  async function confirmTestTransfer({ donationId }) {
    const donation = donations.find(value => value.id === donationId); if (!donation) fail('charity-donation-not-found');
    if (donation.status !== 'reserved') return { donation: structuredClone(donation), alreadyApplied: true };
    donation.status = 'transferred'; donation.transferredAt = now(); donation.transferReference = 'DEV-SYMULACJA'; fund(donation.month).transferredCents += 100;
    return { donation: structuredClone(donation), alreadyApplied: false };
  }
  async function claimReward({ donationId, islandId = 'island-1' }) {
    const donation = donations.find(value => value.id === donationId); if (!donation) fail('charity-donation-not-found');
    if (donation.status === 'claimed') return { donation: structuredClone(donation), reward: structuredClone(donation.reward), alreadyApplied: true };
    if (donation.status !== 'transferred') fail('charity-reward-awaits-transfer');
    if (lastRewardAt !== null && now() - lastRewardAt < 30 * DAY) fail('charity-reward-cooldown');
    const selected = world(islandId); if (selected.charityReward?.expiresAt > now()) fail('charity-reward-already-active');
    const at = now(), reward = { id: donation.id, islandId, claimedAt: at, expiresAt: at + 6 * HOUR, happinessPoints: 20, portIlluminated: true, mode: 'simulation' };
    donation.status = 'claimed'; donation.reward = reward; selected.charityReward = structuredClone(reward); lastRewardAt = at;
    await onMutation({ kind: 'reward', islandId, reward, mode: 'simulation' }); return { donation: structuredClone(donation), reward, alreadyApplied: false };
  }
  return { mode: 'simulation', status, donate, claimReward, creditTestCoins, confirmTestTransfer };
}

const errors = {
  'charity-account-limit': ['Można pomóc raz w miesiącu Warszawy i nie częściej niż co 30 dni.', 'Donate once per Warsaw calendar month and at least 30 days apart.'],
  'charity-insufficient-qualified-coins': ['Potrzebujesz 1000 kwalifikowanych monet. Kupione monety, handel i nieznane stare saldo nie kwalifikują się.', 'You need 1,000 qualifying coins. Purchases, trade and unknown historical balances do not qualify.'],
  'charity-insufficient-island-coins': ['Na wybranej wyspie brakuje 1000 monet.', 'The selected island needs 1,000 coins.'],
  'charity-fund-exhausted': ['Pula tego miesiąca jest wykorzystana. Monety nie zostały pobrane.', 'This month’s fund is exhausted. No coins were taken.'],
  'charity-reward-awaits-transfer': ['Nagroda czeka na potwierdzenie przelewu.', 'The reward awaits confirmation of the transfer.'],
  'charity-reward-cooldown': ['Od poprzedniego odbioru premii musi upłynąć 30 dni. Uprawnienie pozostaje do odebrania później.', 'Rewards must be claimed at least 30 days apart. Your entitlement remains available for later.'],
  'charity-campaign-unavailable': ['Program nie jest jeszcze aktywny. Monety nie zostały pobrane.', 'The campaign is not active yet. No coins were taken.']
};
export function charityErrorMessage(error, language = 'pl') {
  return errors[error?.code]?.[language === 'pl' ? 0 : 1] || (language === 'pl' ? 'Nie udało się potwierdzić operacji. Odśwież stan programu.' : 'The operation could not be confirmed. Refresh the campaign.');
}

export function createCharityPanel({ adapter, islandId = 'island-1', language = 'pl', onChanged = () => {} } = {}) {
  const pl = language === 'pl', text = (polish, english) => pl ? polish : english;
  const node = (tag, content, attrs = {}) => { const element = document.createElement(tag); if (content !== undefined) element.textContent = content; Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value)); return element; };
  const host = node('section', undefined, { 'data-charity-panel': '', class: 'charity-panel' }), statusLine = node('p', '', { role: 'status', 'aria-live': 'polite' });
  const content = node('div'); host.append(node('h3', text('Pomagam — Światło Wdzięczności', 'Give back — Light of Gratitude')), statusLine, content);
  let busy = false, currentRequestId = null;
  const run = async operation => {
    if (busy) return; busy = true; host.setAttribute('aria-busy', 'true'); host.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try { const result = await operation(); await onChanged(result); statusLine.textContent = ''; await refresh(); }
    catch (error) { statusLine.textContent = charityErrorMessage(error, language); }
    finally { busy = false; host.removeAttribute('aria-busy'); host.querySelectorAll('button').forEach(button => { if (button.dataset.allowed === 'true') button.disabled = false; }); }
  };
  const button = (label, operation, allowed = true, name = '') => {
    const result = node('button', label, { type: 'button', class: 'action secondary', 'data-allowed': String(allowed), ...(name ? { [name]: '' } : {}) });
    result.disabled = !allowed; result.addEventListener('click', () => run(operation)); return result;
  };
  async function refresh() {
    if (!adapter?.status) { content.replaceChildren(node('p', text('Program oczekuje na uruchomienie serwerowej księgi i wybór organizacji.', 'The campaign awaits the server ledger and a selected charity.'))); return; }
    const state = await adapter.status(), campaign = state.campaign; content.replaceChildren();
    if (state.mode === 'simulation') content.append(node('p', text('SYMULACJA DEV — brak prawdziwych przelewów. Księga podglądu znika po odświeżeniu.', 'DEV SIMULATION — no real transfers. The preview ledger disappears on refresh.'), { class: 'notice' }));
    content.append(node('p', text('1000 kwalifikowanych monet = 1 zł z zabezpieczonej puli operatora. Raz w miesiącu Warszawy, minimum 30 dni odstępu. Najpierw wydajesz monety kwalifikowane.', '1,000 qualifying coins = PLN 1 from the operator’s reserved fund. Once per Warsaw month, at least 30 days apart. Ordinary spending uses qualifying coins first.')),
      node('p', text(`Kwalifikowane monety: ${Math.floor(state.qualifiedCoins)}. Pozostałe: ${Math.floor(state.unqualifiedCoins)}.`, `Qualifying coins: ${Math.floor(state.qualifiedCoins)}. Other coins: ${Math.floor(state.unqualifiedCoins)}.`)));
    if (campaign) content.append(node('p', `${campaign.organization}: ${campaign.goal}`), node('p', text(`Pozostała pula: ${(campaign.availableCents / 100).toFixed(2)} zł z ${(campaign.budgetCents / 100).toFixed(2)} zł.`, `Available fund: PLN ${(campaign.availableCents / 100).toFixed(2)} of PLN ${(campaign.budgetCents / 100).toFixed(2)}.`)));
    const form = node('div', undefined, { class: 'charity-actions' }), consent = node('input', undefined, { type: 'checkbox', 'data-charity-confirm': '' }), label = node('label');
    label.append(consent, document.createTextNode(text(' Potwierdzam zużycie 1000 monet. +20 p.p. szczęścia przez 6 h odbiorę dopiero po potwierdzeniu przelewu.', ' I confirm spending 1,000 coins. I can claim +20 happiness points for 6 hours only after the transfer is confirmed.')));
    const donate = button(text(state.mode === 'simulation' ? 'Test: przekaż 1000 monet → 1 zł' : 'Przekaż 1000 monet — operator wpłaci 1 zł', state.mode === 'simulation' ? 'Test: give 1,000 coins → PLN 1' : 'Give 1,000 coins — operator donates PLN 1'), async () => {
      currentRequestId ||= globalThis.crypto?.randomUUID?.() || `charity_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const result = await adapter.donate({ requestId: currentRequestId, islandId }); currentRequestId = null; return result;
    }, false, 'data-charity-donate');
    consent.addEventListener('change', () => { donate.dataset.allowed = String(consent.checked && state.eligible); donate.disabled = !consent.checked || !state.eligible || busy; });
    form.append(label, donate); content.append(form);
    if (adapter.mode === 'simulation' && adapter.creditTestCoins) content.append(button(text('DEV: dodaj 1000 testowych monet do tej wyspy', 'DEV: add 1,000 test coins to this island'), () => adapter.creditTestCoins({ islandId }), true, 'data-charity-test-credit'));
    for (const donation of state.donations || []) {
      const row = node('div', undefined, { class: 'charity-donation', 'data-charity-donation': donation.id });
      const label = donation.status === 'reserved' ? text('Zarezerwowano 1 zł. Nagroda oczekuje na przelew.', 'PLN 1 reserved. The reward awaits the transfer.') : donation.status === 'transferred' ? text('Przelew potwierdzony. Możesz odebrać nagrodę.', 'Transfer confirmed. You can claim the reward.') : donation.status === 'claimed' ? text('Światło Wdzięczności odebrane: przyznano +20 p.p. szczęścia i rozświetlenie Portu na 6 godzin.', 'Light of Gratitude claimed: +20 happiness points and Harbor illumination were granted for 6 hours.') : text('Rezerwacja anulowana; monety zwrócone.', 'Reservation cancelled; coins returned.');
      row.append(node('p', `${donation.mode === 'simulation' ? '[DEV] ' : ''}${label}`));
      if (donation.reward?.expiresAt) row.append(node('p', text('Koniec premii: ', 'Reward expiry: ') + new Intl.DateTimeFormat(pl ? 'pl-PL' : 'en-GB', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' }).format(new Date(donation.reward.expiresAt)) + text(' (Warszawa).', ' (Warsaw).')));
      if (donation.status === 'reserved' && adapter.mode === 'simulation' && adapter.confirmTestTransfer) row.append(button(text('DEV: zasymuluj potwierdzenie przelewu', 'DEV: simulate transfer confirmation'), () => adapter.confirmTestTransfer({ donationId: donation.id }), true, 'data-charity-test-transfer'));
      if (donation.status === 'transferred') row.append(button(text('Odbierz Światło Wdzięczności: +20 p.p. / 6 h', 'Claim Light of Gratitude: +20 points / 6 h'), () => adapter.claimReward({ donationId: donation.id, islandId }), true, 'data-charity-claim'));
      content.append(row);
    }
  }
  refresh().catch(error => { statusLine.textContent = charityErrorMessage(error, language); }); return host;
}
