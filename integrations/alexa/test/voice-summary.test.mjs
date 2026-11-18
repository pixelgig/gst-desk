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
      assert.ok(isMembershipQuery || sql.includes('gstdesk_invoice_drafts'));
      return {
        bind(...args) {
          assert.equal(args[0], env.VOICE_BUSINESS_ID);
          if (isMembershipQuery) assert.equal(args[1], env.VOICE_OWNER_EMAIL);
          return {
            async first() {
              return isMembershipQuery ? (member ? {allowed: 1} : null) :
                {total: count, last_updated: '2026-11-18T04:00:00Z'};
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
    ordersToday: false, pendingDeliveries: false,
  });
  assert.equal(data.orders.today, null);
  assert.equal(data.orders.pendingDeliveries, null);
  assert.equal(data.orders.timeZone, 'Asia/Kolkata');
  assert.ok(!JSON.stringify(data).includes('owner@example.test'));
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
  assert.ok(all.some(s => s.includes('मीशो')));
  assert.ok(all.some(s => s.includes('डिलीवर')));
  assert.ok(model.interactionModel.languageModel.invocationName.includes('डेस्क'));
});
