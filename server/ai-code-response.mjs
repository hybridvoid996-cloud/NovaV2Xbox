export function parseCodeResponse(text){
 const raw=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');const start=raw.indexOf('{'),end=raw.lastIndexOf('}');let result;try{result=JSON.parse(raw)}catch{try{result=JSON.parse(raw.slice(start,end+1))}catch{throw Error('The AI response was incomplete. Your editor was not changed; try a smaller edit.')}}
 if(result.changes&&typeof result.changes==='object'&&!Array.isArray(result.changes)){if(typeof result.changes.explanation==='string'&&!result.explanation)result.explanation=result.changes.explanation;delete result.changes.explanation;const keys=Object.keys(result.changes);if(keys.length>40||keys.some(k=>typeof result.changes[k]!=='string'))throw Error('Invalid file edits. Your files were kept.');return result}
 for(const key of ['html','css','js'])if(typeof result[key]!=='string')throw Error('The AI did not return valid file edits. Your files were kept.');return result;
}
