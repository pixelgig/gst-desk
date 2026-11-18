// Manual-only shipping dashboard for the existing Cloudflare D1 GST Desk.
// No PDF uploads, scheduled refresh, tracking-on-load, or invented delivery status.
function gstDeskShippingClient(){
 'use strict';
 const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
 const asMoney=x=>'₹'+(Number(x||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
 const formatStatus=s=>({awaiting_awb:'Awaiting AWB',not_checked:'AWB saved · Not checked',in_transit:'In transit (verified)',out_for_delivery:'Out for delivery (verified)',delivered:'Delivered (verified)',returned:'Returned to seller (verified)',delivery_failed:'Delivery failed (verified)',needs_review:'Needs review'})[s]||'Unknown';
 const safeRequest=async(url,options)=>{
   const res=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
   const body=await res.json();if(!res.ok)throw Error(body.error||'Request failed');
   return body;
 };
 const submit=(url,method,body)=>safeRequest(url,{method,headers:{'content-type':'application/json','X-GST-Desk-Write':'1'},body:JSON.stringify(body)});
 const status=el('p','nv-track-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const btn=(label,fn,css='')=>{const b=el('button','nv-track-button '+css,label);b.type='button';b.onclick=fn;return b};
 let container,tracker,rows,listFilter,activeOverview=null,shippingCounts=null,busy=false;
 let snapshot=null,lastFetchedLabel=null,refreshBtn=null,loading=false;
 const cacheKey='gstdesk-ui:shipping:v3:'+String(window.__GST_DESK_CACHE_SCOPE__||'private-owner');
 const localRead=()=>{try{const raw=localStorage.getItem(cacheKey);const val=raw?JSON.parse(raw):null;return val&&Array.isArray(val.data?.items)&&val.data?.counts&&Number.isFinite(Date.parse(val.fetchedAt))?val:null}catch{return null}};
 const localSave=x=>{try{localStorage.setItem(cacheKey,JSON.stringify(x))}catch{ /* Browsers with blocked storage still work via D1 */ }};
 const fmtTime=t=>{try{return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(t))+' IST'}catch{return String(t||'Unknown')}};
 const checkedSnapshot=val=>val&&Array.isArray(val.data?.items)&&val.data?.counts&&Number.isFinite(Date.parse(val.fetchedAt))?val:null;
 const moveToValmo=()=>document.querySelector('nav.tabs button[data-tab="valmo"]')?.click();
 const styles=el('style');
 styles.textContent='#nv-shipping-cards{margin:14px 0 22px}#nv-shipping-cards h3{font-size:17px;margin:0 0 10px;color:#1e3a2e}#nv-shipping-cards .nv-shipping-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:10px}#nv-shipping-cards .nv-shipping-card{background:#fff;border:1px solid #dfebdf;border-radius:13px;padding:15px;text-align:left;cursor:pointer;color:#1b3830;display:flex;flex-direction:column;gap:6px;min-height:103px}#nv-shipping-cards .nv-shipping-card strong{font-size:22px}#nv-shipping-cards .nv-shipping-card small{font-size:11px;color:#697a72}#nv-shipping-cards .nv-shipping-card:focus-visible{outline:3px solid #74bc99}#nv-shipping-tracker{border:1px solid #dfe9e2;border-radius:13px;padding:20px;margin:12px 0;background:#fff;color:#24382f}#nv-shipping-tracker h2{margin:0 0 7px}#nv-shipping-tracker p{color:#5e7569;font-size:13px}#nv-shipping-tracker .nv-track-summary{background:#f2f9f5;padding:11px;border-radius:9px;margin:10px 0}#nv-shipping-tracker .nv-track-row{border:1px solid #e2ebe4;border-radius:12px;padding:14px;margin:9px 0}#nv-shipping-tracker .nv-track-row strong{display:block}#nv-shipping-tracker .nv-track-row small{color:#708077}#nv-shipping-tracker .nv-track-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}#nv-shipping-tracker input,#nv-shipping-tracker select{padding:9px 10px;border:1px solid #cdded4;border-radius:7px;max-width:320px;width:100%;background:white;color:#173c2e}#nv-shipping-tracker .nv-track-button{background:#137a63;border:1px solid #137a63;border-radius:8px;color:#fff;padding:9px 13px;cursor:pointer}#nv-shipping-tracker .nv-track-button:disabled{opacity:.45;cursor:not-allowed}#nv-shipping-tracker .nv-track-secondary{background:#eaf6ef;color:#145440;border-color:#d7eade}#nv-shipping-tracker .nv-track-detail{background:#f9fcfa;padding:12px;border-radius:8px;margin:10px 0}#nv-shipping-tracker .nv-track-note{font-size:12px;color:#697b6e}#nv-shipping-tracker .nv-track-error{color:#a42525}';
 document.head.append(styles);
 const toInt=n=>Number(n||0);
 const summaryMarkup=async()=>{
   try{const j=await safeRequest('/api/shipping/summary');shippingCounts=j.counts;renderDashboard();renderTrackerCounts();}
   catch(e){if(status)status.textContent='Shipment summary not available: '+e.message}
 };
 const card=(label,value,sub)=>{const b=el('button','nv-shipping-card');b.type='button';b.append(el('small','',label),el('strong','',value),el('small','',sub||'Tap to view shipments'));b.onclick=moveToValmo;return b};
 function renderDashboard(){
   if(!activeOverview||!shippingCounts)return;
   const root=document.querySelector('#nv-overview');
   if(!root)return;
   // Insert alongside existing overview, never inside the React application.
   let target=root.querySelector('#nv-shipping-cards');
   if(!target){target=el('div');target.id='nv-shipping-cards';const grid=root.querySelector('.nv-stats');if(grid)grid.insertAdjacentElement('afterend',target);else root.append(target)}
   target.replaceChildren(el('h3','','Order & delivery records (manual status checks)'));
   const m=(activeOverview.monthly||[]),money=m.reduce((sum,x)=>sum+toInt(x.netPaise),0);
   const returns=m.reduce((sum,x)=>sum+toInt(x.creditNotes),0),c=shippingCounts;
   const g=el('div','nv-shipping-grid');
   [
     ['Known invoiced orders',c.known_orders,'Verified by imported invoices'],
     ['Invoiced this month',c.invoiced_orders_this_month,'Order dates from invoices, not live feed'],
     ['Returns / credit notes',returns,'Recorded reversals; carrier status separate'],
     ['Delivered',c.verified_delivered,'Carrier-confirmed, with delivery date'],
     ['In transit',c.verified_in_transit,'Only carrier-confirmed status'],
     ['AWBs verified from labels',c.total_labels||0,'Nividhi orders only'],
     ['Awaiting tracking ID',c.awaiting_awb,'Invoiced orders without labels'],
     ['Net invoiced sales',asMoney(money),'Not actual settlement or cash received'],
     ['Profit','Not calculated','Needs purchase costs and marketplace fees']
   ].forEach(x=>g.append(card(...x)));
   target.append(g);
   target.append(el('p','nv-track-note','These figures represent imported invoice-linked orders only. Unknown delivery statuses are not counted as in transit or delivered.'));
 }
 function renderTrackerCounts(){
   if(!tracker||!shippingCounts)return;
   let div=tracker.querySelector('.nv-track-summary');
   if(!div){div=el('p','nv-track-summary');tracker.insertBefore(div,tracker.querySelector('.nv-track-actions'))}
   const c=shippingCounts;
   div.textContent=c.known_orders+' invoiced orders · '+(c.total_labels||0)+' verified shipping-label AWBs · '+c.awaiting_awb+' invoiced orders missing AWB · '+c.verified_delivered+' verified delivered · '+c.verified_in_transit+' in transit · '+c.eligible_for_check+' eligible for manual Valmo checks.';
 }
 async function checkStatus(mode,suborderId){
   if(busy)return;busy=true;for(const b of tracker.querySelectorAll('button'))b.disabled=true;
   status.textContent='Checking carrier only because you requested it. Unverified results will not overwrite delivery records.';
   try{
     const r=await submit('/api/shipping/check','POST',mode==='one'?{mode,suborderId}:{mode:'pending'});
     const saved=r.results.filter(x=>x.saved).length,errors=r.results.length-saved;
     status.textContent='Selected '+r.selected+' shipments. '+saved+' verified updates saved, '+errors+' unavailable/unverified. '+r.waitingForAwb+' orders still need AWB. No automatic checks.';
     await fetchOrders(true);
   }catch(e){status.textContent='Tracking check did not complete: '+e.message+'. No delivery status was invented.'}
   finally{busy=false;for(const b of tracker.querySelectorAll('button'))b.disabled=false}
 }
 async function addAwb(shipment,input){
   if(busy)return;const awb=input.value.trim().toUpperCase();
   if(!/^VL[A-Z0-9]{8,25}$/.test(awb)){status.textContent='Enter the Valmo AWB printed on the shipping label (VL…).';return}
   if(!confirm('Confirm '+awb+' is printed on the actual Meesho shipping label for order '+shipment.suborderId+'?'))return;
   busy=true;
   try{await submit('/api/shipping/orders/'+encodeURIComponent(shipment.suborderId),'PUT',{awb,source:'seller_shipping_label'});status.textContent='AWB saved in D1. Status was NOT checked automatically.';await fetchOrders(true)}
   catch(e){status.textContent='Cannot save AWB: '+e.message}
   finally{busy=false}
 }
 function detail(row){
   const dl=el('div','nv-track-detail');
   dl.append(el('p','','Invoice: '+row.invoiceNo+' · Order: '+row.suborderId),el('p','','Invoice value: '+asMoney(row.invoiceValuePaise)+' · Invoice date: '+row.invoiceDate));
   dl.append(el('p','','Courier: '+row.carrier+' · AWB: '+(row.awb||'Not recorded')));
   dl.append(el('p','','Verified status: '+formatStatus(row.status)));
   dl.append(el('p','','Delivered date (IST): '+(row.deliveredDateIST||'Not verified')));
   dl.append(el('p','','Last checked: '+(row.lastCheckedAt||'Never')));
   if(row.estimatedDeliveryText)dl.append(el('p','','Estimated delivery (not actual): '+row.estimatedDeliveryText));
   if(row.lastEventAt)dl.append(el('p','','Latest verified carrier event: '+row.lastEventAt));
   if(row.statusDescription)dl.append(el('p','','Carrier says: '+row.statusDescription));
   const events=row.trackingEvents||[];
   if(events.length){dl.append(el('strong','','Stored carrier timeline'));events.forEach(e=>dl.append(el('p','',e.label+' · '+(e.date||e.timeText||'Date not verified'))))}
   dl.append(el('p','nv-track-note','No PDF or raw tracking response is stored. Delivery dates are saved only when verified from dated carrier events.'));
   return dl;
 }
 function drawOrders(items){
   rows.replaceChildren();
   if(!items.length){rows.append(el('p','','No orders match this filter.'));return}
   for(const order of items){
     const box=el('article','nv-track-row');
     box.append(el('strong','','Order '+order.suborderId),el('small','',order.invoiceNo+' · '+order.orderDate+' · '+asMoney(order.invoiceValuePaise)));
     box.append(el('p','',formatStatus(order.status)+' · '+(order.awb||'AWB not available in the provided Nividhi shipping labels')+(order.deliveredDateIST?' · Delivered '+order.deliveredDateIST:'')));
     if(order.estimatedDeliveryText)box.append(el('p','nv-track-note','Carrier ETA: '+order.estimatedDeliveryText+' (estimate, not delivery confirmation)'));
     const actions=el('div','nv-track-actions'),showDetail=btn('View shipment details',()=>{const existing=box.querySelector('.nv-track-detail');if(existing)existing.remove();else box.append(detail(order))},'nv-track-secondary');
     actions.append(showDetail);
     if(order.status!=='delivered'){
       if(!order.awb){
         const input=el('input');input.placeholder='Enter VL… from shipping label';input.setAttribute('aria-label','AWB for '+order.suborderId);input.maxLength=27;input.hidden=true;
         const save=btn('Save AWB',()=>addAwb(order,input));save.hidden=true;
         const add=btn('Add AWB from a new label',()=>{input.hidden=false;save.hidden=false;add.hidden=true;input.focus()},'nv-track-secondary');
         actions.append(add,input,save);
       }else if(order.carrier==='valmo')actions.append(btn('Check this shipment',()=>checkStatus('one',order.suborderId)));
       else actions.append(el('span','nv-track-note','Delhivery AWB recorded; live Delhivery tracking not integrated.'));
     }
     box.append(actions);rows.append(box);
   }
 }
  function showSnapshot(){
   if(!snapshot||!rows)return false;
   shippingCounts=snapshot.data.counts;renderDashboard();renderTrackerCounts();
   const all=snapshot.data.items||[],filter=listFilter?.value||'all';
   const filtered=all.filter(x=>filter==='all'||(filter==='awaiting_awb'&&!x.awb)||(filter==='pending'&&x.awb&&x.status!=='delivered'&&x.status!=='returned')||(filter==='delivered'&&x.status==='delivered')||(filter==='returned'&&x.status==='returned'));
   drawOrders(filtered);
   if(snapshot.data.hasMore)rows.append(el('p','nv-track-note','Showing first 50 imported orders.'));
   if(lastFetchedLabel)lastFetchedLabel.textContent='Last fetched from D1: '+fmtTime(snapshot.fetchedAt)+' · Showing saved snapshot until you refresh.';
   return true;
 }
 async function fetchOrders(force=false){
   if(!rows)return;
   if(!force&&showSnapshot())return;
   if(loading)return;
   loading=true;
   if(refreshBtn){refreshBtn.disabled=true;refreshBtn.textContent='Refreshing…'}
   if(!snapshot)rows.replaceChildren(el('p','','Loading records from Cloudflare D1…'));
   try{
     // A user-initiated refresh (or an empty first visit) is the only D1 request.
     const request=fetch('/api/shipping/bootstrap?filter=all',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});
     const timeout=new Promise((_,reject)=>setTimeout(()=>reject(Error('Request timed out. Your saved snapshot is still available.')),12000));
     const response=await Promise.race([request,timeout]);
     if(!response.ok)throw Error('D1 returned HTTP '+response.status);
     const data=await response.json();
     if(!Array.isArray(data?.items)||!data.counts)throw Error('Unexpected shipping response');
     snapshot={data,fetchedAt:new Date().toISOString()};
     localSave(snapshot);
     showSnapshot();
     status.textContent='Records refreshed from D1. Carrier status was not checked.';
   }catch(e){
     if(!showSnapshot()){
       rows.replaceChildren(el('p','nv-track-error','Could not load saved orders: '+e.message));
       rows.append(btn('Retry D1 fetch',()=>fetchOrders(true),'nv-track-secondary'));
     }
     status.textContent='Refresh unavailable: '+e.message+(snapshot?' · Existing snapshot is unchanged.':'');
   }finally{
     loading=false;
     if(refreshBtn){refreshBtn.disabled=false;refreshBtn.textContent='Refresh Data'}
   }
 }

 async function loadPdfLibrary(){
   if(window.pdfjsLib)return window.pdfjsLib;
   await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
     script.onload=resolve;script.onerror=()=>reject(Error('PDF reader could not load'));
     document.head.append(script);
   });
   if(!window.pdfjsLib)throw Error('PDF reader unavailable');
   return window.pdfjsLib;
 }
 async function extractLabelPdf(bytes,sha,filename){
   const pdfjs=await loadPdfLibrary();
   pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
   const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise;
   const found=[],review=[];
   if(pdf.numPages>100)throw Error('Shipping label PDF exceeds 100 pages');
   for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
     const page=await pdf.getPage(pageNo),tc=await page.getTextContent();
     const text=tc.items.map(x=>x.str||'').join(' ').replace(/\s+/g,' ');
     // The seller's TAX INVOICE occupies the bottom half of every Meesho label.
     // Reject mixed-business labels, including Keshav Kripa, before saving an AWB.
     const sellerVerified=/Sold\s+by\s*:\s*NIDHI\b/i.test(text);
     const carrier=/\bDelhivery\b/i.test(text)?'delhivery':(/\bValmo\b/i.test(text)?'valmo':null);
     const awbs=carrier==='valmo'?[...new Set((text.match(/\bVL\d{13}\b/gi)||[]).map(x=>x.toUpperCase()))]:
       carrier==='delhivery'?[...new Set(text.match(/(?<!\d)\d{16}(?!\d)/g)||[])]:[];
     const orders=[...new Set(text.match(/\b\d{15,20}_\d{1,4}\b/g)||[])];
     const invoices=[...new Set((text.match(/\b87[a-z0-9]{3,30}\b/gi)||[]).map(x=>x.toLowerCase()))];
     if(sellerVerified&&carrier&&awbs.length===1&&orders.length===1&&invoices.length===1){
       found.push({suborderId:orders[0],invoiceNo:invoices[0],awb:awbs[0],carrier,sellerName:'NIDHI',sourceSha256:sha,page:pageNo});
     } else {
       review.push({file:filename.slice(0,80),page:pageNo,
         reason:!sellerVerified?'Seller is not NIDHI (excluded from GST Desk)':!carrier?'Carrier not identified':!awbs.length?'AWB not reliably extracted':!orders.length?'No suborder ID on page':!invoices.length?'No Nividhi invoice number on page':'Multiple possible identifiers; skipped'});
     }
   }
   return {found,review};
 }
 async function extractLabelFiles(files,preview){
   if(!files?.length)throw Error('Choose PDF shipping labels or a ZIP of labels');
   if(files.length>30)throw Error('Too many files at once; select up to 30');
   const pdfjs=await loadPdfLibrary(),entries=[];
   void pdfjs;
   for(const file of files){
     if(file.size>25000000)throw Error('File too large (25 MB maximum)');
     if(/\.zip$/i.test(file.name)){
       if(!window.JSZip){
         await new Promise((resolve,reject)=>{
           const script=document.createElement('script');
           script.src='https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
           script.onload=resolve;script.onerror=()=>reject(Error('ZIP parser could not load'));
           document.head.append(script);
         });
       }
       if(!window.JSZip)throw Error('ZIP parser unavailable');
       const archive=await window.JSZip.loadAsync(file);
       for(const entry of Object.values(archive.files)){
         if(entry.dir||!/\.pdf$/i.test(entry.name))continue;
         if(entries.length>=50)throw Error('Maximum 50 PDF files per batch');
         entries.push({name:entry.name.slice(0,100),bytes:await entry.async('arraybuffer')});
       }
     }else if(/\.pdf$/i.test(file.name)||file.type==='application/pdf'){
       entries.push({name:file.name,bytes:await file.arrayBuffer()});
     }else throw Error('Only PDF shipping labels and ZIP files are supported');
   }
   if(!entries.length)throw Error('No PDF shipping labels found');
   const found=[],review=[];
   for(const entry of entries){
     if(entry.bytes.byteLength>15000000){review.push({file:entry.name,reason:'PDF over 15 MB; skipped'});continue}
     const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',entry.bytes));
     const sha=Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
     try{
       const x=await extractLabelPdf(entry.bytes,sha,entry.name);
       found.push(...x.found);review.push(...x.review);
     }catch(e){review.push({file:entry.name,reason:'Could not parse PDF: '+e.message})}
   }
   const rows=[],orders=new Set(),awbs=new Set();
   for(const r of found){
     if(orders.has(r.suborderId)||awbs.has(r.awb)){
       review.push({file:'Multiple files',reason:'Conflicting or repeated label '+r.suborderId+' / '+r.awb});
       continue;
     }
     orders.add(r.suborderId);awbs.add(r.awb);rows.push(r);
   }
   if(rows.length>50)throw Error('Select a smaller batch (50 labels maximum)');
   preview.replaceChildren();
   preview.append(el('p','nv-track-note',rows.length+' unambiguous shipping labels extracted; '+review.length+' pages need review. Originals stay only on your device.'));
   for(const r of rows)preview.append(el('p','nv-track-note','Order '+r.suborderId+' · Invoice '+r.invoiceNo+' · AWB '+r.awb));
   for(const r of review.slice(0,12))preview.append(el('p','nv-track-error',r.file+(r.page?' page '+r.page:'')+': '+r.reason));
   return {rows,review};
 }
 async function importLabels(input,preview){
   if(busy)return;
   const files=[...input.files];
   busy=true;
   try{
     status.textContent='Reading selected shipping labels locally. No PDF is uploaded.';
     const {rows}=await extractLabelFiles(files,preview);
     if(!rows.length){status.textContent='No unambiguous shipping label mappings were found. Check the reviewed pages.';return}
     if(!confirm('Save '+rows.length+' seller-verified Nividhi label AWBs to D1? Other sellers are excluded. Only parsed identifiers and hashes are saved. No PDFs, ZIPs or carrier requests.'))return;
     const result=await submit('/api/shipping/labels/import','POST',{items:rows});
     const outcomes=result.results.map(x=>x.outcome);
     status.textContent=result.saved+' AWBs saved. '+outcomes.filter(x=>x==='already_saved').length+' already saved. '+
       outcomes.filter(x=>!['saved','already_saved'].includes(x)).length+' need manual review. No tracking statuses were fetched.';
     preview.replaceChildren();
     for(const r of result.results)preview.append(el('p','nv-track-note',r.invoiceNo+' · '+r.awb+' · '+r.outcome));
     await fetchOrders();
   }catch(e){status.textContent='Label import could not complete: '+e.message}
   finally{busy=false;input.value=''}
 }
 function mountValmo(){
   const section=document.getElementById('valmo');if(!section)return;
   const legacy=section.querySelector(':scope > .card');
   if(legacy?.querySelector('#valmo-awbs'))legacy.remove(); // Only remove the obsolete browser-only form, never the database shell.
   tracker=section.querySelector(':scope > #nv-shipping-tracker');
   if(!tracker){tracker=el('div');tracker.id='nv-shipping-tracker';section.insertBefore(tracker,section.firstChild)}
   tracker.replaceChildren(); // Reuse the server-rendered D1 shell, including on reload.
   tracker.append(el('h2','','Valmo Tracking · Saved orders'));
   const cacheTools=el('div','nv-track-actions');
   lastFetchedLabel=el('span','nv-track-note','Last fetched: no saved snapshot');
   refreshBtn=btn('Refresh Data',()=>fetchOrders(true));
   cacheTools.append(lastFetchedLabel,refreshBtn);
   tracker.append(cacheTools);
   tracker.append(el('p','','All invoice-linked orders are preloaded in D1. Enter confirmed AWBs from Meesho shipping labels, then click Check Status only when needed.'));
   tracker.append(el('p','nv-track-note','No automatic checks. Verified delivered shipments remain in D1 and are excluded from future checks. Unknown AWBs/statuses stay unknown.'));
   const importBox=el('div','nv-track-detail');
   importBox.append(el('strong','','Import Meesho shipping-label PDFs'));
   importBox.append(el('p','nv-track-note','Choose Sub Order Labels PDFs (or ZIP of those labels). The AWB is above the barcode. Tax-invoice-only ZIPs have no AWB. Parsing happens in this browser; original files are never uploaded or stored.'));
   const labels=el('input');labels.type='file';labels.multiple=true;labels.accept='.pdf,.zip,application/pdf,application/zip';labels.setAttribute('aria-label','Choose shipping labels PDFs or ZIP');
   const preview=el('div');preview.setAttribute('aria-live','polite');
   importBox.append(labels,btn('Parse & Save Shipping Labels',()=>importLabels(labels,preview)),preview);
   tracker.append(importBox);
   const bar=el('div','nv-track-actions');
   bar.append(btn('Check Status · Pending AWBs',()=>checkStatus('pending')));
   listFilter=el('select');listFilter.setAttribute('aria-label','Filter saved shipments');
   [['all','All orders'],['awaiting_awb','Awaiting AWB'],['pending','Trackable (not delivered)'],['delivered','Delivered'],['returned','Returned to seller']].forEach(([v,l])=>{const option=el('option','',l);option.value=v;listFilter.append(option)});
   listFilter.onchange=()=>showSnapshot();bar.append(listFilter);
   tracker.append(bar,status);rows=el('div');tracker.append(rows);
   // Load the last saved private snapshot immediately, without waiting for a network call.
   // A freshly generated server snapshot is used on a device that has no local snapshot.
   snapshot=checkedSnapshot(localRead())||checkedSnapshot(window.__GST_DESK_SHIPPING_SEED__);
   if(snapshot){showSnapshot();localSave(snapshot)}
   else fetchOrders(true);
 }
 const init=()=>{
   window.addEventListener('gstdesk:overview-loaded',e=>{activeOverview=e.detail;renderDashboard()});
   // Only database GET calls on page load; no courier tracking requests.
   mountValmo();
   const overview=window.__gstDeskOverviewSnapshot;
   if(overview){activeOverview=overview;renderDashboard()}
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
export const shippingClientJS='('+gstDeskShippingClient.toString()+')();';
