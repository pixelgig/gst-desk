import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { shippingFallbackHTML,overviewFallbackHTML,embedJson } from '../cloudflare/workers/gst-desk-preview/server-snapshot.mjs';
import { shippingClientJS } from '../cloudflare/workers/gst-desk-preview/shipping-client.mjs';

const sample={
 fetchedAt:'2026-11-18T12:33:00.000Z',
 data:{counts:{known_orders:24,verified_delivered:9,total_delivered:13,owner_confirmed_delivered:4,verified_in_transit:1,awaiting_awb:8,total_labels:16,eligible_for_check:2},
 items:[{suborderId:'353095258237371968_1',invoiceNo:'87whi2722',orderDate:'2026-11-14',
 invoiceValuePaise:18004,carrier:'valmo',awb:'VL0086110945778',
 status:'in_transit',estimatedDeliveryText:'Delivery by Sat, 21 Nov',
 deliveredDateIST:null}],hasMore:false}
};
async function run({cached,seed}={}){
 const dom=new JSDOM('<!doctype html><html><head></head><body><nav class="tabs"><button data-tab="valmo"></button></nav><section id="valmo" class="on"><div id="nv-shipping-tracker" class="card" data-tracker-shell="server">Loading</div></section></body></html>',{url:'https://gst.nividhi.in/',runScripts:'outside-only',pretendToBeVisual:true});
 const win=dom.window,calls=[];
 win.__GST_DESK_CACHE_SCOPE__='gstdesk-main-business';
 if(seed)win.__GST_DESK_SHIPPING_SEED__=seed;
 if(cached)win.localStorage.setItem('gstdesk-ui:shipping:v3:gstdesk-main-business',JSON.stringify(cached));
 win.fetch=async u=>{calls.push(String(u));return {ok:true,status:200,json:async()=>sample.data}};
 win.eval(shippingClientJS);
 win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,30));
 return {dom,calls};
}
test('server side page shows D1 records before scripts, including actual fetch time',()=>{
 const html=shippingFallbackHTML(sample);
 assert.match(html,/Total Delivered/);
 assert.match(html,/Total In Transit/);
 assert.equal((html.match(/<details /g)||[]).length,2);
 assert.ok(!html.includes('<details open'));
 assert.match(html,/13<\/strong>/);
 assert.match(html,/Order 353095258237371968_1/);
 assert.match(html,/VL0086110945778/);
 assert.match(html,/Refresh Data/);
 assert.match(html,/Last fetched from D1/);
 assert.doesNotMatch(html,/Loading your predefined shipments/);
});
test('server fallback escapes unsafe DB values and JSON embedding cannot close scripts',()=>{
 const malicious=structuredClone(sample);
 malicious.data.items[0].suborderId='<img src=x onerror=alert(1)>';
 const html=shippingFallbackHTML(malicious);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 assert.ok(!embedJson({hello:'</script><script>alert(1)</script>'}).includes('</script>'));
});
test('default last snapshot loads locally with timestamp and ZERO network requests',async()=>{
 const {dom,calls}=await run({cached:sample});
 const text=dom.window.document.getElementById('nv-shipping-tracker').textContent;
 assert.match(text,/Last fetched from D1/);
 assert.match(text,/Total Delivered/);
 assert.match(text,/Total In Transit/);
 assert.doesNotMatch(text,/VL0086110945778/,'Shipment info must not show by default');
 assert.match(text,/Refresh Data/);
 assert.equal(calls.length,0);
 dom.window.close();
});
test('server seed loads without API requests on a fresh browser',async()=>{
 const {dom,calls}=await run({seed:sample});
 assert.equal(calls.length,0);
 const pane=dom.window.document.getElementById('nv-shipping-tracker');
 assert.doesNotMatch(pane.textContent,/VL0086110945778/);
 pane.querySelector('button[data-category="transit"]').click();
 assert.match(pane.textContent,/VL0086110945778/);
 assert.ok(dom.window.localStorage.getItem('gstdesk-ui:shipping:v3:gstdesk-main-business'));
 dom.window.close();
});
test('manual Refresh Data fetches and persists fresh D1 data with new timestamp',async()=>{
 const {dom,calls}=await run({cached:sample});
 const buttons=[...dom.window.document.querySelectorAll('#nv-shipping-tracker button')];
 const refresh=buttons.find(x=>x.textContent.includes('Refresh Data'));
 assert.ok(refresh);
 refresh.click();
 await new Promise(resolve=>setTimeout(resolve,40));
 assert.equal(calls.length,1);
 assert.match(calls[0],/\/api\/shipping\/bootstrap\?filter=all/);
 const updated=JSON.parse(dom.window.localStorage.getItem('gstdesk-ui:shipping:v3:gstdesk-main-business'));
 assert.equal(updated.data.counts.known_orders,24);
 assert.ok(Date.parse(updated.fetchedAt)>Date.parse(sample.fetchedAt));
 assert.match(dom.window.document.getElementById('nv-shipping-tracker').textContent,/Last fetched from D1/);
 dom.window.close();
});
test('homepage HTML includes a readable financial snapshot if JS fails',()=>{
 const html=overviewFallbackHTML({fetchedAt:sample.fetchedAt,data:{counts:{},monthly:[{invoices:24,creditNotes:2,netPaise:334918}]}});
 assert.match(html,/Tax invoices/);
 assert.match(html,/>24<\/strong>/);
 assert.equal((html.match(/class="nv-ss-card"/g)||[]).length,8);
 assert.match(html,/₹3,349.18/);
 assert.match(html,/Business overview/);
 assert.match(html,/Invoices by document month/);
});
test('HTML worker injects the server snapshot and inline scripts rather than fragile external shipping JS',()=>{
 const worker=readFileSync(new URL('../cloudflare/workers/gst-desk-preview/worker.js',import.meta.url),'utf8');
 assert.ok(worker.includes('shippingFallbackHTML(shippingSeed)'));
 assert.ok(worker.includes('overviewFallbackHTML(overviewSeed)'));
 assert.ok(worker.includes('start+overviewClientJS+end+start+shippingClientJS+end'));
 assert.ok(worker.includes('__GST_DESK_CACHE_SCOPE__'));
});
