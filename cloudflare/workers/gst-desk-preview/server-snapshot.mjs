// Server-side HTML fallback: authenticated D1 records are visible before browser JavaScript.
// No documents, customer addresses, or tracking HTTP requests are stored or performed here.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=x=>{try{return new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(new Date(x))+' IST'}catch{return 'Unknown'}};
const fmtMoney=x=>'₹'+(Number(x||0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const embedJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export function shippingFallbackHTML(snapshot){
  if(!snapshot?.data||!Array.isArray(snapshot.data.items))
    return '<p>Saved shipment snapshot unavailable. Use Refresh Data to retry.</p><button type="button" onclick="location.reload()">Refresh Data</button>';
  const d=snapshot.data,c=d.counts||{};
  const summary='<p>Last fetched from D1: <strong>'+esc(stamp(snapshot.fetchedAt))+'</strong>. Saved snapshot; not live carrier tracking.</p>'+
    '<p><strong>'+Number(c.known_orders||0)+'</strong> invoiced orders · <strong>'+Number(c.verified_delivered||0)+'</strong> verified delivered · '+
    '<strong>'+Number(c.awaiting_awb||0)+'</strong> invoices without AWB.</p>'+
    '<button type="button" onclick="location.reload()">Refresh Data</button>';
  const orders=d.items.slice(0,50).map(r=>
    '<article style="border:1px solid #dfebe2;border-radius:12px;padding:12px;margin:10px 0"><strong>Order '+esc(r.suborderId)+'</strong>'+
    '<p>Invoice '+esc(r.invoiceNo)+' · '+esc(r.orderDate||'Date unavailable')+' · '+fmtMoney(r.invoiceValuePaise)+'</p>'+
    '<p>'+esc(r.carrier||'Courier unknown')+' · '+esc(r.awb||'AWB not supplied')+' · '+esc(r.status||'Unverified')+'</p>'+
    (r.deliveredDateIST?'<p>Delivered '+esc(r.deliveredDateIST)+'</p>':'')+
    (r.estimatedDeliveryText?'<p>ETA: '+esc(r.estimatedDeliveryText)+' (estimated)</p>':'')+
    '</article>').join('');
  return summary+'<div id="nv-server-orders">'+orders+'</div>';
}
export function overviewFallbackHTML(snapshot){
  if(!snapshot?.data?.counts)return '';
  const d=snapshot.data;
  const totals=(d.monthly||[]).reduce((a,m)=>({invoices:a.invoices+Number(m.invoices||0),creditNotes:a.creditNotes+Number(m.creditNotes||0),netPaise:a.netPaise+Number(m.netPaise||0)}),{invoices:0,creditNotes:0,netPaise:0});
  return '<div id="nv-server-summary" class="card"><h2>Saved business summary</h2>'+
    '<p>Last fetched from D1: '+esc(stamp(snapshot.fetchedAt))+'</p>'+
    '<p><strong>'+totals.invoices+'</strong> tax invoices · <strong>'+totals.creditNotes+'</strong> credit notes · '+
    '<strong>'+fmtMoney(totals.netPaise)+'</strong> net invoice value</p>'+
    '<p>Historical records, not live marketplace orders or profit.</p>'+
    '<button type="button" onclick="location.reload()">Refresh Data</button></div>';
}
