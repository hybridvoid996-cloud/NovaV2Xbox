import decompress from '../content/runtime/brotli-decompress.mjs';
self.onmessage=event=>{const {id,bytes}=event.data;try{const result=decompress(bytes);if(!result)throw Error('Game decompression failed.');self.postMessage({id,bytes:result},[result.buffer]);}catch(error){self.postMessage({id,error:String(error?.message||error)});}};
