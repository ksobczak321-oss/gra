import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADVENTURE_RULES, ADVENTURE_CATALOG, normalizeAdventures, adventureAction,
  adventureChoices, advanceAdventures, nextAdventuresEvent, observeMiniGames,
  BRIDGE_HINT, testBridge, adventureMessage, ADVENTURE_TRANSLATIONS
} from '../harborlight-v1-adventures.js';
import { createGardenPuzzle, gardenFlow, cargoMoment } from '../harborlight-v1-adventure-puzzles.js';
import { createMiniGame, revealMiniGameCard } from '../harborlight-v1-minigames.js';

function island() {
  const state = { activityClock: 0, activeSeconds: 0, activitySeed: 1234,
    resources: { coins: 100, wood: 1000, stone: 1000, grain: 1000, food: 1000, planks: 1000 },
    bonusMaterials: {}, expeditionRuns: {}, notifications: [] };
  normalizeAdventures(state); return state;
}
function start(state, kind) {
  const outcome = adventureAction(state, { type: 'adventureStart', kind }); assert.equal(outcome.ok, true, outcome.message); return state.adventures.active;
}
function input(state, command, values = {}) {
  return adventureAction(state, { type: 'adventureInput', adventureId: state.adventures.active?.id, command, ...values });
}
function reload(state) {
  const raw = structuredClone(state), restored = { ...raw }; normalizeAdventures(restored, raw); return restored;
}
function tripleFixture(state, level = 1) {
  const game = createMiniGame('triples', 1, 17);
  state.expeditionRuns.islands = { id: 'expedition-1', level, expedition: 'islands', status: 'active', miniGame: game };
  return game;
}
function matchSymbol(game, symbol) {
  game.cards.forEach((value, index) => { if (value === symbol) revealMiniGameCard(game, index, 0); });
}
function winTilt(state, level) {
  const game = createMiniGame('tilt', 1, 2);
  game.balls.forEach((ball, index) => { Object.assign(ball, { x: game.goals[index].x, y: game.goals[index].y, settled: true, goalId: index }); game.goals[index].filledBy = ball.id; }); game.solved = true;
  state.expeditionRuns.islands = { id: 'expedition-tilt', expedition: 'islands', level, status: 'decision', miniGame: game };
  return observeMiniGames(state);
}

test('nine optional adventures are introduced without touching missions, resources or old expedition progress', () => {
  const state = island(); state.lighthouseMission = { stage: 3 }; const saved = structuredClone(state);
  assert.equal(ADVENTURE_CATALOG.length, 9); assert.equal(adventureChoices(state).filter(item => item.available).length, 9);
  assert.deepEqual(state.resources, saved.resources); assert.deepEqual(state.lighthouseMission, { stage: 3 });
  assert.equal(adventureAction(state, { type: 'upgrade', building: 'farm' }), null);
  assert.equal(nextAdventuresEvent(state), Infinity);
});

test('falling cargo accepts only visible drops and grants exactly the caught amount outside normal warehouse capacity', () => {
  const state = island(), run = start(state, 'cargoRain'), drop = run.data.drops[0];
  assert.equal(input(state, 'catch', { dropId: drop.id }).ok, false);
  advanceAdventures(state, drop.appearAt);
  assert.equal(input(state, 'catch', { dropId: drop.id }).ok, true); assert.equal(state.resources.coins, 105);
  assert.equal(input(state, 'catch', { dropId: drop.id, verified: true, amount: 1000000 }).ok, false);
  const wood = run.data.drops.find(item => item.resource === 'wood'); advanceAdventures(state, wood.appearAt - state.adventures.clock);
  assert.equal(input(state, 'catch', { dropId: wood.id }).ok, true);
  assert.equal(state.resources.wood, 1010); assert.equal(state.bonusMaterials.wood, 10);
  advanceAdventures(state, 100); assert.equal(run.stage, 'complete');
  assert.equal(state.resources.coins, 105); assert.equal(state.resources.wood, 1010);
  assert.equal(run.data.reward.coins, 5); assert.equal(run.data.reward.wood, 10);
  assert.equal(input(state, 'catch', { dropId: run.data.drops[2].id }).ok, false);
});

