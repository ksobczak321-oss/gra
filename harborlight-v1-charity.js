// DEV uses an ephemeral preview; PRE-PROD persists a separate simulation
// ledger. Real eligibility comes only from the authenticated server ledger.
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

// Fictional beneficiaries are confined to the explicit local preview. A real
// panel renders only the campaign/beneficiaries returned by its server adapter.
export const CHARITY_DEMO_BENEFICIARIES = Object.freeze([
  Object.freeze({ id: 'dev-children', organization: 'Przykład DEV: Przystań Dzieci', goal: 'Fikcyjny cel: wyposażenie świetlicy dla dzieci.', organizationEn: 'DEV example: Children’s Haven', goalEn: 'Fictional cause: equipment for a children’s activity room.' }),
  Object.freeze({ id: 'dev-animals', organization: 'Przykład DEV: Bezpieczna Łapa', goal: 'Fikcyjny cel: opieka nad zwierzętami.', organizationEn: 'DEV example: Safe Paw', goalEn: 'Fictional cause: care for animals.' }),
  Object.freeze({ id: 'dev-nature', organization: 'Przykład DEV: Zielone Wybrzeże', goal: 'Fikcyjny cel: ochrona nadmorskiej przyrody.', organizationEn: 'DEV example: Green Coast', goalEn: 'Fictional cause: protecting coastal nature.' })
]);
export function createCharityPreviewAdapter({ environment, getState, getWorld = (id) => defaultWorld(getState(), id), beforeMutation = () => {}, onMutation = () => {}, onPersistSimulation, now = () => Date.now(), funding = { pilot: true, prefundedCents: 5000, previousMarginCents: null } } = {}) {
  if (!['development', 'preprod'].includes(environment) || typeof getState !== 'function') throw new TypeError('An explicit DEV or PRE-PROD simulation is required.');
  const durable = environment === 'preprod', saved = durable && getState().charitySimulation?.version === 1 ? getState().charitySimulation : {};
  let known = totalCoins(getState()), qualified = Math.min(known, Math.max(0, Number(saved.qualified) || 0)), last = saved.last || null, lastRewardAt = saved.lastRewardAt ?? null, serial = Number.isSafeInteger(saved.serial) ? saved.serial : 0;
  const donations = Array.isArray(saved.donations) ? structuredClone(saved.donations) : [], funds = new Map(Array.isArray(saved.funds) ? saved.funds : []);
  function persist() {
    if (!durable) return;
    const metadata = { version: 1, qualified, last: structuredClone(last), lastRewardAt, serial, donations: structuredClone(donations), funds: [...funds].map(([key,value]) => [key,structuredClone(value)]) };
    if (typeof onPersistSimulation === 'function') onPersistSimulation(metadata);
    else getState().charitySimulation = metadata;
  }
  function sync() {
    const balance = totalCoins(getState());
    qualified = Math.max(0, Math.min(qualified, balance));
    known = balance; persist();
  }
  function fund(month) {
    if (!funds.has(month)) {
      const prefunded = Number.isSafeInteger(funding.prefundedCents) ? Math.max(0, funding.prefundedCents) : 0;
      const margin = Number.isSafeInteger(funding.previousMarginCents) ? Math.max(0, funding.previousMarginCents) : 0;
      const cap = Math.min(5000, prefunded, funding.pilot === true ? 5000 : Math.floor(margin / 20));
      funds.set(month, { budgetCents: Math.floor(cap / 100) * 100, usedCents: 0, transferredCents: 0 });
    }
    return funds.get(month);
  }
  function world(id) { const selected = getWorld(id); if (!selected?.resources) fail('charity-invalid-island'); return selected; }
  async function status() {
    sync(); const at = now(), month = monthAt(at), pool = fund(month), available = pool.budgetCents - pool.usedCents;
    return { mode: 'simulation', month, qualifiedCoins: qualified, unqualifiedCoins: Math.max(0, known - qualified),
      campaign: { organization: 'Trzy fikcyjne cele DEV', goal: 'Test przepływu — żadne pieniądze nie są przekazywane.', beneficiaries: structuredClone(CHARITY_DEMO_BENEFICIARIES), mode: 'simulation', active: pool.budgetCents >= 100,
        budgetCents: pool.budgetCents, availableCents: available, reservedCents: pool.usedCents - pool.transferredCents, transferredCents: pool.transferredCents, fundingPolicy: funding.pilot === true ? 'pilot' : 'previous-margin' },
      eligible: qualified >= 100 && available >= 10 && (!last || last.month !== month && at - last.at >= 30 * DAY),
      monthUsed: last?.month === month, nextDonationAt: last ? last.at + 30 * DAY : null, donations: structuredClone(donations),
      rules: { coins: 1000, operatorCents: 100, minimumCoins: 100, stepCoins: 100, coinsPerGrosz: 10, maximumMonthlyFundCents: 5000, marginShare: 0.05, happinessPoints: 20, happinessHours: 6, spendOrder: 'unqualified-first' } };
  }
  async function creditTestCoins({ islandId = 'island-1' } = {}) {
    await beforeMutation({ kind: 'test-credit', islandId });
    sync(); const selected = world(islandId); selected.resources.coins += 1000; qualified += 1000; known += 1000;
    persist(); await onMutation({ kind: 'test-credit', islandId, amount: 1000, mode: 'simulation' }); return status();
  }
  async function donate({ requestId, islandId = 'island-1', beneficiaryId = CHARITY_DEMO_BENEFICIARIES[0].id, amount = 1000 }) {
    if (!Number.isSafeInteger(amount) || amount < 100 || amount % 100 !== 0) fail('charity-invalid-amount');
    const operatorCents = amount / 10;
    const beneficiary = CHARITY_DEMO_BENEFICIARIES.find(value => value.id === beneficiaryId);
    if (!beneficiary) fail('charity-beneficiary-unavailable');
    await beforeMutation({ kind: 'donation', islandId });
    sync(); const previous = donations.find(value => value.requestId === requestId);
    if (previous) { if (previous.islandId !== islandId || previous.beneficiaryId !== beneficiaryId || (previous.coins ?? 1000) !== amount) fail('charity-request-reused'); return { donation: structuredClone(previous), alreadyApplied: true }; }
    const current = await status(); if (!current.eligible) fail(current.monthUsed ? 'charity-account-limit' : qualified < amount ? 'charity-insufficient-qualified-coins' : 'charity-fund-exhausted');
    await beforeMutation({ kind: 'donation', islandId });
    // Recheck after the asynchronous read. Two open panels must not reserve
    // twice from the same preview wallet or bypass its account limit.
    const concurrent = donations.find(value => value.requestId === requestId);
    if (concurrent) { if (concurrent.islandId !== islandId || concurrent.beneficiaryId !== beneficiaryId || (concurrent.coins ?? 1000) !== amount) fail('charity-request-reused'); return { donation: structuredClone(concurrent), alreadyApplied: true }; }
    sync();
    if (last && (last.month === current.month || now() - last.at < 30 * DAY)) fail('charity-account-limit');
    if (qualified < amount) fail('charity-insufficient-qualified-coins');
    if (fund(current.month).budgetCents - fund(current.month).usedCents < operatorCents) fail('charity-fund-exhausted');
    const selected = world(islandId); if (selected.resources.coins < amount) fail('charity-insufficient-island-coins');
    selected.resources.coins -= amount; qualified -= amount; known -= amount;
    const donation = { id: `dev-charity-${++serial}`, requestId, islandId, beneficiaryId, organization: beneficiary.organization, goal: beneficiary.goal, month: current.month, mode: 'simulation', coins: amount, operatorCents, status: 'reserved', reservedAt: now(), reward: null };
    fund(current.month).usedCents += operatorCents; last = { month: current.month, at: donation.reservedAt }; donations.push(donation);
    persist(); await onMutation({ kind: 'donation', islandId, amount: -amount, mode: 'simulation' }); return { donation: structuredClone(donation), alreadyApplied: false };
  }
  async function confirmTestTransfer({ donationId }) {
    await beforeMutation({ kind: 'simulated-transfer', donationId });
    const donation = donations.find(value => value.id === donationId); if (!donation) fail('charity-donation-not-found');
    if (donation.status !== 'reserved') return { donation: structuredClone(donation), alreadyApplied: true };
    donation.status = 'transferred'; donation.transferredAt = now(); donation.transferReference = 'DEV-SYMULACJA'; fund(donation.month).transferredCents += donation.operatorCents ?? 100;
    persist(); await onMutation({ kind: 'simulated-transfer', islandId: donation.islandId, donation: structuredClone(donation), mode: 'simulation' });
    return { donation: structuredClone(donation), alreadyApplied: false };
  }
  async function claimReward({ donationId, islandId = 'island-1' }) {
    await beforeMutation({ kind: 'reward', donationId, islandId });
    const donation = donations.find(value => value.id === donationId); if (!donation) fail('charity-donation-not-found');
    if (donation.status === 'claimed') return { donation: structuredClone(donation), reward: structuredClone(donation.reward), alreadyApplied: true };
    if (donation.status !== 'transferred') fail('charity-reward-awaits-transfer');
    if (lastRewardAt !== null && now() - lastRewardAt < 30 * DAY) fail('charity-reward-cooldown');
    const selected = world(islandId); if (selected.charityReward?.expiresAt > now()) fail('charity-reward-already-active');
    const at = now(), reward = { id: donation.id, islandId, claimedAt: at, expiresAt: at + 6 * HOUR, happinessPoints: 20, portIlluminated: true, mode: 'simulation' };
    donation.status = 'claimed'; donation.reward = reward; selected.charityReward = structuredClone(reward); lastRewardAt = at;
    persist(); await onMutation({ kind: 'reward', islandId, reward, mode: 'simulation' }); return { donation: structuredClone(donation), reward, alreadyApplied: false };
  }
  return { mode: 'simulation', status, donate, claimReward, creditTestCoins, confirmTestTransfer };
}

