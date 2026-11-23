import test from 'node:test';
import assert from 'node:assert/strict';
import { COST_POLICY, assessR2Admission, warningLevels } from '../cloudflare/workers/gst-desk-cost-alerts/r2-policy.mjs';
import { createHandler, formatCloudflareAlert } from '../cloudflare/workers/gst-desk-cost-alerts/worker.mjs';
const usage = (o = {}) => ({ storedBytes: 0, reservedBytes: 0, classAMonth: 0, classBMonth: 0, ...o });
test('8 billion decimal-byte ceiling counts reservations and refuses overages', () => {
  assert.equal(assessR2Admission(usage({ storedBytes: COST_POLICY.r2StorageBytes - 4, reservedBytes: 3 }), { uploadBytes: 2 }).reason, 'r2_storage_cap');
  assert.equal(assessR2Admission(usage({ storedBytes: COST_POLICY.r2StorageBytes - 4, reservedBytes: 3 }), { uploadBytes: 1 }).allowed, true);
});
test('operations, max-file and invalid negative counters fail safely', () => {
  assert.equal(assessR2Admission(usage({ classAMonth: COST_POLICY.r2ClassAMonthly }), { classA: 1 }).reason, 'r2_class_a_cap');
  assert.equal(assessR2Admission(usage({ classBMonth: COST_POLICY.r2ClassBMonthly }), { classB: 1 }).reason, 'r2_class_b_cap');
  assert.equal(assessR2Admission(usage(), { uploadBytes: COST_POLICY.maxSingleUploadBytes + 1 }).reason, 'file_too_large');
  assert.throws(() => assessR2Admission(usage({ classBMonth: -1 })), /invalid_class_b_month/);
  assert.throws(() => assessR2Admission({ storedBytes: 0 }), /invalid_reserved_bytes/);
});
test('warnings are readable and deterministic', () => {
  assert.deepEqual(warningLevels(usage({ storedBytes: 6_000_000_000 })), [50, 75]);
});
test('webhook rejects unauthenticated requests and missing secrets', async () => {
  const handler = createHandler(async () => { throw new Error('unexpected_send'); });
  const req = () => new Request('https://alerts.example/cloudflare-budget', { method: 'POST', body: '{}' });
  assert.equal((await handler(req(), {})).status, 503);
  assert.equal((await handler(req(), { CLOUDFLARE_WEBHOOK_SECRET: 'secret-value', TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_IDS: '1234' })).status, 401);
});
test('webhook sends only after authentication to two configured chat ids', async () => {
  const calls = [];
  const handler = createHandler(async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return Response.json({ ok: true, result: { message_id: 123 } }, { status: 200 }); });
  const env = { CLOUDFLARE_WEBHOOK_SECRET: 'secret-value', TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_IDS: '1234,5678' };
  const request = new Request('https://alerts.example/cloudflare-budget', { method: 'POST', headers: { 'cf-webhook-auth': 'secret-value' }, body: JSON.stringify({ name: 'Budget alert', description: 'Projected spend crossed threshold' }) });
  assert.equal((await handler(request, env)).status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.chat_id, '1234');
  assert.match(calls[1].body.text, /Budget alert/);
});
test('webhook handles malformed and oversized payloads', async () => {
  const env = { CLOUDFLARE_WEBHOOK_SECRET: 'secret-value', TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_IDS: '1234' };
  const handler = createHandler(async () => { throw new Error('unexpected_send'); });
  const request = new Request('https://alerts.example/cloudflare-budget', { method: 'POST', headers: { 'cf-webhook-auth': 'secret-value' }, body: '{invalid' });
  assert.equal((await handler(request, env)).status, 400);
  assert.match(formatCloudflareAlert({ name: 'B' }), /Cloudflare billing/);
});

test('Cloudflare text field is displayed as plain, truncated text', () => {
  const output = formatCloudflareAlert({ name: 'GST Desk', text: 'A'.repeat(800) });
  assert.match(output, /Details: A{500}/);
  assert.doesNotMatch(output, /A{501}/);
});
test('oversized chunked body fails with 413 without invoking Telegram', async () => {
  const env = { CLOUDFLARE_WEBHOOK_SECRET: 'secret-value', TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_IDS: '1234' };
  const handler = createHandler(async () => { throw new Error('unexpected_send'); });
  const payload = JSON.stringify({ text: 'x'.repeat(17000) });
  const request = new Request('https://alerts.example/cloudflare-budget', {
    method: 'POST', headers: { 'cf-webhook-auth': 'secret-value' },
    body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close(); } }),
    duplex: 'half'
  });
  assert.equal((await handler(request, env)).status, 413);
});
test('Telegram HTTP 200 with ok=false is not treated as delivered', async () => {
  const env = { CLOUDFLARE_WEBHOOK_SECRET: 'secret-value', TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_IDS: '1234' };
  const handler = createHandler(async () => Response.json({ ok: false }, { status: 200 }));
  const request = new Request('https://alerts.example/cloudflare-budget', {
    method: 'POST', headers: { 'cf-webhook-auth': 'secret-value' },
    body: JSON.stringify({ text: 'test' })
  });
  assert.equal((await handler(request, env)).status, 502);
});