test('a full plane run pays no unseen cargo and cannot be restarted during its saved cooldown', () => {
  let state = island(), run = start(state, 'cargoRain');
  for (const drop of run.data.drops) { advanceAdventures(state, drop.appearAt - state.adventures.clock); assert.equal(input(state, 'catch', { dropId: drop.id }).ok, true); }
  const collected = structuredClone(state.resources); advanceAdventures(state, 45 - state.adventures.clock);
  assert.equal(run.stage, 'complete'); assert.deepEqual(state.resources, collected);
  state = reload(state); assert.deepEqual(state.resources, collected);
  assert.equal(adventureAction(state, { type: 'adventureStart', kind: 'cargoRain' }).ok, false);
  advanceAdventures(state, ADVENTURE_RULES.cargoRainCooldownSeconds);
  assert.equal(adventureAction(state, { type: 'adventureStart', kind: 'cargoRain' }).ok, true);
  assert.notEqual(state.adventures.active.id, run.id);
});

test('offline elapsed time ends a plane event without awarding missed drops or duplicating caught ones', () => {
  let state = island(), run = start(state, 'cargoRain'); advanceAdventures(state, 1);
  input(state, 'catch', { dropId: run.data.drops[0].id }); state = reload(state);
  advanceAdventures(state, 4 * 86400);
  assert.equal(state.resources.coins, 105); assert.equal(state.adventures.active.stage, 'complete');
  assert.equal(state.adventures.completed.cargoRain, 1); advanceAdventures(state, 86400);
  assert.equal(state.adventures.completed.cargoRain, 1);
});

test('map fragments come from actual matched triples, including before the whole board is won', () => {
  let state = island(), game = tripleFixture(state); start(state, 'treasureMap');
  const symbols = [...new Set(game.cards)].slice(0, 4);
  for (const symbol of symbols) { matchSymbol(game, symbol); observeMiniGames(state); }
  assert.equal(game.solved, false); assert.equal(state.adventures.progress.mapPieces.length, 4);
  assert.equal(state.adventures.active.stage, 'arrange');
  assert.deepEqual(observeMiniGames(state), { pieces: 0, ammunition: 0 });
  state = reload(state); assert.deepEqual(observeMiniGames(state), { pieces: 0, ammunition: 0 });
  assert.equal(state.adventures.progress.mapPieces.length, 4);
});

test('a claimed mini-game win or partial match does not create fragments or cannonballs', () => {
  const state = island(), game = tripleFixture(state);
  game.matched[0] = true; observeMiniGames(state);
  assert.equal(state.adventures.progress.mapPieces.length, 0);
  start(state, 'treasureMap'); assert.equal(input(state, 'won', { solved: true, reward: 999999 }).ok, false);
  state.expeditionRuns.islands = { id: 'fake', level: 1, status: 'active', miniGame: { kind: 'tilt', solved: true, balls: [] } };
  observeMiniGames(state); assert.equal(state.adventures.progress.ammunition, 0); assert.equal(state.resources.coins, 100);
});

test('four earned fragments must be assembled and the real clue followed before a treasure reward', () => {
  let state = island(), game = tripleFixture(state); start(state, 'treasureMap');
  for (const symbol of [...new Set(game.cards)].slice(0, 4)) matchSymbol(game, symbol); observeMiniGames(state);
  assert.equal(input(state, 'search', { building: 'lighthouse' }).ok, false);
  while (state.adventures.active.data.tiles.some((tile, index) => tile !== index)) {
    const tiles = state.adventures.active.data.tiles, first = tiles.findIndex((tile, index) => tile !== index), second = tiles.indexOf(first);
    assert.equal(input(state, 'tileSwap', { first, second }).ok, true);
  }
  assert.equal(state.adventures.active.stage, 'search'); state = reload(state);
  const run = state.adventures.active, wrong = run.data.treasureSpot === 'farm' ? 'quarry' : 'farm';
  assert.equal(input(state, 'search', { building: wrong }).ok, false);
  assert.equal(input(state, 'search', { building: run.data.treasureSpot }).completed, true);
  assert.equal(state.resources.coins, 180); assert.equal(state.resources.wood, 1030); assert.equal(state.bonusMaterials.wood, 30);
  assert.equal(state.adventures.progress.mapPieces.length, 0);
  assert.equal(input(state, 'search', { building: run.data.treasureSpot }).ok, false); assert.equal(state.resources.coins, 180);
});

