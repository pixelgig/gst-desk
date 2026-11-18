// D1-backed overview and invoice drill-down for the existing, Access-protected GST Desk.
// This module is invoked only AFTER the Worker has verified the owner's Access JWT.
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{
  'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
  'x-content-type-options':'nosniff','referrer-policy':'no-referrer'
}});
const validPeriod=p=>/^(0[1-9]|1[0-2])20[0-9]{2}$/.test(p);
const rowList=async(statement)=>((await statement.all()).results||[]);
const num=x=>Number.isSafeInteger(Number(x))?Number(x):0;
const normalizeInvoice=row=>{
  let d={};try{d=JSON.parse(row.details_json||'{}')}catch{}
  const components=d.taxComponentsPaise||d.pdfPrintedTaxComponentsPaise||null;
  const breakdownTotal=components?Object.values(components).reduce((n,v)=>n+num(v),0):null;
  const tax=d.pdfPrintedTaxTotalPaise??d.invoiceTaxPaise??breakdownTotal;
  return {
    invoiceNo:row.invoice_no,suborderId:row.suborder_id,
    documentType:row.document_type,orderDate:row.order_date,documentDate:row.document_date,
    hsn:row.hsn,period:row.document_date.slice(5,7)+row.document_date.slice(0,4),
    totalPaise:num(row.document_total_paise),taxPaise:tax==null?null:num(tax),
    taxablePaise:d.taxablePaise??(tax==null?null:num(row.document_total_paise)-num(tax)),
    productDescription:String(d.productDescription||'').slice(0,500),
    taxComponentsPaise:d.taxComponentsPaise||d.pdfPrintedTaxComponentsPaise||null,
    taxSource:d.pdfPrintedTaxTotalPaise!=null?'invoice_pdf_total_row':(d.invoiceTaxPaise!=null?'invoice_pdf_parsed':'invoice_components_only'),
    taxBreakdownDifferencePaise:breakdownTotal!=null&&tax!=null?num(tax)-breakdownTotal:null,
    originalInvoiceNo:d.originalInvoiceNo||null,
    placeOfSupply:d.placeOfSupply||null,placeOfSupplyCode:d.placeOfSupplyCode||null,
    hasOtherCharges:d.hasOtherCharges??null,
    pdfFilename:row.pdf_filename,pdfSha256:row.pdf_sha256,
    sourcePeriod:row.source_period,sourceArchiveSha256:row.source_zip_sha256,
    source:'Meesho invoice PDF / register',deliveryStatus:null,
    originalPdfAvailable:false,
  };
};
const invoiceCols='invoice_no,suborder_id,document_type,order_date,document_date,hsn,source_period,document_total_paise,details_json,pdf_filename,pdf_sha256,source_zip_sha256';
export async function handleOverviewApi(request,env,who){
  if(request.method!=='GET')return json({error:'method_not_allowed'},405);
  const u=new URL(request.url),path=u.pathname;
  try{
    if(path==='/api/overview'){
      const [monthly,filings,reportRows,counts,recent]=await Promise.all([
        rowList(env.DB.prepare("SELECT substr(document_date,6,2)||substr(document_date,1,4) AS period,COUNT(*) AS documents,SUM(CASE WHEN document_type='tax-invoice' THEN 1 ELSE 0 END) AS invoices,SUM(CASE WHEN document_type='credit-note' THEN 1 ELSE 0 END) AS credit_notes,SUM(CASE WHEN document_type='tax-invoice' THEN document_total_paise ELSE 0 END) AS invoice_paise,SUM(CASE WHEN document_type='credit-note' THEN document_total_paise ELSE 0 END) AS credit_paise FROM gstdesk_meesho_invoices WHERE business_id=? GROUP BY period ORDER BY substr(period,3,4) DESC,substr(period,1,2) DESC").bind(who.businessId)),
        rowList(env.DB.prepare("SELECT tax_period,return_type,arn,filed_on,taxable_paise,igst_paise,cgst_paise,sgst_paise FROM gstdesk_filed_return_summaries WHERE business_id=? ORDER BY substr(tax_period,3,4) DESC,substr(tax_period,1,2) DESC,return_type").bind(who.businessId)),
        rowList(env.DB.prepare("SELECT period,document_kind,COUNT(*) AS records,SUM(taxable_paise) AS taxable_paise,SUM(tax_paise) AS tax_paise FROM gstdesk_meesho_report_rows WHERE business_id=? GROUP BY period,document_kind").bind(who.businessId)),
        env.DB.prepare("SELECT (SELECT COUNT(*) FROM gstdesk_meesho_invoices WHERE business_id=?) AS invoice_documents,(SELECT COUNT(*) FROM gstdesk_meesho_report_rows WHERE business_id=?) AS marketplace_report_rows,(SELECT COUNT(*) FROM gstdesk_filed_return_summaries WHERE business_id=?) AS filed_return_summaries,(SELECT COUNT(*) FROM gstdesk_source_archives WHERE business_id=?) AS source_archives,(SELECT COUNT(*) FROM gstdesk_invoice_drafts WHERE business_id=? AND deleted_at IS NULL) AS invoice_drafts,(SELECT COUNT(*) FROM gstdesk_browser_state WHERE business_id=?) AS saved_workspace_keys").bind(who.businessId,who.businessId,who.businessId,who.businessId,who.businessId,who.businessId).first(),
        rowList(env.DB.prepare('SELECT '+invoiceCols+' FROM gstdesk_meesho_invoices WHERE business_id=? ORDER BY document_date DESC,invoice_no DESC LIMIT 8').bind(who.businessId))
      ]);
      return json({source:'Cloudflare D1',updatedAt:new Date().toISOString(),
        scope:'imported-records-not-live-marketplace-orders',
        monthly:monthly.map(r=>({period:r.period,documents:num(r.documents),invoices:num(r.invoices),creditNotes:num(r.credit_notes),invoicePaise:num(r.invoice_paise),creditPaise:num(r.credit_paise),netPaise:num(r.invoice_paise)-num(r.credit_paise)})),
        filedReturns:filings.map(f=>({period:f.tax_period,type:f.return_type,filedOn:f.filed_on,taxablePaise:num(f.taxable_paise),outputTaxPaise:num(f.igst_paise)+num(f.cgst_paise)+num(f.sgst_paise)})),
        taxReports:reportRows.map(r=>({period:r.period,kind:r.document_kind,records:num(r.records),taxablePaise:num(r.taxable_paise),taxPaise:num(r.tax_paise)})),
        counts:Object.fromEntries(Object.entries(counts||{}).map(([k,v])=>[k,num(v)])),
        recentInvoices:recent.map(normalizeInvoice)});
    }
    if(path==='/api/invoices'){
      const period=u.searchParams.get('period')||'';
      if(!validPeriod(period))return json({error:'invalid_period'},400);
      const pageRaw=u.searchParams.get('page')||'1',page=Number(pageRaw);
      if(!Number.isSafeInteger(page)||page<1||page>1000)return json({error:'invalid_page'},400);
      const size=30,offset=(page-1)*size;
      const [records,count]=await Promise.all([
        rowList(env.DB.prepare('SELECT '+invoiceCols+' FROM gstdesk_meesho_invoices WHERE business_id=? AND (substr(document_date,6,2)||substr(document_date,1,4))=? ORDER BY document_date DESC,invoice_no DESC LIMIT ? OFFSET ?').bind(who.businessId,period,size,offset)),
        env.DB.prepare('SELECT COUNT(*) AS total FROM gstdesk_meesho_invoices WHERE business_id=? AND (substr(document_date,6,2)||substr(document_date,1,4))=?').bind(who.businessId,period).first()
      ]);
      return json({period,page,pageSize:size,total:num(count?.total),hasMore:offset+records.length<num(count?.total),items:records.map(normalizeInvoice)});
    }
    const invoiceMatch=/^\/api\/invoices\/([a-zA-Z0-9_-]{1,50})$/.exec(path);
    if(invoiceMatch){
      const record=await env.DB.prepare('SELECT '+invoiceCols+' FROM gstdesk_meesho_invoices WHERE business_id=? AND invoice_no=? LIMIT 1').bind(who.businessId,invoiceMatch[1]).first();
      if(!record)return json({error:'invoice_not_found'},404);
      return json({invoice:normalizeInvoice(record)});
    }
    return json({error:'not_found'},404);
  }catch{
    return json({error:'overview_unavailable'},503);
  }
}
