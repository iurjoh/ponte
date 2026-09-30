import {PonteError,parseTracker,parseContacts,parseCompanies,rowForEdit,isApplication} from './model.js';
let session=null;
export function setSession(s){session=s;}
export function clearSession(){session=null;}
export function hasSession(){return !!session&&Date.now()<session.expires;}
export async function request(url,options={}){
 if(!hasSession())throw new PonteError('expired');
 let response;try{response=await fetch(url,{...options,cache:'no-store',headers:{Authorization:'Bearer '+session.token,...options.headers}});}catch{throw new PonteError('network');}
 if(response.status===401){clearSession();throw new PonteError('expired');}
 if(response.status===403)throw new PonteError('permission');
 if(!response.ok)throw new PonteError('unavailable');
 return response.json();
}
export async function identify(){return request('https://www.googleapis.com/oauth2/v3/userinfo');}
export async function metadata(id){return request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'?fields=spreadsheetId,properties(title),sheets(properties(sheetId,title))');}
async function range(id,a1){const result=await request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent(a1)+'?valueRenderOption=FORMATTED_VALUE');return result.values||[];}
export async function loadFiles(files){
 const [tm,cm]=await Promise.all([metadata(files.tracker),metadata(files.contacts)]);
 if(tm.spreadsheetId!==files.tracker||cm.spreadsheetId!==files.contacts||files.tracker===files.contacts)throw new PonteError('schema');
 const trackerTab=tm.sheets.find(s=>s.properties.title==='Candidaturas');
 // Owner consolidated the contact workbook on 2026-09-30: only Pessoas - geral and Empresas remain.
 const available=cm.sheets.map(s=>s.properties.title);
 const peopleTab=available.includes('Pessoas - geral')?'Pessoas - geral':available.includes('Contatos')?'Contatos':null;
 const companiesTab=available.includes('Empresas')?'Empresas':null;
 if(!trackerTab||!peopleTab)throw new PonteError('schema');
 const reads=[range(files.tracker,"'Candidaturas'!A:N"),range(files.contacts,"'"+peopleTab.replaceAll("'","''")+"'!A:K")];
 if(companiesTab)reads.push(range(files.contacts,"'"+companiesTab.replaceAll("'","''")+"'!A:O"));
 const [tv,cv,ev]=await Promise.all(reads);
 const contacts=parseContacts(cv).map(c=>({cells:c,sourceTab:peopleTab,entity:c[1]}));
 const companies=ev?parseCompanies(ev):[];
 return {rows:parseTracker(tv),contacts,companies,queried:new Date(),trackerTitle:tm.properties.title,contactsTitle:cm.properties.title,contactTab:companiesTab?peopleTab+' + '+companiesTab:peopleTab};
}
export async function saveEdit(files,opened,status,notes){
 if(!isApplication(opened))throw new PonteError('readonly');
 // Revalidate both selected files, headers and stable IDs, then locate by ID, not old row number.
 const fresh=await loadFiles(files);const target=rowForEdit(fresh.rows,opened.id,opened);
 const a1="'Candidaturas'!J"+target.row+':K'+target.row;
 await request('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(files.tracker)+'/values/'+encodeURIComponent(a1)+'?valueInputOption=RAW',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({range:a1,majorDimension:'ROWS',values:[[status,notes]]})});
 const after=await loadFiles(files);const saved=after.rows.filter(r=>r.id===opened.id);
 if(saved.length!==1||saved[0].status!==status||saved[0].notes!==notes)throw new PonteError('verify');
 return after;
}
