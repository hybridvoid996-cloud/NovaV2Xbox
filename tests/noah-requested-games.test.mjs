import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeGameURL} from '../Public/src/native-game-frame.mjs';
import {importedCloudLaunch} from '../Public/src/imported-cloud-games.mjs';
import {isNewLibraryItem} from '../Public/src/library-new.mjs';
const games=JSON.parse(fs.readFileSync(new URL('../Public/library-games.json',import.meta.url)));
for(const [id,page,name] of [[1035,509,'Muddy Heights'],[624,139,'Happy Wheels'],[918,351,'Little Big Planet'],[919,350,'The Binding of Isaac: Rebirth']])test(name+' uses Noah through the standard proxy and appears as new',()=>{const matches=games.filter(g=>g.id===id);assert.equal(matches.length,1);const game=matches[0];assert.equal(game.name,name);assert.equal(game.url,`https://noahstutoring.academy/games/${page}.html`);assert.equal(nativeGameURL(game,'game','https://novaoffical.vercel.app/player.html'),null);assert.equal(importedCloudLaunch('game',id,'https://novaoffical.vercel.app/player.html'),null);assert(isNewLibraryItem(game.addedAt,Date.parse('2026-10-22T12:00:00Z')));const cover=fs.readFileSync(new URL('../Public/'+game.art,import.meta.url));assert(cover.length>1000);assert.equal(cover[0],0xff);assert.equal(cover[1],0xd8)});
