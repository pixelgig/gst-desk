import { safeSum } from './money.js';

function id(value) { return typeof value === 'string' && /^[A-Za-z0-9_/-]{1,100}$/.test(value); }
function uniqueFacts(rows, key, validate) {
  const facts = new Map();
  for (const row of rows) {
    if (!validate(row)) throw new Error('invalid_financial_evidence');
    const previous = facts.get(row[key]);
    if (previous && JSON.stringify(previous) !== JSON.stringify(row)) throw new Error('financial_identity_conflict');
    facts.set(row[key], row);
  }
  return [...facts.values()];
}

// An order's settlement amount is independent of customer invoice gross and delivery.
export function settlementView(suborderId, settlementRows, bankMatches, bankTransactions = []) {
  if (!id(suborderId) || !Array.isArray(settlementRows) || !Array.isArray(bankMatches) || settlementRows.length > 10000 || bankMatches.length > 10000) throw new Error('invalid_financial_evidence');
  const lines = uniqueFacts(settlementRows, 'id', row => row && id(row.id) && id(row.suborderId) && id(row.batchId) && id(row.sourceDocumentId) && Number.isSafeInteger(row.netPaise));
  const matches = uniqueFacts(bankMatches, 'id', row => row && id(row.id) && id(row.settlementLineId) && id(row.bankTransactionId) && id(row.approvedBy) && id(row.sourceDocumentId) && Number.isSafeInteger(row.allocatedPaise) && row.allocatedPaise > 0);
  validateBankAllocations(bankTransactions, matches);
  const relevant = lines.filter(row => row.suborderId === suborderId);
  const lineIds = new Set(relevant.map(row=>row.id));
  for (const match of matches) {
    if (!lines.some(row=>row.id === match.settlementLineId)) throw new Error('unmatched_settlement_evidence');
  }
  const allocatedPairs = new Set();
  for (const match of matches) {
    const pair = JSON.stringify([match.settlementLineId,match.bankTransactionId]);
    if (allocatedPairs.has(pair)) throw new Error('duplicate_bank_allocation');
    allocatedPairs.add(pair);
  }
  if (!relevant.length) return { state: 'not_yet_eligible', settlementPaise: null, bankReceivedPaise: null, outstandingPaise: null, forecast: null, issues: ['awaiting_settlement_evidence'] };
  const settlementPaise = safeSum(relevant.map(row=>row.netPaise));
  const approved = matches.filter(row=>lineIds.has(row.settlementLineId));
  const bankReceivedPaise = approved.length ? safeSum(approved.map(row=>row.allocatedPaise)) : null;
  const outstandingPaise = safeSum([settlementPaise, -(bankReceivedPaise ?? 0)]);
  let state = 'settlement_announced';
  const issues = [];
  if (settlementPaise < 0) { state = 'adjusted'; issues.push('negative_settlement_review'); }
  else if (bankReceivedPaise !== null) {
    state = bankReceivedPaise === settlementPaise ? 'fully_settled' : bankReceivedPaise < settlementPaise ? 'partially_settled' : 'disputed';
    if (bankReceivedPaise > settlementPaise) issues.push('overallocated_bank_credit');
  }
  return { state, settlementPaise, bankReceivedPaise, outstandingPaise, forecast: null, issues };
}

export function validateBankAllocations(bankTransactions, matches) {
  const transactions = uniqueFacts(bankTransactions, 'id', row => row && id(row.id) && id(row.sourceDocumentId) && Number.isSafeInteger(row.creditPaise) && row.creditPaise > 0);
  const seen = new Set();
  for (const match of matches) {
    if (!match || !id(match.id) || seen.has(match.id) || !Number.isSafeInteger(match.allocatedPaise) || match.allocatedPaise <= 0) throw new Error('invalid_bank_allocation');
    seen.add(match.id);
    if (!transactions.some(row=>row.id===match.bankTransactionId)) throw new Error('bank_evidence_missing');
  }
  for (const transaction of transactions) {
    const total = safeSum(matches.filter(row=>row.bankTransactionId === transaction.id).map(row=>row.allocatedPaise));
    if (total > transaction.creditPaise) throw new Error('bank_credit_overallocated');
  }
  return true;
}
