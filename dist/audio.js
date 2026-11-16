/* Original procedural score: PULSE CIRCUIT / NEON RUN / SOLAR DRIVE. No recordings, external assets, or borrowed melodies. */
(function(root){
'use strict';
const BPM=126,STEP=60/BPM/4,MAX_VOICES=88;
const midi=n=>440*Math.pow(2,(n-69)/12);
const CHORDS=[{root:38,notes:[0,3,7,14]},{root:34,notes:[0,4,7,11]},{root:41,notes:[0,4,7,14]},{root:36,notes:[0,4,7,9]},{root:38,notes:[0,3,7,10]},{root:43,notes:[0,4,7,9]},{root:34,notes:[0,4,7,14]},{root:36,notes:[0,4,7,14]}];
const ARP=[0,2,1,3,2,1,3,2,0,3,2,1,3,1,2,3];
function baseScoreStep(index,mode='combat'){
 const s=index%16,bar=Math.floor(index/16)%16,chord=CHORDS[Math.floor(bar/2)],boss=mode==='boss',soft=mode==='paused'||mode==='result',menu=mode==='menu',events=[];
 const add=(kind,data={})=>events.push({kind,offset:0,...data});
 if(s%4===0&&(!soft||s===0))add('kick',{level:soft?.32:menu?.64:.82});
 if(!soft&&s%8===4)add('snare',{level:menu?.1:.17});
 if(!soft&&(s%2===0||boss&&s%8===7))add('hat',{level:s%4===2?.046:.026,open:s%8===6});
 if([0,3,6,8,11,14].includes(s)){
  const note=chord.root+(s===14&&bar%2?7:s===11&&bar%4===3?12:0),duck=s%4===0?.48:1;
  add('synth',{note,duration:STEP*1.6,wave:'sawtooth',level:.19*duck,cutoff:soft?420:boss?1800:950,attack:.006,release:.07,pluck:true});
  add('synth',{note:note-12,duration:STEP*1.55,wave:'sine',level:.12*duck,attack:.009,release:.08});
 }
 if(!soft||s%2===0){const note=chord.root+24+chord.notes[ARP[s]]+(bar>=8&&s%4===3?12:0);add('synth',{note,duration:STEP*(s%4===3?2.3:1.6),wave:'triangle',level:soft?.027:menu?.063:.083,cutoff:boss?6500:3500,attack:.005,release:.15,pluck:true,pan:Math.sin(index*.7)*.35,wet:true});}
 if(s===0)for(const [i,interval]of chord.notes.entries())add('synth',{note:chord.root+12+interval,duration:STEP*15,wave:'sawtooth',level:soft?.014:.023,cutoff:soft?900:2100,attack:.22,release:.48,detune:i%2?6:-6,pan:(i-1.5)*.24,wet:true});
 if(!soft&&bar>=4&&[2,8,11,14].includes(s)){
  const phrase=[[2,3,2,1],[3,4,2,3],[2,1,3,4],[3,2,1,0]],tone=phrase[bar%4][[2,8,11,14].indexOf(s)],part=tone===4?12:chord.notes[tone],note=chord.root+24+part;
  add('synth',{note,duration:STEP*(s===8?2.7:1.6),wave:'triangle',level:boss?.1:menu?.052:.078,cutoff:5200,attack:.012,release:.22,pan:.13,wet:true});
 }
 if(boss&&s===15)add('noise',{duration:.055,level:.036,cutoff:3800,filter:'bandpass'});
 return events;
}
// Themes share a tempo and change at phrase boundaries; sustained tails bridge the transition.
const THEMES=[
 {name:'Pulse Circuit',transpose:0,arp:ARP,bass:[0,3,6,8,11,14]},
 {name:'Neon Run',transpose:5,arp:[0,1,2,1,3,2,1,0,2,3,1,2,0,2,3,1],bass:[0,2,5,8,10,13]},
 {name:'Solar Drive',transpose:7,arp:[0,2,3,2,1,3,2,0,3,1,2,3,1,0,2,1],bass:[0,3,7,8,12,14]}
];
function scoreStep(index,mode='combat',tension=0){
 const theme=THEMES[Math.floor(index/256)%THEMES.length],s=index%16,bar=Math.floor(index/16),soft=mode==='paused'||mode==='result';
 const events=baseScoreStep(index,mode);
 // Change voicing, articulation and stereo motion without changing the shared beat grid.
 for(const e of events)if(e.kind==='synth'){
  e.note+=theme.transpose;
  if(e.pan!==undefined&&e.pluck)e.pan=Math.sin((index%768)*.31+.3)*.42;
  if(theme===THEMES[1]&&e.pluck&&e.wave==='triangle'){const chord=CHORDS[Math.floor(bar%16/2)];e.note=chord.root+theme.transpose+24+chord.notes[theme.arp[s]];e.wave='sine';e.release=.24;}
  if(theme===THEMES[2]&&e.pluck&&e.wave==='sawtooth'){e.wave='triangle';e.cutoff*=1.3;}
 }
 // Distinct syncopation in later themes, with restrained phrase-ending fills.
 if(theme!==THEMES[0]){
  const chord=CHORDS[Math.floor(bar%16/2)];
  for(let i=events.length-1;i>=0;i--)if(events[i].kind==='synth'&&events[i].pluck&&events[i].wave!=='sine'&&events[i].note<60)events.splice(i,1);
  if(theme.bass.includes(s))events.push({kind:'synth',offset:0,note:chord.root+theme.transpose,duration:STEP*1.3,wave:'sawtooth',level:soft?.055:.095,cutoff:soft?450:1400,attack:.008,release:.08,pluck:true});
 }
 if(!soft&&bar%4===3&&[13,15].includes(s))events.push({kind:'hat',offset:0,level:.022,open:false});
 if(!soft&&bar%8===7&&s===15)events.push({kind:'synth',offset:0,note:74+theme.transpose,duration:STEP*2,level:.035,wave:'sine',attack:.02,release:.25,wet:true,pan:-.3});
 return events;
}
function effectPlan(name,enemy='',options={}){
 const variant=Math.abs(Math.floor(options.variant||0))%3;
 const out=[],add=(note,offset=0,duration=.1,level=.1,wave='triangle',extra={})=>out.push({kind:'synth',note,offset,duration,level,wave,attack:.003,release:.06,...extra});
 const noise=(duration,level,cutoff,offset=0)=>out.push({kind:'noise',duration,level,cutoff,filter:'bandpass',offset});
 if(name==='block'){add(74+[0,2,-2][variant]+Math.min(4,Math.floor((options.combo||0)/12)),0,.07,.17,'triangle',{endNote:79});add(86,.015,.05,.045,'sine');}
 else if(name==='perfect'){[[74,77,81,86],[74,79,81,86],[77,81,84,89]][variant].forEach((n,i)=>add(n,i*.028,.13,.115-i*.016,'triangle',{cutoff:7000}));noise(.055,.032,6500,.025);}
 else if(name==='hurt'){add(43,0,.23,.23,'sawtooth',{endNote:31,cutoff:1100});noise(.14,.13,600);}
 else if(name==='kill'){add(62+[0,3,7][variant],0,.075,.075,'square',{endNote:50,cutoff:1900});noise(.075,.042,2100);}
 else if(['level','choose','buy','record','bossWin','revive','route','specialization','trainingEnd'].includes(name)){
  const notes=name==='buy'?[74,81]:name==='choose'?[69,74,81]:name==='level'?[62,69,74,77]:name==='bossWin'?[62,69,74,78,81]:name==='record'?[74,78,81,86]:[62,67,74,79];
  notes.forEach((n,i)=>add(n,i*.055,name==='bossWin'?.32:.2,.11,'triangle',{cutoff:5500}));
 }else if(name==='boss'||name==='guardianPhase'){
  add(38,0,.62,.19,'sawtooth',{cutoff:900,endNote:38});add(50,.1,.46,.1,'triangle');add(62,.23,.32,.07,'sawtooth',{cutoff:1900});noise(.25,.05,850);
 }else if(name==='warning'){add(81,0,.075,.085,'sine');add(options.kind==='laser'?86:84,.12,.11,.08,'triangle');}
 else if(name==='armor'||name==='emergency'){add(62,0,.18,.12,'triangle');add(69,.04,.22,.085,'sine');}
 else if(name==='pulse'){add(38,0,.45,.24,'sawtooth',{cutoff:1600,endNote:26});noise(.28,.11,1800);[74,81,86].forEach((n,i)=>add(n,.06+i*.035,.22,.065));}
 else if(name==='suppress'){add(58,0,.25,.13,'square',{endNote:46,cutoff:1100});}
 else if(name==='death'){add(50,0,.55,.17,'sawtooth',{endNote:26,cutoff:1000});add(62,.04,.65,.085,'triangle',{endNote:38});noise(.35,.07,750);}
 else if(name==='teleport'){[86,81,74].forEach((n,i)=>add(n,i*.035,.08,.045,'sine',{pan:i%2?.35:-.35}));}
 else if(name==='section'){[69,74,81].forEach((n,i)=>add(n,i*.04,.1,.065));}
 else if(name==='fire'){const types=['shooter','gunner','sniper','shotgun','laser','orbital','splitter','suppressor','boss','healer','relay','carrier'],i=Math.max(0,types.indexOf(enemy));add(48+i*2,0,.045,.035,'triangle',{endNote:43+i*2,cutoff:1500});}
 if(['block','perfect'].includes(name)&&options.build){const note={blast:50,chain:86,echo:81}[options.build];if(note)add(note,.025,.08,.025,'sine');}
 return out;
}
class AudioSystem{
 constructor(getSettings=()=>({music:.16,sfx:.55}),options={}){this.getSettings=getSettings;this.contextFactory=options.contextFactory||(()=>new(root.AudioContext||root.webkitAudioContext)());this.ctx=null;this.next=0;this.step=0;this.mode='menu';this.voices=new Set();this.settingsSnapshot={};this.failed=false;this.effectCounts={};}
 unlock(){
  if(this.failed)return;
  try{if(!this.ctx){this.ctx=this.contextFactory();this.setup();this.next=this.ctx.currentTime+.025;}
   if(['suspended','interrupted'].includes(this.ctx.state))Promise.resolve(this.ctx.resume()).catch(()=>{});this.syncVolumes();
  }catch(e){this.failed=true;if(this.ctx&&typeof this.ctx.close==='function')Promise.resolve(this.ctx.close()).catch(()=>{});this.ctx=null;}
 }
 setup(){
  const c=this.ctx;this.music=c.createGain();this.sfx=c.createGain();this.master=c.createGain();this.master.gain.value=.82;
  this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-8;this.compressor.knee.value=12;this.compressor.ratio.value=4;this.compressor.attack.value=.003;this.compressor.release.value=.16;
  this.musicFilter=c.createBiquadFilter();this.musicFilter.type='lowpass';this.musicFilter.frequency.value=6500;this.musicFilter.Q.value=.5;
  this.music.connect(this.musicFilter);this.musicFilter.connect(this.compressor);this.sfx.connect(this.compressor);this.compressor.connect(this.master);this.master.connect(c.destination);
  this.delaySend=c.createGain();this.delaySend.gain.value=.2;this.delay=c.createDelay(1);this.delay.delayTime.value=60/BPM*.75;this.feedback=c.createGain();this.feedback.gain.value=.23;
  this.echoFilter=c.createBiquadFilter();this.echoFilter.type='lowpass';this.echoFilter.frequency.value=2600;this.delaySend.connect(this.delay);this.delay.connect(this.echoFilter);this.echoFilter.connect(this.music);this.echoFilter.connect(this.feedback);this.feedback.connect(this.delay);
  const rate=c.sampleRate||44100;this.noise=c.createBuffer(1,Math.ceil(rate*.6),rate);const data=this.noise.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/2147483648-1;}
 }
 syncVolumes(){
  if(!this.ctx||!this.music)return;const s=this.getSettings(),now=this.ctx.currentTime;
  for(const [key,multiplier]of [['music',1.1],['sfx',.88]]){const raw=Number(s[key]),value=Number.isFinite(raw)?Math.max(0,Math.min(1,raw)):0;if(this.settingsSnapshot[key]!==value){this[key].gain.cancelScheduledValues(now);this[key].gain.setTargetAtTime(value*multiplier,now,.018);this.settingsSnapshot[key]=value;}}
 }
 setMode(mode){if(this.mode===mode)return;this.mode=mode;if(this.musicFilter)this.musicFilter.frequency.setTargetAtTime(mode==='paused'?1300:mode==='result'?2500:mode==='boss'?10000:mode==='menu'?5000:7200,this.ctx.currentTime,.22);}
 suspend(){if(this.ctx&&typeof this.ctx.suspend==='function')Promise.resolve(this.ctx.suspend()).catch(()=>{});}
 resume(){if(this.ctx&&['suspended','interrupted'].includes(this.ctx.state))Promise.resolve(this.ctx.resume()).catch(()=>{});}
 render(event,when,music=true){
  if(!this.ctx||this.ctx.state!=='running'||this.voices.size>=MAX_VOICES)return;
  const c=this.ctx,start=Math.max(c.currentTime,when),kind=event.kind;
  if(kind==='kick'){this.render({kind:'synth',note:45,endNote:28,duration:.2,release:.04,wave:'sine',level:event.level,attack:.002},start,music);this.render({kind:'noise',duration:.014,level:event.level*.05,filter:'highpass',cutoff:900},start,music);return;}
  if(kind==='snare'){for(let i=0;i<3;i++)this.render({kind:'noise',duration:.075,level:event.level*(i? .45:1),filter:'bandpass',cutoff:1850},start+i*.011,music);this.render({kind:'synth',note:53,endNote:47,wave:'triangle',duration:.085,level:event.level*.4},start,music);return;}
  if(kind==='hat'){this.render({kind:'noise',duration:event.open?.105:.033,level:event.level,filter:'highpass',cutoff:7200},start,music);return;}
  const duration=Math.max(.012,Math.min(3,event.duration||.1)),release=event.release??(kind==='noise'?.015:.07),end=start+duration+release;
  const source=kind==='noise'?c.createBufferSource():c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter(),nodes=[source,gain,filter];
  filter.type=event.filter||'lowpass';filter.Q.value=kind==='noise'?.7:.65;
  const cutoff=event.cutoff||14000;filter.frequency.setValueAtTime(cutoff,start);if(event.pluck)filter.frequency.exponentialRampToValueAtTime(Math.max(180,cutoff*.2),start+duration);
  if(kind==='noise'){source.buffer=this.noise;}else{source.type=event.wave||'triangle';source.frequency.setValueAtTime(midi(event.note),start);if(Number.isFinite(event.endNote))source.frequency.exponentialRampToValueAtTime(midi(event.endNote),start+duration);source.detune.value=event.detune||0;}
  const attack=Math.min(duration*.7,event.attack||.004),peak=Math.max(.0001,Math.min(1,event.level||.1));
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(peak,start+attack);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak*(event.pluck?.28:.68)),start+duration);gain.gain.exponentialRampToValueAtTime(.0001,end);
  source.connect(filter);filter.connect(gain);let output=gain;
  if(event.pan&&typeof c.createStereoPanner==='function'){const pan=c.createStereoPanner();pan.pan.value=event.pan;gain.connect(pan);output=pan;nodes.push(pan);}
  output.connect(music?this.music:this.sfx);if(music&&event.wet)output.connect(this.delaySend);
  const voice={source,nodes};this.voices.add(voice);source.onended=()=>{for(const node of nodes)node.disconnect();this.voices.delete(voice);};source.start(start);source.stop(end+.015);
 }
 play(name,enemy='',options={}){if(!this.ctx||this.ctx.state!=='running'||!this.getSettings().sfx)return;const at=this.ctx.currentTime;const variant=this.effectCounts[name]||0;this.effectCounts[name]=(variant+1)%3;for(const e of effectPlan(name,enemy,{...options,variant}))this.render(e,at+e.offset,false);}
 update(mode=this.mode,tension=0){
  if(!this.ctx||this.ctx.state!=='running')return;this.syncVolumes();this.setMode(mode);
  const now=this.ctx.currentTime;if(this.next<now-.2){this.next=now+.025;this.step=Math.ceil(this.step/16)*16;}
  if(!this.getSettings().music){this.next=now+.025;return;}
  let count=0;while(this.next<now+.105&&count++<4){for(const event of scoreStep(this.step,this.mode,tension))this.render(event,this.next+event.offset,true);this.step++;this.next+=STEP;}
 }
}
const api={THEMES,AudioSystem,scoreStep,effectPlan,BPM,STEP,MAX_VOICES,midi};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoreAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this);
