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
