import { isValidGstin15, normalizeGstin15, sumPaise } from './reconciler.js';

function paiseToRupeesNumber(paiseVal) {
  if (!Number.isSafeInteger(paiseVal)) {
    throw new Error('invalid_paise_for_export');
  }
  return Number((paiseVal / 100).toFixed(2));
}

/**
 * Builds and validates a GSTR-1 return JSON payload from reconciled records.
 */
export function buildGstr1Json({ gstin, returnPeriod, reconciliation }) {
  const errors = [];
  if (!isValidGstin15(gstin)) {
    errors.push({ code: 'invalid_gstin_15', message: 'Supplier GSTIN must be a 15-character alphanumeric code.' });
  }
  if (typeof returnPeriod !== 'string' || !/^(0[1-9]|1[0-2])\d{4}$/.test(returnPeriod.trim())) {
    errors.push({ code: 'invalid_return_period', message: 'Return period (fp) must follow MMYYYY format.' });
  }
  if (!reconciliation || typeof reconciliation !== 'object') {
    errors.push({ code: 'missing_reconciliation', message: 'Reconciliation result is required to build GSTR-1 JSON.' });
    return { valid: false, errors, payload: null };
  }

  if (reconciliation.totals && reconciliation.totals.hsnTiedOut === false) {
    errors.push({
      code: 'hsn_tie_out_mismatch',
      message: 'HSN summary taxable amount does not match reconciled supply taxable amount.',
    });
  }

  const b2bMap = new Map();
  const b2csMap = new Map();

  for (const item of reconciliation.matched ?? []) {
    const rec = item.taxInvoice ?? item.gstReportRow ?? {};
    const taxablePaise = rec.taxablePaise ?? 0;
    const igstPaise = rec.igstPaise ?? 0;
    const cgstPaise = rec.cgstPaise ?? 0;
    const sgstPaise = rec.sgstPaise ?? 0;
    const cessPaise = rec.cessPaise ?? 0;

    if (taxablePaise < 0 || igstPaise < 0 || cgstPaise < 0 || sgstPaise < 0 || cessPaise < 0) {
      errors.push({
        code: 'negative_outward_supply',
        key: item.key,
        message: 'Outward supply lines cannot contain negative amounts; route reversals to returns/credit notes.',
      });
      continue;
    }

    const pos = String(rec.placeOfSupplyStateCode ?? '').trim().padStart(2, '0');
    const buyerGstinRaw = String(rec.buyerGstin ?? '').trim().toUpperCase();

    if (buyerGstinRaw) {
      if (!isValidGstin15(buyerGstinRaw)) {
        errors.push({
          code: 'invalid_buyer_gstin_15',
          key: item.key,
          message: 'Buyer GSTIN must be 15 characters when provided.',
        });
        continue;
      }
      const existingList = b2bMap.get(buyerGstinRaw) ?? [];
      existingList.push({
        inum: String(rec.invoiceNumber ?? item.key),
        idt: String(rec.invoiceDate ?? ''),
        val: paiseToRupeesNumber(sumPaise([taxablePaise, igstPaise, cgstPaise, sgstPaise, cessPaise])),
        pos,
        txval: paiseToRupeesNumber(taxablePaise),
        iamt: paiseToRupeesNumber(igstPaise),
        camt: paiseToRupeesNumber(cgstPaise),
        samt: paiseToRupeesNumber(sgstPaise),
        csamt: paiseToRupeesNumber(cessPaise),
      });
      b2bMap.set(buyerGstinRaw, existingList);
    } else {
      const b2csKey = `${pos || '00'}|${igstPaise > 0 ? 'INTER' : 'INTRA'}`;
      const existing = b2csMap.get(b2csKey) ?? {
        pos: pos || '00',
        sply_ty: igstPaise > 0 ? 'INTER' : 'INTRA',
        taxablePaise: 0,
        igstPaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        cessPaise: 0,
      };
      existing.taxablePaise = sumPaise([existing.taxablePaise, taxablePaise]);
      existing.igstPaise = sumPaise([existing.igstPaise, igstPaise]);
      existing.cgstPaise = sumPaise([existing.cgstPaise, cgstPaise]);
      existing.sgstPaise = sumPaise([existing.sgstPaise, sgstPaise]);
      existing.cessPaise = sumPaise([existing.cessPaise, cessPaise]);
      b2csMap.set(b2csKey, existing);
    }
  }

  const b2b = [...b2bMap.entries()].map(([ctin, inv]) => ({ ctin, inv }));
  const b2cs = [...b2csMap.values()].map((entry) => ({
    pos: entry.pos,
    sply_ty: entry.sply_ty,
    txval: paiseToRupeesNumber(entry.taxablePaise),
    iamt: paiseToRupeesNumber(entry.igstPaise),
    camt: paiseToRupeesNumber(entry.cgstPaise),
    samt: paiseToRupeesNumber(entry.sgstPaise),
    csamt: paiseToRupeesNumber(entry.cessPaise),
  }));

  const hsn = {
    data: (reconciliation.hsnSummary ?? []).map((row, idx) => ({
      num: idx + 1,
      hsn_sc: row.hsn,
      uqc: row.uqc,
      qty: row.quantity,
      txval: paiseToRupeesNumber(row.taxablePaise),
      iamt: paiseToRupeesNumber(row.igstPaise),
      camt: paiseToRupeesNumber(row.cgstPaise),
      samt: paiseToRupeesNumber(row.sgstPaise),
      csamt: paiseToRupeesNumber(row.cessPaise),
      val: paiseToRupeesNumber(row.totalPaise),
    })),
  };

  const payload = errors.length === 0
    ? {
        gstin: normalizeGstin15(gstin),
        fp: returnPeriod.trim(),
        b2b,
        b2cs,
        hsn,
        reconciliationMeta: {
          matchedCount: (reconciliation.matched ?? []).length,
          unmatchedGstCount: (reconciliation.unmatchedInGstReport ?? []).length,
          unmatchedInvoiceCount: (reconciliation.unmatchedInTaxInvoices ?? []).length,
          returnsAndCreditNotesCount: (reconciliation.returnsOrCreditNotes ?? []).length,
          discrepancyCount: (reconciliation.discrepancies ?? []).length,
        },
      }
    : null;

  return {
    valid: errors.length === 0,
    errors,
    payload,
  };
}
