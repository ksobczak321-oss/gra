import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {ISLAND_PUZZLE_CATALOG} from '../harborlight-v1-story-catalog.js';

const ROOT=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const exporter=fs.readFileSync(path.join(ROOT,'scripts/export_minigame_catalog.mjs'),'utf8');
// Evaluate only the exporter's actual pure reference functions. Importing the
// CLI would generate the catalogue, which this read-only test must not do.
const start=exporter.indexOf('const source = '),end=exporter.indexOf('const commonPractice = [');
assert.ok(start>=0&&end>start);
const {source,puzzleMechanicSources}=vm.runInNewContext(exporter.slice(start,end)+';({source,puzzleMechanicSources})',{fs,path,ROOT});
const model=fs.readFileSync(path.join(ROOT,'harborlight-v1-island-puzzles.js'),'utf8');
const lineAt=(body,offset)=>body.slice(0,offset).split('\n').length;
const definitionLines=id=>model.split('\n').flatMap((line,index)=>new RegExp('^engine\\.'+id+'\\s*=\\s*\\{').test(line)?[index+1]:[]);

test('all twenty-four puzzle references identify the effective current definition',()=>{
  assert.equal(ISLAND_PUZZLE_CATALOG.length,24);
  let overridden=0;
  for(const {id} of ISLAND_PUZZLE_CATALOG){
    const refs=puzzleMechanicSources(id);
    assert.ok(refs.length>0,id);
    if(['signal-line','harbor-routes'].includes(id)){
      assert.equal(refs[0].line,lineAt(model,model.indexOf("for(const variant of ['signal-line','harbor-routes'])")),id);
      const original=fs.readFileSync(path.join(ROOT,refs[1].path),'utf8');
      const needle=id==='signal-line'?'export function createSignalGraph(':'export function createHarborRoutes(';
      assert.equal(refs[1].line,lineAt(original,original.indexOf(needle)),id);
      continue;
    }
    const definitions=definitionLines(id);
    assert.ok(definitions.length>0,id);
    assert.equal(refs[0].line,definitions.at(-1),id+' must point to current override');
    if(definitions.length>1){
      overridden++;
      assert.equal(refs[1].line,definitions[0],id+' legacy definition retained');
      assert.equal(refs[2].line,lineAt(model,model.indexOf('const puzzleEngine =')),id+' version selector retained');
    }else assert.equal(refs.length,1,id);
  }
  assert.equal(overridden,16,'all reviewed V2 overrides must be covered');
});

test('ordinary source references retain first-match semantics and unknown anchors fail',()=>{
  const file='harborlight-v1-island-puzzles.js',needle='engine.crabs={';
  assert.equal(source(file,needle,'test').line,definitionLines('crabs')[0]);
  assert.equal(source(file,needle,'test',true).line,definitionLines('crabs').at(-1));
  assert.throws(()=>puzzleMechanicSources('missing-puzzle'),/Missing source anchor/);
});
