import test from 'node:test';
import assert from 'node:assert/strict';
import { formatHappinessPoints, polishHappinessUnits, translate, untranslatedTexts } from '../harborlight-v1-i18n.js';
import { notificationPresentation } from '../harborlight-v1-notification-copy.js';
import { activeEffects, normalizeEffectNotifications, syncEffectNotifications } from '../harborlight-v1-effects.js';
import { createState, normalizeState } from '../harborlight-v1-state.js';
import { residentsPurpose } from '../harborlight-v1-copy.js';

const NOW = Date.parse('2026-11-02T12:00:00Z');
const residualUnits = /p\.\s*p\.|\bpp\b|punkt\w* procentow|(?:szczęści\w*[^.!?]{0,15}\d%|\d%\s*szczęści)/i;
const englishResidue = /\b(?:the|your|this|before|after|until|while|without|coins|happiness|production|journeys|residents|available|bank|mission|reward)\b/i;

test('happiness formatter inflects signed, fractional and teen values in Polish', () => {
  for (const [value, expected] of [[0,'0 punktów'],[1,'1 punkt'],[2,'2 punkty'],[4,'4 punkty'],[5,'5 punktów'],[11,'11 punktów'],[12,'12 punktów'],[14,'14 punktów'],[21,'21 punktów'],[22,'22 punkty'],[24,'24 punkty'],[25,'25 punktów'],[101,'101 punktów'],[112,'112 punktów'],[-2,'−2 punkty'],[1.5,'1,5 punktu'],[0.25,'0,25 punktu'],[-0,'0 punktów']])
    assert.equal(formatHappinessPoints(value,'pl'), expected);
  assert.equal(formatHappinessPoints(1,'pl',{signed:true}), '+1 punkt');
  assert.equal(formatHappinessPoints(-1,'en'), '−1 point');
  assert.equal(formatHappinessPoints(2,'en'), '2 points');
  assert.equal(formatHappinessPoints(NaN,'pl'), '0 punktów');
});

test('historical happiness units migrate without changing production percentages or fees', () => {
  for (const [source, expected] of [
    ['−10 p.p. szczęścia · produkcja +25%','−10 punktów szczęścia · produkcja +25%'],
    ['+1 pp/godz.','+1 punkt/godz.'],
    ['+2 p.p. dla 4 osób','+2 punkty dla 4 osób'],
    ['Szczęście pozostaje na 0%','Szczęście pozostaje na 0 punktów'],
    ['100% szczęścia · prowizja 10%','100 punktów szczęścia · prowizja 10%'],
    ['szczęścia poniżej 20%','szczęścia poniżej 20 punktów'],
    ['premia Latarni (100%)','premia Latarni (100 punktów)'],
    ['Wymuszone 100% ma pierwszeństwo','Wymuszone 100 punktów ma pierwszeństwo'],
    ['1,5 p.p. szczęścia','1,5 punktu szczęścia']]) assert.equal(polishHappinessUnits(source), expected);
  for (const source of ['Produkcja +50%','Prowizja 10%','50% mieszkańców','Transport −20%','Wydajność pracy 50%']) assert.equal(polishHappinessUnits(source),source);
});

test('actual happiness effects use points and Chapel taxes remain explicit', () => {
  const state = createState(NOW);
  state.chapelRemaining = 36000; state.buildings.chapel.level = 2;
  state.blessingRemaining = 3600;
  state.residents[0].prayerBonusRemaining = 21600;
  state.missionProductionBonuses = [{building:'quarry',multiplier:2,until:NOW+3600000}];
  for (const row of activeEffects(state)) for (const key of ['title','effect','scope','endCondition','explain']) {
    const text=translate(row[key],'pl');
    assert.doesNotMatch(text,residualUnits,`${row.id}.${key}: ${text}`);
    assert.doesNotMatch(text,englishResidue,`${row.id}.${key}: ${text}`);
  }
  assert.match(translate(activeEffects(state).find(row=>row.id==='chapel-upgrade').effect,'pl'), /20 punktów szczęścia · podatki ×2/);
  assert.match(translate('+1 pp happiness / h','pl'), /^\+1 punkt szczęścia\/godz\.$/);
  assert.doesNotMatch(residentsPurpose('pl'),residualUnits);
  assert.equal(translate(residentsPurpose(),'pl'),residentsPurpose('pl'));
});

