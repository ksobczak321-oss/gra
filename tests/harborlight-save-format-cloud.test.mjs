import test from 'node:test';
import assert from 'node:assert/strict';
import { createDevCloud, accountSaveKey, DEV_PROJECT, LOCAL_DEV_PROJECT } from '../harborlight-dev-cloud.js';
import { createDevSync } from '../harborlight-dev-sync.js';
import { createState } from '../harborlight-v1-state.js';

const NOW=Date.UTC(2026,10,19,12), UID='dev-admin3';
const version={revision:8,updateTime:new Date(NOW).toISOString()};
const payload=JSON.stringify(createState(NOW));
const reply=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const token=['header',Buffer.from(JSON.stringify({aud:DEV_PROJECT,iss:`https://securetoken.google.com/${DEV_PROJECT}`,sub:UID,exp:NOW/1000+3600})).toString('base64url'),'signature'].join('.');

for(const local of [false,true])test(`packing capability and nonrecoverable save fence on ${local?'local DEV':'PRE-PROD'}`,async()=>{
 const calls=[],values=new Map(),projectId=local?LOCAL_DEV_PROJECT:DEV_PROJECT;
 const cloud=createDevCloud({hostname:local?'localhost':'harborlight-dev.web.app',localDevelopment:local,now:()=>NOW,
  storage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
  fetch:async(url,options={})=>{
   calls.push({url,options});
   if(url==='/__/firebase/init.json')return reply({projectId,apiKey:'fixture-public-api-key-123456789'});
   if(url==='/api/v1/config')return reply({accountApi:true,projectId,environment:'preprod'});
   if(url==='/api/dev/config')return reply({localDev:true,accountApi:true,projectId,environment:'development',persistence:'server-process-memory'});
   if(url==='/api/dev/sign-in')return reply({uid:UID,login:'admin3',projectId,idToken:'hl-local.'+'a'.repeat(43),expiresAt:NOW+3600000,lastActivityAt:NOW});
   if(url.includes('accounts:signInWithPassword'))return reply({localId:UID,email:'admin3@dev.harborlight.pl',idToken:token,refreshToken:'fixture-refresh',expiresIn:'3600'});
   assert.equal(url,'/api/v1/island');
   if(options.method==='PUT')return reply({error:'unsupported-save-format'},409);
   return reply({account:{generation:2,expired:false},island:{payload,generation:2,version}});
  }});
 await cloud.signIn('admin3','fixture-password');
 const scheduled=[];
 const sync=createDevSync({cloud,account:{uid:UID},saveKey:accountSaveKey(UID,projectId),schedule:fn=>{scheduled.push(fn);return scheduled.length;},cancel:()=>{}});
 try{
  await sync.open(payload);
  sync.queue(payload.replace('"coins":100','"coins":101'));
  const before=scheduled.length;
  assert.equal(await sync.flush(),false);
  assert.equal(sync.status,'unsupported-save-format');
  assert.equal(sync.writable,false);
  assert.equal(scheduled.length,before,'unsupported format must not schedule conflict recovery');
  const saves=calls.filter(c=>c.options.method==='PUT');
  assert.equal(saves.length,1);
  assert.equal(JSON.parse(saves[0].options.body).savePackingVersion,1);
 }finally{sync.dispose();}
});
