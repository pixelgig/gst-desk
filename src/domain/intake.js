import { safeSum } from './money.js';

export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01';
}

export function semanticIdentity(invoice) {
  if (!calendarDate(invoice.date) || !/^[A-Z0-9]{15}$/.test(invoice.sellerGstin) ||
      !/^[A-Za-z0-9/-]{1,16}$/.test(invoice.number) ||
      typeof invoice.suborderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(invoice.suborderId) ||
      !['tax_invoice', 'credit_note'].includes(invoice.type)) throw new Error('invalid_invoice_identity');
  return JSON.stringify([invoice.sellerGstin, invoice.number, invoice.date, invoice.suborderId, invoice.type]);
}

// Pure validation. This does not approve extraction, create stock or establish payment.
export function reviewInvoice(invoice) {
  semanticIdentity(invoice);
  if (!Array.isArray(invoice.lines) || !invoice.lines.length || invoice.lines.length > 100) throw new Error('invalid_lines');
  const issues = [];
  const fields = ['taxablePaise', 'igstPaise', 'cgstPaise', 'sgstPaise', 'cessPaise', 'totalPaise'];
  for (const [index, line] of invoice.lines.entries()) {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 ||
        !['product', 'other_charge'].includes(line.kind) || !/^\d{4,8}$/.test(line.hsn) ||
        !fields.every(key => Number.isSafeInteger(line[key]) && line[key] >= 0)) throw new Error('invalid_line');
    if (safeSum(fields.slice(0, -1).map(key => line[key])) !== line.totalPaise) issues.push({ code: 'line_total_mismatch', line: index });
    if (line.igstPaise && (line.cgstPaise || line.sgstPaise)) issues.push({ code: 'mixed_tax_components', line: index });
  }
  const totals = Object.fromEntries(fields.map(key => [key, safeSum(invoice.lines.map(line => line[key]))]));
  if (!Number.isSafeInteger(invoice.totalPaise) || invoice.totalPaise !== totals.totalPaise) issues.push({ code: 'invoice_total_mismatch' });
  if (invoice.shippingName && invoice.billingName && invoice.shippingName.trim() !== invoice.billingName.trim()) issues.push({ code: 'recipient_roles_differ' });
  return { totals, issues, reviewRequired: true, settlement: { expectedDate: null, expectedPaise: null, bankReceivedPaise: null } };
}

export function validateEvidence(field) {
  if (!field || !Number.isSafeInteger(field.page) || field.page < 1 ||
      !Array.isArray(field.box) || field.box.length !== 4 || !field.box.every(n => Number.isFinite(n) && n >= 0) ||
      field.box[2] < field.box[0] || field.box[3] < field.box[1] ||
      !Number.isFinite(field.confidence) || field.confidence < 0 || field.confidence > 1 ||
      !['pdf_text', 'barcode', 'manual', 'local_ocr'].includes(field.method)) throw new Error('invalid_field_evidence');
  return field;
}
