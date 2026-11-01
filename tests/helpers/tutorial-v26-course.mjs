// Execute fresh curriculum 5 through real commands, material deliveries,
// construction, a completed Lighthouse task and a won/cashed-out minigame.
import { createState, act, advanceTo } from '../../harborlight-v1-state.js';
import { TUTORIAL_LESSONS, tutorialRows, tutorialStatus } from '../../harborlight-v1-progression.js';
import { leisureOffers } from '../../harborlight-v1-leisure.js';
import { ordinaryWarehouseUsed } from '../../harborlight-v1-inventory.js';

export function runTutorialV26({ now = Date.parse('2026-11-01T10:00:00Z'), through = 25, beforeLesson = null } = {}) {
  const state = createState(now), trace = [];
  const command = action => {
    const result = act(state, action, state.worldTimeMs);
    if (!result.ok) throw new Error(JSON.stringify({ action, result, tutorial: tutorialStatus(state), resources: state.resources, bonus: state.bonusMaterials }));
    return result;
  };
  const wait = seconds => {
    advanceTo(state, state.worldTimeMs + seconds * 1000);
    command({ type: 'userActivity', visible: true, focused: true });
  };
  for (const lesson of TUTORIAL_LESSONS.slice(0, through)) {
    beforeLesson?.(state, command, lesson);
    command({ type: 'userActivity', visible: true, focused: true });
    if (!state.tutorial.completed[lesson.id]) {
      if (lesson.kind === 'condition') {
        let seconds = 0;
        while (!state.tutorial.completed[lesson.id] && seconds < 86400) { wait(10); seconds += 10; }
        if (!state.tutorial.completed[lesson.id]) throw new Error('Course construction did not finish: ' + lesson.id);
      } else if (lesson.subject.startsWith('assign-')) {
        for (let index = 0; index < (lesson.assignmentCount || 1); index++) command({ type: 'assign', building: lesson.subject.slice(7), delta: 1 });
      } else if (lesson.subject.startsWith('upgrade-') && lesson.subject !== 'upgrade-road') {
        if (lesson.id === 'townhall-upgrade') command({ type: 'prepareTutorialUpgrade' });
        const building = lesson.subject.slice(8);
        command({ type: state.buildings[building].level ? 'upgrade' : 'build', building });
      } else if (lesson.subject === 'transport-priority') command({ type: 'warehousePriority', priorities: ['construction'] });
      else if (lesson.subject === 'house-points') {
        let seconds = 0;
        while (!(state.houseHappinessPool.points > 0) && seconds < 86400) { wait(60); seconds += 60; }
        command({ type: 'houseHappinessAll', amount: 1 });
      } else if (lesson.subject === 'upgrade-road') command({ type: 'upgradeRoad', level: 1 });
      else if (lesson.subject === 'buy-attraction') {
        const offer = leisureOffers(state).filter(item => item.available && item.price <= state.resources.coins).sort((a,b) => a.price - b.price)[0];
        if (!offer) throw new Error('No affordable course attraction');
        command({ type: 'buyAttraction', id: offer.id });
      } else if (lesson.subject === 'chapel-blessing') command({ type: 'blessing' });
      else if (lesson.subject === 'task-complete') {
        const task = state.lighthouseTasks.find(task => task.tutorialStarter === true || task.tutorial === true || task.id.startsWith('tutorial-'));
        if (!task) throw new Error('The introductory Lighthouse task is unavailable at Town Hall 2');
        command({ type: 'taskAccept', task: task.id });
        command({ type: 'confirmTaskAcceptance', task: task.id });
        for (const [resource, amount] of Object.entries(task.requirements)) command({ type: 'taskDeposit', task: task.id, resource, amount });
        const achievement = state.taskAchievements.find(row => row.taskId === task.id);
        if (achievement) command({ type: 'skipTaskAchievement', id: achievement.id });
      } else if (lesson.subject === 'expedition-complete') {
        command({ type: 'expeditionStart', expedition: 'misty', gameKind: 'triples' });
        const run = state.expeditionRuns.misty;
        // The solver only chooses real card inputs. It never assigns solved,
        // outcome, completion flags, Coins or statistics directly.
        for (let symbol = 0; symbol < run.miniGame.symbolCount; symbol++) {
          for (let index = 0; index < run.miniGame.cards.length; index++) if (run.miniGame.cards[index] === symbol) command({ type: 'expeditionMiniGameReveal', runId: run.id, index });
        }
        command({ type: 'expeditionCashout', runId: run.id });
      } else if (lesson.subject === 'finish-tutorial') command({ type: 'finishTutorial' });
      else throw new Error('Unknown course action: ' + lesson.subject);
    }
    if (!state.tutorial.completed[lesson.id]) throw new Error('Action did not complete lesson: ' + lesson.id);
    if (!state.tutorial.claimed[lesson.id] && !state.tutorial.skippedLessons[lesson.id]) command({ type: 'claimTutorial', taskId: lesson.id });
    const chest = state.tutorial.chests[lesson.id];
    if (chest && !chest.shared && !chest.skipped) command({ type: 'skipTutorialShare', taskId: lesson.id });
    trace.push({ index: lesson.index, lessonId: lesson.id, subject: lesson.subject, elapsedSeconds: (state.worldTimeMs - now) / 1000,
      reward: structuredClone(chest?.reward || {}), ordinaryUsed: ordinaryWarehouseUsed(state), warehouseLevel: state.buildings.warehouse.level,
      bonus: structuredClone(state.bonusMaterials), resources: structuredClone(state.resources), pending: tutorialRows(state).filter(row => row.canClaim || row.pendingDecision).length });
  }
  return { state, trace, command, wait };
}
