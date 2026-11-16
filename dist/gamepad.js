/* Standard Gamepad API input. No network, permissions prompt, or gameplay timing changes. */
(function(root){
'use strict';
const clamp=v=>Number.isFinite(v)?Math.max(-1,Math.min(1,v)):0;
class Controller{
 constructor(read){this.read=read||(()=>typeof navigator!=='undefined'&&typeof navigator.getGamepads==='function'?navigator.getGamepads():null);this.key=null;this.buttons=[];this.baseline=true;this.navigation='';this.repeatAt=0;this.deadzone=.22;}
 reset(){this.baseline=true;this.navigation='';this.repeatAt=0;}
 poll(now=0,menu=false){
  let pads;try{pads=this.read();}catch(e){pads=null;}
  const empty={available:pads!==null&&pads!==undefined,connected:false,active:false,axis:0,angle:undefined,confirm:false,overload:false,back:false,pause:false,nav:null};
  const list=Array.from(pads||[]).filter(p=>p&&p.connected!==false);
  const pad=list.find(p=>`${p.index}:${p.id}`===this.key)||list[0];
  if(!pad){const changed=this.key!==null;this.key=null;this.buttons=[];this.reset();return{...empty,changed};}
  const key=`${pad.index}:${pad.id}`,changed=key!==this.key;if(changed){this.key=key;this.reset();}
  const standard=pad.mapping==='standard',buttons=Array.from(pad.buttons||[],b=>typeof b==='number'?b>.6:Boolean(b?.pressed||b?.value>.6));
  const down=i=>Boolean(buttons[i]),edge=i=>!this.baseline&&down(i)&&!this.buttons[i];
  const axes=Array.from(pad.axes||[],clamp);let x=axes[0]||0,y=axes[1]||0;
  if(standard&&Math.hypot(axes[2]||0,axes[3]||0)>Math.hypot(x,y)){x=axes[2]||0;y=axes[3]||0;}
  const magnitude=Math.hypot(x,y);let angle=magnitude>=this.deadzone?Math.atan2(y,x):undefined,axis=0,nav=null;
  if(standard){const dx=Number(down(15))-Number(down(14)),dy=Number(down(13))-Number(down(12));if(dx||dy){x=dx;y=dy;angle=Math.atan2(dy,dx);}axis=Number(down(5))-Number(down(4));}
  if(menu){const direction=Math.max(Math.abs(x),Math.abs(y))>.5?(Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up'):'';
   if(direction!==this.navigation){this.navigation=direction;this.repeatAt=now+320;if(!this.baseline)nav=direction||null;}
   else if(direction&&now>=this.repeatAt){nav=direction;this.repeatAt=now+140;}
  }else this.navigation='';
  const result={...empty,connected:true,changed,id:String(pad.id||'Gamepad'),index:pad.index,standard,angle,axis,active:angle!==undefined||axis!==0,nav,confirm:standard&&edge(0),overload:standard&&(edge(0)||edge(2)||edge(7)),back:standard&&edge(1),pause:standard&&edge(9)};
  this.buttons=buttons;this.baseline=false;return result;
 }
}
const api={Controller};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoreGamepad=api;
})(typeof globalThis!=='undefined'?globalThis:this);
