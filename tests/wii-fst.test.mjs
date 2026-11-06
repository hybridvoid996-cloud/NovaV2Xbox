import test from 'node:test';import assert from 'node:assert/strict';
import {wiiFstSizes} from '../Public/src/wii-fst.mjs';
function table(){const names=new TextEncoder().encode('\0Layout\0menu.arc\0boot.bin\0'),bytes=new Uint8Array(48+names.length),v=new DataView(bytes.buffer);v.setUint32(0,0x01000000);v.setUint32(8,4);v.setUint32(12,0x01000001);v.setUint32(20,3);v.setUint32(24,8);v.setUint32(32,123);v.setUint32(36,17);v.setUint32(44,456);bytes.set(names,48);return bytes}
test('file index reads big-endian nested names and sizes for both partition paths',()=>{
 assert.deepEqual(wiiFstSizes(table()),[['game/files/Layout/menu.arc',123],['game/part/files/Layout/menu.arc',123],['game/files/boot.bin',456],['game/part/files/boot.bin',456]]);
});
test('file index rejects truncated tables and invalid directory spans',()=>{
 assert.throws(()=>wiiFstSizes(new Uint8Array(4)),/Invalid/);
 const b=table();new DataView(b.buffer).setUint32(20,99);assert.throws(()=>wiiFstSizes(b),/directory range/);
 const c=table();new DataView(c.buffer).setUint32(24,99999);assert.throws(()=>wiiFstSizes(c),/file name/);
});
