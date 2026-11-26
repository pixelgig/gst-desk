const MAX_SAFE_BIG = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_BIG = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * Parses a decimal rupee string into exact integer paise (half away from zero).
 * Rejects scientific notation, non-numeric text, or sub-paise precision beyond 2 decimals.
 */
export function parsePaiseString(rawValue) {
  if (typeof rawValue !== 'string') {
    throw new Error('invalid_money_type');
  }
  const trimmed = rawValue.trim();
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('invalid_money_format');
  }
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fracPart = ''] = unsigned.split('.');
  const paiseBig = BigInt(wholePart) * 100n + BigInt(fracPart.padEnd(2, '0'));
  const signedBig = negative ? -paiseBig : paiseBig;
  if (signedBig > MAX_SAFE_BIG || signedBig < MIN_SAFE_BIG) {
    throw new Error('money_overflow');
  }
  return Number(signedBig);
}

export function sumPaise(values) {
  if (!Array.isArray(values)) {
    throw new Error('invalid_paise_list');
  }
  let total = 0n;
  for (const val of values) {
    if (!Number.isSafeInteger(val)) {
      throw new Error('invalid_paise_integer');
    }
    total += BigInt(val);
    if (total > MAX_SAFE_BIG || total < MIN_SAFE_BIG) {
      throw new Error('money_overflow');
    }
  }
  return Number(total);
}

export function roundPaiseRatio(amountPaise, numerator, denominator) {
  if (!Number.isSafeInteger(amountPaise) || !Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error('invalid_ratio_input');
  }
  const product = BigInt(amountPaise) * BigInt(numerator);
  const sign = product < 0n ? -1n : 1n;
  const absProduct = product < 0n ? -product : product;
  const denomBig = BigInt(denominator);
  const roundedAbs = (absProduct * 2n + denomBig) / (2n * denomBig);
  const result = sign * roundedAbs;
  if (result > MAX_SAFE_BIG || result < MIN_SAFE_BIG) {
    throw new Error('money_overflow');
  }
  return Number(result);
}

/**
 * Validates a 15-character GSTIN format.
 */
export function isValidGstin15(gstin) {
  if (typeof gstin !== 'string') return false;
  return /^[0-9A-Z]{15}$/.test(gstin.trim().toUpperCase());
}

export function normalizeGstin15(gstin, label = 'gstin') {
  if (typeof gstin !== 'string') {
    throw new Error(`invalid_${label}`);
  }
  const normalized = gstin.trim().toUpperCase();
  if (!/^[0-9A-Z]{15}$/.test(normalized)) {
    throw new Error(`invalid_${label}_length_or_format`);
  }
  return normalized;
}

export function stateCodeFromGstin(gstin) {
  const normalized = normalizeGstin15(gstin);
  return normalized.slice(0, 2);
}

export function buildSemanticInvoiceKey(record) {
  const sellerGstin = normalizeGstin15(record?.sellerGstin, 'seller_gstin');
  const invoiceNumber = String(record?.invoiceNumber ?? '').trim();
  const invoiceDate = String(record?.invoiceDate ?? '').trim();
  const suborderId = String(record?.suborderId ?? '').trim();
  const docType = String(record?.docType ?? 'tax_invoice').trim();
  if (!invoiceNumber || !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !suborderId) {
    throw new Error('invalid_semantic_invoice_identity');
  }
  if (!['tax_invoice', 'credit_note'].includes(docType)) {
    throw new Error('invalid_document_type');
  }
  return `${sellerGstin}|${docType}|${invoiceNumber}|${invoiceDate}|${suborderId}`;
}

export function validateTaxSplit(item) {
  const igst = item.igstPaise ?? 0;
  const cgst = item.cgstPaise ?? 0;
  const sgst = item.sgstPaise ?? 0;
  const cess = item.cessPaise ?? 0;
  const taxable = item.taxablePaise ?? 0;

  for (const v of [igst, cgst, sgst, cess, taxable]) {
    if (!Number.isSafeInteger(v)) {
      throw new Error('invalid_tax_paise');
    }
  }

  const issues = [];
  if (igst !== 0 && (cgst !== 0 || sgst !== 0)) {
    issues.push('mixed_igst_and_cgst_sgst');
  }
  if (item.supplierStateCode && item.placeOfSupplyStateCode) {
    const sameState = String(item.supplierStateCode).trim() === String(item.placeOfSupplyStateCode).trim();
    if (sameState && igst !== 0) {
      issues.push('unexpected_igst_for_intrastate');
    }
    if (!sameState && (cgst !== 0 || sgst !== 0)) {
      issues.push('unexpected_cgst_sgst_for_interstate');
    }
  }
  if (typeof item.totalPaise === 'number') {
    const computedTotal = sumPaise([taxable, igst, cgst, sgst, cess]);
    if (computedTotal !== item.totalPaise) {
      issues.push('line_total_mismatch');
    }
  }
  return {
    valid: issues.length === 0,
    issues,
  };
}

function matchKey(row) {
  const suborder = String(row?.suborderId ?? '').trim().toUpperCase();
  const inv = String(row?.invoiceNumber ?? '').trim().toUpperCase();
  return suborder || inv;
}

/**
 * Reconciles Meesho GST report rows against Tax Invoice records and builds HSN summaries.
 */
