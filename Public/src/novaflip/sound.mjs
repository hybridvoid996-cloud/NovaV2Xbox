// Tiny synthesized sound effects (no audio files).
let ctx,enabled=true;
export const setSound=on=>{enabled=on};
function tone(freq,dur=.12,{type='sine',gain=.08,slide=0,delay=0}={}){
 if(!enabled)return;
 try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();
  const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(freq*slide,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+dur+.02)}catch{}
}
export const sfx={
 play:()=>{tone(520,.09,{type:'triangle',slide:1.5});tone(780,.08,{type:'sine',gain:.04,delay:.03})},
 draw:()=>tone(300,.1,{type:'triangle',slide:.7,gain:.06}),
 turn:()=>{tone(660,.12,{gain:.05});tone(990,.16,{gain:.04,delay:.08})},
 flip:()=>{for(const [i,f]of [880,1175,1568].entries())tone(f,.14,{type:'square',gain:.035,delay:i*.06})},
 bad:()=>tone(160,.25,{type:'sawtooth',slide:.6,gain:.05}),
 win:()=>{for(const [i,f]of [523,659,784,1047,1319].entries())tone(f,.3,{type:'triangle',gain:.06,delay:i*.09})},
 click:()=>tone(900,.04,{type:'sine',gain:.03})
};
