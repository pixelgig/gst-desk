import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleVoiceSummary,handleVoiceQuery,answerSavedVoiceMetric } from '../../../cloudflare/workers/gst-desk-api-staging/voice-summary.mjs';

function makeEnv({ member = true, count = 3, db = true } = {}) {
  const env = {
    VOICE_API_TOKEN: 'test-secret-not-production',
    VOICE_OWNER_EMAIL: 'owner@example.test',
    VOICE_BUSINESS_ID: 'business_one',
  };
  if (db) env.DB = {
    prepare(sql) {
      const isMembershipQuery = sql.includes('gstdesk_memberships');
      assert.ok(isMembershipQuery || sql.includes('gstdesk_invoice_drafts') || sql.includes('gstdesk_shipments'));
      return {
        bind(...args) {
          assert.equal(args[0], env.VOICE_BUSINESS_ID);
          if (isMembershipQuery) assert.equal(args[1], env.VOICE_OWNER_EMAIL);
          return {
            async first() {
              if (isMembershipQuery) return member ? {allowed: 1} : null;
              if (sql.includes('gstdesk_shipments') && sql.includes('lastDelivered')) return null;
              if (sql.includes('gstdesk_shipments') && sql.includes('ORDER BY delivered_at')) return null;
              if (sql.includes('gstdesk_shipments')) return {known_orders:24,verified_delivered:9,owner_confirmed_delivered:4,total_delivered:13,verified_in_transit:2,awaiting_awb:8,returned:1};
              return {total: count, last_updated: '2026-11-18T04:00:00Z'};
            },
          };
        },
      };
    },
  };
  return env;
}

function request(token = 'test-secret-not-production', method = 'GET') {
  return new Request('https://staging.example.test/api/voice/summary', {
    method, headers: {'authorization': 'Bearer ' + token},
  });
}

test('fails closed when voice integration is not configured', async () => {
  const response = await handleVoiceSummary(request(), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'voice_not_configured');
});

test('rejects unauthenticated and incorrect credentials', async () => {
  for (const token of ['wrong-token', '', 'test-secret-not-productionX']) {
    const response = await handleVoiceSummary(request(token), makeEnv());
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'unauthorized');
  }
});