test('real won marble rounds earn one saved cannonball apiece, capped at twelve', () => {
  let state = island();
  assert.equal(winTilt(state, 1).ammunition, 1); assert.equal(winTilt(state, 1).ammunition, 0);
  state = reload(state); assert.equal(observeMiniGames(state).ammunition, 0);
  for (let level = 2; level <= 20; level++) winTilt(state, level);
  assert.equal(state.adventures.progress.ammunition, 12);
});

test('a solved marble flag with inconsistent goals cannot create ammunition', () => {
  const state = island(), game = createMiniGame('tilt', 1, 2);
  game.solved = true; Object.assign(game.balls[0], { settled: true, goalId: 0 });
  state.expeditionRuns.islands = { id: 'bad-shape', level: 1, status: 'decision', miniGame: game };
  observeMiniGames(state); assert.equal(state.adventures.progress.ammunition, 0);
  game.goals[0].filledBy = game.balls[0].id;
  observeMiniGames(state); assert.equal(state.adventures.progress.ammunition, 0);
  Object.assign(game.balls[0], { x: game.goals[0].x, y: game.goals[0].y });
  assert.equal(observeMiniGames(state).ammunition, 1);
});

test('pirates are defeated by actual moving projectile collisions and spend earned balls', () => {
  const state = island(); for (let level = 1; level <= 3; level++) winTilt(state, level);
  const run = start(state, 'pirateCannon');
  // Clear the nearest ships first: a lower pirate can intercept a shot aimed
  // at a more distant ship, exactly as the collision model should allow.
  for (const ship of [...run.data.ships].sort((a, b) => b.y - a.y)) {
    input(state, 'aim', { x: ship.x, y: ship.y }); assert.equal(input(state, 'shoot').ok, true); advanceAdventures(state, 2.4);
    assert.equal(ship.alive, false);
  }
  assert.equal(run.stage, 'complete'); assert.equal(state.adventures.progress.ammunition, 0);
  assert.equal(state.resources.coins, 175); assert.equal(state.resources.food, 1040);
  assert.ok(state.adventures.effects.some(item => item.kind === 'merchant-rescued'));
});

test('cannon physics and ammunition survive save reload and split time steps', () => {
  const state = island(); winTilt(state, 1); start(state, 'pirateCannon'); input(state, 'aim', { x: 0, y: 0 }); input(state, 'shoot');
  const whole = structuredClone(state), split = reload(state);
  advanceAdventures(whole, 1.4); advanceAdventures(split, 0.6);
  const restored = reload(split); advanceAdventures(restored, 0.8);
  assert.equal(restored.adventures.progress.ammunition, 0);
  assert.equal(restored.adventures.active.data.projectiles.length, whole.adventures.active.data.projectiles.length);
  for (let index = 0; index < whole.adventures.active.data.projectiles.length; index++) {
    const left = restored.adventures.active.data.projectiles[index], right = whole.adventures.active.data.projectiles[index];
    assert.ok(Math.abs(left.x - right.x) < 1e-8); assert.ok(Math.abs(left.y - right.y) < 1e-8);
  }
});

test('the base thirteen beams can form a safe bridge, while an unsupported deck fails a load test', () => {
  assert.equal(testBridge(BRIDGE_HINT).stable, true); assert.equal(testBridge(BRIDGE_HINT.slice(0, 4)).stable, false);
  assert.equal(testBridge(BRIDGE_HINT.slice(1)).stable, false);
  const state = island(), run = start(state, 'bridge');
  assert.equal(input(state, 'bridgeToggle', { from: 0, to: 4 }).ok, false);
  for (const [from, to] of BRIDGE_HINT) assert.equal(input(state, 'bridgeToggle', { from, to }).ok, true);
  assert.equal(run.data.edges.length, run.data.budget);
  const result = input(state, 'bridgeTest'); assert.equal(result.completed, true);
  assert.equal(state.resources.coins, 160); assert.equal(state.resources.planks, 1050);
  assert.equal(run.data.test.stable, true);
});