const errors = {
  'charity-invalid-amount': ['Wpisz co najmniej 100 monet, w wielokrotności 100. Każde 100 monet to 10 groszy pomocy.', 'Enter at least 100 coins in multiples of 100. Each 100 coins provides PLN 0.10 of support.'],
  'charity-account-ineligible': ['Do udziału potrzebujesz konta starszego niż 14 dni, pięciu dni aktywnej gry i Ratusza na poziomie co najmniej 4.', 'Participation requires an account older than 14 days, five active days and Town Hall level 4 or higher.'],
  'charity-beneficiary-unavailable': ['Wybrany cel nie jest dostępny w tej kampanii. Monety nie zostały pobrane.', 'The selected beneficiary is not available in this campaign. No coins were taken.'],
  'charity-request-reused': ['Ta operacja dotyczy innej wyspy lub innego celu pomocy. Odśwież historię, aby sprawdzić jej wynik.', 'This operation refers to a different island or beneficiary. Refresh the history to check its result.'],
  'charity-account-limit': ['Możesz pomóc raz w miesiącu kalendarzowym i nie częściej niż co 30 dni. Terminy liczymy według czasu w Warszawie.', 'Donate once per Warsaw calendar month and at least 30 days apart.'],
  'charity-insufficient-qualified-coins': ['Brakuje kwalifikowanych monet na wybraną kwotę; minimum to 100 monet. Nie wliczamy monet kupionych, wpływów z handlu ani starszych monet o nieznanym pochodzeniu.', 'You need enough qualifying coins for the selected amount; the minimum is 100. Purchases, trade and unknown historical balances do not qualify.'],
  'charity-insufficient-island-coins': ['Na wybranej wyspie brakuje monet na wybraną kwotę.', 'The selected island needs enough coins for the selected amount.'],
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
  const money = cents => new Intl.NumberFormat(pl ? 'pl-PL' : 'en-GB', { style: 'currency', currency: 'PLN' }).format(cents / 100);
  const node = (tag, content, attrs = {}) => { const element = document.createElement(tag); if (content !== undefined) element.textContent = content; Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value)); return element; };
  const host = node('section', undefined, { 'data-charity-panel': '', class: 'charity-panel' }), statusLine = node('p', '', { role: 'status', 'aria-live': 'polite' });
  const content = node('div'); host.append(node('h3', text('Pomagam — Światło Wdzięczności', 'Give back — Light of Gratitude')), statusLine, content);
  if (!document.getElementById('harborlight-charity-style')) {
    const style = node('style', '.charity-panel{display:grid;gap:14px;min-width:0}.charity-panel h3,.charity-panel p{margin:0}.charity-panel>div:not([role=status]){display:grid;gap:12px}.charity-panel .charity-actions{display:grid;gap:12px}.charity-panel select{box-sizing:border-box;width:100%;max-width:100%;padding:10px;border:1px solid #809aa8;border-radius:9px;background:#102d3c;color:#fff;font:inherit}.charity-panel label{line-height:1.55}.charity-panel button{white-space:normal;min-height:44px}.charity-panel .charity-beneficiaries,.charity-panel .charity-donation{display:grid;gap:10px;padding:12px;border:1px solid #567786;border-radius:12px;background:#143443}.charity-panel .charity-donation p{overflow-wrap:anywhere}.charity-panel .charity-donation button{justify-self:start}.charity-panel .charity-celebration{padding:16px;border:2px solid #eac570;border-radius:12px;background:#285048;color:#ffe4a3;font-weight:700}.charity-panel .notice{padding:10px;border:1px solid #d3b768;border-radius:9px;color:#ffe1a0}', { id: 'harborlight-charity-style' }); document.head.append(style);
  }
  let busy = false, currentDonation = null, selectedBeneficiary = null;
  const run = async operation => {
    if (busy) return; busy = true; host.setAttribute('aria-busy', 'true'); host.querySelectorAll('button').forEach(button => { button.disabled = true; });
    try { const result = await operation(); await onChanged(result); await refresh(); const celebrated = result?.reward?.mode === 'simulation' && result.alreadyApplied !== true; statusLine.textContent = celebrated ? text('🎉 Brawo! Symulacja przelewu zakończona. Otrzymujesz 20 punktów szczęścia i rozświetlenie Portu na 6 godzin. Prawdziwe pieniądze nie zostały przekazane.', '🎉 Well done! Simulated transfer completed. You receive 20 happiness points and Harbor illumination for six hours. No real money was transferred.') : ''; statusLine.classList.toggle('charity-celebration', celebrated); }
    catch (error) { statusLine.textContent = charityErrorMessage(error, language); }
    finally { busy = false; host.removeAttribute('aria-busy'); host.querySelectorAll('button').forEach(button => { if (button.dataset.allowed === 'true') button.disabled = false; }); }
  };
  const button = (label, operation, allowed = true, name = '') => {
    const result = node('button', label, { type: 'button', class: 'action secondary', 'data-allowed': String(allowed), ...(name ? { [name]: '' } : {}) });
    result.disabled = !allowed; result.addEventListener('click', () => run(operation)); return result;
  };
  async function refresh() {
    if (!adapter?.status) { content.replaceChildren(node('p', text('Akcja nie została jeszcze uruchomiona. Organizator musi wskazać odbiorcę pomocy i przygotować rozliczenia.', 'The campaign awaits the server ledger and a selected charity.'))); return; }
    const state = await adapter.status(), campaign = state.campaign; content.replaceChildren();
    if (state.mode === 'simulation') content.append(node('p', text('SYMULACJA — bez przekazywania prawdziwych pieniędzy. Testowe monety i przelewy są oddzielone od przyszłej rzeczywistej akcji.', 'SIMULATION — no real money is transferred. Test coins and transfers are separate from the future real campaign.'), { class: 'notice' }));
    content.append(node('p', text('Za 1000 monet uprawnionych do udziału w akcji organizator przekazuje 1 zł z odłożonej puli. Możesz pomóc raz w miesiącu kalendarzowym i nie częściej niż co 30 dni; terminy liczymy według czasu w Warszawie. Wszystkie monety mają taką samą siłę nabywczą. Przy zwykłych wydatkach najpierw zużywasz monety niekwalifikowane. Możesz przekazać od 100 monet, w wielokrotności 100.', '1,000 qualifying coins = PLN 1 from the operator’s reserved fund. Once per Warsaw month, at least 30 days apart. All coins have equal purchasing power. Ordinary spending uses non-qualifying coins first. Donate from 100 coins in multiples of 100.')),
      node('p', text(`Monety, które możesz przeznaczyć na pomoc: ${Math.floor(state.qualifiedCoins)}. Pozostałe monety: ${Math.floor(state.unqualifiedCoins)}.`, `Qualifying coins: ${Math.floor(state.qualifiedCoins)}. Other coins: ${Math.floor(state.unqualifiedCoins)}.`)));
    content.append(node('p', text('Do pomocy kwalifikują się zweryfikowane monety z podatków, bezpłatnych zadań i ekspedycji. Lojalność, błogosławieństwa, reklamy i polecenia nie zwiększają tej puli. Monety kupione, wpływy z handlu i saldo o nieznanym pochodzeniu nie powiększają tej puli.', 'Verified taxes, free tasks and expedition winnings qualify. Loyalty, blessings, ads and referrals do not increase the qualifying pool. Purchased coins, trade proceeds and balances of unknown origin do not increase this pool.')));
    const simulation = state.mode === 'simulation';
    const beneficiaries = Array.isArray(campaign?.beneficiaries) ? campaign.beneficiaries.filter(value => value && typeof value.id === 'string' && typeof value.organization === 'string') : [];
    // Legacy real campaigns have one server-selected organization and no ID.
    // Never substitute the preview's fictional beneficiaries into real mode.
    const serverSelected = !beneficiaries.length && typeof campaign?.organization === 'string' && campaign.organization.trim().length > 0;
    if (!beneficiaries.some(value => value.id === selectedBeneficiary)) selectedBeneficiary = beneficiaries[0]?.id ?? null;
    let selector = null;
    if (campaign) {
      content.append(node('p', text(`Wspólna pula wszystkich celów: ${money(campaign.availableCents)} z ${money(campaign.budgetCents)}. Potwierdzone przelewy: ${money(campaign.transferredCents || 0)}.`, `Shared fund for all causes: ${money(campaign.availableCents)} of ${money(campaign.budgetCents)}. Confirmed transfers: ${money(campaign.transferredCents || 0)}.`)));
      if (simulation) content.append(node('p', text('Trzy cele poniżej są fikcyjnymi przykładami do testu. Nie oznaczają podpisanych umów. Po zawarciu umów pojawią się tu zatwierdzeni beneficjenci i ich rzeczywiste cele.', 'The three causes below are fictional test examples, not signed agreements. Approved beneficiaries and real causes will appear here after agreements are concluded.'), { class: 'notice' }));
      content.append(node('p', text('Limit operatora jest wspólny dla całej akcji: do 50 zł miesięcznie w pilotażu; później także nie więcej niż 5% rzeczywistej marży poprzedniego miesiąca i tylko z wydzielonych środków. Wybór innego celu nie odnawia limitu gracza ani puli.', 'The operator’s cap is shared across the campaign: up to PLN 50 per month in the pilot; later also no more than 5% of the previous month’s actual margin, using reserved funds only. Choosing another cause does not reset your allowance or the fund.')));
      if (beneficiaries.length) {
        const box = node('div', undefined, { class: 'charity-beneficiaries' }), heading = node('label', text('Wybierz cel pomocy', 'Choose a cause'), { for: 'charity-beneficiary' });
        selector = node('select', undefined, { id: 'charity-beneficiary', 'data-charity-beneficiary': '', 'aria-label': text('Cel pomocy', 'Charity beneficiary') });
        for (const beneficiary of beneficiaries) {
          const option = node('option', !pl && beneficiary.organizationEn ? beneficiary.organizationEn : beneficiary.organization, { value: beneficiary.id }); option.selected = beneficiary.id === selectedBeneficiary; selector.append(option);
        }
        const goal = node('p', '', { 'data-charity-beneficiary-goal': '' });
        const describe = () => { const selected = beneficiaries.find(value => value.id === selector.value); selectedBeneficiary = selected?.id ?? null; goal.textContent = selected ? (!pl && selected.goalEn ? selected.goalEn : selected.goal || '') : ''; };
        selector.addEventListener('change', describe); describe(); box.append(heading, selector, goal); content.append(box);
      } else if (serverSelected) content.append(node('p', `${campaign.organization}: ${campaign.goal || ''}`));
    }
    content.append(node('p', text('Warunki prawdziwej akcji: konto starsze niż 14 dni, co najmniej 5 dni aktywnej gry i Ratusz od poziomu 4. W symulacji testujesz przepływ bez prawdziwego przelewu.', 'Real campaign requirements: account older than 14 days, at least five active play days and Town Hall level 4. Simulation tests the flow without a real transfer.')));
    const beneficiaryReady = beneficiaries.length > 0 || serverSelected;
    const eligible = state.eligible === true && campaign?.active === true && beneficiaryReady;
    if (!campaign?.active || !beneficiaryReady) content.append(node('p', text('Akcja czeka na aktywną kampanię i zatwierdzony cel pomocy. Monety pozostają na Twoim koncie.', 'The campaign awaits activation and an approved beneficiary. Your coins remain in your account.'), { class: 'notice' }));
    const form = node('div', undefined, { class: 'charity-actions' }), consent = node('input', undefined, { type: 'checkbox', 'data-charity-confirm': '' }), label = node('label');
    const maximum = Math.floor(Math.min(state.qualifiedCoins || 0, (campaign?.availableCents || 0) * 10) / 100) * 100;
    const amount = node('input', undefined, { type: 'number', min: 100, max: Math.max(100, maximum), step: 100, value: currentDonation?.amount || Math.max(100, Math.min(1000, maximum)), 'data-charity-amount': '', 'aria-label': text('Liczba monet na pomoc', 'Coins to donate') });
    const consentText = node('span', ''); label.append(consent, consentText);
    const donate = button('', async () => {
      currentDonation ||= { requestId: globalThis.crypto?.randomUUID?.() || `charity_${Date.now()}_${Math.random().toString(36).slice(2)}`, islandId, amount: Number(amount.value), ...(selectedBeneficiary ? { beneficiaryId: selectedBeneficiary } : {}) };
      // An uncertain network response retries the same beneficiary and receipt.
      const result = await adapter.donate(currentDonation); currentDonation = null; return result;
    }, false, 'data-charity-donate');
    const updateAmount = () => { const count = Number(amount.value), valid = Number.isSafeInteger(count) && count >= 100 && count % 100 === 0 && count <= maximum;
      consentText.textContent = text(` Potwierdzam zużycie ${count || 0} monet. Premię 20 punktów szczęścia na 6 godzin odbiorę po potwierdzeniu przelewu.`, ` I confirm spending ${count || 0} coins. Claim the 20-point happiness bonus for six hours after transfer confirmation.`);
      donate.textContent = text(`${simulation ? 'Test: ' : ''}Przekaż ${count || 0} monet → ${money((count || 0) / 10)}`, `${simulation ? 'Test: ' : ''}Give ${count || 0} coins → ${money((count || 0) / 10)}`);
      donate.dataset.allowed = String(consent.checked && eligible && valid); donate.disabled = !consent.checked || !eligible || !valid || busy;
    };
    amount.addEventListener('input', () => { consent.checked = false; updateAmount(); }); consent.addEventListener('change', updateAmount); updateAmount();
    if(currentDonation)amount.disabled=true;
    form.append(node('label', text('Ile monet chcesz przekazać?', 'How many coins would you like to donate?')), amount, label, donate); content.append(form);
    if (currentDonation && selector) { selector.value = currentDonation.beneficiaryId; selector.disabled = true; content.append(node('p', text('Poprzednia operacja czeka na potwierdzenie. Ponowienie sprawdzi ten sam cel i nie pobierze monet drugi raz.', 'The previous operation awaits confirmation. Retrying checks the same beneficiary without charging twice.'))); }
    if (adapter.mode === 'simulation' && adapter.creditTestCoins) content.append(button(text('DEV: dodaj 1000 testowych monet do tej wyspy', 'DEV: add 1,000 test coins to this island'), () => adapter.creditTestCoins({ islandId }), true, 'data-charity-test-credit'));
    for (const donation of state.donations || []) {
      const row = node('div', undefined, { class: 'charity-donation', 'data-charity-donation': donation.id });
      const label = donation.status === 'reserved' ? text(`Zarezerwowano ${money(donation.operatorCents ?? 100)}. Nagroda oczekuje na przelew.`, `${money(donation.operatorCents ?? 100)} reserved. The reward awaits the transfer.`) : donation.status === 'transferred' ? text(donation.mode === 'simulation' ? 'Symulacja przelewu zakończona — bez przekazania prawdziwych pieniędzy. Możesz odebrać premię.' : 'Przelew potwierdzony. Możesz odebrać nagrodę.', 'Transfer confirmed. You can claim the reward.') : donation.status === 'claimed' ? text('Światło Wdzięczności odebrane: przyznano +20 punktów szczęścia i rozświetlenie Portu na 6 godzin.', 'Light of Gratitude claimed: +20 happiness points and Harbor illumination were granted for 6 hours.') : text('Rezerwacja anulowana; monety zwrócone.', 'Reservation cancelled; coins returned.');
      if (donation.organization) row.append(node('strong', donation.organization));
      row.append(node('p', `${donation.mode === 'simulation' ? '[SYMULACJA] ' : ''}${label}`));
      if (donation.reward?.expiresAt) row.append(node('p', text('Koniec premii: ', 'Reward expiry: ') + new Intl.DateTimeFormat(pl ? 'pl-PL' : 'en-GB', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' }).format(new Date(donation.reward.expiresAt)) + text(' (Warszawa).', ' (Warsaw).')));
      if (donation.status === 'reserved' && adapter.mode === 'simulation' && adapter.confirmTestTransfer) row.append(button(text('DEV: zasymuluj potwierdzenie przelewu', 'DEV: simulate transfer confirmation'), async () => { await adapter.confirmTestTransfer({ donationId: donation.id }); const result = await adapter.claimReward({ donationId: donation.id, islandId }); host.dispatchEvent(new CustomEvent('harborlight:charity-celebration', { bubbles: true, detail: { simulated: true, donationId: donation.id, reward: result.reward } })); return result; }, true, 'data-charity-test-transfer'));
      if (donation.status === 'transferred') row.append(button(text('Odbierz Światło Wdzięczności: +20 punktów szczęścia / 6 h', 'Claim Light of Gratitude: +20 points / 6 h'), () => adapter.claimReward({ donationId: donation.id, islandId }), true, 'data-charity-claim'));
      content.append(row);
    }
  }
  refresh().catch(error => { statusLine.textContent = charityErrorMessage(error, language); }); return host;
}
