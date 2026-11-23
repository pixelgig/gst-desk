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

test('Meesho catalogue proxy never performs unauthenticated outbound fetch', async () => {
  const worker = (await import('../cloudflare/workers/gst-desk-preview/worker.js')).default;
  const env = {
    DB: {},
    ACCESS_AUDIENCE: 'sample-audience',
    ACCESS_ISSUER: 'https://example.cloudflareaccess.com',
    GST_OWNER_EMAIL: 'owner@example.test',
    GST_BUSINESS_ID: 'business-test'
  };
  const request = new Request(
    'https://gst.nividhi.in/api/catalogue/meesho?store=' +
      encodeURIComponent('https://www.meesho.com/sample-store')
  );
  const response = await worker.fetch(request, env);
  assert.equal(response.status, 403, 'Catalog proxy must require verified Access session');
  assert.equal((await response.json()).error, 'not_authorized');
});
test('Meesho catalogue handler checks Access before fetching the upstream store', () => {
  const source=file('worker.js');
  const marker="if(url.pathname==='/api/catalogue/meesho')";
  const pos=source.indexOf(marker);
  assert.ok(pos >= 0, 'Catalogue route exists');
  const handler=source.slice(pos, pos + 500);
  assert.ok(handler.includes('authorize(request,env)'), 'Auth must be in the route');
  assert.ok(handler.indexOf('authorize(request,env)') < handler.indexOf('new URL(raw)'), 'Auth is checked before upstream URL processing');
  assert.ok(handler.includes("request.method!=='GET'"), 'Only read operations supported');
});
