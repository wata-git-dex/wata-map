import catalog from '/assets/wata-icons/df90ba8d05c2/catalog.mjs';
const blocked='#bottomNav,.bottom-nav,.mobile-nav,.tab-bar,[role=tablist]';
function identity(link){try{const u=new URL(link.href);return Object.entries(catalog.apps).find(([key,a])=>{const target=new URL(a.url);return u.hostname===target.hostname&&(key!=='field'||!/^#\/?surveyor/.test(u.hash))&&(key!=='surveyor'||/^#\/?surveyor/.test(u.hash));})?.[1];}catch{return null;}}
function iconFor(app,element){
 if(app.lightIcon===app.darkIcon)return app.icon;
 const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
 for(let el=element;el;el=el.parentElement){const color=getComputedStyle(el).backgroundColor;ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const [r,g,b,a]=ctx.getImageData(0,0,1,1).data;if(a>230)return (.2126*r+.7152*g+.0722*b)>128?app.lightIcon:app.darkIcon;}
 return document.documentElement.dataset.theme==='light'?app.lightIcon:app.darkIcon;
}
function refresh(){
 for(const img of document.querySelectorAll('img[src]')){if(img.closest(blocked))continue;const path=new URL(img.src,location.href).pathname;const next=catalog.aliases[path];if(next&&path!==next)img.src=next;}
 for(const a of document.querySelectorAll('a[href]')){
  if(a.closest(blocked)||a.matches('[data-bottom-route],[data-menu-route]'))continue;
  const app=identity(a);if(!app)continue;
  if(new URL(a.href).origin===location.origin&&!a.getAttribute('href').startsWith('http'))continue;
  let img=a.querySelector(':scope>img,:scope>.tool-icon>img,:scope>.action-icon>img');
  if(!img){const old=a.querySelector(':scope>svg,:scope>.tool-icon,:scope>.action-icon');if(!old)continue;img=document.createElement('img');img.alt='';img.width=28;img.height=28;img.className='wata-app-identity';old.replaceWith(img);}
  const wanted=iconFor(app,a);if(new URL(img.src||location.href).pathname!==wanted)img.src=wanted;
 }
}
let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-theme','data-appearance','class','style']});refresh();
