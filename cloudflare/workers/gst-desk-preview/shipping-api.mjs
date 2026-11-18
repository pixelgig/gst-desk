// Existing GST Desk: manual-only courier checks. No cron, no uploaded documents.
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const response=(data,code=200)=>new Response(JSON.stringify(data),{status:code,headers:JSON_HEADERS});
const awbPattern=/^VL[A-Z0-9]{8,25}$/;
const hasWriteHeaders=request=>{
  const u=new URL(request.url);
  return request.headers.get('Origin')===u.origin && request.headers.get('X-GST-Desk-Write')==='1';
};
const formatIstDate=instant=>{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant).map(x=>[x.type,x.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
};
const verifiedEventDate=raw=>{
  // Carrier event date MUST be an explicit, unambiguous time, not a label such as "11 Sep".
  let date=null;
  if(typeof raw==='number'||(typeof raw==='string'&&/^\d{10,13}$/.test(raw))){
    const n=Number(raw);
    if(n>=1577836800&&n<1e11)date=new Date(n*1000);
    else if(n>=1577836800000&&n<1e14)date=new Date(n);
  } else if(typeof raw==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(raw)){
    date=new Date(raw);
  }
  if(!date || !Number.isFinite(date.valueOf()) || date.getTime()>Date.now()+86_400_000 ||
     date.getTime()<Date.UTC(2020,0,1))return null;
  return date;
};
const safeLabel=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,180);
export function parseValmoCarrierResult(data,awb){
  if(!data||typeof data!=='object'||data.success!==true)return {ok:false,error:'carrier_not_confirmed'};
  if(data.tracking_id&&String(data.tracking_id).toUpperCase()!==awb)return {ok:false,error:'carrier_awb_mismatch'};
  if(data.awb&&String(data.awb).toUpperCase()!==awb)return {ok:false,error:'carrier_awb_mismatch'};
  const top=safeLabel(data.main_status?.description||data.main_status?.display_name||data.main_status?.status);
  const events=(Array.isArray(data.tracking)?data.tracking:[]).flatMap(e=>[
    e,...(Array.isArray(e.sub_status_list)?e.sub_status_list:[])
  ]).slice(0,200);
  const clean=events.map(e=>({
    label:safeLabel(e.display_name||e.description||e.status||e.movement_type),
    date:verifiedEventDate(e.date||e.timestamp||e.event_time)
  })).filter(e=>e.label);
  const order=[...clean].sort((a,b)=>(b.date?.getTime()||0)-(a.date?.getTime()||0));
  const text=top.toLowerCase();
  let status='needs_review';
  if(/returned to seller|return delivered|rto delivered|rto complete/.test(text))status='returned';
  else if(/\bdelivered\b/.test(text)&&!/not delivered|undelivered|delivery failed|returned|return to origin/.test(text))status='delivered';
  else if(/out for delivery/.test(text))status='out_for_delivery';
  else if(/in transit|shipped|reached.*hub|left.*hub|picked up|dispatched/.test(text))status='in_transit';
  else if(/delivery failed|attempt failed/.test(text))status='delivery_failed';
  let deliveryDate=null;
  if(status==='delivered'){
    deliveryDate=order.find(e=>/^\s*delivered\b/i.test(e.label) &&
      !/not delivered|return|failed/i.test(e.label) && e.date)?.date||null;
    if(!deliveryDate)status='needs_review'; // Never claim a precise delivery date without evidence.
  }
  return {ok:true,status,description:top||'Carrier result needs review',
    deliveredAt:deliveryDate?deliveryDate.toISOString():null,
    deliveredDateIST:deliveryDate?formatIstDate(deliveryDate):null,
    lastEventAt:order.find(e=>e.date)?.date?.toISOString()||null,
    events:order.slice(0,40).map(e=>({label:e.label,date:e.date?e.date.toISOString():null}))};
}
async function checkValmo(awb){
  const upstream=new URL('https://www.valmo.in/api/valmo-web/track-order');
  upstream.searchParams.set('tracking_id',awb);
  upstream.searchParams.set('request_id',String(Date.now()));
  const r=await fetch(upstream.toString(),{headers:{Accept:'application/json','Referer':'https://www.valmo.in/track'},signal:AbortSignal.timeout(11000)});
  if(!r.ok)throw Error('carrier_http_'+r.status);
  const data=await r.json();
  const verified=parseValmoCarrierResult(data,awb);
  if(!verified.ok)throw Error(verified.error);
  return verified;
}
const shipmentColumns='s.suborder_id,s.invoice_no,s.carrier,s.awb,s.awb_source,s.awb_evidence_sha256,s.status,s.status_description,s.delivered_at,s.delivered_date_ist,s.last_checked_at,s.last_event_at,s.last_check_error,s.events_json,i.order_date,i.document_date,i.document_total_paise,i.details_json';
const view=record=>{
  let inv={};try{inv=JSON.parse(record.details_json||'{}')}catch{}
  let timeline=[];try{timeline=JSON.parse(record.events_json||'[]')}catch{}
  return {
    suborderId:record.suborder_id,invoiceNo:record.invoice_no,
    carrier:record.carrier,awb:record.awb,awbSource:record.awb_source||null,awbEvidenceSha256:record.awb_evidence_sha256||null,status:record.status,
    statusDescription:record.status_description,
    deliveredAt:record.delivered_at,deliveredDateIST:record.delivered_date_ist,
    lastCheckedAt:record.last_checked_at,lastEventAt:record.last_event_at,
    lastCheckError:record.last_check_error,trackingEvents:timeline,
    invoiceDate:record.document_date,orderDate:record.order_date,
    invoiceValuePaise:Number(record.document_total_paise||0),
    productDescription:String(inv.productDescription||'').slice(0,220),
    source:'invoice_pdf_and_manual_carrier_tracking'
  };
};
const digits=/^[0-9]{15,20}_\d{1,4}$/;
async function counts(env,who){
 const sql="SELECT COUNT(*) AS known_orders,SUM(CASE WHEN awb IS NULL THEN 1 ELSE 0 END) AS awaiting_awb,SUM(CASE WHEN status='delivered' THEN 1 ELSE 0 END) AS verified_delivered,SUM(CASE WHEN status IN ('in_transit','out_for_delivery') THEN 1 ELSE 0 END) AS verified_in_transit,SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END) AS carrier_returned,SUM(CASE WHEN awb IS NOT NULL AND status!='delivered' THEN 1 ELSE 0 END) AS eligible_for_check,SUM(CASE WHEN strftime('%Y-%m',i.order_date)=strftime('%Y-%m',datetime('now','+5 hours','+30 minutes')) THEN 1 ELSE 0 END) AS invoiced_orders_this_month FROM gstdesk_shipments s JOIN gstdesk_meesho_invoices i ON i.business_id=s.business_id AND i.invoice_no=s.invoice_no WHERE s.business_id=?";
 const r=await env.DB.prepare(sql).bind(who.businessId).first();
 return Object.fromEntries(Object.entries(r||{}).map(([k,v])=>[k,Number(v||0)]));
}
export async function shippingApi(request,env,who){
 const u=new URL(request.url),path=u.pathname;
 try{
  if(path==='/api/shipping/summary'&&request.method==='GET'){
    return response({source:'D1 and verified manual Valmo checks',live:false,autoCheck:false,
      counts:await counts(env,who)});
  }
  if(path==='/api/shipping/orders'&&request.method==='GET'){
    const filters=new Set(['all','awaiting_awb','pending','delivered','returned']);
    const filter=u.searchParams.get('filter')||'all';
    if(!filters.has(filter))return response({error:'invalid_filter'},400);
    const page=Number(u.searchParams.get('page')||1);
    if(!Number.isSafeInteger(page)||page<1||page>1000)return response({error:'invalid_page'},400);
    let extra='',params=[who.businessId];
    if(filter==='awaiting_awb')extra=' AND s.awb IS NULL';
    else if(filter==='pending')extra=" AND s.awb IS NOT NULL AND s.status!='delivered'";
    else if(filter==='delivered'||filter==='returned'){extra=' AND s.status=?';params.push(filter)}
    const sql='SELECT '+shipmentColumns+' FROM gstdesk_shipments s JOIN gstdesk_meesho_invoices i ON i.business_id=s.business_id AND i.invoice_no=s.invoice_no WHERE s.business_id=?'+extra+' ORDER BY i.order_date DESC,s.suborder_id DESC LIMIT 50 OFFSET ?';
    const rows=await env.DB.prepare(sql).bind(...params,(page-1)*50).all();
    return response({filter,page,items:(rows.results||[]).map(view),hasMore:(rows.results||[]).length===50});
  }
  const one=/^\/api\/shipping\/orders\/([0-9]{15,20}_\d{1,4})$/.exec(path);
  if(one&&request.method==='GET'){
    const row=await env.DB.prepare('SELECT '+shipmentColumns+' FROM gstdesk_shipments s JOIN gstdesk_meesho_invoices i ON i.business_id=s.business_id AND i.invoice_no=s.invoice_no WHERE s.business_id=? AND s.suborder_id=? LIMIT 1').bind(who.businessId,one[1]).first();
    return row?response({shipment:view(row)}):response({error:'shipment_not_found'},404);
  }
  if(one&&request.method==='PUT'){
    if(!hasWriteHeaders(request))return response({error:'invalid_request_origin'},403);
    if(Number(request.headers.get('content-length')||0)>512)return response({error:'payload_too_large'},413);
    let data;try{data=await request.json()}catch{return response({error:'invalid_json'},400)}
    const awb=String(data.awb||'').trim().toUpperCase();
    if(!awbPattern.test(awb)||data.source!=='seller_shipping_label')return response({error:'awb_requires_confirmed_shipping_label'},400);
    const original=await env.DB.prepare('SELECT status,awb FROM gstdesk_shipments WHERE business_id=? AND suborder_id=?').bind(who.businessId,one[1]).first();
    if(!original)return response({error:'shipment_not_found'},404);
    if(original.status==='delivered')return response({error:'delivered_shipments_are_immutable'},409);
    if(original.awb&&original.awb!==awb)return response({error:'awb_change_requires_reconciliation'},409);
    try{
      const saved=await env.DB.prepare("UPDATE gstdesk_shipments SET carrier='valmo',awb=?,awb_source='seller_shipping_label',awb_set_at=CURRENT_TIMESTAMP,status='not_checked',last_check_error=NULL,updated_at=CURRENT_TIMESTAMP WHERE business_id=? AND suborder_id=? AND status!='delivered' AND (awb IS NULL OR awb=?)").bind(awb,who.businessId,one[1],awb).run();
      if(saved.meta?.changes!==1)return response({error:'concurrent_update_conflict'},409);
      return response({saved:true,suborderId:one[1],awb,status:'not_checked',automaticallyChecked:false});
    }catch(e){return response({error:/UNIQUE/i.test(String(e))?'awb_already_assigned':'awb_save_failed'},409)}
  }
  if(path==='/api/shipping/check'&&request.method==='POST'){
    if(!hasWriteHeaders(request))return response({error:'invalid_request_origin'},403);
    if(Number(request.headers.get('content-length')||0)>512)return response({error:'payload_too_large'},413);
    let data;try{data=await request.json()}catch{return response({error:'invalid_json'},400)}
    if(data?.mode!=='pending' && !(data?.mode==='one'&&digits.test(String(data.suborderId||''))))return response({error:'invalid_check_mode'},400);
    const params=[who.businessId];
    let extra='';
    if(data.mode==='one'){extra=' AND suborder_id=?';params.push(data.suborderId)}
    const rows=await env.DB.prepare("SELECT suborder_id,awb,status FROM gstdesk_shipments WHERE business_id=? AND carrier='valmo' AND awb IS NOT NULL AND status!='delivered'"+extra+" ORDER BY COALESCE(last_checked_at,'') ASC,suborder_id LIMIT 10").bind(...params).all();
    const pending=rows.results||[],results=[];
    // Explicit user action only. Limited batch; no background refresh, cron, or scheduling.
    for(const row of pending){
      try{
        const verified=await checkValmo(row.awb);
        if(verified.status==='needs_review'){
          results.push({suborderId:row.suborder_id,awb:row.awb,checked:true,saved:false,
            error:'carrier_status_or_delivery_date_not_fully_verified'});
          continue;
        }
        const save=await env.DB.prepare("UPDATE gstdesk_shipments SET status=?,status_description=?,delivered_at=?,delivered_date_ist=?,last_checked_at=CURRENT_TIMESTAMP,last_event_at=?,last_check_error=NULL,last_status_source='valmo_on_demand',events_json=?,updated_at=CURRENT_TIMESTAMP WHERE business_id=? AND suborder_id=? AND awb=? AND status!='delivered'").bind(
          verified.status,verified.description,verified.deliveredAt,verified.deliveredDateIST,
          verified.lastEventAt,JSON.stringify(verified.events),who.businessId,row.suborder_id,row.awb).run();
        results.push({suborderId:row.suborder_id,awb:row.awb,checked:true,saved:save.meta?.changes===1,
          status:verified.status,deliveredDateIST:verified.deliveredDateIST});
      }catch(e){
        // Errors don't overwrite the previous verified status or invent a date.
        results.push({suborderId:row.suborder_id,awb:row.awb,checked:false,saved:false,error:'carrier_tracking_unavailable'});
      }
    }
    return response({requested:data.mode,selected:pending.length,results,
      waitingForAwb:(await counts(env,who)).awaiting_awb,autoChecked:false,
      note:'Next batch is checked only when the user clicks again'});
  }
  return response({error:'not_found'},404);
 }catch{return response({error:'shipping_api_unavailable'},503);}
}
