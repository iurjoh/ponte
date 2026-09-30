import {PonteError,parseTracker,parseContacts,rowForEdit,isApplication} from './model.js';
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
 // The original Contatos tab was renamed to Pessoas - geral. Both use the approved A:K schema.
 const names=['Pessoas - geral','Pessoas - Example Corp A','Pessoas - Example Agency','Pessoas - Example Corp B'];
 const available=cm.sheets.map(s=>s.properties.title);
 const selected=names.every(n=>available.includes(n))?names:available.includes('Contatos')?['Contatos']:null;
 if(!trackerTab||!selected)throw new PonteError('schema');
 const [tv,...cv]=await Promise.all([range(files.tracker,"'Candidaturas'!A:N"),...selected.map(n=>range(files.contacts,"'"+n.replaceAll("'","''")+"'!A:K"))]);
 const contacts=cv.flatMap((values,i)=>parseContacts(values).map(c=>({...c,cells:c,sourceTab:selected[i],entity:c[1]})));
 return {rows:parseTracker(tv),contacts,queried:new Date(),trackerTitle:tm.properties.title,contactsTitle:cm.properties.title,contactTab:selected.join(', ')};
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
