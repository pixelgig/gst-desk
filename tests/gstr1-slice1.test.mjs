import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import {
  ZIP_POLICY,
  validateArchiveEntryMetadata,
  extractZipParsedEntries,
  parseCsvRows,
} from '../src/gstr1/zip-intake.js';
import {
  parsePaiseString,
  sumPaise,
  isValidGstin15,
  buildSemanticInvoiceKey,
  reconcileMeeshoGstAndInvoices,
} from '../src/gstr1/reconciler.js';
import { buildGstr1Json } from '../src/gstr1/gstr1-export.js';

function buildStoredZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const dataBuf = Buffer.from(file.content, 'utf8');
    const localHdr = Buffer.alloc(30);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0, 6);
    localHdr.writeUInt16LE(0, 8); // stored
    localHdr.writeUInt32LE(0, 14);
    localHdr.writeUInt32LE(dataBuf.length, 18);
    localHdr.writeUInt32LE(dataBuf.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);

    localParts.push(localHdr, nameBuf, dataBuf);

    const cenHdr = Buffer.alloc(46);
    cenHdr.writeUInt32LE(0x02014b50, 0);
    cenHdr.writeUInt16LE(20, 4);
    cenHdr.writeUInt16LE(20, 6);
    cenHdr.writeUInt16LE(0, 8);
    cenHdr.writeUInt16LE(0, 10);
    cenHdr.writeUInt32LE(0, 16);
    cenHdr.writeUInt32LE(dataBuf.length, 20);
    cenHdr.writeUInt32LE(dataBuf.length, 24);
    cenHdr.writeUInt16LE(nameBuf.length, 28);
    cenHdr.writeUInt32LE(offset, 42);

    centralParts.push(cenHdr, nameBuf);
    offset += localHdr.length + nameBuf.length + dataBuf.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return new Uint8Array(Buffer.concat([...localParts, centralDir, eocd]));
}

test('1. ZIP archive entry and decompression guardrails reject traversal, bombs, duplicates, and blocked extensions', () => {
  assert.throws(
    () => validateArchiveEntryMetadata([{ name: '../evil.csv', uncompressedSize: 10, compressedSize: 10 }]),
    /unsafe_archive_path/
  );
  assert.throws(
    () => validateArchiveEntryMetadata([{ name: '/abs.csv', uncompressedSize: 10, compressedSize: 10 }]),
    /unsafe_archive_path/
  );
  assert.throws(
    () => validateArchiveEntryMetadata([{ name: 'nested.zip', uncompressedSize: 10, compressedSize: 10 }]),
    /blocked_archive_entry/
  );
  assert.throws(
    () => validateArchiveEntryMetadata([{ name: 'bomb.csv', uncompressedSize: 5000, compressedSize: 10 }]),
    /archive_expansion_limit/
  );
  const dup = { name: 'report.csv', uncompressedSize: 20, compressedSize: 20 };
  assert.throws(() => validateArchiveEntryMetadata([dup, dup]), /duplicate_archive_path/);

  const validZip = buildStoredZip([{ name: 'meesho_gst.csv', content: 'suborderId,taxable\nSUB1,100.00\n' }]);
  const extracted = extractZipParsedEntries(validZip, ZIP_POLICY);
  assert.equal(extracted.entries.length, 1);
  assert.equal(extracted.rawArchiveRetained, false);
});

test('2. Parsed-only retention returns parsed entries without retaining raw archive bytes', () => {
  const zipBytes = buildStoredZip([
    { name: 'gst_summary.csv', content: 'suborderId,taxablePaise\nSUB_100,10000\n' },
  ]);
  const parsed = extractZipParsedEntries(zipBytes);
  assert.equal(parsed.rawArchiveRetained, false);
  assert.equal('rawBytes' in parsed, false);
  assert.equal(parsed.entries[0].name, 'gst_summary.csv');
  assert.equal(parseCsvRows(parsed.entries[0].text)[0].suborderId, 'SUB_100');
});

test('3. Exact paise arithmetic parses decimals to paise and rejects invalid or overflowing inputs', () => {
  assert.equal(parsePaiseString('125.31'), 12531);
  assert.equal(parsePaiseString('-0.01'), -1);
  assert.equal(parsePaiseString('250'), 25000);
  for (const bad of ['1.001', '1e3', 'NaN', '', 'abc']) {
    assert.throws(() => parsePaiseString(bad));
  }
  assert.throws(() => sumPaise([Number.MAX_SAFE_INTEGER, 1]), /money_overflow/);
});

test('4. 15-character GSTIN and semantic invoice identity validation enforce structure and uniqueness', () => {
  assert.equal(isValidGstin15('09AAAAA0000A1Z0'), true);
  assert.equal(isValidGstin15('09AAAAA0000A1Z'), false); // 14 chars
  assert.equal(isValidGstin15('09AAAAA0000A1Z00'), false); // 16 chars

  const base = {
    sellerGstin: '09AAAAA0000A1Z0',
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-10-12',
    suborderId: 'SUB_001',
    docType: 'tax_invoice',
  };
  const k1 = buildSemanticInvoiceKey(base);
  const k2 = buildSemanticInvoiceKey({ ...base, docType: 'credit_note' });
  assert.notEqual(k1, k2);
  assert.throws(() => buildSemanticInvoiceKey({ ...base, sellerGstin: 'SHORT15' }));
});

