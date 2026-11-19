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
