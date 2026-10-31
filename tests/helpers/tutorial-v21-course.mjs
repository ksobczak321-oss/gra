// Run the actual 25-lesson curriculum through model commands and elapsed time.
// There are no injected completion flags, free resources, skipped construction
// phases or direct building-level assignments in this scenario.
import { createState, act, advanceTo } from '../../harborlight-v1-state.js';
import { TUTORIAL_LESSONS, tutorialRows, tutorialStatus } from '../../harborlight-v1-progression.js';
import { leisureOffers } from '../../harborlight-v1-leisure.js';
import { ordinaryWarehouseUsed } from '../../harborlight-v1-inventory.js';

export function runTutorialCourse({ now = Date.parse('2026-10-31T10:00:00Z'), through = 25, seed = 57, beforeLesson = null } = {}) {
  const state = createState(now), trace = [];
  state.tutorial.seed = seed;
  const command = action => {
    const result = act(state, action, state.worldTimeMs);
    if (!result.ok) throw new Error(JSON.stringify({ action, result, tutorial: tutorialStatus(state), resources: state.resources, bonus: state.bonusMaterials }));
    return result;
  };
  const waitMinute = () => {
    advanceTo(state, state.worldTimeMs + 60000);
    command({ type: 'userActivity', visible: true, focused: true });
  };
  for (const lesson of TUTORIAL_LESSONS.slice(0, through)) {
    beforeLesson?.(state, command, lesson);
    const before = structuredClone(state.resources);
    let supplies = null;
    command({ type: 'userActivity', visible: true, focused: true });
    if (!state.tutorial.completed[lesson.id]) {
      if (lesson.kind === 'condition') {
        let minutes = 0;
        while (!state.tutorial.completed[lesson.id] && minutes++ < 24 * 60) waitMinute();
        if (!state.tutorial.completed[lesson.id]) throw new Error('Course construction did not finish: ' + lesson.id);
      } else if (lesson.subject.startsWith('assign-')) command({ type: 'assign', building: lesson.subject.slice(7), delta: 1 });
      else if (lesson.subject.startsWith('upgrade-') && lesson.subject !== 'upgrade-road') {
        if (lesson.id === 'townhall-upgrade') supplies = command({ type: 'prepareTutorialUpgrade' }).reward;
        const building = lesson.subject.slice(8);
        command({ type: state.buildings[building].level ? 'upgrade' : 'build', building });
      } else if (lesson.subject === 'transport-priority') command({ type: 'warehousePriority', priorities: ['construction'] });
      else if (lesson.subject === 'house-points') {
        let minutes = 0;
        while (!(state.houseHappinessPool.points > 0) && minutes++ < 24 * 60) waitMinute();
        command({ type: 'houseHappinessAll', amount: 1 });
      } else if (lesson.subject === 'upgrade-road') command({ type: 'upgradeRoad', level: 1 });
      else if (lesson.subject === 'buy-attraction') {
        const offer = leisureOffers(state).filter(item => item.available && item.price <= state.resources.coins).sort((a,b) => a.price - b.price)[0];
        if (!offer) throw new Error('No affordable course attraction');
        command({ type: 'buyAttraction', id: offer.id });
      } else if (lesson.subject === 'chapel-blessing') command({ type: 'blessing' });
      else if (lesson.subject === 'finish-tutorial') command({ type: 'finishTutorial' });
      else throw new Error('Unknown course action: ' + lesson.subject);
    }
    if (!state.tutorial.completed[lesson.id]) throw new Error('Action failed to complete its lesson: ' + lesson.id);
    if (!state.tutorial.claimed[lesson.id] && !state.tutorial.skippedLessons[lesson.id]) command({ type: 'claimTutorial', taskId: lesson.id });
    const chest = state.tutorial.chests[lesson.id];
    if (chest && !chest.shared && !chest.skipped) command({ type: 'skipTutorialShare', taskId: lesson.id });
    trace.push({ index: lesson.index, lessonId: lesson.id, action: lesson.subject, elapsedSeconds: (state.worldTimeMs - now) / 1000,
      before, after: structuredClone(state.resources), reward: structuredClone(chest?.reward || {}), supplies,
      ordinaryUsed: ordinaryWarehouseUsed(state), warehouseLevel: state.buildings.warehouse.level,
      bonus: structuredClone(state.bonusMaterials), pendingTutorialRewards: tutorialRows(state).filter(row => row.canClaim || row.pendingDecision).length });
  }
  return { state, trace };
}
