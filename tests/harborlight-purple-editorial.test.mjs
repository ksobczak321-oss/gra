import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEVELOPMENT_COPY, developmentProductDescription } from '../harborlight-v1-development-copy.js';
import { lighthouseLevelName } from '../harborlight-v1-copy.js';
import { lessonCopy, APPROVED_LESSON_IDS } from '../harborlight-v1-approved-copy.js';
import { RESEARCH_CATALOG } from '../harborlight-v1-education.js';
import { RECIPE_CATALOG } from '../harborlight-v1-provisions.js';

const merge = JSON.parse(readFileSync(new URL('../docs/v32/EDITORIAL-PURPLE-TABS-MERGE.json', import.meta.url)));
test('all165 reviewed purple rows bind to current runtime copy; unselected tabs stay outside this import',()=>{
 assert.deepEqual(merge.selected_sheets,['Samouczek','Produkty i receptury','Badania','Nazwy poziomów Latarni']);
 assert.equal(merge.unselected_sheet_contents_read,false);
 assert.equal(merge.rows,165);
 assert.equal(new Set(merge.records.map(row=>row.id)).size,165);
 for(const row of merge.records) {
  const actual = row.id.startsWith('LIGHTHOUSE-LEVEL-') ? lighthouseLevelName(Number(row.id.slice(-3)),'pl') : DEVELOPMENT_COPY[row.id];
  assert.equal(actual,row.effective,`${row.sheet}!${row.row}`);
  assert.ok(!['?','co za kierunki?','znowu nie wiem o co chodzi','za poziom?','trzeba troche rozbudowac'].includes(actual));
 }
});
test('all25 preserved practical lessons read the reviewed text through their real copy API',()=>{
 for(const [index,id] of APPROVED_LESSON_IDS.entries()) {
  assert.equal(lessonCopy(id,'pl',{curriculum:7}).description,DEVELOPMENT_COPY[`LESSON-${String(index+1).padStart(2,'0')}`]);
 }
 assert.match(DEVELOPMENT_COPY['LESSON-02'],/Priorytety transportu/);
 assert.doesNotMatch(DEVELOPMENT_COPY['LESSON-02']+DEVELOPMENT_COPY['LESSON-11'],/Więcej o budynku/);
 assert.doesNotMatch(DEVELOPMENT_COPY['LESSON-03'],/otręb|…/);
});
test('research effects use approved levels wording without changing numerical recipe rules',()=>{
 for(const [index,entry] of RESEARCH_CATALOG.filter(row=>row.kind==='repeat').entries()) {
  assert.equal(entry.effect,DEVELOPMENT_COPY[`RES-${String(index+1).padStart(2,'0')}`]);
 }
 assert.match(RESEARCH_CATALOG[0].effect,/poziom tego badania/);
 assert.deepEqual(RECIPE_CATALOG.flour.inputs,{grain:4});
 assert.deepEqual(RECIPE_CATALOG.flour.outputs,{flour:1});
 assert.deepEqual(RECIPE_CATALOG.farmCheese.inputs,{sourMilk:4});
});
test('physical product IDs resolve to reviewed descriptions, including central-only sour milk and outfits',()=>{
 for(const [physical,copyId] of Object.entries({rawMilk:'raw_milk',sourMilk:'sour_milk',pasteurizedMilk:'pasteurized_milk',civilianClothes:'civilian_outfit',militaryClothes:'military_outfit',professorRobes:'professor_robe'})) {
  assert.equal(developmentProductDescription(physical),DEVELOPMENT_COPY[`PROD-${copyId}`]);
 }
 assert.match(developmentProductDescription('grain'),/1 punkt na porcję/);
 assert.match(developmentProductDescription('flour'),/1 porcja mąki/);
 assert.equal(developmentProductDescription('not-a-good'),'');
});
