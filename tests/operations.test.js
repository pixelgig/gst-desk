import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendTrackingEvent, trackingView, carrierCapabilities } from '../src/domain/tracking.js';
import { settlementView, validateBankAllocations } from '../src/domain/settlement.js';
const event = { id:'event1', status:'delivered', source:'manual', rawStatus:'Synthetic manual report', eventTime:'2026-11-16T10:00:00Z', recordedAt:'2026-11-16T11:00:00Z' };
const line = { id:'line1', suborderId:'synthetic_1', batchId:'batch1', sourceDocumentId:'document1', netPaise:10000 };
const match = { id:'match1', settlementLineId:'line1', bankTransactionId:'bank1', approvedBy:'reviewer1', sourceDocumentId:'bank_document1', allocatedPaise:6000 };
const bank = [{id:'bank1',sourceDocumentId:'bank_document1',creditPaise:20000}];
test('manual carrier workflow advertises no live sync or ETA', () => {
  const capabilities = carrierCapabilities('Valmo');
  assert.equal(capabilities.automaticSync, false); assert.equal(capabilities.officialUrl, 'https://www.valmo.in/track');
  assert.equal(trackingView([]).status, 'unknown');
});
test('late carrier history is retained without replacing newer event status', () => {
  let history = appendTrackingEvent([], event);
  history = appendTrackingEvent(history, { ...event, id:'event2', status:'in_transit', eventTime:'2026-11-15T10:00:00Z', recordedAt:'2026-11-16T12:00:00Z' });
  assert.equal(history.length, 2); assert.equal(trackingView(history).status, 'delivered');
  assert.equal(trackingView(history).source, 'manual');
  assert.equal(appendTrackingEvent(history, event).length, 2);
  assert.throws(()=>appendTrackingEvent(history,{...event,status:'returned'}), /identity_conflict/);
});
test('invalid or future carrier events are rejected', () => {
  assert.throws(()=>appendTrackingEvent([], {...event, source:'guessed'}));
  assert.throws(()=>appendTrackingEvent([], {...event, eventTime:'2027-01-01T00:00:00Z'}));
});
test('absent payment evidence remains unknown regardless of shipping', () => {
  const view = settlementView('synthetic_1',[],[]);
  assert.equal(view.bankReceivedPaise,null); assert.equal(view.settlementPaise,null); assert.equal(view.forecast,null);
});
test('partial settlement and repeated identical source lines count once', () => {
  const view = settlementView('synthetic_1',[line,line],[match,match],bank);
  assert.equal(view.settlementPaise,10000); assert.equal(view.bankReceivedPaise,6000);
  assert.equal(view.outstandingPaise,4000); assert.equal(view.state,'partially_settled');
});
test('confirmed platform settlement is distinct from bank receipt', () => {
  assert.equal(settlementView('synthetic_1',[line],[]).bankReceivedPaise,null);
  assert.equal(settlementView('synthetic_1',[line],[{...match,allocatedPaise:10000}],bank).state,'fully_settled');
  assert.equal(settlementView('synthetic_1',[line],[{...match,allocatedPaise:11000}],bank).state,'disputed');
  assert.throws(()=>settlementView('synthetic_1',[line],[match]), /evidence_missing/);
});
test('bank matching rejects missing evidence and allocating one credit twice', () => {
  const banks = [{id:'bank1',sourceDocumentId:'bank_document1',creditPaise:10000}];
  assert.equal(validateBankAllocations(banks,[match]),true);
  assert.throws(()=>validateBankAllocations(banks,[match,{...match,id:'match2'}]), /overallocated/);
  assert.throws(()=>validateBankAllocations([], [match]), /evidence_missing/);
  assert.throws(()=>settlementView('synthetic_1',[line],[match,{...match,id:'match2'}],bank), /duplicate_bank/);
});
test('conflicting settlement identities fail closed and negative payouts require review', () => {
  assert.throws(()=>settlementView('synthetic_1',[line,{...line,netPaise:9999}],[]), /identity_conflict/);
  const view=settlementView('synthetic_1',[{...line,netPaise:-100}],[]);
  assert.equal(view.state,'adjusted'); assert.deepEqual(view.issues,['negative_settlement_review']);
});
