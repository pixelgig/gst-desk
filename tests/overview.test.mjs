import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {handleOverviewApi} from '../cloudflare/workers/gst-desk-preview/overview-api.mjs';
import {overviewClientJS} from '../cloudflare/workers/gst-desk-preview/overview-client.mjs';

const businessId='owner-business';
const who={businessId,email:'owner@example.test'};
const sampleInvoice={
  invoice_no:'demo100',suborder_id:'demo_order_1',document_type:'tax-invoice',
  order_date:'2026-10-10',document_date:'2026-10-11',hsn:'7117',
  source_period:'092026',document_total_paise:10400,
  pdf_filename:'demo100.pdf',pdf_sha256:'0'.repeat(64),source_zip_sha256:'1'.repeat(64),
  details_json:JSON.stringify({productDescription:'Synthetic test product',invoiceTaxPaise:300,
    taxablePaise:10100,taxComponentsPaise:{IGST:300},placeOfSupply:'Demo State'})
};
const db=()=>{
 const seen=[];
 return {seen,prepare(sql){
   return {bind(...params){
     seen.push({sql,params});
     return {
       async all(){
         if(sql.includes('GROUP BY source_period'))return {results:[{period:'102026',documents:1,invoices:1,credit_notes:0,invoice_paise:10400,credit_paise:0}]};
         if(sql.includes('gstdesk_filed_return_summaries'))return {results:[{tax_period:'092026',return_type:'GSTR-1',filed_on:'2026-10-10',taxable_paise:12000,igst_paise:300,cgst_paise:0,sgst_paise:0}]};
         if(sql.includes('gstdesk_meesho_report_rows'))return {results:[{period:'092026',document_kind:'sale',records:1,taxable_paise:10000,tax_paise:300}]};
         return {results:[sampleInvoice]};
       },
       async first(){
         if(sql.includes('invoice_documents'))return {invoice_documents:1,marketplace_report_rows:1,filed_return_summaries:1,source_archives:1,invoice_drafts:0,saved_workspace_keys:2};
         if(sql.includes('COUNT(*) AS total'))return {total:1};
         return params[1]==='demo100'?sampleInvoice:null;
       }
     };
   }};
 }};
};
const req=(path,method='GET')=>new Request('https://gst.example.test'+path,{method});
test('overview returns business-scoped cloud summary and invoice counts',async()=>{
  const fake=db();const result=await handleOverviewApi(req('/api/overview'),{DB:fake},who);
  assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
  const value=await result.json();assert.equal(value.source,'Cloudflare D1');
  assert.equal(value.monthly[0].netPaise,10400);assert.equal(value.counts.invoice_documents,1);
  assert.equal(value.filedReturns[0].period,'092026');
  assert.equal(value.scope,'imported-records-not-live-marketplace-orders');
  assert.ok(fake.seen.every(x=>x.params[0]===businessId),'Every query must be tenant scoped');
});
test('invoice detail preserves monetary precision and tax breakdown',async()=>{
  const d=await handleOverviewApi(req('/api/invoices/demo100'),{DB:db()},who);
  assert.equal(d.status,200);const x=(await d.json()).invoice;
  assert.equal(x.taxPaise,300);assert.equal(x.taxablePaise,10100);
  assert.equal(x.period,'102026','group by invoice issue date');
  assert.equal(x.sourcePeriod,'092026','preserve original import archive month');
  assert.equal(x.deliveryStatus,null);assert.equal(x.originalPdfAvailable,false);
});
test('invoice list validates periods and pagination',async()=>{
  for(const bad of ['000000','132026','112026%27'])assert.equal((await handleOverviewApi(req('/api/invoices?period='+bad),{DB:db()},who)).status,400);
  assert.equal((await handleOverviewApi(req('/api/invoices?period=102026&page=-1'),{DB:db()},who)).status,400);
  assert.equal((await handleOverviewApi(req('/api/invoices?period=092025'),{DB:db()},who)).status,200,'Older valid reporting periods must remain queryable');
  const list=await handleOverviewApi(req('/api/invoices?period=102026'),{DB:db()},who);
  assert.equal((await list.json()).items[0].invoiceNo,'demo100');
});
test('read only: no data edits or invoice ID injection',async()=>{
  assert.equal((await handleOverviewApi(req('/api/invoices/demo100','DELETE'),{DB:db()},who)).status,405);
  assert.equal((await handleOverviewApi(req('/api/invoices/%27%20OR%201%3D1'),{DB:db()},who)).status,404);
});
test('client script compiles and uses safe DOM APIs',()=>{
  assert.doesNotThrow(()=>new vm.Script(overviewClientJS));
  assert.ok(overviewClientJS.includes('textContent'));
  assert.ok(!overviewClientJS.includes('innerHTML='));
  assert.ok(!overviewClientJS.includes('document.cookie'));
  assert.ok(overviewClientJS.includes('/api/overview'));
  assert.ok(overviewClientJS.includes('/api/invoices'));
});
test('no unsupported route leaks business data',async()=>{
  const x=await handleOverviewApi(req('/api/internal/private'),{DB:db()},who);
  assert.equal(x.status,404);
});
