import { translate, formatNumber, formatHappinessPoints } from './harborlight-v1-i18n.js?v=frontend-v28';

const names = { farm: ['Gospodarstwo', 'Gospodarstwa'], windmill: ['Młyn', 'Młyna'], lumber: ['Drwale', 'obozu drwali'], quarry: ['Kamieniołom', 'Kamieniołomu'], sawmill: ['Tartak', 'Tartaku'] };
const goods = { wood: 'drewna', stone: 'kamienia', grain: 'zboża', food: 'żywności', planks: 'desek' };
const outputs = { farm: 'grain', windmill: 'food', lumber: 'wood', quarry: 'stone', sawmill: 'planks' };
const inputs = { windmill: 'zboża', sawmill: 'drewna' };
const countOf = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const few = n => n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14);
const workingPeople = n => n === 1 ? 'mieszkaniec otrzymuje' : few(n) ? 'mieszkańcy otrzymują' : 'mieszkańców otrzymuje';
const quantity = n => `${formatNumber(n, 'pl')} ${n === 1 ? 'jednostka' : !Number.isInteger(n) ? 'jednostki' : few(n) ? 'jednostki' : 'jednostek'}`;

/** Transition metadata records a past event, rather than the island's current
 * condition. Old notices without a cause receive a neutral ending: they must
 * never claim that recalled workers resumed production or charge a new loss. */
export function notificationPresentation(item, language = 'en') {
  if (language !== 'pl') return item;
  const localized = { ...item, title: translate(item.titlePl || item.title, 'pl'), message: translate(item.messagePl || item.message, 'pl') };
  const detail = item.effectTransition;
  const transition = detail?.transition || (item.kind === 'effect-ended' ? 'ended' : item.kind === 'effect-changed' ? 'changed' : 'started');
  const effectId = item.effectId || detail?.effectId;
  const count = countOf(detail?.affectedCount ?? detail?.residentIds?.length);
  if (effectId === 'employment' && detail && transition !== 'ended') return { ...localized,
    title: 'Praca zwiększa szczęście mieszkańców',
    message: `${count} ${workingPeople(count)} premię za pracę. Szczęście każdej z tych osób rośnie o 1 punkt na godzinę, dopóki pracuje.` };
  if (!effectId?.startsWith('production-blockage-')) return localized;
  const building = detail?.building || effectId.slice('production-blockage-'.length);
  const [name, genitive] = names[building] || ['Budynek', 'budynku'];
  const resource = goods[detail?.resource || outputs[building]] || 'towaru';
  if (transition === 'ended') {
    if (detail?.reason === 'production-resumed') return { ...localized,
      title: `Brawo! ${name} znów ${building === 'lumber' ? 'pracują' : 'pracuje'}`,
      message: `${detail.blockageReason === 'local-full' ? 'Zwolniłeś miejsce w magazynie.' : 'Dostarczono surowce potrzebne do produkcji.'} Pracownicy ponownie produkują i otrzymują premię do szczęścia za pracę. Kara za przestój zakończona.` };
    if (detail?.reason === 'workers-recalled') return { ...localized,
      title: `Brawo! Pracownicy ${genitive} wracają do Domu`,
      message: `Pracownicy otrzymali polecenie powrotu do Domu. Kara za przestój zakończona.${detail.remainingLocal > 0 ? ` Pamiętaj o zapasie w magazynie lokalnym: ${quantity(detail.remainingLocal)} ${resource}.` : ''}` };
    if (detail?.reason === 'mixed') return { ...localized,
      title: `Koniec kary za przestój: ${name}`,
      message: `Część pracowników wznowiła produkcję, a pozostali otrzymali polecenie powrotu do Domu. Powrót do pracy: ${countOf(detail.resumedCount)}. Powrót do Domu: ${countOf(detail.recalledCount)}. Kara za przestój zakończona.` };
    return { ...localized, title: `Koniec kary za przestój: ${name}`,
      message: `Poprzednia kara za przestój zakończyła się.${count ? ` Liczba objętych nią wcześniej mieszkańców: ${count}.` : ''}` };
  }
  // Missing historical metadata is not enough to reconstruct why production
  // stopped. Keep that notice's original translated content instead.
  if (!detail) return localized;
  const loss = Math.abs(Number(detail.amount) || 10);
  return { ...localized, title: `Przestój produkcji: ${name}`,
    message: `${detail.blockageReason === 'local-full' ? `Magazyn lokalny jest pełny, dlatego dalsza produkcja ${resource} jest niemożliwa.` : `Brakuje ${inputs[building] || 'surowców'} potrzebnych do produkcji ${resource}.`} Przestój frustruje pracowników i obniża ich szczęście, dopóki pozostają przypisani do tego budynku. ${detail.blockageReason === 'local-full' ? 'Zapewnij odbiór towarów' : 'Dostarcz brakujące surowce'} lub odeślij pracowników do Domu. Kara za przestój: utrata ${formatHappinessPoints(loss, 'pl')} szczęścia przez każdego objętego nią pracownika.` };
}
