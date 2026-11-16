/* Presentation-only localization. Stable IDs, save keys and gameplay data stay unchanged. */
(function(root){
'use strict';
const catalog=/*CATALOG*/{};
let language='en';
const messages={...catalog};
for(const [key,value] of Object.entries(catalog)){
 const upper=key.toUpperCase();if(!(upper in messages))messages[upper]=value.toUpperCase();
}
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const matcher=new RegExp(Object.keys(messages).sort((a,b)=>b.length-a.length).map(escapeRegex).join('|'),'gu');
const letter=c=>Boolean(c)&&/\p{L}/u.test(c);
function setLanguage(value){language=value==='ru'?'ru':'en';return language;}
function getLanguage(){return language;}
function t(value){
 const input=String(value??'');if(language==='ru'||!/[\u0400-\u04ff]/.test(input))return input;
 if(Object.hasOwn(messages,input))return messages[input];
 return input.replace(matcher,(key,index,source)=>{
  // Never replace a translated word inside another word or a stable identifier.
  if(letter(key[0])&&letter(source[index-1])||letter(key.at(-1))&&letter(source[index+key.length]))return key;
  return messages[key];
 });
}
function html(markup){
 if(language==='ru')return markup;
 return String(markup).replace(/<[^>]*>|[^<]+/g,part=>{
  if(part[0]!=='<')return t(part);
  return part.replace(/\b(aria-label|title)="([^"]*)"/g,(_,name,value)=>`${name}="${t(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}"`);
 });
}
function translateShell(doc){
 doc.documentElement.lang=language;doc.title=t('CORE — ЯДРО');
 for(const el of doc.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
 for(const attr of ['aria-label','title','content'])for(const el of doc.querySelectorAll(`[data-i18n-${attr}]`))el.setAttribute(attr,t(el.getAttribute(`data-i18n-${attr}`)));
 for(const el of doc.querySelectorAll('[data-language]')){
  const selected=el.dataset.language===language;el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));
 }
}
const api={t,html,setLanguage,getLanguage,translateShell,catalog};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoreI18n=api;
})(typeof globalThis!=='undefined'?globalThis:this);
