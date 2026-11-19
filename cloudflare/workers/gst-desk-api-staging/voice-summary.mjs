// Read-only Alexa summary for the existing GST Desk staging API.
// All access is fail-closed; never expose business data without a separate server-side secret.
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extra,
  },
});

async function equalSecret(provided, expected) {
  if (typeof provided !== 'string' || !provided || provided.length > 256 ||
      typeof expected !== 'string' || !expected || expected.length > 256) return false;
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let difference = 0;
  for (let i = 0; i < x.length; i++) difference |= x[i] ^ y[i];
  return difference === 0;
}

export async function handleVoiceSummary(request, env) {
  if (request.method !== 'GET') return json({error: 'method_not_allowed'}, 405, {allow: 'GET'});
  if (!env?.VOICE_API_TOKEN || !env?.VOICE_OWNER_EMAIL || !env?.VOICE_BUSINESS_ID) {
    return json({error: 'voice_not_configured'}, 503);
  }
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ') ||
      !(await equalSecret(auth.slice(7), env.VOICE_API_TOKEN))) {
    return json({error: 'unauthorized'}, 401);
  }
  if (!env.DB) return json({error: 'database_unavailable'}, 503);
  try {
    const member = await env.DB.prepare(
      "SELECT 1 AS allowed FROM gstdesk_memberships m JOIN gstdesk_users u ON u.id=m.user_id WHERE m.business_id=? AND lower(u.email)=lower(?) AND m.role='owner' AND u.status='active' LIMIT 1"
    ).bind(env.VOICE_BUSINESS_ID, env.VOICE_OWNER_EMAIL).first();
    if (!member) return json({error: 'business_access_denied'}, 403);
    const draft = await env.DB.prepare(
      'SELECT COUNT(*) AS total, MAX(updated_at) AS last_updated FROM gstdesk_invoice_drafts WHERE business_id=? AND deleted_at IS NULL'
    ).bind(env.VOICE_BUSINESS_ID).first();
    const shipments = await env.DB.prepare(
      "SELECT COUNT(*) AS known_orders,SUM(CASE WHEN status='delivered' AND delivered_date_ist IS NOT NULL THEN 1 ELSE 0 END) AS verified_delivered,SUM(CASE WHEN owner_confirmed_delivered=1 AND carrier_name='delhivery' AND status!='delivered' THEN 1 ELSE 0 END) AS owner_confirmed_delivered,SUM(CASE WHEN status='delivered' OR (owner_confirmed_delivered=1 AND carrier_name='delhivery') THEN 1 ELSE 0 END) AS total_delivered,SUM(CASE WHEN status IN ('in_transit','out_for_delivery') THEN 1 ELSE 0 END) AS verified_in_transit,SUM(CASE WHEN awb IS NULL THEN 1 ELSE 0 END) AS awaiting_awb,SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END) AS returned FROM gstdesk_shipments WHERE business_id=?"
    ).bind(env.VOICE_BUSINESS_ID).first();
    const lastDelivered = await env.DB.prepare(
      "SELECT delivered_date_ist FROM gstdesk_shipments WHERE business_id=? AND status='delivered' AND delivered_date_ist IS NOT NULL ORDER BY delivered_at DESC LIMIT 1"
    ).bind(env.VOICE_BUSINESS_ID).first();
    return json({
      readOnly: true,
      drafts: {
        count: Number(draft?.total || 0),
        lastUpdated: draft?.last_updated || null,
      },
      availableMetrics: {
        drafts: true,
        sales: false,
        profit: false,
        gstPayable: false,
        ordersToday: false,
        pendingDeliveries: false,
        verifiedDeliveries: true,
        shipmentBreakdown: true,
      },
      delivery: {
        knownInvoicedOrders: Number(shipments?.known_orders || 0),
        verifiedDelivered: Number(shipments?.verified_delivered || 0),
        ownerConfirmedDelivered: Number(shipments?.owner_confirmed_delivered || 0),
        totalDelivered: Number(shipments?.total_delivered || 0),
        verifiedInTransit: Number(shipments?.verified_in_transit || 0),
        awaitingAwb: Number(shipments?.awaiting_awb || 0),
        returned: Number(shipments?.returned || 0),
        lastDeliveredDateIST: lastDelivered?.delivered_date_ist || null,
        source: 'verified_shipment_records_not_live_order_feed',
      },
      orders: {
        today: null,
        pendingDeliveries: null,
        asOf: null,
        timeZone: 'Asia/Kolkata',
        source: 'meesho_sync_not_connected',
      },
    });
  } catch {
    // Never leak a SQL error or financial record through Alexa.
    return json({error: 'data_unavailable'}, 503);
  }
}


