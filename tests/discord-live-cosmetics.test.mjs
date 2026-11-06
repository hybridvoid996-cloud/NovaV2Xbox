import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyShop} from '../Public/src/daily-shop.mjs';
const all=JSON.parse(readFileSync('Public/profile-assets/catalog.json'));
const live=all.filter(x=>x.source==='Discord visible shop'&&['banner','decoration'].includes(x.kind));
test('live shop assets are local, supported images with unique stable IDs',()=>{
 assert.ok(live.length>=676);assert.equal(new Set(all.map(x=>x.id)).size,all.length);
 for(const item of live){assert.ok(['banner','decoration'].includes(item.kind));assert.ok(item.src.startsWith('/profile-assets/discord-live/'));const b=readFileSync('Public'+item.src);assert.ok(b.length>20);if(item.kind==='decoration')assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');else{assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(b.includes(Buffer.from('acTL')));assert.equal(item.renderMode,'original-apng-nameplate');}assert.equal(readFileSync('Public'+item.thumbnail).subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
});
test('visible-shop manifest contains cosmetic assets only',()=>{for(const c of JSON.parse(readFileSync('docs/discord-shop-visible.json')))for(const u of c.media)assert.match(u,/^https:\/\/cdn\.discordapp\.com\/(media\/v1\/collectibles-shop\/|assets\/content\/)/)});
test('imported nameplates are compatible with Nova chat-banner rotation',()=>{const shop=JSON.stringify(dailyShop(live));assert.ok(shop.includes('discord-live-'));assert.ok(live.some(x=>x.kind==='banner'));});
