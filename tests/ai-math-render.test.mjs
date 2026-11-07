import test from 'node:test';
import assert from 'node:assert/strict';
import {renderMarkdown} from '../Public/nova-ai-markdown.js';
class Element {
 constructor(tag,doc,text=''){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.textContent=text}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
}
const doc={createElement:tag=>new Element(tag,doc),createTextNode:text=>new Element('#text',doc,text)};
test('math supports exponents, fractions and display delimiters with untrusted commands disabled',()=>{
 const calls=[];globalThis.katex={render:(source,element,options)=>calls.push({source,options})};
 try{renderMarkdown(new Element('div',doc),'Use $2x^2$ and \\(x=3\\).\n\n$$\\frac{18}{2}=9$$');assert.deepEqual(calls.map(x=>x.source),['2x^2','x=3','\\frac{18}{2}=9']);assert.equal(calls[2].options.displayMode,true);assert(calls.every(x=>x.options.trust===false&&x.options.maxExpand===300))}finally{delete globalThis.katex}
});
test('code and ordinary prices remain literal',()=>{let calls=0;globalThis.katex={render:()=>calls++};try{renderMarkdown(new Element('div',doc),'`$x^2$` and $20 or $30.\n\n```js\nconst value = "$x^2$";\n```');assert.equal(calls,0)}finally{delete globalThis.katex}});