// One stable Alexa -> GST Desk read-only question endpoint.
// Future workspaces may extend this dispatcher without editing Alexa-hosted Lambda.
// Never execute arbitrary SQL based on the intent or spoken question.
const unavailableSpeech = 'इस सवाल का डेटा अभी जीएसटी डेस्क में उपलब्ध नहीं है।';

export function answerSavedVoiceMetric(intentName, question, data) {
  const d = data?.delivery || {};
  const available = data?.availableMetrics || {};
  const q = typeof question === 'string' ? question.toLowerCase().trim() : '';
  // Recognize common paraphrases only for metrics actually backed by D1.
  // A free-form phrase is not an authorization to return private per-order details.
  const inferred = intentName === 'BusinessQueryIntent'
    ? (/ए डब्ल्यू बी|एडब्ल्यूबी|awb|ट्रैकिंग नंबर/.test(q) ? 'AwaitingAwbIntent'
      : /रिटर्न|वापस|लौट/.test(q) ? 'ReturnedOrdersIntent'
      : /ट्रांजिट|रास्ते में|डिस्पैच हो गए|आउट फॉर डिलीवरी/.test(q) ? 'VerifiedTransitIntent'
      : /डिलीवर|डिलीवरी हो गई|पहुंच गए|पहुँच गए/.test(q) ? 'VerifiedDeliveredIntent'
      : /ड्राफ्ट|अधूरे चालान/.test(q) ? 'DraftCountIntent'
      : /कुल पार्सल|पूरे शिपमेंट|शिपमेंट समरी|डिलीवरी समरी/.test(q) ? 'DeliveryOverviewIntent'
      : null)
    : intentName;
  const answer = text => ({available:true,spokenText:text});
  if (inferred === 'UpdateDeliveryStatusIntent') {
    return {available:false,spokenText:'एलेक्सा से शिपमेंट का लाइव अपडेट चालू नहीं है। जीएसटी डेस्क के चेक स्टेटस बटन का इस्तेमाल करें।'};
  }
  if (inferred === 'ShipmentDetailsIntent') {
    return {available:false,spokenText:'साझा एलेक्सा स्पीकर पर व्यक्तिगत ऑर्डर और ग्राहक विवरण उपलब्ध नहीं हैं।'};
  }
  if (inferred === 'StatusIntent') return answer('जीएसटी डेस्क का सुरक्षित डेटा कनेक्शन काम कर रहा है।');
  if (inferred === 'DraftCountIntent' &&
      available.drafts === true && Number.isSafeInteger(data?.drafts?.count)) {
    return answer('जीएसटी डेस्क में ' + data.drafts.count + ' ड्राफ्ट चालान दर्ज हैं।');
  }
  if (available.shipmentBreakdown === true) {
    if (inferred === 'VerifiedDeliveredIntent' &&
        Number.isSafeInteger(d.totalDelivered) &&
        Number.isSafeInteger(d.verifiedDelivered) &&
        Number.isSafeInteger(d.ownerConfirmedDelivered)) {
      return answer('जीएसटी डेस्क में ' + d.totalDelivered +
        ' पार्सल डिलीवर दर्ज हैं। इनमें ' + d.verifiedDelivered +
        ' कैरियर द्वारा और ' + d.ownerConfirmedDelivered +
        ' आपके द्वारा कन्फर्म किए गए हैं।');
    }
    if (inferred === 'VerifiedTransitIntent' && Number.isSafeInteger(d.verifiedInTransit)) {
      return answer('सेव किए गए रिकॉर्ड में ' + d.verifiedInTransit +
        ' पार्सल रास्ते में या आउट फॉर डिलीवरी हैं।');
    }
    if (inferred === 'AwaitingAwbIntent' && Number.isSafeInteger(d.awaitingAwb)) {
      return answer(d.awaitingAwb + ' पार्सल की ए डब्ल्यू बी दर्ज नहीं है। उनकी असली डिलीवरी स्थिति अज्ञात है।');
    }
    if (inferred === 'ReturnedOrdersIntent' && Number.isSafeInteger(d.returned)) {
      return answer(d.returned + ' पार्सल रिटर्न दर्ज हैं।');
    }
    if (inferred === 'PendingDeliveriesIntent' &&
        Number.isSafeInteger(d.verifiedInTransit) && Number.isSafeInteger(d.awaitingAwb)) {
      return answer('सेव किए गए रिकॉर्ड में ' + d.verifiedInTransit +
        ' पार्सल रास्ते में हैं और ' + d.awaitingAwb +
        ' की ए डब्ल्यू बी दर्ज नहीं है। सभी पेंडिंग मीशो ऑर्डर की लाइव संख्या उपलब्ध नहीं है।');
    }
    if (inferred === 'DeliveryOverviewIntent' &&
        ['totalDelivered','verifiedInTransit','awaitingAwb','returned']
          .every(k => Number.isSafeInteger(d[k]) && d[k] >= 0)) {
      return answer('सेव किए गए रिकॉर्ड में ' + d.totalDelivered + ' डिलीवर हैं, ' +
        d.verifiedInTransit + ' रास्ते में हैं, ' +
        d.awaitingAwb + ' की ए डब्ल्यू बी नहीं है, और ' +
        d.returned + ' रिटर्न हैं। यह लाइव मीशो डेटा नहीं है।');
    }
  }
  // All other topics are explicitly unavailable until a verified D1 source,
  // privacy review and deterministic response mapping are added here.
  return {available:false,spokenText:unavailableSpeech};
}

