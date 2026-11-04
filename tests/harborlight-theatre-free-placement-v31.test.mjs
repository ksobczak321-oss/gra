import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../harborlight-v1-theatre.js';

const now = Date.parse('2026-11-04T12:00:00Z');
const clone = x => JSON.parse(JSON.stringify(x));
const world = () => { const s={worldTimeMs:now,resources:{coins:100000}};T.normalizeTheatre(s);return s; };
const act = (s,type,data={}) => T.theatreAction(s,{type,...data},{noAds:true});
const ok = (s,type,data={}) => { const r=act(s,type,data);assert.equal(r.ok,true,r.message);return r; };
const buy = (s,kind,slot) => ok(s,'theatreBuy',{decoration:kind,slot}).item;

test('free positioning retains legacy possession tokens while preserving arbitrary tenths of a scene pixel',()=>{
 const s=world(),a=buy(s,'fountain',0),b=buy(s,'bench',1),coins=s.resources.coins;
 ok(s,'theatreMove',{id:a.id,x:457.3,y:467.8});
 assert.equal(a.slot,0);assert.deepEqual(T.theatrePosition(s,a),{x:457.3,y:467.8});
 assert.equal(s.resources.coins,coins);assert.equal(s.theatre.collection.length,2);
 const restored={worldTimeMs:now+86400000,resources:{...s.resources}};T.normalizeTheatre(restored,clone(s));
 assert.deepEqual(T.theatrePosition(restored,restored.theatre.collection[0]),{x:457.3,y:467.8});
 assert.deepEqual(restored.theatre.collection,s.theatre.collection);assert.equal(b.slot,1);
});

test('a free point rejects invalid or off-garden values atomically',()=>{
 const s=world(),a=buy(s,'tree',19);
 for(const data of [{x:149,y:400},{x:500,y:309},{x:851,y:500},{x:500,y:601},{x:NaN,y:400},{x:400,y:Infinity},{x:'450',y:500},{x:500}]){
  const before=clone(s);assert.equal(act(s,'theatreMove',{id:a.id,...data}).ok,false);assert.deepEqual(s,before);
 }
});

test('twenty placed decorations can overlap artistically but a twenty-first cannot be installed',()=>{
 const s=world();
 for(let n=0;n<20;n++)ok(s,'theatreBuy',{decoration:'flowerbed',x:400+n*.5,y:410+n*.5});
 assert.equal(T.theatreStatus(s).usedSlots,20);
 const spare=buy(s,'tree',null);const before=clone(s);
 assert.equal(act(s,'theatrePlace',{id:spare.id,x:500,y:500}).code,'garden-full');assert.deepEqual(s,before);
 ok(s,'theatreRemove',{id:s.theatre.collection[5].id});
 ok(s,'theatrePlace',{id:spare.id,x:600.2,y:498.7});assert.equal(T.theatreStatus(s).usedSlots,20);
 assert.deepEqual(T.theatrePosition(s,s.theatre.collection.find(item=>item.id===spare.id)),{x:600.2,y:498.7});
});

test('saved designs remember free coordinates without rolling back levels or balances',()=>{
 const s=world(),a=buy(s,'statue',2),b=buy(s,'lantern',3);
 ok(s,'theatreMove',{id:a.id,x:350.2,y:418.9});ok(s,'theatreSaveLayout',{slot:0});
 for(let n=1;n<22;n++)ok(s,'theatreUpgrade',{id:a.id});
 const coins=s.resources.coins;ok(s,'theatreMove',{id:a.id,x:699.5,y:550.1});ok(s,'theatreRemove',{id:b.id});
 ok(s,'theatreRestoreLayout',{slot:0});
 assert.deepEqual(T.theatrePosition(s,a),{x:350.2,y:418.9});assert.equal(s.theatre.collection.find(item=>item.id===a.id).level,22);assert.equal(s.resources.coins,coins);assert.equal(b.slot,3);
 const status=T.theatreStatus(s);status.positions[a.id].x=999;status.layouts[0].positions[a.id].y=999;
 assert.equal(T.theatrePosition(s,a).x,350.2);assert.equal(s.theatre.layouts[0].positions[a.id].y,418.9);
});

test('legacy saves acquire coordinates but retain every possession, paid level, ad and layout',()=>{
 const s=world(),a=buy(s,'fountain',6);for(let n=1;n<4;n++)ok(s,'theatreUpgrade',{id:a.id});
 T.theatreAction(s,{type:'theatreBeginUpgradeAd',id:a.id});ok(s,'theatreSaveLayout',{slot:2});
 const raw=clone(s);delete raw.theatre.positions;delete raw.theatre.layouts[2].positions;
 const restored={worldTimeMs:now,resources:{...s.resources}};T.normalizeTheatre(restored,raw);
 assert.deepEqual(restored.theatre.collection,s.theatre.collection);assert.deepEqual(restored.theatre.pendingUpgrade,s.theatre.pendingUpgrade);
 assert.deepEqual(T.theatrePosition(restored,a),{x:590,y:375});assert.equal(restored.resources.coins,s.resources.coins);
 ok(restored,'theatreRestoreLayout',{slot:2});assert.equal(restored.theatre.collection[0].level,4);
});

test('welcome garden is an explicit once-only gift and removing it never enables a repeat grant',()=>{
 const s=world(),coins=s.resources.coins;assert.equal(s.theatre.collection.length,0);assert.equal(T.theatreStatus(s).welcomeGardenAvailable,true);
 ok(s,'theatreWelcomeGarden');assert.equal(s.theatre.collection.length,6);assert.equal(s.resources.coins,coins);
 assert.equal(T.theatreStatus(s).usedSlots,6);assert.equal(s.theatre.welcomeGardenGranted,true);
 for(const item of s.theatre.collection)ok(s,'theatreRemove',{id:item.id});
 assert.equal(T.theatreStatus(s).usedSlots,0);assert.equal(T.theatreStatus(s).welcomeGardenAvailable,false);
 const before=clone(s);assert.equal(act(s,'theatreWelcomeGarden').ok,false);assert.deepEqual(s,before);
 const restored={worldTimeMs:now+86400000,resources:{...s.resources}};T.normalizeTheatre(restored,clone(s));
 assert.equal(T.theatreStatus(restored).welcomeGardenAvailable,false);assert.equal(restored.theatre.collection.length,6);
});

test('opening a welcome option never replaces an existing owned arrangement',()=>{
 const s=world(),a=buy(s,'gateway',7);ok(s,'theatreMove',{id:a.id,x:632.4,y:466.6});
 const before=clone(s.theatre.collection);ok(s,'theatreWelcomeGarden');
 assert.deepEqual(s.theatre.collection,before);assert.deepEqual(T.theatrePosition(s,a),{x:632.4,y:466.6});
});

test('untrusted layout positions cannot move props beyond the illustrated courtyard or forge ownership',()=>{
 const s=world(),a=buy(s,'mosaic',0);ok(s,'theatreSaveLayout',{slot:0});
 const raw=clone(s);raw.theatre.positions[a.id]={x:1e99,y:-20};raw.theatre.layouts[0].positions={
  [a.id]:{x:-300,y:450},'decoration-9999':{x:500,y:500}
 };
 const restored={worldTimeMs:now,resources:{...s.resources}};T.normalizeTheatre(restored,raw);ok(restored,'theatreRestoreLayout',{slot:0});
 assert.deepEqual(T.theatrePosition(restored,a),{x:270,y:310});assert.equal(restored.theatre.collection.length,1);
 assert.equal(restored.theatre.positions['decoration-9999'],undefined);
});
