export const TRACK_HEADERS=['Tipo','Cargo / oportunidade','Empresa','Código / referência','Contato / setor','Detalhes-chave','Data de envio / recibo','CV usado','Canal','Status','Notas','Fonte / evidência','Link do CV','ID Ponte'];
export const CONTACT_HEADERS=['Nome','Empresa','Cargo','Área','Como conheceu/canal','E-mail','LinkedIn','Último contato','Status','Próximo passo','Fonte / observação'];
export const COMPANY_HEADERS=['Empresa / organização','Local / regime','Tipo de atividade','Prioridade / viabilidade','Funções de interesse','Ressalvas / requisitos','Contatos / canal','Vaga atual / prazo','Relação com Iuri','Candidaturas confirmadas','CVs preparados não enviados','Networking','Última aplicação / recibo','Histórico de vagas / status','Fonte oficial'];
export class PonteError extends Error { constructor(code){ super(code); this.code=code; } }
export function validateHeaders(values,headers){if(!values?.length||!headers.every((h,i)=>values[0][i]===h))throw new PonteError('schema');}
export function parseTracker(values){
 validateHeaders(values,TRACK_HEADERS);
 const rows=values.slice(1).map((r,i)=>({cells:Array.from({length:14},(_,j)=>String(r[j]??'')),row:i+2})).filter(r=>r.cells.slice(0,13).some(Boolean));
 const ids=rows.map(r=>r.cells[13]);
 if(ids.some(id=>!id)||new Set(ids).size!==ids.length)throw new PonteError('ids');
 return rows.map(r=>({...r,id:r.cells[13],type:r.cells[0],role:r.cells[1],company:r.cells[2],status:r.cells[9],notes:r.cells[10],date:isoDate(r.cells[6])}));
}
export function parseContacts(values){validateHeaders(values,CONTACT_HEADERS);return values.slice(1).filter(r=>r.some(Boolean)).map(r=>Array.from({length:11},(_,i)=>String(r[i]??'')));}
export function parseCompanies(values){validateHeaders(values,COMPANY_HEADERS);return values.slice(1).filter(r=>r.some(Boolean)).map(r=>Array.from({length:15},(_,i)=>String(r[i]??'')));}
const normName=s=>String(s||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function companyPeople(company,contacts){const c=normName(company);if(!c)return [];return contacts.filter(p=>{const e=normName(p.cells?p.cells[1]:p[1]);return !!e&&(e===c||e.startsWith(c+' ')||c.startsWith(e+' '));});}
export function isoDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return '';const d=new Date(value+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value?value:'';}
export function isApplication(r){return r.type.trim().toLocaleLowerCase('pt-BR')==='candidatura';}
export function isSent(r){return isApplication(r)&&['enviada','enviada - recibo confirmado','e-mail enviado'].includes(r.status.trim().toLocaleLowerCase('pt-BR'));}
export function safeLink(value){try {const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
export function rowForEdit(rows,id,opened){const found=rows.filter(r=>r.id===id);if(found.length!==1)throw new PonteError('ids');const current=found[0];if(JSON.stringify(current.cells)!==JSON.stringify(opened.cells))throw new PonteError('conflict');if(!isApplication(current))throw new PonteError('readonly');return current;}
export function matches(r,q){return [r.role,r.company,r.type].join(' ').toLocaleLowerCase().includes(q.toLocaleLowerCase());}

const OWNER_PREP=/preparad|preparando|preparação|preparacao/;
const OWNER_REVIEW=/revis[aã]o do iuri|minha revis[aã]o|aguardando minha revis[aã]o/;
const COMPANY_SIDE=/pela empresa|da empresa|pelo empregador|pela recrutadora|pelo rh\b|recrutador|em an[aá]lise|analisando|em avalia[çc][aã]o/;
export function classifyApplication(r){
 if(!isApplication(r))return null;
 const s=r.status.trim().toLocaleLowerCase('pt-BR');
 if(!s)return 'review';
 if(s.includes('suspens'))return 'suspended';
 if(s.includes('descart')||s.includes('não selecionad')||s.includes('nao selecionad')||s.includes('rejeit')||s.includes('recus'))return 'rejected';
 if(OWNER_PREP.test(s)&&!COMPANY_SIDE.test(s))return null;
 if(OWNER_REVIEW.test(s)&&!COMPANY_SIDE.test(s))return null;
 if(/revis[aã]o|revisar|revisad/.test(s))return COMPANY_SIDE.test(s)?'screening':'review';
 if(s.includes('entrevist'))return 'interview';
 if(s.includes('triagem')||s.includes('screening')||COMPANY_SIDE.test(s))return 'screening';
 if(s.startsWith('enviada')||s==='e-mail enviado'||s==='email enviado'||s.includes('aguardando'))return 'waiting';
 return 'review';
}
const SENT_CATS=['waiting','screening','interview','rejected','suspended'];
export function computeResults(rows,year=''){
 const classified=rows.map(r=>({r,category:classifyApplication(r)})).filter(x=>x.category);
 const scoped=year?classified.filter(x=>x.r.date&&x.r.date.startsWith(year)):classified;
 const by=c=>scoped.filter(x=>x.category===c).map(x=>x.r);
 const sent=scoped.filter(x=>SENT_CATS.includes(x.category)).length;
 return {year,sent,waiting:by('waiting'),screening:by('screening'),interview:by('interview'),rejected:by('rejected'),suspended:by('suspended'),review:by('review')};
}
export function resultYears(rows){
 return [...new Set(rows.filter(isApplication).map(r=>r.date).filter(Boolean).map(d=>d.slice(0,4)))].sort().reverse();
}
export function waitingDays(date,now=new Date()){
 if(!date)return null;
 const days=Math.floor((now-new Date(date+'T00:00:00Z'))/86400000);
 return days>=0?days:null;
}
