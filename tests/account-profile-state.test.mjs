import test from 'node:test';import assert from 'node:assert/strict';
import {restoredAccountProfile} from '../Public/src/account-profile-state.mjs';
test('late account restoration preserves the same user’s owner/admin access and live profile',()=>{
 for(const role of ['owner','admin']){const current={uid:'one',role,computerAccess:true,name:'Live name',photo:'',bio:'Live bio'};const result=restoredAccountProfile(current,{uid:'one'},{name:'Older name',photo:'/old.jpg'});assert.equal(result.role,role);assert.equal(result.computerAccess,true);assert.equal(result.name,'Live name');assert.equal(result.photo,'');assert.equal(result.bio,'Live bio');assert.deepEqual(current,{uid:'one',role,computerAccess:true,name:'Live name',photo:'',bio:'Live bio'})}
});
test('switching accounts never copies permissions from a different or unidentified profile',()=>{
 for(const current of [{uid:'one',role:'owner',computerAccess:true},{role:'owner',computerAccess:true},null]){const result=restoredAccountProfile(current,{uid:'two'},{name:'Other user'});assert.equal(result.uid,'two');assert.equal(result.role,undefined);assert.equal(result.computerAccess,undefined);assert.equal(result.name,'Other user')}
});
