// Standalone Cloudflare billing notification -> Telegram relay.
// This Worker is intentionally NOT connected to GST Desk's production routes.
const MAX_PAYLOAD_BYTES = 32768;
function constantTimeEqual(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  if (!left.length || !right.length || left.length > 256 || right.length > 256) return false;
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}
function safeLine(value) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 180);
}
export function formatCloudflareAlert(payload) {
  const data = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const label = safeLine(data.name || data.notification_name || data.alert_name || data.alert_type || data.title || 'Usage or billing notification');
  const description = safeLine(data.description || data.summary || data.message || '');
  return [
    '🚨 Cloudflare billing / usage alert',
    'Policy: ' + label,
    description ? 'Details: ' + description : 'Check the Cloudflare billing dashboard for details.',
    'Open: https://dash.cloudflare.com/?to=/:account/billing'
  ].join('\n');
}
function chatIds(csv) {
  const values = String(csv || '').split(',').map(x => x.trim()).filter(Boolean);
  const unique = [...new Set(values)];
  if (unique.length < 1 || unique.length > 2 || !unique.every(x => /^-?[0-9]{1,20}$/.test(x))) return null;
  return unique;
}
export function createHandler(sendFetch = fetch) {
  return async (request, env) => {
    const url = new URL(request.url);
    if (url.pathname !== '/cloudflare-budget' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    if (!env || !env.CLOUDFLARE_WEBHOOK_SECRET || !env.TELEGRAM_BOT_TOKEN || !chatIds(env.TELEGRAM_CHAT_IDS)) {
      return new Response('Not configured', { status: 503 });
    }
    if (!constantTimeEqual(request.headers.get('cf-webhook-auth'), env.CLOUDFLARE_WEBHOOK_SECRET)) {
      return new Response('Unauthorized', { status: 401 });
    }
    const size = Number(request.headers.get('content-length') || 0);
    if (size > MAX_PAYLOAD_BYTES) return new Response('Too large', { status: 413 });
    let raw, payload;
    try {
      raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_PAYLOAD_BYTES) return new Response('Too large', { status: 413 });
      payload = JSON.parse(raw);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
    const message = formatCloudflareAlert(payload);
    const results = await Promise.allSettled(chatIds(env.TELEGRAM_CHAT_IDS).map(async id => {
      const response = await sendFetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text: message, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('telegram_send_failed');
    }));
    if (results.some(r => r.status === 'rejected')) return new Response('Delivery failed', { status: 502 });
    return new Response('OK', { status: 200 });
  };
}
export default { fetch: createHandler() };
