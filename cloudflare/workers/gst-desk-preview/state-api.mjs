// Protected D1 browser-state API for the EXISTING GST Desk Worker.
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const keyOK=k=>typeof k==='string' && /^(?:gstdesk|gst-desk|gstDesk|gst_desk)[a-zA-Z0-9_.:-]{0,120}$/.test(k);
const b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const obj=s=>JSON.parse(new TextDecoder().decode(b64(s)));

async function claims(request,env) {
  const issuer=new URL(env.ACCESS_ISSUER);
  if(issuer.protocol!=='https:'||issuer.pathname!=='/'||issuer.search||issuer.hash)return null;
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token||token.length>16000)return null;
  const p=token.split('.');
  if(p.length!==3)return null;
  let head,payload;
  try{head=obj(p[0]);payload=obj(p[1]);}catch{return null;}
  const now=Date.now()/1000;
  if(head.alg!=='RS256'||!head.kid||payload.iss!==issuer.origin||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+60||!(Array.isArray(payload.aud)?payload.aud.includes(env.ACCESS_AUDIENCE):payload.aud===env.ACCESS_AUDIENCE))return null;
  if(typeof payload.email!=='string'||payload.email.toLowerCase()!==env.GST_OWNER_EMAIL.toLowerCase())return null;
  const certRes=await fetch(issuer.origin+'/cdn-cgi/access/certs',{cf:{cacheEverything:true,cacheTtl:300}});
  if(!certRes.ok)return null;
  const certs=await certRes.json();
  const key=certs.keys?.find(k=>k.kid===head.kid&&k.kty==='RSA');
  if(!key)return null;
  const cryptoKey=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',cryptoKey,b64(p[2]),new TextEncoder().encode(p[0]+'.'+p[1]))))return null;
  const membership=await env.DB.prepare("SELECT 1 AS valid FROM gstdesk_memberships m JOIN gstdesk_users u ON u.id=m.user_id WHERE m.business_id=? AND lower(u.email)=lower(?) AND u.status='active' AND m.role='owner' LIMIT 1").bind(env.GST_BUSINESS_ID,payload.email).first();
  return membership?{email:payload.email,businessId:env.GST_BUSINESS_ID}:null;
}

export async function authorize(request,env){
  try{
    if(!env.DB||!env.ACCESS_AUDIENCE||!env.ACCESS_ISSUER||!env.GST_OWNER_EMAIL||!env.GST_BUSINESS_ID)return {error:reply({error:'cloud_configuration_incomplete'},503)};
    const who=await claims(request,env);
    return who?{who}:{error:reply({error:'not_authorized'},403)};
  }catch{return {error:reply({error:'authorization_unavailable'},503)};}
}

export async function listState(env,businessId){
  const x=await env.DB.prepare('SELECT storage_key,value_text,revision,updated_at FROM gstdesk_browser_state WHERE business_id=? ORDER BY storage_key LIMIT 100').bind(businessId).all();
  return (x.results||[]).map(r=>({key:r.storage_key,value:r.value_text,revision:r.revision,updatedAt:r.updated_at}));
}

export async function stateApi(request,env,who){
  const u=new URL(request.url);
  if(u.pathname==='/api/state'&&request.method==='GET'){
    try{return reply({items:await listState(env,who.businessId),source:'cloudflare-d1'});}catch{return reply({error:'storage_unavailable'},503);}
  }
  if(u.pathname==='/api/returns/summary'&&request.method==='GET'){
    const period=u.searchParams.get('period')||'092026';
    if(!/^(0[1-9]|1[0-2])20[0-9]{2}$/.test(period))return reply({error:'invalid_period'},400);
    try{const r=await env.DB.prepare('SELECT tax_period,return_type,arn,filed_on,taxable_paise,igst_paise,cgst_paise,sgst_paise,cess_paise,itc_igst_paise,itc_cgst_paise,itc_sgst_paise,source_document FROM gstdesk_filed_return_summaries WHERE business_id=? AND tax_period=? ORDER BY return_type').bind(who.businessId,period).all();return reply({taxPeriod:period,filedReturns:r.results||[],source:'filed-return-pdf',invoiceZipImported:false});}
    catch{return reply({error:'returns_unavailable'},503);}
  }
  const match=/^\/api\/state\/([^/]+)$/.exec(u.pathname);
  if(!match)return reply({error:'not_found'},404);
  if(request.method!=='PUT'&&request.method!=='DELETE')return reply({error:'method_not_allowed'},405);
  let k;
  try{k=decodeURIComponent(match[1]);}catch{return reply({error:'invalid_key'},400);}
  if(!keyOK(k))return reply({error:'invalid_key'},400);
  if(request.headers.get('origin')!==u.origin||request.headers.get('X-GST-Desk-Write')!=='1')return reply({error:'invalid_request_origin'},403);
  if(Number(request.headers.get('content-length')||0)>550000)return reply({error:'value_too_large'},413);
  let body;
  try{body=await request.json();}catch{return reply({error:'invalid_json'},400);}
  if(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)return reply({error:'invalid_revision'},400);
  if(request.method==='PUT'&&(typeof body.value!=='string'||body.value.length>524288))return reply({error:'value_too_large'},413);
  try{
    let result;
    if(request.method==='DELETE'){
      if(body.expectedRevision===0)return reply({error:'not_found'},404);
      result=await env.DB.prepare('DELETE FROM gstdesk_browser_state WHERE business_id=? AND storage_key=? AND revision=?').bind(who.businessId,k,body.expectedRevision).run();
    }else if(body.expectedRevision===0){
      result=await env.DB.prepare('INSERT INTO gstdesk_browser_state (business_id,storage_key,value_text,revision) VALUES (?,?,?,1) ON CONFLICT(business_id,storage_key) DO NOTHING').bind(who.businessId,k,body.value).run();
    }else{
      result=await env.DB.prepare('UPDATE gstdesk_browser_state SET value_text=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE business_id=? AND storage_key=? AND revision=?').bind(body.value,who.businessId,k,body.expectedRevision).run();
    }
    if(result.meta?.changes!==1)return reply({error:'revision_conflict',hint:'Reload and reconcile before overwriting'},409);
    return reply({saved:true,key:k,revision:request.method==='DELETE'?0:body.expectedRevision+1});
  }catch{return reply({error:'storage_unavailable'},503);}
}
