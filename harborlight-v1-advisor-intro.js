import { createIslandOnboarding } from './harborlight-v1-onboarding-ui.js?v=frontend-v32-23';
import { APPROVED_TOUR_IDS, APPROVED_TOUR_VERSION, getTourCopy, normalizeTourProgressIndex } from './harborlight-v1-approved-copy.js?v=frontend-v32-23';

// Presentation positions are separate from the stable 56-entry saved catalogue.
// This keeps every old pause/resume position valid without rewriting a world.
export const ADVISOR_INTRO_IDS = Object.freeze([
  ...APPROVED_TOUR_IDS.slice(0, 11),
  'chat', // The former Chat and League explanations now share one stop.
  ...APPROVED_TOUR_IDS.slice(21, 28),
  ...APPROVED_TOUR_IDS.slice(47, 56)
]);
const positions = Object.freeze(ADVISOR_INTRO_IDS.map(id => APPROVED_TOUR_IDS.indexOf(id)));

export const TOUR_MENU_INFORMATION_IDS = Object.freeze({
  kingdom: Object.freeze(APPROVED_TOUR_IDS.slice(11, 15)),
  expeditions: Object.freeze(APPROVED_TOUR_IDS.slice(15, 17)),
  archipelago: Object.freeze([APPROVED_TOUR_IDS[17]]),
  charity: Object.freeze([APPROVED_TOUR_IDS[18]])
});

/** The removed 12–19 explanations stay available from their menu's i button. */
export function tourMenuInformation(menu, language = 'pl', options = {}) {
  return (TOUR_MENU_INFORMATION_IDS[menu] || []).map(id => ({ id, ...getTourCopy(id, language, options) }));
}

/** Resume a kept topic, the merged Chat topic, or the next remaining stop. */
export function introductionIndex(savedIndex, routeVersion = APPROVED_TOUR_VERSION) {
  const canonical = normalizeTourProgressIndex(savedIndex, routeVersion);
  if (APPROVED_TOUR_IDS[canonical] === 'league') return ADVISOR_INTRO_IDS.indexOf('chat');
  const exact = positions.indexOf(canonical);
  if (exact >= 0) return exact;
  const next = positions.findIndex(position => position > canonical);
  return next >= 0 ? next : ADVISOR_INTRO_IDS.length - 1;
}

export function introductionSavedIndex(presentationIndex = 0) {
  const safe = Number.isSafeInteger(presentationIndex) ? presentationIndex : 0;
  return positions[Math.min(positions.length - 1, Math.max(0, safe))];
}

function reviewedCopy(id, language = 'pl', options = {}) {
  const copy = getTourCopy(id, language, options);
  if (id === 'tutorial') {
    copy.title = language === 'en' ? 'Help and island tour' : 'Pomoc i tutorial';
    copy.text = language === 'en'
      ? 'The ? button opens Help, where you can resume or replay the island tour. Once play starts, the Kingdom Advisor suggests one development goal and concrete actions matched to your island. Follow the advice or choose your own plan.'
      : 'Pod przyciskiem „?” znajdziesz Pomoc oraz możliwość wznowienia lub ponownego obejrzenia tutoriala. Po rozpoczęciu gry Doradca Królestwa podpowiada jeden cel rozwoju i konkretne działania dopasowane do Twojej wyspy. Możesz skorzystać z jego rady lub wybrać własny plan.';
  }
  if (id === 'clothing' && language === 'pl') copy.title = 'Ubrania';
  if (id === 'chat') {
    const league = getTourCopy('league', language, options);
    copy.title = language === 'en' ? 'Chat, alliances and League' : 'Czat, sojusze i liga';
    copy.text = [copy.text, league.text].filter(Boolean).join('\n\n');
  }
  return copy;
}

// Retained public bilingual catalogue for tools and non-DOM checks.
export const ADVISOR_INTRO_COPY = Object.freeze(ADVISOR_INTRO_IDS.map(id => {
  const pl = reviewedCopy(id, 'pl'), en = reviewedCopy(id, 'en');
  return Object.freeze([pl.title, pl.text, en.title, en.text]);
}));

const valueFor = (value, language) => {
  const source = typeof value === 'function' ? value(language) : value;
  const selected = typeof source === 'string' ? source : source?.[language] ?? source?.pl ?? source?.en ?? '';
  return String(typeof selected === 'function' ? selected(language) : selected);
};

/** Filter real target/prepare callbacks while retaining their live state copy. */
export function createAdvisorTourSteps(original = []) {
  const byId = new Map(original.map(step => [step.id, step]));
  return ADVISOR_INTRO_IDS.map(id => {
    const source = byId.get(id) || {};
    const output = { ...source, id };
    if (id === 'chat') {
      const league = byId.get('league');
      output.title = language => reviewedCopy(id, language).title;
      output.text = language => [
        source.text == null ? getTourCopy(id, language).text : valueFor(source.text, language),
        league?.text == null ? getTourCopy('league', language).text : valueFor(league.text, language)
      ].filter(Boolean).join('\n\n');
    } else if (id === 'tutorial') {
      output.title = language => reviewedCopy(id, language).title;
      output.text = language => reviewedCopy(id, language).text;
    } else if (id === 'clothing') {
      output.title = language => language === 'pl' ? 'Ubrania' : source.title == null ? getTourCopy(id, language).title : valueFor(source.title, language);
    }
    if (output.title == null) output.title = language => reviewedCopy(id, language).title;
    if (output.text == null) output.text = language => reviewedCopy(id, language).text;
    return output;
  });
}

export function createAdvisorIntroduction(options = {}) {
  const steps = createAdvisorTourSteps(options.steps);
  const translate = next => ({ ...next, index: introductionSavedIndex(next.index), routeVersion: APPROVED_TOUR_VERSION });
  const inner = createIslandOnboarding({
    ...options, steps,
    index: introductionIndex(options.index, options.routeVersion),
    routeVersion: APPROVED_TOUR_VERSION,
    onUpdate: next => options.onUpdate?.(translate(next)),
    onFinish: next => options.onFinish?.(translate(next)),
    onPause: typeof options.onPause === 'function' ? next => options.onPause(translate(next)) : undefined,
    onAfterPause: next => options.onAfterPause?.(translate(next))
  });
  return {
    root: inner.root,
    start: () => inner.start(), destroy: () => inner.destroy(),
    get active() { return inner.active; },
    update: next => inner.update({ ...next,
      ...(next.index === undefined ? {} : { index: introductionIndex(next.index, next.routeVersion) }),
      routeVersion: APPROVED_TOUR_VERSION
    })
  };
}
