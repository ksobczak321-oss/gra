import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { synchronizeMiniGameInstructions, MINIGAME_READING_NOTE } from '../scripts/minigame_instruction_overlay.mjs';
import { getMiniGameInstructionContent, miniGameInstructionSubjects } from '../harborlight-v1-minigame-instructions.js';

const baseline=()=>JSON.parse(readFileSync(new URL('../docs/minigames/catalog.json',import.meta.url),'utf8')).entries;
test('all55 Word/TXT entries use the exact scenario, goal, rules and controls shown by the actual pre-game instructions',()=>{
 const input=baseline(),before=structuredClone(input),result=synchronizeMiniGameInstructions(input);
 assert.equal(result.length,55);assert.deepEqual(input,before,'shaping must not rewrite its source catalogue');
 const subjects=miniGameInstructionSubjects().map(row=>`${row.type}:${row.id}`);
 assert.deepEqual(result.map(row=>row.instructionSource.id),subjects);
 for(const entry of result){
  const actual=getMiniGameInstructionContent(entry.engine,'pl'),english=getMiniGameInstructionContent(entry.engine,'en');
  assert.equal(entry.scenario,actual.scenario);assert.equal(entry.objective,actual.objective);assert.deepEqual(entry.rules,actual.rules);assert.deepEqual(entry.controls,actual.steps);
  assert.ok(english.objective&&english.scenario&&english.steps.length&&english.rules.length,entry.slug);
  assert.equal(entry.setup[0],MINIGAME_READING_NOTE);assert.equal(entry.timing[0],MINIGAME_READING_NOTE);
  assert.equal(entry.instructionSource.sharedWithRuntime,true);assert.equal(entry.instructionSource.readingStartsTimer,false);
 }
 assert.deepEqual(synchronizeMiniGameInstructions(result),result,'re-reading an updated catalogue must not duplicate preparation or timing instructions');
});
test('shared instruction shaping preserves real rewards, limits, variants, unlocks, source anchors and independent links',()=>{
 const input=baseline(),result=synchronizeMiniGameInstructions(input);
 const changed=new Set(['objective','scenario','rules','controls','setup','timing','win','fail','examples','instructionSource']);
 for(let n=0;n<input.length;n++)for(const key of Object.keys(input[n]))if(!changed.has(key))assert.deepEqual(result[n][key],input[n][key],`${input[n].slug}:${key}`);
});
test('examples for the revised games no longer teach the replaced mechanics or fixed old board counts',()=>{
 const entries=synchronizeMiniGameInstructions(baseline()),get=id=>entries.find(row=>row.engine.id===id);
 const prose=id=>['setup','win','fail','examples'].flatMap(key=>get(id)[key]).join(' ');
 assert.equal(/trzy kraby|własną parę rzędów/i.test(prose('crabs')),false);assert.match(prose('crabs'),/Jeden krab/);
 assert.equal(/odwrócone słowa|aciwtoK/i.test(prose('parrot')),false);assert.match(prose('parrot'),/pojedyncze litery/);
 assert.equal(/pięć lewych|pięcioma prawymi|kolejność.*po prawej/i.test(prose('untangle')),false);
 assert.match(prose('navigation'),/Mgła zasłania rafy/);assert.equal(/Oznaczone rafy|maksymalnie 15 kroków/i.test(prose('navigation')),false);
 assert.match(prose('cooking'),/temperatur/);assert.equal(/trzy składniki|trzech jednostek/i.test(prose('cooking')),false);
 assert.equal(/dokładnie trzech części/i.test(prose('invention')),false);assert.equal(/Cztery pokoje|Wszystkie cztery/i.test(prose('hotel')),false);
});
test('an incomplete, duplicated, unknown or wrong-family catalogue cannot produce apparently complete instructions',()=>{
 const all=baseline();assert.throws(()=>synchronizeMiniGameInstructions(all.slice(1)),/every active/);
 const duplicate=structuredClone(all);duplicate[1]=duplicate[0];assert.throws(()=>synchronizeMiniGameInstructions(duplicate),/duplicate/);
 const unknown=structuredClone(all);unknown[0].engine.id='missing';assert.throws(()=>synchronizeMiniGameInstructions(unknown),/Unknown/);
 const mismatch=structuredClone(all);mismatch[0].family='story';assert.throws(()=>synchronizeMiniGameInstructions(mismatch),/mismatched/);
});
