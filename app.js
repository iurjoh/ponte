import {config} from './config.js';
import {strings} from './i18n.js';
import {setSession,clearSession,hasSession,identify,loadFiles,saveEdit} from './api.js';
import {isApplication,isSent,safeLink,matches,companyPeople,PonteError} from './model.js';
const root=document.querySelector('#app');
let lang='pt',page='home',section='applications',view=innerWidth<650?'list':'board',netView='people',data=null,files=null,account='',error='',success='',busy=false,token='',expiryTimer=null,expectedAccount='',q='',type='',status='',edit=null,client=null,pickerLoaded=false;
const t=k=>strings[lang][k]||k;
function el(tag,attrs={},...children){const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k.startsWith('on'))n.addEventListener(k.slice(2),v);else if(k==='class')n.className=v;else if(k==='text')n.textContent=v;else if(k==='value')n.value=v;else if(k==='disabled')n.disabled=v;else n.setAttribute(k,v);}for(const c of children.flat()){if(c!==undefined&&c!==null)n.append(c instanceof Node?c:document.createTextNode(String(c)));}return n;}
const btn=(label,fn,cls='',disabled=false)=>el('button',{type:'button',onclick:fn,class:cls,disabled},label);
function changeLanguage(next){lang=next;document.documentElement.lang=lang==='pt'?'pt-BR':'en';render();}
function language(){return el('div',{class:'lang','aria-label':t('language')},...['pt','en'].map(l=>btn(l==='pt'?'PT':'EN',()=>changeLanguage(l),lang===l?'active':'')));}
function logo(){const b=el('div',{class:'brand'},'Ponte');const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 48 48');const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d','M5 36V22Q24 2 43 22V36M5 25H43M16 16V36M32 16V36');p.setAttribute('stroke','#153d36');p.setAttribute('stroke-width','3');p.setAttribute('fill','none');s.append(p);b.prepend(s);return b;}
function notify(e){error=e.code==='network'?'networkError':(e.code||'unavailable');success='';if(['expired','permission','wrongAccount'].includes(e.code))wipe();busy=false;render();}
function wipe(){clearSession();token='';data=null;files=null;account='';edit=null;clearTimeout(expiryTimer);document.querySelector('dialog')?.remove();}
function disconnect(revoke=false){const old=token;wipe();error='';success='';page='home';render();if(revoke&&old&&window.google?.accounts?.oauth2)google.accounts.oauth2.revoke(old,()=>{});}
function errorBox(){if(!error)return null;return el('div',{class:'error',role:'alert'},el('p',{},t(error)),btn(['expired','permission','wrongAccount'].includes(error)?t('reconnect'):t('retry'),()=>files?refresh():connect(),'small'));}
function heading(title,sub=''){return el('div',{class:'titlebar'},el('div',{},el('div',{class:'eyebrow'},t('phase')),el('h1',{},title),sub?el('div',{class:'note'},sub):null),data?btn(t('refresh'),refresh,'small',busy):null);}
function render(){
 if(data&&!hasSession()){wipe();error='expired';}
 root.replaceChildren(el('a',{href:'#content',class:'skip'},t('a11ySkip')));
 const header=el('header',{},logo());
 if(data)header.append(el('nav',{'aria-label':'Ponte'},...['home','central','settings'].map(p=>btn(t(p),()=>{page=p;success='';render();},page===p?'active':''))),el('span',{class:'account-email'},account));
 header.append(language());root.append(header);
 const main=el('main',{id:'content',tabindex:'-1'});root.append(main);
 if(error)main.append(errorBox());if(success)main.append(el('div',{class:'success',role:'status'},t(success)));
 if(busy&&!data){main.append(el('div',{class:'loading',role:'status'},t('loading')));}
 else if(!data){if(token)renderSelection(main);else renderLanding(main);}
 else if(page==='home')renderDashboard(main);else if(page==='central')renderCentral(main);else renderSettings(main);
 root.append(el('footer',{},'Ponte · '+t('foot')));
}
function renderLanding(main){
 const copy=el('div',{},el('div',{class:'eyebrow'},t('private')),el('h1',{},t('tag')),el('p',{class:'lede'},t('subtitle')),btn(t('connect'),connect,'primary'),el('p',{class:'note'},t('privacy')),el('p',{class:'note'},t('authNote')));
 const art=el('div',{class:'art','aria-hidden':'true'});const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 420 250');svg.innerHTML='<path d="M20 185H400M55 185V107Q210 -8 365 107V185M55 120H365M110 75V185M165 54V185M255 54V185M310 75V185" fill="none" stroke="currentColor" stroke-width="4"/><path d="M20 209Q90 195 150 209T280 209T400 209M20 228Q90 214 150 228T280 228T400 228" stroke="#56796a" fill="none" stroke-width="2"/>';art.append(svg,el('div',{class:'art-label'},t('foot')));main.append(el('section',{class:'hero'},copy,art));
}
function dialogBase(title){const dialog=el('dialog',{'aria-label':title});root.append(dialog);dialog.addEventListener('cancel',()=>{edit=null;dialog.remove();});dialog.showModal();return dialog;}
function connect(){
 if(!config.clientId||!config.appId||!config.pickerKey){error='notConfigured';render();return;}
 if(!window.google?.accounts?.oauth2){error='unavailable';render();return;}
 error='';const d=dialogBase(t('confirmAccount'));const input=el('input',{type:'email',id:'account-confirm',required:'',autocomplete:'email'});
 const form=el('form',{},el('h2',{},t('confirmAccount')),el('p',{class:'note'},t('accountHelp')),el('div',{class:'field'},el('label',{for:'account-confirm'},t('email')),input),el('p',{class:'note'},t('privacy')),el('p',{class:'note'},t('consent')));
 form.append(el('div',{class:'actions'},el('button',{type:'submit',class:'primary'},t('continue')),btn(t('cancel'),()=>d.remove())));
 form.addEventListener('submit',event=>{event.preventDefault();expectedAccount=input.value.trim().toLowerCase();d.remove();authorize();});d.append(form);input.focus();
}
function authorize(){
 client=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:'openid email profile https://www.googleapis.com/auth/drive.file',include_granted_scopes:false,callback:async result=>{
 if(result.error){notify(new PonteError('permission'));return;}
 token=result.access_token;setSession({token,expires:Date.now()+Number(result.expires_in)*1000});clearTimeout(expiryTimer);expiryTimer=setTimeout(()=>{wipe();error='expired';render();},Number(result.expires_in)*1000);
 busy=true;render();try{const user=await identify();if(!user.email_verified||user.email?.toLowerCase()!==expectedAccount)throw new PonteError('wrongAccount');account=user.email;busy=false;render();}catch(e){notify(e);}
 },error_callback:()=>notify(new PonteError('permission'))});client.requestAccessToken({prompt:'consent',hint:expectedAccount});
}
function renderSelection(main){main.append(el('section',{class:'setup'},heading(t('choose')),el('p',{class:'lede'},t('pickerHelp')),el('p',{class:'note'},t('selectRequired')),el('div',{class:'actions'},btn(t('chooseTracker'),()=>openPicker('tracker'),'primary'),btn(t('chooseContacts'),()=>openPicker('contacts'),'primary')),el('p',{class:'note'},t('privacy')),btn(t('disconnect'),()=>disconnect())));}
async function openPicker(kind){
 if(!hasSession()){notify(new PonteError('expired'));return;}
 if(!window.gapi){notify(new PonteError('unavailable'));return;}
 if(!pickerLoaded){await new Promise(resolve=>gapi.load('picker',resolve));pickerLoaded=true;}
 const docsView=new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS).setIncludeFolders(false);
 const picker=new google.picker.PickerBuilder().addView(docsView).setOAuthToken(token).setDeveloperKey(config.pickerKey).setAppId(config.appId).setOrigin(location.origin).setCallback(async picked=>{
 if(picked.action!==google.picker.Action.PICKED)return;
 const id=picked.docs?.[0]?.id;if(!id)return;files={...files,[kind]:id};
 if(files.tracker&&files.contacts){busy=true;error='';render();try{data=await loadFiles(files);busy=false;page='home';render();}catch(e){data=null;notify(e);}}else render();
 }).build();picker.setVisible(true);
}
async function refresh(){if(!files)return;busy=true;error='';success='';render();try{data=await loadFiles(files);busy=false;render();}catch(e){data=null;notify(e);}}
function stat(label,count){return el('div',{class:'stat'},el('span',{},label),el('strong',{},count));}
function dateText(date){return date?new Intl.DateTimeFormat(lang==='pt'?'pt-BR':'en-GB',{timeZone:'UTC'}).format(new Date(date+'T00:00:00Z')):t('noDate');}
function rowCard(r){return el('div',{class:'rowcard'},el('div',{class:'cardtop'},el('div',{},el('h3',{},r.role),el('span',{class:'muted'},r.company)),btn(t('details'),()=>showDetails(r),'small')),el('div',{class:'date'},dateText(r.date)),el('span',{class:'badge'},r.status));}
function renderDashboard(main){
 main.append(heading(t('home'),t('updated')+' '+data.queried.toLocaleString(lang==='pt'?'pt-BR':'en-GB')));
 const apps=data.rows.filter(isApplication);const counts=new Map();for(const r of apps)counts.set(r.status,(counts.get(r.status)||0)+1);
 main.append(el('div',{class:'stats'},stat(t('applications'),apps.length),stat(t('network'),data.contacts.length),...Array.from(counts,([s,n])=>stat(s,n))));
 const recent=apps.filter(r=>r.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);
 const steps=data.contacts.map(c=>c.cells).filter(c=>c[9]);
 main.append(el('div',{class:'split'},el('section',{class:'panel'},el('h2',{},t('recent')),recent.length?recent.map(rowCard):el('p',{},t('none'))),el('section',{class:'panel'},el('h2',{},t('next')),el('p',{class:'note'},t('noReminder')),steps.length?steps.slice(0,6).map(c=>el('div',{class:'rowcard'},el('h3',{},c[0]),el('p',{class:'muted'},c[1]),el('p',{},c[9]))):el('p',{},t('none')))));
 const sent=apps.filter(r=>isSent(r)&&r.date).length;main.append(el('p',{class:'note'},t('sent')+': '+sent+'. '+t('sentHelp')));
}
function selectField(id,label,values,value,change){const s=el('select',{id,onchange:e=>change(e.target.value)},el('option',{value:''},t('all')),...values.map(v=>el('option',{value:v},v)));s.value=value;return el('div',{class:'field'},el('label',{for:id},label),s);}
function renderCentral(main){
 main.append(heading(t('central')),el('div',{class:'tabs'},...['applications','network'].map(s=>btn(t(s),()=>{section=s;q='';type='';status='';netView='people';render();},section===s?'active':''))));
 if(section==='network')main.append(el('div',{class:'tabs'},...['people','companies'].map(v=>btn(t(v),()=>{netView=v;q='';render();},netView===v?'active':''))));
 const search=el('input',{id:'search',type:'search',value:q,placeholder:t('search'),oninput:e=>{q=e.target.value;updateResults();}});
 const filters=el('div',{class:'filters'},el('div',{class:'field search'},el('label',{for:'search'},t('search')),search));
 if(section==='applications'){filters.append(selectField('type',t('type'),[...new Set(data.rows.map(r=>r.type))],type,v=>{type=v;updateResults();}),selectField('status',t('status'),[...new Set(data.rows.map(r=>r.status))],status,v=>{status=v;updateResults();}),el('div',{class:'actions'},btn(t('list'),()=>{view='list';render();},view==='list'?'active':''),btn(t('board'),()=>{view='board';render();},view==='board'?'active':'')));main.append(el('p',{class:'note'},t('boardHelp')));}
 main.append(filters,el('div',{id:'results'}));updateResults();
}
function updateResults(){const box=document.querySelector('#results');if(!box||!data)return;box.replaceChildren();
 if(section==='network'){
 if(netView==='companies'){const cos=(data.companies||[]).filter(co=>co.join(' ').toLowerCase().includes(q.toLowerCase()));box.append(cos.length?el('div',{class:'listgrid'},...cos.map(companyCard)):el('div',{class:'empty'},t('emptyFilter')));return;}
 const cs=data.contacts.filter(c=>[c.cells[0],c.entity,c.cells[2]].join(' ').toLowerCase().includes(q.toLowerCase()));box.append(cs.length?el('div',{class:'listgrid'},...cs.map(contactCard)):el('div',{class:'empty'},t('emptyFilter')));return;}
 const rows=data.rows.filter(r=>matches(r,q)&&(!type||r.type===type)&&(!status||r.status===status));if(!rows.length){box.append(el('div',{class:'empty'},t('emptyFilter')));return;}
 if(view==='list')box.append(el('div',{class:'listgrid'},...rows.map(applicationCard)));else{const grouped=new Map();for(const r of rows){if(!grouped.has(r.status))grouped.set(r.status,[]);grouped.get(r.status).push(r);}box.append(el('div',{class:'board'},...Array.from(grouped,([s,rs])=>el('section',{class:'column'},el('h3',{},s,el('span',{},rs.length)),...rs.map(applicationCard)))));}
}
function applicationCard(r){return el('article',{class:'card'},el('span',{class:'badge'},r.type),el('h3',{},r.role),el('p',{},r.company),el('span',{class:'badge'},r.status),el('div',{class:'date'},dateText(r.date)),btn(t('details'),()=>showDetails(r),'small'));}
function link(text,url){const safe=safeLink(url);return safe?el('a',{href:safe,target:'_blank',rel:'noopener noreferrer',referrerpolicy:'no-referrer'},text):el('span',{},url||'');}
function contactCard(record){const c=record.cells;const links=el('div',{class:'links'});if(c[5]&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c[5]))links.append(el('a',{href:'mailto:'+encodeURIComponent(c[5])},c[5]));if(c[6])links.append(link('LinkedIn',c[6]));return el('article',{class:'card contact'},el('h3',{},c[0]),el('p',{},[c[1],c[2]].filter(Boolean).join(' · ')),el('span',{class:'badge'},c[8]),el('dl',{},el('dt',{},t('represented')),el('dd',{},record.entity),el('dt',{},t('lastContact')),el('dd',{},c[7]||t('noDate')),el('dt',{},t('nextStep')),el('dd',{},c[9]),el('dt',{},t('source')),el('dd',{},c[10])),links);}
function companyCard(co){
 const people=companyPeople(co[0],data.contacts);const dl=el('dl');
 for(const [i,k] of [[1,'location'],[2,'activityType'],[3,'priority'],[4,'interestRoles'],[5,'caveats'],[6,'channel'],[7,'opening'],[8,'relation'],[12,'lastApplication'],[13,'history']])if(co[i])dl.append(el('dt',{},t(k)),el('dd',{},co[i]));
 const links=el('div',{class:'links'});for(const u of String(co[14]||'').split('|').map(s=>s.trim()).filter(Boolean))links.append(link(t('officialSource'),u));
 const stats=el('p',{class:'note'},t('applications')+': '+(co[9]||'0')+' · '+t('cvsPrepared')+': '+(co[10]||'0')+' · Networking: '+(co[11]||'0'));
 const peopleBox=el('div',{class:'companypeople'},el('h4',{},t('peopleAt')));
 if(people.length)for(const p of people){const c=p.cells;const pl=el('div',{class:'links'});if(c[5]&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c[5]))pl.append(el('a',{href:'mailto:'+encodeURIComponent(c[5])},c[5]));if(c[6])pl.append(link('LinkedIn',c[6]));peopleBox.append(el('div',{class:'personline'},el('div',{},el('strong',{},c[0]),el('span',{class:'muted'},' '+[c[2],c[7]?t('lastContact')+': '+c[7]:''].filter(Boolean).join(' · '))),pl));}
 else peopleBox.append(el('p',{class:'note'},t('noCompanyPeople')));
 return el('article',{class:'card company'},el('h3',{},co[0]),stats,dl,links,peopleBox);
}
function showDetails(r){
 if(!hasSession()){notify(new PonteError('expired'));return;}
 edit={...r,cells:[...r.cells]};const d=dialogBase(r.role);const head=el('div',{class:'dialoghead'},el('div',{},el('span',{class:'badge'},r.type),el('h2',{},r.role),el('p',{class:'muted'},r.company)),btn(t('close'),()=>{edit=null;d.remove();},'small'));d.append(head);
 const labels=lang==='pt'?['Tipo','Cargo / oportunidade','Empresa','Código / referência','Contato / setor','Detalhes-chave','Data de envio / recibo','CV usado','Canal','Status','Notas','Fonte / evidência','Link do CV']:['Type','Role / opportunity','Company','Code / reference','Contact / department','Key details','Submission / receipt date','CV used','Channel','Status','Notes','Source / evidence','CV link'];
 const dl=el('dl');for(const i of [3,4,5,6,7,8,11,12])dl.append(el('dt',{},labels[i]),el('dd',{},i===12?link(t('cv'),r.cells[i]):r.cells[i]));d.append(dl,el('p',{class:'note'},t('notReceipt')));
 if(!isApplication(r)){d.append(el('p',{},t('readonly')),el('p',{},r.status),el('p',{},r.notes));return;}
 const statusInput=el('input',{id:'edit-status',value:r.status,maxlength:'300',required:''});const notesInput=el('textarea',{id:'edit-notes',maxlength:'20000'},r.notes);
 const form=el('form',{},el('div',{class:'field'},el('label',{for:'edit-status'},t('status')),statusInput),el('div',{class:'field'},el('label',{for:'edit-notes'},t('notes')),notesInput),el('p',{class:'note'},t('limited')),el('p',{class:'note'},t('race')));
 const save=el('button',{type:'submit',class:'primary'},t('save'));const cancel=btn(t('cancel'),()=>{edit=null;d.remove();});const result=el('div',{role:'status'});form.append(result,el('div',{class:'actions'},save,cancel));
 form.addEventListener('submit',async event=>{event.preventDefault();if(!edit)return;save.disabled=true;cancel.disabled=true;statusInput.disabled=true;notesInput.disabled=true;result.textContent=t('saving');try{data=await saveEdit(files,edit,statusInput.value,notesInput.value);edit=null;d.remove();success='saved';error='';render();}catch(e){result.setAttribute('role','alert');result.className='error';result.textContent=t(e.code==='network'?'networkError':(e.code||'unavailable'));if(['expired','permission'].includes(e.code)){d.remove();notify(e);}else{cancel.disabled=false;result.append(el('p',{},t('retry')),btn(t('refresh'),()=>{edit=null;d.remove();refresh();}));}}});d.append(form);
}
function renderSettings(main){main.append(heading(t('settings')),el('div',{class:'settings'},el('section',{class:'panel'},el('h2',{},t('account')),el('p',{},account),el('div',{class:'settingrow'},t('language'),language()),el('p',{class:'note'},t('authNote')),el('p',{class:'note'},t('privacy')),el('p',{class:'note'},t('signoutNote')),el('div',{class:'actions'},btn(t('disconnect'),()=>disconnect()),btn(t('revoke'),()=>disconnect(true)))),el('section',{class:'panel'},el('h2',{},t('fileCheck')),el('p',{},data.trackerTitle),el('p',{},data.contactsTitle),el('p',{class:'note'},t('tabs')+': '+data.contactTab),el('p',{class:'note'},t('race')))));}
window.addEventListener('pageshow',()=>{if(data&&!hasSession()){wipe();error='expired';render();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&data&&!hasSession()){wipe();error='expired';render();}});
render();
