import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { shippingClientJS } from '../cloudflare/workers/gst-desk-preview/shipping-client.mjs';

const shipment={
 suborderId:'353399259117061185_1',invoiceNo:'87whi2723',
 carrier:'valmo',awb:'VL0086120621708',status:'not_checked',
 deliveredDateIST:null,lastCheckedAt:null,invoiceDate:'2026-11-15',
 orderDate:'2026-11-15',invoiceValuePaise:12531,productDescription:'Test product'
};
const summary={autoCheck:false,live:false,counts:{
 known_orders:24,invoiced_orders_this_month:7,verified_delivered:0,
 verified_in_transit:0,awaiting_awb:22,eligible_for_check:2,
 carrier_returned:0
}};
async function mount(html){
 const dom=new JSDOM(html,{url:'https://gst.nividhi.in/',runScripts:'outside-only',pretendToBeVisual:true});
 const calls=[];
 dom.window.fetch=async url=>{
   const u=String(url);
   calls.push(u);
   let data;
   if(u==='/api/shipping/summary')data=summary;
   else if(u.startsWith('/api/shipping/orders?'))data={items:[shipment],hasMore:false};
   else throw Error('Unexpected or unauthorized request to '+u);
   return {ok:true,status:200,json:async()=>data};
 };
 dom.window.eval(shippingClientJS);
 dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,40));
 return {dom,calls};
}
test('server D1 shell mounts and shows predefined orders and Check Status without checking Valmo',async()=>{
 const html='<!doctype html><html><head></head><body>'+
 '<nav class="tabs"><button data-tab="valmo">Valmo Tracking</button></nav>'+
 '<section id="valmo" class="on"><div id="nv-shipping-tracker" class="card" data-tracker-shell="server">'+
 'Loading your predefined shipments from Cloudflare D1…</div></section></body></html>';
 const {dom,calls}=await mount(html);
 const {document}=dom.window;
 const panel=document.getElementById('nv-shipping-tracker');
 assert.ok(panel);
 assert.equal(document.querySelectorAll('#nv-shipping-tracker').length,1,'No duplicate tracker');
 assert.match(panel.textContent,/Valmo Tracking · Saved orders/);
 assert.match(panel.textContent,/Check Status · Pending AWBs/);
 assert.match(panel.textContent,/Order 353399259117061185_1/);
 assert.match(panel.textContent,/VL0086120621708/);
 assert.match(panel.textContent,/24 invoiced orders/);
 assert.ok(calls.includes('/api/shipping/summary'));
 assert.ok(calls.some(x=>x.startsWith('/api/shipping/orders?')));
 assert.ok(!calls.some(x=>x.includes('/api/shipping/check')||x.includes('/api/valmo/track')),'No carrier checks on page load');
 dom.window.close();
});
test('obsolete browser Valmo form is removed if an older Worker still serves it',async()=>{
 const html='<!doctype html><html><head></head><body>'+
 '<nav class="tabs"><button data-tab="valmo">Valmo Tracking</button></nav>'+
 '<section id="valmo" class="on"><div class="card"><textarea id="valmo-awbs"></textarea>'+
 '<button id="valmo-check">Track shipments</button></div></section></body></html>';
 const {dom}=await mount(html);
 const doc=dom.window.document;
 assert.equal(doc.getElementById('valmo-awbs'),null,'Legacy form must not appear');
 assert.ok(doc.getElementById('nv-shipping-tracker'));
 assert.match(doc.getElementById('nv-shipping-tracker').textContent,/Check Status/);
 dom.window.close();
});
test('Worker HTML ships D1 tracking shell and loads state/client scripts after page markup',()=>{
 const worker=readFileSync(new URL('../cloudflare/workers/gst-desk-preview/worker.js',import.meta.url),'utf8');
 assert.ok(worker.includes('data-tracker-shell'));
 assert.ok(!worker.includes('id=\\\"valmo-awbs\\\"'));
 assert.ok(worker.includes(".replace('</main><script>','</main>'+stateInjection+'<script>')"));
});
