import {test} from 'node:test';import assert from 'node:assert/strict';import {TRACK_HEADERS,CONTACT_HEADERS,COMPANY_HEADERS,parseTracker,parseContacts,parseCompanies,companyPeople,isoDate,isApplication,isSent,rowForEdit,safeLink,matches} from './model.js';
const row=(type='Candidatura',status='CV preparado',id='ponte-test-1')=>[type,'Test role','Test company','','','','2026-09-30','','',status,'','','',id];
test('literal status and type preserved, no CV prepared as sent',()=>{const [r]=parseTracker([TRACK_HEADERS,row()]);assert.equal(r.status,'CV preparado');assert(isApplication(r));assert(!isSent(r));});
test('networking never counted as submitted application',()=>{const [r]=parseTracker([TRACK_HEADERS,row('Networking','e-mail enviado')]);assert(!isApplication(r));assert(!isSent(r));});
test('sent and confirmed receipt remain distinct',()=>{const rows=parseTracker([TRACK_HEADERS,row('Candidatura','enviada','1'),row('Candidatura','enviada - recibo confirmado','2')]);assert(rows.every(isSent));assert.notEqual(rows[0].status,rows[1].status);});
test('missing and duplicate IDs block edits',()=>{assert.throws(()=>parseTracker([TRACK_HEADERS,row('Candidatura','CV preparado','')]),/ids/);assert.throws(()=>parseTracker([TRACK_HEADERS,row(),row()]),/ids/);});
test('wrong headers block parse',()=>assert.throws(()=>parseTracker([['bad'],row()]),/schema/));
test('blank rows ignored without inventing dates',()=>{const r=row();r[6]='';const rows=parseTracker([TRACK_HEADERS,[],r]);assert.equal(rows.length,1);assert.equal(rows[0].date,'');assert.equal(rows[0].row,3);});
test('invalid dates rejected, leap date validated',()=>{assert.equal(isoDate('2026-02-29'),'');assert.equal(isoDate('2024-02-29'),'2024-02-29');assert.equal(isoDate('30/09/2026'),'');});
test('find row by ID after reorder',()=>{const opened=parseTracker([TRACK_HEADERS,row()])[0];const fresh=parseTracker([TRACK_HEADERS,row('Candidatura','enviada','other'),row()]);assert.equal(rowForEdit(fresh,opened.id,opened).row,3);});
test('changed notes block save and preserve old row',()=>{const opened=parseTracker([TRACK_HEADERS,row()])[0];const changed=row();changed[10]='new';assert.throws(()=>rowForEdit(parseTracker([TRACK_HEADERS,changed]),opened.id,opened),/conflict/);});
test('network edit rejected',()=>{const rows=parseTracker([TRACK_HEADERS,row('Networking')]);assert.throws(()=>rowForEdit(rows,rows[0].id,rows[0]),/readonly/);});
test('unsafe URLs not linkified',()=>{assert.equal(safeLink('javascript:alert(1)'),null);assert.equal(safeLink('http://example.com'),null);assert.equal(safeLink('https://example.com'),'https://example.com/');});
test('contacts absent fields remain blank and literal text stays literal',()=>{const rows=parseContacts([CONTACT_HEADERS,['Example','Company']]);assert.equal(rows[0][7],'');assert.equal(rows[0][9],'');});
test('search accepts role and company without modifying source',()=>{const [r]=parseTracker([TRACK_HEADERS,row()]);assert(matches(r,'company'));assert(matches(r,'ROLE'));});

test('companies parse with literal fields and header guard',()=>{const rows=parseCompanies([COMPANY_HEADERS,['Example Corp A','Example City','Consultoria','Alta','BIM','','Alex Example','','Networking','0','0','2','','hist','https://example.com']]);assert.equal(rows.length,1);assert.equal(rows[0][0],'Example Corp A');assert.equal(rows[0][14],'https://example.com');assert.throws(()=>parseCompanies([['bad']]),/schema/);});
test('companyPeople matches by normalized prefix only',()=>{const cs=[{cells:['Alex Example','Example Corp A Sverige AB']},{cells:['Sam Sample','Example Corp B Energy']},{cells:['Outra','Example Agency']}];assert.deepEqual(companyPeople('Example Corp A',cs).map(p=>p.cells[0]),['Alex Example']);assert.deepEqual(companyPeople('Example Corp B Energy',cs).map(p=>p.cells[0]),['Sam Sample']);assert.deepEqual(companyPeople('Kopparstaden AB',cs),[]);});

