import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paise, roundRatio, safeSum } from '../src/domain/money.js';
import { calendarDate, reviewInvoice, semanticIdentity, validateEvidence } from '../src/domain/intake.js';
import { sniffDocument, validateArchiveEntries } from '../src/parsers/file-policy.js';

function invoice() {
  return { sellerGstin: '09AAAAA0000A1Z0', number: 'SYNTHETIC-1', date: '2026-11-15', suborderId: 'SYNTHETIC_1', type: 'tax_invoice', totalPaise: 12531,
    shippingName: 'Synthetic Shipping', billingName: 'Synthetic Billing',
    lines: [
      { kind: 'product', hsn: '7117', quantity: 1, taxablePaise: 10710, igstPaise: 321, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 11031 },
      { kind: 'other_charge', hsn: '7117', quantity: 1, taxablePaise: 1456, igstPaise: 44, cgstPaise: 0, sgstPaise: 0, cessPaise: 0, totalPaise: 1500 },
    ] };
}
test('money parses signed exact paise and rejects rounding/overflow at input', () => {
  assert.equal(paise('125.31'), 12531); assert.equal(paise('-0.01'), -1);
  for (const bad of ['1.001', '1e3', 'NaN', '', '900719925474099.99']) assert.throws(() => paise(bad));
  assert.throws(() => safeSum([Number.MAX_SAFE_INTEGER, 1]));
});
test('rounding is symmetric half away from zero', () => {
  assert.equal(roundRatio(1, 1, 2), 1); assert.equal(roundRatio(-1, 1, 2), -1);
  assert.equal(roundRatio(10710, 300, 10000), 321); assert.equal(roundRatio(1456, 300, 10000), 44);
});
test('real dates reject impossible calendar days', () => {
  assert.equal(calendarDate('2026-02-29'), false); assert.equal(calendarDate('2024-02-29'), true);
  assert.equal(calendarDate('2026-11-31'), false);
});
test('synthetic combined invoice keeps charge line and separate contact roles', () => {
  const result = reviewInvoice(invoice());
  assert.equal(result.totals.taxablePaise, 12166); assert.equal(result.totals.igstPaise, 365);
  assert.equal(result.totals.totalPaise, 12531); assert.deepEqual(result.issues, [{ code: 'recipient_roles_differ' }]);
  assert.equal(result.reviewRequired, true); assert.equal(result.settlement.bankReceivedPaise, null);
  assert.equal(result.settlement.expectedDate, null);
});
test('mismatches remain visible rather than forced balancing', () => {
  const input = invoice(); input.lines[0].igstPaise++;
  assert.ok(reviewInvoice(input).issues.some(x => x.code === 'line_total_mismatch'));
  assert.equal(input.lines[0].igstPaise, 322);
});
test('semantic identity distinguishes credit notes and suborders', () => {
  const input = invoice(); const original = semanticIdentity(input);
  assert.equal(semanticIdentity(structuredClone(input)), original);
  input.type = 'credit_note'; assert.notEqual(semanticIdentity(input), original);
  input.number = ''; assert.throws(() => semanticIdentity(input));
});
test('field evidence requires valid location and confidence', () => {
  assert.throws(() => validateEvidence({ page: 0 }));
  assert.equal(validateEvidence({ page: 1, box: [0,0,10,10], confidence: 0.5, method: 'pdf_text' }).page, 1);
});
test('file signatures reject filename-only disguise', () => {
  assert.equal(sniffDocument(new TextEncoder().encode('%PDF-1.7\n')), 'application/pdf');
  assert.throws(() => sniffDocument(new TextEncoder().encode('<html>evil.pdf')));
});
test('archive policy rejects zip slip, duplicate paths, bombs and nested ZIPs', () => {
  const entry = { name: 'folder/label.pdf', size: 1000, compressedSize: 500 };
  assert.equal(validateArchiveEntries([entry]).bytes, 1000);
  for (const name of ['../label.pdf','/label.pdf','a\\label.pdf','x.zip','C:label.pdf']) assert.throws(() => validateArchiveEntries([{ ...entry, name }]));
  assert.throws(() => validateArchiveEntries([entry, entry]));
  assert.throws(() => validateArchiveEntries([{ ...entry, size: 1000000, compressedSize: 1 }]));
});
