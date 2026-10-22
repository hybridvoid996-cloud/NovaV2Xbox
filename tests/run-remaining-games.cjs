const fs=require('fs'),{spawn}=require('child_process');
const ids=JSON.parse(fs.readFileSync('docs/game-audit/followup/remaining-queue.json'));
const queues=[ids.filter((_,i)=>i%2===0),ids.filter((_,i)=>i%2===1)];
Promise.all(queues.map((queue,index)=>new Promise(resolve=>{
 const child=spawn(process.execPath,['tests/game-issue-followup.cjs'],{windowsHide:true,env:{...process.env,NOVA_REVIEW_IDS:queue.join(','),NOVA_REVIEW_WAIT_MS:'20000',NOVA_REVIEW_AUTO_START:'1',NOVA_REVIEW_ACTIONS:'{}'}});
 child.stdout.on('data',data=>process.stdout.write('W'+index+' '+data));child.stderr.on('data',data=>process.stderr.write('W'+index+' '+data));child.on('exit',code=>resolve(code));
}))).then(codes=>{console.log('Remaining queue complete',codes);if(codes.some(Boolean))process.exitCode=1});
