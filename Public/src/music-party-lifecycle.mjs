// Proxy windows may report no frameElement even while their player is alive.
export function musicDocumentAlive(doc){
 try{return !!doc.defaultView&&!doc.defaultView.closed&&doc.defaultView.document===doc;}catch{return true;}
}