export function reconcileMeeshoGstAndInvoices(gstReportRows = [], taxInvoices = []) {
  if (!Array.isArray(gstReportRows) || !Array.isArray(taxInvoices)) {
    throw new Error('invalid_reconciliation_inputs');
  }

  const invoicesByKey = new Map();
  for (const inv of taxInvoices) {
    const key = matchKey(inv);
    if (!key) continue;
    const list = invoicesByKey.get(key) ?? [];
    list.push(inv);
    invoicesByKey.set(key, list);
  }

  const gstByKey = new Map();
  for (const row of gstReportRows) {
    const key = matchKey(row);
    if (!key) continue;
    const list = gstByKey.get(key) ?? [];
    list.push(row);
    gstByKey.set(key, list);
  }

  const matched = [];
  const unmatchedInGstReport = [];
  const unmatchedInTaxInvoices = [];
  const returnsOrCreditNotes = [];
  const discrepancies = [];

  for (const row of gstReportRows) {
    const key = matchKey(row);
    const kind = String(row?.entryKind ?? row?.docType ?? 'sale').toLowerCase();
    const isReturnOrCredit = ['return', 'rto', 'customer_return', 'credit_note', 'cancellation', 'cancel'].includes(kind)
      || (typeof row?.taxablePaise === 'number' && row.taxablePaise < 0);

    const taxCheck = validateTaxSplit(row);
    if (!taxCheck.valid) {
      discrepancies.push({
        key,
        source: 'gst_report',
        codes: taxCheck.issues,
      });
    }

    if (isReturnOrCredit) {
      returnsOrCreditNotes.push({
        key,
        row,
        taxIssues: taxCheck.issues,
      });
      continue;
    }

    const matchingInvoices = invoicesByKey.get(key) ?? [];
    if (matchingInvoices.length > 0) {
      const invoice = matchingInvoices[0];
      const invTaxCheck = validateTaxSplit(invoice);
      const amountDeltaPaise = typeof invoice.taxablePaise === 'number' && typeof row.taxablePaise === 'number'
        ? sumPaise([row.taxablePaise, -invoice.taxablePaise])
        : 0;
      if (!invTaxCheck.valid || amountDeltaPaise !== 0) {
        discrepancies.push({
          key,
          source: 'matched_pair',
          amountDeltaPaise,
          codes: [...new Set([...taxCheck.issues, ...invTaxCheck.issues, ...(amountDeltaPaise !== 0 ? ['taxable_amount_mismatch'] : [])])],
        });
      }
      matched.push({
        key,
        gstReportRow: row,
        taxInvoice: invoice,
        amountDeltaPaise,
      });
    } else {
      unmatchedInGstReport.push({
        key,
        row,
        reason: 'missing_tax_invoice',
      });
      discrepancies.push({
        key,
        source: 'gst_report',
        codes: [...new Set(['unmatched_in_tax_invoices', ...taxCheck.issues])],
      });
    }
  }

  for (const inv of taxInvoices) {
    const key = matchKey(inv);
    const invType = String(inv?.docType ?? 'tax_invoice').toLowerCase();
    if (invType === 'credit_note') {
      returnsOrCreditNotes.push({
        key,
        invoice: inv,
        taxIssues: validateTaxSplit(inv).issues,
      });
      continue;
    }
    const matchingGst = gstByKey.get(key) ?? [];
    if (matchingGst.length === 0) {
      unmatchedInTaxInvoices.push({
        key,
        invoice: inv,
        reason: 'missing_gst_report_row',
      });
      discrepancies.push({
        key,
        source: 'tax_invoice',
        codes: ['unmatched_in_gst_report'],
      });
    }
  }

  const hsnMap = new Map();
  for (const item of matched) {
    const src = item.taxInvoice ?? item.gstReportRow;
    const hsn = String(src?.hsn ?? '0000').trim() || '0000';
    const uqc = String(src?.uqc ?? 'OTH').trim() || 'OTH';
    const qty = Number.isSafeInteger(src?.quantity) && src.quantity > 0 ? src.quantity : 1;
    const taxable = src?.taxablePaise ?? 0;
    const igst = src?.igstPaise ?? 0;
    const cgst = src?.cgstPaise ?? 0;
    const sgst = src?.sgstPaise ?? 0;
    const cess = src?.cessPaise ?? 0;
    const total = src?.totalPaise ?? sumPaise([taxable, igst, cgst, sgst, cess]);

    const current = hsnMap.get(hsn) ?? {
      hsn,
      uqc,
      quantity: 0,
      taxablePaise: 0,
      igstPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      cessPaise: 0,
      totalPaise: 0,
    };

    hsnMap.set(hsn, {
      hsn,
      uqc: current.uqc,
      quantity: current.quantity + qty,
      taxablePaise: sumPaise([current.taxablePaise, taxable]),
      igstPaise: sumPaise([current.igstPaise, igst]),
      cgstPaise: sumPaise([current.cgstPaise, cgst]),
      sgstPaise: sumPaise([current.sgstPaise, sgst]),
      cessPaise: sumPaise([current.cessPaise, cess]),
      totalPaise: sumPaise([current.totalPaise, total]),
    });
  }

  const hsnSummary = [...hsnMap.values()];
  const reconciledTaxablePaise = sumPaise(matched.map((m) => m.taxInvoice?.taxablePaise ?? m.gstReportRow?.taxablePaise ?? 0));
  const hsnTaxablePaise = sumPaise(hsnSummary.map((h) => h.taxablePaise));

  return {
    matched,
    unmatchedInGstReport,
    unmatchedInTaxInvoices,
    returnsOrCreditNotes,
    discrepancies,
    hsnSummary,
    totals: {
      reconciledTaxablePaise,
      hsnTaxablePaise,
      hsnTiedOut: reconciledTaxablePaise === hsnTaxablePaise,
    },
  };
}
