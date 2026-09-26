// App destinations use the approved artwork. Action and workflow glyphs stay semantic.
const folder=new URL('./',import.meta.url);
const hosts={
 'wata.cleanwata.org':'wata','toolkit.cleanwata.org':'wata','app.cleanwata.org':'wata','wata-tech-hub.pages.dev':'wata',
 'registry.cleanwata.org':'registry','wata-registry.pages.dev':'registry',
 'command.cleanwata.org':'command','wata-command-center.pages.dev':'command',
 'training.cleanwata.org':'training','wata-training-hub.pages.dev':'training',
 'surveyor.cleanwata.org':'field','wata-surveyor.pages.dev':'field','wata-field-app.pages.dev':'field',
 'map.cleanwata.org':'impact-map'
};
function setIcon(control,key){
 const wanted=new URL(key+'/icon-192.png',folder).href;
 let icon=control.querySelector(':scope > img,:scope > svg,:scope > [data-icon],:scope > .bottom-nav-icon,:scope > .action-icon,:scope > .nav-icon,:scope > .tool-icon');
 if(icon?.tagName==='IMG'&&icon.src===wanted)return;
 if(icon?.querySelector('img')?.src===wanted)return;
 const img=document.createElement('img');img.src=wanted;img.alt='';img.width=28;img.height=28;img.className='wata-app-identity';img.setAttribute('aria-hidden','true');
 if(icon){if(icon.matches('.bottom-nav-icon,.action-icon,.nav-icon,.tool-icon'))icon.replaceChildren(img);else icon.replaceWith(img);}else control.prepend(img);
}
function refresh(){
 for(const link of document.querySelectorAll('a[href]')){let url;try{url=new URL(link.href);}catch{continue;}let key=hosts[url.hostname];if(!key)continue;
  if(key==='field'&&/^#\/?(?:surveyor|surveys)(?:\/|$)/.test(url.hash))key='surveyor';
  // A relative link within the same app is a workflow link, not another app launch.
  if(url.origin===location.origin&&!link.getAttribute('href').startsWith('http'))continue;
  setIcon(link,key);
 }
 for(const control of document.querySelectorAll('[data-menu-route="surveyor"],[data-menu-route="surveys"],[data-bottom-route="surveyor"],[data-bottom-route="surveys"]'))setIcon(control,'surveyor');
 for(const control of document.querySelectorAll('[data-menu-route="training"],[data-bottom-route="training"]'))setIcon(control,'training');
 for(const control of document.querySelectorAll('#quick-map-header,#quick-map-drawer,[data-quick-map]'))setIcon(control,'impact-map');
}
let scheduled=false;const observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh();});}});
refresh();observer.observe(document.body,{childList:true,subtree:true});
