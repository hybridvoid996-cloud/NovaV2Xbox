// Composer: formatting bar, emoji, @mentions with previews, slash palette, attachments,
// replies/edits, polls and the typing indicator.
import {state,el,h,icon,avatar,nameNode,person,isStaff,topRole,online,fail,toast,popover,sheet,task} from './core.mjs?v=9';
import {emojiPanel} from './emoji.mjs?v=9';
import {commandList,runSlash} from './commands.mjs?v=9';
import {pollText,POLL_EMOJI} from './messages.mjs?v=9';
import {prepareImage,videoDuration,MAX_VIDEO_BYTES,MAX_VIDEO_SECONDS} from './media.mjs?v=9';
import {attachTyping} from '../chat-typing.js?v=20261027-chat344';

export function createComposer({host,api,path,placeholder,locked,lockedText,ctx,send,list}){
 const wrap=el('div','nc-composer'+(locked?' locked':''));
 const bars=el('div','nc-bars'),attachBar=el('div','nc-attach');attachBar.hidden=true;
 const form=el('form','nc-form'),input=h('textarea',{class:'nc-input',rows:'1',maxlength:'4000',placeholder:locked?lockedText:placeholder,'aria-label':'Message'});
 const fmtBar=el('div','nc-fmt');fmtBar.hidden=localStorage.getItem('nova_chat_fmt')!=='open';
 const plus=h('button',{type:'button',class:'nc-icon-btn','aria-label':'Add attachment or poll',title:'Upload or create a poll'},icon('plus'));
 const fmtToggle=h('button',{type:'button',class:'nc-icon-btn nc-aa','aria-label':'Text formatting',title:'Text formatting'},'Aa');
 const emojiBtn=h('button',{type:'button',class:'nc-icon-btn','aria-label':'Emoji',title:'Emoji'},icon('smile'));
 const sendBtn=h('button',{type:'submit',class:'nc-send','aria-label':'Send'},icon('send'));
 const left=el('div','nc-left'),right=el('div','nc-right');left.append(plus);right.append(fmtToggle,emojiBtn,sendBtn);
 form.append(left,input,right);wrap.append(bars,attachBar,fmtBar,form);host.append(wrap);
 const fileImage=h('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',hidden:true}),fileVideo=h('input',{type:'file',accept:'video/mp4,video/webm,video/quicktime',hidden:true});wrap.append(fileImage,fileVideo);
 if(locked){input.disabled=true;sendBtn.disabled=plus.disabled=emojiBtn.disabled=fmtToggle.disabled=true}

 let reply=null,editing=null,media=null,uploading=false;const mentions=new Map();

 // ---- formatting ----
 const wrapSel=(before,after=before,line=false)=>{let s=input.selectionStart,e=input.selectionEnd;if(line)s=input.value.lastIndexOf('\n',s-1)+1;const sel=input.value.slice(s,e);input.setRangeText(before+sel+after,s,e,'select');input.setSelectionRange(s+before.length,s+before.length+sel.length);input.focus();grow()};
 for(const [ic,label,b,a,line]of [['bold','Bold','**'],['italic','Italic','*'],['underline','Underline','__'],['strike','Strikethrough','~~'],['code','Inline code','`'],['code','Code block','```\n','\n```'],['spoiler','Spoiler','||'],['quote','Quote','> ','',true],['hash','Heading','# ','',true]]){const btn=h('button',{type:'button',class:'nc-fmt-btn',title:label,'aria-label':label},icon(ic));if(label==='Code block')btn.classList.add('block');btn.onclick=()=>wrapSel(b,a??b,line);fmtBar.append(btn)}
 fmtToggle.onclick=()=>{fmtBar.hidden=!fmtBar.hidden;fmtToggle.classList.toggle('on',!fmtBar.hidden);try{localStorage.setItem('nova_chat_fmt',fmtBar.hidden?'closed':'open')}catch{}};fmtToggle.classList.toggle('on',!fmtBar.hidden);

 // ---- auto-grow ----
 const grow=()=>{input.style.height='auto';input.style.height=Math.min(220,input.scrollHeight)+'px'};
 input.addEventListener('input',()=>{grow();suggest()});

 // ---- emoji ----
 emojiBtn.onclick=()=>{const p=popover(emojiBtn,emojiPanel(e=>{input.setRangeText(e,input.selectionStart,input.selectionEnd,'end');input.focus();grow()},{close:()=>p.remove()}),{side:'top',cls:'ne-pop'})};

 // ---- @mention + /command suggestions ----
 const sug=el('div','nc-suggest');sug.hidden=true;wrap.append(sug);let items=[],active=0,mode=null;
 function people(q){
  q=q.toLowerCase();const ids=Object.keys(state.profiles).filter(id=>id!==state.me.uid&&(state.profiles[id].name||'').toLowerCase().includes(q));
  ids.sort((a,b)=>Number(online(b))-Number(online(a))||Number(!!state.friends[b])-Number(!!state.friends[a]));
  const out=ids.slice(0,8).map(id=>({type:'user',id}));
  if(isStaff())for(const g of ['everyone','here'])if(g.startsWith(q))out.push({type:'group',id:g});
  for(const [rid,r]of Object.entries(state.customRoles||{}))if((r.name||'').toLowerCase().includes(q)&&isStaff())out.push({type:'role',id:rid});
  return out.slice(0,10);
 }
 function suggest(){
  const before=input.value.slice(0,input.selectionStart);
  const at=/(^|\s)@([\w.-]{0,24})$/.exec(before),slash=/^\/([\w ]{0,20})$/.exec(input.value.slice(0,input.selectionStart));
  if(at){mode='at';items=people(at[2])}else if(slash){mode='slash';const q=slash[1].toLowerCase();items=commandList().filter(c=>c.cmd.slice(1).startsWith(q)||c.desc.toLowerCase().includes(q)).slice(0,12).map(c=>({type:'cmd',c}))}else{mode=null;items=[]}
  active=0;paintSug();
 }
 function paintSug(){
  sug.hidden=!items.length;sug.replaceChildren();if(!items.length)return;
  sug.append(el('h6','',mode==='at'?'MEMBERS':'COMMANDS'));
  items.forEach((it,i)=>{
   const b=h('button',{type:'button',class:'nc-sug'+(i===active?' active':'')});
   if(it.type==='user'){const r=topRole(it.id);b.append(avatar(it.id,'sm'),nameNode(it.id,'span'),el('small','',r||(state.friends[it.id]?'Friend':online(it.id)?'Online':'Offline')))}
   else if(it.type==='group')b.append(el('span','nc-sug-ico','@'),el('b','','@'+it.id),el('small','',it.id==='everyone'?'Notify everyone':'Notify everyone online'));
   else if(it.type==='role')b.append(el('span','nc-sug-ico','@'),el('b','','@'+(state.customRoles[it.id].name||'role')),el('small','','Role'));
   else{b.append(icon(it.c.icon,'nc-sug-cmdico'),h('span',{class:'nc-sug-cmd'},el('b','',it.c.cmd),el('i','',' '+it.c.args)),el('small','',it.c.desc));if(it.c.group!=='Everyone'&&it.c.group!=='Fun')b.append(el('em','nc-sug-group',it.c.group))}
   b.onmousedown=e=>{e.preventDefault();choose(it)};sug.append(b);
  });
 }
 function choose(it){
  const pos=input.selectionStart,before=input.value.slice(0,pos);
  if(it.type==='cmd'){input.value=it.c.cmd+' ';input.setSelectionRange(input.value.length,input.value.length)}
  else{const start=before.lastIndexOf('@');let label;if(it.type==='user'){label='@'+person(it.id).name;mentions.set(label,'@<'+it.id+'>')}else if(it.type==='role'){label='@'+state.customRoles[it.id].name;mentions.set(label,'@role<'+it.id+'>')}else label='@'+it.id;input.setRangeText(label+' ',start,pos,'end')}
  items=[];paintSug();input.focus();grow();
 }
 const encode=text=>{for(const [label,code]of [...mentions].sort((a,b)=>b[0].length-a[0].length))text=text.split(label).join(code);return text};

 // ---- keyboard ----
 input.addEventListener('keydown',e=>{
  if(items.length&&['ArrowDown','ArrowUp','Tab','Enter','Escape'].includes(e.key)){e.preventDefault();if(e.key==='Escape'){items=[];paintSug();return}if(e.key==='ArrowDown')active=(active+1)%items.length;else if(e.key==='ArrowUp')active=(active-1+items.length)%items.length;else choose(items[active]);paintSug();return}
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();return}
  if(e.key==='Escape'){if(editing||reply)clearBars()}
  if(e.key==='ArrowUp'&&!input.value&&!editing){const mine=Object.entries(list?.messages||{}).filter(([,m])=>m.author===state.me.uid&&!m.media).sort((a,b)=>b[1].createdAt-a[1].createdAt)[0];if(mine){e.preventDefault();startEdit(mine[0],mine[1])}}
  if(e.ctrlKey||e.metaKey){const k=e.key.toLowerCase();if(k==='b'){e.preventDefault();wrapSel('**')}else if(k==='i'){e.preventDefault();wrapSel('*')}else if(k==='u'){e.preventDefault();wrapSel('__')}}
 });

 // ---- reply / edit bars ----
 function clearBars(){reply=null;editing=null;bars.replaceChildren();wrap.classList.remove('editing');if(!input.value.trim())input.value=''}
 function bar(label,who,close){bars.replaceChildren();const b=el('div','nc-bar');b.append(el('span','',label),who||'');const x=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Cancel'},icon('x'));x.onclick=close;b.append(x);bars.append(b)}
 function startReply(id,m){editing=null;reply=id;bar('Replying to ',nameNode(m.author,'span'),clearBars);input.focus()}
 function startEdit(id,m){reply=null;editing=id;wrap.classList.add('editing');input.value=m.text;bar('Editing message · Esc to cancel',null,()=>{clearBars();input.value='';grow()});input.focus();grow()}

 // ---- attachments ----
 function paintAttach(progress){
  attachBar.hidden=!media&&!uploading;attachBar.replaceChildren();if(attachBar.hidden)return;
  const card=el('div','nc-attach-card');
  if(media?.type==='image'){const img=el('img');img.src=media.url;card.append(img)}else card.append(icon(media?.type==='video'||uploading?'film':'file'));
  card.append(h('div',{class:'nc-attach-meta'},el('b','',media?.name||'Uploading video…'),el('small','',uploading?Math.round((progress||0)*100)+'% uploaded':media?.type==='video'?'Video ready':'Image ready')));
  if(uploading){const m=el('i','nc-attach-progress');m.style.setProperty('--p',Math.round((progress||0)*100)+'%');card.append(m)}
  else{const x=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Remove attachment'},icon('trash'));x.onclick=()=>{media=null;paintAttach()};card.append(x)}
  attachBar.append(card);
 }
 fileImage.onchange=task(async()=>{const f=fileImage.files[0];fileImage.value='';if(!f)return;media=await prepareImage(f);paintAttach();input.focus()});
 fileVideo.onchange=task(async()=>{const f=fileVideo.files[0];fileVideo.value='';if(!f)return;
  if(f.size>MAX_VIDEO_BYTES)throw Error('Videos can be up to 100 MB.');const secs=await videoDuration(f);if(secs>MAX_VIDEO_SECONDS)throw Error('Videos can be up to 5 minutes long.');
  if(ctx.preview){media={type:'video',name:f.name.slice(0,100),url:URL.createObjectURL(f)};paintAttach();return}
  const {uploadChatVideo,checkVideo}=await import('../chat-video-upload.js');checkVideo(f);uploading=true;paintAttach(0);
  try{media=await uploadChatVideo(f,p=>paintAttach(p))}finally{uploading=false;paintAttach()}});
 plus.onclick=()=>{const menu=el('div','nc-menu');for(const [ic,label,fn]of [['image','Upload image or GIF',()=>fileImage.click()],['film','Upload video (up to 5 min)',()=>fileVideo.click()],['poll','Create a poll',()=>openPollBuilder()]]){const b=h('button',{type:'button'},icon(ic),el('span','',label));b.onclick=()=>{p.remove();fn()};menu.append(b)}const p=popover(plus,menu,{side:'top'})};

 // ---- polls ----
 function openPollBuilder(){
  const d=sheet('Create a poll',{cls:'nc-poll-builder'}),q=h('input',{class:'nc-field',maxlength:'200',placeholder:'Ask a question…'}),opts=el('div','nc-poll-opts');
  const addOpt=v=>{if(opts.children.length>=10)return;const row=el('div','nc-poll-row'),i=h('input',{class:'nc-field',maxlength:'80',placeholder:'Option '+(opts.children.length+1)});i.value=v||'';const x=h('button',{type:'button',class:'nc-icon-btn sm','aria-label':'Remove option'},icon('x'));x.onclick=()=>{if(opts.children.length>2)row.remove()};row.append(el('span','',POLL_EMOJI[opts.children.length]),i,x);opts.append(row)};
  addOpt();addOpt();
  const add=h('button',{type:'button',class:'nc-btn ghost'},icon('plus'),'Add option');add.onclick=()=>addOpt();
  const go=h('button',{type:'button',class:'nc-btn primary'},icon('poll'),'Post poll');
  go.onclick=task(async()=>{const options=[...opts.querySelectorAll('input')].map(i=>i.value.trim()).filter(Boolean);if(!q.value.trim())throw Error('Write a question.');if(options.length<2)throw Error('Add at least two options.');await send({text:pollText(q.value,options)});d.close()});
  d.body.append(el('label','nc-label','Question'),q,el('label','nc-label','Options'),opts,h('div',{class:'nc-row'},add,go));q.focus();
 }

 // ---- send ----
 form.onsubmit=async e=>{
  e.preventDefault();if(locked||uploading)return;
  let text=input.value.trim();
  try{
   if(editing){if(!text)return;await api.patch({[path+'/'+editing+'/text']:encode(text),[path+'/'+editing+'/edited']:true});input.value='';clearBars();grow();return}
   if(text.startsWith('/')&&!media){const r=await runSlash(text,{...ctx,openPollBuilder});input.value='';grow();items=[];paintSug();if(!r?.send)return;text=r.send}
   if(!text&&!media)return;
   sendBtn.disabled=true;
   await send({text:encode(text)||'Attachment',...(media?{media}:{}),...(reply?{replyTo:reply}:{})});
   input.value='';media=null;mentions.clear();paintAttach();clearBars();grow();
  }catch(err){fail(err)}finally{sendBtn.disabled=!!locked}
 };
 const stopTyping=locked?()=>{}:attachTyping({api,path,uid:state.me.uid,input,form,name:id=>person(id).name});
 return {input,startReply,startEdit,openPollBuilder,focus:()=>input.focus(),stop(){stopTyping();wrap.remove()}};
}
