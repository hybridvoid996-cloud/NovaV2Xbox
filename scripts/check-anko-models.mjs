import {ANKO_MODELS,ankoAnswer} from '../server/anko-ai.mjs';
const results=[];
for(const model of ANKO_MODELS){try{const answer=await ankoAnswer(fetch,{model:model.id,messages:[{role:'user',content:[{type:'text',text:'Reply with only the result of 2+2.'}]}],signal:AbortSignal.timeout(40000)});const ok=/\b4\b/.test(answer.text);results.push({model:model.model,ok});console.log((ok?'PASS ':'FAIL ')+model.name)}catch(e){results.push({model:model.model,ok:false,error:e.message});console.log('FAIL '+model.name+' · '+e.message)}}
console.log(JSON.stringify(results));if(results.some(r=>!r.ok))process.exitCode=1;
