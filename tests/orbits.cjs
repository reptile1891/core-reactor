'use strict';
const assert=require('node:assert/strict'),C=require('../dist/engine');
function make(time=0){const e=new C.Engine(C.freshSave(),{seed:9});e.time=time;e.nextAttack=e.nextBoss=e.nextSpawn=Infinity;return e;}
for(const base of [248,265,310])for(let time=0;time<100;time+=.1)for(const a of [0,.8,2,4]){const r=C.orbitRadius(a,time,base);assert.ok(Math.abs(r-base)<=24.001);assert.ok(Math.abs(C.orbitRadius(a,time+1/120,base)-r)<.1);}
assert.equal(C.orbitRadius(0,0),265);assert.notEqual(C.orbitRadius(0,24),C.orbitRadius(Math.PI/2,24));
for(const fps of [30,60,120]){const e=make(20),enemy=e.addEnemy('gunner',.5);assert.equal(enemy.r,C.orbitRadius(enemy.angle,e.time,enemy.orbitBase));for(let i=0;i<fps*6;i++){e.update(1/fps);assert.equal(enemy.r,C.orbitRadius(enemy.angle,e.time,enemy.orbitBase));assert.ok(Math.abs(Math.hypot(enemy.x,enemy.y)-enemy.r)<1e-8);}e.state='paused';const before=JSON.stringify([e.time,enemy.x,enemy.y]);e.update(1);assert.equal(JSON.stringify([e.time,enemy.x,enemy.y]),before);}
let e=make(20),owner=e.addEnemy('sniper',.5),g=e.schedule(owner);for(let i=0;i<600&&!g.locked;i++){e.update(1/120);if(!g.locked){assert.equal(g.radius,owner.r);const travel=(g.radius-130)/g.speed+65/(g.speed*(1-g.slow));assert.ok(Math.abs(g.arrival-g.launch-travel)<1e-7);}}assert.ok(g.locked);assert.ok(g.launch-g.lockedAt>=.5-1e-8);const locked=[g.angle,g.radius];for(let i=0;i<70;i++)e.update(1/120);assert.deepEqual([g.angle,g.radius],locked);
for(let i=0;i<4;i++){e=make(24);const boss=e.addBoss(i);assert.equal(boss.r,C.orbitRadius(boss.angle,e.time,248));}
e=make(24);const parent=e.addEnemy('splitter',1);e.kill(parent);for(const child of e.enemies.filter(x=>x.fragment))assert.equal(child.orbitBase,parent.orbitBase);
console.log('Orbit bounds, continuity, spawn alignment, FPS, pause, aim tracking/lock and fragments passed.');
