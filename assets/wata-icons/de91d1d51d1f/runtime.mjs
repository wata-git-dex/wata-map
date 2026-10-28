import catalog from '/assets/wata-icons/de91d1d51d1f/catalog.mjs';
const blocked='#bottomNav,.bottom-nav,.mobile-nav,.tab-bar,[role=tablist]';
function identity(link){try{const u=new URL(link.href);return Object.entries(catalog.apps).find(([key,a])=>{const target=new URL(a.url);return u.hostname===target.hostname&&(key!=='field'||!/^#\/?surveyor/.test(u.hash))&&(key!=='surveyor'||/^#\/?surveyor/.test(u.hash));})?.[1];}catch{return null;}}
function iconFor(app,element){
 const picker=element?.closest('.profile-toolkit,.toolkit-grid,[data-app-picker]');
 const identitySurface=element?.closest('header,.topbar,.brand,[data-launch-screen],.access-card,.login-card');
 if(picker||(element?.closest('a[href^="http"]')&&!identitySurface))return app.icon;
 if(app.lightIcon===app.darkIcon)return app.icon;
 const theme=document.documentElement.dataset.theme||document.body?.dataset.theme;
 if(theme==='light'||theme==='dark')return theme==='light'?app.lightIcon:app.darkIcon;
 const ctx=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
 for(let el=element;el;el=el.parentElement){const color=getComputedStyle(el).backgroundColor;ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);const [r,g,b,a]=ctx.getImageData(0,0,1,1).data;if(a>230)return (.2126*r+.7152*g+.0722*b)>128?app.lightIcon:app.darkIcon;}
 return document.documentElement.dataset.theme==='light'?app.lightIcon:app.darkIcon;
}
function imageIdentity(img){
 const path=new URL(img.src,location.href).pathname;
 const resolved=catalog.aliases[path]||path;
 const legacyVariant=resolved.match(/\/(surveyor-dark|training-dark)\/icon-\d+\.png$/)?.[1];
 if(legacyVariant)return catalog.apps[legacyVariant.replace('-dark','')];
 return Object.values(catalog.apps).find(app=>{
  if([app.icon,app.lightIcon,app.darkIcon].includes(resolved))return true;
  const variants=[app.variant,app.lightSurfaceVariant,app.darkSurfaceVariant];
  return variants.some(v=>resolved.includes('/'+v+'/icon-')&&/\/icon-\d+\.png$/.test(resolved)) && /\/(?:wata-icons|app-icons)\//.test(resolved);
 });
}
function refresh(){
 for(const img of document.querySelectorAll('img[src]')){if(img.closest(blocked))continue;const path=new URL(img.src,location.href).pathname;const app=imageIdentity(img);const next=app?iconFor(app,img.parentElement):catalog.aliases[path];if(next&&path!==next)img.src=next;if(app){if(img.style.borderRadius!=='22%')img.style.borderRadius='22%';if(img.style.objectFit!=='cover')img.style.objectFit='cover';}}
 for(const a of document.querySelectorAll('a[href]')){
  if(a.closest(blocked)||a.matches('[data-bottom-route],[data-menu-route]'))continue;
  const app=identity(a);if(!app)continue;
  if(new URL(a.href).origin===location.origin&&!a.getAttribute('href').startsWith('http'))continue;
  let img=a.querySelector(':scope>img,:scope>.tool-icon>img,:scope>.action-icon>img');
  if(!img){const old=a.querySelector(':scope>svg,:scope>.tool-icon,:scope>.action-icon');if(!old)continue;img=document.createElement('img');img.alt='';img.width=28;img.height=28;img.className='wata-app-identity';old.replaceWith(img);}
  const wanted=iconFor(app,a);if(new URL(img.src||location.href).pathname!==wanted)img.src=wanted;if(img.style.borderRadius!=='22%')img.style.borderRadius='22%';if(img.style.objectFit!=='cover')img.style.objectFit='cover';
 }
}
let queued=false;new MutationObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-theme','data-appearance','class','style','src']});refresh();
