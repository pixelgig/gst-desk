import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleVoiceSummary } from '../../../cloudflare/workers/gst-desk-api-staging/voice-summary.mjs';

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
  assert.ok(all.some(s => s.includes('मीशो')));
  assert.ok(all.some(s => s.includes('डिलीवर')));
  assert.ok(model.interactionModel.languageModel.invocationName.includes('डेस्क'));
});
