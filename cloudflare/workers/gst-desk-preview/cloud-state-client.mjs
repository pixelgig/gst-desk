// Browser-side compatibility adapter for the EXISTING GST Desk localStorage workspaces.
// The authoritative initial values come from D1, injected by the authenticated Worker.
function gstDeskCloudClient(){
  'use strict';
  const bootstrap=window.__GST_DESK_BOOTSTRAP__||{items:[]};
  const cache=new Map(),revisions=new Map(),pending=new Map();
  const errors=new Map();
  for(const r of (bootstrap.items||[])){
    cache.set(r.key,String(r.value));
    revisions.set(r.key,r.revision);
  }
  const tracked=k=>/^(gstdesk|gst-desk|gstDesk|gst_desk)/i.test(String(k));
  let running=false,panel=null;
  function show(message,isError){
    if(!document.body){document.addEventListener('DOMContentLoaded',()=>show(message,isError),{once:true});return;}
    if(!panel){
      panel=document.createElement('div');panel.id='gstdesk-cloud-status';
      panel.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#eff6ff;color:#1e3a8a;padding:9px 13px;font:14px sans-serif;text-align:center;box-shadow:0 -1px 7px #aaa';
      document.body.appendChild(panel);
    }
    panel.replaceChildren(document.createTextNode(message+' '));
    panel.style.background=isError?'#fee2e2':'#eff6ff';
    panel.style.color=isError?'#991b1b':'#1e3a8a';
    if(isError){
      const btn=document.createElement('button');btn.textContent='Download unsaved backup';
      btn.style.marginLeft='12px';btn.onclick=exportSnapshot;panel.appendChild(btn);
      const retry=document.createElement('button');retry.textContent='Retry cloud save';
      retry.style.marginLeft='8px';retry.onclick=()=>{errors.clear();sync();};panel.appendChild(retry);
    }
  }
  function exportSnapshot(){
    const obj={type:'gstdesk-unsaved-cloud-state',exportedAt:new Date().toISOString(),items:Object.fromEntries(cache)};
    const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);
    a.download='gstdesk-emergency-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  }
  async function sync(){
    if(running || errors.size)return;
    running=true;
    try{
      while(pending.size){
        const [key,value]=pending.entries().next().value;
        const rev=revisions.get(key)||0;
        if(value===null&&rev===0){pending.delete(key);continue;}
        try{
          const res=await fetch('/api/state/'+encodeURIComponent(key),{
            method:value===null?'DELETE':'PUT',
            headers:{'content-type':'application/json','X-GST-Desk-Write':'1'},
            body:JSON.stringify({value,expectedRevision:rev}),cache:'no-store'
          });
          const data=await res.json();
          if(!res.ok)throw Error(data.error||'cloud_save_failed');
          revisions.set(key,data.revision);
          if(pending.get(key)===value)pending.delete(key);
        }catch(e){errors.set(key,e.message);show('Cloud save failed ('+e.message+'). Do not close this page.',true);break;}
      }
      if(!errors.size)show('GST Desk cloud data saved to Cloudflare D1.',false);
    }finally{running=false;}
  }
  function setItem(k,v){
    const key=String(k),value=String(v);
    if(!tracked(key))throw Error('Unsupported storage key');
    if(value.length>524288)throw Error('Cloud storage item exceeds 512 KB');
    cache.set(key,value);pending.set(key,value);
    if(!errors.size)sync();
  }
  window.GSTDeskState={
    getItem:k=>cache.get(String(k))??null,
    setItem,
    removeItem:k=>{const key=String(k);if(!tracked(key))return;cache.delete(key);pending.set(key,null);if(!errors.size)sync();},
    key:i=>Array.from(cache.keys())[i]??null,
    get length(){return cache.size;},
    clear:()=>{throw Error('Bulk deletion of cloud records is disabled');}
  };
  window.addEventListener('beforeunload',e=>{
    if(pending.size || errors.size || running){e.preventDefault();e.returnValue='GST Desk has unsaved changes';}
  });
  document.addEventListener('DOMContentLoaded',()=>{
    show('GST Desk connected to Cloudflare D1.',false);
    const meesho=document.getElementById('meesho');
    if(meesho){
      const info=document.createElement('div');
      info.id='gstdesk-d1-september-import';
      info.className='card';
      info.style.cssText='padding:14px;margin:12px 0;border:1px solid #dbeafe;border-radius:12px;';
      const title=document.createElement('h3');
      title.textContent='September 2026 · Cloudflare D1 records';
      info.appendChild(title);
      const details=document.createElement('p');
      details.textContent='Loading verified historical Meesho records from cloud database…';
      info.appendChild(details);
      meesho.insertBefore(info,meesho.children[1]||null);
      fetch('/api/meesho/summary?period=092026',{cache:'no-store'})
        .then(async r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})
        .then(d=>{
          const p=d.report||{},i=d.invoices||{},f=d.filedGstr1||{};
          const rs=c=>('₹'+(Number(c||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2}));
          details.textContent=(p.salesRows||0)+' sales, '+(p.returnRows||0)+' return; '+
            (i.total||0)+' invoice/credit-note records ('+(i.crossPeriod||0)+' dated outside September). '+
            'Filed GSTR-1 taxable: '+rs(f.netTaxablePaise)+
            '; reported net taxable after per-row rounding: '+rs(p.netTaxablePaise)+
            '. Historical import only, not live Meesho synchronization. Original PDF files remain in your ZIP backup.';
        })
        .catch(()=>{details.textContent='Historical D1 summary currently unavailable. Existing records have not been changed.';});
    }
    const old=[];
    try{for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(tracked(k)&&!cache.has(k))old.push(k);
    }}catch{}
    if(!old.length)return;
    const importBtn=document.createElement('button');
    importBtn.textContent='Import '+old.length+' old browser records';
    importBtn.style.cssText='margin-left:12px;cursor:pointer;padding:5px;border-radius:5px';
    panel.appendChild(importBtn);
    importBtn.onclick=async()=>{
      if(!confirm('Copy '+old.length+' old GST Desk browser-storage keys into Cloudflare D1? Existing cloud records will NOT be overwritten.'))return;
      importBtn.disabled=true;
      let done=0,failed=0;
      for(const key of old){
        const value=localStorage.getItem(key);
        if(value===null)continue;
        setItem(key,value);
        while(running && !errors.size)await new Promise(r=>setTimeout(r,60));
        if(errors.size){failed++;break;}
        done++;
      }
      show('Browser migration: '+done+' keys saved, '+failed+' failures. Reload to view cloud data.',failed>0);
      if(!failed && !pending.size)location.reload();
    };
  });
}
export const cloudClientJS='('+gstDeskCloudClient.toString()+')();';
