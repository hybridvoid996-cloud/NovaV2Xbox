

// Dynamic import yields: retain the page's initial request until the pack
// worker installs its handler, otherwise a fast postMessage can be lost.
const pending = [];
self.onmessage = event => pending.push(event);
// Retain the pack lane's streaming hash, range resume, batching and journal.
const {installIcaseStorage}=await import('https://vel.gg/bsz/opfs-icase.js'); installIcaseStorage(); await import('https://vel.gg/bsz/download-worker.js');
for (const event of pending) self.onmessage(event);
