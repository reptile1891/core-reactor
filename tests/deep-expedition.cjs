'use strict';
const assert=require('node:assert/strict'),C=require('../dist/engine'),D=require('../dist/data');
function quiet(core='standard'){const e=new C.Engine(C.freshSave(),{seed:41,core});e.time=310;e.nextBoss=e.nextSpawn=e.nextAttack=Infinity;return e;}
// All strengthened patterns use the same fair queue and keep a half-second lock.
for(const core of ['standard','bastion'])for(let spec=0;spec<4;spec++)for(let phase=1;phase<=3;phase++){
 const e=quiet(core),b=e.addBoss(spec+4);e.nextBoss=e.nextSpawn=e.nextAttack=Infinity;e.time+=4;b.hp=b.maxHp*(phase===1?.9:phase===2?.5:.2);e.bossAttack(b);assert.ok(b.deep);assert.equal(b.phase,phase);assert.ok(e.groups.length>=2&&e.groups.length<=3);assert.ok(b.pattern);
 const groups=e.groups.slice();for(let i=0;i<300;i++){e.update(1/120,{angle:0});if(e.state==='dead')break;}
 for(const g of groups){if(g.locked)assert.ok(g.launch-g.lockedAt>=.5-1e-8);}
 for(let i=1;i<groups.length;i++){const a=groups[i-1],b=groups[i];assert.ok(b.arrival-a.arrival>=b.gap+Math.abs(C.angleDiff(b.angle,a.angle))/b.rotationBudget-1e-7);}
 const count=e.groups.length;e.bossAttack(b);assert.ok(e.groups.length<=count+3);
}
const daily=new C.Engine(C.freshSave(),{daily:'2026-11-17'});assert.equal(daily.addBoss(4).deep,false);const training=new C.Engine(C.freshSave(),{training:{boss:3,phase:3}});assert.equal(training.boss.final,false);
// The final boss survives both health gates and pays only once.
const final=quiet(),boss=final.addBoss(7);assert.ok(boss.final);const hp=boss.hp;final.damageEnemy(boss,999);assert.equal(boss.hp,hp);final.time+=3.6;
for(const phase of [2,3]){const before=boss.hp;final.damageEnemy(boss,999);assert.equal(boss.phase,phase);assert.ok(boss.hp>0);const remaining=boss.hp;final.damageEnemy(boss,999);assert.equal(boss.hp,remaining);assert.ok(final.damageBy.reflection<=boss.maxHp);final.time+=1.4;assert.ok(before>remaining);}
final.damageEnemy(boss,999);assert.ok(boss.dead);assert.equal(final.bossKills,1);const kills=final.kills;final.kill(boss);assert.equal(final.kills,kills);assert.ok(final.effects.find(f=>f.type==='destroy'&&f.final));
// Sector rewards cannot be farmed from individual bullets of the same attack.
for(const route of ['focus','drift']){const e=quiet();e.route=route;e.rotation=Math.PI;const owner=e.addEnemy('shooter',0),group={owner:owner.id,perfect:true};const energy=e.energy;e.reflect({angle:0},group);const first=e.energy-energy;e.energy=energy;e.reflect({angle:0},group);assert.ok(first>e.energy-energy);assert.equal(group.routeBonusPaid,true);}
const rest=quiet();rest.hp=1;rest.state='route';assert.ok(rest.chooseRoute('standard'));assert.equal(rest.hp,2);assert.equal(rest.chooseRoute('standard'),false);assert.equal(rest.hp,2);
const focus=quiet();focus.route='focus';const owner=focus.addEnemy('shooter',0);assert.ok(focus.schedule(owner).speed>D.enemies.find(x=>x.id==='shooter').speed);
const moving=quiet();moving.route='drift';moving.attack(moving.addEnemy('sniper',0));assert.ok(Math.abs(moving.groups[0].aimOffset)>.5);
// Assemblies preserve original hits; only the extra hop has reduced damage.
const chain=quiet();chain.up={chain:2,crit:1};chain.rng=()=>1;const enemies=Array.from({length:4},(_,i)=>chain.addEnemy('carrier',i*.1));enemies.forEach(e=>e.hp=e.maxHp=20);chain.onProjectileHit({damage:2,hit:[enemies[0].id]},enemies[0]);assert.ok(chain.hasAssembly('storm'));assert.equal(chain.effects.filter(f=>f.type==='chain').length,3);assert.ok(Math.abs(20-enemies[1].hp-1.4)<1e-8);assert.ok(Math.abs(20-enemies[3].hp-.91)<1e-8);
const blast=quiet();blast.up={blast:2,pierce:1};const a=blast.addEnemy('carrier',0),b=blast.addEnemy('carrier',0);b.x=a.x+68;b.y=a.y;blast.onProjectileHit({damage:1,hit:[a.id]},a);assert.ok(b.hp<b.maxHp);assert.equal(blast.effects.find(f=>f.type==='blast').r,72);
const shield=quiet();shield.up={barrier:2,pcombo:1};const src=shield.addEnemy('shooter',0);for(let i=0;i<3;i++)shield.reflect({angle:0},{owner:src.id,perfect:true});assert.ok(shield.barrier>=1.55-1e-8);
const choice=quiet();choice.up={chain:1,crit:1};choice.state='upgrade';choice.choices=[D.upgrades.find(x=>x.id==='chain')];choice.choose('chain');assert.ok(choice.drain().some(e=>e.type==='assembly'));
console.log('Deep expedition: 24 pattern/phase/core combinations, final gates, route rewards and 3 assemblies passed.');

const dailyRoutes=new C.Engine(C.freshSave(),{daily:'2026-11-17'});dailyRoutes.up={chain:3,crit:3};assert.equal(dailyRoutes.assembledBuilds().length,0);assert.equal(dailyRoutes.routeChoices.length,3);dailyRoutes.hp=1;dailyRoutes.state='route';assert.equal(dailyRoutes.chooseRoute('focus'),false);assert.equal(dailyRoutes.chooseRoute('standard'),true);assert.equal(dailyRoutes.hp,1);
