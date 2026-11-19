/* Pure simulation: no DOM, audio, timers, or networking. */
(function(root){
'use strict';
const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.CoreData;
const BALANCE='1.15';
const TAU=Math.PI*2, RAD=Math.PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const pos=(a,r)=>({x:Math.cos(a)*r,y:Math.sin(a)*r});
// A shared polar track keeps simulation and arena geometry in agreement.
function orbitInstability(time){const x=clamp((time-120)/480,0,1);return x*x*(3-2*x);}
function orbitRadius(angle,time,base=265){const cycle=((time%48)+48)%48,blend=cycle>10&&cycle<38?Math.sin((cycle-10)/28*Math.PI)**2:0,rotation=time*.065;const depth=orbitInstability(time),fold=angle-rotation;const breathing=.8+.2*Math.sin(time*Math.PI/24)**2;return base+depth*breathing*(32*Math.cos(2*fold)+16*Math.sin(3*fold)) +(1-depth)*blend*(1+Math.min(1.25,Math.max(0,time)/240))*(18*Math.cos(2*(angle-rotation))+6*Math.sin(3*(angle+rotation*.6)));}
function random(seed){let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
function dailyKey(date=new Date()){return date.toISOString().slice(0,10);}
function dailySeed(key){let hash=2166136261;for(const ch of key)hash=Math.imul(hash^ch.charCodeAt(0),16777619);return hash>>>0;}
function freshSave(){return{version:4,dailyRecords:{},shards:0,rare:0,prestige:0,prestigeTech:{},tech:{},achievements:[],bosses:[],seenBosses:[],modes:['classic','skill'],records:{classic:[],skill:[],challenge:[],horizon:[]},bests:{},currentBalance:BALANCE,currentBests:{},recordsArchive:{classic:[],skill:[],challenge:[],horizon:[]},totals:{runs:0,kills:0,bosses:0,perfect:0,blocks:0,time:0,combo:0},settings:{sfx:.55,music:.16,reduced:false,language:'en',deadzone:.22,core:'standard',contract:'none'},settled:[]};}
function validateSave(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||![1,2,3,4].includes(value.version))throw Error('Неподдерживаемая версия сохранения.');
 const s=freshSave(), integer=(v,max=1e9)=>Number.isFinite(v)&&v>=0?Math.min(max,Math.floor(v)):0;
 for(const key of Object.keys(value.dailyRecords||{}).filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-7)){const row=value.dailyRecords[key];if(row&&typeof row==='object')s.dailyRecords[key]={score:integer(row.score),time:integer(row.time,86400),attempts:integer(row.attempts)};}
 s.shards=integer(value.shards,1e7);s.rare=integer(value.rare,1e4);s.prestige=integer(value.prestige,1e4);
 for(const t of D.tech)s.tech[t.id]=integer(value.tech?.[t.id],t.max);
 for(const t of D.prestigeTech)s.prestigeTech[t.id]=integer(value.prestigeTech?.[t.id],t.max);
 s.achievements=D.achievements.filter(x=>value.achievements?.includes(x.id)).map(x=>x.id);
 s.bosses=D.bosses.filter(x=>value.bosses?.includes(x.id)).map(x=>x.id);
 s.seenBosses=D.bosses.filter(x=>value.seenBosses?.includes(x.id)||s.bosses.includes(x.id)).map(x=>x.id);
 s.settings.contract=D.contracts.some(x=>x.id===value.settings?.contract)?value.settings.contract:'none';
 s.modes=['classic','skill'];if(value.modes?.includes('challenge'))s.modes.push('challenge');if(s.prestigeTech.void)s.modes.push('horizon');
 for(const key of Object.keys(s.totals))s.totals[key]=integer(value.totals?.[key]);
 for(const mode of Object.keys(s.records)){
  const rows=Array.isArray(value.records?.[mode])?value.records[mode]:[];
  s.records[mode]=rows.slice(0,10).filter(r=>r&&typeof r==='object').map(r=>({time:integer(r.time,86400),score:integer(r.score),kills:integer(r.kills),bosses:integer(r.bosses),combo:integer(r.combo),perfect:integer(r.perfect),perfectCombo:integer(r.perfectCombo),wave:integer(r.wave,6000),date:typeof r.date==='string'?r.date.slice(0,10):'',id:typeof r.id==='string'?r.id.slice(0,70):''}));
  const best=value.bests?.[mode]||{};s.bests[mode]={};for(const key of ['time','score','kills','bosses','combo','perfectCombo','wave'])s.bests[mode][key]=integer(best[key]);
 }
 s.currentBalance=BALANCE;
 for(const mode of Object.keys(s.records)){const oldRows=Array.isArray(value.recordsArchive?.[mode])?value.recordsArchive[mode]:[];const clean=rows=>rows.filter(r=>r&&typeof r==='object').map(r=>({...r,time:integer(r.time,86400),score:integer(r.score),kills:integer(r.kills),bosses:integer(r.bosses),combo:integer(r.combo),perfect:integer(r.perfect),perfectCombo:integer(r.perfectCombo),wave:integer(r.wave),date:typeof r.date==='string'?r.date.slice(0,10):'',id:typeof r.id==='string'?r.id.slice(0,70):'',tactic:D.tactics.some(t=>t.id===r.tactic)?r.tactic:'',balance:typeof r.balance==='string'?r.balance.slice(0,12):'legacy',core:['standard','mirror','storm','bastion'].includes(r.core)?r.core:'unknown'}));const source=clean(Array.isArray(value.records?.[mode])?value.records[mode]:[]);s.records[mode]=source.filter(r=>r.balance===BALANCE).slice(0,10);s.recordsArchive[mode]=clean(oldRows).concat(source.filter(r=>r.balance!==BALANCE));const b=value.currentBalance===BALANCE?value.currentBests?.[mode]:null;s.currentBests[mode]={};for(const key of ['time','score','kills','bosses','combo','perfectCombo','wave'])s.currentBests[mode][key]=integer(b?.[key]);for(const r of s.records[mode])for(const key of Object.keys(s.currentBests[mode]))s.currentBests[mode][key]=Math.max(s.currentBests[mode][key],r[key]||0);}
 s.settings.deadzone=Number.isFinite(value.settings?.deadzone)?clamp(value.settings.deadzone,.1,.4):.22;
 s.settings.sfx=typeof value.settings?.sfx==='number'?clamp(value.settings.sfx,0,1):.55;
 s.settings.music=typeof value.settings?.music==='number'?clamp(value.settings.music,0,1):.16;
 s.settings.reduced=Boolean(value.settings?.reduced);
 s.settings.language=['ru','en','zh-CN','tr'].includes(value.settings?.language)?value.settings.language:'en';s.settings.core=['mirror','storm','bastion'].includes(value.settings?.core)?value.settings.core:'standard';
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
 constructor(save=freshSave(),options={}){this.save=save;this.training=options.training&&Number.isInteger(options.training.boss)&&options.training.boss>=0&&options.training.boss<4?{boss:options.training.boss,phase:clamp(Math.floor(options.training.phase)||0,0,3)}:null;this.daily=!this.training&&typeof options.daily==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(options.daily)?options.daily:null;this.mode=this.training||this.daily?'skill':options.mode||'classic';this.victory=false;this.endless=false;this.holdTime=0;this.damageTaken={};this.damageBy={};this.encounter=null;this.encounterResults=[];this.nextEncounter=32;this.encounterIndex=0;this.route='standard';this.routeCredit=0;this.spec={};this.tactic=null;this.tacticGuardCooldown=0;this.pendingSpec=null;this.overloads=0;this.contract=this.training||this.daily?'none':(D.contracts.find(x=>x.id===save.settings.contract)?.id||'none');this.contractDone=false;this.rng=random(this.daily?dailySeed(this.daily):options.seed??Date.now());this.events=[];this.state='playing';this.time=0;this.score=0;this.wave=1;this.hp=3;this.level=1;this.energy=0;this.combo=0;this.bestCombo=0;this.perfectCombo=0;this.bestPerfectCombo=0;this.perfects=0;this.blocks=0;this.kills=0;this.bossKills=0;this.angle=-Math.PI/2;this.target=this.angle;this.rotation=0;this.invuln=0;this.barrier=0;this.suppressed=0;this.bounty=0;this.hitCount=0;this.up={};this.enemies=[];this.projectiles=[];this.warnings=[];this.effects=[];this.groups=[];this.choices=[];this.clearedBosses=[];this.nextSpawn=1.3;this.nextAttack=2.2;this.nextBoss=60;this.lastArrival=0;this.lastAttackAngle=this.angle;this.nextId=0;this.autoTimer=0;this.droneTimer=0;this.auraTimer=0;this.emergencyUsed=false;this.reviveUsed=false;this.boss=null;this.bossIndex=0;this.pendingLevels=0;this.rewarded=false;this.deathReason='';this.meta=this.mode==='skill'?{}:save.tech||{};this.pt=this.mode==='skill'?{}:save.prestigeTech||{};this.rerolls=this.m('choices');this.maxHp=Math.min(5,3+this.m('hp'));this.hp=this.maxHp;this.energy=this.m('initial')*10+(this.pt.memory||0)*5;this.id=options.id||('run-'+Date.now().toString(36)+'-'+Math.floor(this.rng()*1e9).toString(36));this.difficulty=this.mode==='horizon'?1.35:this.mode==='challenge'?1.16+this.m('challenge')*.05:1;this.core=this.mode==='skill'?'standard':(options.core||save.settings.core||'standard');this.overloadCooldown=0;this.replay=[];this.replayAt=0;this.lastHit=null;if(this.core==='storm')this.up.chain=1;this.challengeTitle=this.mode==='horizon'?'Горизонт событий':this.mode==='challenge'?'Разогнанный реактор':'';if(this.training){this.nextSpawn=Infinity;this.nextBoss=Infinity;this.addBoss(this.training.boss);}}
 get overloadCost(){return (this.tactic==='volley'?30:20)-2*this.m('pulse_link');}
 get overloadPeriod(){return this.tactic==='volley'?10:8;}
 overload(){if(this.state!=='playing'||this.energy<this.overloadCost||this.overloadCooldown>0)return false;this.energy-=this.overloadCost;this.overloads++;if(this.u('shock'))this.areaDamage(.3*this.u('shock'));this.overloadCooldown=this.overloadPeriod;for(const p of this.projectiles)if(!p.friendly&&p.r<=140)p.active=false;if(this.tactic==='volley'){const targets=this.enemies.filter(e=>!e.dead).sort((a,b)=>Math.abs(angleDiff(a.angle,this.angle))-Math.abs(angleDiff(b.angle,this.angle))).slice(0,3);for(const e of targets)this.launchFriendly(e.angle,1.2,e.id,{auto:true,tactic:true});}this.effects.push({type:'pulse',r:140,life:.5,max:.5});this.emit('pulse');return true;}
 assembledBuilds(extra){if(this.daily)return [];const level=id=>this.u(id)+(id===extra?1:0);return [
  {id:'storm',name:'Грозовая сеть',desc:'Дуговой разряд 2 + Критическая масса: ещё одна цель цепи с 65% обычного урона разряда.',active:level('chain')>=2&&level('crit')>=1},
  {id:'cascade',name:'Взрывной каскад',desc:'Нестабильная материя 2 + Фазовый пробой: радиус взрывов +12 ед.',active:level('blast')>=2&&level('pierce')>=1},
  {id:'fortress',name:'Зеркальная крепость',desc:'Зеркальный барьер 2 + Резонанс серии: каждое третье идеальное отражение подряд даёт ещё 0,35 с барьера.',active:level('barrier')>=2&&level('pcombo')>=1}
 ].filter(x=>x.active);}
 hasAssembly(id){return this.assembledBuilds().some(x=>x.id===id);}
 deepBossAttack(e){
  const pending=this.groups.filter(g=>!g.cancelled&&!g.resolved&&g.arrival>this.time).length;
  if(pending>1||this.time<(e.deepAttackAt||0)||this.time<(e.phaseGuardUntil||0))return;
  e.deepAttackAt=this.time+2.8;e.attackCycle=(e.attackCycle||0)+1;
  const direction=e.attackCycle%2?1:-1,phase=e.phase,base=e.angle;
  if(e.spec===0){
   e.pattern='Перекрёстный захват';
   this.schedule(e,'laser',{angle:base+direction*.85,windup:1.4});
   this.schedule(e,'shot',{angle:base-direction*1.1,burst:phase===3?2:1,speed:175,windup:1.35});
  }else if(e.spec===1){
   e.pattern='Смена секций';e.sections=Math.max(1,4-phase);
   this.schedule(e,'shot',{angle:base+direction*.7,fan:3,speed:160,windup:1.4});
   this.schedule(e,'shot',{angle:base-direction*.9,curve:direction*.35,speed:150,windup:1.5});
  }else if(e.spec===2){
   e.pattern='Ложный фронт';this.effects.push({type:'feint',angle:base+direction*1.4,life:1.4,max:1.4});
   this.schedule(e,phase===3?'laser':'shot',{angle:base-direction*.65,windup:1.6,speed:175});
   this.schedule(e,'shot',{angle:base+direction*.45,curve:-direction*.3,speed:150,windup:1.65});
  }else{
   e.pattern=['Сжатие контура','Разрыв оболочки','Последний рубеж'][phase-1];
   this.schedule(e,'shot',{angle:base-direction*.85,curve:direction*.5,speed:150,windup:1.5});
   this.schedule(e,phase>=2?'laser':'shot',{angle:base+direction*.85,speed:160,windup:1.65});
   if(phase===3)this.schedule(e,'shot',{angle:base,fan:3,speed:155,windup:1.8});
  }
 }

 synergies(extra){const has=id=>this.u(id)>0||id===extra;return [{ids:['chain','crit'],name:'Грозовой резонанс',desc:'Цепные разряды могут наносить критический урон.'},{ids:['blast','pierce'],name:'Каскад взрывов',desc:'Каждое пробитое попадание создаёт взрыв.'},{ids:['double','damage'],name:'Зеркальный каскад',desc:'Эхо наследует усиленный урон отражения.'},{ids:['barrier','pcombo'],name:'Безупречный контур',desc:'Идеальные серии одновременно дают энергию и барьер.'}].filter(x=>x.ids.every(has));}
 captureReplay(){this.replay.push({time:this.time,angle:this.angle,width:this.width,secondary:this.secondary,barrier:this.barrier,invuln:this.invuln,hp:this.hp,bullets:this.projectiles.filter(p=>!p.friendly&&p.active).slice(0,35).map(p=>({x:p.x,y:p.y})),feints:this.effects.filter(f=>f.type==='feint').map(f=>f.angle),beams:this.groups.filter(g=>g.kind==='laser'&&!g.resolved).map(g=>g.angle)});this.replay=this.replay.filter(f=>this.time-f.time<=1.8);}
 m(id){return this.meta[id]||0;} u(id){return this.up[id]||0;}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){return this.events.splice(0);}
 get width(){return Math.min(105,55+4*this.m('kinetic_link')+(this.tactic==='mobile'?-8:0)+(this.spec.wide==='shelter'?10:this.spec.wide==='agile'?-8:0)+(this.core==='bastion'?10:0)+this.m('width')*4+this.u('wide')*8)*RAD;}
 get turnSpeed(){return (540+this.m('rotation')*30+this.u('turn')*65+(this.spec.wide==='agile'?90:0))*RAD*(this.spec.wide==='shelter'?.88:1)*(this.core==='bastion'?.82:1)*(this.suppressed>0?.7:1)*(this.tactic==='mobile'?1.15:1)*(this.combo>=8?1+.08*this.u('momentum'):1);}
 get damage(){return (1+this.m('reflect')*.15+this.u('damage')*.6)*(this.core==='storm'?.8:this.core==='mirror'?.9:1);}
 get threshold(){return Math.round((36+(this.level-1)*15)*Math.max(.76,1-this.u('learn')*.08));}
 get secondary(){return (this.m('arc')*12+this.u('segment')*18)*RAD;}
 covers(a,angle=this.angle){const d=Math.abs(angleDiff(a,angle));return d<=this.width/2||(this.secondary>0&&Math.abs(Math.PI-d)<=this.secondary/2);}
 orbitSpeed(e){
  if(e.type==='boss')return [.16,-.22,.30,-.24][e.spec]*(1+.15*((e.phase||1)-1));
  const progress=clamp((this.time-18)/90,0,1),acceleration=1+clamp((this.time-108)/240,0,.6),direction=e.id%2===0?-1:1;
  if(e.type==='orbital')return direction*(.24+.1*progress)*acceleration;
  const rates={shooter:.16,gunner:.13,sniper:.11,shotgun:.15,laser:.1,splitter:.17,suppressor:.14};
  return direction*(rates[e.type]||.14)*(.25+.75*progress)*acceleration;
 }
 addEnemy(type,angle,r=265){const spec=D.enemies.find(x=>x.id===type)||D.enemies[0];const e={id:++this.nextId,type:spec.id,angle,r:orbitRadius(angle,this.time,r),orbitBase:r,hp:spec.hp,maxHp:spec.hp,size:13,born:this.time,cool:0,...pos(angle,orbitRadius(angle,this.time,r))};if(this.encounter&&this.time<this.encounter.until&&this.encounter.index<2&&(this.encounter.index===0?['gunner','shooter'].includes(e.type):e.type==='healer'))e.encounterTarget=this.encounter.id;this.enemies.push(e);this.emit('spawn',{enemy:type});return e;}
 addBoss(index=this.bossIndex){this.finishEncounter();const spec=D.bosses[index%4],cycle=Math.floor(index/4);this.projectiles=this.projectiles.filter(p=>p.friendly);this.warnings=[];this.groups=[];this.lastArrival=this.time;this.enemies=[];const e={id:++this.nextId,type:'boss',spec:index%4,angle:-Math.PI/2,r:248,orbitBase:248,hp:spec.hp*(1+cycle*.35),maxHp:spec.hp*(1+cycle*.35),size:30,born:this.time,cool:0,sections:3,phase:1,...pos(-Math.PI/2,248)};e.cycle=cycle;e.final=index===7&&!this.training&&!this.daily;e.deep=cycle>=1&&!this.training&&!this.daily;if(e.final)e.phaseGuardUntil=this.time+3.5;this.enemies.push(e);this.route='standard';this.bossOverloads=this.overloads;this.boss=e;if(this.training?.phase){e.phase=this.training.phase;e.sections=4-e.phase;}e.r=orbitRadius(e.angle,this.time,e.orbitBase);Object.assign(e,pos(e.angle,e.r));this.nextAttack=this.time+(e.final?3.5:1.6);this.emit('boss',{name:spec.name,index:index%4});return e;}
 schedule(e,kind='shot',options={}){
  if(!e||this.groups.length>9)return null;
  const angle=options.angle??(e.angle+(e.type==='boss'&&e.spec!==0?(e.attackCycle%2?1.05:-1.05):0)),spec=D.enemies.find(x=>x.id===e.type)||D.enemies[0],speed=(options.speed||spec.speed||150)*(this.mode==='horizon'?1.15:this.mode==='challenge'?1.1:1)*(this.route==='overheat'?1.18:this.route==='focus'?1.10:1);
  const slow=Math.min(.45,this.u('slow')*.15)+(this.singularityGift?.1:0);
  const travel=kind==='laser'?0:Math.max(0,(e.r-130))/speed+65/(speed*(1-slow));
  const relayed=this.enemies.some(q=>!q.dead&&q.type==='relay'&&q.link===e.id);
  const windup=Math.max(.65,(options.windup??(e.type==='sniper'?1.6:kind==='laser'?1.4:1.1))/(relayed?1.15:1));
  const pressure=e.type==='boss'&&e.spec===0;
  const gap=options.sameGroup?.12:pressure?[.24,.21,.19][e.phase-1]:Math.max(.17,.63-Math.max(0,this.time-10)*.008)/this.difficulty;
  // Guardian has a tighter rhythm, still below the player's turn speed and with reaction time reserved.
  const rotationBudget=Math.min((pressure||this.time>=18?420:300)*RAD,this.turnSpeed*.8);
  const separation=gap+Math.abs(angleDiff(angle,this.lastAttackAngle))/rotationBudget;
  const arrival=Math.max(this.time+windup+travel,this.lastArrival+separation);
  this.lastArrival=arrival;this.lastAttackAngle=angle;
  // Aim follows its owner until the final half-second lock; released shots keep their direction.
  const g={id:++this.nextId,owner:e.id,kind,angle,aimOffset:angle-e.angle,locked:false,gap,rotationBudget,radius:e.r,arrival,launch:arrival-travel,created:this.time,speed,slow,fired:false,burst:options.burst||1,fan:options.fan||0,curve:options.curve||0,damage:1,suppress:e.type==='suppressor',trackedAt:null,aligned:false,perfect:false};
  g.attacker={type:e.type,boss:e.spec,fragment:Boolean(e.fragment)};
  if(kind==='laser'||e.type==='sniper')this.emit('warning',{enemy:e.type,kind});
  g.tracks=Array.from({length:g.fan||g.burst},(_,i)=>({angle:angle+(i-((g.fan||g.burst)-1)/2)*(g.fan?10:4)*RAD,aligned:false,trackedAt:null}));this.groups.push(g);this.warnings.push(g);return g;
 }
 attack(e){
  if(e.type==='boss')return this.bossAttack(e);
  if(e.type==='gunner')for(let i=0;i<3;i++)this.schedule(e,'shot',{sameGroup:i>0});
  else this.schedule(e,e.type==='laser'?'laser':'shot',{fan:e.type==='shotgun'?3:0,...(this.route==='drift'&&e.type!=='shotgun'?{angle:e.angle+(e.id%2?.55:-.55),windup:1.35}:{})});
  e.cool=this.time+(this.time<18?3:2.2);
 }
 bossAttack(e){
  if(e.deep){e.phase=1+Number(e.hp<e.maxHp*.67)+Number(e.hp<e.maxHp*.34);return this.deepBossAttack(e);}
  if(!this.training&&this.time>=(e.adaptAt||e.born+8)&&(this.holdTime>=6||this.overloads-this.bossOverloads>=2)){e.adaptAt=this.time+12;const pressure=this.overloads-this.bossOverloads>=2;e.adaptation=pressure?'Дальний перехват':'Смена фронта';this.emit('adaptation',{name:e.adaptation});this.schedule(e,'shot',{angle:this.angle+(pressure?1.2:Math.PI),speed:pressure?125:165,windup:1.6});return;}
  if(e.spec!==0)e.attackCycle=(e.attackCycle||0)+1;const def=D.bosses[e.spec];e.phase=this.training?.phase||1+Number(e.hp<e.maxHp*.67)+Number(e.hp<e.maxHp*.34);
  if(def.id==='guardian'){
   this.guardianAttack(e);
  }else if(def.id==='hydra'){
   const remaining=this.training?.phase?4-this.training.phase:Math.max(1,Math.ceil(e.hp/(e.maxHp/3)));if(remaining<e.sections){e.sections=remaining;this.emit('section',{remaining});}
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
 updateAim(){let previous=null;for(const g of this.groups){if(g.cancelled)continue;if(!g.fired){const owner=this.enemies.find(e=>e.id===g.owner&&!e.dead);if(!owner){g.cancelled=true;continue;}if(!g.locked){g.angle=owner.angle+g.aimOffset;g.radius=owner.r;const travel=g.kind==='laser'?0:Math.max(0,g.radius-130)/g.speed+65/(g.speed*(1-g.slow));g.launch=g.arrival-travel;for(let i=0;i<g.tracks.length;i++){const track=g.tracks[i];track.angle=g.angle+(i-(g.tracks.length-1)/2)*(g.fan?10:4)*RAD;track.trackedAt=null;}}
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
 gainEnergy(n){this.energy+=n*(this.time>=18?.82:1)*(1+(this.pt.prism||0)*.05)*(this.bounty>0?1+.25*this.u('bounty'):1);if(this.training)this.energy=Math.min(100,this.energy);}
 reflect(p,g){
  const perfect=Boolean(g.perfect);this.blocks++;this.combo++;this.bestCombo=Math.max(this.combo,this.bestCombo);
  this.perfectCombo=perfect?this.perfectCombo+1:0;this.bestPerfectCombo=Math.max(this.bestPerfectCombo,this.perfectCombo);if(perfect)this.perfects++;if(this.contract==='perfect'&&this.perfectCombo>=3)this.contractDone=true;const owner=this.enemies.find(e=>e.id===g.owner);if(owner?.type==='boss'){owner.seriesBlocks=(owner.seriesBlocks||0)+1;if(perfect||owner.seriesBlocks%4===0)owner.vulnerableUntil=Math.max(owner.vulnerableUntil||0,this.time+(perfect?2.1:.65));}
  const multi=Math.min(5,1+Math.floor(this.combo/8)*.25+this.perfectCombo*.1);
  this.score+=Math.round((perfect?70:25)*multi*(this.bounty>0?1.5:1));
  this.gainEnergy((perfect?12:6)*(1+.25*this.u('energy')+.1*this.m('charge'))+(perfect?Math.min(5,this.perfectCombo)*this.u('pcombo')*2+2*this.m('feedback_link'):0));
  if(!g.routeBonusPaid&&((this.route==='focus'&&perfect)||(this.route==='drift'&&Math.abs(this.rotation)>90*RAD))){g.routeBonusPaid=true;this.gainEnergy(this.route==='focus'?5:3);}
  if(this.hasAssembly('fortress')&&perfect&&this.perfectCombo%3===0)this.barrier=Math.max(this.barrier,this.u('barrier')*.6+.35);
  if(this.u('capacitor')&&this.blocks%8===0)this.gainEnergy(4*this.u('capacitor'));if(this.u('rebuild')&&this.blocks%40===0&&(this.repairsUsed||0)<2&&this.hp<this.maxHp){this.hp++;this.repairsUsed=(this.repairsUsed||0)+1;}
  if(perfect&&(this.u('barrier')||this.phantomGift))this.barrier=Math.max(this.barrier,this.u('barrier')*.6+(this.phantomGift?.5:0));
  if(this.tactic==='mobile'&&Math.abs(this.rotation)>90*RAD&&this.tacticGuardCooldown<=0){this.barrier=Math.max(this.barrier,.25);this.tacticGuardCooldown=3;this.emit('tacticGuard');}
  const crit=this.rng()<this.u('crit')*.18;
  const damage=this.damage*(this.blocks%6===0?1+.3*this.u('charged'):1)*(this.tactic==='precision'?(perfect?1.35:.85):1)*(this.spec.pierce==='seeker'?.85:1)*(perfect&&this.core==='mirror'?1.25:1)*(perfect?2*(1+.15*this.m('perfect')):1)*(crit?3:1);
  this.launchFriendly(p.angle,damage,g.owner,{pierce:this.u('pierce')+1+(this.spec.pierce==='seeker'?1:this.spec.pierce==='hunter'?-1:0),crit});
  const echoes=(this.spec.double==='lance'?1:this.u('double')+(this.spec.double==='swarm'?2:0))+(this.hydraGift?1:0);for(let i=0;i<echoes;i++)this.launchFriendly(p.angle+.12*(i+1),damage*(this.spec.double==='swarm'?.3:this.spec.double==='lance'?.95:.45),null,{pierce:1,crit});
  this.effects.push({type:perfect?'perfect':'block',...pos(p.angle,65),angle:p.angle,life:perfect?.55:.3,max:perfect?.55:.3});
  this.advanceEncounter('block');this.emit(perfect?'perfect':'block',{combo:this.combo});
  if(this.u('pulse')&&this.blocks%8===0){this.projectiles=this.projectiles.filter(q=>q.friendly);for(const w of this.groups)if(w.fired)w.cancelled=true;this.areaDamage(1.5*this.u('pulse')*(1+.25*this.m('legend')));this.effects.push({type:'pulse',life:1,max:1});this.emit('pulse');}
 }
 launchFriendly(a,damage,target,opts={}){const targetEnemy=this.enemies.find(e=>e.id===target)||this.enemies.reduce((best,e)=>!best||Math.abs(angleDiff(e.angle,a))<Math.abs(angleDiff(best.angle,a))?e:best,null);const v=pos(a,68);this.projectiles.push({id:++this.nextId,friendly:true,active:true,x:v.x,y:v.y,angle:a,damage,target:targetEnemy?.id,age:0,trail:[],hit:[],pierce:opts.pierce||1,crit:opts.crit||false,auto:opts.auto||false,tactic:opts.tactic||false});}
 hitCore(suppress=false,reason='Снаряд прошёл мимо щита',attackAngle,miss,attacker){
  if(this.invuln>0||this.barrier>0)return;
  this.hitCount++;
  if((this.u('armor')&&this.hitCount%(6-this.u('armor'))===0)||(this.m('plate')&&this.hitCount%(9-this.m('plate'))===0)){this.barrier=.4;this.emit('armor');return;}
  this.lastHit=miss||this.missInfo(Number.isFinite(attackAngle)?attackAngle:this.angle+Math.PI);this.hp--;const source=reason.includes('Лазер')?'laser':suppress?'suppressor':'projectile';this.damageTaken[source]=(this.damageTaken[source]||0)+1;this.combo=0;this.perfectCombo=0;this.invuln=.7+.1*this.m('grace');if(suppress){this.suppressed=3-.5*this.u('insulate');this.emit('suppress');}
  if(this.encounter?.index===2&&!this.encounter.done)this.encounter.failed=true;this.emit('hurt',{hp:this.hp});this.effects.push({type:'hurt',life:.5,max:.5});
  const boss=this.hp<=0&&this.boss?{index:this.boss.spec,phase:this.boss.phase}:null;
  if(this.u('revenge'))this.areaDamage(1.5*this.u('revenge'));
  if(this.hp===1&&this.m('emergency')&&!this.emergencyUsed){this.emergencyUsed=true;this.barrier=2;this.emit('emergency');}
  if(this.hp<=0&&this.m('revive')&&!this.reviveUsed){this.reviveUsed=true;this.hp=1;this.barrier=2;this.emit('revive');}
  if(this.hp<=0){this.hp=0;this.state='dead';this.deathReason=reason;this.deathCause={source,attacker,boss};this.emit('death');}this.captureReplay();
 }
 missInfo(angle){const late=Math.abs(angleDiff(this.target,angle))<=this.width/2;const fake=this.effects.some(f=>f.type==='feint'&&Math.abs(angleDiff(f.angle,this.angle))<this.width/2);return {angle,shield:this.angle,width:this.width,secondary:this.secondary,time:this.time,hint:fake?'Вы защищали ложный луч. Пунктир с меткой ЭХО безопасен.':late?'Щит не успел повернуться. Начинайте поворот раньше.':'Вы защищали другое направление. Следите за ближайшим ударом.'};}
 areaDamage(n){for(const e of this.enemies.slice())this.damageEnemy(e,n,'automation');}
 damageEnemy(e,n,source='reflection'){if(e.dead||e.final&&this.time<(e.phaseGuardUntil||0))return;const oldHp=e.hp;if(e.type==='boss'&&source==='reflection')n*=1+.1*this.u('breaker');if(e.type==='boss'&&this.spec.pierce==='hunter')n*=1.2;if(e.type!=='boss'&&this.enemies.some(q=>!q.dead&&q.type==='carrier'&&q.link===e.id))n*=.7;if(e.type==='boss')n*=this.time<(e.vulnerableUntil||0)?1.45:.65;e.hp-=n;if(e.final){for(const ratio of [.67,.34]){const gate=e.maxHp*ratio;if(oldHp>gate&&e.hp<=gate){e.hp=Math.max(e.hp,gate-.001);e.phase=ratio===.67?2:3;e.phaseGuardUntil=this.time+1.3;for(const g of this.groups)if(!g.fired)g.cancelled=true;this.emit('finalPhase',{phase:e.phase});break;}}}this.damageBy[source]=(this.damageBy[source]||0)+Math.max(0,oldHp-Math.max(0,e.hp));this.effects.push({type:'hit',x:e.x,y:e.y,life:.2,max:.2});if(e.hp<=0)this.kill(e);}
 kill(e){
  if(e.dead)return;e.dead=true;if(e.encounterTarget===this.encounter?.id)this.advanceEncounter('target');if(this.training&&e.type==='boss'){this.boss=null;this.trainingVictory=true;this.state='dead';this.deathReason='Тренировка завершена: босс побеждён';this.emit('trainingEnd');return;}if(this.route==='overheat'&&e.type!=='boss')this.routeCredit+=.5*.18;this.kills++;this.score+=e.type==='boss'?1500:100;
  this.gainEnergy((e.type==='boss'?22:4)+this.u('salvage')*3);this.emit('kill',{x:e.x,y:e.y});this.effects.push({type:'destroy',x:e.x,y:e.y,color:(e.type==='boss'?D.bosses[e.spec]:D.enemies.find(d=>d.id===e.type))?.color,boss:e.type==='boss',final:!!e.final,life:e.final?1.4:.6,max:e.final?1.4:.6});
  if(e.type==='splitter')for(const offset of [-.35,.35]){const child=this.addEnemy('shooter',e.angle+offset,e.orbitBase??e.r);child.hp=.5;child.maxHp=.5;child.size=8;child.fragment=true;child.cool=this.time+4;this.schedule(child,'shot',{speed:120,windup:.9});}
  if(e.type==='boss'){
   if(this.contract==='clean'&&this.overloads===this.bossOverloads)this.contractDone=true;this.bossKills++;this.clearedBosses.push(D.bosses[e.spec].id);this.boss=null;this.bossIndex++;this.nextBoss=Math.max(this.nextBoss+60,this.time+20);this.hp=Math.min(this.maxHp,this.hp+this.m('repair'));
   if(e.spec===0){this.maxHp=Math.min(6,this.maxHp+1);this.hp=Math.min(this.maxHp,this.hp+1);}
   if(e.spec===1)this.hydraGift=true;if(e.spec===2)this.phantomGift=true;if(e.spec===3)this.singularityGift=true;
   this.projectiles=this.projectiles.filter(p=>p.friendly);this.groups=[];this.warnings=[];this.lastArrival=this.time;this.emit('bossWin',{index:e.spec,reward:D.bosses[e.spec].reward});if(!this.victory&&this.bossKills>=this.expeditionGoal&&new Set(this.clearedBosses).size===4){this.victory=true;this.state='victory';this.emit('victory');}else{this.state='route';this.emit('route');}
  }
 }
 offer(){
  if(!this.training&&!this.tactic&&this.level===3){this.choices=D.tactics.slice();this.state='upgrade';this.emit('level',{level:this.level});return this.choices;}
  const pool=D.upgrades.filter(u=>this.u(u.id)<u.max&&(u.id!=='heal'||this.hp<this.maxHp));const selected=[];
  const count=Math.min(3,pool.length);for(let i=0;i<count;i++){
   const weights=pool.map(u=>(this.u(u.id)>0?1.35:this.synergies(u.id).length>this.synergies().length?1.5:1)*[8,3,1,.28][u.rarity]*Math.pow(1+this.m('rarity')*.15+this.u('lucky')*.35+(this.route==='interference'?.25:0),u.rarity));let v=this.rng()*weights.reduce((a,b)=>a+b,0),index=0;for(;index<pool.length-1;index++){v-=weights[index];if(v<=0)break;}selected.push(pool.splice(index,1)[0]);
  }
  if(!selected.length){this.choices=[];this.score+=300;this.emit('overflow');return [];}this.choices=selected;this.state='upgrade';this.emit('level',{level:this.level});return selected;
 }
 choose(id){if(this.state!=='upgrade'||!this.choices.some(u=>u.id===id))return false;if(this.choices.some(u=>u.id===id&&u.kind==='tactic')){if(this.training||this.tactic)return false;this.tactic=id;this.choices=[];this.state='playing';this.emit('choose',{id});return true;}const before=this.synergies().length,assembled=this.assembledBuilds().map(x=>x.id);this.applyUpgrade(id);for(const x of this.assembledBuilds())if(!assembled.includes(x.id))this.emit('assembly',{name:x.name,desc:x.desc});if(this.synergies().length>before)this.emit('synergy',{name:this.synergies().at(-1).name});this.choices=[];this.state='playing';this.emit('choose',{id});if(D.specializations[id]&&this.u(id)===D.upgrades.find(x=>x.id===id).max&&!this.spec[id]){this.pendingSpec=id;this.state='specialization';this.emit('specialization');}return true;}
 get expeditionGoal(){return this.daily?4:8;}
 continueEndless(){if(this.state!=='victory')return false;this.endless=true;this.state='route';this.emit('route');return true;}
 get routeChoices(){return this.daily?D.routes.filter(r=>!['focus','drift'].includes(r.id)):D.routes;}
 chooseRoute(id){if(this.state!=='route'||!this.routeChoices.some(x=>x.id===id))return false;this.route=id;if(id==='standard'&&!this.daily)this.hp=Math.min(this.maxHp,this.hp+1);this.state='playing';return true;}
 chooseSpecialization(id){if(this.state!=='specialization'||!D.specializations[this.pendingSpec]?.some(x=>x.id===id))return false;this.spec[this.pendingSpec]=id;this.pendingSpec=null;this.state='playing';return true;}
 contractProgress(){const d=D.contracts.find(x=>x.id===this.contract)||D.contracts[0];return {name:d.name,done:this.contractDone,progress:this.contract==='perfect'?Math.min(3,this.bestPerfectCombo)+'/3':this.contract==='survive'?Math.min(90,Math.floor(this.time))+'/90':this.contractDone?'1/1':'0/1',reward:d.reward};}
 updateSupport(dt){for(const e of this.enemies.filter(x=>!x.dead&&D.enemies.find(d=>d.id===x.type)?.support)){const target=this.enemies.filter(q=>!q.dead&&q.type!=='boss'&&!D.enemies.find(d=>d.id===q.type)?.support&&Math.hypot(q.x-e.x,q.y-e.y)<=160).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0];e.link=target?.id;if(e.type==='healer'){e.healTimer=(e.healTimer||0)+dt;if(e.healTimer>=4){e.healTimer=0;if(target)target.hp=Math.min(target.maxHp,target.hp+.35);}}}}
 applyUpgrade(id){const def=D.upgrades.find(x=>x.id===id);if(!def||this.u(id)>=def.max)return false;this.up[id]=this.u(id)+1;if(id==='heal')this.hp=Math.min(this.maxHp,this.hp+1);if(id==='bounty')this.bounty=25;return true;}
 reroll(){if(this.state!=='upgrade'||!this.rerolls||this.choices.some(u=>u.kind==='tactic'))return false;this.rerolls--;this.offer();return true;}
 update(dt,input={}){if(this.state!=='playing')return;dt=clamp(dt,0,.05);let left=dt;while(left>1e-7&&this.state==='playing'){const step=Math.min(left,1/120);this.step(step,input);left-=step;}}
 step(dt,input){
  const oldAngle=this.angle;this.time+=dt;this.holdTime=Math.abs(this.rotation)<10*RAD?this.holdTime+dt:0;this.updateEncounter();if(this.route==='overheat')this.routeCredit+=dt*.42*.18;if(this.contract==='survive'&&this.time>=90)this.contractDone=true;if(this.time>=this.replayAt){this.replayAt=this.time+.08;this.captureReplay();}
  if(input.axis){this.angle+=clamp(input.axis,-1,1)*this.turnSpeed*dt;this.target=this.angle;}
  else {if(Number.isFinite(input.angle))this.target=input.angle;this.angle+=clamp(angleDiff(this.target,this.angle),-this.turnSpeed*dt,this.turnSpeed*dt);}
  this.angle=Math.atan2(Math.sin(this.angle),Math.cos(this.angle));this.rotation=angleDiff(this.angle,oldAngle)/dt;
  for(const key of ['invuln','barrier','suppressed','bounty','overloadCooldown','tacticGuardCooldown'])this[key]=Math.max(0,this[key]-dt);
  const wave=1+Math.floor(this.time/18);if(wave!==this.wave){this.wave=wave;this.emit('wave',{wave});}
  if(this.time>=this.nextBoss&&!this.boss)this.addBoss();
  if(this.time>=this.nextSpawn&&!this.boss){
   let allowed=D.enemies.filter(e=>e.unlock<=this.time&&(!e.support||this.enemies.filter(q=>!q.dead&&D.enemies.find(d=>d.id===q.type)?.support).length<2));if(this.route==='interference')allowed=allowed.concat(allowed.filter(e=>e.support));let type=allowed[Math.floor(this.rng()*allowed.length)];if(this.encounter){const types=this.encounter.index===0?['gunner','shooter']:this.encounter.index===1?['healer','shooter']:['sniper','shooter'];const id=this.encounter.index===1&&!this.enemies.some(q=>!q.dead&&q.encounterTarget===this.encounter.id)?'healer':types[Math.floor(this.rng()*types.length)];if(id!=='healer'||this.enemies.filter(q=>!q.dead&&D.enemies.find(d=>d.id===q.type)?.support).length<2)type=D.enemies.find(x=>x.id===id);}if(this.enemies.filter(e=>!e.dead).length<Math.min(11,3+this.wave))this.addEnemy(type.id,this.rng()*TAU);this.nextSpawn=this.time+Math.max(1.3,3.4-this.time*.02)/(this.difficulty*(this.time>=18?1.16:1));
  }
  if(this.time>=this.nextAttack){
   const candidates=this.enemies.filter(e=>!e.dead&&e.cool<=this.time);const e=candidates[Math.floor(this.rng()*candidates.length)];if(e)this.attack(e);const interval=this.boss?.spec===0?[1.1,.9,.75][this.boss.phase-1]:Math.max(.5,1.8-this.time*.011);this.nextAttack=this.time+interval/(this.difficulty*(this.time>=18?1.16:1));
  }
  this.updateSupport(dt);if(this.u('interceptor')&&this.suppressed<=0){this.interceptTimer=(this.interceptTimer||0)+dt;if(this.interceptTimer>=12){const p=this.projectiles.filter(p=>p.active&&!p.friendly&&p.r<=130).sort((a,b)=>a.r-b.r)[0];if(p){p.active=false;this.interceptTimer=0;this.effects.push({type:'pulse',r:130,life:.3,max:.3});}}}
  for(const e of this.enemies){
   e.orbitVelocity=this.orbitSpeed(e);
   e.angle=Math.atan2(Math.sin(e.angle+dt*e.orbitVelocity),Math.cos(e.angle+dt*e.orbitVelocity));
   e.orbitBase??=e.r;e.r=orbitRadius(e.angle,this.time,e.orbitBase);
   Object.assign(e,pos(e.angle,e.r));
  }
  this.updateAim();
  // Record each group's first real overlap caused by shield movement. Holding a shield never refreshes the timestamp.
  for(const g of this.groups){if(g.cancelled)continue;const moving=g.locked&&Math.abs(this.rotation)>20*RAD;for(const track of g.tracks){const aligned=this.covers(track.angle);if(aligned&&!track.aligned&&moving)track.trackedAt=this.time;track.aligned=aligned;if(!aligned)track.trackedAt=null;}g.trackedAt=g.tracks[0].trackedAt;
   if(!g.fired&&this.time>=g.launch)this.fireGroup(g);
   if(g.kind==='laser'&&g.fired&&this.time>=g.arrival&&!g.resolved){g.resolved=true;g.perfect=g.trackedAt!==null&&this.time-g.trackedAt<=.12&&this.covers(g.angle);if(this.covers(g.angle))this.reflect({angle:g.angle},g);else this.hitCore(false,'Лазер: щит не перекрыл предупреждающий луч',g.angle,undefined,g.attacker);this.effects.push({type:'laser',angle:g.angle,r:g.radius,life:.25,max:.25});}
  }
  const current=this.projectiles.slice();
  for(const p of current){if(!p.active)continue;p.age+=dt;if(p.age>12){p.active=false;continue;}p.trail.push({x:p.x,y:p.y});if(p.trail.length>6)p.trail.shift();
   if(p.friendly){
    const target=this.enemies.find(e=>e.id===p.target&&!e.dead);if(target)p.angle=Math.atan2(target.y-p.y,target.x-p.x);p.x+=Math.cos(p.angle)*430*dt;p.y+=Math.sin(p.angle)*430*dt;
    if(Math.hypot(p.x,p.y)>375){p.active=false;continue;}
    for(const e of this.enemies.slice()){if(e.dead||p.hit.includes(e.id))continue;if(Math.hypot(p.x-e.x,p.y-e.y)<e.size+7){p.hit.push(e.id);this.damageEnemy(e,p.damage,p.auto?'automation':'reflection');if(!p.auto)this.onProjectileHit(p,e);p.pierce--;const onward=this.enemies.filter(q=>!q.dead&&!p.hit.includes(q.id)).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];p.target=onward?.id;if(p.pierce<=0){p.active=false;break;}}}
   }else{
    if(p.group.cancelled){p.active=false;continue;}
    const oldR=p.r;p.r-=p.speed*(p.r<=130?1-p.slow:1)*dt;
    const a=p.finalAngle-p.curve*clamp((p.r-65)/(p.originRadius-65),0,1);p.angle=a;Object.assign(p,pos(a,p.r));
    if(oldR>65&&p.r<=65){const g=p.group;g.perfect=p.track.trackedAt!==null&&this.time-p.track.trackedAt<=.12&&this.covers(p.angle);if(this.covers(p.angle)){this.reflect(p,g);p.active=false;continue;}p.miss=this.missInfo(p.angle);this.captureReplay();}
    if(p.r<26){p.active=false;this.hitCore(p.suppress,p.suppress?'Подавитель: атака прошла мимо щита':'Снаряд прошёл через незащищённую сторону ядра',p.angle,p.miss,p.group?.attacker);}
   }
  }
  if(this.suppressed<=0){
   if(this.u('turret')){this.autoTimer+=dt;if(this.autoTimer>=(5-(this.u('turret')-1)*.6)*(this.spec.turret==='rapid'?.65:this.spec.turret==='heavy'?1.3:1)){this.autoTimer=0;this.autoShot(.55*(this.spec.turret==='rapid'?.65:this.spec.turret==='heavy'?1.4:1));}}
   if(this.u('drone')||this.m('satellite')){this.droneTimer+=dt;const period=this.u('drone')?6-(this.u('drone')-1)*.7:9;if(this.droneTimer>=period){this.droneTimer=0;this.autoShot(.7);}}
   if(this.u('aura')){this.auraTimer+=dt;if(this.auraTimer>=4){this.auraTimer=0;for(const e of this.enemies.filter(e=>!e.dead).slice(0,2)){this.damageEnemy(e,.35*this.u('aura'),'automation');this.effects.push({type:'chain',x:0,y:0,x2:e.x,y2:e.y,life:.25,max:.25});}}}
  }
  this.projectiles=this.projectiles.filter(p=>p.active);this.enemies=this.enemies.filter(e=>!e.dead);this.groups=this.groups.filter(g=>!g.cancelled&&this.time<g.arrival+.85);this.warnings=this.groups.filter(g=>!g.cancelled&&(!g.fired||g.kind==='laser'&&!g.resolved));
  for(const f of this.effects)f.life-=dt;this.effects=this.effects.filter(f=>f.life>0).slice(-100);
  if(!this.training&&this.energy>=this.threshold&&this.state==='playing'){this.energy-=this.threshold;this.level++;this.offer();}
 }
 autoShot(damage){const e=this.enemies.find(e=>!e.dead);if(e)this.launchFriendly(e.angle,damage,e.id,{auto:true});}
 onProjectileHit(p,e){
  const cascade=1+.12*this.m('cascade');
  if(this.u('chain')){const baseChain=this.spec.chain==='focus'?1:this.u('chain')+(this.spec.chain==='fork'?2:0);let from=e;const hit=[...p.hit];for(let i=0;i<baseChain+(this.hasAssembly('storm')?1:0);i++){const next=this.enemies.filter(q=>!q.dead&&!hit.includes(q.id)).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y))[0];if(!next)break;hit.push(next.id);const crit=!p.crit&&this.rng()<this.u('crit')*.18;this.damageEnemy(next,p.damage*.7*cascade*(i>=baseChain?.65:1)*(this.spec.chain==='fork'?.65:this.spec.chain==='focus'?1.6:1)*(crit?3:1),'chain');this.effects.push({type:'chain',x:from.x,y:from.y,x2:next.x,y2:next.y,life:.25,max:.25});from=next;}}
  if(this.u('blast')){const r=(45+(this.u('blast')-1)*15)*(this.spec.blast==='dense'?.65:1)+(this.spec.blast==='wide'?35:0)+(this.hasAssembly('cascade')?12:0);for(const q of this.enemies.slice())if(q.id!==e.id&&!q.dead&&Math.hypot(q.x-e.x,q.y-e.y)<=r)this.damageEnemy(q,p.damage*.65*cascade*(this.spec.blast==='wide'?.75:this.spec.blast==='dense'?1.35:1),'blast');this.effects.push({type:'blast',x:e.x,y:e.y,r,life:.4,max:.4});}
 }
 advanceEncounter(kind){const c=this.encounter;if(!c||c.done||c.failed||this.time>=c.until)return;if((c.index===2&&kind==='block')||(c.index<2&&kind==='target')){c.progress=Math.min(c.goal,c.progress+1);if(c.progress>=c.goal){c.done=true;this.emit('encounterComplete',{name:c.name});}}}
 finishEncounter(){const c=this.encounter;if(!c)return;this.encounterResults.push({name:c.name,done:c.done,progress:c.progress,goal:c.goal});this.encounterResults=this.encounterResults.slice(-12);this.encounter=null;}
 updateEncounter(){if(this.training)return;if(this.boss){this.finishEncounter();return;}if(this.encounter&&this.time>=this.encounter.until)this.finishEncounter();if(!this.encounter&&this.time>=this.nextEncounter&&this.nextBoss-this.time>15){const index=this.encounterIndex++%3;this.encounter={id:this.encounterIndex,index,name:['Перехват конвоя','Охота на ремонтников','Защита сектора'][index],until:this.time+12,progress:0,goal:[2,1,5][index],done:false,failed:false};for(const e of this.enemies)if(!e.dead&&(index===0?['gunner','shooter'].includes(e.type):index===1&&e.type==='healer'))e.encounterTarget=this.encounter.id;this.nextEncounter=this.time+38;this.emit('encounter',{name:this.encounter.name});}}
 analysis(){const total=this.blocks+Object.values(this.damageTaken).reduce((a,b)=>a+b,0);return {accuracy:total?Math.round(this.blocks/total*100):0,taken:this.damageTaken,damage:this.damageBy,hint:this.damageTaken.laser?'Лазерные попадания: раньше переключайтесь на сплошной луч.':this.damageTaken.suppressor?'Сначала следите за Подавителями: их попадания замедляют щит.':this.lastHit?.hint||'Следите за ближайшим ударом и сохраняйте энергию для Перегрузки.'};}
 result(){return{id:this.id,balance:BALANCE,core:this.core,tactic:this.tactic||'',time:Math.floor(this.time),score:Math.floor(this.score),kills:this.kills,bosses:this.bossKills,combo:this.bestCombo,perfect:this.perfects,perfectCombo:this.bestPerfectCombo,wave:this.wave,date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Vladivostok'})};}
 settle(){
  if(this.state!=='dead'||this.rewarded||this.save.settled.includes(this.id))return null;this.rewarded=true;if(this.training)return {...this.result(),training:true,victory:!!this.trainingVictory,shards:0,achievementShards:0,unlocked:[],newRecords:[],old:{}};if(this.daily){this.save.settled.push(this.id);this.save.settled=this.save.settled.slice(-30);const rows=this.save.dailyRecords||(this.save.dailyRecords={}),old=rows[this.daily]||{score:0,time:0,attempts:0},r=this.result();rows[this.daily]={score:Math.max(old.score,r.score),time:Math.max(old.time,r.time),attempts:old.attempts+1};for(const key of Object.keys(rows).sort().slice(0,-7))delete rows[key];return {...r,daily:this.daily,shards:0,achievementShards:0,unlocked:[],newRecords:r.score>old.score?['score']:[],old};}const s=this.save,r=this.result(),old={...(s.currentBests[this.mode]||{})};
  // No reward for an immediate exit. One settlement per run; output is bounded by actual simulated play time.
  const base=this.time<8?0:Math.floor(12+this.time*.42+Math.min(this.kills,this.time*2)*.5+this.bossKills*15);
  const multiplier=(1+.1*this.m('shards'))*(this.mode==='horizon'?1.8:this.mode==='challenge'?1.4+.15*this.m('challenge'):1);
  const sectorShards=this.time>=8?Math.min(this.routeCredit,(this.time*.42+Math.min(this.kills,this.time*2)*.5)*.18):0;const contractDef=D.contracts.find(x=>x.id===this.contract)||D.contracts[0],contractShards=this.time>=8&&this.contractDone?contractDef.reward:0;const shards=Math.min(10000,Math.round((base+sectorShards)*multiplier)+contractShards);const contractPenalty=!this.contractDone?Math.min(s.shards+shards,contractDef.penalty||0):0;s.shards+=shards-contractPenalty;s.settled.push(this.id);s.settled=s.settled.slice(-30);
  s.totals.runs++;s.totals.kills+=this.kills;s.totals.bosses+=this.bossKills;s.totals.blocks+=this.blocks;s.totals.perfect+=this.perfects;s.totals.time=Math.max(s.totals.time,r.time);s.totals.combo=Math.max(s.totals.combo,r.combo);
  for(const id of this.clearedBosses)if(!s.bosses.includes(id))s.bosses.push(id);
  if((s.totals.time>=60||s.bosses.length)&&!s.modes.includes('challenge'))s.modes.push('challenge');
  const best=s.currentBests[this.mode]||(s.currentBests[this.mode]={});const all=s.bests[this.mode]||(s.bests[this.mode]={});const newRecords=[];for(const key of ['time','score','combo','perfectCombo','kills','bosses','wave']){all[key]=Math.max(all[key]||0,r[key]);if(r[key]>(best[key]||0)){newRecords.push(key);best[key]=r[key];}}
  s.records[this.mode].push(r);s.records[this.mode].sort((a,b)=>b.score-a.score);s.records[this.mode]=s.records[this.mode].slice(0,10);
  const unlocked=claimAchievements(s);return{...r,shards,contractShards,contractPenalty,sectorShards:Math.round(sectorShards*multiplier),achievementShards:unlocked.reduce((n,a)=>n+a.reward,0),unlocked,newRecords,old};
 }
}
function claimAchievements(s){const unlocked=[];for(const a of D.achievements)if(!s.achievements.includes(a.id)&&a.test(s)){s.achievements.push(a.id);s.shards+=a.reward;unlocked.push(a);}return unlocked;}
function purchase(s,id){const t=D.tech.find(t=>t.id===id);if(!t)return false;const lv=s.tech[id]||0,price=D.cost(t,lv);if(lv>=t.max||s.shards<price||t.requires?.some(id=>!s.tech[id]))return false;s.shards-=price;s.tech[id]=lv+1;return true;}
function canPrestige(s){return s.bosses.length>=4&&Object.values(s.tech).reduce((a,b)=>a+b,0)>=12;}
function prestige(s){if(!canPrestige(s))return false;const gain=3+Math.floor(Object.values(s.tech).reduce((a,b)=>a+b,0)/10);s.prestige++;s.rare+=gain;s.tech={};s.shards=0;claimAchievements(s);return gain;}
function purchasePrestige(s,id){const t=D.prestigeTech.find(t=>t.id===id);if(!t)return false;const level=s.prestigeTech[id]||0,price=t.cost+level;if(level>=t.max||s.rare<price)return false;s.rare-=price;s.prestigeTech[id]=level+1;if(id==='void'&&!s.modes.includes('horizon'))s.modes.push('horizon');return true;}
const api={dailyKey,dailySeed,BALANCE,Engine,SaveStore,freshSave,validateSave,claimAchievements,purchase,canPrestige,prestige,purchasePrestige,clamp,angleDiff,pos,random,orbitRadius,orbitInstability,RAD,TAU};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoreEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
