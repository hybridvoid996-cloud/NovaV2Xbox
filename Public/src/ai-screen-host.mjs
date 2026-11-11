// about:blank wrappers can have an inherited origin: document access, rather
// than the URL's origin string, determines whether Nova can use the outer host.
export function screenHost(start){
 let host=start;
 for(let depth=0;depth<20;depth++){
  try{if(host.parent===host)break;const parent=host.parent;if(!parent.document)break;host=parent}catch{break}
 }
 let topLevel=false;try{topLevel=host===host.top}catch{}
 return {window:host,document:host.document,canFloat:topLevel&&!!host.documentPictureInPicture?.requestWindow};
}
