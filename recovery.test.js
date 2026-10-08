// Recovery contract, synthetic IDs and token only. Run: npm test.
// These tests do not prove real OAuth, transactional concurrency or safe retry
// after an ambiguous write. A post-write read failure MUST NOT imply no write.
import {test, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {setSession, clearSession, hasSession, request, saveEdit} from './api.js';
import {TRACK_HEADERS, CONTACT_HEADERS, parseTracker} from './model.js';
const files={tracker:'synthetic-tracker',contacts:'synthetic-contacts'};
let rows, writes, readsAfterWrite, behavior;
const originalFetch=global.fetch;
beforeEach(()=>{
 rows=[TRACK_HEADERS,['Candidatura','Synthetic role','Synthetic company','','','','2026-01-01','','','CV preparado','Before','','','synthetic-id']];
 writes=0;readsAfterWrite=0;behavior='ok';
 setSession({token:'synthetic-token',expires:Date.now()+60000});
 global.fetch=async(url, options={})=>{
  if(options.method==='PUT'){
   writes++;const vals=JSON.parse(options.body).values[0];rows[1][9]=vals[0];rows[1][10]=vals[1];
   if(behavior==='lost-response')throw Error('response lost after server committed');
   if(behavior==='concurrent')rows[1][10]='Concurrent writer after preflight';
   return Response.json({updatedCells:2});
  }
  if(writes){readsAfterWrite++;if(behavior==='readback-offline')throw Error('offline');if(behavior==='readback-expired')return new Response('{}',{status:401});}
  if(url.includes('/values/'))return Response.json({values:url.includes(files.tracker)?rows:[CONTACT_HEADERS,['Synthetic person','Synthetic company']]});
  return Response.json({spreadsheetId:url.includes(files.tracker)?files.tracker:files.contacts,properties:{title:'Synthetic'},sheets:(url.includes(files.tracker)?['Candidaturas']:['Pessoas - geral']).map(title=>({properties:{title}}))});
 };
});
afterEach(()=>{global.fetch=originalFetch;clearSession();});
for(const behaviorName of ['lost-response','readback-offline','readback-expired']){
 test(`${behaviorName}: ambiguous write rejects without automatic duplicate PUT`,async()=>{
  const opened=parseTracker(rows)[0];behavior=behaviorName;
  await assert.rejects(saveEdit(files,opened,'enviada','Saved synthetic note'));
  assert.equal(writes,1);assert.equal(rows[1][10],'Saved synthetic note');
  if(behaviorName==='readback-expired')assert.equal(hasSession(),false);
 });
}
test('readback catches a concurrent modification after preflight',async()=>{
 const opened=parseTracker(rows)[0];behavior='concurrent';
 await assert.rejects(saveEdit(files,opened,'enviada','My synthetic note'),/verify/);
 assert.equal(writes,1);assert.equal(rows[1][10],'Concurrent writer after preflight');
 // Detection is not prevention: the production API uses an unconditional PUT.
});
test('expired local session prevents even the first HTTP request',async()=>{
 setSession({token:'synthetic',expires:Date.now()-1});let calls=0;global.fetch=async()=>{calls++;return Response.json({});};
 await assert.rejects(request('https://example.invalid'),/expired/);assert.equal(calls,0);
});
test('quota response rejects, and a later request can recover without session loss',async()=>{
 let calls=0;global.fetch=async()=>++calls===1?new Response('{}',{status:429}):Response.json({ok:true});
 await assert.rejects(request('https://example.invalid'),/unavailable/);assert(hasSession());
 assert.deepEqual(await request('https://example.invalid'),{ok:true});assert.equal(calls,2);
});
test('invalid JSON rejects and a later read recovers',async()=>{
 global.fetch=async()=>new Response('{broken');await assert.rejects(request('https://example.invalid'));
 global.fetch=async()=>Response.json({ok:true});assert.deepEqual(await request('https://example.invalid'),{ok:true});
});
