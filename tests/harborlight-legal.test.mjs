import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { LEGAL_DOCUMENTS, legalAcceptance, validLegalAcceptance } from '../harborlight-legal.js';
import { LEGAL_DOCUMENT_VERSIONS } from '../backend/account-service.mjs';
import { createDevCloud, PROD_PROJECT } from '../harborlight-dev-cloud.js';
import { signInWithProvider } from '../harborlight-auth-providers.js';
const NOW=Date.parse('2026-10-30T12:00:00Z'),UID='legal-player',EMAIL='player@example.invalid';
const config={projectId:PROD_PROJECT,apiKey:'fixture-public-api-key-123456789'};
const token=['header',Buffer.from(JSON.stringify({aud:PROD_PROJECT,iss:'https://securetoken.google.com/'+PROD_PROJECT,sub:UID,exp:NOW/1000+3600})).toString('base64url'),'signature'].join('.');
const reply=(body,status=200)=>({status,ok:status>=200&&status<300,json:async()=>body});
function client(responses){const calls=[],values=new Map();return{calls,cloud:createDevCloud({hostname:'harborlight.pl',now:()=>NOW,storage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},fetch:async(url,options)=>{calls.push({url,options});assert.ok(responses.length,'Unexpected request '+url);return responses.shift();}})};}
test('both explicit current confirmations are required and versions match the server',()=>{
  assert.deepEqual({termsVersion:LEGAL_DOCUMENTS.terms.version,privacyVersion:LEGAL_DOCUMENTS.privacy.version},LEGAL_DOCUMENT_VERSIONS);
  assert.equal(validLegalAcceptance(legalAcceptance(true,true)),true);
  for(const x of [legalAcceptance(false,true),legalAcceptance(true,false),{...legalAcceptance(true,true),termsVersion:'old'},{...legalAcceptance(true,true),privacyAcknowledged:'true'}])assert.equal(validLegalAcceptance(x),false);
});
test('unchecked registration cannot send credentials or open a provider popup',async()=>{
  const h=client([]);await assert.rejects(h.cloud.registerEmail(EMAIL,'password-123',{islandName:'Port'}),{code:'legal-required'});assert.equal(h.calls.length,0);
  let loaded=false;await assert.rejects(signInWithProvider({enabled:true,preprod:false},'Google',{registration:true,islandName:'Port',loadSdk:async()=>{loaded=true;}}),{code:'legal-required'});assert.equal(loaded,false);
});
test('authenticated legal receipt uses a protected API and excludes caller timestamps',async()=>{
  const h=client([reply(config),reply({localId:UID,email:EMAIL,idToken:token,refreshToken:'refresh',expiresIn:'3600'}),reply({...LEGAL_DOCUMENT_VERSIONS,required:true}),reply({...LEGAL_DOCUMENT_VERSIONS,uid:UID,acceptedAt:NOW,privacyAcknowledgedAt:NOW})]);
  await h.cloud.signIn(EMAIL,'password-123');assert.equal((await h.cloud.getLegalStatus()).required,true);
  const proof=await h.cloud.acceptLegal(legalAcceptance(true,true));assert.equal(proof.acceptedAt,NOW);
  assert.equal(h.calls[3].url,'/api/v1/legal');assert.equal(h.calls[3].options.headers.Authorization,'Bearer '+token);
  assert.deepEqual(JSON.parse(h.calls[3].options.body),legalAcceptance(true,true));
});
test('legal pages are accessible static drafts matching their canonical versioned source',()=>{
  execFileSync('python3',['scripts/build_legal_pages.py','--check'],{cwd:new URL('..',import.meta.url)});
  for(const document of [LEGAL_DOCUMENTS.terms,LEGAL_DOCUMENTS.privacy]){
    const html=readFileSync(new URL('../'+document.href,import.meta.url),'utf8');
    assert.ok(html.includes('data-legal-version="'+document.version+'"'));assert.ok(html.includes('Lorem ipsum'));assert.ok(html.includes('DOKUMENT ROBOCZY'));
    assert.ok(!html.includes('<script'),'Reading documents does not require JavaScript');
  }
  const html=readFileSync(new URL('../harborlight-auth.html',import.meta.url),'utf8');
  for(const id of ['terms-accepted','privacy-acknowledged'])assert.ok(!new RegExp('<input[^>]*id="'+id+'"[^>]*\\bchecked\\b').test(html));
});
