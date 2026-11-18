import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { stateApi, listState, authorize } from '../../cloudflare/workers/gst-desk-preview/state-api.mjs';
import { cloudClientJS } from '../../cloudflare/workers/gst-desk-preview/cloud-state-client.mjs';

const who={email:'owner@example.test',businessId:'business_one'};
function request(path,method='GET',body,origin='https://gst.example.test'){
  const headers={};
  if(method!=='GET'){
    headers.origin=origin;
    headers['X-GST-Desk-Write']='1';
    headers['content-type']='application/json';
  }
  return new Request('https://gst.example.test'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
}
function db(changes=1){
  const queries=[];
  return {queries,prepare(sql){
    queries.push(sql);
    return {bind(...args){
      queries.push(args);
      return {
        all:async()=>({results:[{storage_key:'gstdesk-working-v1',value_text:'[]',revision:1,updated_at:'2026-11-18'}]}),
        run:async()=>({meta:{changes}})
      };
    }};
  }};
}

test('client adapter compiles as JavaScript',()=>assert.doesNotThrow(()=>new vm.Script(cloudClientJS)));
test('authorization fails closed with missing configuration',async()=>{
  const r=await authorize(request('/api/state'),{});
  assert.equal(r.error.status,503);
});

test('read existing D1 records is business scoped',async()=>{
  const storage=db();
  const rows=await listState({DB:storage},who.businessId);
  assert.equal(rows[0].revision,1);
  assert.deepEqual(storage.queries[1],[who.businessId]);
});

test('GET returns cloud records without browser storage',async()=>{
  const r=await stateApi(request('/api/state'),{DB:db()},who);
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.items.length,1);
  assert.equal(data.source,'cloudflare-d1');
});

test('PUT validates same-origin, custom CSRF header and key',async()=>{
  const env={DB:db()};
  let r=await stateApi(request('/api/state/gstdesk-working-v1','PUT',{value:'[]',expectedRevision:0},'https://evil.example.test'),env,who);
  assert.equal(r.status,403);
  r=await stateApi(request('/api/state/evil-key','PUT',{value:'[]',expectedRevision:0}),env,who);
  assert.equal(r.status,400);
  r=await stateApi(request('/api/state/gstdesk-working-v1','PUT',{value:'[]',expectedRevision:0}),env,who);
  assert.equal(r.status,200);
  assert.equal((await r.json()).revision,1);
});

test('optimistic revision conflicts block silent overwrites',async()=>{
  const r=await stateApi(request('/api/state/gstdesk-working-v1','PUT',{value:'[]',expectedRevision:2}),{DB:db(0)},who);
  assert.equal(r.status,409);
  assert.equal((await r.json()).error,'revision_conflict');
});

test('writes use fixed authenticated business, not request-supplied tenant',async()=>{
  const storage=db();
  const r=await stateApi(request('/api/state/gstdesk-working-v1','PUT',{value:'[1]',expectedRevision:0,businessId:'attacker'}),{DB:storage},who);
  assert.equal(r.status,200);
  assert.deepEqual(storage.queries[1],[who.businessId,'gstdesk-working-v1','[1]']);
});

test('filed returns only allow valid periods',async()=>{
  const r=await stateApi(request('/api/returns/summary?period=000000'),{DB:db()},who);
  assert.equal(r.status,400);
});
