/* Web Audio graph test double. Records scheduling and lifecycle; does not synthesize sound. */
class Param{
 constructor(value=0){this.value=value;this.events=[];}
 add(method,value,time,extra){if(!Number.isFinite(value)||!Number.isFinite(time)||time<0)throw Error('Invalid automation');if(method==='exponential'&&value<=0)throw Error('Nonpositive exponential ramp');this.value=value;this.events.push({method,value,time,extra});}
 setValueAtTime(v,t){this.add('set',v,t);}exponentialRampToValueAtTime(v,t){this.add('exponential',v,t);}linearRampToValueAtTime(v,t){this.add('linear',v,t);}setTargetAtTime(v,t,c){this.add('target',v,t,c);}cancelScheduledValues(t){this.events.push({method:'cancel',time:t});}
}
class Node{
 constructor(ctx,type){this.ctx=ctx;this.type=type;this.connections=[];this.disconnected=false;ctx.nodes.push(this);}
 connect(n){if(!n)throw Error('Missing destination');this.connections.push(n);return n;}disconnect(){this.disconnected=true;}
}
class Source extends Node{
 constructor(ctx,type){super(ctx,type);this.frequency=new Param();this.detune=new Param();}
 start(t){if(this.started!==undefined)throw Error('Source started twice');this.started=t;this.ctx.sources.push(this);}stop(t){if(t<this.started)throw Error('Invalid stop');this.stopped=t;}
}
class AudioContext{
 constructor(){this.currentTime=0;this.sampleRate=44100;this.state='running';this.nodes=[];this.sources=[];this.destination=new Node(this,'destination');this.resumes=0;}
 resume(){this.state='running';this.resumes++;return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
 createGain(){const n=new Node(this,'gain');n.gain=new Param(1);return n;}
 createOscillator(){return new Source(this,'oscillator');}createBufferSource(){return new Source(this,'bufferSource');}
 createBiquadFilter(){const n=new Node(this,'filter');n.frequency=new Param();n.Q=new Param();return n;}
 createDynamicsCompressor(){const n=new Node(this,'compressor');for(const k of ['threshold','knee','ratio','attack','release'])n[k]=new Param();return n;}
 createDelay(){const n=new Node(this,'delay');n.delayTime=new Param();return n;}createStereoPanner(){const n=new Node(this,'panner');n.pan=new Param();return n;}
 createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return{length,sampleRate,getChannelData:i=>data[i]};}
 advance(t){this.currentTime=t;for(const s of this.sources)if(!s.ended&&s.stopped<=t){s.ended=true;s.onended?.();}}
}
module.exports={AudioContext,Param,Node};