test('optional bridge extras debit five coins or require a one-use provider authorization, never an action flag', () => {
  const state = island(), run = start(state, 'bridge');
  const action = { type: 'adventureBridgeExtra', adventureId: run.id, method: 'ad', verified: true };
  assert.equal(adventureAction(state, action).needsRewardedAd, true); assert.equal(run.data.budget, 13); assert.equal(state.resources.coins, 100);
  assert.equal(adventureAction(state, { ...action, method: 'coins' }).ok, true); assert.equal(run.data.budget, 14); assert.equal(state.resources.coins, 95);
  const context = { environment: 'development', devSimulation: true, rewardedAdVerified: true, rewardedAdAuthorization: { purpose: 'adventure-bridge', adventureId: run.id, nonce: 'receipt-one-123', verified: true } };
  assert.equal(adventureAction(state, action, context).ok, true); assert.equal(run.data.budget, 15);
  assert.equal(adventureAction(state, action, context).ok, false); assert.equal(run.data.budget, 15);
  assert.equal(adventureAction(state, action, { noAds: true }).ok, true); assert.equal(run.data.budget, 16);
  assert.equal(adventureAction(state, { ...action, method: 'coins' }).ok, false); assert.equal(state.resources.coins, 95);
});

test('a production ad remains unavailable even with simulated or client-supplied verification flags', () => {
  const state = island(), run = start(state, 'bridge'), action = { type: 'adventureBridgeExtra', adventureId: run.id, method: 'ad', verified: true };
  const context = { environment: 'production', devSimulation: true, rewardedAdVerified: true, rewardedAdAuthorization: { purpose: 'adventure-bridge', adventureId: run.id, nonce: 'production-fake-receipt', verified: true } };
  assert.equal(adventureAction(state, action, context).ok, false); assert.equal(run.data.budget, 13); assert.equal(state.resources.coins, 100);
});

test('model messages and stored notifications have complete human Polish and English presentations', () => {
  const state = island(), run = start(state, 'signals');
  const message = input(state, 'signal', { value: 0 }).message;
  assert.equal(message, 'Remember the light sequence first.');
  assert.equal(adventureMessage(message, 'pl'), 'Najpierw zapamiętaj kolejność świateł.');
  advanceAdventures(state, 6); for (const value of run.data.sequence) input(state, 'signal', { value });
  assert.equal(state.notifications[0].title, 'Adventure complete: Night signals from the Lighthouse');
  assert.equal(ADVENTURE_TRANSLATIONS[state.notifications[0].title], 'Przygoda ukończona: Nocne sygnały Latarni');
  assert.equal(adventureMessage(state.notifications[0].message, 'pl'), 'Nagroda została dodana do Twoich zasobów. Główna misja trwa dalej.');
});

test('lighthouse signals must be memorized then repeated in order, with free retries', () => {
  const state = island(), run = start(state, 'signals');
  assert.equal(input(state, 'signal', { value: run.data.sequence[0] }).ok, false);
  assert.equal(nextAdventuresEvent(state), 6); advanceAdventures(state, 6);
  const wrong = (run.data.sequence[0] + 1) % 4; input(state, 'signal', { value: wrong });
  assert.equal(run.stage, 'memorize'); assert.equal(state.resources.coins, 100);
  advanceAdventures(state, 6); for (const value of run.data.sequence) input(state, 'signal', { value });
  assert.equal(run.stage, 'complete'); assert.equal(state.resources.coins, 140);
});

test('wet letters require reading clues and matching each of three island recipients', () => {
  const state = island(), run = start(state, 'letters');
  const first = run.data.letters[0]; assert.equal(input(state, 'deliver', { letterId: first.id, building: first.recipient }).ok, false);
  for (const letter of run.data.letters) {
    assert.equal(input(state, 'read', { letterId: letter.id }).ok, true);
    assert.equal(input(state, 'deliver', { letterId: letter.id, building: 'farm' }).ok, false);
    assert.equal(input(state, 'deliver', { letterId: letter.id, building: letter.recipient }).ok, true);
  }
  assert.equal(run.stage, 'complete'); assert.equal(state.resources.coins, 135);
  assert.ok(state.adventures.effects.some(item => item.kind === 'family-reunion'));
});

