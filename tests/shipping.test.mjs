import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parseValmoCarrierResult,shippingApi} from '../cloudflare/workers/gst-desk-preview/shipping-api.mjs';
import {shippingClientJS} from '../cloudflare/workers/gst-desk-preview/shipping-client.mjs';
import {overviewClientJS} from '../cloudflare/workers/gst-desk-preview/overview-client.mjs';

const awb='VL0081234567890',businessId='test-business',who={businessId};
const request=(path,method='GET',body,origin='https://gst.example.test')=>{
  const headers={};
  if(method!=='GET'){headers.origin=origin;headers['X-GST-Desk-Write']='1';headers['content-type']='application/json'}
  return new Request('https://gst.example.test'+path,{method,headers,body:body?JSON.stringify(body):undefined});
};
const fixture=(status='awaiting_awb')=>({
  suborder_id:'353095258237371968_1',invoice_no:'87test0001',
  carrier:'unconfirmed',awb:null,awb_source:null,status,
  status_description:null,delivered_at:null,delivered_date_ist:null,
  last_checked_at:null,last_event_at:null,last_check_error:null,events_json:'[]',
  order_date:'2026-11-14',document_date:'2026-11-14',document_total_paise:18004,
  details_json:JSON.stringify({productDescription:'Synthetic test bracelet'})
});
const db=()=>{
 const seen=[];
 return {seen,prepare(sql){return {bind(...args){seen.push({sql,args});return {
   async first(){
     if(sql.includes('COUNT(*) AS known_orders'))return {known_orders:24,awaiting_awb:24,verified_delivered:0,verified_in_transit:0,carrier_returned:0,eligible_for_check:0,invoiced_orders_this_month:7};
     if(sql.includes('SELECT status,awb'))return {status:'awaiting_awb',awb:null};
     return fixture();
   },
   async all(){if(sql.includes('carrier=')&&sql.includes('status!='))return {results:[]};return {results:[fixture()]}},
   async run(){return {meta:{changes:1}}}
 }}}}};
};
test('month labels parse only MM digits instead of all MMYYYY',()=>{
  const raw=overviewClientJS.match(/const month=p=>[^;]+;/)?.[0];
  assert.ok(raw);
  const fn=vm.runInNewContext('('+raw.slice('const month='.length,-1)+')');
  assert.equal(fn('092026'),'September 2026');
  assert.equal(fn('102026'),'October 2026');
  assert.equal(fn('112026'),'November 2026');
});
test('no customer or carrier delivery can be fabricated from invoice metadata',async()=>{
  const env={DB:db()};
  const x=await shippingApi(request('/api/shipping/orders'),env,who);
  assert.equal(x.status,200);const rows=(await x.json()).items;
  assert.equal(rows[0].awb,null);assert.equal(rows[0].status,'awaiting_awb');
  assert.equal(rows[0].deliveredDateIST,null);
});
test('summary counts only known records and never claims live source',async()=>{
  const env={DB:db()};
  const x=await shippingApi(request('/api/shipping/summary'),env,who);
  assert.equal(x.status,200);const data=await x.json();
  assert.equal(data.counts.known_orders,24);
  assert.equal(data.counts.awaiting_awb,24);
  assert.equal(data.counts.verified_delivered,0);
  assert.equal(data.autoCheck,false);
  assert.deepEqual(env.DB.seen[0].args,[businessId]);
});
test('manual check with missing AWBs makes no calls and checks zero records',async()=>{
  const env={DB:db()};
  const x=await shippingApi(request('/api/shipping/check','POST',{mode:'pending'}),env,who);
  assert.equal(x.status,200);const j=await x.json();assert.equal(j.selected,0);assert.equal(j.results.length,0);
});
test('manual check and AWB assignment enforce same-origin write',async()=>{
  const env={DB:db()};
  const bad=request('/api/shipping/check','POST',{mode:'pending'},'https://other.example.test');
  assert.equal((await shippingApi(bad,env,who)).status,403);
  assert.equal((await shippingApi(request('/api/shipping/orders/353095258237371968_1','PUT',{awb:'353095258237371968',source:'seller_shipping_label'}),env,who)).status,400);
});
test('carrier delivery date must be backed by an unambiguous event timestamp',()=>{
  const missing=parseValmoCarrierResult({success:true,tracking_id:awb,main_status:{description:'Delivered on 17 Nov'},tracking:[{status:'Delivered',display_name:'Delivered',date:'17 Nov'}]},awb);
  assert.equal(missing.status,'needs_review');
  assert.equal(missing.deliveredAt,null);
  const stamp=Date.UTC(2026,10,17,10,0,0);
  const verified=parseValmoCarrierResult({success:true,tracking_id:awb,main_status:{description:'Delivered on Tue, 17 Nov'},tracking:[{status:'Delivered',display_name:'Delivered',date:stamp}]},awb);
  assert.equal(verified.status,'delivered');
  assert.equal(verified.deliveredAt,'2026-11-17T10:00:00.000Z');
  assert.equal(verified.deliveredDateIST,'2026-11-17');
});
test('returned and failed shipments are not falsely marked delivered',()=>{
  for(const [status,expect] of [['Returned to Seller','returned'],['Delivery Failed','delivery_failed'],['Out for Delivery','out_for_delivery']]){
    assert.equal(parseValmoCarrierResult({success:true,tracking_id:awb,main_status:{description:status},tracking:[]},awb).status,expect);
  }
});
test('reject mismatched tracking results and preserve missing data',()=>{
  const x=parseValmoCarrierResult({success:true,tracking_id:'VL0011111111111',main_status:{description:'Delivered'},tracking:[]},awb);
  assert.equal(x.ok,false);assert.equal(x.error,'carrier_awb_mismatch');
});
test('client compiles; no scheduled tracking or file uploads',()=>{
  assert.doesNotThrow(()=>new vm.Script(shippingClientJS));
  assert.ok(shippingClientJS.includes('/api/shipping/check'));
  assert.ok(shippingClientJS.includes("mode:'pending'"));
  assert.ok(!shippingClientJS.includes('setInterval('));
  assert.ok(!shippingClientJS.includes('FileReader('));
  assert.ok(!shippingClientJS.includes('FormData('));
});
