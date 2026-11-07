// Build DOM nodes only. Generated HTML and executable links remain inert.
export function renderMarkdown(host, source) {
  host.replaceChildren();
  const doc = host.ownerDocument;
  const node = (tag, text) => { const n = doc.createElement(tag); if (text != null) n.textContent = text; return n; };
  const math=[];
  function appendText(parent,text){
    let end=0;
    for(const match of text.matchAll(/\uE000(\d+)\uE001/g)){
      parent.append(doc.createTextNode(text.slice(end,match.index)));
      const expression=math[Number(match[1])],span=node('span');span.className=expression.display?'ai-math display':'ai-math';
      if(globalThis.katex){try{globalThis.katex.render(expression.source,span,{displayMode:expression.display,throwOnError:false,trust:false,strict:'warn',maxExpand:300,maxSize:20})}catch{span.textContent=expression.source}}
      else span.textContent=expression.source;
      parent.append(span);end=match.index+match[0].length;
    }
    parent.append(doc.createTextNode(text.slice(end)));
  }
  function inline(parent, text, depth = 0) {
    if (depth > 8) { parent.append(doc.createTextNode(text)); return; }
    const pattern = /(`[^`\n]+`|\*\*[^\n]+?\*\*|__[^\n]+?__|~~[^\n]+?~~|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\)|<br\s*\/?>)/gi;
    let end = 0;
    for (const m of text.matchAll(pattern)) {
      appendText(parent,text.slice(end, m.index));
      const token = m[0]; let n;
      if (/^<br/i.test(token)) n = node('br');
      else if (token.startsWith('`')) n = node('code', token.slice(1, -1));
      else if (token.startsWith('[')) {
        const parts = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
        try { const url = new URL(parts[2]); if (!['https:', 'http:'].includes(url.protocol)) throw Error(); n = node('a', parts[1]); n.href = url.href; n.target = '_blank'; n.rel = 'noopener noreferrer'; }
        catch { n = node('span', parts[1]); }
      } else {
        const double = token.startsWith('**') || token.startsWith('__') || token.startsWith('~~');
        n = node(token.startsWith('~~') ? 'del' : double ? 'strong' : 'em');
        inline(n, token.slice(double ? 2 : 1, double ? -2 : -1), depth + 1);
      }
      parent.append(n); end = m.index + token.length;
    }
    appendText(parent,text.slice(end));
  }
  let text = String(source || '').replace(/\r\n?/g, '\n');
  // Keep code literal; only interpret explicitly delimited math outside code.
  text=text.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g).map((part,index)=>index%2?part:part.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([^\n]+?)\\\)|\$([^$\n]+?)\$/g,(match,display,bracket,paren,inline)=>{const source=display||bracket||paren||inline;if(inline&&/^\s*\d[\d,.]*\s+(?:or|and|to)\s*$/.test(inline))return match;if(!/[a-zA-Z\\^_=+*/{}]/.test(source))return match;const id=math.push({source,display:!!(display||bracket)})-1;return '\uE000'+id+'\uE001'})).join('');
  if ((text.match(/\\[*#|]/g) || []).length >= 3) text = text.replace(/\\([*#|])/g, '$1');
  const lines = text.split('\n');
  const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(v => v.trim().replace(/\\\|/g, '|'));
  const divider = line => line?.includes('|') && cells(line).every(v => /^:?-{3,}:?$/.test(v));
  const listItem = line => /^\s*(?:[-+*]|\d+[.)])\s+(.+)$/.exec(line);
  const block = (line, index) => !line.trim() || /^\s*(#{1,6}\s|```|~~~|>\s|[-*_]{3,}\s*$)/.test(line) || listItem(line) || divider(lines[index + 1]);
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = /^\s*(```|~~~)([\w+-]*)/.exec(line);
    if (fence) {
      const wrap = node('div'); wrap.className = 'ai-code-block';
      const bar = node('div'); bar.className = 'ai-code-bar'; bar.append(node('span', fence[2] || 'Code'));
      const copy = node('button', 'Copy'); copy.type = 'button';
      const chunks = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) chunks.push(lines[i++]);
      const code = node('code', chunks.join('\n')), pre = node('pre'); pre.append(code);
      copy.onclick = async () => { try { await navigator.clipboard.writeText(code.textContent); copy.textContent = 'Copied'; } catch { copy.textContent = 'Could not copy'; } };
      bar.append(copy); wrap.append(bar, pre); host.append(wrap); if (i < lines.length) i++; continue;
    }
    if (divider(lines[i + 1])) {
      const wrap = node('div'); wrap.className = 'ai-table-wrap'; wrap.tabIndex = 0;
      const table = node('table'), head = node('thead'), row = node('tr'), body = node('tbody');
      const titles = cells(line); titles.forEach(v => { const th = node('th'); th.scope = 'col'; inline(th, v); row.append(th); }); head.append(row); i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        const tr = node('tr'), values = cells(lines[i++]);
        titles.forEach((_, j) => { const td = node('td'); inline(td, values[j] || ''); tr.append(td); }); body.append(tr);
      }
      table.append(head, body); wrap.append(table); host.append(wrap); continue;
    }
    const heading = /^\s*(#{1,6})\s+(.+)$/.exec(line);
    if (heading) { const h = node('h' + Math.min(6, heading[1].length)); inline(h, heading[2]); host.append(h); i++; continue; }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { host.append(node('hr')); i++; continue; }
    if (/^\s*>\s?/.test(line)) {
      const q = node('blockquote'), parts = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) parts.push(lines[i++].replace(/^\s*>\s?/, ''));
      inline(q, parts.join('\n')); host.append(q); continue;
    }
    if (listItem(line)) {
      const ordered = /^\s*\d/.test(line), list = node(ordered ? 'ol' : 'ul');
      if (ordered) list.start = parseInt(line.trim(), 10);
      while (i < lines.length && listItem(lines[i]) && /^\s*\d/.test(lines[i]) === ordered) {
        const li = node('li'); inline(li, listItem(lines[i++])[1]); list.append(li);
      }
      host.append(list); continue;
    }
    const parts = [line]; i++;
    while (i < lines.length && !block(lines[i], i)) parts.push(lines[i++]);
    const p = node('p'); inline(p, parts.join('\n')); host.append(p);
  }
}
