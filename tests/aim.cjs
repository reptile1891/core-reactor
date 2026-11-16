const assert=require('node:assert/strict'),C=require('../dist/engine');
function make(){const e=new C.Engine(C.freshSave(),{seed:8});e.time=120;e.nextAttack=e.nextSpawn=e.nextBoss=Infinity;return e;}
let e=make(),enemy=e.addEnemy('orbital',0),g=e.schedule(enemy);const initial=g.angle;
for(let i=0;i<24;i++)e.update(1/120);assert.notEqual(g.angle,initial);assert.equal(g.locked,false);
for(let i=0;i<1000&&!g.locked;i++)e.update(1/120);assert.ok(g.locked);const locked=g.angle;assert.ok(g.launch-g.lockedAt>=.5-1e-8);
for(let i=0;i<300&&e.state==='playing';i++)e.update(1/120,{angle:locked});assert.equal(g.angle,locked);
e=make();enemy=e.addEnemy('orbital',0);g=e.schedule(enemy);e.fireGroup(g);const p=e.projectiles[0],angle=p.finalAngle;for(let i=0;i<20;i++)e.update(1/120);assert.equal(p.finalAngle,angle);
e=make();for(let i=0;i<6;i++)e.schedule(e.addEnemy('orbital',i*1.1));for(let i=0;i<400&&e.state==='playing';i++){e.update(1/120);const groups=e.groups.filter(g=>!g.cancelled);for(let j=1;j<groups.length;j++){const a=groups[j-1],b=groups[j];if(!b.fired)assert.ok(b.arrival-a.arrival>=b.gap+Math.abs(C.angleDiff(b.angle,a.angle))/Math.min(b.rotationBudget,e.turnSpeed*.8)-1e-7);}}
console.log('4 tracking, lock, fixed-flight and fair-scheduling checks passed.');
