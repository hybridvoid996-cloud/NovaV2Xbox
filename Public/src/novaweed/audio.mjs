// Synthesized audio for Nova Weed (no audio files).
let ctx,master,amb,volume=.7;
function ensure(){
 if(ctx)return ctx;
 try{ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination)}catch{ctx=null}
 return ctx;
}
export function setVolume(v){volume=v;if(master)master.gain.value=v}
export function resume(){ensure();if(ctx?.state==='suspended')ctx.resume()}
function tone(freq,dur,{type='sine',gain=.15,slide=1,delay=0}={}){
 if(!ensure())return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(freq,t);if(slide!==1)o.frequency.exponentialRampToValueAtTime(freq*slide,t+dur);
 g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
 o.connect(g).connect(master);o.start(t);o.stop(t+dur+.05);
}
function noise(dur,{gain=.12,freq=800,q=1,type='bandpass',delay=0}={}){
 if(!ensure())return;const t=ctx.currentTime+delay,len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);
 for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
 const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buf;f.type=type;f.frequency.value=freq;f.Q.value=q;g.gain.value=gain;
 src.connect(f).connect(g).connect(master);src.start(t);
}
export const sfx={
 click:()=>tone(900,.05,{gain:.05}),
 step:()=>noise(.07,{gain:.05,freq:300+Math.random()*200,q:2}),
 cash:()=>{tone(1320,.08,{type:'square',gain:.05});tone(1760,.18,{type:'square',gain:.05,delay:.07});noise(.15,{gain:.06,freq:4000,delay:.02})},
 buzz:()=>{for(let i=0;i<3;i++)tone(180,.09,{type:'square',gain:.06,delay:i*.14})},
 plant:()=>{noise(.25,{gain:.1,freq:500});tone(520,.15,{gain:.05,slide:1.4,delay:.1})},
 water:()=>noise(.6,{gain:.1,freq:2500,q:.6}),
 harvest:()=>{for(const [i,f]of [660,880,990].entries())tone(f,.14,{type:'triangle',gain:.07,delay:i*.07})},
 bag:()=>noise(.18,{gain:.12,freq:3000,q:3}),
 deny:()=>tone(200,.25,{type:'sawtooth',gain:.06,slide:.7}),
 level:()=>{for(const [i,f]of [523,659,784,1047].entries())tone(f,.3,{type:'triangle',gain:.08,delay:i*.1})},
 shot:(v=1,auto=false)=>{noise(auto?.14:.22,{gain:.32*v,freq:auto?1400:900,q:.4,type:'lowpass'});noise(.05,{gain:.2*v,freq:3200,q:.6});tone(auto?110:85,.18,{type:'triangle',gain:.12*v,slide:.5})},
 hit:()=>tone(1400,.05,{type:'square',gain:.04}),
 hurt:()=>{noise(.18,{gain:.14,freq:400,q:1});tone(160,.2,{type:'sawtooth',gain:.05,slide:.7})},
 reload:()=>{noise(.06,{gain:.1,freq:2400,q:4});noise(.08,{gain:.12,freq:1600,q:4,delay:.45});tone(900,.05,{type:'square',gain:.04,delay:.9})},
 crash:(v=1)=>{noise(.45,{gain:.32*v,freq:260,q:.5,type:'lowpass'});noise(.3,{gain:.16*v,freq:2600,q:.8,delay:.03})},
 punch:()=>noise(.08,{gain:.12,freq:300,q:.8}),
 cough:()=>{for(let i=0;i<3;i++)noise(.16,{gain:.12,freq:500+i*80,q:1.4,delay:i*.28})},
 vape:()=>{noise(1.3,{gain:.06,freq:2800,q:.5});noise(1.1,{gain:.03,freq:6000,q:1,delay:.1});tone(140,1.2,{gain:.02,slide:1.1})},
 exhale:()=>noise(1.3,{gain:.1,freq:650,q:.3,type:'lowpass'}),
 inhale:()=>{noise(1.2,{gain:.08,freq:1200,q:.4});tone(90,1.4,{gain:.03,slide:.8,delay:.2})},
 drink:()=>{for(let i=0;i<4;i++)noise(.08,{gain:.07,freq:700,q:4,delay:i*.16})},
 siren:()=>{for(let i=0;i<4;i++){tone(700,.35,{type:'sawtooth',gain:.05,slide:1.4,delay:i*.7});tone(980,.35,{type:'sawtooth',gain:.05,slide:.72,delay:i*.7+.35})}},
 door:()=>noise(.3,{gain:.08,freq:180,q:1})
};
// Low city hum + occasional passing cars.
export function startAmbience(){
 if(!ensure()||amb)return;
 const len=ctx.sampleRate*4,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);let last=0;
 for(let i=0;i<len;i++){last=(last+.02*(Math.random()*2-1))/1.02;d[i]=last*3}
 const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=420;const g=ctx.createGain();g.gain.value=.22;
 src.connect(f).connect(g).connect(master);src.start();amb={src,g};
 const car=()=>{if(!amb)return;noise(2.2,{gain:.05,freq:200+Math.random()*300,q:.7});setTimeout(car,5000+Math.random()*9000)};setTimeout(car,4000);
}
// Looping engine hum (cars, moped) and wheel rumble (skateboard).
let eng=null,roll=null;
export const engine={set(kind,level=0,load=false){
 if(!ensure())return;const t=ctx.currentTime;
 if(kind==='car'||kind==='moped'){
  if(!eng){const o=ctx.createOscillator(),o2=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=500;g.gain.value=0;o.connect(f);o2.connect(f);f.connect(g).connect(master);o.start();o2.start();eng={o,o2,f,g}}
  const base=kind==='moped'?62:34,hz=base+level*(kind==='moped'?120:95);
  eng.o.frequency.setTargetAtTime(hz,t,.08);eng.o2.frequency.setTargetAtTime(hz*.5,t,.08);eng.f.frequency.setTargetAtTime(380+level*900+(load?300:0),t,.1);eng.g.gain.setTargetAtTime(.05+level*.05+(load?.02:0),t,.1);
 }else if(eng)eng.g.gain.setTargetAtTime(0,t,.12);
 if(kind==='skate'){
  if(!roll){const len=ctx.sampleRate*2,buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const src=ctx.createBufferSource();src.buffer=buf;src.loop=true;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=700;f.Q.value=.7;const g=ctx.createGain();g.gain.value=0;src.connect(f).connect(g).connect(master);src.start();roll={g}}
  roll.g.gain.setTargetAtTime(level*.1,t,.1);
 }else if(roll)roll.g.gain.setTargetAtTime(0,t,.1);
}};
export function stopAmbience(){if(amb){try{amb.src.stop()}catch{}amb=null}}
