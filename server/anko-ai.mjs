// Public assistant transport observed on Anko, November 2026. No site credentials are copied.
export const ANKO_MODELS=[
 ['openai/gpt-6-astra','GPT-6 Astra'],['openai/gpt-6.1-sol','GPT-6.1 Sol'],['openai/gpt-6-sol','GPT-6 Sol'],['openai/gpt-6-luna','GPT-6 Luna'],
 ['anthropic/claude-fable-5-1','Claude Fable 5.1'],['anthropic/claude-opus-5-5','Claude Opus 5.5'],['anthropic/claude-opus-5','Claude Opus 5'],['anthropic/claude-sonnet-5','Claude Sonnet 5'],['anthropic/claude-haiku-4-5','Claude Haiku 4.5'],
 ['google/gemini-4-argon','Gemini 4 Argon'],['google/gemini-3.1-pro-preview','Gemini 3.1 Pro'],['google/gemini-3.8-flash','Gemini 3.8 Flash'],['google/gemini-3-flash-preview','Gemini 3 Flash'],['google/gemini-3.1-flash-lite','Gemini 3.1 Flash Lite'],
 ['openai/gpt-5.6-sol','GPT-5.6 Sol'],['openai/gpt-5.6-terra','GPT-5.6 Terra'],['openai/gpt-5.6-luna','GPT-5.6 Luna'],['openai/gpt-5.5-pro','GPT-5.5 Pro'],['openai/gpt-5.5','GPT-5.5'],['openai/gpt-5.4','GPT-5.4'],['openai/gpt-5.4-mini','GPT-5.4 mini'],['openai/chat-latest','ChatGPT']
].map(([model,name])=>({id:'anko:'+model,model,name:name+' · via Anko',available:true}));
export async function ankoAnswer(request,{model,messages,signal}){
 const entry=ANKO_MODELS.find(m=>m.id===model);if(!entry)throw Error('Choose an available Anko model.');
 const response=await request('https://anko.life/api/public/assistant',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({id:crypto.randomUUID(),mode:'general',model:entry.model,trigger:'submit-message',messages:messages.map(m=>({id:crypto.randomUUID(),role:m.role,parts:m.content.map(c=>c.type==='text'?{type:'text',text:c.text}:{type:'file',mediaType:c.image_url.url.slice(5,c.image_url.url.indexOf(';')),url:c.image_url.url})}))})});
 if(!response.ok)throw Error(response.status===429?'Anko is busy. Try again shortly or choose a Nova model.':'Anko could not answer right now. Choose another model or retry.');
 if(!response.body)throw Error('Anko returned an empty response.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',text='',size=0,finished=false;
 const consume=line=>{if(!line.startsWith('data:'))return;const raw=line.slice(5).trim();if(raw==='[DONE]'){finished=true;return}if(!raw)return;let event;try{event=JSON.parse(raw)}catch{return}if(event.type==='error')throw Error('Anko: '+String(event.errorText||'The selected model could not answer.').slice(0,300));if(event.type==='text-delta')text+=String(event.delta||'');if(event.type==='finish')finished=true;};
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>500000)throw Error('Anko response was too large.');pending+=decoder.decode(value,{stream:true});let end;while((end=pending.indexOf('\n'))!==-1){consume(pending.slice(0,end).trim());pending=pending.slice(end+1)}}consume(pending.trim());if(!text.trim()||!finished)throw Error('Anko stopped before finishing. Retry or choose another model.');return {text:text.trim(),model:entry.model,provider:'Anko',usage:{totalTokens:null}}}finally{await reader.cancel().catch(()=>{})}
}
