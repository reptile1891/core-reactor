'use strict';
const C=require('../dist/engine'),D=require('../dist/data'),assert=require('node:assert/strict');
function loadout(type){const s=C.freshSave();if(type==='moderate')s.tech={hp:1,width:2,rotation:1,charge:1,reflect:1,shards:1,repair:1};if(type==='max')D.tech.forEach(t=>s.tech[t.id]=t.max);return s;}
function play(type,seed,options={}){
 const s=loadout(type),e=new C.Engine(s,{seed,mode:options.mode||'classic',core:options.core||'standard'}),rng=C.random(seed+976),misses=new Map();let desired=e.angle,pendingAngle=desired,reactAt=0,lastGroup=-1,maxObjects=0,earliestPerfect=0;
 for(let i=0;i<720*60&&e.state!=='dead';i++){
  if(e.state==='route'){e.chooseRoute(options.route||'standard');continue;}
  if(e.state==='specialization'){e.chooseSpecialization(D.specializations[e.pendingSpec][seed%2].id);continue;}
  if(e.state==='upgrade'){
   const priority=['heal','wide','damage','chain','double','crit','barrier','slow','turn','pulse','blast','drone','turret','salvage','energy'];
   const choices=e.choices.slice().sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id));e.choose(choices[0].id);continue;
  }
  if(!options.unattended){
   const incoming=e.groups.filter(g=>!g.cancelled&&!g.resolved&&g.arrival>=e.time-.018).sort((a,b)=>a.arrival-b.arrival),g=incoming[0];
   if(g&&g.id!==lastGroup){lastGroup=g.id;const errorChance=options.expert?0:.18;const miss=rng()<errorChance;misses.set(g.id,miss);pendingAngle=g.angle+(miss?Math.PI/2:0);reactAt=e.time+(options.expert?.08:.22+rng()*.2);}
   if(g&&e.time>=reactAt)pendingAngle=g.angle+(misses.get(g.id)?Math.PI/2:0);if(e.time>=reactAt)desired=pendingAngle;
  }
  if(options.active&&e.hp<e.maxHp&&e.projectiles.some(p=>!p.friendly&&p.r<120&&!e.covers(p.angle)))e.overload();
  e.update(1/60,{angle:options.unattended?undefined:desired});e.drain();maxObjects=Math.max(maxObjects,e.projectiles.length+e.enemies.length+e.groups.length);if(!earliestPerfect&&e.perfects)earliestPerfect=e.time;
  if(e.time>=(options.limit||360))break;
 }
 return{type,seed,time:+e.time.toFixed(1),hp:e.hp,kills:e.kills,bosses:e.bossKills,perfect:e.perfects,level:e.level,score:e.score,maxObjects,dead:e.state==='dead',bossIds:e.clearedBosses};
}
if(require.main===module){
const results=[];for(const type of ['none','moderate','max'])for(let seed=1;seed<=30;seed++)results.push(play(type,seed));
const stats=['none','moderate','max'].map(type=>{const rs=results.filter(r=>r.type===type),times=rs.map(r=>r.time).sort((a,b)=>a-b);return{loadout:type,runs:rs.length,median:times[15],min:times[0],max:times[29],mean:+(times.reduce((a,b)=>a+b,0)/30).toFixed(1),meanBosses:+(rs.reduce((a,b)=>a+b.bosses,0)/30).toFixed(1),peakObjects:Math.max(...rs.map(r=>r.maxObjects))};});
const idle=play('max',11,{unattended:true,limit:180}),expert=play('none',2026,{expert:true,limit:360});
console.table(stats);console.log('Max upgrades, no input:',idle);console.log('Base stats, precise defender:',expert);
assert.ok(stats[0].median>=20&&stats[0].median<=90,'new player survival outside broad target');assert.ok(stats[1].median>stats[0].median,'moderate progression should help');assert.ok(idle.dead&&idle.time<100,'automatic abilities must not play the game alone');assert.ok(expert.bosses>=4,'skilled base-stat play must be able to reach and defeat all four bosses');assert.ok(Math.max(...results.map(r=>r.maxObjects))<130,'unbounded entities');
const report={date:'2026-11-16',method:'90 seeded simulations, reaction delay 220–420 ms; 18% direction errors per incoming group. This is a synthetic defender, not human playtesting.',stats,idle,expert,results};
require('node:fs').writeFileSync('tests/balance-results.json',JSON.stringify(report,null,2));
console.log('Balance checks passed.');
}
module.exports={play};