import { classifyApplication, computeResults, resultYears, waitingDays } from './model.js';

const app=(status,date='2026-10-01',id='P-1')=>({type:'Candidatura',status,date,id,cells:[]});
const other=type=>({type,status:'enviada - confirmada',date:'2026-10-01',id:'P-9',cells:[]});

test('classifyApplication mapeia status para categorias de resultado',()=>{
 assert.equal(classifyApplication(app('enviada - confirmada')),'waiting');
 assert.equal(classifyApplication(app('enviada')),'waiting');
 assert.equal(classifyApplication(app('e-mail enviado')),'waiting');
 assert.equal(classifyApplication(app('aguardando retorno')),'waiting');
 assert.equal(classifyApplication(app('triagem')),'screening');
 assert.equal(classifyApplication(app('Entrevista agendada')),'interview');
 assert.equal(classifyApplication(app('descartada')),'rejected');
 assert.equal(classifyApplication(app('não selecionado')),'rejected');
 assert.equal(classifyApplication(app('Vaga suspensa pela empresa')),'suspended');
 assert.equal(classifyApplication(app('status exótico sem regra')),'review');
 assert.equal(classifyApplication(app('')),'review');
});

test('classifyApplication exclui preparação e não-candidaturas',()=>{
 assert.equal(classifyApplication(app('CV e carta preparados - aguardando revisão do Iuri')),null);
 assert.equal(classifyApplication(app('CV em revisão pela empresa')),'screening');
 assert.equal(classifyApplication(app('Preparação para entrevista com a empresa')),null);
 assert.equal(classifyApplication(app('Em revisão')),'review');
 assert.equal(classifyApplication(app('Em análise pelo RH')),'screening');
 assert.equal(classifyApplication(app('aguardando revisão')),'review');
 assert.equal(classifyApplication(app('AGUARDANDO REVISÃO')),'review');
 assert.equal(classifyApplication(app('aguardando  revisão')),'review');
 assert.equal(classifyApplication(app('aguardando revisão do Iuri')),null);
 assert.equal(classifyApplication(app('aguardando minha revisão')),null);
 assert.equal(classifyApplication(other('Contato')),null);
 assert.equal(classifyApplication(other('Empresa')),null);
});

test('computeResults conta enviadas como soma das categorias ativas e respeita ano',()=>{
 const rows=[app('enviada - confirmada','2026-09-01','P-1'),app('triagem','2026-09-02','P-2'),app('entrevista','2026-09-03','P-3'),app('descartada','2026-09-04','P-4'),app('Vaga suspensa','2026-09-05','P-5'),app('estranho','2026-09-06','P-6'),app('CV preparados - aguardando revisão','2026-09-07','P-7'),app('enviada','2025-12-20','P-8')];
 const r=computeResults(rows);
 assert.equal(r.sent,6);
 assert.equal(r.waiting.length,2);
 assert.equal(r.screening.length,1);
 assert.equal(r.interview.length,1);
 assert.equal(r.rejected.length,1);
 assert.equal(r.suspended.length,1);
 assert.equal(r.review.length,1);
 const y=computeResults(rows,'2026');
 assert.equal(y.sent,5);
 assert.equal(y.waiting.length,1);
});

test('resultYears e waitingDays',()=>{
 const rows=[app('enviada','2026-01-10','P-1'),app('enviada','2024-05-01','P-2'),app('enviada','','P-3')];
 assert.deepEqual(resultYears(rows),['2026','2024']);
 assert.equal(waitingDays(''),null);
 assert.equal(waitingDays('2026-10-20',new Date('2026-10-24T12:00:00Z')),4);
 assert.equal(waitingDays('2026-10-25',new Date('2026-10-24T12:00:00Z')),null);
});