export async function handleVoiceQuery(request, env) {
  if (request.method !== 'POST') return json({error:'method_not_allowed'},405,{allow:'POST'});
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    return json({error:'invalid_content_type'},415);
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > 2048) return json({error:'payload_too_large'},413);
  let raw;
  try {
    raw = await request.text();
    if (new TextEncoder().encode(raw).length > 2048) return json({error:'payload_too_large'},413);
  } catch { return json({error:'invalid_body'},400); }
  let input;
  try { input = JSON.parse(raw); } catch { return json({error:'invalid_json'},400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({error:'invalid_payload'},400);
  const {intentName,question} = input;
  if (typeof intentName !== 'string' || !/^[A-Za-z][A-Za-z]*Intent$/.test(intentName) ||
      intentName.length > 80 || (question != null &&
      (typeof question !== 'string' || question.length > 240))) {
    return json({error:'invalid_payload'},400);
  }
  // Reuse the already-tested authentication, fixed business scope and D1 membership
  // checks. Unauthorized users never get a successful "unavailable" response.
  const summaryRequest = new Request(new URL('/api/voice/summary',request.url),{
    method:'GET',headers:{authorization:request.headers.get('authorization')||''}
  });
  const response = await handleVoiceSummary(summaryRequest,env);
  if (!response.ok) return json({error:response.status === 403
    ? 'business_access_denied' : response.status === 401
    ? 'unauthorized' : 'data_unavailable'},response.status);
  const data = await response.json();
  const result = answerSavedVoiceMetric(intentName,question,data);
  return json({readOnly:true,available:result.available,spokenText:result.spokenText});
}
