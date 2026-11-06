// QA-only observer and phase-return policy. It never moves the page.
export async function captureBudgetReturn(page, destination, kind, prior = null) {
  const target = destination ? await destination.elementHandle() : null;
  if (destination && !target) throw Error('Budget return destination is missing');
  const parent = target ? await target.evaluateHandle(el => el.offsetParent) : null;
  const domParent = target ? await target.evaluateHandle(el => el.parentElement) : null;
  const chain = target ? await target.evaluateHandle(el => { const out=[]; for(let p=el.parentElement;p;p=p.parentElement)out.push(p); return out; }) : null;
  const value = await page.evaluate(({el,kind}) => {
    const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,docX:r.x+scrollX,docY:r.y+scrollY}; };
    const top=[],bottom=[];
    for(const x of [innerWidth*.5,6,innerWidth-6]){
      for(const e of document.elementsFromPoint(x,1)){const s=getComputedStyle(e),r=e.getBoundingClientRect();if(['fixed','sticky'].includes(s.position)&&r.height>0&&r.height<=innerHeight*.4&&r.top<=2&&r.bottom>0)top.push({tag:e.tagName,id:e.id,rect:rect(e)});}
      for(const e of document.elementsFromPoint(x,innerHeight-2)){const s=getComputedStyle(e),r=e.getBoundingClientRect();if(['fixed','sticky'].includes(s.position)&&r.height>0&&r.height<=innerHeight*.4&&r.bottom>=innerHeight-2&&r.top<innerHeight)bottom.push({tag:e.tagName,id:e.id,rect:rect(e)});}
    }
    const root=document.scrollingElement;
    const out={at:Date.now(),kind,viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},maxScrollY:Math.max(0,root.scrollHeight-root.clientHeight),chrome:{top:Math.max(0,...top.map(v=>v.rect.bottom)),bottom:Math.max(0,...bottom.map(v=>innerHeight-v.rect.y)),topObserved:top,bottomObserved:bottom},target:null,ancestors:[],clips:[]};
    if(!el)return out;
    const r=rect(el),style=getComputedStyle(el),p=el.offsetParent,pr=p?rect(p):null;
    for(let a=el.parentElement;a;a=a.parentElement){
      const s=getComputedStyle(a),ar=rect(a),v={tag:a.tagName,id:a.id,position:s.position,transform:s.transform,scrollTop:a.scrollTop,scrollLeft:a.scrollLeft,isRootScroller:a===root,rect:ar,clientTop:a.clientTop,clientLeft:a.clientLeft,clientWidth:a.clientWidth,clientHeight:a.clientHeight,overflowX:s.overflowX,overflowY:s.overflowY};
      out.ancestors.push(v);
      const clipX=['auto','scroll','hidden','clip','overlay'].includes(s.overflowX),clipY=['auto','scroll','hidden','clip','overlay'].includes(s.overflowY);
      if((clipX||clipY)&&a!==root)out.clips.push({tag:v.tag,id:v.id,position:s.position,transform:s.transform,clipX,clipY,left:ar.docX+a.clientLeft,right:ar.docX+a.clientLeft+a.clientWidth,top:ar.docY+a.clientTop,bottom:ar.docY+a.clientTop+a.clientHeight});
    }
    const lead=kind==='completion'?Math.min(r.height,160):r.height,x=r.x+r.width/2,y=r.y+lead/2,hit=document.elementFromPoint(x,y);
    out.target={rect:r,connected:el.isConnected,focused:el===document.activeElement,enabled:!el.matches(':disabled,[aria-disabled="true"]'),transform:style.transform,visible:style.visibility==='visible'&&style.display!=='none',centerHit:hit===el||el.contains(hit),hitPoint:{x,y},label:el.getAttribute('aria-label'),text:el.textContent?.trim(),offsetTop:el.offsetTop,parent:pr?{rect:pr,transform:getComputedStyle(p).transform,clientTop:p.clientTop,scrollTop:p.scrollTop}:null,anchorY:kind==='slot'&&p?pr.docY+p.clientTop+el.offsetTop-p.scrollTop:r.docY,anchorMethod:kind==='slot'?'untransformed-offset-parent':'untransformed-rect-top'};
    return out;
  },{el:target,kind});
  if(prior&&prior.target&&target){
    value.sameDestination=await target.evaluate((el,old)=>el===old,prior.target);
    value.sameParent=await target.evaluate((el,old)=>el.offsetParent===old,prior.parent);
    value.sameDOMParent=await target.evaluate((el,old)=>el.parentElement===old,prior.domParent);
    value.sameAncestors=await target.evaluate((el,old)=>{const now=[];for(let p=el.parentElement;p;p=p.parentElement)now.push(p);return now.length===old.length&&now.every((p,i)=>p===old[i]);},prior.chain);
  }
  return {value,target,parent,domParent,chain};
}

