/* Pure simulation: no DOM, audio, timers, or networking. */
(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.CoreData;
const BALANCE='1.7';
const TAU=Math.PI*2, RAD=Math.PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const pos=(a,r)=>({x:Math.cos(a)*r,y:Math.sin(a)*r});
function random(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function freshSave(){return{version:3,shards:0,rare:0,prestige:0,prestigeTech:{},tech:{},achievements:[],bosses:[],modes:['classic','skill'],records:{classic:[],skill:[],challenge:[],horizon:[]},bests:{},currentBalance:BALANCE,currentBests:{},recordsArchive:{classic:[],skill:[],challenge:[],horizon:[]},totals:{runs:0,kills:0,bosses:0,perfect:0,blocks:0,time:0,combo:0},settings:{sfx:.55,music:.16,reduced:false,language:'ru',deadzone:.22},settled:[]};}
function validateSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||![1,2,3].includes(value.version))throw Error('Неподдерживаемая версия сохранения.');
 const s=freshSave(), integer=(v,max=1e9)=>Number.isFinite(v)&&v>=0?Math.min(max,Math.floor(v)):0;
 s.shards=integer(value.shards,1e7);s.rare=integer(value.rare,1e4);s.prestige=integer(value.prestige,1e4);
 for(const t of D.tech)s.tech[t.id]=integer(value.tech?.[t.id],t.max);
 for(const t of D.prestigeTech)s.prestigeTech[t.id]=integer(value.prestigeTech?.[t.id],t.max);
 s.achievements=D.achievements.filter(x=>value.achievements?.includes(x.id)).map(x=>x.id);
 s.bosses=D.bosses.filter(x=>value.bosses?.includes(x.id)).map(x=>x.id);
 s.modes=['classic','skill'];if(value.modes?.includes('challenge'))s.modes.push('challenge');if(s.prestigeTech.void)s.modes.push('horizon');
 for(const key of Object.keys(s.totals))s.totals[key]=integer(value.totals?.[key]);
 for(const mode of Object.keys(s.records)){
  const rows=Array.isArray(value.records?.[mode])?value.records[mode]:[];
  s.records[mode]=rows.slice(0,10).filter(r=>r&&typeof r==='object').map(r=>({time:integer(r.time,86400),score:integer(r.score),kills:integer(r.kills),bosses:integer(r.bosses),combo:integer(r.combo),perfect:integer(r.perfect),perfectCombo:integer(r.perfectCombo),wave:integer(r.wave,6000),date:typeof r.date==='string'?r.date.slice(0,10):'',id:typeof r.id==='string'?r.id.slice(0,70):''}));
  const best=value.bests?.[mode]||{};s.bests[mode]={};for(const key of ['time','score','kills','bosses','combo','perfectCombo','wave'])s.bests[mode][key]=integer(best[key]);
 }
 s.currentBalance=BALANCE;
 for(const mode of Object.keys(s.records)){const oldRows=Array.isArray(value.recordsArchive?.[mode])?value.recordsArchive[mode]:[];const clean=rows=>rows.filter(r=>r&&typeof r==='object').map(r=>({...r,time:integer(r.time,86400),score:integer(r.score),kills:integer(r.kills),bosses:integer(r.bosses),combo:integer(r.combo),perfect:integer(r.perfect),perfectCombo:integer(r.perfectCombo),wave:integer(r.wave),date:typeof r.date==='string'?r.date.slice(0,10):'',id:typeof r.id==='string'?r.id.slice(0,70):'',balance:typeof r.balance==='string'?r.balance.slice(0,12):'legacy',core:['standard','mirror','storm','bastion'].includes(r.core)?r.core:'unknown'}));const source=clean(Array.isArray(value.records?.[mode])?value.records[mode]:[]);s.records[mode]=source.filter(r=>r.balance===BALANCE).slice(0,10);s.recordsArchive[mode]=clean(oldRows).concat(source.filter(r=>r.balance!==BALANCE));const b=value.currentBalance===BALANCE?value.currentBests?.[mode]:null;s.currentBests[mode]={};for(const key of ['time','score','kills','bosses','combo','perfectCombo','wave'])s.currentBests[mode][key]=integer(b?.[key]);for(const r of s.records[mode])for(const key of Object.keys(s.currentBests[mode]))s.currentBests[mode][key]=Math.max(s.currentBests[mode][key],r[key]||0);}
 s.settings.deadzone=Number.isFinite(value.settings?.deadzone)?clamp(value.settings.deadzone,.1,.4):.22;
 s.settings.sfx=typeof value.settings?.sfx==='number'?clamp(value.settings.sfx,0,1):.55;
 s.settings.music=typeof value.settings?.music==='number'?clamp(value.settings.music,0,1):.16;
 s.settings.reduced=Boolean(value.settings?.reduced);
 s.settings.language=value.settings?.language==='en'?'en':'ru';s.settings.core=['mirror','storm','bastion'].includes(value.settings?.core)?value.settings.core:'standard';
 s.settled=Array.isArray(value.settled)?value.settled.filter(x=>typeof x==='string').slice(-30):[];
 return s;
}
class SaveStore{
 constructor(storage){this.storage=storage;this.warning='';this.protected=false;this.key='core-reactor-v2';this.data=freshSave();try{let raw=storage.getItem(this.key);if(raw)this.data=validateSave(JSON.parse(raw));}catch(e){this.protected=true;this.warning='Сохранение не удалось прочитать. Исходные данные сохранены; экспортируйте их в настройках. Новый прогресс пока хранится в памяти.';}}
 write(){if(this.protected)return false;try{this.storage.setItem(this.key,JSON.stringify(this.data));return true;}catch(e){this.warning='Браузер не разрешил запись. Экспортируйте прогресс в настройках.';return false;}}
 import(raw){const parsed=validateSave(JSON.parse(raw));try{const old=this.storage.getItem(this.key);if(old)this.storage.setItem(this.key+'-backup',old);this.storage.setItem(this.key,JSON.stringify(parsed));}catch(e){throw Error('Нет доступа к хранилищу. Импорт не выполнен.');}this.data=parsed;this.protected=false;this.warning='';return parsed;}
 original(){try{return this.storage.getItem(this.key)||JSON.stringify(this.data);}catch(e){return JSON.stringify(this.data);}}
}
class Engine{
 constructor(save=freshSave(),options={}){this.save=save;this.mode=options.mode||'classic';this.rng=random(options.seed??Date.now());this.events=[];this.state='playing';this.time=0;this.score=0;this.wave=1;this.hp=3;this.level=1;this.energy=0;this.combo=0;this.bestCombo=0;this.perfectCombo=0;this.bestPerfectCombo=0;this.perfects=0;this.blocks=0;this.kills=0;this.bossKills=0;this.angle=-Math.PI/2;this.target=this.angle;this.rotation=0;this.invuln=0;this.barrier=0;this.suppressed=0;this.bounty=0;this.hitCount=0;this.up={};this.enemies=[];this.projectiles=[];this.warnings=[];this.effects=[];this.groups=[];this.choices=[];this.clearedBosses=[];this.nextSpawn=1.3;this.nextAttack=2.2;this.nextBoss=60;this.lastArrival=0;this.lastAttackAngle=this.angle;this.nextId=0;this.autoTimer=0;this.droneTimer=0;this.auraTimer=0;this.emergencyUsed=false;this.reviveUsed=false;this.boss=null;this.bossIndex=0;this.pendingLevels=0;this.rewarded=false;this.deathReason='';this.meta=this.mode==='skill'?{}:save.tech||{};this.pt=this.mode==='skill'?{}:save.prestigeTech||{};this.rerolls=this.m('choices');this.maxHp=Math.min(5,3+this.m('hp'));this.hp=this.maxHp;this.energy=this.m('initial')*10+(this.pt.memory||0)*5;this.id=options.id||('run-'+Date.now().toString(36)+'-'+Math.floor(this.rng()*1e9).toString(36));this.difficulty=this.mode==='horizon'?1.35:this.mode==='challenge'?1.16+this.m('challenge')*.05:1;this.core=this.mode==='skill'?'standard':(options.core||save.settings.core||'standard');this.overloadCooldown=0;this.replay=[];this.replayAt=0;this.lastHit=null;if(this.core==='storm')this.up.chain=1;this.challengeTitle=this.mode==='horizon'?'Горизонт событий':this.mode==='challenge'?'Разогнанный реактор':'';}
 overload(){if(this.state!=='playing'||this.energy<20||this.overloadCooldown>0)return false;this.energy-=20;this.overloadCooldown=8;for(const p of this.projectiles)if(!p.friendly&&p.r<=140)p.active=false;this.effects.push({type:'pulse',r:140,life:.5,max:.5});this.emit('pulse');return true;}
 synergies(extra){const has=id=>this.u(id)>0||id===extra;return [{ids:['chain','crit'],name:'Грозовой резонанс',desc:'Цепные разряды могут наносить критический урон.'},{ids:['blast','pierce'],name:'Каскад взрывов',desc:'Каждое пробитое попадание создаёт взрыв.'},{ids:['double','damage'],name:'Зеркальный каскад',desc:'Эхо наследует усиленный урон отражения.'},{ids:['barrier','pcombo'],name:'Безупречный контур',desc:'Идеальные серии одновременно дают энергию и барьер.'}].filter(x=>x.ids.every(has));}
 captureReplay(){this.replay.push({time:this.time,angle:this.angle,width:this.width,secondary:this.secondary,barrier:this.barrier,invuln:this.invuln,hp:this.hp,bullets:this.projectiles.filter(p=>!p.friendly&&p.active).slice(0,35).map(p=>({x:p.x,y:p.y})),feints:this.effects.filter(f=>f.type==='feint').map(f=>f.angle),beams:this.groups.filter(g=>g.kind==='laser'&&!g.resolved).map(g=>g.angle)});this.replay=this.replay.filter(f=>this.time-f.time<=1.8);}
 m(id){return this.meta[id]||0;} u(id){return this.up[id]||0;}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){return this.events.splice(0);}
 get width(){return Math.min(105,55+(this.core==='bastion'?10:0)+this.m('width')*4+this.u('wide')*8)*RAD;}
 get turnSpeed(){return (540+this.m('rotation')*30+this.u('turn')*65)*RAD*(this.core==='bastion'?.82:1)*(this.suppressed>0?.7:1);}
 get damage(){return (1+this.m('reflect')*.15+this.u('damage')*.6)*(this.core==='storm'?.8:this.core==='mirror'?.9:1);}
 get threshold(){return Math.round((36+(this.level-1)*15)*Math.max(.76,1-this.u('learn')*.08));}
 get secondary(){return (this.m('arc')*12+this.u('segment')*18)*RAD;}
 covers(a,angle=this.angle){const d=Math.abs(angleDiff(a,angle));return d<=this.width/2||(this.secondary>0&&Math.abs(Math.PI-d)<=this.secondary/2);}
 orbitSpeed(e){
  if(e.type==='boss')return [.16,-.22,.30,-.24][e.spec]*(1+.15*((e.phase||1)-1));
  const progress=clamp((this.time-18)/90,0,1),direction=e.id%2===0?-1:1;
  if(e.type==='orbital')return direction*(.24+.1*progress);
  const rates={shooter:.16,gunner:.13,sniper:.11,shotgun:.15,laser:.1,splitter:.17,suppressor:.14};
  return direction*(rates[e.type]||.14)*progress;
 }
 addEnemy(type,angle,r=265){const spec=D.enemies.find(x=>x.id===type)||D.enemies[0];const e={id:++this.nextId,type:spec.id,angle,r,hp:spec.hp,maxHp:spec.hp,size:13,born:this.time,cool:0,...pos(angle,r)};this.enemies.push(e);this.emit('spawn',{enemy:type});return e;}
 addBoss(index=this.bossIndex){const spec=D.bosses[index%4],cycle=Math.floor(index/4);this.projectiles=this.projectiles.filter(p=>p.friendly);this.warnings=[];this.groups=[];this.lastArrival=this.time;this.enemies=[];const e={id:++this.nextId,type:'boss',spec:index%4,angle:-Math.PI/2,r:248,hp:spec.hp*(1+cycle*.35),maxHp:spec.hp*(1+cycle*.35),size:30,born:this.time,cool:0,sections:3,phase:1,...pos(-Math.PI/2,248)};this.enemies.push(e);this.boss=e;this.nextAttack=this.time+1.6;this.emit('boss',{name:spec.name,index:index%4});return e;}
 schedule(e,kind='shot',options={}){
  if(!e||this.groups.length>9)return null;
  const angle=options.angle??(e.angle+(e.type==='boss'&&e.spec!==0?(e.attackCycle%2?1.05:-1.05):0)),spec=D.enemies.find(x=>x.id===e.type)||D.enemies[0],speed=(options.speed||spec.speed||150)*(this.mode==='horizon'?1.15:this.mode==='challenge'?1.1:1);
  const slow=Math.min(.45,this.u('slow')*.15)+(this.singularityGift?.1:0);
  const travel=kind==='laser'?0:Math.max(0,(e.r-130))/speed+65/(speed*(1-slow));
  const windup=options.windup??(e.type==='sniper'?1.6:kind==='laser'?1.4:1.1);
  const pressure=e.type==='boss'&&e.spec===0;
  const gap=options.sameGroup?.12:pressure?[.24,.21,.19][e.phase-1]:Math.max(.17,.63-Math.max(0,this.time-10)*.008)/this.difficulty;
  // Guardian has a tighter rhythm, still below the player's turn speed and with reaction time reserved.
  const rotationBudget=Math.min((pressure||this.time>=18?420:300)*RAD,this.turnSpeed*.8);
  const separation=gap+Math.abs(angleDiff(angle,this.lastAttackAngle))/rotationBudget;
  const arrival=Math.max(this.time+windup+travel,this.lastArrival+separation);
  this.lastArrival=arrival;this.lastAttackAngle=angle;
  // The charge stays at its telegraphed position while its owner continues orbiting.
  const g={id:++this.nextId,owner:e.id,kind,angle,aimOffset:angle-e.angle,locked:false,gap,rotationBudget,radius:e.r,arrival,launch:arrival-travel,created:this.time,speed,slow,fired:false,burst:options.burst||1,fan:options.fan||0,curve:options.curve||0,damage:1,suppress:e.type==='suppressor',trackedAt:null,aligned:false,perfect:false};
  if(kind==='laser'||e.type==='sniper')this.emit('warning',{enemy:e.type,kind});
  g.tracks=Array.from({length:g.fan||g.burst},(_,i)=>({angle:angle+(i-((g.fan||g.burst)-1)/2)*(g.fan?10:4)*RAD,aligned:false,trackedAt:null}));this.groups.push(g);this.warnings.push(g);return g;
 }
 attack(e){
  if(e.type==='boss')return this.bossAttack(e);
  if(e.type==='gunner')for(let i=0;i<3;i++)this.schedule(e,'shot',{sameGroup:i>0});
  else this.schedule(e,e.type==='laser'?'laser':'shot',{fan:e.type==='shotgun'?3:0});
  e.cool=this.time+(this.time<18?3:2.2);
 }
 bossAttack(e){
  if(e.spec!==0)e.attackCycle=(e.attackCycle||0)+1;const def=D.bosses[e.spec];e.phase=1+Number(e.hp<e.maxHp*.67)+Number(e.hp<e.maxHp*.34);
  if(def.id==='guardian'){
   this.guardianAttack(e);
  }else if(def.id==='hydra'){
   const remaining=Math.max(1,Math.ceil(e.hp/(e.maxHp/3)));if(remaining<e.sections){e.sections=remaining;this.emit('section',{remaining});}
   this.schedule(e,'shot',{fan:remaining===3?3:0,burst:remaining===1?2:1,speed:150+(3-remaining)*20});
  }else if(def.id==='phantom'){
   if(this.rng()<.65){e.angle=this.rng()*TAU;Object.assign(e,pos(e.angle,e.r));this.emit('teleport',{x:e.x,y:e.y});}
   this.effects.push({type:'feint',angle:e.angle+Math.PI*.7,life:1.3,max:1.3});
   this.schedule(e,e.phase===3?'laser':'shot',{speed:190,windup:1.2});
  }else{
   this.schedule(e,'shot',{speed:145+e.phase*12,curve:e.phase>=2?.6:0,fan:e.phase===3?3:0,windup:1});
   if(e.phase>=2){this.effects.push({type:'wave',life:1.5,max:1.5,angle:e.angle});for(let i=1;i<=e.phase-1;i++)this.schedule(e,'shot',{angle:e.angle+i*.55,speed:160,curve:.6,windup:1.15});}
  }
 }
 guardianAttack(e){
  const patterns=['Перекрёстный огонь','Лазерный захват','Перегрузка орудий'];
  e.pattern=patterns[e.phase-1];
  if(e.patternPhase!==e.phase){e.patternPhase=e.phase;this.emit('guardianPhase',{phase:e.phase,pattern:e.pattern});}
  const required=e.phase===3?3:2;
  const pending=this.groups.filter(g=>!g.cancelled&&!g.resolved&&g.arrival>this.time).length;
  if(pending+required>4)return;
  const direction=(e.attackCycle||0)%2===0?1:-1;e.attackCycle=(e.attackCycle||0)+1;
  if(e.phase===1){
   this.schedule(e,'shot',{angle:e.angle-direction*.95,speed:175,windup:.85});
   this.schedule(e,'shot',{angle:e.angle+direction*.95,speed:190,windup:.85});
  }else if(e.phase===2){
   this.schedule(e,'laser',{angle:e.angle+direction*1.2,windup:1.1});
   this.schedule(e,'shot',{angle:e.angle-direction*1.2,burst:2,speed:205,windup:.95});
  }else{
   this.schedule(e,'shot',{angle:e.angle-direction*1.4,speed:220,windup:.85});
   this.schedule(e,'laser',{angle:e.angle,windup:1.1});
   this.schedule(e,'shot',{angle:e.angle+direction*1.4,burst:2,speed:210,windup:.95});
  }
 }
 updateAim(){let previous=null;for(const g of this.groups){if(g.cancelled)continue;if(!g.fired){const owner=this.enemies.find(e=>e.id===g.owner&&!e.dead);if(!owner){g.cancelled=true;continue;}if(!g.locked){g.angle=owner.angle+g.aimOffset;g.radius=owner.r;for(let i=0;i<g.tracks.length;i++){const track=g.tracks[i];track.angle=g.angle+(i-(g.tracks.length-1)/2)*(g.fan?10:4)*RAD;track.trackedAt=null;}}
 if(previous){const needed=previous.arrival+g.gap+Math.abs(angleDiff(g.angle,previous.angle))/Math.min(g.rotationBudget,this.turnSpeed*.8);if(needed>g.arrival){const delay=needed-g.arrival;g.arrival+=delay;g.launch+=delay;}}
 if(!g.locked&&this.time>=g.launch-.5){const extra=Math.max(0,this.time+.5-g.launch);g.launch+=extra;g.arrival+=extra;g.locked=true;g.lockedAt=this.time;for(const track of g.tracks){track.aligned=this.covers(track.angle);track.trackedAt=null;}this.emit('aimLock');}}
 previous=g;}
 if(previous){this.lastArrival=previous.arrival;this.lastAttackAngle=previous.angle;}}
 fireGroup(g){
  const e=this.enemies.find(e=>e.id===g.owner);if(!e){g.cancelled=true;return;}
  g.fired=true;
  if(g.kind==='laser'){g.beam=true;return;}
  const count=g.fan||g.burst;
  for(let i=0;i<count;i++){
   const offset=(i-(count-1)/2)*(g.fan?10:4)*RAD;
   const a=g.angle+offset;
   this.projectiles.push({id:++this.nextId,group:g,track:g.tracks[i],angle:a,finalAngle:a,r:g.radius,originRadius:g.radius,speed:g.speed,slow:g.slow,curve:g.curve,age:0,friendly:false,damage:1,suppress:g.suppress,active:true,trail:[],...pos(a-g.curve,g.radius)});
  }
  this.emit('fire',{enemy:e.type});
 }
 gainEnergy(n){this.energy+=n*(this.time>=18?.82:1)*(1+(this.pt.prism||0)*.05)*(this.bounty>0?1+.25*this.u('bounty'):1);}
 reflect(p,g){
  const perfect=Boolean(g.perfect);this.blocks++;this.combo++;this.bestCombo=Math.max(this.combo,this.bestCombo);
  this.perfectCombo=perfect?this.perfectCombo+1:0;this.bestPerfectCombo=Math.max(this.bestPerfectCombo,this.perfectCombo);if(perfect)this.perfects++;const owner=this.enemies.find(e=>e.id===g.owner);if(owner?.type==='boss'){owner.seriesBlocks=(owner.seriesBlocks||0)+1;if(perfect||owner.seriesBlocks%4===0)owner.vulnerableUntil=Math.max(owner.vulnerableUntil||0,this.time+(perfect?2.1:.65));}
  const multi=Math.min(5,1+Math.floor(this.combo/8)*.25+this.perfectCombo*.1);
  this.score+=Math.round((perfect?70:25)*multi*(this.bounty>0?1.5:1));
  this.gainEnergy((perfect?12:6)*(1+.25*this.u('energy')+.1*this.m('charge'))+(perfect?Math.min(5,this.perfectCombo)*this.u('pcombo')*2:0));
  if(perfect&&(this.u('barrier')||this.phantomGift))this.barrier=Math.max(this.barrier,this.u('barrier')*.6+(this.phantomGift?.5:0));
  const crit=this.rng()<this.u('crit')*.18;
  const damage=this.damage*(perfect&&this.core==='mirror'?1.25:1)*(perfect?2*(1+.15*this.m('perfect')):1)*(crit?3:1);
  this.launchFriendly(p.angle,damage,g.owner,{pierce:this.u('pierce')+1,crit});
  const echoes=this.u('double')+(this.hydraGift?1:0);for(let i=0;i<echoes;i++)this.launchFriendly(p.angle+.12*(i+1),damage*.45,null,{pierce:1,crit});
  this.effects.push({type:perfect?'perfect':'block',...pos(p.angle,65),angle:p.angle,life:perfect?.55:.3,max:perfect?.55:.3});
  this.emit(perfect?'perfect':'block',{combo:this.combo});
  if(this.u('pulse')&&this.blocks%8===0){this.projectiles=this.projectiles.filter(q=>q.friendly);for(const w of this.groups)if(w.fired)w.cancelled=true;this.areaDamage(1.5*this.u('pulse')*(1+.25*this.m('legend')));this.effects.push({type:'pulse',life:1,max:1});this.emit('pulse');}
 }
 launchFriendly(a,damage,target,opts={}){const targetEnemy=this.enemies.find(e=>e.id===target)||this.enemies.reduce((best,e)=>!best||Math.abs(angleDiff(e.angle,a))<Math.abs(angleDiff(best.angle,a))?e:best,null);const v=pos(a,68);this.projectiles.push({id:++this.nextId,friendly:true,active:true,x:v.x,y:v.y,angle:a,damage,target:targetEnemy?.id,age:0,trail:[],hit:[],pierce:opts.pierce||1,crit:opts.crit||false,auto:opts.auto||false});}
 hitCore(suppress=false,reason='Снаряд прошёл мимо щита',attackAngle,miss){
  if(this.invuln>0||this.barrier>0)return;
  this.hitCount++;
  if((this.u('armor')&&this.hitCount%(6-this.u('armor'))===0)||(this.m('plate')&&this.hitCount%(9-this.m('plate'))===0)){this.barrier=.4;this.emit('armor');return;}
  this.lastHit=miss||this.missInfo(Number.isFinite(attackAngle)?attackAngle:this.angle+Math.PI);this.hp--;this.combo=0;this.perfectCombo=0;this.invuln=.7+.1*this.m('grace');if(suppress){this.suppressed=3;this.emit('suppress');}
  this.emit('hurt',{hp:this.hp});this.effects.push({type:'hurt',life:.5,max:.5});
  if(this.u('revenge'))this.areaDamage(1.5*this.u('revenge'));
  if(this.hp===1&&this.m('emergency')&&!this.emergencyUsed){this.emergencyUsed=true;this.barrier=2;this.emit('emergency');}
  if(this.hp<=0&&this.m('revive')&&!this.reviveUsed){this.reviveUsed=true;this.hp=1;this.barrier=2;this.emit('revive');}
  if(this.hp<=0){this.hp=0;this.state='dead';this.deathReason=reason;this.emit('death');}this.captureReplay();
 }
 missInfo(angle){const late=Math.abs(angleDiff(this.target,angle))<=this.width/2;const fake=this.effects.some(f=>f.type==='feint'&&Math.abs(angleDiff(f.angle,this.angle))<this.width/2);return {angle,shield:this.angle,width:this.width,secondary:this.secondary,time:this.time,hint:fake?'Вы защищали ложный луч. Пунктир с меткой ЭХО безопасен.':late?'Щит не успел повернуться. Начинайте поворот раньше.':'Вы защищали другое направление. Следите за ближайшим ударом.'};}
 areaDamage(n){for(const e of this.enemies.slice())this.damageEnemy(e,n);}
 damageEnemy(e,n){if(e.dead)return;if(e.type==='boss')n*=this.time<(e.vulnerableUntil||0)?1.45:.65;e.hp-=n;this.effects.push({type:'hit',x:e.x,y:e.y,life:.2,max:.2});if(e.hp<=0)this.kill(e);}
 kill(e){
  if(e.dead)return;e.dead=true;this.kills++;this.score+=e.type==='boss'?1500:100;
  this.gainEnergy((e.type==='boss'?22:4)+this.u('salvage')*3);this.emit('kill',{x:e.x,y:e.y});this.effects.push({type:'destroy',x:e.x,y:e.y,life:.6,max:.6});
  if(e.type==='splitter')for(const offset of [-.35,.35]){const child=this.addEnemy('shooter',e.angle+offset,e.r);child.hp=.5;child.maxHp=.5;child.size=8;child.fragment=true;child.cool=this.time+4;this.schedule(child,'shot',{speed:120,windup:.9});}
  if(e.type==='boss'){
   this.bossKills++;this.clearedBosses.push(D.bosses[e.spec].id);this.boss=null;this.bossIndex++;this.nextBoss=Math.max(this.nextBoss+60,this.time+20);this.hp=Math.min(this.maxHp,this.hp+this.m('repair'));
   if(e.spec===0){this.maxHp=Math.min(6,this.maxHp+1);this.hp=Math.min(this.maxHp,this.hp+1);}
   if(e.spec===1)this.hydraGift=true;if(e.spec===2)this.phantomGift=true;if(e.spec===3)this.singularityGift=true;
   this.projectiles=this.projectiles.filter(p=>p.friendly);this.groups=[];this.warnings=[];this.lastArrival=this.time;this.emit('bossWin',{index:e.spec,reward:D.bosses[e.spec].reward});
  }
 }
 offer(){
  const pool=D.upgrades.filter(u=>this.u(u.id)<u.max&&(u.id!=='heal'||this.hp<this.maxHp));const selected=[];
  for(let i=0;i<Math.min(3,pool.length);i++){
   const weights=pool.map(u=>[8,3,1,.28][u.rarity]*Math.pow(1+this.m('rarity')*.15+this.u('lucky')*.35,u.rarity));let v=this.rng()*weights.reduce((a,b)=>a+b,0),index=0;for(;index<pool.length-1;index++){v-=weights[index];if(v<=0)break;}selected.push(pool.splice(index,1)[0]);
  }
  if(!selected.length){this.choices=[];this.score+=300;this.emit('overflow');return [];}this.choices=selected;this.state='upgrade';this.emit('level',{level:this.level});return selected;
 }
 choose(id){if(this.state!=='upgrade'||!this.choices.some(u=>u.id===id))return false;const before=this.synergies().length;this.applyUpgrade(id);if(this.synergies().length>before)this.emit('synergy',{name:this.synergies().at(-1).name});this.choices=[];this.state='playing';this.emit('choose',{id});return true;}
 applyUpgrade(id){const def=D.upgrades.find(x=>x.id===id);if(!def||this.u(id)>=def.max)return false;this.up[id]=this.u(id)+1;if(id==='heal')this.hp=Math.min(this.maxHp,this.hp+1);if(id==='bounty')this.bounty=25;return true;}
 reroll(){if(this.state!=='upgrade'||!this.rerolls)return false;this.rerolls--;this.offer();return true;}
 update(dt,input={}){if(this.state!=='playing')return;dt=clamp(dt,0,.05);let left=dt;while(left>1e-7&&this.state==='playing'){const step=Math.min(left,1/120);this.step(step,input);left-=step;}}
 step(dt,input){
  const oldAngle=this.angle;this.time+=dt;if(this.time>=this.replayAt){this.replayAt=this.time+.08;this.captureReplay();}
  if(input.axis){this.angle+=clamp(input.axis,-1,1)*this.turnSpeed*dt;this.target=this.angle;}
  else {if(Number.isFinite(input.angle))this.target=input.angle;this.angle+=clamp(angleDiff(this.target,this.angle),-this.turnSpeed*dt,this.turnSpeed*dt);}
  this.angle=Math.atan2(Math.sin(this.angle),Math.cos(this.angle));this.rotation=angleDiff(this.angle,oldAngle)/dt;
  for(const key of ['invuln','barrier','suppressed','bounty','overloadCooldown'])this[key]=Math.max(0,this[key]-dt);
  const wave=1+Math.floor(this.time/18);if(wave!==this.wave){this.wave=wave;this.emit('wave',{wave});}
  if(this.time>=this.nextBoss&&!this.boss)this.addBoss();
  if(this.time>=this.nextSpawn&&!this.boss){
   const allowed=D.enemies.filter(e=>e.unlock<=this.time),type=allowed[Math.floor(this.rng()*allowed.length)];if(this.enemies.filter(e=>!e.dead).length<Math.min(11,3+this.wave))this.addEnemy(type.id,this.rng()*TAU);this.nextSpawn=this.time+Math.max(1.3,3.4-this.time*.02)/(this.difficulty*(this.time>=18?1.16:1));
  }
  if(this.time>=this.nextAttack){
   const candidates=this.enemies.filter(e=>!e.dead&&e.cool<=this.time);const e=candidates[Math.floor(this.rng()*candidates.length)];if(e)this.attack(e);const interval=this.boss?.spec===0?[1.1,.9,.75][this.boss.phase-1]:Math.max(.5,1.8-this.time*.011);this.nextAttack=this.time+interval/(this.difficulty*(this.time>=18?1.16:1));
  }
  for(const e of this.enemies){
   e.orbitVelocity=this.orbitSpeed(e);
   e.angle=Math.atan2(Math.sin(e.angle+dt*e.orbitVelocity),Math.cos(e.angle+dt*e.orbitVelocity));
   Object.assign(e,pos(e.angle,e.r));
  }
  this.updateAim();
  // Record each group's first real overlap caused by shield movement. Holding a shield never refreshes the timestamp.
  for(const g of this.groups){if(g.cancelled)continue;const moving=g.locked&&Math.abs(this.rotation)>20*RAD;for(const track of g.tracks){const aligned=this.covers(track.angle);if(aligned&&!track.aligned&&moving)track.trackedAt=this.time;track.aligned=aligned;if(!aligned)track.trackedAt=null;}g.trackedAt=g.tracks[0].trackedAt;
   if(!g.fired&&this.time>=g.launch)this.fireGroup(g);
   if(g.kind==='laser'&&g.fired&&this.time>=g.arrival&&!g.resolved){g.resolved=true;g.perfect=g.trackedAt!==null&&this.time-g.trackedAt<=.12&&this.covers(g.angle);if(this.covers(g.angle))this.reflect({angle:g.angle},g);else this.hitCore(false,'Лазер: щит не перекрыл предупреждающий луч',g.angle);this.effects.push({type:'laser',angle:g.angle,r:g.radius,life:.25,max:.25});}
  }
  const current=this.projectiles.slice();
  for(const p of current){if(!p.active)continue;p.age+=dt;if(p.age>12){p.active=false;continue;}p.trail.push({x:p.x,y:p.y});if(p.trail.length>6)p.trail.shift();
   if(p.friendly){
    const target=this.enemies.find(e=>e.id===p.target&&!e.dead);if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);p.x+=Math.cos(p.angle)*430*dt;p.y+=Math.sin(p.angle)*430*dt;
    if(Math.hypot(p.x,p.y)>375){p.active=false;continue;}
    for(const e of this.enemies.slice()){if(e.dead||p.hit.includes(e.id))continue;if(Math.hypot(p.x-e.x,p.y-e.y)<e.size+7){p.hit.push(e.id);this.damageEnemy(e,p.damage);if(!p.auto)this.onProjectileHit(p,e);p.pierce--;const onward=this.enemies.filter(q=>!q.dead&&!p.hit.includes(q.id)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];p.target=onward?.id;if(p.pierce<=0){p.active=false;break;}}}
   }else{
    if(p.group.cancelled){p.active=false;continue;}
    const oldR=p.r;p.r-=p.speed*(p.r<=130?1-p.slow:1)*dt;
    const a=p.finalAngle-p.curve*clamp((p.r-65)/(p.originRadius-65),0,1);p.angle=a;Object.assign(p,pos(a,p.r));
    if(oldR>65&&p.r<=65){const g=p.group;g.perfect=p.track.trackedAt!==null&&this.time-p.track.trackedAt<=.12&&this.covers(p.angle);if(this.covers(p.angle)){this.reflect(p,g);p.active=false;continue;}p.miss=this.missInfo(p.angle);this.captureReplay();}
    if(p.r<26){p.active=false;this.hitCore(p.suppress,p.suppress?'Подавитель: атака прошла мимо щита':'Снаряд прошёл через незащищённую сторону ядра',p.angle,p.miss);}
   }
  }
  if(this.suppressed<=0){
   if(this.u('turret')){this.autoTimer+=dt;if(this.autoTimer>=5-(this.u('turret')-1)*.6){this.autoTimer=0;this.autoShot(.55);}}
   if(this.u('drone')||this.m('satellite')){this.droneTimer+=dt;const period=this.u('drone')?6-(this.u('drone')-1)*.7:9;if(this.droneTimer>=period){this.droneTimer=0;this.autoShot(.7);}}
   if(this.u('aura')){this.auraTimer+=dt;if(this.auraTimer>=4){this.auraTimer=0;for(const e of this.enemies.filter(e=>!e.dead).slice(0,2)){this.damageEnemy(e,.35*this.u('aura'));this.effects.push({type:'chain',x:0,y:0,x2:e.x,y2:e.y,life:.25,max:.25});}}}
  }
  this.projectiles=this.projectiles.filter(p=>p.active);this.enemies=this.enemies.filter(e=>!e.dead);this.groups=this.groups.filter(g=>!g.cancelled&&this.time<g.arrival+.85);this.warnings=this.groups.filter(g=>!g.cancelled&&(!g.fired||g.kind==='laser'&&!g.resolved));
  for(const f of this.effects)f.life-=dt;this.effects=this.effects.filter(f=>f.life>0).slice(-100);
  if(this.energy>=this.threshold&&this.state==='playing'){this.energy-=this.threshold;this.level++;this.offer();}
 }
 autoShot(damage){const e=this.enemies.find(e=>!e.dead);if(e)this.launchFriendly(e.angle,damage,e.id,{auto:true});}
 onProjectileHit(p,e){
  const cascade=1+.12*this.m('cascade');
  if(this.u('chain')){let from=e;const hit=[...p.hit];for(let i=0;i<this.u('chain');i++){const next=this.enemies.filter(q=>!q.dead&&!hit.includes(q.id)).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];if(!next)break;hit.push(next.id);const crit=!p.crit&&this.rng()<this.u('crit')*.18;this.damageEnemy(next,p.damage*.7*cascade*(crit?3:1));this.effects.push({type:'chain',x:from.x,y:from.y,x2:next.x,y2:next.y,life:.25,max:.25});from=next;}}
  if(this.u('blast')){const r=45+(this.u('blast')-1)*15;for(const q of this.enemies.slice())if(q.id!==e.id&&!q.dead&&Math.hypot(q.x-e.x,q.y-e.y)<=r)this.damageEnemy(q,p.damage*.65*cascade);this.effects.push({type:'blast',x:e.x,y:e.y,r,life:.4,max:.4});}
 }
 result(){return{id:this.id,balance:BALANCE,core:this.core,time:Math.floor(this.time),score:Math.floor(this.score),kills:this.kills,bosses:this.bossKills,combo:this.bestCombo,perfect:this.perfects,perfectCombo:this.bestPerfectCombo,wave:this.wave,date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Vladivostok'})};}
 settle(){
  if(this.state!=='dead'||this.rewarded||this.save.settled.includes(this.id))return null;this.rewarded=true;const s=this.save,r=this.result(),old={...(s.currentBests[this.mode]||{})};
  // No reward for an immediate exit. One settlement per run; output is bounded by actual simulated play time.
  const base=this.time<8?0:Math.floor(12+this.time*.42+Math.min(this.kills,this.time*2)*.5+this.bossKills*15);
  const multiplier=(1+.1*this.m('shards'))*(this.mode==='horizon'?1.8:this.mode==='challenge'?1.4+.15*this.m('challenge'):1);
  const shards=Math.min(10000,Math.round(base*multiplier));s.shards+=shards;s.settled.push(this.id);s.settled=s.settled.slice(-30);
  s.totals.runs++;s.totals.kills+=this.kills;s.totals.bosses+=this.bossKills;s.totals.blocks+=this.blocks;s.totals.perfect+=this.perfects;s.totals.time=Math.max(s.totals.time,r.time);s.totals.combo=Math.max(s.totals.combo,r.combo);
  for(const id of this.clearedBosses)if(!s.bosses.includes(id))s.bosses.push(id);
  if((s.totals.time>=60||s.bosses.length)&&!s.modes.includes('challenge'))s.modes.push('challenge');
  const best=s.currentBests[this.mode]||(s.currentBests[this.mode]={});const all=s.bests[this.mode]||(s.bests[this.mode]={});const newRecords=[];for(const key of ['time','score','combo','perfectCombo','kills','bosses','wave']){all[key]=Math.max(all[key]||0,r[key]);if(r[key]>(best[key]||0)){newRecords.push(key);best[key]=r[key];}}
  s.records[this.mode].push(r);s.records[this.mode].sort((a,b)=>b.score-a.score);s.records[this.mode]=s.records[this.mode].slice(0,10);
  const unlocked=claimAchievements(s);return{...r,shards,achievementShards:unlocked.reduce((n,a)=>n+a.reward,0),unlocked,newRecords,old};
 }
}
function claimAchievements(s){const unlocked=[];for(const a of D.achievements)if(!s.achievements.includes(a.id)&&a.test(s)){s.achievements.push(a.id);s.shards+=a.reward;unlocked.push(a);}return unlocked;}
function purchase(s,id){const t=D.tech.find(t=>t.id===id);if(!t)return false;const lv=s.tech[id]||0,price=D.cost(t,lv);if(lv>=t.max||s.shards<price)return false;s.shards-=price;s.tech[id]=lv+1;return true;}
function canPrestige(s){return s.bosses.length>=4&&Object.values(s.tech).reduce((a,b)=>a+b,0)>=12;}
function prestige(s){if(!canPrestige(s))return false;const gain=3+Math.floor(Object.values(s.tech).reduce((a,b)=>a+b,0)/10);s.prestige++;s.rare+=gain;s.tech={};s.shards=0;claimAchievements(s);return gain;}
function purchasePrestige(s,id){const t=D.prestigeTech.find(t=>t.id===id);if(!t)return false;const level=s.prestigeTech[id]||0,price=t.cost+level;if(level>=t.max||s.rare<price)return false;s.rare-=price;s.prestigeTech[id]=level+1;if(id==='void'&&!s.modes.includes('horizon'))s.modes.push('horizon');return true;}
const api={BALANCE,Engine,SaveStore,freshSave,validateSave,claimAchievements,purchase,canPrestige,prestige,purchasePrestige,clamp,angleDiff,pos,random,RAD,TAU};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoreEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
