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
export function stopAmbience(){if(amb){try{amb.src.stop()}catch{}amb=null}}
