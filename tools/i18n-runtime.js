/* Presentation-only localization. Stable IDs, save keys and gameplay data stay unchanged. */
(function(root){
'use strict';
const catalogs=/*CATALOGS*/{};
const catalog=catalogs.en;
const languages=Object.freeze(['ru',...Object.keys(catalogs)]);
let language='en';
const lookup=new Map();
const escapeRegex=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function languageLookup(locale){
 if(!lookup.has(locale)){
  const messages={...catalogs[locale]};
  for(const [key,value] of Object.entries(messages)){
   const upper=key.toUpperCase();
   if(!Object.hasOwn(messages,upper))messages[upper]=value.toLocaleUpperCase(locale);
  }
  const matcher=new RegExp(Object.keys(messages).sort((a,b)=>b.length-a.length).map(escapeRegex).join('|'),'gu');
  lookup.set(locale,{messages,matcher});
 }
 return lookup.get(locale);
}
const letter=c=>Boolean(c)&&/\p{L}/u.test(c);
function setLanguage(value){language=languages.includes(value)?value:'en';return language;}
function getLanguage(){return language;}
function t(value){
 const input=String(value??'');if(language==='ru'||!/[\u0400-\u04ff]/.test(input))return input;
 const {messages,matcher}=languageLookup(language);
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
const api={t,html,setLanguage,getLanguage,translateShell,catalog,languages};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CoreI18n=api;
})(typeof globalThis!=='undefined'?globalThis:this);
