import test from 'node:test';import assert from 'node:assert/strict';
import {claimStreak,restoreStreak,streakStatus} from '../Public/src/streak-core.mjs';
import {createReferral,settleReferral} from '../server/daily-rewards.mjs';
const DAY=86400000,now=Date.UTC(2026,9,27,12),token='a'.repeat(32);
test('daily claims pay 1k, 2k, 3k once each and use server UTC boundaries',()=>{
 let p={coins:0};for(let n=0;n<3;n++){let result=claimStreak(p,now+n*DAY);p=result.progress;assert.equal(result.awarded,(n+1)*1000);assert.equal(claimStreak(p,now+n*DAY+1000).awarded,0)}assert.equal(p.coins,6000);assert.equal(p.streak.count,3);
 const end=Math.floor(now/DAY)*DAY+DAY-1;let late=claimStreak({},end).progress;assert.equal(claimStreak(late,end+1).awarded,2000);
 const newer=claimStreak(late,end+1).progress;assert.equal(claimStreak(newer,end-1).awarded,0);assert.equal(claimStreak(newer,end+2).awarded,0);
});
test('missing a day loses the streak and restoration charges 350k once without missed rewards',()=>{
 let p=claimStreak({coins:500000},now).progress;p=claimStreak(p,now+DAY).progress;assert.equal(streakStatus(p.streak,now+3*DAY).count,0);
 const before=p.coins;p=restoreStreak(p,now+3*DAY);assert.equal(p.coins,before-350000);assert.equal(p.streak.count,2);assert.throws(()=>restoreStreak(p,now+3*DAY),/no lost/);const result=claimStreak(p,now+3*DAY);assert.equal(result.awarded,3000);assert.equal(result.progress.streak.count,3);
});
test('restoring after today’s fresh claim keeps that reward unchanged and refuses insufficient funds',()=>{
 const old=claimStreak({coins:500000},now).progress;const fresh=claimStreak(old,now+3*DAY).progress;const restored=restoreStreak(fresh,now+3*DAY);assert.equal(restored.streak.count,2);assert.equal(restored.coins,fresh.coins-350000);assert.equal(claimStreak(restored,now+3*DAY).awarded,0);assert.throws(()=>restoreStreak({...old,coins:10},now+3*DAY),/350,000/);
});
function invite(){return createReferral({progress:{sender:{coins:100}}},'sender',{token,device:'device-a',name:'Nova Friend'},now)}
function claim(root,extra={},at=now+1000){return settleReferral(root,'new-user',{token,device:'device-b',creationTime:now+500,emailHash:'mail-b',firstVisit:true,...extra},at)}
test('first-time signup awards both users atomically and repeat redemption never pays twice',()=>{
 const root=claim(invite());assert.equal(root.progress.sender.coins,300100);assert.equal(root.progress['new-user'].coins,300000);assert.equal(root.referrals.links[token].status,'completed');claim(root);assert.equal(root.progress.sender.coins,300100);assert.equal(root.progress['new-user'].coins,300000);assert.ok(root.referrals.outbox.sender['invite-complete-'+token]);assert.match(root.referrals.outbox['new-user']['invite-welcome-'+token].text,/Nova Friend/);
});
test('existing accounts, returning visitors, same-device accounts, expired links and self-invites cannot be paid',()=>{
 for(const extra of [{creationTime:now-1},{firstVisit:false},{device:'device-a'},{emailHash:'used-mail'}]){const root=invite();root.referrals.mailboxes['used-mail']='someone';assert.throws(()=>claim(root,extra));assert.equal(root.progress.sender.coins,100)}
 assert.throws(()=>claim(invite(),{},now+8*DAY),/expired/);assert.throws(()=>settleReferral(invite(),'sender',{token,device:'device-b',creationTime:now+1,firstVisit:true},now+100),/own invite/);
});
test('successful invites enforce a rolling seven-day cooldown across old pending links',()=>{
 let root=invite();const second='b'.repeat(32);createReferral(root,'sender',{token:second,device:'device-a'},now+100);claim(root);const before=root.progress.sender.coins;
 assert.throws(()=>createReferral(root,'sender',{token:'c'.repeat(32),device:'device-a'},now+2*DAY),/seven days/);
 assert.throws(()=>settleReferral(root,'friend2',{token:second,device:'device-c',creationTime:now+500,firstVisit:true},now+2000),/cooldown/);assert.equal(root.progress.sender.coins,before);assert.equal(root.referrals.claimed.friend2,undefined);
 const ready=now+1000+7*DAY;createReferral(root,'sender',{token:'d'.repeat(32),device:'device-a'},ready);settleReferral(root,'friend3',{token:'d'.repeat(32),device:'device-d',creationTime:ready+100,firstVisit:true},ready+1000);assert.equal(root.progress.sender.coins,before+300000);
});
test('a qualifying signup can retry after an outage without becoming an old account',()=>{const root=claim(invite(),{},now+3*DAY);assert.equal(root.progress['new-user'].coins,300000)});

test('streak flame colors advance at each milestone',async()=>{const {flameTier}=await import('../Public/src/streak-core.mjs');const milestones=[1,7,14,30,60,100,365];assert.equal(new Set(milestones.map(n=>flameTier(n).color)).size,7);assert.equal(flameTier(6).name,'Ember');assert.equal(flameTier(7).name,'Gold');assert.equal(flameTier(30).name,'Violet');assert.equal(flameTier(365).name,'Nova')});