test('the orchestra needs three instruments and the correct timed performance, not a burst of clicks', () => {
  let state = island(), run = start(state, 'rhythm');
  for (const instrument of run.data.instruments) input(state, 'inspect', { building: instrument.building });
  assert.equal(run.stage, 'listen'); advanceAdventures(state, 6);
  input(state, 'beat', { value: run.data.sequence[0] }); input(state, 'beat', { value: run.data.sequence[1] });
  assert.equal(run.stage, 'listen'); assert.equal(state.resources.coins, 100);
  advanceAdventures(state, 6); state = reload(state); run = state.adventures.active;
  for (const [index, value] of run.data.sequence.entries()) { if (index) advanceAdventures(state, 0.7); input(state, 'beat', { value }); }
  assert.equal(run.stage, 'complete'); assert.equal(state.resources.coins, 140);
});

test('every generated garden is solvable by rotation alone with no monetized components', () => {
  for (let seed = 0; seed < 8; seed++) {
    const puzzle = createGardenPuzzle(() => (seed % 4) / 4);
    puzzle.tiles.forEach(tile => { tile.rotation = 0; }); const wet = gardenFlow(puzzle);
    assert.ok(puzzle.ponds.every(index => wet.includes(index)));
  }
  const state = island(), run = start(state, 'garden');
  for (let index = 0; index < run.data.tiles.length && run.stage !== 'complete'; index++) while (run.data.tiles[index].rotation && run.stage !== 'complete') input(state, 'rotate', { index });
  assert.equal(run.stage, 'complete'); assert.equal(state.resources.coins, 125);
  assert.ok(state.adventures.effects.some(item => item.kind === 'tidal-flowers'));
});

test('cargo must be fully loaded, balanced by weight and sent along a sheltered route', () => {
  const state = island(), run = start(state, 'cargoBalance');
  input(state, 'cargoTest'); assert.equal(run.stage, 'load');
  const light = run.data.crates.filter(crate => crate.weight === 1), heavy = run.data.crates.filter(crate => crate.weight === 2);
  for (const [crate, slot] of [[light[0], -2], [heavy[0], -1], [heavy[1], 1], [light[1], 2]]) input(state, 'place', { crateId: crate.id, slot });
  assert.equal(cargoMoment(run.data.crates), 0); input(state, 'cargoTest'); assert.equal(run.stage, 'route');
  input(state, 'route', { routeId: 'reef' }); assert.equal(run.stage, 'route'); assert.equal(state.resources.coins, 100);
  assert.equal(input(state, 'route', { routeId: 'sheltered' }).completed, true); assert.equal(state.resources.coins, 160);
});

test('swapping adventures saves each puzzle and resumes it independently of main-mission timers', () => {
  let state = island(), bridge = start(state, 'bridge'); input(state, 'bridgeToggle', { from: 0, to: 1 });
  const letters = start(state, 'letters'); input(state, 'read', { letterId: letters.data.letters[0].id });
  assert.equal(state.adventures.parked.bridge.id, bridge.id); state = reload(state);
  start(state, 'bridge'); assert.equal(state.adventures.active.id, bridge.id); assert.deepEqual(state.adventures.active.data.edges, [[0, 1]]);
  adventureAction(state, { type: 'adventureSuspend' }); assert.equal(state.adventures.active, null);
  assert.equal(adventureChoices(state).find(item => item.kind === 'bridge').resume, true);
  start(state, 'letters'); assert.equal(state.adventures.active.data.letters[0].read, true);
});

test('all nine puzzle snapshots survive normalization, including rewards already delivered', () => {
  let state = island();
  for (const descriptor of ADVENTURE_CATALOG) { start(state, descriptor.kind); state = reload(state); assert.equal(state.adventures.active.kind, descriptor.kind); }
  assert.equal(Object.keys(state.adventures.parked).length, 8); const resources = structuredClone(state.resources);
  state = reload(state); assert.deepEqual(state.resources, resources);
  assert.equal(state.adventures.sequence, 9);
});
