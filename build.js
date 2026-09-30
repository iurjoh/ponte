import {mkdir,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','style.css','config.js','model.js','api.js','app.js','i18n.js','_headers','_redirects'])await cp(file,'dist/'+file,{recursive:true});
console.log('Built static app. No spreadsheet data or tokens embedded.');
