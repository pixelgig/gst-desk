import fs from 'node:fs';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';

export async function inspectLegacy() {
  const source = fs.readFileSync(new URL('../cloudflare/workers/gst-desk-preview/worker.js', import.meta.url), 'utf8');
  let handler;
  const context = vm.createContext({
    addEventListener(type, callback) { if (type === 'fetch') handler = callback; },
    URL, Response, AbortSignal,
  });
  new vm.Script(source, { filename: 'legacy-worker.js' }).runInContext(context);
  let pending;
  handler({ request: new Request('https://synthetic.invalid/'), respondWith(value) { pending = value; } });
  const response = await pending;
  const html = await response.text();
  let inline = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=|type=["'](?:application\/|module)/i.test(match[1])) continue;
    new vm.Script(match[2], { filename: `rendered-inline-${++inline}.js` });
  }
  return { html, inline, status: response.status };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { inline, status } = await inspectLegacy();
  console.log(JSON.stringify({ status, parsedInlineScripts: inline }));
}
