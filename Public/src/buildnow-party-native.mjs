// Native methods and object layouts are pinned to Nova's immutable BuildNow build.
export function createPartyAdapter(exports){
 const buffer=()=>exports.ek.buffer,valid=(p,n=4)=>Number.isInteger(p)&&p>=1024&&p%4===0&&p+n<=buffer().byteLength,word=p=>valid(p)?new Uint32Array(buffer())[p>>>2]:0;
 const ascii=p=>{if(!Number.isInteger(p)||p<=0||p>=buffer().byteLength)return '';const bytes=new Uint8Array(buffer());let out='';for(let i=0;i<80&&p+i<bytes.length&&bytes[p+i];i++)out+=String.fromCharCode(bytes[p+i]);return out;};
 const type=(p,name,token,component=false)=>{if(!valid(p,12)||component&&!word(p+8))return false;for(let c=word(p),i=0;c&&i<12;i++,c=word(c+44)){if(!valid(c,168))return false;if(ascii(word(c+8))===name&&(!token||word(c+164)===token))return true;}return false;};
 const call=(slot,...args)=>exports.Ck.get(slot)(...args);
 const text=p=>{if(!type(p,'String'))return '';const length=word(p+8);return length<=64&&valid(p,12+length*2)?String.fromCharCode(...new Uint16Array(buffer(),p+12,length)):'';};
 const lobby=()=>{const p=call(31451,0);return type(p,'GameLobby',33556569,true)?p:0;};
 return {
  snapshot(){const p=lobby();if(!p||call(41570,0)===1||call(41587,0)!==1||call(31576,0)!==1)return null;const code=text(call(31578,0)),room=call(41566,0);if(!code||!type(room,'Room',33554501))return null;const players=call(41408,room,0),limit=call(41406,room,0);if(!Number.isInteger(players)||players<0||players>256||!Number.isInteger(limit)||limit<0||limit>256)return null;const mode=word(p+220)||word(p+240),description=type(mode,'GameModeSettings',33554560,true)?word(mode+28):0;return {code,available:true,mode:type(description,'Description',33554575)?text(word(description+8)):'',players,capacity:limit||null,open:call(41402,room,0)===1};},
  inRoom(){return call(41587,0)===1;},leave(){const p=lobby();if(!p)throw Error('Return to the BuildNow menu before joining.');call(31510,p,0);},ready(){const p=lobby();return Boolean(p&&type(word(p+96),'InputField',33554478,true)&&call(41560,0)===1&&call(41570,0)!==1);},
  joined(code){const p=lobby();return Boolean(p&&call(41570,0)!==1&&call(41587,0)===1&&call(31576,0)===1&&!new Uint8Array(buffer())[p+265]&&text(call(31578,0))===code);},
  join(code){if(!/^[A-Za-z0-9_-]{1,32}$/.test(code))throw Error('Invalid party code.');if(!this.ready())throw Error('Waiting for the BuildNow party menu and connection.');const p=lobby(),input=word(p+96);if(new Uint8Array(buffer())[p+265])throw Error('BuildNow is already joining a party.');
   const out=exports.tk((code.length+1)*2);if(!valid(out,(code.length+1)*2))throw Error('Party-code workspace unavailable.');
   try{new Uint16Array(buffer(),out,code.length+1).set([...code].map(x=>x.charCodeAt(0)));const string=call(11650,0,out,0,code.length,0);if(text(string)!==code)throw Error('The party code could not be loaded.');call(81217,input,string,0);call(31509,p,0);}finally{exports.uk(out);}
  }
 };
}
export function installPartyRuntime(){
 let native=null,verified=false;
 const capture=result=>{const exports=result?.instance?.exports||result?.exports;if(exports?.Ck?.get&&exports?.ek?.buffer&&exports?.tk&&exports?.uk)native=exports;return result;};
 for(const key of ['instantiate','instantiateStreaming']){const original=WebAssembly[key];if(original)WebAssembly[key]=async function(...args){return capture(await original.apply(this,args));};}
 return {async verify(blob){verified=false;if(blob.size!==57704302)return;const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');verified=hash==='a35368963cd340fe951f966b6eecef5b6ee55cb7e223701b5b841edc0f20ecc7';},adapter(){return verified&&native?createPartyAdapter(native):null;}};
}
