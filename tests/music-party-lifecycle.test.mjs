import test from 'node:test';
import assert from 'node:assert/strict';
import {musicDocumentAlive} from '../Public/src/music-party-lifecycle.mjs';
test('proxied player without a visible frameElement stays connected',()=>{const doc={};doc.defaultView={document:doc,frameElement:null,closed:false};assert.equal(musicDocumentAlive(doc),true);});
test('replaced and closed player documents stop their session',()=>{const doc={defaultView:{document:{},closed:false}};assert.equal(musicDocumentAlive(doc),false);doc.defaultView.document=doc;doc.defaultView.closed=true;assert.equal(musicDocumentAlive(doc),false);});
test('proxy access restrictions do not falsely dispose the player',()=>{const doc={get defaultView(){throw Error('Proxy access');}};assert.equal(musicDocumentAlive(doc),true);});
