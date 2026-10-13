import test from 'node:test';import assert from 'node:assert/strict';import {gameCursorCSS} from '../Public/src/game-cursor.mjs';
test('selected games and cloud titles share the chosen cursor without affecting other games or apps',()=>{const c={cursor:'ice',games:['game:58','cloud:jy0108']};assert.match(gameCursorCSS(c,'game','58'),/ice.png/);assert.match(gameCursorCSS(c,'cloud','jy0108'),/ice.png/);assert.equal(gameCursorCSS(c,'game','59'),'');assert.equal(gameCursorCSS(c,'app','58'),'');});
test('default, invalid presets and malformed selections leave game cursors untouched',()=>{for(const c of [{cursor:'default',games:['game:58']},{cursor:'bad',games:['game:58']},{cursor:'ice',games:null}])assert.equal(gameCursorCSS(c,'game','58'),'');});
test('proxy cursor uses a data asset and preserves text editing cursor',()=>{const css=gameCursorCSS({cursor:'ice',games:['game:58']},'game','58','data:image/png;base64,abc');assert.match(css,/data:image\/png/);assert.match(css,/cursor:text/);});

