// Cloudflare D1 dashboard for the existing GST Desk homepage. No external libraries.
function gstDeskOverviewClient(){
'use strict';
const el=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
const money=x=>'₹'+(Number(x||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});

const iconPaths={
 document:'M6 3h9l4 4v14H6z M15 3v5h5 M9 13h7 M9 17h5',
 credit:'M5 9a7 7 0 1 1 1.5 8 M4 4v6h6 M9 14h6',
 wallet:'M6 5h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3z M3 9h18 M15 14h4',
 shield:'M12 2l8 3v6c0 5-3.5 8-8 11-4.5-3-8-6-8-11V5z M8 12l3 3 5-6',
 chart:'M4 4v17h17 M9 17v-5 M14 17V8 M19 17V4',
 cloud:'M7 18H6a4 4 0 1 1 .7-7.9A6 6 0 0 1 18.3 11 3.5 3.5 0 1 1 18 18H7z',
 pen:'M6 3h10v5 M6 3v18h12v-6 M9 14l8-8 3 3-8 8-4 1z',
 archive:'M4 4h16v5H4z M6 9v12h12V9 M10 14h4',
 calendar:'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M7 3v4 M17 3v4 M3 10h18 M8 14h3 M14 14h3'
};
const glyph=kind=>{
 const wrapper=el('span','nv-stat-icon');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');
 path.setAttribute('d',iconPaths[kind]||iconPaths.document);
 svg.append(path);wrapper.append(svg);return wrapper;
};

const month=p=>/^(0[1-9]|1[0-2])20\d{2}$/.test(p)?new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(Number(p.slice(2)),Number(p.slice(0,2))-1,1))):String(p||'');
const request=async(url,signal)=>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal});const j=await r.json();if(!r.ok)throw Error(j.error||'Database temporarily unavailable');return j};
const css=el('style');
css.textContent='#nv-overview{color:#1b3029;font:14px/1.55 system-ui;margin:20px 0 28px}#nv-overview h2{font-size:24px;letter-spacing:-.5px;margin:3px 0}#nv-overview h3{font-size:16px;margin:0 0 11px}#nv-overview p{margin:6px 0;color:#64776b}#nv-overview .nv-kicker{font-size:11px;font-weight:750;letter-spacing:1.1px;color:#137a63;text-transform:uppercase}#nv-overview .nv-stats,#nv-overview .nv-months{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin:12px 0}#nv-overview .nv-cols{display:grid;grid-template-columns:1.2fr 1fr;gap:14px;margin:14px 0}#nv-overview .nv-panel,#nv-overview .nv-stat,#nv-overview .nv-month{background:#fff;border:1px solid #dfe8df;border-radius:13px;padding:14px}#nv-overview .nv-stat,#nv-overview .nv-month{display:flex;flex-direction:column;gap:5px;text-align:left;color:#214236;cursor:pointer}#nv-overview .nv-stat strong{font-size:22px;line-height:1.25}#nv-overview .nv-stat small,#nv-overview .nv-month small{font-size:12px;color:#6b8072}#nv-overview .nv-month{background:#f9fcfa}#nv-overview .nv-month strong{font-size:20px}#nv-overview button.nv-stat:hover,#nv-overview button.nv-month:hover,#nv-overview button.nv-entry:hover{border-color:#70ba96;box-shadow:0 5px 16px #126c4715}#nv-overview button:focus-visible{outline:3px solid #74bc99}#nv-overview .nv-entry{display:flex;justify-content:space-between;align-items:center;text-align:left;gap:12px;width:100%;background:#fff;border:1px solid #e0e9e2;border-radius:9px;color:#183629;padding:10px;cursor:pointer;margin:6px 0}#nv-overview .nv-entry strong{display:block}#nv-overview .nv-entry small{display:block;color:#6e8072;font-size:11px;margin-top:2px}#nv-overview .nv-entry .nv-value{font-weight:700;white-space:nowrap}#nv-overview .nv-hint{font-size:12px;color:#63766c}#nv-overview .nv-warning{border-left:3px solid #d49e41;background:#fff9eb;color:#6d592e;padding:11px;font-size:12px;margin:10px 0}#nv-overview .nv-back{background:#e6f4ea!important;color:#126146!important;border-radius:8px;padding:8px 13px;margin:10px 10px 12px 0}#nv-overview .nv-detail{border:1px solid #dfe9e0;background:white;border-radius:13px;padding:17px}#nv-overview dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}#nv-overview dt{font-size:11px;color:#6c7d73}#nv-overview dd{margin:3px 0;font-weight:650;overflow-wrap:anywhere}#nv-overview .nv-error{padding:12px;border:1px solid #eababa;border-radius:9px;background:#fff3f3;color:#933}#nv-overview .nv-green{font-size:12px;color:#137a63;font-weight:750}@media(max-width:750px){#nv-overview .nv-cols{grid-template-columns:1fr}#nv-overview .nv-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}';
document.head.append(css);
let home,detail,appRoot,overview,lastPeriod='112026',overviewSnapshot=null,overviewStamp=null,overviewRefresh=null,refreshing=false;
const cacheKey='gstdesk-ui:overview:v2:'+String(window.__GST_DESK_CACHE_SCOPE__||'private-owner');
const getCache=()=>{try{const j=JSON.parse(localStorage.getItem(cacheKey)||'null');return j&&j.data?.counts&&Array.isArray(j.data?.monthly)&&Number.isFinite(Date.parse(j.fetchedAt))?j:null}catch{return null}};
const putCache=v=>{try{localStorage.setItem(cacheKey,JSON.stringify(v))}catch{}};
const formatTime=t=>{try{return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(t))+' IST'}catch{return 'Unknown'}};
const showStamp=()=>{if(overviewStamp)overviewStamp.textContent=overviewSnapshot?'Last fetched from D1: '+formatTime(overviewSnapshot.fetchedAt)+' · Saved snapshot':'No saved dashboard snapshot'};
const btn=(label,onclick)=>{const b=el('button','nv-back',label);b.type='button';b.onclick=onclick;return b};
const title=(node,label,hint)=>{node.append(el('div','nv-kicker','Your private Cloudflare D1 records'),el('h2','',label));if(hint)node.append(el('p','nv-hint',hint))};
const goWorkspace=id=>document.querySelector('nav.tabs button[data-tab="'+id+'"]')?.click();
const show=()=>{home.hidden=true;detail.hidden=false;appRoot.style.display='none';window.scrollTo({top:0,behavior:'smooth'})};
const close=()=>{detail.hidden=true;home.hidden=false;appRoot.style.display='';detail.replaceChildren();window.scrollTo({top:0,behavior:'smooth'})};
const field=(dl,k,v)=>{const group=el('div');group.append(el('dt','',k),el('dd','',v==null?'Not recorded':v));dl.append(group)};
const item=(x,p)=>{const b=el('button','nv-entry'),l=el('span');l.append(el('strong','',x.invoiceNo+(x.documentType==='credit-note'?' · Credit note':'')),el('small','',x.documentDate+' · '+(x.productDescription||'Product not specified').slice(0,100)));b.append(l,el('span','nv-value',(x.documentType==='credit-note'?'−':'')+money(x.totalPaise)));b.onclick=()=>invoice(x.invoiceNo,p);return b};
async function periodView(p,page=1,more=false){
lastPeriod=p;show();
if(!more){detail.replaceChildren();title(detail,month(p)+' · Invoices','Select any invoice to see all available details.');detail.append(btn('← Dashboard',close));const summary=overview?.monthly?.find(x=>x.period===p);if(summary)detail.append(el('p','',summary.invoices+' invoices · '+summary.creditNotes+' credit notes · Net '+money(summary.netPaise)));detail.append(el('p','nv-warning','Grouped by actual document issue date. The source ZIP month may differ. No live delivery or settlement data.'));detail.append(el('div','nv-invoice-list'))}
try{const r=await request('/api/invoices?period='+encodeURIComponent(p)+'&page='+page);const list=detail.querySelector('.nv-invoice-list');r.items.forEach(x=>list.append(item(x,p)));detail.querySelector('.nv-more')?.remove();if(r.hasMore){const b=btn('Load more invoices',()=>periodView(p,page+1,true));b.classList.add('nv-more');detail.append(b)}}catch(e){detail.append(el('p','nv-error',e.message))}
}
async function invoice(no,back){
show();detail.replaceChildren();title(detail,'Invoice '+no,'Original Meesho register and PDF metadata');detail.append(btn('← '+month(back||lastPeriod)+' invoices',()=>periodView(back||lastPeriod)));
try{const d=(await request('/api/invoices/'+encodeURIComponent(no))).invoice,box=el('div','nv-panel'),dl=el('dl');box.append(el('h3','',d.documentType==='credit-note'?'Credit note':'Tax invoice'));field(dl,'Invoice number',d.invoiceNo);field(dl,'Order number',d.suborderId);field(dl,'Source ZIP month',month(d.sourcePeriod));field(dl,'Order date',d.orderDate);field(dl,'Document date',d.documentDate);field(dl,'HSN',d.hsn);field(dl,'Place of supply',d.placeOfSupply||d.placeOfSupplyCode);field(dl,'Invoice total',money(d.totalPaise));field(dl,'Taxable amount',d.taxablePaise==null?'Not available':money(d.taxablePaise));field(dl,'GST amount',d.taxPaise==null?'Not available':money(d.taxPaise));if(d.hasOtherCharges!==null)field(dl,'Other charges',d.hasOtherCharges?'Present in PDF':'Not present');
const label=d.shippingLabelInvoice;
if(label){
  field(dl,'Label-verified seller',label.seller);
  field(dl,'Meesho SKU',label.sku);
  field(dl,'Product size',label.size);
  field(dl,'Quantity',label.quantity);
  field(dl,'Color',label.color);
  if(label.product){
    field(dl,'Product gross price',money(label.product.grossPaise));
    field(dl,'Product discount',money(label.product.discountPaise));
    field(dl,'Product taxable value',money(label.product.taxablePaise));
    field(dl,'Product total',money(label.product.totalPaise));
  }
  if(label.otherCharges){
    field(dl,'Other/logistics gross charge',money(label.otherCharges.grossPaise));
    field(dl,'Other/logistics taxable value',money(label.otherCharges.taxablePaise));
    field(dl,'Other/logistics total',money(label.otherCharges.totalPaise));
  }
  field(dl,'GST total printed in shipping label',money(label.labelPrintedGSTPaise));
}
box.append(dl,el('p','nv-warning','Product: '+(d.productDescription||'Not recorded')));
if(label?.taxMismatchWithStandaloneInvoice){
  box.append(el('p','nv-warning','Source mismatch: the standalone tax-invoice PDF prints GST '+money(d.taxPaise)+', while the shipping-label invoice prints '+money(label.labelPrintedGSTPaise)+'. Both source values are preserved. Review against the filed return before making any adjustment.'));
}if(d.taxComponentsPaise)box.append(el('p','',Object.entries(d.taxComponentsPaise).map(([k,v])=>k+' '+money(v)).join(' · ')));if(d.taxBreakdownDifferencePaise!=null && d.taxBreakdownDifferencePaise!==0)box.append(el('p','nv-warning','Note: the GST total printed on the source PDF differs from the sum of rounded tax components by '+money(Math.abs(d.taxBreakdownDifferencePaise))+'. The printed total is preserved without adjustment.'));
    if(d.originalInvoiceNo)box.append(btn('Open referenced original invoice '+d.originalInvoiceNo,()=>invoice(d.originalInvoiceNo,back)));const hash=el('p','nv-hint','PDF SHA-256: '+d.pdfSha256);hash.style.overflowWrap='anywhere';box.append(hash,el('p','nv-hint','The original PDF binary is not hosted in D1. Invoice metadata alone does not establish delivery or payment.'));
    try{const tracking=(await request('/api/shipping/orders/'+encodeURIComponent(d.suborderId))).shipment;const info=el('div','nv-warning');info.append(el('strong','','Linked delivery tracking'));info.append(el('p','','Status: '+(tracking.status==='delivered'?'Delivered (carrier verified)':tracking.status==='awaiting_awb'?'Awaiting shipping-label AWB':tracking.status)));info.append(el('p','','AWB: '+(tracking.awb||'Not recorded')));info.append(el('p','','Actual delivery date (IST): '+(tracking.deliveredDateIST||'Not verified')));info.append(el('p','','Last checked: '+(tracking.lastCheckedAt||'Never')));box.append(info)}catch{}detail.append(box)}catch(e){detail.append(el('p','nv-error',e.message))}
}
async function returnsView(p){
show();detail.replaceChildren();title(detail,month(p)+' · Filed GST returns','Filed returns are separate from invoice ZIP totals.');detail.append(btn('← Dashboard',close));
try{const data=await request('/api/returns/summary?period='+p);for(const r of data.filedReturns||[]){const box=el('div','nv-panel');box.style.margin='10px 0';box.append(el('h3','',r.return_type));const dl=el('dl');field(dl,'Filed on',r.filed_on);field(dl,'ARN',r.arn);field(dl,'Taxable sales',money(r.taxable_paise));field(dl,'IGST',money(r.igst_paise));field(dl,'CGST',money(r.cgst_paise));field(dl,'SGST',money(r.sgst_paise));box.append(dl);detail.append(box)}if(!data.filedReturns?.length)detail.append(el('p','','No filed return summaries for this period.'))}catch(e){detail.append(el('p','nv-error',e.message))}
}
function paint(d){
overview=d;home.replaceChildren();
// Replace the server-rendered summary only once the interactive overview has data.
document.getElementById('nv-server-summary')?.remove();title(home,'Business overview','All imported financial records and cloud-saved workspace data');
home.append(el('p','nv-hint','Invoice amounts come from historical Meesho ZIPs. These are not current orders, settlements, GST payable, or profit.'));
const c=d.counts||{},months=d.monthly||[],stats=el('div','nv-stats');
const choices=[['Tax invoices',months.reduce((n,x)=>n+x.invoices,0),()=>periodView(months[0]?.period||'112026')],['Credit notes',months.reduce((n,x)=>n+x.creditNotes,0),()=>periodView('102026')],['Net imported invoice value',money(months.reduce((n,x)=>n+x.netPaise,0)),()=>periodView(months[0]?.period||'112026')],['Filed GST returns',c.filed_return_summaries||0,()=>returnsView(d.filedReturns?.[0]?.period||'092026')],['Meesho GST report rows',c.marketplace_report_rows||0,()=>goWorkspace('meesho')],['Saved cloud workspaces',c.saved_workspace_keys||0,()=>goWorkspace('dashboard')],['Invoice drafts',c.invoice_drafts||0,()=>goWorkspace('invoice-studio')],['Source ZIP imports',c.source_archives||0,()=>goWorkspace('meesho')]];
for(const [label,value,action] of choices){const b=el('button','nv-stat');b.type='button';const kind=({'Tax invoices':'document','Credit notes':'credit','Net imported invoice value':'wallet','Filed GST returns':'shield','Meesho GST report rows':'chart','Saved cloud workspaces':'cloud','Invoice drafts':'pen','Source ZIP imports':'archive'})[label]||'document';b.append(glyph(kind),el('small','',label),el('strong','',value));b.onclick=action;stats.append(b)}home.append(stats);
const row=el('div','nv-cols'),monthsPanel=el('div','nv-panel'),recent=el('div','nv-panel');monthsPanel.append(el('h3','','Invoices by document month'));const monthly=el('div','nv-months');months.forEach(p=>{const b=el('button','nv-month');b.type='button';b.append(glyph('calendar'),el('span','nv-kicker',month(p.period)),el('strong','',money(p.netPaise)),el('small','',p.invoices+' invoices · '+p.creditNotes+' credit notes'),el('span','nv-green','View month →'));b.onclick=()=>periodView(p.period);monthly.append(b)});monthsPanel.append(monthly,el('p','nv-hint','Includes invoices from other archive months when their actual issue date falls here.'));recent.append(el('h3','','Recently imported documents'));(d.recentInvoices||[]).forEach(x=>recent.append(item(x,x.period)));row.append(monthsPanel,recent);home.append(row);
const foot=el('div','nv-cols'),filings=el('div','nv-panel'),extra=el('div','nv-panel');filings.append(el('h3','','Filed GST returns'));for(const p of new Set((d.filedReturns||[]).map(x=>x.period))){const b=el('button','nv-entry');b.type='button';b.append(el('span','',month(p)+' · '+d.filedReturns.filter(x=>x.period===p).map(x=>x.type).join(', ')),el('span','nv-green','View →'));b.onclick=()=>returnsView(p);filings.append(b)}extra.append(el('h3','','Stored records and tools'));for(const [label,count,tab] of [['Meesho report rows',c.marketplace_report_rows||0,'meesho'],['Cloud saved workspaces',c.saved_workspace_keys||0,'dashboard'],['Invoice drafts',c.invoice_drafts||0,'invoice-studio'],['Archive manifests',c.source_archives||0,'meesho']]){const b=el('button','nv-entry');b.type='button';b.append(el('span','',label),el('span','nv-value',count+' →'));b.onclick=()=>goWorkspace(tab);extra.append(b)}foot.append(filings,extra);home.append(foot);
window.__gstDeskOverviewSnapshot=d;
window.dispatchEvent(new CustomEvent('gstdesk:overview-loaded',{detail:d}));
}
async function reload(){
 if(refreshing)return;refreshing=true;
 if(overviewRefresh){overviewRefresh.disabled=true;overviewRefresh.textContent='Refreshing…'}
 if(!overviewSnapshot)home.replaceChildren(el('p','','Loading D1 dashboard summary…'));
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),12000);
 try{
   const response=await request('/api/overview',controller.signal);
   overviewSnapshot={data:response,fetchedAt:new Date().toISOString()};
   putCache(overviewSnapshot);paint(response);showStamp();
 }catch(e){
   if(!overviewSnapshot){home.replaceChildren();title(home,'Database summary unavailable');home.append(el('p','nv-error',e.message),btn('Retry',reload))}
   else {showStamp();overviewStamp.textContent+=' · Refresh unavailable: '+e.message}
 }finally{clearTimeout(timer);refreshing=false;if(overviewRefresh){overviewRefresh.disabled=false;overviewRefresh.textContent='Refresh Data'}}
}
const boot=()=>{
 const modern=document.getElementById('modern');appRoot=document.getElementById('gstdesk-react-root');
 if(!modern||!appRoot)return;
 const panel=el('div');panel.id='nv-overview';home=el('div');detail=el('div','nv-detail');detail.hidden=true;
 const bar=el('div','nv-track-actions');bar.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0;';
 overviewStamp=el('span','nv-hint','Checking saved summary…');overviewRefresh=btn('Refresh Data',reload);
 bar.append(overviewStamp,overviewRefresh);panel.append(bar,home,detail);modern.insertBefore(panel,appRoot);
 // Never block the homepage on a D1 fetch if a previous snapshot exists.
 overviewSnapshot=getCache()||(window.__GST_DESK_OVERVIEW_SEED__?.data?.counts?window.__GST_DESK_OVERVIEW_SEED__:null);
 if(overviewSnapshot){paint(overviewSnapshot.data);putCache(overviewSnapshot);showStamp()}
 else reload();
};
// All required DOM elements are above the script injection point; do not wait
// for unrelated legacy CDN libraries to finish before initializing the dashboard.
if(document.getElementById('gstdesk-react-root'))boot();
else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
}
export const overviewClientJS='('+gstDeskOverviewClient.toString()+')();';
