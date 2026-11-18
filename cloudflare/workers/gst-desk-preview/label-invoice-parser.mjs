// Deterministic text-only parser for Meesho Sub Order Labels PDFs.
// Seller / GSTIN, suborder, AWB, invoice issue date, GST and invoice total must all
// be unambiguous. Do not infer missing monetary/date values or store PDF content.
const asPaise=value=>{
  const match=String(value||'').replace(/,/g,'').match(/^(\d{1,9})\.(\d{2})$/);
  return match?Number(match[1])*100+Number(match[2]):null;
};
const isoDate=value=>{
  const m=String(value||'').match(/^(\d{2})[.\/-](\d{2})[.\/-](20\d{2})$/);
  if(!m)return null;
  const day=Number(m[1]),month=Number(m[2]),year=Number(m[3]);
  const candidate=new Date(Date.UTC(year,month-1,day));
  if(candidate.getUTCFullYear()!==year||candidate.getUTCMonth()!==month-1||candidate.getUTCDate()!==day)return null;
  return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
};
export function parsePrintedInvoice(rawText){
 const text=String(rawText||'').replace(/\s+/g,' ').trim();
 const validSeller=/\bSold\s+by\s*:\s*NIDHI\b/i.test(text);
 if(!validSeller)return {ok:false,reason:'Seller is not NIDHI'};
 const gstin=[...new Set((text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/gi)||[]).map(x=>x.toUpperCase()))];
 if(gstin.length!==1||gstin[0]!=='09CEIPN0076B1ZO')return {ok:false,reason:'Seller GSTIN mismatch or missing'};
 const carrier=/\bDelhivery\b/i.test(text)?'delhivery':(/\bValmo\b/i.test(text)?'valmo':null);
 if(!carrier)return {ok:false,reason:'Unsupported/missing courier'};
 const awbs=[...new Set((carrier==='valmo'?text.match(/\bVL\d{13}\b/gi):text.match(/(?<!\d)\d{16}(?!\d)/g))||[])].map(x=>x.toUpperCase());
 const suborders=[...new Set(text.match(/\b\d{15,20}_\d{1,4}\b/g)||[])];
 const invoices=[...new Set((text.match(/\b87[a-z0-9]{3,30}\b/gi)||[]).map(x=>x.toLowerCase()))];
 if(awbs.length!==1||suborders.length!==1||invoices.length!==1)return {ok:false,reason:'Ambiguous/missing AWB, suborder, or invoice'};
 const invoiceDates=[...new Set((text.match(/\bInvoice\s+Date\s+(\d{2}[.\/-]\d{2}[.\/-]20\d{2})/gi)||[]).map(x=>isoDate(x.replace(/^Invoice\s+Date\s+/i,''))))].filter(Boolean);
 if(invoiceDates.length!==1)return {ok:false,reason:'Missing or invalid invoice issue date'};
 const orderDates=[...new Set((text.match(/\bOrder\s+Date\s+(\d{2}[.\/-]\d{2}[.\/-]20\d{2})/gi)||[]).map(x=>isoDate(x.replace(/^Order\s+Date\s+/i,''))))].filter(Boolean);
 const totalText=text.slice(text.indexOf('TAX INVOICE')>=0?text.indexOf('TAX INVOICE'):0);
 const totalMatches=[...totalText.matchAll(/\bTotal\s+Rs\.?\s*([\d,]+\.\d{2})\s+Rs\.?\s*([\d,]+\.\d{2})\s+(?:Tax\s+is\s+not\s+payable|This\s+is\s+a\s+computer)/gi)];
 if(totalMatches.length!==1)return {ok:false,reason:'Unambiguous invoice total/GST not found'};
 const printedGSTPaise=asPaise(totalMatches[0][1]);
 const invoiceTotalPaise=asPaise(totalMatches[0][2]);
 if(printedGSTPaise===null||invoiceTotalPaise===null||printedGSTPaise>invoiceTotalPaise||invoiceTotalPaise<=0)return {ok:false,reason:'Invalid invoice totals'};
 return {ok:true,sellerName:'NIDHI',sellerGSTIN:gstin[0],carrier,awb:awbs[0],
   suborderId:suborders[0],invoiceNo:invoices[0],invoiceDate:invoiceDates[0],
   orderDate:orderDates.length===1?orderDates[0]:null,invoiceTotalPaise,printedGSTPaise};
}

// Embed the small pure parser alongside existing client JavaScript; no extra request.
export const labelParserBrowserJS='const asPaise='+asPaise.toString()+';const isoDate='+isoDate.toString()+';'+parsePrintedInvoice.toString()+';';
