import { createIslandOnboarding } from './harborlight-v1-onboarding-ui.js?v=frontend-v32-20';
import { APPROVED_TOUR_IDS } from './harborlight-v1-approved-copy.js?v=frontend-v32-20';

// Keep the full, reviewed catalogue and its stable persisted positions intact.
// Only the initial presentation is shortened; Help can still replay the catalogue.
export const ADVISOR_INTRO_IDS = Object.freeze(['home','category-administration','building-farm']);
const positions = ADVISOR_INTRO_IDS.map(id => APPROVED_TOUR_IDS.indexOf(id));
export function introductionIndex(savedIndex) {
  if (savedIndex === positions[1]) return 1;
  if (savedIndex === positions[2]) return 2;
  // A legacy paused tour resumes at a relevant short explanation, never resets play.
  return savedIndex >= APPROVED_TOUR_IDS.indexOf('building-townhall') ? 2 : 0;
}
export const ADVISOR_INTRO_COPY = Object.freeze([
    ['Górny pasek — sytuacja na wyspie','Spójrz na górny pasek. Tutaj sprawdzisz poziom wyspy, szczęście, monety, pracujących i mieszkańców. Przyciski obok otwierają Pomoc, ustawienia i menu gry.', 'Top bar — your island at a glance','The top bar shows your island level, happiness, coins, workers and residents. Nearby buttons open Help, settings and the game menu.'],
    ['Dolne menu — wybierz, czym się zajmiesz','Administracja i Gospodarka prowadzą do budynków. Zasoby pokazują towary i produkcję, Dekoracje — atrakcje, a Ścieżki — drogi. Wybierz kategorię, a potem interesujący Cię element.', 'Bottom menu — choose your next action','Administration and Economy lead to buildings. Resources shows goods and production, Decorations shows attractions, and Paths shows roads. Choose a category, then an item.'],
    ['Gospodarstwo — jeden przykład produkcji','Kliknij Gospodarstwo, przydziel wolnych mieszkańców i wybierz produkt. Towary trafiają najpierw do magazynu lokalnego, skąd odbierają je tragarze z Magazynu. Po rozpoczęciu gry doradca w lewym dolnym rogu pomoże zaplanować kolejne kroki. Jego rady są dobrowolne.', 'Farm — one production example','Open the Farm, assign free residents and choose a product. Goods first enter local storage, then Warehouse carriers collect them. Once play starts, the advisor in the lower-left corner can help you plan. Advice is optional.']
  ]);
export function createAdvisorIntroduction(options) {
  const language = () => options.getLanguage?.() || options.language || 'pl';
  const pl = () => language() !== 'en';
  const visible = selectors => selectors.map(selector => document.querySelector(selector)).find(node => node?.getClientRects().length);
  const original = options.steps;
  const texts = ADVISOR_INTRO_COPY;
  const steps = ADVISOR_INTRO_IDS.map((id, index) => ({...original.find(step => step.id === id), id,
    title:() => texts[index][pl() ? 0 : 2], text:() => texts[index][pl() ? 1 : 3],
    ...(index === 0 ? {target:() => visible(['.mobile-island-hud','.island-topbar','#hit-home'])} : {}),
    ...(index === 1 ? {target:() => visible(['.mobile-bottom-dock','.dock-tabs','#hit-category-administration'])} : {})
  }));
  const translate = next => ({...next, index:positions[Math.min(2,Math.max(0,next.index ?? 0))]});
  const inner = createIslandOnboarding({...options, steps, index:introductionIndex(options.index || 0),
    onUpdate:next => options.onUpdate?.(translate(next)), onFinish:next => options.onFinish?.(translate(next)),
    onPause:next => options.onPause?.(translate(next))});
  return {start:() => inner.start(), destroy:() => inner.destroy(), get active(){return inner.active;},
    update:next => inner.update({...next,index:introductionIndex(next.index || 0)})};
}
