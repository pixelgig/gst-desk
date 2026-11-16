const allowed = new Set(['created','reviewed','ready_to_dispatch','dispatched','in_transit','out_for_delivery','delivered','cancelled','delivery_failed','RTO_initiated','RTO_received','return_requested','returned','refund_or_credit_note_issued']);
const sources = new Set(['manual','authorized_report','authorized_api']);

export function carrierCapabilities(carrier) {
  return { carrier, automaticSync: false, history: 'manual_or_authorized_report', officialUrl: carrier.toLowerCase() === 'valmo' ? 'https://www.valmo.in/track' : null, eta: null };
}

// Keep arrival order as evidence; derive the current observation by actual event time.
// No carrier network call, no invented ETA and no payment side effect.
export function appendTrackingEvent(history, event) {
  if (!Array.isArray(history) || history.length >= 10000 || !event || typeof event.id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(event.id) || !allowed.has(event.status) || !sources.has(event.source) ||
      typeof event.rawStatus !== 'string' || event.rawStatus.length > 500 ||
      !Number.isFinite(Date.parse(event.eventTime)) || !Number.isFinite(Date.parse(event.recordedAt)) ||
      Date.parse(event.eventTime) > Date.parse(event.recordedAt) + 60000) throw new Error('invalid_tracking_event');
  const existing = history.find(x => x.id === event.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(event)) throw new Error('tracking_event_identity_conflict');
    return [...history];
  }
  return [...history, structuredClone(event)];
}

export function trackingView(history) {
  if (!history.length) return { status: 'unknown', source: null, eventTime: null, lastRecordedAt: null, eta: null, automaticSync: false };
  const ordered = history.map((event,index) => ({event,index})).sort((a,b) => Date.parse(a.event.eventTime) - Date.parse(b.event.eventTime) || a.index - b.index);
  const latest = ordered.at(-1).event;
  return { status: latest.status, source: latest.source, eventTime: latest.eventTime, lastRecordedAt: history.map(x=>x.recordedAt).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1), eta: null, automaticSync: false };
}
