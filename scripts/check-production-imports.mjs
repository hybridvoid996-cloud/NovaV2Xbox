import {readdir} from 'node:fs/promises';
const files=(await readdir('api')).filter(n=>n.endsWith('.js'));let failed=0;
for(const file of files){try{await import(new URL('../api/'+file,import.meta.url));console.log('Loaded '+file)}catch(error){failed++;console.log('FAILED '+file+': '+error.name)}}
console.log('API module import failures: '+failed);process.exit(failed?1:0);
