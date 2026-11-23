/** Opt-in fixed phone header. No routing, storage, meta-tag or dock changes.
 * Hosts MUST select their own flow strategy; do not mount on an existing fixed
 * header with a second spacer. Keep the original node and all event listeners.
 */
export function mountFixedHeader({header, media='(max-width: 700px)', reserveSpace=true,
 safeAreaIncluded=true, background='var(--wata-frame, var(--frame-fill, var(--wf-surface)))',
 window:win=globalThis.window}={}) {
 if(!header || !win)throw new TypeError('A header and window are required');
 if(header.hasAttribute('data-wata-fixed-header'))throw new Error('Header already mounted');
 const doc=header.ownerDocument, query=win.matchMedia(media);
 const props=['position','top','left','right','width','max-width','margin','border-radius','padding-top','background-color','z-index','box-sizing'];
 let saved,spacer,observer,active=false,closed=false;
 const rect=()=>header.getBoundingClientRect();
 function measure(){if(active&&spacer)spacer.style.height=`${Math.ceil(rect().height)}px`;}
 function stop(){
  if(!active)return;active=false;observer?.disconnect();spacer?.remove();spacer=null;
  for(const [p,v,priority]of saved){if(v)header.style.setProperty(p,v,priority);else header.style.removeProperty(p);}
  header.removeAttribute('data-wata-fixed-header');
 }
 function start(){
  if(active||closed)return;
  const s=win.getComputedStyle(header);
  if(reserveSpace&&s.position==='fixed')throw new Error('Existing fixed header requires host-owned clearance (reserveSpace:false)');
  const probe=doc.createElement('i');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';doc.body.append(probe);
  const safe=parseFloat(win.getComputedStyle(probe).paddingTop)||0;probe.remove();
  const pad=Math.max(0,(parseFloat(s.paddingTop)||0)-(safeAreaIncluded?safe:0));
  saved=props.map(p=>[p,header.style.getPropertyValue(p),header.style.getPropertyPriority(p)]);
  if(reserveSpace){
   spacer=doc.createElement('div');spacer.setAttribute('data-wata-header-space','');spacer.setAttribute('aria-hidden','true');
   spacer.style.cssText='pointer-events:none;visibility:hidden;flex-shrink:0;min-width:0;';
   spacer.style.gridColumn=s.gridColumn;spacer.style.gridRow=s.gridRow;header.before(spacer);
  }
  const values={position:'fixed',top:'0px',left:'0px',right:'0px',width:'auto','max-width':'none',margin:'0px','border-radius':'0px','padding-top':`calc(${pad}px + env(safe-area-inset-top, 0px))`,'background-color':background,'z-index':s.zIndex==='auto'?'30':s.zIndex,'box-sizing':'border-box'};
  for(const [p,v]of Object.entries(values))header.style.setProperty(p,v,'important');
  active=true;header.setAttribute('data-wata-fixed-header','');measure();
  observer=new win.ResizeObserver(measure);observer.observe(header);
 }
 function update(){if(query.matches)start();else stop();}
 query.addEventListener('change',update);
 try{update();}catch(error){query.removeEventListener('change',update);stop();throw error;}
 return {get active(){return active},destroy(){closed=true;query.removeEventListener('change',update);stop();}};
}
