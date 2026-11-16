'use strict';
const assert=require('node:assert/strict'),{Controller}=require('../dist/gamepad');let passed=0;
function pad(id='Xbox',index=0,mapping='standard'){return{id,index,mapping,connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};}
function rig(p=pad()){let devices=[p];const c=new Controller(()=>devices);c.poll(0);return{c,p,set:v=>devices=v};}
function press(p,index,value=true){p.buttons[index]={pressed:value,value:value?1:0};}
function test(name,fn){fn();passed++;console.log('✓ '+name);}
test('Gamepad API отсутствует или запрещён — игра не падает',()=>{assert.equal(new Controller(()=>null).poll().available,false);assert.equal(new Controller(()=>{throw Error('SecurityError');}).poll().connected,false);});
test('Подключение и отключение обнаруживаются без накопления обработчиков',()=>{const f=rig();assert.equal(f.c.poll().connected,true);f.set([]);assert.equal(f.c.poll().changed,true);assert.equal(f.c.poll().changed,false);});
test('Нажатая при подключении кнопка не запускает игру сама',()=>{const p=pad();press(p,0);const c=new Controller(()=>[p]);assert.equal(c.poll().confirm,false);assert.equal(c.poll().confirm,false);press(p,0,false);c.poll();press(p,0);assert.equal(c.poll().confirm,true);});
test('A и триггер срабатывают один раз до отпускания',()=>{const {p,c}=rig();for(const i of [0,2,7]){press(p,i);assert.equal(c.poll().overload,true);assert.equal(c.poll().overload,false);press(p,i,false);c.poll();}});
test('Мёртвая зона подавляет дрейф, положение стика не меняет скорость щита',()=>{const {p,c}=rig();p.axes=[.1,-.1];assert.equal(c.poll().active,false);p.axes=[.9,0];assert.equal(c.poll().angle,0);p.axes=[0,-.9];assert.equal(c.poll().angle,-Math.PI/2);});
test('Правый стик работает; выбирается более сильное отклонение',()=>{const {p,c}=rig();p.axes=[.4,0,0,1];assert.equal(c.poll().angle,Math.PI/2);});
test('Крестовина задаёт стороны и диагонали',()=>{const {p,c}=rig();press(p,12);assert.equal(c.poll().angle,-Math.PI/2);press(p,15);assert.equal(c.poll().angle,-Math.PI/4);});
test('LB/RB обеспечивают ограниченное движком вращение, совместное нажатие нейтрально',()=>{const {p,c}=rig();press(p,4);assert.equal(c.poll().axis,-1);press(p,5);assert.equal(c.poll().axis,0);press(p,4,false);assert.equal(c.poll().axis,1);});
test('Start и B имеют отдельные события и не повторяются при удержании',()=>{const {p,c}=rig();press(p,9);assert.equal(c.poll().pause,true);assert.equal(c.poll().pause,false);press(p,1);assert.equal(c.poll().back,true);});
test('Навигация по меню имеет задержку и ограниченный повтор',()=>{const {p,c}=rig();press(p,13);assert.equal(c.poll(1,true).nav,'down');assert.equal(c.poll(200,true).nav,null);assert.equal(c.poll(322,true).nav,'down');assert.equal(c.poll(350,true).nav,null);assert.equal(c.poll(463,true).nav,'down');});
test('Стик работает в меню без кнопок крестовины',()=>{const {p,c}=rig();p.axes=[-1,0];assert.equal(c.poll(1,true).nav,'left');p.axes=[0,-1];assert.equal(c.poll(2,true).nav,'up');});
test('Сброс при потере фокуса подавляет удержанные кнопки',()=>{const {p,c}=rig();press(p,9);c.reset();assert.equal(c.poll().pause,false);});
test('Нестандартный контроллер не вызывает непредсказуемых команд кнопками',()=>{const {p,c}=rig(pad('Generic',0,''));p.axes=[1,0];press(p,0);const s=c.poll();assert.equal(s.standard,false);assert.equal(s.angle,0);assert.equal(s.confirm,false);assert.equal(s.overload,false);});
test('Второй геймпад не перехватывает управление; замена требует новой базовой выборки',()=>{const a=pad(),b=pad('DualSense',1),c=new Controller(()=>[a,b]);c.poll();press(b,9);assert.equal(c.poll().id,a.id);a.connected=false;const r=c.poll();assert.equal(r.id,b.id);assert.equal(r.changed,true);assert.equal(r.pause,false);});
test('Пропуски массива, неполные кнопки и NaN безопасны',()=>{const p=pad();p.axes=[NaN,Infinity];p.buttons=[];const c=new Controller(()=>[null,p]);assert.equal(c.poll().active,false);});
console.log(`\n${passed} gamepad checks passed. Physical devices and browser mappings still need real-device QA.`);
