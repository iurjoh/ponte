import {chromium} from '@playwright/test';import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {TRACK_HEADERS,CONTACT_HEADERS,COMPANY_HEADERS} from './model.js';
const server=createServer(async(req,res)=>{try{const file=decodeURIComponent(req.url.split('?')[0]);if(file.includes('..'))throw 0;const body=await readFile('dist'+(file==='/'?'/index.html':file));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(8788,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome'});const results=[];
const rows=[TRACK_HEADERS,
 ['Candidatura','Analista de projetos','Empresa Aurora','','','','2026-10-16','CV.pdf','Email','enviada - confirmada','','confirmação registrada','https://example.com/cv','test-1'],
 ['Candidatura','Coordenador técnico','Empresa Horizonte','','','','2026-10-12','','Email','triagem','','recibo de candidatura','','test-2'],
 ['Candidatura','Pessoa desenvolvedora','Empresa Farol','','','','2026-10-14','','Email','Entrevista agendada','','','','test-3'],
 ['Candidatura','Cargo antigo','Empresa Passada','','','','2026-08-01','','Email','descartada','','','','test-4'],
 ['Candidatura','Cargo congelado','Empresa Gelo','','','','2026-09-01','','Email','Vaga suspensa pela empresa','','','','test-5'],
 ['Candidatura','Cargo estranho','Empresa X','','','<img src=x onerror=alert(1)>','2026-09-15','','Email','status exótico sem regra','','','','test-6'],
 ['Candidatura','Cargo em preparação','Empresa Futura','','','','2026-10-20','','Email','CV e carta preparados - aguardando revisão do Iuri','','','','test-7'],
 ['Candidatura','Cargo em análise','Empresa Seletiva','','','','2026-10-15','','Email','CV em revisão pela empresa','','','','test-9'],
 ['Candidatura','Cargo prep entrevista','Empresa Preparo','','','','2026-10-18','','Email','Preparação para entrevista com a empresa','','','','test-10'],
 ['Candidatura','Cargo ambíguo','Empresa Dúvida','','','','2026-10-17','','Email','aguardando revisão','','','','test-11'],
 ['Networking','Connection','Empresa Aurora','','','','','','Email','contato enviado','','','','test-8']];
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
 const ctx=await browser.newContext({viewport:{width,height}});const page=await ctx.newPage();let writes=0;
 await page.route('**/config.js',r=>r.fulfill({contentType:'text/javascript',body:"export const config={clientId:'fake',appId:'fake',pickerKey:'fake'};"}));
 await page.route('https://accounts.google.com/gsi/client',r=>r.fulfill({contentType:'text/javascript',body:`window.google={accounts:{oauth2:{initTokenClient:o=>({requestAccessToken:()=>o.callback({access_token:'synthetic',expires_in:3600})}),revoke:(t,c)=>c()}}};`}));
 await page.route('https://apis.google.com/js/api.js',r=>r.fulfill({contentType:'text/javascript',body:`window.gapi={load:(n,c)=>{google.picker={ViewId:{SPREADSHEETS:'s'},Action:{PICKED:'picked'},DocsView:class{setIncludeFolders(){return this}},PickerBuilder:class{addView(){return this}setOAuthToken(){return this}setDeveloperKey(){return this}setAppId(){return this}setOrigin(){return this}setCallback(c){this.c=c;return this}build(){const c=this.c;return {setVisible:()=>{window.picks=(window.picks||0)+1;c({action:'picked',docs:[{id:window.picks===1?'tracker-test':'contacts-test'}]})}}}}};c()}};`}));
 await page.route('https://www.googleapis.com/oauth2/v3/userinfo',r=>r.fulfill({json:{email:'owner@example.com',email_verified:true}}));
 await page.route('https://sheets.googleapis.com/**',r=>{const url=r.request().url();if(r.request().method()==='PUT'){writes++;return r.fulfill({json:{updatedCells:2}});}if(url.includes('/values/')){if(url.includes('tracker-test'))return r.fulfill({json:{values:rows}});if(url.includes('Empresas'))return r.fulfill({json:{values:[COMPANY_HEADERS,['Empresa Aurora','Example City','Consultoria','Alta','Projetos','Nenhuma','Example person','vaga 1','Já aplicou','2','1','1','2026-09-29','histórico','https://example.com']]}});return r.fulfill({json:{values:[CONTACT_HEADERS,['Example person','Empresa Aurora','Test role','Test area','','person@example.com','https://example.com','2026-09-28','Contato mapeado','','Synthetic source']]}});}const isTracker=url.includes('tracker-test');return r.fulfill({json:{spreadsheetId:isTracker?'tracker-test':'contacts-test',properties:{title:'Synthetic'},sheets:(isTracker?['Candidaturas']:['Pessoas - geral','Empresas']).map(title=>({properties:{title}}))}});});
 await page.goto('http://127.0.0.1:8788');
 await page.getByRole('button',{name:'Conectar com Google',exact:true}).click();await page.getByLabel('E-mail da conta Google').fill('owner@example.com');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByRole('button',{name:'Selecionar rastreador',exact:true}).click();await page.getByRole('button',{name:'Selecionar contatos',exact:true}).click();
 await page.getByRole('button',{name:'Central de vagas',exact:true}).click();
 await page.getByRole('button',{name:'Resultados',exact:true}).click();
 const stats=await page.locator('#results .stats .stat').allTextContents();
 const joined=stats.join(' ');
 for(const want of ['Enviadas6','Aguardando1','Em triagem2','Em entrevista1','Não selecionadas1','Vaga suspensa1','Revisar classificação2']) if(!joined.replace(/\s+/g,'').includes(want.replace(/\s+/g,''))) throw new Error(name+' metric missing: '+want+' in '+joined);
 if(await page.locator('text=CV e carta preparados').count()) throw new Error(name+' preparation row leaked');
 if(await page.locator('text=Cargo em preparação').count()) throw new Error(name+' preparation card leaked');
 if(await page.locator('text=Cargo prep entrevista').count()) throw new Error(name+' prep-for-interview leaked as interview');
 if(await page.locator('text=não entram na soma').count()===0 && await page.locator('text=not counted').count()===0) throw new Error(name+' footer clarity missing');
 if(await page.locator('text=Connection').count()) throw new Error(name+' networking leaked');
 await page.getByText('enviada - confirmada · 8 dias').waitFor();
 await page.screenshot({path:'/tmp/ponte-mockups/results-'+name+'.png',fullPage:true});
 await page.getByRole('button',{name:'Triagem e entrevistas',exact:true}).click();
 if(await page.locator('#results .rowcard').count()!==3) throw new Error(name+' active filter should show 3');
 await page.getByRole('button',{name:'Revisar classificação',exact:true}).first().click();
 if(await page.locator('#results .rowcard').count()!==2) throw new Error(name+' review filter should show 2');
 await page.getByRole('button',{name:'Todos',exact:true}).first().click();
 const rejectedCard=page.locator('#results .rowcard',{hasText:'Cargo antigo'});if(await rejectedCard.locator('text=Próximo passo').count())throw new Error(name+' rejected shows next step');
 const suspCard=page.locator('#results .rowcard',{hasText:'Cargo congelado'});await suspCard.locator('text=reabertura').waitFor();
 if(await page.locator('img[onerror]').count()) throw new Error(name+' XSS attribute rendered');
 await page.screenshot({path:'/tmp/ponte-mockups/results-'+name+'-review.png',fullPage:true});
 await page.getByRole('button',{name:'EN',exact:true}).click();
 await page.getByRole('button',{name:'Review classification',exact:true}).first().waitFor();
 await page.screenshot({path:'/tmp/ponte-mockups/results-'+name+'-en.png',fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw new Error(name+' overflows');
 if(writes!==0)throw new Error(name+' results view wrote');
 results.push({name,passed:true});await ctx.close();
}
console.log(JSON.stringify(results));await browser.close();server.close();