export function assessBudgetPhaseReturn(before, after, {kind = 'slot'} = {}) {
  const result={allowed:false,mode:null,reason:null,kind,counterfactualGeometryOnly:true};
  const fail=reason=>({...result,reason});
  const clamp=y=>Math.max(0,Math.min(after.maxScrollY,y));
  if(!['slot','candidate','completion'].includes(kind))return fail('BUDGET_RETURN_UNSUPPORTED');
  if(before.viewport.width!==after.viewport.width||before.viewport.height!==after.viewport.height||before.scroll.x!==after.scroll.x)return fail('BUDGET_RETURN_VIEWPORT');
  const t=after.target;
  if(!t)return fail('BUDGET_RETURN_UNREADABLE');
  const r=t.rect,lead=kind==='completion'?Math.min(r.height,160):r.height,docBottom=r.docY+lead;
  const B=clamp(before.scroll.y),low=Math.max(0,docBottom-(after.viewport.height-after.chrome.bottom)),high=Math.min(after.maxScrollY,r.docY-after.chrome.top);
  Object.assign(result,{B,interval:{low,high},oldClampedWindowReadable:low<=B&&B<=high,actualScroll:after.scroll.y});
  if(!t.connected||!t.enabled||!t.visible||!t.centerHit)return fail('BUDGET_RETURN_UNREADABLE');
  const insideClips=after.clips.every(c=>(!c.clipX||(r.docX>=c.left&&r.docX+r.width<=c.right))&&(!c.clipY||(r.docY>=c.top&&docBottom<=c.bottom)));
  const xFits=r.x>=0&&r.right<=after.viewport.width;
  const yFits=r.y>=after.chrome.top&&r.y+lead<=after.viewport.height-after.chrome.bottom;
  if(!(r.width>0&&r.height>0&&xFits&&yFits&&insideClips))return fail('BUDGET_RETURN_UNREADABLE');
  if(kind==='completion'){
    if(result.oldClampedWindowReadable&&after.scroll.y!==B)return fail('BUDGET_RETURN_EXTRA_MOVEMENT');
    return {...result,allowed:true,mode:result.oldClampedWindowReadable?'new-completion-held':'new-completion-lead',reason:null,leadHeight:lead};
  }
  if(!after.sameDestination||!after.sameParent||!after.sameDOMParent||!after.sameAncestors)return fail('BUDGET_RETURN_IDENTITY');
  if(!t.focused)return fail('BUDGET_RETURN_FOCUS');
  if(before.chrome.top!==after.chrome.top||before.chrome.bottom!==after.chrome.bottom)return fail('BUDGET_RETURN_CHROME_CHANGED');
  if(after.ancestors.some(a=>a.transform!=='none')||after.clips.some(c=>['fixed','sticky'].includes(c.position)))return fail('BUDGET_RETURN_UNSUPPORTED');
  const oldNested=before.ancestors.filter(a=>!a.isRootScroller),newNested=after.ancestors.filter(a=>!a.isRootScroller);
  if(oldNested.length!==newNested.length||oldNested.some((a,i)=>a.scrollTop!==newNested[i].scrollTop||a.scrollLeft!==newNested[i].scrollLeft))return fail('BUDGET_RETURN_NESTED_SCROLL');
  if(kind==='slot'&&(!before.target?.parent||!t.parent||before.target.parent.transform!=='none'||t.parent.transform!=='none'))return fail('BUDGET_RETURN_ANCHOR');
  if(kind==='candidate'&&(!before.target||before.target.transform!=='none'||t.transform!=='none'||before.target.rect.height!==r.height))return fail('BUDGET_RETURN_ANCHOR');
  const atB=low<=B&&B<=high,anchorDelta=t.anchorY-before.target.anchorY,anchorScroll=clamp(before.scroll.y+anchorDelta);
  Object.assign(result,{B,interval:{low,high},oldClampedWindowReadable:atB,anchorDelta,anchorScroll,actualScroll:after.scroll.y});
  if(atB){
    if(after.scroll.y===B)return {...result,allowed:true,mode:'held-or-required-clamp'};
    if(after.scroll.y===anchorScroll)return {...result,allowed:true,mode:'exact-layout-anchor'};
    return fail('BUDGET_RETURN_EXTRA_MOVEMENT');
  }
  if(low<=after.scroll.y&&after.scroll.y<=high)return {...result,allowed:true,mode:'bounded-visible-return'};
  return fail('BUDGET_RETURN_UNREADABLE');
}