test('5. Exact 1-to-1 and multi-line match between Meesho GST report and Tax Invoices succeeds', () => {
  const gstRows = [
    { suborderId: 'SUB_10', invoiceNumber: 'INV-10', hsn: '7117', uqc: 'PCS', quantity: 2, taxablePaise: 20000, igstPaise: 600, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 20600, placeOfSupplyStateCode: '07' },
  ];
  const invoices = [
    { suborderId: 'SUB_10', invoiceNumber: 'INV-10', hsn: '7117', uqc: 'PCS', quantity: 2, taxablePaise: 20000, igstPaise: 600, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 20600, placeOfSupplyStateCode: '07' },
  ];
  const res = reconcileMeeshoGstAndInvoices(gstRows, invoices);
  assert.equal(res.matched.length, 1);
  assert.equal(res.unmatchedInGstReport.length, 0);
  assert.equal(res.unmatchedInTaxInvoices.length, 0);
  assert.equal(res.discrepancies.length, 0);
});

test('6. Unmatched Tax Invoice and unmatched Meesho GST report row are flagged explicitly', () => {
  const gstRows = [{ suborderId: 'SUB_ONLY_GST', taxablePaise: 5000, igstPaise: 150, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 5150 }];
  const invoices = [{ suborderId: 'SUB_ONLY_INV', taxablePaise: 7000, igstPaise: 210, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 7210 }];
  const res = reconcileMeeshoGstAndInvoices(gstRows, invoices);
  assert.equal(res.unmatchedInGstReport.length, 1);
  assert.equal(res.unmatchedInTaxInvoices.length, 1);
  assert.equal(res.matched.length, 0);
});

test('7. Returns, cancellations, and credit notes are isolated from outward sales', () => {
  const gstRows = [
    { suborderId: 'SUB_SALE', entryKind: 'sale', hsn: '7117', uqc: 'PCS', quantity: 1, taxablePaise: 10000, igstPaise: 300, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 10300 },
    { suborderId: 'SUB_RET', entryKind: 'return', hsn: '7117', uqc: 'PCS', quantity: 1, taxablePaise: -10000, igstPaise: -300, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: -10300 },
  ];
  const invoices = [
    { suborderId: 'SUB_SALE', docType: 'tax_invoice', hsn: '7117', uqc: 'PCS', quantity: 1, taxablePaise: 10000, igstPaise: 300, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 10300 },
    { suborderId: 'SUB_CN', docType: 'credit_note', hsn: '7117', uqc: 'PCS', quantity: 1, taxablePaise: 5000, igstPaise: 150, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 5150 },
  ];
  const res = reconcileMeeshoGstAndInvoices(gstRows, invoices);
  assert.equal(res.matched.length, 1);
  assert.equal(res.returnsOrCreditNotes.length, 2);
  assert.equal(res.totals.reconciledTaxablePaise, 10000);
});

test('8. Intra-state CGST+SGST vs inter-state IGST tax split detects mixed/wrong tax components', () => {
  const mixedRows = [
    {
      suborderId: 'SUB_MIXED',
      taxablePaise: 10000,
      igstPaise: 300,
      cgstPaise: 150,
      sgstPaise: 150,
      cessPaise: 0,
      totalPaise: 10600,
      supplierStateCode: '09',
      placeOfSupplyStateCode: '09',
    },
  ];
  const res = reconcileMeeshoGstAndInvoices(mixedRows, mixedRows);
  assert.ok(res.discrepancies.some((d) => d.codes.includes('mixed_igst_and_cgst_sgst')));
  assert.ok(res.discrepancies.some((d) => d.codes.includes('unexpected_igst_for_intrastate')));
});

test('9. HSN summary aggregates reconciled lines and ties out to reconciled taxable total', () => {
  const rows = [
    { suborderId: 'SUB_H1', hsn: '7117', uqc: 'PCS', quantity: 1, taxablePaise: 8000, igstPaise: 240, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 8240 },
    { suborderId: 'SUB_H2', hsn: '4420', uqc: 'PCS', quantity: 2, taxablePaise: 12000, igstPaise: 0, cgstPaise: 1080, sgstPaise: 1080, cessPaise: 0, totalPaise: 14160 },
  ];
  const res = reconcileMeeshoGstAndInvoices(rows, rows);
  assert.equal(res.hsnSummary.length, 2);
  assert.equal(res.totals.hsnTaxablePaise, 20000);
  assert.equal(res.totals.hsnTiedOut, true);
});

test('10. GSTR-1 JSON builder outputs structured B2B/B2CS/HSN sections and flags invalid inputs', () => {
  const rows = [
    {
      suborderId: 'SUB_B2CS_1',
      invoiceNumber: 'INV-101',
      invoiceDate: '2026-10-05',
      hsn: '7117',
      uqc: 'PCS',
      quantity: 1,
      placeOfSupplyStateCode: '07',
      taxablePaise: 10000,
      igstPaise: 300,
      cgstPaise: 0,
      sgstPaise: 0,
      cessPaise: 0,
      totalPaise: 10300,
    },
  ];
  const rec = reconcileMeeshoGstAndInvoices(rows, rows);
  const validOut = buildGstr1Json({
    gstin: '09AAAAA0000A1Z0',
    returnPeriod: '102026',
    reconciliation: rec,
  });
  assert.equal(validOut.valid, true);
  assert.equal(validOut.payload.gstin, '09AAAAA0000A1Z0');
  assert.equal(validOut.payload.fp, '102026');
  assert.equal(validOut.payload.b2cs.length, 1);
  assert.equal(validOut.payload.hsn.data.length, 1);

  const invalidOut = buildGstr1Json({
    gstin: 'INVALID_GSTIN',
    returnPeriod: '102026',
    reconciliation: rec,
  });
  assert.equal(invalidOut.valid, false);
  assert.equal(invalidOut.payload, null);
  assert.ok(invalidOut.errors.some((e) => e.code === 'invalid_gstin_15'));
});
