import test from 'node:test';
import assert from 'node:assert/strict';
import {isNewMusicRelease,recentArtistReleases,createMusicReleaseUpdates} from '../Public/src/music-release-updates.mjs';
import {mergeMusicCatalog} from '../server/music-catalog.mjs';
const now=Date.parse('2026-10-25T12:00:00Z'),release={id:'void:1',kind:'album',title:'New album',artist:'Artist',releaseDate:'2026-10-23'};
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
test('NEW requires a dated recent release and excludes future, year-only and old albums',()=>{
 assert.equal(isNewMusicRelease(release,now),true);
 for(const patch of [{releaseDate:'2026'},{releaseDate:'2026-11-01'},{releaseDate:'2025-10-23'},{releaseDate:'invalid'},{releaseDate:'',publishedAt:'2026-10-23',year:'2001'}])assert.equal(isNewMusicRelease({...release,...patch},now),false);
});
test('artist updates merge duplicate releases, retain song drops and reject unrelated artists',()=>{
 const list=recentArtistReleases([{releases:[release,{...release,id:'sc:2'}],tracks:[{...release,id:'void:3',title:'New song'},{...release,id:'void:4',artist:'Cover artist'}]}],['Artist'],now);
 assert.equal(list.length,2);assert.deepEqual(new Set(list.map(x=>x.kind)),new Set(['album','song']));
});
test('refresh shares requests, read state persists per account, and ordinary refresh uses the cache',async()=>{
 const saved=storage();let calls=0,resolve;const pending=new Promise(r=>resolve=r),events=[];
 const request=async()=>{calls++;await pending;return Response.json({releases:[release]})};
 const updates=createMusicReleaseUpdates({storage:saved,user:'one',now:()=>now,request,onChange:e=>events.push(e)});
 const a=updates.refresh([{artist:'Artist'}]),b=updates.refresh([{artist:'Artist'}]);resolve();await Promise.all([a,b]);assert.equal(calls,1);assert.equal(events.at(-1).unread,1);updates.read();assert.equal(events.at(-1).unread,0);await updates.refresh([{artist:'Artist'}]);assert.equal(calls,1);updates.dispose();
 for(const [user,expected]of [['one',0],['two',1]]){let unread;const next=createMusicReleaseUpdates({storage:saved,user,now:()=>now,request,onChange:e=>unread=e.unread});await next.refresh([{artist:'Artist'}]);assert.equal(unread,expected);next.dispose()}
});
test('merged albums retain alternate covers and dates from other providers',()=>{
 const album={title:'New album',artist:'Artist',kind:'album'};
 const result=mergeMusicCatalog({releases:[{...album,id:'sc:1',thumb:'https://i1.sndcdn.com/cover.jpg',releaseDate:'2026-10-23'}]},{releases:[{...album,id:'void:2',thumb:'/api/soundcloud?op=void-art&token=cover'}]});
 assert.equal(result.releases.length,1);assert.equal(result.releases[0].thumbs.length,2);assert.equal(isNewMusicRelease(result.releases[0],now),true);
});
