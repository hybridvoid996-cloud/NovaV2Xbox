import {readFile,writeFile} from 'node:fs/promises';
import {mergeLunaCatalog} from './luna-cloud-catalog.mjs';
const file=new URL('../Public/library-cloud.json',import.meta.url);const existing=JSON.parse(await readFile(file,'utf8'));const {games:rows}=JSON.parse(await readFile(new URL('./data/luna-cloud-20261012.json',import.meta.url),'utf8'));const {games,shared,added}=mergeLunaCatalog(existing,rows);await writeFile(file,JSON.stringify(games,null,2)+'\n');console.log(rows.length+' Luna titles: '+shared+' shared, '+added+' new; '+games.length+' total Nova cloud cards');
