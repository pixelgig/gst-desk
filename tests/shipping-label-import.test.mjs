import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingApi } from '../cloudflare/workers/gst-desk-preview/shipping-api.mjs';
import { shippingClientJS } from '../cloudflare/workers/gst-desk-preview/shipping-client.mjs';
import vm from 'node:vm';

const order='353684149434396800_1',invoice='87whi2724',awb='VL0086126599143',hash='c'.repeat(64);
const item={suborderId:order,invoiceNo:invoice,awb,carrier:'valmo',sellerName:'NIDHI',sellerGSTIN:'09CEIPN0076B1ZO',invoiceDate:'2026-11-16',invoiceTotalPaise:12897,printedGSTPaise:376,sourceSha256:hash,page:1};
const request=(items,origin='https://gst.test')=>new Request('https://gst.test/api/shipping/labels/import',{
 method:'POST',headers:{Origin:origin,'X-GST-Desk-Write':'1','Content-Type':'application/json'},
 body:JSON.stringify({items})
});
const fakeDB=(existing=null)=>{
 const calls=[];
 return {calls,prepare(sql){
  return {bind(...args){
   calls.push({sql,args});
   return {
    first:async()=>sql.includes('SELECT awb,status,invoice_no')?{awb:existing,status:'awaiting_awb',invoice_no:invoice}:sql.includes('SELECT document_date,document_total_paise,details_json')?{document_date:'2026-11-16',document_total_paise:12897,details_json:JSON.stringify({pdfPrintedTaxTotalPaise:375})}:null,
    run:async()=>({meta:{changes:1}})
   };
  }};
 }};
};
test('safe label import requires explicit same-origin authorization',async()=>{
 const r=await shippingApi(request([item],'https://evil.test'),{DB:fakeDB()},{businessId:'biz'});
 assert.equal(r.status,403);
});
test('valid shipping-label identifiers save an AWB without a carrier check or document',async()=>{
 const db=fakeDB(),res=await shippingApi(request([item]),{DB:db},{businessId:'biz'});
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.saved,1);assert.equal(data.carrierStatusChecked,false);
 assert.equal(data.documentsStored,false);assert.equal(data.results[0].outcome,'saved');
 assert.equal(data.invoiceAuditsSaved,1);
 assert.equal(data.results[0].taxDiscrepancy,true,'One paise GST source mismatch must be flagged, not silently corrected');
 assert.ok(db.calls.some(x=>x.sql.startsWith('UPDATE gstdesk_meesho_invoices')&&x.args.some(v=>typeof v==='string'&&v.includes('"validatedAgainstD1":true'))));
 assert.ok(db.calls.some(x=>x.sql.startsWith('UPDATE gstdesk_shipments')&&x.args.includes(awb)&&x.args.includes(hash)));
 assert.ok(!db.calls.some(x=>x.sql.includes('delivered_at=')||x.sql.includes('last_checked_at=')));
});
test('preexisting identical AWB stays unchanged, import is idempotent',async()=>{
 const db=fakeDB(awb);const res=await shippingApi(request([item]),{DB:db},{businessId:'biz'});
 assert.equal(res.status,200);assert.equal((await res.json()).results[0].outcome,'already_saved');
 assert.ok(!db.calls.some(x=>x.sql.startsWith('UPDATE gstdesk_shipments')));
});
test('conflicting preexisting AWB cannot be overwritten',async()=>{
 const res=await shippingApi(request([item]),{DB:fakeDB('VL0012345678900')},{businessId:'biz'});
 assert.equal((await res.json()).results[0].outcome,'conflicting_existing_awb');
});
test('reject ambiguous and unsupported identifiers with no writes',async()=>{
 const bad={...item,awb:'fake'};
 let r=await shippingApi(request([bad]),{DB:fakeDB()},{businessId:'biz'});assert.equal(r.status,400);
 r=await shippingApi(request([item,item]),{DB:fakeDB()},{businessId:'biz'});assert.equal(r.status,409);
 r=await shippingApi(request([{...item,sourceSha256:'00'}]),{DB:fakeDB()},{businessId:'biz'});
 assert.equal(r.status,400);
});
test('browser import parses PDF shipping labels and never uploads documents',()=>{
 assert.doesNotThrow(()=>new vm.Script(shippingClientJS));
 assert.ok(shippingClientJS.includes("getTextContent()"));
 assert.ok(shippingClientJS.includes('parsePrintedInvoice(text)'));
 assert.ok(shippingClientJS.includes('sellerGSTIN'));
 assert.ok(shippingClientJS.includes('invoiceTotalPaise'));
 assert.ok(shippingClientJS.includes('nv-upload-card'));
 assert.ok(shippingClientJS.includes('Parse, Validate & Save to D1'));
 assert.ok(shippingClientJS.includes("Seller is not NIDHI"));
 assert.ok(shippingClientJS.includes("Delhivery"));
 assert.ok(shippingClientJS.includes("jszip@3.10.1"));
 assert.ok(shippingClientJS.includes("'/api/shipping/labels/import'"));
 assert.ok(shippingClientJS.includes("crypto.subtle.digest('SHA-256'"));
 assert.ok(!shippingClientJS.includes("new FormData("));
 assert.ok(!shippingClientJS.includes('setInterval('));
 assert.ok(!shippingClientJS.includes('fetch("https://www.valmo.in'));
 assert.ok(!shippingClientJS.includes('localStorage.setItem(cacheKey,JSON.stringify(entry.bytes)'));
});

test('Keshav Kripa labels cannot be imported into Nividhi business',async()=>{
 const db=fakeDB();
 const r=await shippingApi(request([{...item,sellerName:'Keshav Kripa',invoiceNo:'pwfyy279'}]),{DB:db},{businessId:'biz'});
 assert.equal(r.status,400);
 assert.equal(db.calls.length,0);
});
