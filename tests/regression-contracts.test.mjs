import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = '../cloudflare/workers/gst-desk-preview/';
const file = path => readFileSync(new URL(root + path, import.meta.url), 'utf8');

test('private database APIs keep explicit auth gates in the Worker router', () => {
  const source=file('worker.js');
  assert.match(source, /if\(url\.pathname\.startsWith\('\/api\/shipping\/'\)\)\{const a=await authorize\(/);
  assert.match(source, /if\(url\.pathname==='\/api\/overview'/);
  assert.match(source, /if\(url\.pathname==='\/api\/state'/);
  assert.match(source, /if\(url\.pathname==='\/api\/valmo\/track'\)\{const access=await authorize/);
});
test('signed Access claims and business-scoped D1 membership remain mandatory', () => {
  const source=file('state-api.mjs');
  assert.match(source, /crypto\.subtle\.verify/);
  assert.match(source, /gstdesk_memberships/);
  assert.match(source, /payload\.email\.toLowerCase\(\)!==env\.GST_OWNER_EMAIL\.toLowerCase\(\)/);
  assert.match(source, /m\.business_id=\?/);
});
test('premium brand remains a link to home', () => {
  const theme=file('premium-theme.mjs');
  assert.ok(theme.includes('<a class="app-brand" href="/"'));
  assert.match(theme, /return to homepage/);
});
test('Valmo UI retains independent uploader, review button, category cards and refresh', () => {
  const js=file('shipping-client.mjs');
  for (const name of ['nv-upload-card','Parse, Validate & Save to D1','Total Delivered','Total In Transit','Refresh Data']) assert.ok(js.includes(name),name);
  assert.ok(js.includes('pdfjsLib'));
  assert.ok(js.includes('/api/shipping/labels/import'));
});
test('dashboard and Meesho two-ZIP draft tool remain reachable in source', () => {
  const worker=file('worker.js'), overview=file('overview-client.mjs');
  for(const name of ['gstr1-gstzip','gstr1-invoicezip'])assert.ok(worker.includes(name),name);
  assert.ok(overview.includes('/api/overview'));
  assert.ok(overview.includes('Refresh Data'));
});