test('new loyalty, House, prayer and commerce results are fully Polish', () => {
  const sources=[
    'Daily login reward available',
    'Your daily login reward is ready. Open the daily reward and collect Coins and materials.',
    'This daily reward reminder was already shown or the reward is unavailable.',
    'Daily reward reminder acknowledged.',
    'Production, taxes and transport speed ×2',
    'Buying coins unlocks at Town Hall level 3.',
    'Real money can only buy coins. Purchase services with game coins.',
    'Not enough coins to increase ship capacity.',
    'Direct payments for ship capacity are unavailable. Buy capacity with game coins.',
    'Ship-capacity purchases require the account service in production.',
    'Finish the preceding upgrade of this building before buying its next level.',
    'Ship capacity increased with game coins.',
    'Permanent ship capacity quote.',
    'No happiness points remain in the House bank.',
    '24 happiness points are stored in 2 of 7 daily portions.',
    '12 happiness points were given collectively to 12 residents.',
    'Resident #3 returned Home and receives 50 happiness points for six hours.',
    '2 residents are on their way to the Chapel. The duration includes both journeys; after returning they receive 50 happiness points for six hours.',
    'The price includes prayer and both two-minute walks. The happiness bonus begins after returning Home.',
    'The personal happiness bonus begins on return Home and lasts six hours. The same resident cannot stack multiple prayer bonuses.'
  ];
  for(const source of sources){untranslatedTexts.clear();const result=translate(source,'pl');assert.notEqual(result,source);assert.doesNotMatch(result,englishResidue);assert.deepEqual([...untranslatedTexts],[]);assert.equal(translate(source,'en'),source);}
});

const notice=(reason,extra={})=>({kind:'effect-ended',effectId:'production-blockage-windmill',title:'Ended: Windmill: production blockage',message:'−10 pp happiness · 2 residents.',effectTransition:{transition:'ended',building:'windmill',resource:'food',blockageReason:'local-full',reason,affectedCount:2,residentIds:[1,2],...extra}});

test('production resumption and recall notices retain distinct historical causes', () => {
  const resumed=notificationPresentation(notice('production-resumed'),'pl');
  assert.match(resumed.title,/Młyn znów pracuje/);assert.match(resumed.message,/Zwolniłeś miejsce/);assert.doesNotMatch(resumed.message,/−10|utrata|wracają do Domu/);
  const recalled=notificationPresentation(notice('workers-recalled',{remainingLocal:22}),'pl');
  assert.match(recalled.title,/Pracownicy Młyna wracają do Domu/);assert.match(recalled.message,/22 jednostki żywności/);assert.doesNotMatch(recalled.message,/−10|ponownie produkują|już w Domu/);
  const mixed=notificationPresentation(notice('mixed',{resumedCount:1,recalledCount:1}),'pl');
  assert.match(mixed.message,/Powrót do pracy: 1.*Powrót do Domu: 1/);
  const unknown=notice('conditions-changed');delete unknown.effectTransition;
  const historical=notificationPresentation(unknown,'pl');
  assert.match(historical.message,/Poprzednia kara.*zakończyła/);assert.doesNotMatch(historical.message,/−10|ponownie|Zwolniłeś|powrotu/);
  assert.equal(notificationPresentation(unknown,'en'),unknown);
});

test('active blockage explains the produced resource and loss for each affected worker', () => {
  const item=notice('local-full'); item.kind='effect-started';item.effectTransition.transition='started';item.effectTransition.amount=10;
  const text=notificationPresentation(item,'pl').message;
  assert.match(text,/dalsza produkcja żywności jest niemożliwa/);assert.match(text,/utrata 10 punktów szczęścia przez każdego/);assert.match(text,/odbiór towarów.*odeślij/);assert.doesNotMatch(text,residualUnits);
});

test('work notices use Polish singular, few and many forms without a diminishing curve', () => {
  for(const [count,word]of [[1,'mieszkaniec otrzymuje'],[2,'mieszkańcy otrzymują'],[4,'mieszkańcy otrzymują'],[5,'mieszkańców otrzymuje'],[12,'mieszkańców otrzymuje'],[22,'mieszkańcy otrzymują']]){
    const item={effectId:'employment',title:'Updated: Working residents',message:'+1 pp happiness / h',effectTransition:{transition:'changed',affectedCount:count}};
    const result=notificationPresentation(item,'pl');assert.match(result.message,new RegExp(`${count} ${word}`));assert.doesNotMatch(result.message,/30 punktów|maleje|maksymalnie/);assert.match(result.message,/o 1 punkt na godzinę/);
  }
});

test('end-notice metadata survives cloud snapshot normalization without changing historical cause', () => {
  const state=createState(NOW);
  state.buildings.windmill.level=1;state.buildings.windmill.ready=200;
  state.residents[0].workplace='windmill';state.residents[1].workplace='windmill';
  normalizeEffectNotifications(state);
  state.residents[0].workplace=null;state.residents[1].workplace=null;
  syncEffectNotifications(state);
  const original=state.notifications.find(item=>item.effectId==='production-blockage-windmill'&&item.kind==='effect-ended');
  assert.equal(original.effectTransition.reason,'workers-recalled');
  const reloaded=normalizeState(JSON.parse(JSON.stringify(state)),NOW);
  reloaded.buildings.windmill.ready=0;
  const stored=reloaded.notifications.find(item=>item.id===original.id);
  assert.equal(stored.effectTransition.reason,'workers-recalled');
  assert.match(notificationPresentation(stored,'pl').title,/wracają do Domu/);
  assert.match(notificationPresentation(stored,'pl').message,/200 jednostek żywności/);
});
