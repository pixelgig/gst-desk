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
   async all(){if(sql.includes('carrier=')&&sql.includes('status NOT IN'))return {results:[]};return {results:[fixture()]}},
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

test('Valmo workspace and homepage tracking card stay visible under legacy section CSS',()=>{
  // The old app uses \`section{display:none}\` and only displays \`section.on\`.
  // A nested section inside #valmo/on disappears, even while the parent opens.
  assert.ok(shippingClientJS.includes("tracker=el('div')"));
  assert.ok(shippingClientJS.includes("target=el('div')"));
  assert.ok(!shippingClientJS.includes("tracker=el('section')"));
  assert.ok(!shippingClientJS.includes("target=el('section')"));
  assert.ok(shippingClientJS.includes("tracker.id='nv-shipping-tracker'"));
  assert.ok(shippingClientJS.includes("section.insertBefore(tracker,section.firstChild)"));
});

test('one-request bootstrap yields order rows plus verified counts, without courier calls',async()=>{
 const env={DB:db()};
 const res=await shippingApi(request('/api/shipping/bootstrap?filter=all'),env,who);
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.autoCheck,false);
 assert.equal(data.counts.known_orders,24);
 assert.equal(data.items.length,1);
 assert.equal(data.items[0].invoiceNo,'87test0001');
 assert.ok(env.DB.seen.every(x=>x.args[0]===businessId));
});
test('live Valmo API ORDER_CONFIRMED with On the way means in transit, not unverified',()=>{
 const r=parseValmoCarrierResult({success:true,tracking_id:awb,main_status:{
  status:'ORDER_CONFIRMED',description:'On the way',display_name:'Delivery by Sat, 21 Nov'
 },tracking:[{status:'ORDER_SHIPPED',display_name:'Shipped',is_current:true,
 timestamp:Date.UTC(2026,10,15,12,0)}]},awb);
 assert.equal(r.status,'in_transit');
 assert.equal(r.estimatedDeliveryText,'Delivery by Sat, 21 Nov');
 assert.equal(r.deliveredAt,null);
});
test('nested is_current out-for-delivery stage wins over On the way headline',()=>{
 const r=parseValmoCarrierResult({success:true,tracking_id:awb,main_status:{
  status:'ORDER_CONFIRMED',description:'On the way',display_name:'Delivery by Thu, 19 Nov'
 },tracking:[{display_name:'Shipped',status:'ORDER_SHIPPED',timestamp:Date.UTC(2026,10,15,5),sub_status_list:[
  {display_name:'Out for Delivery',status:'ORDER_OUT_FOR_DELIVERY',is_current:true,timestamp:Date.UTC(2026,10,18,5)}
 ]}]},awb);
 assert.equal(r.status,'out_for_delivery');
 assert.equal(r.estimatedDeliveryText,'Delivery by Thu, 19 Nov');
 assert.equal(r.deliveredDateIST,null,'Expected date must never be a delivery date');
});
test('returned parcel current event is never mistaken for successful delivery',()=>{
 const r=parseValmoCarrierResult({success:true,tracking_id:awb,
   main_status:{status:'ORDER_DELIVERY_FAILED',description:'Order returned to seller',display_name:'Delivery Failed'},
   tracking:[{status:'ORDER_RETURNED_TO_SELLER',display_name:'Returned to Seller',is_current:true,
      timestamp:Date.UTC(2026,9,30,9,0)}]},awb);
 assert.equal(r.status,'returned');
 assert.equal(r.deliveredDateIST,null);
});

test('owner-confirmed Delhivery is shown as Delivered without fabricating a carrier delivery date',async()=>{
 const base=fixture('not_checked');
 base.carrier='other';base.carrier_name='delhivery';
 base.awb='1490841583388220';
 base.owner_confirmed_delivered=1;
 base.owner_delivery_confirmed_at='2026-11-18 20:05:35';
 base.delivered_at=null;base.delivered_date_ist=null;
 const env={DB:{prepare(){return {bind(){return {all:async()=>({results:[base]})}}}}}};
 const res=await shippingApi(request('/api/shipping/orders?filter=all'),env,who);
 assert.equal(res.status,200);
 const row=(await res.json()).items[0];
 assert.equal(row.status,'delivered');
 assert.equal(row.ownerConfirmedDelivered,true);
 assert.equal(row.deliveredDateIST,null);
 assert.equal(row.deliveredAt,null);
 assert.equal(row.carrier,'delhivery');
 assert.equal(row.ownerConfirmationRecordedAt,'2026-11-18 20:05:35');
});
