// Server-side HTML fallback: authenticated D1 records are visible before browser JavaScript.
// No documents, customer addresses, or tracking HTTP requests are stored or performed here.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=x=>{try{return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(x))+' IST'}catch{return 'Unknown'}};
const fmtMoney=x=>'₹'+(Number(x||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const embedJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function shippingFallbackHTML(snapshot){
  if(!snapshot?.data||!Array.isArray(snapshot.data.items))
    return '<p>Saved shipment snapshot unavailable. Refresh this page to retry D1.</p><button type="button" style="display:block;width:100%;padding:15px" onclick="location.reload()">↻ Refresh Data</button>';
  const d=snapshot.data,c=d.counts||{};
  const time=esc(stamp(snapshot.fetchedAt));
  const delivered=d.items.filter(x=>x.status==='delivered');
  const transit=d.items.filter(x=>x.status==='in_transit'||x.status==='out_for_delivery');
  const orderRows=rows=>rows.map(r=>
    '<article style="border:1px solid #dfebe2;border-radius:12px;padding:12px;margin:10px 0">'+
    '<strong>Order '+esc(r.suborderId)+'</strong>'+
    '<p>Invoice '+esc(r.invoiceNo)+' · '+esc(r.orderDate||'Date unknown')+' · '+fmtMoney(r.invoiceValuePaise)+'</p>'+
    '<p>'+esc(r.carrier||'Carrier unknown')+' · '+esc(r.awb||'AWB unavailable')+'</p>'+
    '<p>'+((r.ownerConfirmedDelivered||r.status==='delivered'&&r.carrier==='delhivery'&&!r.deliveredDateIST)?
      'Owner-confirmed · Actual delivery date unknown':
      esc(r.status||'Unknown')+(r.deliveredDateIST?' · Delivered '+esc(r.deliveredDateIST):''))+'</p>'+
    '</article>').join('');
  const details=(cat,icon,title,count,items)=>
    '<details class="nv-server-category" style="border:1px solid #d3e5dd;border-radius:15px;padding:13px;margin:10px 0;background:#f8fcfa">'+
    '<summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:12px;font-weight:700">'+
    '<span style="font-size:23px">'+icon+'</span><span>'+title+'</span>'+
    '<strong style="font-size:26px;margin-left:auto">'+count+'</strong></summary>'+
    '<div>'+(!items.length?'<p>No shipments in this category.</p>':orderRows(items))+'</div></details>';
  return '<p style="color:#607769;font-size:13px">Last fetched from D1: '+time+' · Saved snapshot</p>'+
    '<button type="button" style="background:#137a63;color:white;display:block;width:100%;padding:15px;border:0;border-radius:12px;font-weight:750;font-size:17px" onclick="location.reload()">↻ Refresh Data</button>'+
    '<p style="font-size:12px;color:#64766a">Choose a category to view shipments. Carrier statuses are not checked automatically.</p>'+
    '<div id="nv-server-categories">'+
    details('delivered','✅','Total Delivered',Number(c.total_delivered??c.verified_delivered??0),delivered)+
    details('transit','🚚','Total In Transit',Number(c.verified_in_transit||0),transit)+'</div>';
}
export function overviewFallbackHTML(snapshot){
  if(!snapshot?.data?.counts)return '';
  const d=snapshot.data,c=d.counts,months=d.monthly||[];
  const totals=months.reduce((a,m)=>({
    invoices:a.invoices+Number(m.invoices||0),
    creditNotes:a.creditNotes+Number(m.creditNotes||0),
    netPaise:a.netPaise+Number(m.netPaise||0)
  }),{invoices:0,creditNotes:0,netPaise:0});
  const statRows=[
    ['▤','Tax invoices',totals.invoices,'Original Meesho records'],
    ['↩','Credit notes',totals.creditNotes,'Recorded reversals'],
    ['₹','Net imported invoice value',fmtMoney(totals.netPaise),'Not settlements or profit'],
    ['✓','Filed GST return entries',Number(c.filed_return_summaries||0),'Verified filed-return register'],
    ['▦','Meesho GST report rows',Number(c.marketplace_report_rows||0),'Imported marketplace reports'],
    ['☁','Cloud saved workspaces',Number(c.saved_workspace_keys||0),'Private D1 records'],
    ['▤','Invoice drafts',Number(c.invoice_drafts||0),'Saved drafts'],
    ['⬇','Source ZIP imports',Number(c.source_archives||0),'Archive metadata only']
  ];
  const monthName=p=>{
    if(!/^(0[1-9]|1[0-2])20\d{2}$/.test(p))return esc(p);
    return new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'UTC'}).format(
      new Date(Date.UTC(Number(p.slice(2)),Number(p.slice(0,2))-1,1)));
  };
  const statCards=statRows.map(([icon,label,value,hint])=>
    '<div class="nv-ss-card"><span class="nv-ss-symbol" aria-hidden="true">'+icon+'</span><span class="nv-ss-label">'+esc(label)+'</span>'+
    '<strong class="nv-ss-value">'+esc(value)+'</strong><small>'+esc(hint)+'</small></div>').join('');
  const recent=d.recentInvoices||[];
  const monthCards=months.map(m=>{
    const match=recent.filter(x=>x.period===m.period);
    const docs=match.map(x=>
      '<li><span>'+esc(x.invoiceNo)+' · '+esc(x.documentDate)+'</span><strong>'+
      (x.documentType==='credit-note'?'−':'')+fmtMoney(x.totalPaise)+'</strong></li>').join('');
    return '<details class="nv-ss-month"><summary><span class="nv-ss-month-name">'+monthName(m.period)+'</span>'+
      '<strong>'+fmtMoney(m.netPaise)+'</strong><small>'+Number(m.invoices||0)+' invoices · '+Number(m.creditNotes||0)+' credit notes</small>'+
      '<span class="nv-ss-more">View recent entries ▾</span></summary>'+
      '<div class="nv-ss-month-detail"><p>Document issue month, not ZIP filename month.</p>'+
      (docs?'<ul>'+docs+'</ul>':'<p>Open GST Desk invoices for the complete period.</p>')+'</div></details>';
  }).join('');
  const filed=(d.filedReturns||[]).map(f=>
    '<li><span>'+monthName(f.period)+' · '+esc(f.type)+'</span><small>'+esc(f.filedOn||'Date not recorded')+'</small></li>').join('');
  const recentList=recent.map(x=>
    '<li><span>'+esc(x.invoiceNo)+' · '+esc(x.documentDate)+'</span><strong>'+
    (x.documentType==='credit-note'?'−':'')+fmtMoney(x.totalPaise)+'</strong></li>').join('');
  return '<section id="nv-server-summary" aria-label="Business overview" class="nv-ss">'+
    '<div class="nv-ss-top"><span class="nv-ss-kicker">YOUR PRIVATE CLOUDFLARE D1 RECORDS</span><h2>Business overview</h2>'+
    '<p>All imported financial records and cloud-saved workspace data</p>'+
    '<p class="nv-ss-disclaimer">Historical invoice values, not live orders, profit, settlements, or GST payable.</p>'+
    '<p class="nv-ss-time">Last fetched from D1: '+esc(stamp(snapshot.fetchedAt))+'</p></div>'+
    '<div class="nv-ss-grid">'+statCards+'</div>'+
    '<div class="nv-ss-layout"><section class="nv-ss-panel"><h3>Invoices by document month</h3><div class="nv-ss-months">'+monthCards+'</div>'+
    '<p class="nv-ss-disclaimer">Months follow the actual document issue date, not archive names.</p></section>'+
    '<section class="nv-ss-panel"><h3>Recently imported documents</h3><ul class="nv-ss-list">'+recentList+'</ul></section></div>'+
    '<div class="nv-ss-layout"><section class="nv-ss-panel"><h3>Filed GST returns</h3><ul class="nv-ss-list">'+filed+'</ul></section>'+
    '<section class="nv-ss-panel"><h3>Workspace data</h3><p>D1 stores parsed records, not source PDFs or ZIP files.</p>'+
    '<p>Use the dashboard tools to review invoices, GST filings, imports, and order details.</p></section></div></section>';
}