test('rejects unsafe methods', async () => {
  const response = await handleVoiceSummary(request(undefined, 'POST'), makeEnv());
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('rejects an unauthorized business and does not query invoice records', async () => {
  const response = await handleVoiceSummary(request(), makeEnv({member: false}));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'business_access_denied');
});

test('no D1 binding means no data', async () => {
  const response = await handleVoiceSummary(request(), makeEnv({db: false}));
  assert.equal(response.status, 503);
});

test('only reports authorized read-only draft counts, never guesses sales/tax', async () => {
  const response = await handleVoiceSummary(request(), makeEnv({count: 17}));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const data = await response.json();
  assert.equal(data.readOnly, true);
  assert.equal(data.drafts.count, 17);
  assert.deepEqual(data.availableMetrics, {
    drafts: true, sales: false, profit: false, gstPayable: false,
    ordersToday: false, pendingDeliveries: false, verifiedDeliveries: true,
    shipmentBreakdown: true,
  });
  assert.equal(data.delivery.knownInvoicedOrders,24);
  assert.equal(data.delivery.verifiedDelivered,9);
  assert.equal(data.delivery.ownerConfirmedDelivered,4);
  assert.equal(data.delivery.totalDelivered,13);
  assert.equal(data.delivery.verifiedInTransit,2);
  assert.equal(data.delivery.awaitingAwb,8);
  assert.equal(data.delivery.returned,1);
  assert.equal(data.delivery.lastDeliveredDateIST,null);
  assert.equal(data.orders.today, null);
  assert.equal(data.orders.pendingDeliveries, null);
  assert.equal(data.orders.timeZone, 'Asia/Kolkata');
  assert.ok(!JSON.stringify(data).includes('owner@example.test'));
});

test('shipment counting distinguishes carrier and owner confirmation and return statuses', async () => {
  const data = await (await handleVoiceSummary(request(), makeEnv())).json();
  assert.equal(data.delivery.verifiedDelivered + data.delivery.ownerConfirmedDelivered,
    data.delivery.totalDelivered);
  assert.equal(data.delivery.knownInvoicedOrders,
    data.delivery.totalDelivered + data.delivery.verifiedInTransit +
    data.delivery.awaitingAwb + data.delivery.returned);
  assert.equal(data.availableMetrics.ordersToday, false);
  assert.equal(data.orders.today, null);
  assert.equal(data.orders.pendingDeliveries, null);
});

test('Alexa voice source handles saved shipment breakdown without exposing real order identities', () => {
  const source = readFileSync(
    new URL('../lambda/index.js', import.meta.url), 'utf8');
  for (const name of ['DeliveryOverviewHandler','AwaitingAwbHandler',
    'ReturnedOrdersHandler','PendingDeliveriesHandler']) {
    assert.ok(source.includes(name));
  }
  assert.ok(source.includes('totalDelivered'));
  assert.ok(source.includes('ownerConfirmedDelivered'));
  assert.ok(!source.includes('customerAddress'));
});

function voiceQueryRequest(intentName, question = null, token = 'test-secret-not-production') {
  return new Request('https://staging.example.test/api/voice/query', {
    method:'POST',
    headers:{authorization:'Bearer ' + token,'content-type':'application/json'},
    body:JSON.stringify({intentName,question}),
  });
}

test('generic voice query is read-only and rejects invalid or absent credentials', async () => {
  const unauthorized = await handleVoiceQuery(
    voiceQueryRequest('InventorySummaryIntent', null, 'wrong-token'),makeEnv());
  assert.equal(unauthorized.status,401);
  assert.equal((await unauthorized.json()).error,'unauthorized');
  const forbidden = await handleVoiceQuery(voiceQueryRequest('NetProfitIntent'),makeEnv({member:false}));
  assert.equal(forbidden.status,403);
  const wrongMethod = await handleVoiceQuery(
    new Request('https://staging.example.test/api/voice/query',{method:'GET'}),makeEnv());
  assert.equal(wrongMethod.status,405);
  const invalid = await handleVoiceQuery(voiceQueryRequest('bad/intent'),makeEnv());
  assert.equal(invalid.status,400);
});

test('known saved shipment questions are answered; missing workspaces return unavailable', async () => {
  const delivered=await handleVoiceQuery(voiceQueryRequest('VerifiedDeliveredIntent'),makeEnv());
  assert.equal(delivered.status,200);
  const result=await delivered.json();
  assert.equal(result.readOnly,true);
  assert.equal(result.available,true);
  assert.ok(result.spokenText.includes('13'));
  assert.ok(result.spokenText.includes('4'));
  for (const intent of ['InventorySummaryIntent','NetProfitIntent',
    'GSTDueIntent','TodayMeeshoOrdersIntent','ShipmentDetailsIntent']) {
    const res=await handleVoiceQuery(voiceQueryRequest(intent),makeEnv());
    assert.equal(res.status,200);
    const value=await res.json();
    assert.equal(value.available,false);
    assert.ok(!value.spokenText.includes('owner@example.test'));
  }
  const freeForm=await handleVoiceQuery(
    voiceQueryRequest('BusinessQueryIntent','कितने पार्सल रिटर्न हुए'),makeEnv());
  const free=await freeForm.json();
  assert.equal(free.available,true);
  assert.ok(free.spokenText.includes('1'));
});

test('unrecognized natural-language question is unavailable, never fabricated', () => {
  const value=answerSavedVoiceMetric('BusinessQueryIntent','कल कितने ऑर्डर आए',{});
  assert.equal(value.available,false);
  assert.ok(value.spokenText.includes('उपलब्ध नहीं'));
});

test('Lambda routes flexible future requests through read-only backend', () => {
  const source=readFileSync(new URL('../lambda/index.js',import.meta.url),'utf8');
  assert.ok(source.includes("url.pathname = '/api/voice/query'"));
  assert.ok(source.includes('GenericBusinessHandler'));
  assert.ok(source.includes("https.request("));
  assert.ok(!source.includes('eval('));
});

test('Alexa answers common questions about its actual capabilities and access', async () => {
  const expected = [
    ['CapabilitiesIntent','रीड ओनली'],
    ['AccessScopeIntent','रीड ओनली'],
    ['DataAvailabilityIntent','24'],
    ['QuestionExamplesIntent','कितने पार्सल डिलीवर'],
    ['DataFreshnessIntent','लाइव ऑर्डर'],
    ['PrivacySafetyIntent','ग्राहक का नाम'],
  ];
  for (const [intentName, excerpt] of expected) {
    const r=await handleVoiceQuery(voiceQueryRequest(intentName), makeEnv());
    assert.equal(r.status,200,intentName);
    const data=await r.json();
    assert.equal(data.available,true,intentName);
    assert.equal(data.readOnly,true);
    assert.ok(data.spokenText.includes(excerpt), intentName);
    assert.ok(!data.spokenText.includes('owner@example.test'));
  }
  const freeForm=await handleVoiceQuery(
    voiceQueryRequest('BusinessQueryIntent','तुम्हारे पास क्या डेटा है'),makeEnv());
  assert.equal((await freeForm.json()).available,true);
});

test('self-knowledge does not invent unverified data access', () => {
  const fake={availableMetrics:{drafts:false,shipmentBreakdown:false,ordersToday:false}};
  const cap=answerSavedVoiceMetric('CapabilitiesIntent',null,fake);
  assert.ok(cap.spokenText.includes('कोई सत्यापित बिजनेस डेटा नहीं'));
  const data=answerSavedVoiceMetric('DataAvailabilityIntent',null,fake);
  assert.equal(data.available,false);
  const restricted=answerSavedVoiceMetric('AccessScopeIntent',null,fake);
  assert.ok(restricted.spokenText.includes('रिकॉर्ड बदल'));
});

test('Hindi interaction model has unique utterances and expected intent names', () => {
  const model = JSON.parse(readFileSync(
    new URL('../interaction-models/hi-IN.json', import.meta.url), 'utf8'
  ));
  const intents = model.interactionModel.languageModel.intents;
  const all = intents.flatMap(i => i.samples || []);
  assert.equal(new Set(all).size, all.length);
  assert.ok(intents.some(i => i.name === 'DraftCountIntent'));
  assert.ok(intents.some(i => i.name === 'StatusIntent'));
  assert.ok(intents.some(i => i.name === 'TodayMeeshoOrdersIntent'));
  assert.ok(intents.some(i => i.name === 'PendingDeliveriesIntent'));
  assert.ok(intents.some(i => i.name === 'VerifiedDeliveredIntent'));
  assert.ok(intents.some(i => i.name === 'VerifiedTransitIntent'));
  assert.ok(intents.some(i => i.name === 'LastDeliveryDateIntent'));
  assert.ok(intents.some(i => i.name === 'UpdateDeliveryStatusIntent'));
  assert.ok(intents.some(i => i.name === 'AwaitingAwbIntent'));
  assert.ok(intents.some(i => i.name === 'ReturnedOrdersIntent'));
  assert.ok(intents.some(i => i.name === 'DeliveryOverviewIntent'));
  assert.ok(intents.length >= 50, 'broad future-proof Hindi intent catalog');
  assert.ok(all.length >= 200, 'many realistic Hindi sample phrases');
  const flexible=intents.find(i=>i.name === 'BusinessQueryIntent');
  assert.equal(flexible.slots.length,1);
  assert.equal(flexible.slots[0].type,'AMAZON.SearchQuery');
  assert.ok(flexible.samples.every(v=>v.includes('{question}') && v !== '{question}'));
  // Regression: a previous model accidentally expanded Hindi strings into
  // one-character utterances. Never ship a malformed interaction model.
  assert.ok(all.length >= 300,'broad Hindi model with self-knowledge phrases');
  assert.ok(all.every(v=>typeof v==='string' && v.length >= 8 &&
    v.trim()===v),'no single Hindi character/whitespace samples');
  for (const n of ['CapabilitiesIntent','AccessScopeIntent','DataAvailabilityIntent',
    'QuestionExamplesIntent','DataFreshnessIntent','PrivacySafetyIntent']) {
    const intent=intents.find(i=>i.name===n);
    assert.ok(intent,'missing '+n);
    assert.ok(intent.samples.length >= 8);
  }
  assert.ok(intents.some(i=>i.name==='GSTDueIntent'));
  assert.ok(intents.some(i=>i.name==='InventorySummaryIntent'));
  assert.ok(intents.some(i=>i.name==='NetProfitIntent'));
  assert.ok(all.some(s => s.includes('मीशो')));
  assert.ok(all.some(s => s.includes('डिलीवर')));
  assert.ok(model.interactionModel.languageModel.invocationName.includes('डेस्क'));
});
