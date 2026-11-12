// "Send as gift" window for crates, locker items and daily-shop cosmetics.
import {shopPrices,crateNames} from './shop-config.mjs?v=20261112-gifts1';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
// The player directory is paged (80 per page); pages load on demand while a search has few matches.
const directory={users:[],after:undefined,pages:0,busy:null};
function morePlayers(ctx){
 if(directory.busy)return directory.busy;
 if(directory.after===null||directory.pages>=40)return Promise.resolve(false);
 return directory.busy=ctx.shopRequest('chatDirectory',directory.after?{after:directory.after}:{}).then(data=>{
  for(const u of data.users||[])if(!directory.users.some(v=>v.uid===u.uid))directory.users.push(u);
  directory.after=data.next||null;directory.pages++;return true}).finally(()=>{directory.busy=null});
}
function face(u){const f=el('span','gift-face');if(u.photo){const img=el('img');img.src=u.photo;img.alt='';f.append(img)}else f.textContent=(u.name||'N')[0].toUpperCase();return f}

/** spec: {type:'crate',kind,count} · {type:'item',item} · {type:'daily',item,price,day} */
export function openGiftDialog(ctx,spec,{onSent}={}){
 const title=spec.type==='crate'?'Gift '+crateNames[spec.kind]:'Gift '+spec.item.name;
 const d=ctx.modal(title);d.classList.add('shop-gift-modal');
 const requestId=crypto.randomUUID();let to=null,count=spec.count||1;
 const what=el('div','gift-what-row');
 if(spec.type==='crate'){
  const bundles=el('div','gift-bundles');
  const paint=()=>{for(const b of bundles.children)b.setAttribute('aria-pressed',String(Number(b.dataset.count)===count));price.textContent=shopPrices[spec.kind][count].toLocaleString()+' coins'};
  for(const n of [1,3,7,10]){const b=ctx.button(n+'×',()=>{count=n;paint()},'gift-bundle');b.dataset.count=n;bundles.append(b)}
  var price=el('strong','gift-price');what.append(el('span','',crateNames[spec.kind]),bundles,price);paint();
 }else{
  const img=el('img');img.src=spec.item.thumbnail||spec.item.src;img.alt='';
  what.append(img,el('span','',spec.item.name),el('strong','gift-price',spec.type==='daily'?spec.price.toLocaleString()+' coins':'From your locker'));
 }
 const search=el('input','gift-search');search.type='search';search.placeholder='Search players by name';search.setAttribute('aria-label','Search players');
 const list=el('div','gift-people'),chosen=el('p','gift-chosen','Choose who gets it.');
 const note=el('textarea','gift-note-input');note.maxLength=140;note.rows=2;note.placeholder='Add a note (optional)';note.setAttribute('aria-label','Gift note');
 const error=el('p','purchase-error');error.setAttribute('role','alert');
 const send=ctx.button('Send gift',async()=>{
  if(!to){error.textContent='Choose a player first.';return}
  send.disabled=true;send.textContent='Sending…';error.textContent='';
  try{
   const body={type:spec.type,to:to.uid,requestId,note:note.value};
   if(spec.type==='crate')Object.assign(body,{kind:spec.kind,count});else body.id=spec.item.id;
   if(spec.type==='daily')body.day=spec.day;
   const data=await ctx.shopRequest('sendGift',body);
   ctx.toast('Gift sent to '+to.name+' 🎁');d.close();onSent?.(data);
  }catch(e){error.textContent=e.message;send.disabled=false;send.textContent='Send gift'}
 },'primary');
 const render=async()=>{
  list.replaceChildren();const q=search.value.trim().toLowerCase();if(!q)return;
  const me=ctx.state.me?.uid,match=()=>directory.users.filter(u=>u.uid!==me&&String(u.name||'').toLowerCase().includes(q)).slice(0,6);
  try{while(match().length<6&&await morePlayers(ctx)){if(q!==search.value.trim().toLowerCase())return;if(match().length)break}}catch(e){error.textContent=e.message}
  if(q!==search.value.trim().toLowerCase())return;
  const found=match();list.replaceChildren();
  for(const u of found){const b=ctx.button('',()=>{to=u;chosen.replaceChildren('Sending to ',el('b','',u.name));list.replaceChildren();search.value=''},'gift-person');b.append(face(u),el('span','',u.name));list.append(b)}
  if(!found.length)list.append(el('p','muted','No players match “'+search.value.trim()+'”.'));
 };
 search.oninput=render;
 const actions=el('div','shop-checkout-actions');actions.append(ctx.button('Cancel',()=>d.close()),send);
 d.append(what,search,list,chosen,note,el('p','muted gift-hint',spec.type==='crate'?'They unwrap it when they open Nova and see what they got. Rewards roll when you send it.':'They unwrap it when they open Nova.'),error,actions);
 search.focus();
}
