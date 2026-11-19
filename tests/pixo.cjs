'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('dist/game.js','utf8');
const helper=source.slice(source.indexOf('function pixoRun('),source.indexOf('\nI.setLanguage('));
const finish=source.split(/\r?\n/).find(line=>line.startsWith('function finishRun(){'));
function setup({standalone=false,training=false,daily=null,blocked=false,runMode='classic'}={}){
 const calls=[];const window={parent:{postMessage:(data,origin)=>{if(blocked)throw Error('Blocked');calls.push({data,origin});}}};if(standalone)window.parent=window;
 let settled=false;
 const engine={training,daily,mode:runMode,state:'playing',victory:false,settle(){if(settled)return null;settled=true;return {unlocked:[],newRecords:[]};},result(){return {score:1234,wave:7,bosses:2,kills:30};}};
 const context=vm.createContext({window,engine,location:{origin:'https://pixoarcade.com'},mode:'classic',clearBossMoment(){},persist(){},toast(){},audio:{play(){}},showResult(){},runResult:null});
 vm.runInContext(helper+'\n'+finish,context);
 return {calls,context};
}
let test=setup();vm.runInContext("pixoRun('run-start');finishRun();finishRun();",test.context);
assert.equal(test.calls.length,2);assert.equal(test.calls[0].data.pixo,'run-start');assert.equal(test.calls[1].data.pixo,'run-end');
assert.equal(test.calls[1].origin,'https://pixoarcade.com');assert.equal(test.calls[1].data.board,'classic');
assert.equal(test.calls[1].data.score,1234);assert.equal(test.calls[1].data.wave,7);assert.equal(test.calls[1].data.detail.bosses,2);assert.equal(test.calls[1].data.detail.kills,30);
test=setup({runMode:'skill'});vm.runInContext("pixoRun('run-start');finishRun();",test.context);
assert.deepEqual(test.calls.map(call=>call.data.board),['skill','skill']);
for(const options of [{standalone:true},{training:true},{daily:'2026-11-19'},{blocked:true}]){test=setup(options);vm.runInContext("pixoRun('run-start');finishRun();",test.context);assert.equal(test.calls.length,0);}
console.log('Pixo messages, mode boards, duplicate settlement and isolated/training/daily/blocked contexts passed.');
