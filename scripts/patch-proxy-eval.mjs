// A saved eval must retain its native implementation after a page replaces eval.
export function patchProxyEval(source){
 if(source.includes('novaEvalFunctions'))return source;
 const setup='function s(e,t){(0,n.pS)(t,e.config.globals.rewritefn,';
 const invoke='(0,this.global.eval)((0,i.o)(t,"(indirect eval proxy)",this.context,this.meta))';
 if(!source.includes(setup)||!source.includes(invoke))throw Error('Proxy eval implementation changed; update the compatibility patch.');
 return source.replace(setup,'const novaEvalFunctions=new WeakMap();function s(e,t){novaEvalFunctions.set(e,t.eval);(0,n.pS)(t,e.config.globals.rewritefn,').replace(invoke,'(0,novaEvalFunctions.get(this))((0,i.o)(t,"(indirect eval proxy)",this.context,this.meta))');
}
