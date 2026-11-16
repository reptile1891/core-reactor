const assert=require('node:assert/strict'),C=require('../dist/engine');
function event(index){const e=new C.Engine(C.freshSave(),{seed:4});e.time=32;e.nextBoss=100;e.nextSpawn=e.nextAttack=Infinity;e.encounterIndex=index;e.updateEncounter();return e;}
let e=event(0);const a=e.addEnemy('shooter',0),b=e.addEnemy('gunner',1),c=e.addEnemy('sniper',2);assert.equal(a.encounterTarget,e.encounter.id);assert.equal(c.encounterTarget,undefined);e.kill(c);assert.equal(e.encounter.progress,0);e.kill(a);e.kill(a);assert.equal(e.encounter.progress,1);e.kill(b);assert.equal(e.encounter.done,true);assert.equal(e.drain().filter(x=>x.type==='encounterComplete').length,1);e.time=45;e.updateEncounter();assert.equal(e.encounter,null);assert.equal(e.encounterResults[0].done,true);
e=event(1);e.kill(e.addEnemy('healer',1));assert.ok(e.encounter.done);
e=event(2);for(let i=0;i<5;i++)e.advanceEncounter('block');assert.ok(e.encounter.done);e.hitCore();assert.equal(e.encounter.failed,false);
e=event(2);e.advanceEncounter('block');e.hitCore();for(let i=0;i<8;i++)e.advanceEncounter('block');assert.equal(e.encounter.progress,1);assert.equal(e.encounter.done,false);assert.ok(e.encounter.failed);
e=event(0);e.time=44;e.kill(e.addEnemy('shooter',0));assert.equal(e.encounter.progress,0);e.updateEncounter();assert.equal(e.encounterResults[0].done,false);
e=event(0);e.addBoss();assert.equal(e.encounter,null);assert.equal(e.encounterResults.length,1);
const t=new C.Engine(C.freshSave(),{training:{boss:0}});t.time=40;t.updateEncounter();assert.equal(t.encounter,null);
const save=JSON.stringify(e.save);e.finishEncounter();assert.equal(JSON.stringify(e.save),save);
console.log('Event targets, progress, no duplicate credit, expiry, defense failure, boss interruption and training passed.');
