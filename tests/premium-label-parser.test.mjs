import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrintedInvoice } from '../cloudflare/workers/gst-desk-preview/label-invoice-parser.mjs';
import { decoratePremiumHTML,premiumCSS } from '../cloudflare/workers/gst-desk-preview/premium-theme.mjs';
import { overviewFallbackHTML } from '../cloudflare/workers/gst-desk-preview/server-snapshot.mjs';
// Sanitized sample structure from Nividhi shipping label PDFs. No buyer details.
const delhivery='Delhivery Pickup 1490841583388220 Product Details SKU Size Qty Color Order No. 3ZRb2Kpc Free Size 1 Multicolor 334168333294419008_1 TAX INVOICE Sold by : NIDHI GSTIN - 09CEIPN0076B1ZO Purchase Order No. 334168333294419008 Invoice No. 87whi271 Order Date 23.09.2026 Invoice Date 23.09.2026 Description HSN Qty Gross Amount Discount Taxable Value Taxes Total Product Rs.198.00 Other Charges Total Rs.5.77 Rs.198.00 Tax is not payable on reverse charge basis.';
const valmo='Valmo Pickup VL0086110945778 Product Details SKU Size Qty Color Order No. T3cx9V6T 2.6 1 Red 353095258237371968_1 TAX INVOICE Sold by : NIDHI GSTIN - 09CEIPN0076B1ZO Purchase Order No. 353095258237371968 Invoice No. 87whi2722 Order Date 14.11.2026 Invoice Date 14.11.2026 Description Total Gross Amount Discount Taxable Value Taxes Other Charges Total Rs.5.24 Rs.180.04 Tax is not payable on reverse charge basis.';
test('Delhivery label invoice fields parse to exact integer paise',()=>{
 const r=parsePrintedInvoice(delhivery);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.carrier,'delhivery');assert.equal(r.awb,'1490841583388220');
 assert.equal(r.suborderId,'334168333294419008_1');assert.equal(r.invoiceNo,'87whi271');
 assert.equal(r.sellerGSTIN,'09CEIPN0076B1ZO');assert.equal(r.invoiceDate,'2026-09-23');
 assert.equal(r.invoiceTotalPaise,19800);assert.equal(r.printedGSTPaise,577);
});
test('Valmo label has accurate invoice date, amount, GST without inferring delivery',()=>{
 const r=parsePrintedInvoice(valmo);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.carrier,'valmo');assert.equal(r.invoiceDate,'2026-11-14');
 assert.equal(r.invoiceTotalPaise,18004);assert.equal(r.printedGSTPaise,524);
 assert.ok(!('deliveredDate' in r));
});
test('reject another seller, mismatched GSTIN, invalid date, ambiguous amounts and AWBs',()=>{
 assert.match(parsePrintedInvoice(delhivery.replace('Sold by : NIDHI','Sold by : Keshav Kripa')).reason,/Seller/);
 assert.match(parsePrintedInvoice(valmo.replace('09CEIPN0076B1ZO','09ABCDE1234F1Z5')).reason,/GSTIN/);
 assert.match(parsePrintedInvoice(valmo.replaceAll('14.11.2026','31.11.2026')).reason,/date/i);
 assert.match(parsePrintedInvoice(valmo.replace('Rs.180.04','Rs.180.04 Rs.179.99')).reason,/total/i);
 assert.match(parsePrintedInvoice(valmo.replace('VL0086110945778','VL0086110945778 VL0086110945779')).reason,/Ambiguous/);
});
test('server homepage includes original eight KPIs, correct months, recent documents and filed returns',()=>{
 const snapshot={fetchedAt:'2026-11-18T20:00:00Z',data:{
  counts:{filed_return_summaries:2,marketplace_report_rows:13,saved_workspace_keys:0,invoice_drafts:0,source_archives:4},
  monthly:[{period:'112026',invoices:7,creditNotes:0,netPaise:92460},{period:'102026',invoices:12,creditNotes:1,netPaise:174954},{period:'092026',invoices:5,creditNotes:1,netPaise:67504}],
  recentInvoices:[{period:'112026',invoiceNo:'87whi2722',documentDate:'2026-11-14',totalPaise:18004,documentType:'tax-invoice'}],
  filedReturns:[{period:'092026',type:'GSTR-1',filedOn:'2026-10-10'},{period:'092026',type:'GSTR-3B',filedOn:'2026-10-15'}]
 }};
 const html=overviewFallbackHTML(snapshot);
 assert.equal((html.match(/class="nv-ss-card"/g)||[]).length,8);
 assert.match(html,/Business overview/);assert.match(html,/₹3,349.18/);
 assert.match(html,/September 2026/);assert.match(html,/October 2026/);
 assert.match(html,/November 2026/);assert.match(html,/Filed GST returns/);
 assert.match(html,/Recently imported documents/);
 assert.doesNotMatch(html,/February 10528|June 11361/);
});
test('brand home link and nav SVG theme require no new HTTP requests',()=>{
 const html=decoratePremiumHTML('<html><head><style>.base{}</style></head><header class="app-header"><div class="app-brand"><span class="app-monogram">N</span><div><strong>NIVIDHI</strong><small>GST DESK <span class="app-version">2.0</span></small></div></div></header><nav class="tabs"><button data-tab="valmo">Valmo Tracking</button></nav></html>');
 assert.match(html,/href="\/" aria-label="Nividhi GST Desk/);
 assert.match(html,/<svg class="nv-brand-icon"/);
 assert.ok(premiumCSS.includes('prefers-reduced-motion'));
 assert.ok(!/@import|url\(\s*https:\/\//.test(premiumCSS));
});
